import { FiberNode } from "react-reconciler/src/ReactFiber";
import { HostText } from "react-reconciler/src/ReactWorkTags";

export type Container = Element;
export type Instance = Element;
export type TextInstance = Text;

export function createInstance(type: string, props: any): Instance {
	const element: Instance = document.createElement(type);
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

export function removeChild(child: Instance | TextInstance, container: Container) {
	container.removeChild(child);
}