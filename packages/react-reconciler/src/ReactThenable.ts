import {
	FulfilledThenable,
	PendingThenable,
	RejectedThenable,
	Thenable
} from 'shared/ReactTypes';

function noop() {}
export const SuspenseException = new Error('This is exception for suspense!');

let suspenseThenable: Thenable<any> | null = null;

export const getSuspenseThenable = () => {
	if (suspenseThenable === null) {
		throw new Error('thenadle can not be null in here!');
	}
	const thenable = suspenseThenable;
	suspenseThenable = null;
	return thenable;
};

export const trackUsedThenable = <T>(thenable: Thenable<T>) => {
	switch (thenable.status) {
		case 'fulfilled':
			return thenable.value;
		case 'rejected':
			throw thenable.reason;
		default:
			if (typeof thenable.status === 'string') {
				thenable.then(noop, noop);
			} else {
				// untracked
				const pending = thenable as unknown as PendingThenable<T, void, any>;
				pending.status = 'pending';
				pending.then(
					(val) => {
						if (pending.status === 'pending') {
							// @ts-ignore
							const fulfilled: FulfilledThenable<T, void, any> = pending;
							fulfilled.status = 'fulfilled';
							fulfilled.value = val;
						}
					},
					(err) => {
						if (pending.status === 'pending') {
							// @ts-ignore
							const rejected: RejectedThenable<T, void, any> = pending;
							rejected.status = 'rejected';
							rejected.reason = err;
						}
					}
				);
			}
			break;
	}
	suspenseThenable = thenable;
	throw SuspenseException;
};
