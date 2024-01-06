import {
	Container,
	Instance,
	appendChildToContainer,
	commitUpdate,
	insertChildToContainer,
	removeChild
} from 'hostConfig';
import { FiberNode, FiberRootNode, PendingPassiveEffects } from './ReactFiber';
import {
	ChildDeletion,
	Flags,
	LayoutEffect,
	LayoutMask,
	MutationMask,
	NoFlags,
	PassiveEffect,
	PassiveMask,
	Placement,
	Ref,
	Update
} from './ReactFiberFlags';
import {
	FunctionComponent,
	HostComponent,
	HostRoot,
	HostText
} from './ReactWorkTags';
import { FCUpdateQueue } from './ReactFiberHooks';
import { EffectTag, HookHasEffect } from './ReactHookEffectTags';
import { Effect } from 'shared/ReactHookTypes';

type CommitStage = 'mutation' | 'layout';

let nextEffect: FiberNode | null = null;

export const commitMutationEffects = commitEffects(
	'mutation',
	MutationMask | PassiveMask,
	commitMutationEffectsOnFiber
);
export const commitLayoutEffects = commitEffects(
	'layout',
	LayoutMask,
	commitLayoutEffectsOnFiber
);

function commitMutationEffectsOnFiber(
	finishedWork: FiberNode,
	root: FiberRootNode
) {
	const { flags, tag } = finishedWork;
	if ((flags & Placement) !== NoFlags) {
		commitPlacement(finishedWork);
		finishedWork.flags &= ~Placement;
	}
	if ((flags & Update) !== NoFlags) {
		commitUpdate(finishedWork);
		finishedWork.flags &= ~Update;
	}
	if ((flags & ChildDeletion) !== NoFlags) {
		const deletions = finishedWork.deletions;
		if (deletions !== null) {
			deletions.forEach((child) => {
				commitDeletion(child, root);
			});
		}
		finishedWork.flags &= ~ChildDeletion;
	}

	if ((flags & PassiveEffect) !== NoFlags) {
		collectPassiveEffect(finishedWork, root, 'update');
		finishedWork.flags &= ~PassiveEffect;
	}
	if ((flags & Ref) !== NoFlags && tag === HostComponent) {
		safelyDetachRef(finishedWork);
	}
}

// unbind ref
function safelyDetachRef(current: FiberNode) {
	const ref = current.ref;
	if (ref !== null) {
		if (typeof ref === 'function') {
			ref(null);
		} else {
			ref.current = null;
		}
	}
}
function commitLayoutEffectsOnFiber(
	finishedWork: FiberNode,
	root: FiberRootNode
) {
	const { flags, tag } = finishedWork;
	if ((flags & Ref) !== NoFlags && tag === HostComponent) {
		// bind new Ref
		safelyAttachRef(finishedWork);
	}
	if ((flags & LayoutEffect) !== NoFlags) {
		collectLayoutEffect(finishedWork, root, 'update');
		finishedWork.flags &= ~LayoutEffect;
	}
}

function safelyAttachRef(fiber: FiberNode) {
	const ref = fiber.ref;
	if (ref !== null) {
		const instance = fiber.stateNode;
		if (typeof ref === 'function') {
			ref(instance);
		} else {
			ref.current = instance;
		}
	}
}

export function commitEffects(
	phase: CommitStage,
	mask: Flags,
	callback: (fiber: FiberNode, root: FiberRootNode) => void
) {
	return function (finishedWork: FiberNode, root: FiberRootNode) {
		nextEffect = finishedWork;
		while (nextEffect !== null) {
			const child: FiberNode | null = nextEffect.child;
			if ((nextEffect.subtreeFlags & mask) !== NoFlags && child !== null) {
				nextEffect = child;
			} else {
				up: while (nextEffect !== null) {
					callback(nextEffect, root);
					const sibling: FiberNode | null = nextEffect.sibling;
					if (sibling !== null) {
						nextEffect = sibling;
						break up;
					}
					nextEffect = nextEffect.return;
				}
			}
		}
	};
}

// collect useEffect callback
function collectPassiveEffect(
	fiber: FiberNode,
	root: FiberRootNode,
	type: keyof PendingPassiveEffects
) {
	if (fiber.tag !== FunctionComponent) return;
	if (type === 'update' && (fiber.flags & PassiveEffect) === NoFlags) return;
	const updateQueue = fiber.updateQueue as FCUpdateQueue<any>;
	if (updateQueue !== null) {
		if (updateQueue.lastEffect === null && __DEV__) {
			console.error('If update Queue exist, it must has lastEffect!!');
		}
		root.pendingPassiveEffects[type].push(updateQueue.lastEffect!);
	}
}

// collect useLayoutEffect callback
function collectLayoutEffect(
	fiber: FiberNode,
	root: FiberRootNode,
	type: keyof PendingPassiveEffects
) {
	if (fiber.tag !== FunctionComponent) return;
	if (type === 'update' && (fiber.flags & LayoutEffect) === NoFlags) return;
	const updateQueue = fiber.updateQueue as FCUpdateQueue<any>;
	if (updateQueue !== null) {
		if (updateQueue.lastEffect === null && __DEV__) {
			console.error('If update Queue exist, it must has lastEffect!!');
		}
		root.pendingLayoutEffects[type].push(updateQueue.lastEffect!);
	}
}

function commitHookEffectList(
	tags: EffectTag,
	lastEffect: Effect,
	callback: (effect: Effect) => void
) {
	let effect = lastEffect.next as Effect;
	do {
		if ((effect.tag & tags) === tags) {
			callback(effect);
		}
		effect = effect.next as Effect;
	} while (effect !== lastEffect.next);
}

// in unmount stage, call all destory callback
export function commitHookEffectListUnmount(
	tags: EffectTag,
	lastEffect: Effect
) {
	commitHookEffectList(tags, lastEffect, (effect) => {
		const destory = effect.destory;
		if (typeof destory === 'function') {
			destory();
		}
		effect.tag &= ~HookHasEffect;
	});
}

// call all destory in the LAST!!! update
export function commitHookEffectListDestory(
	tags: EffectTag,
	lastEffect: Effect
) {
	commitHookEffectList(tags, lastEffect, (effect) => {
		const destory = effect.destory;
		if (typeof destory === 'function') {
			destory();
		}
	});
}

export function commitHookEffectListCreate(
	tags: EffectTag,
	lastEffect: Effect
) {
	commitHookEffectList(tags, lastEffect, (effect) => {
		const create = effect.create;
		if (typeof create === 'function') {
			effect.destory = create();
		}
	});
}

function recordHostChildrenToDelete(
	childrenToDelete: FiberNode[],
	unmountFiber: FiberNode
) {
	// 1. find the first
	const lastOne = childrenToDelete[childrenToDelete.length - 1];

	if (!lastOne) {
		childrenToDelete.push(unmountFiber);
	} else {
		let node = lastOne.sibling;
		while (node !== null) {
			if (unmountFiber === node) {
				childrenToDelete.push(unmountFiber);
			}
			node = node.sibling;
		}
	}
}

function commitDeletion(childToDelete: FiberNode, root: FiberRootNode) {
	const rootChildrenToDelete: FiberNode[] = [];

	commitNestedComponent(childToDelete, (unmountFiber) => {
		switch (unmountFiber.tag) {
			case HostComponent:
				recordHostChildrenToDelete(rootChildrenToDelete, unmountFiber);
				// unbind ref
				safelyDetachRef(unmountFiber);
				return;
			case HostText:
				recordHostChildrenToDelete(rootChildrenToDelete, unmountFiber);
				return;
			case FunctionComponent:
				// useEffect useLayoutEffect unmount 、解绑ref
				collectPassiveEffect(unmountFiber, root, 'unmount');
				collectLayoutEffect(unmountFiber, root, 'unmount');
				return;
			default:
				if (__DEV__) {
					console.warn('unsupport', unmountFiber);
				}
		}
	});

	if (rootChildrenToDelete.length) {
		const hostParent = getHostParents(childToDelete);
		if (hostParent !== null) {
			rootChildrenToDelete.forEach((deleteFiber) => {
				removeChild(deleteFiber.stateNode, hostParent);
			});
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
		node.sibling.return = node.return;
		node = node.sibling;
	}
}
function commitPlacement(finishedWork: FiberNode) {
	if (__DEV__) {
		console.warn('commitPlacement start', finishedWork);
	}

	const hostParent = getHostParents(finishedWork);
	const sibling = getHostSibling(finishedWork);

	if (hostParent !== null) {
		insertOrAppendPlacementNodeIntoContainer(finishedWork, hostParent, sibling);
	} else {
		if (__DEV__) {
			console.warn('hostParent is NULL!!');
		}
	}
}

function getHostSibling(fiber: FiberNode) {
	let node = fiber;
	findSibline: while (true) {
		while (node.sibling === null) {
			const parent = node.return;
			if (
				parent === null ||
				parent.tag === HostComponent ||
				parent.tag === HostText
			) {
				return null;
			}
			node = parent;
		}
		node.sibling.return = node.return;
		node = node.sibling;
		while (node.tag !== HostComponent && node.tag !== HostText) {
			if ((node.flags & Placement) !== NoFlags) {
				continue findSibline;
			}
			if (node.child === null) {
				continue findSibline;
			} else {
				node.child.return = node;
				node = node.child;
			}
		}

		if ((node.flags & Placement) === NoFlags) {
			return node.stateNode;
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

function insertOrAppendPlacementNodeIntoContainer(
	finishedWork: FiberNode,
	hostParent: Container,
	before?: Instance
) {
	const tag = finishedWork.tag;
	if (tag === HostComponent || tag === HostText) {
		if (before) {
			insertChildToContainer(finishedWork.stateNode, hostParent, before);
		} else {
			appendChildToContainer(hostParent, finishedWork.stateNode);
		}
		return;
	}
	const child = finishedWork.child;
	if (child !== null) {
		insertOrAppendPlacementNodeIntoContainer(child, hostParent);
		let sibling = child.sibling;

		while (sibling !== null) {
			insertOrAppendPlacementNodeIntoContainer(sibling, hostParent);
			sibling = sibling.sibling;
		}
	}
}
