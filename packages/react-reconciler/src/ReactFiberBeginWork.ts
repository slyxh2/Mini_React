import { ReactElementType } from 'shared/ReactTypes';
import { FiberNode } from './ReactFiber';
import { UpdateQueue, processUpdateQueue } from './ReactFiberUpdateQueue';
import {
	Fragment,
	FunctionComponent,
	HostComponent,
	HostRoot,
	HostText
} from './ReactWorkTags';
import { mountChildFibers, reconcileChildFibers } from './ReactChildFibers';
import { renderWithHooks } from './ReactFiberHooks';
import { Lane } from './ReactFiberLane';
import { Ref } from './ReactFiberFlags';
/**
 * Mount -> the first time run React
 * In mount stage, HostFiberNode will 1. calculate the new state 2. create the child fiberNode
 *
 */

// Compared with child ReactElement and child FiberNode return the child FiberNode
// wip -> working in progress
export const beginWork = (
	wip: FiberNode,
	renderLane: Lane
): FiberNode | null => {
	switch (wip.tag) {
		case HostRoot:
			return updateHostRoot(wip, renderLane);
		case HostComponent:
			return updateHostElement(wip);
		case HostText:
			return null;
		case FunctionComponent:
			return updateFunctionComponent(wip, renderLane);
		case Fragment:
			return updateFragment(wip);
		default:
			if (__DEV__) {
				console.warn('This Fiber type is not implement');
			}
			return null;
	}
};

// in the mount stage, the update type of HostRootFiber is ReactElement. e.g. <App />
const updateHostRoot = (wip: FiberNode, renderLane: Lane): FiberNode | null => {
	const baseState = wip.memorizedState;
	const updateQueue = wip.updateQueue as UpdateQueue<ReactElementType>;
	const pendingUpdate = updateQueue.shared.pending;
	const { memorizedState } = processUpdateQueue<ReactElementType>(
		baseState,
		pendingUpdate,
		renderLane
	);
	wip.memorizedState = memorizedState;
	const nextChildren: ReactElementType = wip.memorizedState;
	reconcileChildren(wip, nextChildren);
	return wip.child;
};

const updateHostElement = (wip: FiberNode): FiberNode | null => {
	const nextProps = wip.pendingProps;
	const nextChildren = nextProps.children;
	markRef(wip.alternate, wip);
	reconcileChildren(wip, nextChildren);
	return wip.child;
};

const updateFunctionComponent = (
	wip: FiberNode,
	renderLane: Lane
): FiberNode | null => {
	const nextChildren = renderWithHooks(wip, renderLane);
	reconcileChildren(wip, nextChildren);
	return wip.child;
};

const updateFragment = (wip: FiberNode): FiberNode | null => {
	const nextChildren = wip.pendingProps;
	// const nextChildren = nextProps.children;
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

const markRef = (current: FiberNode | null, workInProgress: FiberNode) => {
	const ref = workInProgress.ref;

	if (
		(current === null && ref !== null) ||
		(current !== null && current.ref === ref)
	) {
		workInProgress.flags |= Ref;
	}
};
