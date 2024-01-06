import { Action, Props, ReactContext } from 'shared/ReactTypes';
import { FiberNode } from './ReactFiber';
import {
	Dispatch,
	Dispatcher,
	Effect,
	EffectCallback,
	EffectDeps,
	Hook,
	UesRefType,
	UpdateStateType,
	UseContextType,
	UseEffectCallback,
	UseEffectType,
	UseLayoutEffectType,
	UseStateType,
	UseTransitionType
} from 'shared/ReactHookTypes';
import internals from 'shared/ReactInternals';
import {
	UpdateQueue,
	createUpdate,
	createUpdateQueue,
	enqueUpdate,
	processUpdateQueue
} from './ReactFiberUpdateQueue';
import { scheduleUpdateOnFiber } from './ReactFiberWorkLoop';
import { Lane, NoLane, requestUpdateLane } from './ReactFiberLane';
import { Flags, LayoutEffect, PassiveEffect } from './ReactFiberFlags';
import {
	EffectTag,
	HookHasEffect,
	Layout,
	Passive
} from './ReactHookEffectTags';

export interface FCUpdateQueue<State> extends UpdateQueue<State> {
	lastEffect: Effect | null;
}

const { currentDispathcher, ReactCurrentBatchConfig } = internals;
let currentRenderingFiber: FiberNode | null = null;
let workInProgressHook: Hook | null = null;
let currentHook: Hook | null = null; // hook in current FiberNode, Not WIP!
let renderLane: Lane = NoLane;

/**
 *
 * useState
 */
//useState in mount stage
const mountState: UseStateType = <T>(
	initialState: (() => T) | T
): [T, Dispatch<T>] => {
	const hook = mountWorkInProgressHook();
	const memorizedState =
		initialState instanceof Function ? initialState() : initialState;
	const updateQueue = createUpdateQueue<T>();
	hook.updateQueue = updateQueue;
	hook.memorizedState = memorizedState;
	hook.baseState = memorizedState;

	const dispatch = (dispatchSetState<T>).bind(
		null,
		currentRenderingFiber!,
		updateQueue
	);
	updateQueue.dispatch = dispatch;
	return [memorizedState, dispatch];
};

// useState in update stage
const updateState: UpdateStateType = <T>(): [T, Dispatch<T>] => {
	const hook = updateWorkInProgressHook(); // find current related hook

	const queue = hook.updateQueue as UpdateQueue<T>;
	const baseState = hook.baseState;
	const pending = queue.shared.pending;

	const current = currentHook!;
	let baseQueue = current.baseQueue;

	// queue.shared.pending = null; can not set null in concurrent mode!
	if (pending !== null) {
		// pending baseQueue update store in current
		// chain baseQueue and pending to one circular linked list
		if (baseQueue !== null) {
			const baseFirst = baseQueue.next;
			const pendingFirst = pending.next;
			baseQueue.next = pendingFirst;
			pending.next = baseFirst;
		}
		baseQueue = pending;
		current.baseQueue = pending;
		queue.shared.pending = null;
	}
	if (baseQueue !== null) {
		const {
			memorizedState,
			baseQueue: newBaseQueue,
			baseState: newBaseState
		} = processUpdateQueue(baseState, baseQueue, renderLane);
		hook.memorizedState = memorizedState;
		hook.baseState = newBaseState;
		hook.baseQueue = newBaseQueue;
	}
	return [hook.memorizedState, queue.dispatch as Dispatch<T>];
};

/**
 *
 * useEffect useLayoutEffect
 */
// useEffect in mount stage
const mountEffect: UseEffectType = (create, deps) => {
	mountEffectImpl(PassiveEffect, Passive | HookHasEffect, create, deps);
};

// useEffect in update stage
const updateEffect: UseEffectType = (create, deps) => {
	updateEffectImpl(PassiveEffect, Passive, create, deps);
};

// useLayoutEffect in mount stage
const mountLayoutEffect: UseLayoutEffectType = (create, deps) => {
	mountEffectImpl(LayoutEffect, Layout | HookHasEffect, create, deps);
};

// useLayoutEffect in update stage
const updateLayoutEffect: UseLayoutEffectType = (create, deps) => {
	updateEffectImpl(LayoutEffect, Layout, create, deps);
};

function pushEffect(
	hookFlages: Flags,
	create: EffectCallback | void,
	destory: EffectCallback | void,
	deps: EffectDeps
): Effect {
	const effect: Effect = {
		tag: hookFlages,
		create,
		destory,
		deps,
		next: null
	};
	const fiber = currentRenderingFiber as FiberNode;
	let updateQueue = fiber.updateQueue as FCUpdateQueue<any>;
	if (updateQueue === null) {
		updateQueue = createFCUpdateQueue();
		fiber.updateQueue = updateQueue;
		effect.next = effect;
		updateQueue.lastEffect = effect;
	} else {
		const lastEffect = updateQueue.lastEffect;
		if (lastEffect === null) {
			effect.next = effect;
			updateQueue.lastEffect = effect;
		} else {
			const firstEffect = lastEffect.next;
			lastEffect.next = effect;
			effect.next = firstEffect;
			updateQueue.lastEffect = effect;
		}
	}
	return effect;
}

function mountEffectImpl(
	fiberFlags: Flags,
	hookFlags: EffectTag,
	create: UseEffectCallback,
	deps: EffectDeps
): void {
	const hook = mountWorkInProgressHook();
	const nextDeps = deps === undefined ? null : deps;
	(currentRenderingFiber as FiberNode).flags |= fiberFlags;
	hook.memorizedState = pushEffect(hookFlags, create, undefined, nextDeps);
}

function updateEffectImpl(
	fiberFlags: Flags,
	hookFlags: EffectTag,
	create: UseEffectCallback,
	deps: EffectDeps
) {
	const hook = updateWorkInProgressHook();
	const nextDeps = deps === undefined ? null : deps;
	let destory: EffectCallback | void = undefined;
	if (hook !== null) {
		const prevEffect = hook.memorizedState as Effect;
		destory = prevEffect.destory;
		if (nextDeps !== null) {
			const prevDeps = prevEffect.deps;
			if (areHookInputsEqual(nextDeps, prevDeps)) {
				hook.memorizedState = pushEffect(hookFlags, create, destory, nextDeps);
				return;
			}
		}
	}
	(currentRenderingFiber as FiberNode).flags |= fiberFlags;
	hook.memorizedState = pushEffect(
		hookFlags | HookHasEffect,
		create,
		destory,
		nextDeps
	);
}

const areHookInputsEqual = (nextDeps: EffectDeps, prevDeps: EffectDeps) => {
	if (prevDeps === null || nextDeps === null) return false;
	for (let i = 0; i < prevDeps.length && i < nextDeps.length; i++) {
		if (Object.is(prevDeps[i], nextDeps[i])) {
			continue;
		}
		return false;
	}
	return true;
};

/**
 *
 * useTransition
 */
const mountTransition: UseTransitionType = () => {
	const [isPending, setPending] = mountState<boolean>(false);
	const hook = mountWorkInProgressHook();
	const start = startTransition.bind(null, setPending);
	hook.memorizedState = start;
	return [isPending, start];
};

const updateTransition: UseTransitionType = () => {
	const [isPending] = updateState<boolean>();
	const hook = updateWorkInProgressHook();
	const start = hook.memorizedState;
	return [isPending, start];
};

const startTransition = (
	setPending: Dispatch<boolean>,
	callback: () => void
) => {
	setPending(true);
	const prevTransition = ReactCurrentBatchConfig.transition;
	ReactCurrentBatchConfig.transition = 1;
	callback();
	setPending(false);
	ReactCurrentBatchConfig.transition = prevTransition;
};

/**
 *
 * useRef
 */
const mountRef: UesRefType = (initialValue) => {
	const hook = mountWorkInProgressHook();
	const ref = { current: initialValue };
	hook.memorizedState = ref;
	return ref;
};

const updateRef: UesRefType = () => {
	const hook = updateWorkInProgressHook();
	return hook.memorizedState;
};

/**
 * useContext
 */
const readContext: UseContextType = <T>(context: ReactContext<T>) => {
	const consumer = currentRenderingFiber;
	if (!consumer) {
		throw new Error('useContext is only used in Function component!');
	}
	const value = context._currentValue;
	return value;
};

const HooksDispatcherOnMount: Dispatcher = {
	useState: mountState,
	useEffect: mountEffect,
	useLayoutEffect: mountLayoutEffect,
	useTransition: mountTransition,
	useRef: mountRef,
	useContext: readContext
};

const HooksDispatcherOnUpdate: Dispatcher = {
	useState: updateState,
	useEffect: updateEffect,
	useLayoutEffect: updateLayoutEffect,
	useTransition: updateTransition,
	useRef: updateRef,
	useContext: readContext
};

export function renderWithHooks(wip: FiberNode, lane: Lane) {
	currentRenderingFiber = wip; // set current render fiber to wip
	wip.memorizedState = null;
	wip.updateQueue = null;
	renderLane = lane;

	const current = wip.alternate;
	if (current !== null) {
		//update
		currentDispathcher.current = HooksDispatcherOnUpdate;
	} else {
		// mount
		currentDispathcher.current = HooksDispatcherOnMount;
	}

	const Component = wip.type;
	const props: Props = wip.pendingProps;
	const children = Component(props);

	currentRenderingFiber = null; // current wip render finish
	workInProgressHook = null;
	currentHook = null;
	renderLane = NoLane;

	return children;
}

function mountWorkInProgressHook(): Hook {
	const hook: Hook = {
		memorizedState: null,
		updateQueue: null,
		next: null,
		baseState: null,
		baseQueue: null
	};
	if (workInProgressHook === null) {
		if (currentRenderingFiber === null) {
			throw new Error('Hook must run in function component.');
		} else {
			workInProgressHook = hook;
			currentRenderingFiber.memorizedState = hook;
		}
	} else {
		workInProgressHook.next = hook;
		workInProgressHook = hook;
	}
	return workInProgressHook;
}

function updateWorkInProgressHook(): Hook {
	let nextCurrentHook: Hook | null = null;
	if (currentHook === null) {
		const current = currentRenderingFiber?.alternate;
		if (current !== null) {
			nextCurrentHook = current?.memorizedState;
		} else {
			nextCurrentHook = null;
		}
	} else {
		nextCurrentHook = currentHook.next;
	}
	if (nextCurrentHook === null) {
		// the number of hooks is more than last time
		throw new Error('The number of hooks is more than last time');
	}
	currentHook = nextCurrentHook;
	const newHook: Hook = {
		memorizedState: currentHook.memorizedState,
		updateQueue: currentHook.updateQueue,
		next: null,
		baseState: currentHook.baseState,
		baseQueue: currentHook.baseQueue
	};
	if (workInProgressHook === null) {
		if (currentRenderingFiber === null) {
			throw new Error('Hook must run in function component.');
		} else {
			workInProgressHook = newHook;
			currentRenderingFiber.memorizedState = newHook;
		}
	} else {
		workInProgressHook.next = newHook;
		workInProgressHook = newHook;
	}
	return workInProgressHook;
}

function dispatchSetState<T>(
	fiber: FiberNode,
	queue: UpdateQueue<T>,
	action: Action<T>
) {
	const lane = requestUpdateLane();
	const update = createUpdate(action, lane);
	enqueUpdate(queue, update);
	scheduleUpdateOnFiber(fiber, lane);
}

function createFCUpdateQueue<State>() {
	const updateQueue = createUpdateQueue<State>() as FCUpdateQueue<State>;
	updateQueue.lastEffect = null;
	return updateQueue;
}
