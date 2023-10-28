import { Dispatcher } from 'shared/ReactHookTypes';
import {
	resolveDispatcher,
	currentDispathcher
} from './src/ReactCurrentDispatcher';
import { jsxDEV } from './src/jsx';

export const useState: Dispatcher['useState'] = (initialState: any) => {
	const dispathcer = resolveDispatcher();
	return dispathcer.useState(initialState);
};

export const __SECRET__INTERNAL__ = {
	currentDispathcher
};

export default {
	version: '0.0.0',
	createElement: jsxDEV
};
