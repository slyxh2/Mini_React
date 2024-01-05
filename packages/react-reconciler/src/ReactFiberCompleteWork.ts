/**
 * In the mount stage, the completeWork create each host state node(DOM) and mark update bubble to the root
 */
import {
	Container,
	appendInitialChild,
	createInstance,
	createTextInstance
} from 'hostConfig';
import { FiberNode } from './ReactFiber';
import {
	ContextProvider,
	Fragment,
	FunctionComponent,
	HostComponent,
	HostRoot,
	HostText
} from './ReactWorkTags';
import { NoFlags, Ref, Update } from './ReactFiberFlags';
import { updateFiberProps } from 'react-dom/src/ReactSyntheticEvent';
import { popProvider } from './ReactFiberContext';

function markUpdate(fiber: FiberNode) {
	fiber.flags |= Update;
}
function markRef(fiber: FiberNode) {
	fiber.flags |= Ref;
}
export const completeWork = (wip: FiberNode) => {
	const newProps = wip.pendingProps;
	const current = wip.alternate;

	switch (wip.tag) {
		case HostComponent:
			if (current !== null && wip.stateNode) {
				// update
				updateFiberProps(wip.stateNode, newProps);
				// if wip ref is different with current ref, mark it
				if (current.ref !== wip.ref) {
					markRef(wip);
				}
			} else {
				// mount
				const instance = createInstance(wip.type, newProps);
				appendAllChildren(instance, wip);
				wip.stateNode = instance;
				// markRef
				if (wip.ref !== null) {
					markRef(wip);
				}
			}
			bubbleProperties(wip);
			return null;
		case HostText:
			if (current !== null && wip.stateNode) {
				//update
				const oldText = current.memorizedProps.content;
				const newText = newProps.content;
				if (oldText !== newText) {
					markUpdate(wip);
				}
			} else {
				// mount
				const instance = createTextInstance(newProps.content);
				wip.stateNode = instance;
			}
			bubbleProperties(wip);
			return null;
		case HostRoot:
		case FunctionComponent:
		case Fragment:
			bubbleProperties(wip);
			return null;
		case ContextProvider:
			const providerType = wip.type; // provider object
			const context = providerType._context;
			popProvider(context);
			bubbleProperties(wip);
			return null;
		default:
			break;
	}
};

function appendAllChildren(parent: Container, wip: FiberNode) {
	let node = wip.child;
	while (node !== null) {
		if (node.tag === HostComponent || node.tag === HostText) {
			appendInitialChild(parent, node.stateNode);
		} else if (node.child !== null) {
			node.child.return = node;
			node = node.child;
			continue;
		}
		if (node === wip) {
			return;
		}
		while (node.sibling === null) {
			if (node.return === null || node.return === wip) {
				return;
			}
			node = node.return;
		}
		node.sibling.return = node.return;
		node = node.sibling;
	}
}

function bubbleProperties(wip: FiberNode) {
	let subtreeFlags = NoFlags;
	let child = wip.child;

	while (child !== null) {
		subtreeFlags |= child.subtreeFlags;
		subtreeFlags |= child.flags;

		child.return = wip;
		child = child.sibling;
	}
	wip.subtreeFlags |= subtreeFlags;
}
