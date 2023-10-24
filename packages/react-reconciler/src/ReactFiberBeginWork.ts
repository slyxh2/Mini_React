import { ReactElementType } from 'shared/ReactTypes';
import { FiberNode } from './ReactFiber';
import { UpdateQueue, processUpdateQueue } from './ReactFiberUpdateQueue';
import {
	FunctionComponent,
	HostComponent,
	HostRoot,
	HostText
} from './ReactWorkTags';
import { mountChildFibers, reconcileChildFibers } from './ReactChildFibers';
import { renderWithHooks } from './ReactFiberHooks';
/**
 * Mount -> the first time run React
 * In mount stage, HostFiberNode will 1. calculate the new state 2. create the child fiberNode
 *
 */

// Compared with child ReactElement and child FiberNode return the child FiberNode
// wip -> working in progress
export const beginWork = (wip: FiberNode): FiberNode | null => {
	switch (wip.tag) {
		case HostRoot:
			return updateHostRoot(wip);
		case HostComponent:
			return updateHostElement(wip);
		case HostText:
			return null;
		case FunctionComponent:
			return updateFunctionComponent(wip);
		default:
			if (__DEV__) {
				console.warn('This Fiber type is not implement');
			}
			return null;
	}
};

// in the mount stage, the update type of HostRootFiber is ReactElement. e.g. <App />
const updateHostRoot = (wip: FiberNode): FiberNode | null => {
	const baseState = wip.memorizedState;
	const updateQueue = wip.updateQueue as UpdateQueue<ReactElementType>;
	const pendingUpdate = updateQueue.shared.pending;
	const { memorizedState } = processUpdateQueue<ReactElementType>(
		baseState,
		pendingUpdate
	);
	wip.memorizedState = memorizedState;
	const nextChildren: ReactElementType = wip.memorizedState;
	reconcileChildren(wip, nextChildren);
	return wip.child;
};

const updateHostElement = (wip: FiberNode): FiberNode | null => {
	const nextProps = wip.pendingProps;
	const nextChildren = nextProps.children;
	reconcileChildren(wip, nextChildren);
	return wip.child;
};

const updateFunctionComponent = (wip: FiberNode): FiberNode | null => {
	const nextChildren = renderWithHooks(wip);
	reconcileChildren(wip, nextChildren);
	return wip.child;
};

const reconcileChildren = (wip: FiberNode, children?: ReactElementType) => {
	const current = wip.alternate;
	if (current !== null) {
		// update or HostFiberNode in the mount stage
		wip.child = reconcileChildFibers(wip, current.child, children);
	} else {
		// mount
		wip.child = mountChildFibers(wip, null, children);
	}
};
