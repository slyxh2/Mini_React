import { Action } from "./ReactTypes";

export type Dispatch<State> = (action: Action<State>) => void;
export type UseStateType = <T>(state: (() => T) | T) => [T, Dispatch<T>];

export interface Dispatcher {
    useState: UseStateType;
}

export interface Hook {
    memorizedState: any;
    updateQueue: unknown;
    next: Hook | null;
}