import { Action, Props } from 'shared/ReactTypes';
import { FiberNode } from './ReactFiber';
import {
	Dispatch,
	Dispatcher,
	Effect,
	EffectCallback,
	EffectDeps,
	Hook,
	UseEffectType,
	UseStateType
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
import { Flags, PassiveEffect } from './ReactFiberFlags';
import { HookHasEffect, Passive } from './ReactHookEffectTags';

export interface FCUpdateQueue<State> extends UpdateQueue<State> {
	lastEffect: Effect | null;
}

const { currentDispathcher } = internals;
let currentRenderingFiber: FiberNode | null = null;
let workInProgressHook: Hook | null = null;
let currentHook: Hook | null = null;
let renderLane: Lane = NoLane;

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

	const dispatch = (dispatchSetState<T>).bind(
		null,
		currentRenderingFiber!,
		updateQueue
	);
	updateQueue.dispatch = dispatch;
	return [memorizedState, dispatch];
};

// useState in update stage
const updateState: UseStateType = <T>(): [T, Dispatch<T>] => {
	const hook = updateWorkInProgressHook();
	const queue = hook.updateQueue as UpdateQueue<T>;
	const pending = queue.shared.pending;
	queue.shared.pending = null;
	if (pending !== null) {
		const { memorizedState } = processUpdateQueue(
			hook.memorizedState,
			pending,
			renderLane
		);
		hook.memorizedState = memorizedState;
	}
	return [hook.memorizedState, queue.dispatch as Dispatch<T>];
};

// useEffect in mount stage
const mountEffect: UseEffectType = (create, deps) => {
	const hook = mountWorkInProgressHook();
	const nextDeps = deps === undefined ? null : deps;
	(currentRenderingFiber as FiberNode).flags |= PassiveEffect;
	hook.memorizedState = pushEffect(
		Passive | HookHasEffect,
		create,
		undefined,
		nextDeps
	);
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

function createFCUpdateQueue<State>() {
	const updateQueue = createUpdateQueue<State>() as FCUpdateQueue<State>;
	updateQueue.lastEffect = null;
	return updateQueue;
}

// useEffect in update stage
const updateEffect: UseEffectType = (create, deps) => {
	const hook = updateWorkInProgressHook();
	const nextDeps = deps === undefined ? null : deps;
	let destory: EffectCallback | void = undefined;
	if (hook !== null) {
		const prevEffect = hook.memorizedState as Effect;
		destory = prevEffect.destory;
		if (nextDeps !== null) {
			const prevDeps = prevEffect.deps;
			if (areHookInputsEqual(nextDeps, prevDeps)) {
				hook.memorizedState = pushEffect(Passive, create, destory, nextDeps);
				return;
			}
		}
	}
	(currentRenderingFiber as FiberNode).flags |= PassiveEffect;
	hook.memorizedState = pushEffect(
		Passive | HookHasEffect,
		create,
		destory,
		nextDeps
	);
};

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

const HooksDispatcherOnMount: Dispatcher = {
	useState: mountState,
	useEffect: mountEffect
};

const HooksDispatcherOnUpdate: Dispatcher = {
	useState: updateState,
	useEffect: updateEffect
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
		next: null
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
		next: null
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
