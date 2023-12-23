import {
	unstable_scheduleCallback as scheduleCallback,
	unstable_NormalPriority as NormalPriority
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
	markRootFinished,
	mergeLanes
} from './ReactFiberLane';
import { HostRoot } from './ReactWorkTags';
import { flushSyncCallbacks, scheduleSyncCallback } from './ReactSyncTaskQueue';
import { HookHasEffect, Passive } from './ReactHookEffectTags';

let workInProgress: FiberNode | null = null;
let wipRootRenderLand: Lane = NoLane;
let rootDoesHasPassiveEffects: boolean = false;

export function scheduleUpdateOnFiber(fiber: FiberNode, lane: Lane) {
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
	const updateLane = getHighestPriorityLane(root.pendingLanes);
	if (updateLane === NoLane) {
		return;
	}

	if (updateLane === SyncLane) {
		// micro schedule
		if (__DEV__) {
			console.log('micro schedule, Lane: ', updateLane);
		}
		scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root, updateLane));
		scheduleMicroTask(flushSyncCallbacks);
	} else {
		// macro schedule
	}
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
	workInProgress = createWorkInProgress(root.current, {});
	wipRootRenderLand = lane;
}

function performSyncWorkOnRoot(root: FiberRootNode, lane: Lane) {
	const nextLane = getHighestPriorityLane(root.pendingLanes);
	if (nextLane !== SyncLane) {
		ensureRootIsScheduled(root);
		return;
	}
	prepareFreshStack(root, lane);

	while (true) {
		try {
			workLoop();
			break;
		} catch (e) {
			if (__DEV__) {
				console.warn(e);
			}
			workInProgress = null;
		}
	}

	const finishedWork = root.current.alternate;
	root.finishedWork = finishedWork;
	wipRootRenderLand = NoLane;
	root.finishedLane = lane;

	commitRoot(root);
}

function workLoop() {
	while (workInProgress !== null) {
		performUnitOfWork(workInProgress);
	}
}

function performUnitOfWork(fiber: FiberNode) {
	const next = beginWork(fiber, wipRootRenderLand);
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

function flushPassiveEffects(pendingPassiveEffects: PendingPassiveEffects) {
	pendingPassiveEffects.unmount.forEach((effect) => {
		commitHookEffectListUnmount(Passive, effect);
	});
	pendingPassiveEffects.unmount = [];

	pendingPassiveEffects.update.forEach((effect) => {
		commitHookEffectListDestory(Passive | HookHasEffect, effect);
	});
	pendingPassiveEffects.update.forEach((effect) => {
		commitHookEffectListCreate(Passive | HookHasEffect, effect);
	});
	pendingPassiveEffects.update = [];

	flushSyncCallbacks();
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
