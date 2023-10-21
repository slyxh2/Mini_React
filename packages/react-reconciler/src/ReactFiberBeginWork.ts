import { FiberNode } from './ReactFiber';

// Compared with ReactElement and FiberNode return the child FiberNode
export const beginWork = (fiber: FiberNode): FiberNode | null => {
	return fiber;
};
