export type WorkTag =
	| typeof FunctionComponent
	| typeof ClassComponent
	| typeof IndeterminateComponent
	| typeof HostRoot
	| typeof HostPortal
	| typeof HostComponent
	| typeof HostText
	| typeof Fragment
	| typeof Mode
	| typeof ContextConsumer
	| typeof ContextProvider
	| typeof ForwardRef
	| typeof Profiler
	| typeof SuspenseComponent
	| typeof MemoComponent
	| typeof SimpleMemoComponent
	| typeof LazyComponent
	| typeof IncompleteClassComponent
	| typeof DehydratedFragment
	| typeof SuspenseListComponent
	| typeof ScopeComponent
	| typeof OffscreenComponent
	| typeof LegacyHiddenComponent
	| typeof CacheComponent
	| typeof TracingMarkerComponent
	| typeof HostHoistable
	| typeof HostSingleton;

export const FunctionComponent = 0;
export const ClassComponent = 1;
export const IndeterminateComponent = 2;
export const HostRoot = 3;
export const HostPortal = 4;
export const HostComponent = 5;
export const HostText = 6;
export const Fragment = 7;
export const Mode = 8;
export const ContextConsumer = 9;
export const ContextProvider = 10;
export const ForwardRef = 11;
export const Profiler = 12;
export const SuspenseComponent = 13;
export const MemoComponent = 14;
export const SimpleMemoComponent = 15;
export const LazyComponent = 16;
export const IncompleteClassComponent = 17;
export const DehydratedFragment = 18;
export const SuspenseListComponent = 19;
export const ScopeComponent = 21;
export const OffscreenComponent = 22;
export const LegacyHiddenComponent = 23;
export const CacheComponent = 24;
export const TracingMarkerComponent = 25;
export const HostHoistable = 26;
export const HostSingleton = 27;
