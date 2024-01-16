export type Type = any;
export type Key = any;
export type Ref = { current: any } | ((instance: any) => void) | null;
export type Props = any;
export type ElementType = any;

export interface ReactElementType {
	$$typeof: symbol | number;
	type: ElementType;
	key: Key;
	props: Props;
	ref: Ref;
	__mark: string;
}

export type Action<State> = State | ((prevState: State) => State);

export type ReactContext<T> = {
	$$typeof: symbol | number;
	Provider: ReactProviderType<T> | null;
	_currentValue: T;
};

export type ReactProviderType<T> = {
	$$typeof: symbol | number;
	_context: ReactContext<T>;
};

/**
 * Four type Thenable
 * 1. untracked
 * 2. Pending
 * 3. Fulfilled
 * 4. Rejected
 */
export type Usable<T> = Thenable<T> | ReactContext<T>;
export type WakeAble<Result> = {
	then(
		onFulfilled: () => Result,
		onRejected: () => Result
	): void | WakeAble<Result>;
};
export type ThenableImpl<T, Result, Error> = {
	then(
		onFulfilled: (value: T) => Result,
		onRejected: (error: Error) => Result
	): void | WakeAble<Result>;
};

export type UntrackedThenable<T, Result, Error> = ThenableImpl<
	T,
	Result,
	Error
> & {
	status?: void;
};

export type PendingThenable<T, Result, Error> = ThenableImpl<
	T,
	Result,
	Error
> & {
	status: 'pending';
};

export type FulfilledThenable<T, Result, Error> = ThenableImpl<
	T,
	Result,
	Error
> & {
	status: 'fulfilled';
	value: T;
};

export type RejectedThenable<T, Result, Error> = ThenableImpl<
	T,
	Result,
	Error
> & {
	status: 'rejected';
	reason: Error;
};
export type Thenable<T, Result = void, Error = any> =
	| UntrackedThenable<T, Result, Error>
	| PendingThenable<T, Result, Error>
	| FulfilledThenable<T, Result, Error>
	| RejectedThenable<T, Result, Error>;
