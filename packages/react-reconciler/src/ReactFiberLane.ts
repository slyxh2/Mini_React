import {
	unstable_IdlePriority,
	unstable_ImmediatePriority,
	unstable_NormalPriority,
	unstable_UserBlockingPriority,
	unstable_getCurrentPriorityLevel
} from 'scheduler';
import { FiberRootNode } from './ReactFiber';
import internals from 'shared/ReactInternals';

const { ReactCurrentBatchConfig } = internals;

export type Lane = number;
export type Lanes = number;

export const SyncLane = 0b00001;
export const InputContinuousLane = 0b00010;
export const DefaultLane = 0b00100;
export const TransitionLane = 0b01000;
export const IdleLane = 0b10000;
export const NoLane = 0b00000;
export const NoLanes = 0b00000;

export function mergeLanes(laneA: Lane, laneB: Lane): Lanes {
	return laneA | laneB;
}

export function requestUpdateLane() {
	if (ReactCurrentBatchConfig.layoutEffect !== null) {
		return SyncLane;
	}
	if (ReactCurrentBatchConfig.transition !== null) {
		return TransitionLane;
	}
	// get current lane in Scheduler current priority
	const currentSchedulerPriority = unstable_getCurrentPriorityLevel();
	const lane = schedulerPriorityToLane(currentSchedulerPriority);
	return lane;
}

export function getHighestPriorityLane(lanes: Lanes): Lane {
	return lanes & -lanes;
}

export function isSubsetofLanes(set: Lanes, subset: Lane) {
	return (set & subset) === subset;
}

export function markRootFinished(root: FiberRootNode, lane: Lane) {
	root.pendingLanes &= ~lane;
	root.suspendedLanes = NoLanes;
	root.pingdLanes = NoLanes;
}

export function lanesToSchedulerPriority(lanes: Lanes): number {
	const lane = getHighestPriorityLane(lanes);
	if (lane === SyncLane) {
		return unstable_ImmediatePriority;
	}
	if (lane === InputContinuousLane) {
		return unstable_UserBlockingPriority;
	}
	if (lane === DefaultLane) {
		return unstable_NormalPriority;
	}
	return unstable_IdlePriority;
}

export function schedulerPriorityToLane(schedulerPriority: number): Lane {
	if (schedulerPriority === unstable_ImmediatePriority) {
		return SyncLane;
	}
	if (schedulerPriority === unstable_UserBlockingPriority) {
		return InputContinuousLane;
	}
	if (schedulerPriority === unstable_NormalPriority) {
		return DefaultLane;
	}
	return NoLane;
}

export function markRootSuspended(root: FiberRootNode, suspendedLane: Lane) {
	root.suspendedLanes |= suspendedLane;
	root.pendingLanes &= ~suspendedLane;
}

export function markRootPinged(root: FiberRootNode, pingedLane: Lane) {
	root.pingdLanes |= root.suspendedLanes & pingedLane;
}
