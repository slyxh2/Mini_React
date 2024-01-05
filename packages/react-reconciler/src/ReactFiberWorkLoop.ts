import {
	unstable_scheduleCallback as scheduleCallback,
	unstable_NormalPriority as NormalPriority,
	unstable_shouldYield,
	unstable_cancelCallback
} from 'scheduler';
import { scheduleMicroTask } from 'hostConfig';
import {
	FiberNode,
	FiberRootNode,
	PendingPassiveEffects,
	createWorkInProgress
} from './ReactFiber';
import { beginWork } from './ReactFiberBeginWork';
import {
	commitHookEffectListCreate,
	commitHookEffectListDestory,
	commitHookEffectListUnmount,
	commitMutationEffects
} from './ReactFiberCommitWork';
import { completeWork } from './ReactFiberCompleteWork';
import { MutationMask, NoFlags, PassiveMask } from './ReactFiberFlags';
import {
	Lane,
	NoLane,
	SyncLane,
	getHighestPriorityLane,
	lanesToSchedulerPriority,
	markRootFinished,
	mergeLanes
} from './ReactFiberLane';
import { HostRoot } from './ReactWorkTags';
import { flushSyncCallbacks, scheduleSyncCallback } from './ReactSyncTaskQueue';
import { HookHasEffect, Passive } from './ReactHookEffectTags';

let workInProgress: FiberNode | null = null;
let wipRootRenderLane: Lane = NoLane;
let rootDoesHasPassiveEffects: boolean = false;

type RootExitStatus = number;
const RootInComplete = 1;
const RootComplete = 2;

export function scheduleUpdateOnFiber(fiber: FiberNode, lane: Lane) {
	if (__DEV__) {
		console.warn('scheduleUpdateOnFiber start, lane:', lane);
	}
	const root = markUpdateFromFiberToRoot(fiber);
	if (root !== null) {
		markRootUpdated(root, lane);
		ensureRootIsScheduled(root);
	}
}

function markRootUpdated(root: FiberRootNode, lane: Lane) {
	root.pendingLanes = mergeLanes(root.pendingLanes, lane);
}

function ensureRootIsScheduled(root: FiberRootNode) {
	if (__DEV__) {
		console.warn('ensureRootIsScheduled');
	}
	const lane = getHighestPriorityLane(root.pendingLanes);
	const existingCallbackNode = root.callbackNode;

	if (lane === NoLane) {
		if (existingCallbackNode !== null) {
			unstable_cancelCallback(existingCallbackNode);
		}
		root.callbackNode = null;
		root.callbackPriority = NoLane;
		return;
	}

	const currPriority = lane;
	const prevPriority = root.callbackPriority;
	if (currPriority === prevPriority) {
		return;
	}

	if (existingCallbackNode !== null) {
		unstable_cancelCallback(existingCallbackNode);
	}

	let newCallbackNode = null;

	if (lane === SyncLane) {
		// micro schedule
		if (__DEV__) {
			console.log('micro schedule, Lane: ', lane);
		}
		// batch update
		scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root));
		scheduleMicroTask(flushSyncCallbacks);
	} else {
		// macro schedule
		const schedulerPriority = lanesToSchedulerPriority(lane);
		newCallbackNode = scheduleCallback(
			schedulerPriority,
			performConcurrentWorkOnRoot.bind(null, root)
		);
	}
	root.callbackNode = newCallbackNode;
	root.callbackPriority = currPriority;
}

function markUpdateFromFiberToRoot(fiber: FiberNode): FiberRootNode | null {
	while (fiber.return) {
		fiber = fiber.return;
	}
	if (fiber.tag === HostRoot) {
		return fiber.stateNode;
	}
	return null;
}

function prepareFreshStack(root: FiberRootNode, lane: Lane) {
	root.finishedLane = NoLane;
	root.finishedWork = null;
	workInProgress = createWorkInProgress(root.current, {});
	wipRootRenderLane = lane;
}

function performConcurrentWorkOnRoot(
	root: FiberRootNode,
	didTimeout: boolean
): any {
	// make sure all passive effect was called before work
	// e.g. useEffect run higher priority update, we can know and run higher first
	const currCallback = root.callbackNode;
	const didFlushPassiveEffect = flushPassiveEffects(root.pendingPassiveEffects);
	if (didFlushPassiveEffect) {
		// has higher priority update
		if (root.callbackNode !== currCallback) {
			return null;
		}
	}

	const lane = getHighestPriorityLane(root.pendingLanes);
	const currCallbackNode = root.callbackNode;
	if (lane === NoLane) {
		return null;
	}
	const needSync = lane === SyncLane || didTimeout;

	const existStatus = renderRoot(root, lane, !needSync);

	ensureRootIsScheduled(root);

	if (existStatus === RootInComplete) {
		// render was yield
		if (root.callbackNode !== currCallbackNode) {
			// higher priority task
			return null;
		}
		return performConcurrentWorkOnRoot.bind(null, root);
	}

	if (existStatus === RootComplete) {
		const finishedWork = root.current.alternate;
		root.finishedWork = finishedWork;
		wipRootRenderLane = NoLane;
		root.finishedLane = lane;

		commitRoot(root);
	} else if (__DEV__) {
		console.warn('did not handle concurrent work not complete case');
	}
}

function performSyncWorkOnRoot(root: FiberRootNode) {
	const lane = getHighestPriorityLane(root.pendingLanes);
	if (lane !== SyncLane) {
		ensureRootIsScheduled(root);
		return;
	}

	const existStatus = renderRoot(root, lane, false);

	if (existStatus === RootComplete) {
		const finishedWork = root.current.alternate;
		root.finishedWork = finishedWork;
		wipRootRenderLane = NoLane;
		root.finishedLane = lane;

		commitRoot(root);
	} else if (__DEV__) {
		console.warn('did not handle sync work not complete case');
	}
}

function renderRoot(
	root: FiberRootNode,
	lane: Lane,
	shouldTimeSlice: boolean
): RootExitStatus {
	if (__DEV__) {
		console.warn(`${shouldTimeSlice ? 'Concurrent' : 'Sync'} render start`);
	}
	if (wipRootRenderLane !== lane) {
		prepareFreshStack(root, lane);
	}

	while (true) {
		try {
			shouldTimeSlice ? workLoopConcurrent() : workLoopSync();
			break;
		} catch (e) {
			if (__DEV__) {
				console.warn(e);
			}
			workInProgress = null;
		}
	}

	// render was yield
	if (shouldTimeSlice && workInProgress !== null) {
		return RootInComplete;
	}
	if (!shouldTimeSlice && workInProgress !== null && __DEV__) {
		console.warn('After Render, wip can not be null!!');
	}
	return RootComplete;
}

function workLoopSync() {
	while (workInProgress !== null) {
		performUnitOfWork(workInProgress);
	}
}

function workLoopConcurrent() {
	while (workInProgress !== null && !unstable_shouldYield()) {
		performUnitOfWork(workInProgress);
	}
}

function performUnitOfWork(fiber: FiberNode) {
	const next = beginWork(fiber, wipRootRenderLane);
	fiber.memorizedProps = fiber.pendingProps;
	if (next === null) {
		completeUnitOfWork(fiber);
	} else {
		workInProgress = next;
	}
}

function completeUnitOfWork(fiber: FiberNode) {
	let node: FiberNode | null = fiber;
	do {
		completeWork(node);
		const sibling = node.sibling;

		if (sibling !== null) {
			workInProgress = sibling;
			return;
		}
		node = node.return;
		workInProgress = node;
	} while (node !== null);
}

function flushPassiveEffects(
	pendingPassiveEffects: PendingPassiveEffects
): boolean {
	let didFlushPassiveEffect = false;
	pendingPassiveEffects.unmount.forEach((effect) => {
		didFlushPassiveEffect = true;
		commitHookEffectListUnmount(Passive, effect);
	});
	pendingPassiveEffects.unmount = [];

	pendingPassiveEffects.update.forEach((effect) => {
		didFlushPassiveEffect = true;
		commitHookEffectListDestory(Passive | HookHasEffect, effect);
	});
	pendingPassiveEffects.update.forEach((effect) => {
		didFlushPassiveEffect = true;
		commitHookEffectListCreate(Passive | HookHasEffect, effect);
	});
	pendingPassiveEffects.update = [];

	flushSyncCallbacks();
	return didFlushPassiveEffect;
}

function commitRoot(root: FiberRootNode) {
	const finishedWork = root.finishedWork;
	if (finishedWork === null) return;
	if (__DEV__) {
		console.warn('commit root starts', finishedWork);
	}
	const lane = root.finishedLane;
	if (lane === NoLane && __DEV__) {
		console.warn('root.finishedLane is NoLane!');
	}

	markRootFinished(root, lane);
	root.finishedWork = null;
	root.finishedLane = NoLane;

	// see if has effect(useEffect)
	if (
		(finishedWork.flags & PassiveMask) !== NoFlags ||
		(finishedWork.subtreeFlags & PassiveMask) !== NoFlags
	) {
		if (!rootDoesHasPassiveEffects) {
			rootDoesHasPassiveEffects = true;
			// MacroTask -> schedule
			scheduleCallback(NormalPriority, () => {
				flushPassiveEffects(root.pendingPassiveEffects);
				return;
			});
		}
	}

	// see if three commit sub stage need to be processed
	const subtreeHasEffect =
		(finishedWork.subtreeFlags & MutationMask) !== NoFlags;
	const rootHasEffect = (finishedWork.flags & MutationMask) !== NoFlags;
	if (subtreeHasEffect || rootHasEffect) {
		// 1. beforeMutation
		// 2. Mutation
		commitMutationEffects(finishedWork, root);
		root.current = finishedWork; // change wip fiber tree to current after mutation
		// 3. layout (After Mutation useLayoutEffect)
	} else {
		root.current = finishedWork;
	}
	rootDoesHasPassiveEffects = false;
	ensureRootIsScheduled(root);
}
