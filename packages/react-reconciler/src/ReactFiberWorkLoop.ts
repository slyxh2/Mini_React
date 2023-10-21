import { FiberNode, FiberRootNode, createWorkInProgress } from './ReactFiber';
import { beginWork } from './ReactFiberBeginWork';
import { completeWork } from './ReactFiberCompleteWork';
import { HostRoot } from './ReactWorkTags';

let workInProgress: FiberNode | null = null;

export function scheduleUpdateOnFiber(fiber: FiberNode) {
	const root = markUpdateFromFiberToRoot(fiber);
	if (root !== null) {
		renderRoot(root);
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
			console.warn(e);
			workInProgress = null;
		}
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
	let node = fiber;
	while (true) {
		completeWork(node);
		if (node.sibling !== null) {
			workInProgress = node.sibling;
			return;
		}
		if (node.return !== null) {
			node = node.return;
			workInProgress = node;
			return;
		}
		workInProgress = null;
		return;
	}
}
