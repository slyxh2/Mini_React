import { Dispatcher } from 'shared/ReactHookTypes';
import ReactCurrentBatchConfig from './src/ReactCurrentBatchConfig';
import {
	resolveDispatcher,
	currentDispathcher
} from './src/ReactCurrentDispatcher';
import { jsx, isVaildElement as isVaildElementFn } from './src/jsx';

export { createContext } from './src/ReactContext';
export const useState: Dispatcher['useState'] = (initialState: any) => {
	const dispathcer = resolveDispatcher();
	return dispathcer.useState(initialState);
};

export const useEffect: Dispatcher['useEffect'] = (create, deps) => {
	const dispathcer = resolveDispatcher();
	return dispathcer.useEffect(create, deps);
};
export const useLayoutEffect: Dispatcher['useLayoutEffect'] = (
	create,
	deps
) => {
	const dispathcer = resolveDispatcher();
	return dispathcer.useLayoutEffect(create, deps);
};

export const useTransition: Dispatcher['useTransition'] = () => {
	const dispathcer = resolveDispatcher();
	return dispathcer.useTransition();
};

export const useRef: Dispatcher['useRef'] = (initialValue) => {
	const dispathcer = resolveDispatcher();
	return dispathcer.useRef(initialValue);
};

export const useContext: Dispatcher['useContext'] = (initialValue) => {
	const dispathcer = resolveDispatcher();
	return dispathcer.useContext(initialValue);
};

export const __SECRET__INTERNAL__ = {
	currentDispathcher,
	ReactCurrentBatchConfig
};
export const version = '0.0.0';
export const createElement = jsx;
export const isValidElement = isVaildElementFn;
