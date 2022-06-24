
export declare const utils: {
    init: () => void;
    stringifyFns: (fnObj?: { [key: string]: Function | any }) => { [key: string]: string };
    cache: {
        Object: typeof Object;
        Reflect: typeof Reflect;
        Promise: typeof Promise;
    };
    patchError: (err: Error, trap: string) => Error;
    makePseudoClass: (root: { [key: string]: any }, name: string, pseudoTarget: any, parentClass: any) => void;

    /**
     * All-in-one method to mock a non-existing property with a JS Proxy using the provided Proxy handler with traps.
     *
     * Will stealthify these aspects (strip error stack traces, redirect toString, etc).
     *
     * @example
     * mockWithProxy(chrome.runtime, 'sendMessage', function sendMessage() {}, proxyHandler)
     *
     * @param {object} obj - The object which has the property to replace
     * @param {string} propName - The name of the property to replace or create
     * @param {object} pseudoTarget - The JS Proxy target to use as a basis
     * @param {object} descriptorOverrides Overwrite writable, enumerable, configurable, etc
     * @param {object} handler - The JS Proxy handler to use
     */
    mockWithProxy: (obj: any, propName: string, pseudoTarget: any, descriptorOverrides: any, handler: ProxyHandler<any>) => void;

    mockGetterWithProxy: (obj: any, propName: string, pseudoTarget: any, descriptorOverrides: any, handler: ProxyHandler<any>) => true;
    mockSetterWithProxy: (obj: any, propName: string, pseudoTarget: any, descriptorOverrides: any, handler: ProxyHandler<any>) => true;
    newProxyInstance: <T extends object>(target: T, handler: ProxyHandler<T>) => T;

    replaceWithProxy: <PARENT extends {[key in FILED]: T}, FILED extends string, T extends object>(obj: PARENT, propName: FILED, handler: ProxyHandler<T>) => PARENT;
    // replaceWithProxy: <T extends object>(obj: T, propName: string, handler: ProxyHandler<T>);
    replaceObjPathWithProxy: <T extends object>(objPath: T, handler: ProxyHandler<any>) => T;
    random: (a: number, b: number) => number;
    sleep: (ms: number) => Promise<void>;
    differenceABSet: <T>(a: Array<T> | Set<T>, b: Array<T> | Set<T>) => Set<T>;
    intersectionSet: <T>(a: Array<T> | Set<T>, b: Array<T> | Set<T>) => Set<T>;
    isUUID: (str: string) => boolean;
    /**
     * do implement forEach
     */
    isSequence: (obj: any) => boolean;

}

export default utils;
