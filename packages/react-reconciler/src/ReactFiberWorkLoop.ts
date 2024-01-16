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
	PendingLayoutEffects,
	PendingPassiveEffects,
	createWorkInProgress
} from './ReactFiber';
import { beginWork } from './ReactFiberBeginWork';
import {
	commitHookEffectListCreate,
	commitHookEffectListDestory,
	commitHookEffectListUnmount,
	commitLayoutEffects,
	commitMutationEffects
} from './ReactFiberCommitWork';
import { completeWork } from './ReactFiberCompleteWork';
import {
	LayoutEffectMask,
	MutationMask,
	NoFlags,
	PassiveMask
} from './ReactFiberFlags';
import {
	Lane,
	NoLane,
	SyncLane,
	getHighestPriorityLane,
	lanesToSchedulerPriority,
	markRootFinished,
	markRootSuspended,
	mergeLanes
} from './ReactFiberLane';
import { HostRoot } from './ReactWorkTags';
import { flushSyncCallbacks, scheduleSyncCallback } from './ReactSyncTaskQueue';
import {
	EffectTag,
	HookHasEffect,
	Layout,
	Passive
} from './ReactHookEffectTags';
import { SuspenseException, getSuspenseThenable } from './ReactThenable';
import { resetHooksOnUnwind } from './ReactFiberHooks';
import { throwException } from './ReactFiberThrow';
import { unwindWork } from './ReactFiberUnwindWork';

let workInProgress: FiberNode | null = null;
let wipRootRenderLane: Lane = NoLane;
let rootDoesHasPassiveEffects: boolean = false;

type RootExitStatus = number;
const RootInProgress = 0; // in rendering
const RootInComplete = 1; // render was yield when
const RootComplete = 2; // render finished
const RootDidNotComplete = 3; // suspending, do not enter commit stage
let wipRootExitStatus: number = RootInProgress;

const NotSuspended = 0;
const SuspendedOnData = 1;
type SuspendedReason = typeof NotSuspended | typeof SuspendedOnData;
let wipSuspendedReason: SuspendedReason = NotSuspended;
let wipThrownValue: any = null;

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

export function markRootUpdated(root: FiberRootNode, lane: Lane) {
	root.pendingLanes = mergeLanes(root.pendingLanes, lane);
}

export function ensureRootIsScheduled(root: FiberRootNode) {
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
	wipRootExitStatus = RootInProgress;
	wipSuspendedReason = NotSuspended;
	wipThrownValue = null;
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

	// start render stage
	const existStatus = renderRoot(root, lane, !needSync);

	switch (existStatus) {
		case RootInComplete:
			// render was yield
			if (root.callbackNode !== currCallbackNode) {
				// higher priority task
				return null;
			}
			return performConcurrentWorkOnRoot.bind(null, root);
		case RootComplete:
			const finishedWork = root.current.alternate;
			root.finishedWork = finishedWork;
			wipRootRenderLane = NoLane;
			root.finishedLane = lane;
			// start commit stage
			commitRoot(root);
			break;
		case RootDidNotComplete:
			// suspened
			wipRootRenderLane = NoLane;
			markRootSuspended(root, lane);
			ensureRootIsScheduled(root);
			break;
		default:
			if (__DEV__) {
				console.warn('did not handle concurrent work not complete case');
			}
			break;
	}
}

function performSyncWorkOnRoot(root: FiberRootNode) {
	const lane = getHighestPriorityLane(root.pendingLanes);
	if (lane !== SyncLane) {
		ensureRootIsScheduled(root);
		return;
	}

	const existStatus = renderRoot(root, lane, false);
	switch (existStatus) {
		case RootComplete:
			const finishedWork = root.current.alternate;
			root.finishedWork = finishedWork;
			wipRootRenderLane = NoLane;
			root.finishedLane = lane;

			commitRoot(root);
			return;
		case RootDidNotComplete:
			wipRootRenderLane = NoLane;
			markRootSuspended(root, lane);
			ensureRootIsScheduled(root);
			return;
		default:
			if (__DEV__) {
				console.warn('did not handle sync work not complete case');
			}
			return;
	}
}
let c = 0;
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
			if (wipSuspendedReason !== NotSuspended && workInProgress !== null) {
				// Suspense exist
				const thrownValue = wipThrownValue;
				wipSuspendedReason = NotSuspended;
				wipThrownValue = null;
				// unwind
				throwAndUnwindWorkLoop(root, workInProgress, thrownValue, lane);
			}
			shouldTimeSlice ? workLoopConcurrent() : workLoopSync();
			break;
		} catch (err) {
			if (__DEV__) {
				console.warn(err);
			}
			c++;
			if (c > 20) {
				console.warn('break');
				break;
			}
			// hadle the throw
			handleThrow(root, err);
		}
	}
	if (wipRootExitStatus !== RootInProgress) {
		return wipRootExitStatus;
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

function throwAndUnwindWorkLoop(
	root: FiberRootNode,
	unitOfWork: FiberNode,
	thrownValue: any,
	lane: Lane
) {
	// 1. reset Function Component global variable
	resetHooksOnUnwind();
	// 2. trigger new update
	throwException(root, thrownValue, lane);
	// 3. unwind
	unwindUnitOfWork(unitOfWork);
}

function unwindUnitOfWork(unitOfWork: FiberNode) {
	let incompleteWork: FiberNode | null = unitOfWork;

	do {
		const next = unwindWork(incompleteWork);
		if (next !== null) {
			workInProgress = next;
			return;
		}

		const returnFiber = incompleteWork.return as FiberNode;
		if (returnFiber !== null) {
			returnFiber.deletions = null;
		}
		incompleteWork = returnFiber;
	} while (incompleteWork !== null);

	wipRootExitStatus = RootDidNotComplete;
	workInProgress = null;
}

function handleThrow(root: FiberRootNode, thrownValue: any) {
	if (thrownValue === SuspenseException) {
		// suspense
		thrownValue = getSuspenseThenable();
		wipSuspendedReason = SuspendedOnData;
	}
	wipThrownValue = thrownValue;
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
	return flushEffects(pendingPassiveEffects, Passive);
}

function flushLayoutEffects(pendingLayoutEffects: PendingLayoutEffects) {
	flushEffects(pendingLayoutEffects, Layout);
}

function flushEffects(
	pendingEffects: PendingPassiveEffects | PendingLayoutEffects,
	effectTag: EffectTag
): boolean {
	let didFlushEffect = false;
	pendingEffects.unmount.forEach((effect) => {
		didFlushEffect = true;
		commitHookEffectListUnmount(effectTag, effect);
	});
	pendingEffects.unmount = [];

	pendingEffects.update.forEach((effect) => {
		didFlushEffect = true;
		commitHookEffectListDestory(effectTag | HookHasEffect, effect);
	});
	pendingEffects.update.forEach((effect) => {
		didFlushEffect = true;
		commitHookEffectListCreate(effectTag | HookHasEffect, effect);
	});
	pendingEffects.update = [];

	flushSyncCallbacks();
	return didFlushEffect;
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
	const hasLayoutEffect =
		(finishedWork.flags & LayoutEffectMask) !== NoFlags ||
		(finishedWork.subtreeFlags & LayoutEffectMask) !== NoFlags;
	if (subtreeHasEffect || rootHasEffect) {
		// 1. beforeMutation
		// 2. Mutation
		commitMutationEffects(finishedWork, root);
		root.current = finishedWork; // change wip fiber tree to current after mutation
		// 3. layout (useLayoutEffect, handle Ref)
		commitLayoutEffects(finishedWork, root);
		if (hasLayoutEffect) {
			flushLayoutEffects(root.pendingLayoutEffects);
		}
	} else {
		root.current = finishedWork;
	}
	rootDoesHasPassiveEffects = false;
	ensureRootIsScheduled(root);
}
