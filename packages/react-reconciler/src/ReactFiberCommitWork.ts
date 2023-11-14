import { Container, appendChildToContainer, commitUpdate, removeChild } from 'hostConfig';
import { FiberNode, FiberRootNode } from './ReactFiber';
import { ChildDeletion, MutationMask, NoFlags, Placement, Update } from './ReactFiberFlags';
import { FunctionComponent, HostComponent, HostRoot, HostText } from './ReactWorkTags';

let nextEffect: FiberNode | null = null;

export function commitMutationEffects(finishedWork: FiberNode) {
	nextEffect = finishedWork;
	while (nextEffect !== null) {
		const child: FiberNode | null = nextEffect.child;
		if ((nextEffect.subtreeFlags & MutationMask) !== NoFlags && child !== null) {
			nextEffect = child;
		} else {
			up: while (nextEffect !== null) {
				commitMutationEffectsOnFiber(nextEffect);
				const sibling: FiberNode | null = nextEffect.sibling;
				if (sibling !== null) {
					nextEffect = sibling;
					break up;
				}
				nextEffect = nextEffect.return;
			}
		}
	}
}

function commitMutationEffectsOnFiber(finishedWork: FiberNode) {
	let flags = finishedWork.flags;
	if ((flags & Placement) !== NoFlags) {
		commitPlacement(finishedWork);
		finishedWork.flags &= ~Placement;
		flags = finishedWork.flags;
	}
	if ((flags & Update) !== NoFlags) {
		commitUpdate(finishedWork);
		finishedWork.flags &= ~Update;
		flags = finishedWork.flags;
	}
	if ((flags & ChildDeletion) !== NoFlags) {
		const deletions = finishedWork.deletions;
		if (deletions !== null) {
			deletions.forEach(child => {
				commitDeletion(child);
			})
		}
		finishedWork.flags &= ~ChildDeletion;
		flags = finishedWork.flags;
	}
}

function commitDeletion(childToDelete: FiberNode) {

	let rootHostNode: FiberNode | null = null;

	commitNestedComponent(childToDelete, (fiber: FiberNode) => {
		switch (fiber.tag) {
			case HostComponent:
				if (rootHostNode === null) {
					rootHostNode = fiber;
				}
				return;
			case HostText:
				if (rootHostNode === null) {
					rootHostNode = fiber;
				}
				return;
			case FunctionComponent:
				// TODO: useEffect unmount
				return;
			default:
				return;
		}
	})

	if (rootHostNode !== null) {
		const hostParent = getHostParents(childToDelete);
		if (hostParent !== null) {
			removeChild((<FiberNode>rootHostNode).stateNode, hostParent);
		}
	}

	childToDelete.return = null;
	childToDelete.child = null;
}
function commitNestedComponent(
	root: FiberNode,
	onCommitUnmount: (fiber: FiberNode) => void
) {
	let node = root;
	while (true) {
		onCommitUnmount(node);
		if (node.child !== null) {
			node.child.return = node;
			node = node.child;
			continue;
		}
		if (node === root) {
			return;
		}
		while (node.sibling === null) {
			if (node.return === null || node.return === root) {
				return;
			}
			node = node.return;
		}
		node.sibling.return = node;
		node = node.sibling;
	}
}
function commitPlacement(finishedWork: FiberNode) {
	if (__DEV__) {
		console.warn('commitPlacement start', finishedWork);
	}

	const hostParent = getHostParents(finishedWork);
	if (hostParent !== null) {
		appendPlacementNodeIntoContainer(finishedWork, hostParent);
	} else {
		if (__DEV__) {
			console.warn('hostParent is NULL!!');
		}
	}
}

function getHostParents(fiber: FiberNode): Container | null {
	let parent = fiber.return;
	while (parent) {
		const parentTag = parent.tag;
		// HostComponent HostRoot
		if (parentTag === HostComponent) {
			return parent.stateNode as Container;
		}
		if (parentTag === HostRoot) {
			return (parent.stateNode as FiberRootNode).container;
		}
		parent = parent.return;
	}
	if (__DEV__) {
		console.warn('getHostParents:' + 'did not find the host parent');
	}
	return null;
}

function appendPlacementNodeIntoContainer(
	finishedWork: FiberNode,
	hostParent: Container
) {
	const tag = finishedWork.tag;
	if (tag === HostComponent || tag === HostText) {
		appendChildToContainer(hostParent, finishedWork.stateNode);
		return;
	}
	const child = finishedWork.child;
	if (child !== null) {
		appendPlacementNodeIntoContainer(child, hostParent);
		let sibling = finishedWork.sibling;
		while (sibling !== null) {
			appendPlacementNodeIntoContainer(sibling, hostParent);
			sibling = sibling.sibling;
		}
	}
}
