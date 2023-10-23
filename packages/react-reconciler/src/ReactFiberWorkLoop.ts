import { FiberNode, FiberRootNode, createWorkInProgress } from './ReactFiber';
import { beginWork } from './ReactFiberBeginWork';
import { commitMutationEffects } from './ReactFiberCommitWork';
import { completeWork } from './ReactFiberCompleteWork';
import { MutationMask, NoFlags } from './ReactFiberFlags';
import { HostRoot } from './ReactWorkTags';

let workInProgress: FiberNode | null = null;

export function scheduleUpdateOnFiber(fiber: FiberNode) {
	const root = markUpdateFromFiberToRoot(fiber);
	if (root !== null) {
		renderRoot(root);
	}
}

function markUpdateFromFiberToRoot(fiber: FiberNode): FiberRootNode | null {
	if (__DEV__) {
		console.warn('markUpdateFromFiberToRoot start');
	}
	while (fiber.return) {
		fiber = fiber.return;
	}
	if (fiber.tag === HostRoot) {
		return fiber.stateNode;
	}
	return null;
}

function prepareFreshStack(root: FiberRootNode) {
	workInProgress = createWorkInProgress(root.current, {});
}

function renderRoot(root: FiberRootNode) {
	prepareFreshStack(root);

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
	if (__DEV__) {
		console.log(root);
	}
	const finishedWork = root.current.alternate;
	root.finishedWork = finishedWork;
	commitRoot(root);
}

function commitRoot(root: FiberRootNode) {
	const finishedWork = root.finishedWork;
	if (finishedWork === null) return;
	if (__DEV__) {
		console.warn('commit root starts');
	}
	root.finishedWork = null;

	// see if three commit sub stage need to be processed

	const subtreeHasEffect =
		(finishedWork.subtreeFlags & MutationMask) !== NoFlags;
	const rootHasEffect = (finishedWork.flags & MutationMask) !== NoFlags;
	if (subtreeHasEffect || rootHasEffect) {
		// 1. beforeMutation
		// 2. Mutation
		commitMutationEffects(finishedWork);
		root.current = finishedWork; // change wip fiber tree to current after mutation
		// 3. layout (After Mutation useLayoutEffect)
	} else {
		root.current = finishedWork;
	}
}

function workLoop() {
	while (workInProgress !== null) {
		performUnitOfWork(workInProgress);
	}
}

function performUnitOfWork(fiber: FiberNode) {
	const next = beginWork(fiber);
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
