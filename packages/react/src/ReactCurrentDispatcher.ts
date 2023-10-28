import { Dispatcher } from 'shared/ReactHookTypes';

export const currentDispathcher: { current: Dispatcher | null } = {
	current: null
};

export const resolveDispatcher = () => {
	const dispathcer = currentDispathcher.current;
	if (dispathcer === null) {
		throw new Error('Hooks must run in function component.');
	}
	return dispathcer;
};
