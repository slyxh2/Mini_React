import { Action } from './ReactTypes';
import { EffectTag } from 'react-reconciler/src/ReactHookEffectTags';

export type Dispatch<State> = (action: Action<State>) => void;
export type UseStateType = <T>(state: (() => T) | T) => [T, Dispatch<T>];

export type EffectCallback = () => void;
export type EffectDeps = any[] | null;
type UseEffectCallback = () => void | EffectCallback;
export type UseEffectType = (
	create: UseEffectCallback,
	dep: EffectDeps
) => void;

export interface Dispatcher {
	useState: UseStateType;
	useEffect: UseEffectType;
}

export interface Hook {
	memorizedState: any;
	updateQueue: unknown;
	next: Hook | null;
}

export interface Effect {
	tag: EffectTag;
	create: EffectCallback | void;
	destory: EffectCallback | void;
	deps: EffectDeps;
	next: Effect | null;
}
