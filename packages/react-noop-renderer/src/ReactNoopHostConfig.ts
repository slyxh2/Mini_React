import { FiberNode } from 'react-reconciler/src/ReactFiber';
import { HostText } from 'react-reconciler/src/ReactWorkTags';
import { Props } from 'shared/ReactTypes';

export interface Container {
	rootID: number;
	children: (Instance | TextInstance)[];
}
export interface Instance {
	id: number;
	type: string;
	children: (Instance | TextInstance)[];
	parent: number;
	props: Props;
}
export interface TextInstance {
	text: string;
	id: number;
	parent: number;
}

let instanceCounter = 0;

export function createInstance(type: string, props: Props): Instance {
	const instance: Instance = {
		id: instanceCounter++,
		type,
		children: [],
		parent: -1,
		props
	};

	return instance;
}

export function appendInitialChild(
	parent: Instance | Container,
	child: Instance
) {
	const prevParentId = child.parent;
	const parentId = 'rootID' in parent ? parent.rootID : parent.id;

	if (prevParentId !== -1 && prevParentId !== parentId) {
		throw new Error('repete append the child: ' + child);
	}
	child.parent = parentId;
	parent.children.push(child);
}

export function createTextInstance(content: string): TextInstance {
	const textInstance = {
		text: content,
		id: instanceCounter++,
		parent: -1
	};
	return textInstance;
}

export const appendChildToContainer = function (
	parent: Container,
	child: Instance
) {
	const prevParentId = child.parent;
	const parentId = parent.rootID;

	if (prevParentId !== -1 && prevParentId !== parentId) {
		throw new Error('repete append the child: ' + child);
	}
	child.parent = parentId;
	parent.children.push(child);
};

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
	textInstance.text = content;
}

export function removeChild(
	child: Instance | TextInstance,
	container: Container
) {
	const index = container.children.indexOf(child);
	if (index === -1) {
		throw new Error('Can not remove unexist child');
	}
	container.children.splice(index, 1);
}

export function insertChildToContainer(
	child: Instance,
	container: Container,
	before: Instance
) {
	const beforeIndex = container.children.indexOf(before);
	if (beforeIndex === -1) {
		throw new Error('before不存在');
	}
	const index = container.children.indexOf(child);
	if (index !== -1) {
		container.children.splice(index, 1);
	}
	container.children.splice(beforeIndex, 0, child);
}

export const scheduleMicroTask =
	typeof queueMicrotask === 'function'
		? queueMicrotask
		: typeof Promise === 'function'
		? (callback: (...args: any) => void) => Promise.resolve(null).then(callback)
		: setTimeout;
