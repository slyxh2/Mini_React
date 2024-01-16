import { WakeAble } from 'shared/ReactTypes';
import { FiberRootNode } from './ReactFiber';
import { Lane, markRootPinged } from './ReactFiberLane';
import { ensureRootIsScheduled, markRootUpdated } from './ReactFiberWorkLoop';
import { getSuspenseHandler } from './ReactSuspenseContext';
import { ShouldCapture } from './ReactFiberFlags';

export function throwException(root: FiberRootNode, value: any, lane: Lane) {
	// thenable
	if (
		value !== null &&
		typeof value === 'object' &&
		typeof value.then === 'function'
	) {
		const wakeable: WakeAble<any> = value;

		const suspenseBoundary = getSuspenseHandler();
		if (suspenseBoundary) {
			suspenseBoundary.flags |= ShouldCapture;
		}

		attatchPingListener(root, wakeable, lane);
	}
}

function attatchPingListener(
	root: FiberRootNode,
	wakeable: WakeAble<any>,
	lane: Lane
) {
	let pingCache = root.pingCache;

	let threadsIDs: Set<Lane> | undefined;

	if (pingCache === null) {
		threadsIDs = new Set();
		pingCache = root.pingCache = new WeakMap();
		pingCache.set(wakeable, threadsIDs);
	} else {
		threadsIDs = pingCache.get(wakeable);
		if (threadsIDs === undefined) {
			threadsIDs = new Set();
			pingCache.set(wakeable, threadsIDs);
		}
	}
	function ping() {
		markRootPinged(root, lane);
		markRootUpdated(root, lane);
		ensureRootIsScheduled(root);
	}
	if (!threadsIDs.has(lane)) {
		// first time
		threadsIDs.add(lane);

		wakeable.then(ping, ping);
	}
}
