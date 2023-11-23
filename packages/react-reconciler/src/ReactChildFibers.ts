/**
 * To handle the child Fiber
 * if in the mount stage, many FiberNode flag was placement, we can not track every placement in the mount i.e. shouldTrackEffects -> false
 */
import { Props, ReactElementType } from 'shared/ReactTypes';
import {
	FiberNode,
	createFiberFromElement,
	createWorkInProgress
} from './ReactFiber';
import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbols';
import { HostText } from './ReactWorkTags';
import { ChildDeletion, Placement } from './ReactFiberFlags';

type ExistingChildren = Map<string | null, FiberNode>;

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

	function deleteRemainingChildren(
		returnFiber: FiberNode,
		currentFirstChild: FiberNode | null
	) {
		if (!shouldTrackEffects) return;
		let childToDelete = currentFirstChild;
		while (childToDelete !== null) {
			deleteChild(returnFiber, childToDelete);
			childToDelete = childToDelete.sibling;
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
		while (currentFiber !== null) {
			// update stage
			if (currentFiber.key === key) {
				// same key
				if (element.$$typeof === REACT_ELEMENT_TYPE) {
					if (currentFiber.type === element.type) {
						// same type
						const cloneFiber = useFiber(currentFiber, element.props);
						cloneFiber.return = returnFiber;
						deleteRemainingChildren(returnFiber, currentFiber.sibling);
						return cloneFiber;
					} else {
						// same key but different type
						deleteRemainingChildren(returnFiber, currentFiber);
						break;
					}
				} else {
					if (__DEV__) {
						console.warn('Do not support element type.');
					}
				}
			} else {
				// delete old fiber node
				deleteChild(returnFiber, currentFiber);
				currentFiber = currentFiber.sibling;
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
		while (currentFiber !== null) {
			// update
			if (currentFiber.type === HostText) {
				// same type(text)
				const cloneFiber = useFiber(currentFiber, { content });
				cloneFiber.return = returnFiber;
				deleteRemainingChildren(returnFiber, currentFiber.sibling);
				return cloneFiber;
			}
			// if type change, delete the child;
			deleteChild(returnFiber, currentFiber);
			currentFiber = currentFiber.sibling;
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
	function reconcileChildrenArray(
		returnFiber: FiberNode,
		currentFirstChild: FiberNode | null,
		newChild: any[]
	): FiberNode | null {
		let lastPlacedIndex: number = 0; // the last reuse fiber index in current
		let lastNewFiber: FiberNode | null = null;
		let firstNewFiber: FiberNode | null = null;
		// 1. put the same level of current fiber to a map
		const existingChildren: ExistingChildren = new Map();
		let current = currentFirstChild;
		while (current !== null) {
			const keyToUse = current.key !== null ? current.key : current.index;
			existingChildren.set(keyToUse, current);
			current = current.sibling;
		}

		for (let i = 0; i < newChild.length; i++) {
			// 2. iterate newChild, find if can be reused
			const after = newChild[i];
			const newFiber = updateFromMap(returnFiber, existingChildren, i, after);
			if (newFiber === null) continue;
			// 3. mark move flag or insert flag
			newFiber.index = i;
			newFiber.return = returnFiber;
			if (lastNewFiber === null) {
				lastNewFiber = newFiber;
				firstNewFiber = newFiber;
			} else {
				lastNewFiber.sibling = newFiber;
				lastNewFiber = newFiber;
			}

			if (!shouldTrackEffects) continue;

			const current = newFiber.alternate;
			if (current !== null) {
				const oldIndex = current.index;
				if (oldIndex < lastPlacedIndex) {
					newFiber.flags |= Placement;
					continue;
				} else {
					lastPlacedIndex = oldIndex;
				}
			} else {
				newFiber.flags |= Placement;
			}
		}
		// 4. delete remain map fibernode
		existingChildren.forEach((fiber) => {
			deleteChild(returnFiber, fiber);
		});
		return firstNewFiber;
	}

	function updateFromMap(
		returnFiber: FiberNode,
		existingChildren: ExistingChildren,
		index: number,
		element: any
	): FiberNode | null {
		const keyToUse = element.key !== null ? element.key : index;
		const before = existingChildren.get(keyToUse);

		// HostText
		if (typeof element === 'string' || typeof element === 'number') {
			if (before) {
				if (before?.tag === HostText) {
					existingChildren.delete(keyToUse);
					return useFiber(before, { content: element + '' });
				}
			}
			return new FiberNode(HostText, { content: element }, null);
		}

		// ReactElement
		if (typeof element === 'object' && element !== null) {
			switch (element.$$typeof) {
				case REACT_ELEMENT_TYPE:
					if (before) {
						if (before.type === element.type) {
							existingChildren.delete(keyToUse);
							return useFiber(before, element.props);
						}
					}
					return createFiberFromElement(element);
				default:
					break;
			}
		}

		// TODO Array
		if (Array.isArray(element)) {
			if (__DEV__) {
				console.warn('No Implement for Array');
			}
		}
		return null;
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
			if (Array.isArray(newChild)) {
				return reconcileChildrenArray(returnFiber, currentFiber, newChild);
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
