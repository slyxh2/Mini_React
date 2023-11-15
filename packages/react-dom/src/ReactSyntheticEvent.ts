import { Container } from 'hostConfig';
import { Props } from 'shared/ReactTypes';

type EventCallback = (e: Event) => void;
interface Paths {
	capture: EventCallback[];
	bubble: EventCallback[];
}
interface SyntheticEvent extends Event {
	__stopPropagation: boolean;
}
export interface DOMElement extends Element {
	[elementPropsKey]: Props;
}

const validEventTypeList = ['click'];
export const elementPropsKey = '__props';

export function updateFiberProps(node: DOMElement, props: Props) {
	node[elementPropsKey] = props;
}

export function initEvent(container: Container, eventType: string) {
	if (!validEventTypeList.includes(eventType)) {
		console.warn('Unsupport event type: ', eventType);
		return;
	}
	if (__DEV__) {
		console.log('Init event:', eventType);
	}
	container.addEventListener(eventType, (e) => {
		dispatchEvent(container, eventType, e);
	});
}

function dispatchEvent(container: Container, eventType: string, e: Event) {
	const targetElement = e.target;
	if (targetElement === null) {
		console.warn('This event is not exist!');
		return;
	}
	// 1. collect paths(capture and bubble)
	const { bubble, capture } = collectPaths(
		<DOMElement>targetElement,
		container,
		eventType
	);
	// 2. build synthetic event
	const syntheticEvent = createSyntheticEvent(e);
	// 3. iterate capture
	triggerEventFlow(capture, syntheticEvent);
	// 4. iterate bubble
	if (!syntheticEvent.__stopPropagation) {
		triggerEventFlow(bubble, syntheticEvent);
	}
}

function triggerEventFlow(
	callbacks: EventCallback[],
	syntheticEvent: SyntheticEvent
) {
	for (let i = 0; i < callbacks.length; i++) {
		const callback = callbacks[i];
		callback.call(null, syntheticEvent);

		if (syntheticEvent.__stopPropagation) {
			break;
		}
	}
}

// create synthetic event from native event
function createSyntheticEvent(e: Event): SyntheticEvent {
	const syntheticEvent = e as SyntheticEvent;
	syntheticEvent.__stopPropagation = false;
	const originStopPropagation = e.stopPropagation;
	syntheticEvent.stopPropagation = () => {
		syntheticEvent.__stopPropagation = true;
		if (originStopPropagation !== undefined) {
			originStopPropagation();
		}
	};
	return syntheticEvent;
}

function gerEventCallbackNameFromEventType(
	eventType: string
): string[] | undefined {
	return {
		click: ['onClickCapture', 'onClick']
	}[eventType];
}

function collectPaths(
	targetElement: DOMElement,
	container: Container,
	eventType: string
): Paths {
	const paths: Paths = {
		capture: [],
		bubble: []
	};
	while (targetElement && targetElement !== container) {
		const elementProps = targetElement[elementPropsKey];
		if (elementProps) {
			const callbackNameList = gerEventCallbackNameFromEventType(eventType);
			if (callbackNameList) {
				callbackNameList.forEach((callbackName, i) => {
					const callback = elementProps[callbackName];
					if (callback) {
						if (i === 0) {
							// capture
							paths.capture.unshift(callback);
						} else {
							// bubble
							paths.capture.push(callback);
						}
					}
				});
			}
		}
		targetElement = <DOMElement>targetElement.parentNode;
	}
	return paths;
}
