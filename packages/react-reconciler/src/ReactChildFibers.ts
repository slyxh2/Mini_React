/**
 * To handle the child Fiber
 * if in the mount stage, many FiberNode flag was placement, we can not track every placement in the mount i.e. shouldTrackEffects -> false
 */
import { Props, ReactElementType } from 'shared/ReactTypes';
import { FiberNode, createFiberFromElement, createWorkInProgress } from './ReactFiber';
import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbols';
import { HostText } from './ReactWorkTags';
import { ChildDeletion, Placement } from './ReactFiberFlags';

function childReconciler(shouldTrackEffects: boolean) {
	function deleteChild(returnFiber: FiberNode, childToDelete: FiberNode) {
		if (!shouldTrackEffects) return;
		if (returnFiber.deletions === null) {
			returnFiber.deletions = [childToDelete];
			returnFiber.flags |= ChildDeletion;
		} else {
			returnFiber.deletions.push(childToDelete);
		}
	}

	/**
	 * returnFiber -> wip 
	 * currentFiber -> current fiber child fiber node
	 * element -> wip child element
	 * compare currentFiber and element to see if can reuse the current fiber
	 */
	function reconcileSingleElement(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		element: ReactElementType
	): FiberNode {
		const key = element.key;
		work: if (currentFiber !== null) {
			// update stage
			if (currentFiber.key === key) {
				// same key
				if (element.$$typeof === REACT_ELEMENT_TYPE) {
					if (currentFiber.type === element.type) {
						// same type
						let cloneFiber = useFiber(currentFiber, element.props);
						cloneFiber.return = returnFiber;
						return cloneFiber;
					} else {
						// same key but different type
						deleteChild(returnFiber, currentFiber);
						break work;
					}
				} else {
					if (__DEV__) {
						console.warn('Do not support element type.');
					}
				}

			} else {
				// delete old fiber node
				deleteChild(returnFiber, currentFiber);
			}
		}
		const fiber = createFiberFromElement(element);
		fiber.return = returnFiber;
		return fiber;
	}
	function reconcileSingleTextNode(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		content: string | number
	): FiberNode {
		if (currentFiber !== null) {
			// update
			if (currentFiber.type === HostText) {
				// same type(text)
				let cloneFiber = useFiber(currentFiber, { content });
				cloneFiber.return = returnFiber;
				return cloneFiber;
			}
			// if type change, delete the child;
			deleteChild(returnFiber, currentFiber);
		}
		const fiber = new FiberNode(HostText, { content }, null);
		fiber.return = returnFiber;
		return fiber;
	}
	function placeSingleChild(fiber: FiberNode | null) {
		if (fiber === null) return null;
		if (fiber.alternate === null && shouldTrackEffects) {
			fiber.flags |= Placement;
		}
		return fiber;
	}
	function useFiber(currentFiber: FiberNode, pendingProps: Props) {
		const clone = createWorkInProgress(currentFiber, pendingProps);
		clone.index = 0;
		clone.sibling = null;
		return clone;
	}
	return function reconcileChildFibers(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		newChild?: ReactElementType
	): FiberNode | null {
		// Single Child Node
		if (typeof newChild === 'object' && newChild !== null) {
			switch (newChild.$$typeof) {
				case REACT_ELEMENT_TYPE:
					return placeSingleChild(
						reconcileSingleElement(returnFiber, currentFiber, newChild)
					);
				default:
					if (__DEV__) {
						console.warn('This is ReactElement type is not implement');
					}
			}
		}

		// TODO: multiple children nodes

		// text node
		if (typeof newChild === 'string' || typeof newChild === 'number') {
			return placeSingleChild(
				reconcileSingleTextNode(returnFiber, currentFiber, newChild)
			);
		}

		if (currentFiber !== null) {
			deleteChild(returnFiber, currentFiber);
		}
		if (__DEV__) {
			console.warn('This is ReactElement type is not implement');
		}
		return null;
	};
}

export const reconcileChildFibers = childReconciler(true);
export const mountChildFibers = childReconciler(false);
