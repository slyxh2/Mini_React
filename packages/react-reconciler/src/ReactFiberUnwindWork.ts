import { FiberNode } from './ReactFiber';
import { popProvider } from './ReactFiberContext';
import { DidCapture, NoFlags, ShouldCapture } from './ReactFiberFlags';
import { ContextProvider, SuspenseComponent } from './ReactWorkTags';

export function unwindWork(wip: FiberNode): FiberNode | null {
	const flags = wip.flags;
	switch (wip.tag) {
		case SuspenseComponent:
			if (
				(flags & ShouldCapture) !== NoFlags &&
				(flags & DidCapture) === NoFlags
			) {
				wip.flags = (flags & ~ShouldCapture) | DidCapture;
			}
			return wip;
		case ContextProvider:
			const context = wip.type._context;
			popProvider(context);
			return null;
		default:
			return null;
	}
}
