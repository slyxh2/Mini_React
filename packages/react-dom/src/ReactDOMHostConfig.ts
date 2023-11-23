import { FiberNode } from 'react-reconciler/src/ReactFiber';
import { HostText } from 'react-reconciler/src/ReactWorkTags';
import { Props } from 'shared/ReactTypes';
import { updateFiberProps, DOMElement } from './ReactSyntheticEvent';

export type Container = Element;
export type Instance = Element;
export type TextInstance = Text;

export function createInstance(type: string, props: Props): Instance {
	const element: Instance = document.createElement(type);
	updateFiberProps(element as DOMElement, props);
	return element;
}

export function appendInitialChild(
	parent: Instance | Container,
	child: Instance
) {
	parent.appendChild(child);
}

export function createTextInstance(content: string) {
	return document.createTextNode(content);
}

export const appendChildToContainer = appendInitialChild;

export function commitUpdate(fiber: FiberNode) {
	switch (fiber.tag) {
		case HostText:
			const text = fiber.memorizedProps.content;
			commitTextUpdate(fiber.stateNode, text);
			break;
		default:
			break;
	}
}

export function commitTextUpdate(textInstance: TextInstance, content: string) {
	if (__DEV__) {
		console.log(textInstance, content);
	}
	textInstance.textContent = content;
}

export function removeChild(
	child: Instance | TextInstance,
	container: Container
) {
	container.removeChild(child);
}

export function insertChildToContainer(
	child: Instance,
	container: Container,
	before: Instance
) {
	container.insertBefore(child, before);
}
