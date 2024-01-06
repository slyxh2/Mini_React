import { Update } from 'react-reconciler/src/ReactFiberUpdateQueue';
import { Action, ReactContext } from './ReactTypes';
import { EffectTag } from 'react-reconciler/src/ReactHookEffectTags';

/**
 * useState
 */
export type Dispatch<State> = (action: Action<State>) => void;
export type UseStateType = <T>(state: (() => T) | T) => [T, Dispatch<T>];
export type UpdateStateType = <T>() => [T, Dispatch<T>];
/**
 * useEffect
 */
export type EffectCallback = () => void;
export type EffectDeps = any[] | null;
export type UseEffectCallback = () => void | EffectCallback;
export type UseEffectType = (
	create: UseEffectCallback,
	dep: EffectDeps
) => void;
export type UseLayoutEffectType = UseEffectType;

export interface Effect {
	tag: EffectTag;
	create: EffectCallback | void;
	destory: EffectCallback | void;
	deps: EffectDeps;
	next: Effect | null;
}

/**
 * useTransition
 */

export type UseTransitionType = () => [
	isPending: boolean,
	startTransition: StartTransition
];
type StartTransition = (callback: () => void) => void;

/**
 * useRef
 */
export type UesRefType = <T>(initialValue: T) => { current: T };

/**
 * useContext
 */
export type UseContextType = <T>(context: ReactContext<T>) => T;

export interface Dispatcher {
	useState: UseStateType;
	useEffect: UseEffectType;
	useLayoutEffect: UseEffectType;
	useTransition: UseTransitionType;
	useRef: UesRefType;
	useContext: UseContextType;
}

export interface Hook {
	memorizedState: any;
	updateQueue: unknown;
	next: Hook | null;
	baseState: any;
	baseQueue: Update<any> | null;
}
