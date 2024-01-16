import { ReactElementType } from 'shared/ReactTypes';
import {
	FiberNode,
	OffscreenProps,
	createFiberFromFragment,
	createFiberFromOffscreen,
	createWorkInProgress
} from './ReactFiber';
import { UpdateQueue, processUpdateQueue } from './ReactFiberUpdateQueue';
import {
	ContextProvider,
	Fragment,
	FunctionComponent,
	HostComponent,
	HostRoot,
	HostText,
	OffscreenComponent,
	SuspenseComponent
} from './ReactWorkTags';
import { mountChildFibers, reconcileChildFibers } from './ReactChildFibers';
import { renderWithHooks } from './ReactFiberHooks';
import { Lane } from './ReactFiberLane';
import {
	ChildDeletion,
	DidCapture,
	NoFlags,
	Placement,
	Ref
} from './ReactFiberFlags';
import { pushProvider } from './ReactFiberContext';
import { pushSuspenseHandler } from './ReactSuspenseContext';
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
		case ContextProvider:
			return updateContextProvider(wip);
		case SuspenseComponent:
			return updateSuspenseComponent(wip);
		case OffscreenComponent:
			return updateOffscreenComponent(wip);
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

const updateContextProvider = (wip: FiberNode): FiberNode | null => {
	const providerType = wip.type; // provider object
	const context = providerType._context;
	const newProps = wip.pendingProps;
	// update the context value
	pushProvider(context, newProps.value);

	const nextChildren = newProps.children;
	reconcileChildren(wip, nextChildren);
	return wip.child;
};

/**
 * handle Suspense
 */
const updateSuspenseComponent = (wip: FiberNode) => {
	console.log(22);
	const current = wip.alternate;
	const nextProps = wip.pendingProps;

	let showFallback: boolean = false; // render fallback compoennt
	const didSuspend: boolean = (wip.flags & DidCapture) !== NoFlags;

	if (didSuspend) {
		showFallback = true;
		wip.flags &= ~DidCapture;
	}
	const nextPrimaryChildren = nextProps.children;
	const nextFallbackChildren = nextProps.fallback;

	pushSuspenseHandler(wip);

	if (current === null) {
		// mount stage
		if (showFallback) {
			return mountSuspenseFallbackChildren(
				wip,
				nextPrimaryChildren,
				nextFallbackChildren
			);
		} else {
			return mountSuspensePrimaryChildren(wip, nextPrimaryChildren);
		}
	} else {
		// update stage
		if (showFallback) {
			return updateSuspenseFallbackChildren(
				wip,
				nextPrimaryChildren,
				nextFallbackChildren
			);
		} else {
			return updateSuspensePrimaryChildren(wip, nextPrimaryChildren);
		}
	}
};

function mountSuspenseFallbackChildren(
	wip: FiberNode,
	primaryChildren: any,
	fallbackChildren: any
) {
	const offscreenProps: OffscreenProps = {
		mode: 'hidden',
		children: primaryChildren
	};
	const primaryChildFragment = createFiberFromOffscreen(offscreenProps);
	const fallbackChildFragment = createFiberFromFragment(fallbackChildren, null);

	fallbackChildFragment.flags |= Placement;

	primaryChildFragment.return = wip;
	fallbackChildFragment.return = wip;
	primaryChildFragment.sibling = fallbackChildFragment;
	wip.child = primaryChildFragment;

	return fallbackChildFragment;
}

function mountSuspensePrimaryChildren(wip: FiberNode, primaryChildren: any) {
	const primaryChildProps: OffscreenProps = {
		mode: 'visible',
		children: primaryChildren
	};
	const primaryChildFragment = createFiberFromOffscreen(primaryChildProps);

	primaryChildFragment.return = wip;
	wip.child = primaryChildFragment;

	return primaryChildFragment;
}

function updateSuspenseFallbackChildren(
	wip: FiberNode,
	primaryChildren: any,
	fallbackChildren: any
) {
	const current = wip.alternate!;
	const currentPrimaryChildFragment = current.child!;
	const currentFallbackChildFragment: FiberNode | null =
		currentPrimaryChildFragment.sibling;

	const primaryChildProps: OffscreenProps = {
		mode: 'hidden',
		children: primaryChildren
	};

	const primaryChildFragment = createWorkInProgress(
		currentPrimaryChildFragment,
		primaryChildProps
	);

	let fallbackChildFragment;
	if (currentFallbackChildFragment !== null) {
		fallbackChildFragment = createWorkInProgress(
			currentFallbackChildFragment,
			fallbackChildren
		);
	} else {
		fallbackChildFragment = createFiberFromFragment(fallbackChildren, null);
		fallbackChildFragment.flags |= Placement;
	}

	fallbackChildFragment.return = wip;
	primaryChildFragment.return = wip;
	primaryChildFragment.sibling = fallbackChildFragment;
	wip.child = primaryChildFragment;

	return fallbackChildFragment;
}

function updateSuspensePrimaryChildren(wip: FiberNode, primaryChildren: any) {
	const current = wip.alternate!;
	const currentPrimaryChildFragment = current.child!;
	const currentFallbackChildFragment: FiberNode | null =
		currentPrimaryChildFragment.sibling;

	const primaryChildProps: OffscreenProps = {
		mode: 'visible',
		children: primaryChildren
	};

	const primaryChildFragment = createWorkInProgress(
		currentPrimaryChildFragment,
		primaryChildProps
	);

	primaryChildFragment.return = wip;
	primaryChildFragment.sibling = null;
	wip.child = primaryChildFragment;

	if (currentFallbackChildFragment !== null) {
		const deletions = wip.deletions;
		if (deletions === null) {
			wip.deletions = [currentFallbackChildFragment];
			wip.flags |= ChildDeletion;
		} else {
			deletions.push(currentFallbackChildFragment);
		}
	}

	return primaryChildFragment;
}

const updateOffscreenComponent = (wip: FiberNode) => {
	const nextProps = wip.pendingProps;
	const nextChildren = nextProps.children;
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
