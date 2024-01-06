export type EffectTag = number;
export const Passive = 0b0010; //useEffect
export const Layout = 0b0100; //useLayoutEffect

export const HookHasEffect = 0b0001; // current effect need to run
