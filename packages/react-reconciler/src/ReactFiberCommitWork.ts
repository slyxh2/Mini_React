import { Container, appendChildToContainer } from 'hostConfig';
import { FiberNode, FiberRootNode } from './ReactFiber';
import { MutationMask, NoFlags, Placement } from './ReactFiberFlags';
import { HostComponent, HostRoot, HostText } from './ReactWorkTags';

let nextEffect: FiberNode | null = null;

export function commitMutationEffects(finishedWork: FiberNode) {
	nextEffect = finishedWork;
	while (nextEffect !== null) {
		const child: FiberNode | null = nextEffect.child;
		if (child !== null && child.flags && MutationMask !== NoFlags) {
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
	if ((flags && Placement) !== NoFlags) {
		commitPlacement(finishedWork);
		finishedWork.flags &= ~Placement;
		flags = finishedWork.flags;
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
