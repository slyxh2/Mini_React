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
	enqueUpdate
} from './ReactFiberUpdateQueue';
import { scheduleUpdateOnFiber } from './ReactFiberWorkLoop';

const { currentDispathcher } = internals;
let currentRenderingFiber: FiberNode | null = null;
let workInProgressHook: Hook | null = null;

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

const HooksDispatcherOnMount: Dispatcher = {
	useState: mountState
};

export function renderWithHooks(wip: FiberNode) {
	currentRenderingFiber = wip; // set current render fiber to wip
	wip.memorizedState = null;

	const current = wip.alternate;
	if (current !== null) {
		//update
	} else {
		// mount
		currentDispathcher.current = HooksDispatcherOnMount;
	}

	const Component = wip.type;
	const props: Props = wip.pendingProps;
	const children = Component(props);
	currentRenderingFiber = null; // current wip render finish
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

function dispatchSetState<T>(
	fiber: FiberNode,
	queue: UpdateQueue<T>,
	action: Action<T>
) {
	enqueUpdate(queue, createUpdate(action));
	scheduleUpdateOnFiber(fiber);
}
