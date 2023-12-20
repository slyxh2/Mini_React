import { Action, Props } from 'shared/ReactTypes';
import { FiberNode } from './ReactFiber';
import {
	Dispatch,
	Dispatcher,
	Hook,
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

const { currentDispathcher } = internals;
let currentRenderingFiber: FiberNode | null = null;
let workInProgressHook: Hook | null = null;
let currentHook: Hook | null = null;

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
	if (pending !== null) {
		const { memorizedState } = processUpdateQueue(hook.memorizedState, pending);
		hook.memorizedState = memorizedState;
	}
	return [hook.memorizedState, queue.dispatch as Dispatch<T>];
};

const HooksDispatcherOnMount: Dispatcher = {
	useState: mountState
};

const HooksDispatcherOnUpdate: Dispatcher = {
	useState: updateState
};

export function renderWithHooks(wip: FiberNode) {
	currentRenderingFiber = wip; // set current render fiber to wip
	wip.memorizedState = null;

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
	enqueUpdate(queue, createUpdate(action));
	scheduleUpdateOnFiber(fiber);
}
