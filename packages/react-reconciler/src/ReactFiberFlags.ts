export type Flags = number;

export const NoFlags = 0b0000000000000000000000000000;
export const Placement = 0b0000000000000000000000000010;
export const Update = 0b0000000000000000000000000100;
export const ChildDeletion = 0b0000000000000000000000010000;

export const PassiveEffect = 0b0000000000000000100000000000;
export const Ref = 0b0000000000000001000000000000;

export const MutationMask = Placement | Update | ChildDeletion | Ref;
export const LayoutMask = Ref;
export const PassiveMask = PassiveEffect | ChildDeletion;
