import { Container } from 'hostConfig';
import {
	createContainer,
	updateContainer
} from 'react-reconciler/src/ReactFiberReconciler';
import { ReactElementType } from 'shared/ReactTypes';

export function createRoot(container: Container) {
	const root = createContainer(container);
	if (__DEV__) {
		console.warn('createRoot', root);
	}
	return {
		render(element: ReactElementType) {
			if (__DEV__) {
				console.warn('render start');
			}
			return updateContainer(element, root);
		}
	};
}
