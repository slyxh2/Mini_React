import { REACT_CONTEXT_TYPE, REACT_PROVIDER_TYPE } from 'shared/ReactSymbols';
import { ReactContext } from 'shared/ReactTypes';

export function createContext<T>(deafultValue: any): ReactContext<T> {
	const context: ReactContext<T> = {
		$$typeof: REACT_CONTEXT_TYPE,
		Provider: null,
		_currentValue: deafultValue
	};
	context.Provider = {
		$$typeof: REACT_PROVIDER_TYPE,
		_context: context
	};
	return context;
}
