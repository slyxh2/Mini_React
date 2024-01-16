import { FiberNode } from './ReactFiber';

const suspenseHandlerStack: FiberNode[] = [];

export const getSuspenseHandler = () =>
	suspenseHandlerStack[suspenseHandlerStack.length - 1];

export const pushSuspenseHandler = (handler: FiberNode) =>
	suspenseHandlerStack.push(handler);

export const popSuspenseHandler = () => suspenseHandlerStack.pop();
