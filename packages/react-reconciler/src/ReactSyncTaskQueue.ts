type SyncCallback = (...arg: any) => void;

let syncQueue: SyncCallback[] | null = null;
let isFlushingSyncQueue = false;

export function scheduleSyncCallback(callback: SyncCallback) {
	if (syncQueue === null) {
		syncQueue = [callback];
	} else {
		syncQueue.push(callback);
	}
}

export function flushSyncCallbacks() {
	if (!isFlushingSyncQueue && syncQueue) {
		isFlushingSyncQueue = true;
		try {
			syncQueue.forEach((callback) => callback());
		} catch (err) {
			if (__DEV__) {
				console.error(err);
			}
		} finally {
			isFlushingSyncQueue = false;
		}
	}
}
