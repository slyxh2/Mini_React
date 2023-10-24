import { Props } from 'shared/ReactTypes';
import { FiberNode } from './ReactFiber';

export function renderWithHooks(wip: FiberNode) {
	const Component = wip.type;
	const props: Props = wip.pendingProps;
	const children = Component(props);
	return children;
}
