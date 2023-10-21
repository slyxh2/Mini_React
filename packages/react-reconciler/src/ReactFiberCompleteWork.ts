import { FiberNode } from './ReactFiber';

export const completeWork = (fiber: FiberNode) => {
	console.log(fiber);
};
