import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbols';
import {
    Type,
    Key,
    Ref,
    ReactElementType,
    Props,
    ElementType
} from 'shared/ReactTypes';
const ReactElement = (
    type: Type,
    key: Key,
    ref: Ref,
    props: Props
): ReactElementType => {
    const element = {
        $$typeof: REACT_ELEMENT_TYPE,
        type,
        key,
        ref,
        props,
        __mark: 'Patrick'
    };
    return element;
};

export const jsx = (
    type: ElementType,
    config: any,
    ...maybeChildren: any
): ReactElementType => {
    const props: Props = {};
    let key: Key = null;
    let ref: Ref = null;
    for (const [prop, val] of Object.entries(config)) {
        if (prop === 'key') {
            if (val !== undefined) {
                key = val + '';
            }
            continue;
        }
        if (prop === 'ref') {
            if (val !== undefined) {
                ref = val;
            }
            continue;
        }
        if (Object.hasOwnProperty.call(config, prop)) {
            props[prop] = val;
        }
    }
    if (maybeChildren) {
        if (maybeChildren.length === 1) {
            props.children = maybeChildren[0];
        } else {
            props.children = maybeChildren;
        }
    }
    return ReactElement(type, key, ref, props);
};

export const jsxDEV = (
    type: ElementType,
    config: any
): ReactElementType => {
    const props: Props = {};
    let key: Key = null;
    let ref: Ref = null;
    for (const [prop, val] of Object.entries(config)) {
        if (prop === 'key') {
            if (val !== undefined) {
                key = val + '';
            }
            continue;
        }
        if (prop === 'ref') {
            if (val !== undefined) {
                ref = val;
            }
            continue;
        }
        if (Object.hasOwnProperty.call(config, prop)) {
            props[prop] = val;
        }
    }
    return ReactElement(type, key, ref, props);
};
