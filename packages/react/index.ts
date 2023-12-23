import { Dispatcher } from 'shared/ReactHookTypes';
import {
	resolveDispatcher,
	currentDispathcher
} from './src/ReactCurrentDispatcher';
import { jsx, isVaildElement as isVaildElementFn } from './src/jsx';

export const useState: Dispatcher['useState'] = (initialState: any) => {
	const dispathcer = resolveDispatcher();
	return dispathcer.useState(initialState);
};

export const useEffect: Dispatcher['useEffect'] = (create, deps) => {
	const dispathcer = resolveDispatcher();
	return dispathcer.useEffect(create, deps);
};

export const __SECRET__INTERNAL__ = {
	currentDispathcher
};
export const version = '0.0.0';
export const createElement = jsx;
export const isValidElement = isVaildElementFn;
