import { Update } from 'react-reconciler/src/ReactFiberUpdateQueue';
import { Action } from './ReactTypes';
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
type UseEffectCallback = () => void | EffectCallback;
export type UseEffectType = (
	create: UseEffectCallback,
	dep: EffectDeps
) => void;

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

export interface Dispatcher {
	useState: UseStateType;
	useEffect: UseEffectType;
	useTransition: UseTransitionType;
}

export interface Hook {
	memorizedState: any;
	updateQueue: unknown;
	next: Hook | null;
	baseState: any;
	baseQueue: Update<any> | null;
}
