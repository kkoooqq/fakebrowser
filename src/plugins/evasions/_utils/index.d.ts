
export declare const utils: {
    init: () => void;
    stringifyFns: (fnObj?: { [key: string]: Function | any }) => { [key: string]: string };
    cache: {
        nativeToStringStr: string;
        Reflect: typeof Reflect;
        Promise: typeof Promise;
        Object: typeof Object;
        Function: typeof Function;
        global: {FontFace: any};
        window: Pick<typeof window, 'getComputedStyle' | 'eval' | 'navigator' >
        OffscreenCanvas: any;
        HTMLCanvasElement: any;
        Descriptor: {
            FontFace: any;
            HTMLElement: any;
            CSSStyleDeclaration: any;
        };
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

    replaceWithProxy: <PARENT extends { [key in FILED]: T }, FILED extends string, T extends object>(obj: PARENT, propName: FILED, handler: ProxyHandler<T>) => PARENT;
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
    /**
     * Strip error lines from stack traces until (and including) a known line the stack.
     * @param err - The error to sanitize
     * @param anchor - The string the anchor line starts with
     */
    stripErrorWithAnchor: (err: Error, anchor: string) => Error;
    /**
     * Make all nested functions of an object native.
     */
    patchToStringNested: <T>(obj: any) => T;
    /**
     * Helper function to modify the `toString()` result of the provided object.
     *
     * Note: Use `utils.redirectToString` instead when possible.
     *
     * There's a quirk in JS Proxies that will cause the `toString()` result to differ from the vanilla Object.
     * If no string is provided we will generate a `[native code]` thing based on the name of the property object.
     *
     * @example
     * patchToString(WebGLRenderingContext.prototype.getParameter, 'function getParameter() { [native code] }')
     *
     * @param {object} obj - The object for which to modify the `toString()` representation
     * @param {string} str - Optional string used as a return value
     */
    patchToString: <T extends object>(obj: T, str?: string) => T;


    getProxyTarget: <T>(proxy: T) => T;
    
    /**
     * The context is saved when the canvas.getContext is created.
     * @param context
     * @param operatorName
     * @returns {number}
     */
    markRenderingContextOperator: (context: any, operatorName: string) => number;

    /**
     * All-in-one method to replace a getter with a JS Proxy using the provided Proxy handler with traps.
     *
     * @example
     * replaceGetterWithProxy(Object.getPrototypeOf(navigator), 'vendor', proxyHandler)
     *
     * @param {object} obj - The object which has the property to replace
     * @param {string} propName - The name of the property to replace
     * @param {object} handler - The JS Proxy handler to use
     */
    replaceGetterWithProxy: (obj: any, propName: string, handler:ProxyHandler<any>) => boolean;

}

export default utils;
