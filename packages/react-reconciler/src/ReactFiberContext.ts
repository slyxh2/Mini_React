import { ReactContext } from 'shared/ReactTypes';

let prevContextValue: any = null;
const prevContextValueStack: any[] = [];

export const pushProvider = <T>(context: ReactContext<T>, newValue: T) => {
	prevContextValueStack.push(prevContextValue);
	prevContextValue = context._currentValue;
	context._currentValue = newValue;
};

export const popProvider = <T>(context: ReactContext<T>) => {
	context._currentValue = prevContextValue;
	prevContextValue = prevContextValueStack.pop();
};
