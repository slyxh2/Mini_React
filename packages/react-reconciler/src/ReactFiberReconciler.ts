import { Container } from 'hostConfig';
import { FiberNode, FiberRootNode } from './ReactFiber';
import { HostRoot } from './ReactWorkTags';
import {
	UpdateQueue,
	createUpdate,
	createUpdateQueue,
	enqueUpdate
} from './ReactFiberUpdateQueue';
import { ReactElementType } from 'shared/ReactTypes';
import { scheduleUpdateOnFiber } from './ReactFiberWorkLoop';
import { requestUpdateLane } from './ReactFiberLane';
import {
	unstable_ImmediatePriority,
	unstable_runWithPriority
} from 'scheduler';

export function createContainer(container: Container): FiberRootNode {
	const hostRootFiber = new FiberNode(HostRoot, {}, null);
	const root = new FiberRootNode(container, hostRootFiber);
	hostRootFiber.updateQueue = createUpdateQueue();
	return root;
}

export function updateContainer(
	element: ReactElementType | null,
	root: FiberRootNode
) {
	unstable_runWithPriority(unstable_ImmediatePriority, () => {
		const hostRootFiber = root.current;
		const lane = requestUpdateLane();
		const update = createUpdate<ReactElementType | null>(element, lane);
		enqueUpdate<ReactElementType | null>(
			hostRootFiber.updateQueue as UpdateQueue<ReactElementType | null>,
			update
		);
		scheduleUpdateOnFiber(hostRootFiber, lane);
	});

	return element;
}
