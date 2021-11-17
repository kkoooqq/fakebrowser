// noinspection JSUnusedLocalSymbols,JSUnusedGlobalSymbols,JSUnresolvedVariable

/**
 * A set of shared utility functions specifically for the purpose of modifying native browser APIs without leaving traces.
 *
 * Meant to be passed down in puppeteer and used in the context of the page (everything in here runs in NodeJS as well as a browser).
 *
 * Note: If for whatever reason you need to use this outside of `puppeteer-extra`:
 * Just remove the `module.exports` statement at the very bottom, the rest can be copy pasted into any browser context.
 *
 * Alternatively take a look at the `extract-stealth-evasions` package to create a finished bundle which includes these utilities.
 *
 */
const utils = {};

utils.init = () => {
    utils._preloadCache();
    utils._preloadEnv();
    utils._preloadGlobalVariables();
    utils._hookObjectPrototype();
};

/**
 * Preload a cache of function copies and data.
 *
 * For a determined enough observer it would be possible to overwrite and sniff usage of functions
 * we use in our internal Proxies, to combat that we use a cached copy of those functions.
 *
 * Note: Whenever we add a `Function.prototype.toString` proxy we should preload the cache before,
 * by executing `utils.preloadCache()` before the proxy is applied (so we don't cause recursive lookups).
 *
 * This is evaluated once per execution context (e.g. window)
 */
utils._preloadCache = () => {
    if (utils.cache) {
        return;
    }

    utils.cache = OffscreenCanvas.prototype.constructor.__$cache;
    if (utils.cache) {
        return;
    }

    OffscreenCanvas.prototype.constructor.__$cache = utils.cache = {
        // Used in `makeNativeString`
        nativeToStringStr: Function.toString + '', // => `function toString() { [native code] }`
        // Used in our proxies
        Reflect: {
            get: Reflect.get.bind(Reflect),
            set: Reflect.set.bind(Reflect),
            apply: Reflect.apply.bind(Reflect),
            ownKeys: Reflect.ownKeys.bind(Reflect),
            getOwnPropertyDescriptor: Reflect.getOwnPropertyDescriptor.bind(Reflect),
            setPrototypeOf: Reflect.setPrototypeOf.bind(Reflect),
        },
        Object: {
            setPrototypeOf: Object.setPrototypeOf.bind(Object),
            getPrototypeOf: Object.getPrototypeOf.bind(Object),
            getOwnPropertyDescriptors: Object.getOwnPropertyDescriptors.bind(Object),
            getOwnPropertyDescriptor: Object.getOwnPropertyDescriptor.bind(Object),
            entries: Object.entries.bind(Object),
            fromEntries: Object.fromEntries.bind(Object),
            defineProperty: Object.defineProperty.bind(Object),
            defineProperties: Object.defineProperties.bind(Object),
            getOwnPropertyNames: Object.getOwnPropertyNames.bind(Object),
            create: Object.create.bind(Object),
            keys: Object.keys.bind(Object),
            values: Object.values.bind(Object),
        },
        Function: {
            prototype: {
                toString: Function.prototype.toString,
            },
        },
        global: 'undefined' !== typeof window ? window : globalThis,
        window: {
            getComputedStyle: ('undefined' !== typeof window) && window.getComputedStyle.bind(window),
            eval: ('undefined' !== typeof window) ? window.eval.bind(window) : (globalThis ? globalThis.eval.bind(globalThis) : undefined),
            navigator: ('undefined' !== typeof window) ? window.navigator : (globalThis ? globalThis.navigator : undefined),
        },
        OffscreenCanvas: {
            prototype: {
                getContext: ('undefined' !== typeof OffscreenCanvas) && OffscreenCanvas.prototype.getContext,
            },
        },
        HTMLCanvasElement: {
            prototype: {
                getContext: ('undefined' !== typeof HTMLCanvasElement) && HTMLCanvasElement.prototype.getContext,
            },
        },
        Descriptor: {},
    };

    const cacheDescriptors = (objPath, propertyKeys) => {
        // get obj from path
        const objPaths = objPath.split('.');
        let _global = utils.cache.global;
        let descObj = utils.cache.Descriptor;

        for (const part of objPaths) {
            if (_global) {
                // noinspection JSUnresolvedFunction
                if (!Object.hasOwn(_global, part)) {
                    _global = undefined;
                } else {
                    _global = _global[part];
                }
            }

            const subCacheObj = descObj[part] || {};
            descObj[part] = subCacheObj;
            descObj = subCacheObj;
        }

        for (const key of propertyKeys) {
            descObj[key] = _global ? Object.getOwnPropertyDescriptor(_global, key) : undefined;
        }
    };

    cacheDescriptors('window', ['alert']);
    cacheDescriptors('Navigator.prototype', ['webdriver']);
    cacheDescriptors('WorkerNavigator.prototype', ['webdriver']);
    cacheDescriptors('HTMLElement.prototype', ['style']);
    cacheDescriptors('CSSStyleDeclaration.prototype', ['setProperty']);
    cacheDescriptors('FontFace.prototype', ['load']);
    cacheDescriptors('WebGLShaderPrecisionFormat.prototype', ['rangeMin', 'rangeMax', 'precision']);
};

utils._preloadGlobalVariables = () => {
    if (utils.variables) {
        return;
    }

    utils.variables = OffscreenCanvas.prototype.constructor.__$variables;
    if (utils.variables) {
        return;
    }

    OffscreenCanvas.prototype.constructor.__$variables = utils.variables = {
        proxies: [],
        toStringPatchObjs: [],
        toStringRedirectObjs: [],
        renderingContextWithOperators: [],
    };
};

utils._preloadEnv = () => {
    if (utils.env) {
        return;
    }

    utils.env = OffscreenCanvas.prototype.constructor.__$env;
    if (utils.env) {
        return;
    }

    OffscreenCanvas.prototype.constructor.__$env = utils.env = {
        isWorker: !globalThis.document && !!globalThis.WorkerGlobalScope,
        isSharedWorker: !!globalThis.SharedWorkerGlobalScope,
        isServiceWorker: !!globalThis.ServiceWorkerGlobalScope,
    };
};

utils._hookObjectPrototype = () => {
    if (utils.objHooked) {
        return;
    }

    utils.objHooked = OffscreenCanvas.prototype.constructor.__$objHooked;
    if (utils.objHooked) {
        return;
    }

    utils.objHooked = OffscreenCanvas.prototype.constructor.__$objHooked = true;
    const _Object = utils.cache.Object;
    const _Reflect = utils.cache.Reflect;

    // setPrototypeOf
    utils.replaceWithProxy(Object, 'setPrototypeOf', {
        apply(target, thisArg, args) {
            args[0] = utils.getProxyTarget(args[0]);
            args[1] = utils.getProxyTarget(args[1]);

            return _Reflect.apply(target, thisArg, args);
        },
    });

    // Function.prototype toString
    const toStringProxy = utils.newProxyInstance(
        Function.prototype.toString,
        utils.stripProxyFromErrors({
            apply: function (target, thisArg) {
                // This fixes e.g. `HTMLMediaElement.prototype.canPlayType.toString + ""`
                if (thisArg === Function.prototype.toString) {
                    return utils.makeNativeString('toString');
                }

                // toStringPatch
                const toStringPatchObj = utils.variables.toStringPatchObjs.find(
                    e => e.obj === thisArg,
                );

                if (toStringPatchObj) {
                    // `toString` targeted at our proxied Object detected
                    // We either return the optional string verbatim or derive the most desired result automatically
                    return toStringPatchObj.str || utils.makeNativeString(toStringPatchObj.obj.name);
                }

                // toStringRedirect
                const toStringRedirectObj = utils.variables.toStringRedirectObjs.find(
                    e => e.proxyObj === thisArg
                );

                if (toStringRedirectObj) {
                    const {proxyObj, originalObj} = toStringRedirectObj;
                    const fallback = () =>
                        originalObj && originalObj.name
                            ? utils.makeNativeString(originalObj.name)
                            : utils.makeNativeString(proxyObj.name);

                    // Return the toString representation of our original object if possible
                    return originalObj + '' || fallback();
                }

                if (typeof thisArg === 'undefined' || thisArg === null) {
                    return target.call(thisArg);
                }

                // Check if the toString protype of the context is the same as the global prototype,
                // if not indicates that we are doing a check across different windows., e.g. the iframeWithdirect` test case
                const hasSameProto = _Object.getPrototypeOf(
                    Function.prototype.toString,
                ).isPrototypeOf(thisArg.toString); // eslint-disable-line no-prototype-builtins

                if (!hasSameProto) {
                    // Pass the call on to the local Function.prototype.toString instead
                    return thisArg.toString();
                }

                return target.call(thisArg);
            },
        }),
    );

    utils.replaceProperty(Function.prototype, 'toString', {
        value: toStringProxy,
    });

    // Object create
    utils.replaceWithProxy(Object, 'create', {
        apply(target, thisArg, args) {
            if (args[0] === toStringProxy) {
                args[0] = utils.cache.Function.prototype.toString;
            }

            return _Reflect.apply(target, thisArg, args);
        },
    });
};

utils.removeTempVariables = () => {
    const tmpVarNames =
        Object.getOwnPropertyNames(
            OffscreenCanvas.prototype.constructor,
        ).filter(e => e.startsWith('__$'));

    tmpVarNames.forEach(e => {
        delete OffscreenCanvas.prototype.constructor[e];
    });
};

utils.newProxyInstance = (target, handler) => {
    // const newTarget = utils.getProxyTarget(target);
    const result = new Proxy(target, handler);
    utils.variables.proxies.push({proxy: result, target});
    return result;
};

utils.getProxyTarget = (proxy) => {
    const cache = utils.variables.proxies.find(e => e.proxy === proxy);
    if (!cache) {
        return proxy;
    }

    return cache.target;
};

utils.patchError = (err, trap) => {
    // Stack traces differ per browser, we only support chromium based ones currently
    if (!err || !err.stack || !err.stack.includes(`at `)) {
        return err;
    }

    // err.__stack = err.stack.split('\n').join('\n');

    // When something throws within one of our traps the Proxy will show up in error stacks
    // An earlier implementation of this code would simply strip lines with a blacklist,
    // but it makes sense to be more surgical here and only remove lines related to our Proxy.
    // We try to use a known "anchor" line for that and strip it with everything above it.
    // If the anchor line cannot be found for some reason we fall back to our blacklist approach.

    const stripWithBlacklist = (stack, stripFirstLine = true) => {
        const blacklist = [
            'eval at <anonymous>',
            'at new Promise (<anonymous>)',
            `at Reflect.${trap} `, // e.g. Reflect.get or Reflect.apply
            `at Object.${trap} `, // e.g. Object.get or Object.apply
            `at Object.newHandler.<computed> [as ${trap}] `, // caused by this very wrapper :-)
        ];
        return (
            err.stack
                .split('\n')
                // Always remove the first (file) line in the stack (guaranteed to be our proxy)
                .filter((line, index) => !(index === 1 && stripFirstLine))
                // Check if the line starts with one of our blacklisted strings
                .filter(line => !blacklist.some(bl => line.trim().includes(bl)))
                .join('\n')
        );
    };

    const stripWithAnchor = (stack, anchor) => {
        const stackArr = stack.split('\n');
        anchor = anchor || `at Object.newHandler.<computed> [as ${trap}] `; // Known first Proxy line in chromium

        const anchorIndex = stackArr.findIndex(line =>
            line.trim().startsWith(anchor),
        );

        if (anchorIndex === -1) {
            return false; // 404, anchor not found
        }

        // Strip everything from the top until we reach the anchor line
        // Note: We're keeping the 1st line (zero index) as it's unrelated (e.g. `TypeError`)
        stackArr.splice(1, anchorIndex);

        return stackArr.join('\n');
    };

    // Special cases due to our nested toString proxies
    err.stack = err.stack.replace(
        'at Object.toString (',
        'at Function.toString (',
    );

    if ((err.stack || '').includes('at Function.toString (')) {
        err.stack = stripWithBlacklist(err.stack, false);

        return err;
    }

    // Try using the anchor method, fallback to blacklist if necessary
    err.stack = stripWithAnchor(err.stack) || stripWithBlacklist(err.stack);

    return err;
};

/**
 * Wraps a JS Proxy Handler and strips it's presence from error stacks, in case the traps throw.
 *
 * The presence of a JS Proxy can be revealed as it shows up in error stack traces.
 *
 * @param {object} handler - The JS Proxy handler to wrap
 */
utils.stripProxyFromErrors = (handler = {}) => {
    const _Object = utils.cache.Object;
    const _Reflect = utils.cache.Reflect;

    const newHandler = {
        setPrototypeOf: function (target, proto) {
            if (proto === null)
                throw new TypeError('Cannot convert object to primitive value');
            if (_Object.getPrototypeOf(target) === _Object.getPrototypeOf(proto)) {
                throw new TypeError('Cyclic __proto__ value');
            }

            return _Reflect.setPrototypeOf(target, proto);
        },
    };

    // We wrap each trap in the handler in a try/catch and modify the error stack if they throw
    const traps = _Object.getOwnPropertyNames(handler);
    traps.forEach(trap => {
        newHandler[trap] = function () {
            try {
                // Forward the call to the defined proxy handler
                return handler[trap].apply(this, arguments || []);
            } catch (err) {
                throw utils.patchError(err, trap);
            }
        };
    });

    return newHandler;
};

/**
 * Strip error lines from stack traces until (and including) a known line the stack.
 *
 * @param {object} err - The error to sanitize
 * @param {string} anchor - The string the anchor line starts with
 */
utils.stripErrorWithAnchor = (err, anchor) => {
    const stackArr = err.stack.split('\n');
    const anchorIndex = stackArr.findIndex(line => line.trim().startsWith(anchor));

    if (anchorIndex === -1) {
        return err; // 404, anchor not found
    }

    // Strip everything from the top until we reach the anchor line (remove anchor line as well)
    // Note: We're keeping the 1st line (zero index) as it's unrelated (e.g. `TypeError`)
    stackArr.splice(1, anchorIndex);
    err.stack = stackArr.join('\n');

    return err;
};

/**
 * Replace the property of an object in a stealthy way.
 *
 * Note: You also want to work on the prototype of an object most often,
 * as you'd otherwise leave traces (e.g. showing up in Object.getOwnPropertyNames(obj)).
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty
 *
 * @example
 * replaceProperty(WebGLRenderingContext.prototype, 'getParameter', { value: "alice" })
 * // or
 * replaceProperty(Object.getPrototypeOf(navigator), 'languages', { get: () => ['en-US', 'en'] })
 *
 * @param {object} obj - The object which has the property to replace
 * @param {string | Symbol} propName - The property name to replace
 * @param {object} descriptorOverrides - e.g. { value: "alice" }
 */
utils.replaceProperty = (obj, propName, descriptorOverrides = {}) => {
    const _Object = utils.cache.Object;
    const descriptors = _Object.getOwnPropertyDescriptor(obj, propName) || {};

    if (propName !== 'toString' && propName !== Symbol.toStringTag) {
        // noinspection JSUnusedLocalSymbols
        for (const [key, value] of _Object.entries(descriptorOverrides)) {
            if (descriptors[key]) {
                utils.redirectToString(descriptorOverrides[key], descriptors[key]);
            }
        }
    }

    return _Object.defineProperty(obj, propName, {
        // Copy over the existing descriptors (writable, enumerable, configurable, etc)
        ...descriptors,
        // Add our overrides (e.g. value, get())
        ...descriptorOverrides,
    });
};

/**
 * Utility function to generate a cross-browser `toString` result representing native code.
 *
 * There's small differences: Chromium uses a single line, whereas FF & Webkit uses multiline strings.
 * To future-proof this we use an existing native toString result as the basis.
 *
 * The only advantage we have over the other team is that our JS runs first, hence we cache the result
 * of the native toString result once, so they cannot spoof it afterwards and reveal that we're using it.
 *
 * @example
 * makeNativeString('foobar') // => `function foobar() { [native code] }`
 *
 * @param {string} [name] - Optional function name
 */
utils.makeNativeString = (name = '') => {
    return utils.cache.nativeToStringStr.replace('toString', name || '');
};

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
utils.patchToString = (obj, str = '') => {
    utils.variables.toStringPatchObjs.push({obj, str});
};

/**
 * Make all nested functions of an object native.
 *
 * @param {object} obj
 */
utils.patchToStringNested = (obj = {}) => {
    return utils.execRecursively(obj, ['function'], utils.patchToString);
};

/**
 * Redirect toString requests from one object to another.
 *
 * @param {object} proxyObj - The object that toString will be called on
 * @param {object} originalObj - The object which toString result we wan to return
 */
utils.redirectToString = (proxyObj, originalObj) => {
    utils.variables.toStringRedirectObjs.push({proxyObj, originalObj});
};

/**
 * All-in-one method to replace a property with a JS Proxy using the provided Proxy handler with traps.
 *
 * Will stealthify these aspects (strip error stack traces, redirect toString, etc).
 * Note: This is meant to modify native Browser APIs and works best with prototype objects.
 *
 * @example
 * replaceWithProxy(WebGLRenderingContext.prototype, 'getParameter', proxyHandler)
 *
 * @param {object} obj - The object which has the property to replace
 * @param {string | Symbol} propName - The name of the property to replace
 * @param {object} handler - The JS Proxy handler to use
 */
utils.replaceWithProxy = (obj, propName, handler) => {
    const originalObj = obj[propName];
    const _Reflect = utils.cache.Reflect;

    if (!originalObj) {
        return false;
    }

    if (!handler.get) {
        handler = {
            ...handler,
            // Make toString() native
            get(target, key) {
                return _Reflect.get(target, key);
            },
        };
    }

    const proxyObj = utils.newProxyInstance(originalObj, utils.stripProxyFromErrors(handler));

    utils.replaceProperty(obj, propName, {value: proxyObj});
    utils.redirectToString(proxyObj, originalObj);

    return true;
};
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
utils.replaceGetterWithProxy = (obj, propName, handler) => {
    const fn = utils.cache.Object.getOwnPropertyDescriptor(obj, propName).get;
    const fnStr = fn.toString(); // special getter function string
    const proxyObj = utils.newProxyInstance(fn, utils.stripProxyFromErrors(handler));

    utils.replaceProperty(obj, propName, {get: proxyObj});
    utils.patchToString(proxyObj, fnStr);

    return true;
};

utils.replaceSetterWithProxy = (obj, propName, handler) => {
    const fn = utils.cache.Object.getOwnPropertyDescriptor(obj, propName).set;
    const fnStr = fn.toString(); // special setter function string
    const proxyObj = utils.newProxyInstance(fn, utils.stripProxyFromErrors(handler));

    utils.replaceProperty(obj, propName, {set: proxyObj});
    utils.patchToString(proxyObj, fnStr);

    return true;
};

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
utils.mockWithProxy = (obj, propName, pseudoTarget, descriptorOverrides, handler) => {
    const _Reflect = utils.cache.Reflect;

    if (!handler.get) {
        handler.get = (target, property, receiver) => {
            if (property === 'name') {
                return propName;
            }

            return _Reflect.get(target, property, receiver);
        };
    }

    const proxyObj = pseudoTarget
        ? utils.newProxyInstance(pseudoTarget, utils.stripProxyFromErrors(handler))
        : utils.stripProxyFromErrors(handler);

    utils.replaceProperty(obj, propName, {
        ...descriptorOverrides,
        value: proxyObj,
    });

    utils.patchToString(proxyObj);

    return true;
};

utils.mockGetterWithProxy = (obj, propName, pseudoTarget, descriptorOverrides, handler) => {
    const _Reflect = utils.cache.Reflect;

    if (!handler.get) {
        handler.get = (target, property, receiver) => {
            if (property === 'name') {
                return `get ${propName}`;
            }

            if (property === 'length') {
                return 0;
            }

            return _Reflect.get(target, property, receiver);
        };
    }

    const proxyObj = pseudoTarget
        ? utils.newProxyInstance(pseudoTarget, utils.stripProxyFromErrors(handler))
        : utils.stripProxyFromErrors(handler);

    utils.replaceProperty(obj, propName, {
        ...descriptorOverrides,
        get: proxyObj,
    });

    utils.patchToString(proxyObj, `function get ${propName}() { [native code] }`);

    return true;
};

utils.mockSetterWithProxy = (obj, propName, pseudoTarget, descriptorOverrides, handler) => {
    const _Reflect = utils.cache.Reflect;

    if (!handler.get) {
        handler.get = (target, property, receiver) => {
            if (property === 'name') {
                return `set ${propName}`;
            }

            if (property === 'length') {
                return 1;
            }

            return _Reflect.get(target, property, receiver);
        };
    }

    const proxyObj = pseudoTarget
        ? utils.newProxyInstance(pseudoTarget, utils.stripProxyFromErrors(handler))
        : utils.stripProxyFromErrors(handler);

    utils.replaceProperty(obj, propName, {
        ...descriptorOverrides,
        set: proxyObj,
    });

    utils.patchToString(proxyObj, `function set ${propName}() { [native code] }`);

    return true;
};

/**
 * All-in-one method to create a new JS Proxy with stealth tweaks.
 *
 * This is meant to be used whenever we need a JS Proxy but don't want to replace or mock an existing known property.
 *
 * Will stealthify certain aspects of the Proxy (strip error stack traces, redirect toString, etc).
 *
 * @example
 * createProxy(navigator.mimeTypes.__proto__.namedItem, proxyHandler) // => Proxy
 *
 * @param {object} pseudoTarget - The JS Proxy target to use as a basis
 * @param {object} handler - The JS Proxy handler to use
 */
utils.createProxy = (pseudoTarget, handler) => {
    const proxyObj = utils.newProxyInstance(pseudoTarget, utils.stripProxyFromErrors(handler));
    utils.patchToString(proxyObj);

    return proxyObj;
};

/**
 * Helper function to split a full path to an Object into the first part and property.
 *
 * @example
 * splitObjPath(`HTMLMediaElement.prototype.canPlayType`)
 * // => {objName: "HTMLMediaElement.prototype", propName: "canPlayType"}
 *
 * @param {string} objPath - The full path to an object as dot notation string
 */
utils.splitObjPath = objPath => ({
    // Remove last dot entry (property) ==> `HTMLMediaElement.prototype`
    objName: objPath.split('.').slice(0, -1).join('.'),
    // Extract last dot entry ==> `canPlayType`
    propName: objPath.split('.').slice(-1)[0],
});

/**
 * Convenience method to replace a property with a JS Proxy using the provided objPath.
 *
 * Supports a full path (dot notation) to the object as string here, in case that makes it easier.
 *
 * @example
 * replaceObjPathWithProxy('WebGLRenderingContext.prototype.getParameter', proxyHandler)
 *
 * @param {string} objPath - The full path to an object (dot notation string) to replace
 * @param {object} handler - The JS Proxy handler to use
 */
utils.replaceObjPathWithProxy = (objPath, handler) => {
    const {objName, propName} = utils.splitObjPath(objPath);
    const obj = eval(objName); // eslint-disable-line no-eval
    return utils.replaceWithProxy(obj, propName, handler);
};

/**
 * Traverse nested properties of an object recursively and apply the given function on a whitelist of value types.
 *
 * @param {object} obj
 * @param {array} typeFilter - e.g. `['function']`
 * @param {Function} fn - e.g. `utils.patchToString`
 */
utils.execRecursively = (obj = {}, typeFilter = [], fn) => {
    function recurse(obj) {
        for (const key in obj) {
            if (obj[key] === undefined) {
                continue;
            }
            if (obj[key] && typeof obj[key] === 'object') {
                recurse(obj[key]);
            } else {
                if (obj[key] && typeFilter.includes(typeof obj[key])) {
                    fn.call(this, obj[key]);
                }
            }
        }
    }

    recurse(obj);
    return obj;
};

/**
 * Everything we run through e.g. `page.evaluate` runs in the browser context, not the NodeJS one.
 * That means we cannot just use reference variables and functions from outside code, we need to pass everything as a parameter.
 *
 * Unfortunately the data we can pass is only allowed to be of primitive types, regular functions don't survive the built-in serialization process.
 * This utility function will take an object with functions and stringify them, so we can pass them down unharmed as strings.
 *
 * We use this to pass down our utility functions as well as any other functions (to be able to split up code better).
 *
 * @see utils.materializeFns
 *
 * @param {object} fnObj - An object containing functions as properties
 */
utils.stringifyFns = (fnObj = {hello: () => 'world'}) => {
    // Object.fromEntries() ponyfill (in 6 lines) - supported only in Node v12+, modern browsers are fine
    // https://github.com/feross/fromentries
    function fromEntries(iterable) {
        return [...iterable].reduce((obj, [key, val]) => {
            obj[key] = val;
            return obj;
        }, {});
    }

    // noinspection JSUnusedLocalSymbols
    return (Object.fromEntries || fromEntries)(
        Object.entries(fnObj)
            .filter(([key, value]) => typeof value === 'function')
            .map(([key, value]) => [key, value.toString()]), // eslint-disable-line no-eval
    );
};

/**
 * Utility function to reverse the process of `utils.stringifyFns`.
 * Will materialize an object with stringified functions (supports classic and fat arrow functions).
 *
 * @param {object} fnStrObj - An object containing stringified functions as properties
 */
utils.materializeFns = (fnStrObj = {hello: '() => \'world\''}) => {
    return Object.fromEntries(
        Object.entries(fnStrObj).map(([key, value]) => {
            if (value.startsWith('function')) {
                // some trickery is needed to make oldschool functions work :-)
                return [key, eval(`() => ${value}`)()]; // eslint-disable-line no-eval
            } else {
                // arrow functions just work
                return [key, eval(value)]; // eslint-disable-line no-eval
            }
        }),
    );
};

// Proxy handler templates for re-usability
utils.makeHandler = () => ({
    // Used by simple `navigator` getter evasions
    getterValue: value => ({
        apply(target, thisArg, args) {
            const _Reflect = utils.cache.Reflect;

            // Let's fetch the value first, to trigger and escalate potential errors
            // Illegal invocations like `navigator.__proto__.vendor` will throw here
            _Reflect.apply(...arguments);
            return value;
        },
    }),
});

utils.sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

utils.random = (a, b) => {
    const c = b - a + 1;
    return Math.floor(Math.random() * c + a);
};

utils.isHex = (str) => {
    try {
        if (str && 'string' === typeof str) {
            if (str.startsWith('0x')) {
                str = str.substr(2);
            }

            return /^[A-F0-9]+$/i.test(str);
        }
    } catch (_) {
    }

    return false;
};

utils.isInt = (str) => {
    try {
        const isHex = utils.isHex(str);
        if (isHex) {
            return true;
        }

        return ('' + parseInt(str)) === ('' + str);
    } catch (_) {
    }

    return false;
};

utils.isUUID = (str) => {
    try {
        if ('string' === typeof str) {
            return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
        }
    } catch (_) {
    }

    return false;
};

// utils.isSequence('haha')                 ===>  false
// utils.isSequence([])                     ===>  true
// utils.isSequence(new Int8Array())        ===>  true
// utils.isSequence(new Set())              ===>  true
utils.isSequence = (obj) => {
    const _Object = utils.cache.Object;
    let desc = null;

    for (;
        obj && !!(desc = _Object.getOwnPropertyDescriptors(obj));
    ) {
        if (desc.forEach) {
            return true;
        }

        obj = _Object.getPrototypeOf(obj);
    }

    return false;
};

utils.intersectionSet = (a, b) => {
    if (b instanceof Array) {
        b = new Set(b);
    }

    return new Set([...a].filter(x => b.has(x)));
};

utils.unionSet = (a, b) => {
    return new Set([...a, ...b]);
};

utils.differenceABSet = (a, b) => {
    if (b instanceof Array) {
        b = new Set(b);
    }

    return new Set([...a].filter(x => !b.has(x)));
};

utils.getCurrentScriptPath = () => {
    let a = {}, stack;
    try {
        a.b();
    } catch (e) {
        // noinspection JSUnresolvedVariable
        stack = e.stack || e.sourceURL || e.stacktrace;
    }

    let rExtractUri = /(?:http|https|file):\/\/.*?\/.+?\.js/,
        absPath = rExtractUri.exec(stack);

    if (!absPath) {
        absPath = /(?:http|https|file):\/\/.*?\/.+?:?/.exec(stack);
        if (absPath) {
            absPath[0] = absPath[0].substr(0, absPath[0].length - 1);
        }
    }

    return (absPath && absPath[0]) || '';
};

utils.makePseudoClass = (
    root,
    name,
    pseudoTarget,
    parentClass,
) => {
    const _Object = utils.cache.Object;

    const result = new Proxy(
        pseudoTarget || function () {
            throw utils.patchError(new TypeError(`Illegal constructor`), 'construct');
        },
        {
            // noinspection JSUnusedLocalSymbols
            construct(target, args) {
                throw utils.patchError(new TypeError(`Illegal constructor`), 'construct');
            },
        },
    );

    root[name] = result;

    _Object.defineProperty(result, 'name', {
        configurable: true,
        enumerable: false,
        writable: false,
        value: name,
    });

    _Object.defineProperty(result, 'prototype', {
        configurable: false,
        enumerable: false,
        writable: false,
        value: result.prototype,
    });

    utils.patchToString(result, `function ${name}() { [native code] }`);
    utils.patchToString(result.prototype.constructor, `function ${name}() { [native code] }`);

    _Object.defineProperty(result.prototype, Symbol.toStringTag, {
        configurable: true,
        enumerable: false,
        writable: false,
        value: name,
    });

    if (parentClass && parentClass.prototype) {
        _Object.setPrototypeOf(result.prototype, parentClass.prototype);
    }

    return result;
};

/**
 * The context is saved when the canvas.getContext is created.
 * @param context
 * @param operatorName
 * @returns {number}
 */
utils.markRenderingContextOperator = (context, operatorName) => {
    const result = utils.variables.renderingContextWithOperators.findIndex(e => e.context === context);

    if (result >= 0) {
        const operators = utils.variables.renderingContextWithOperators[result];
        if (operators) {
            operators.operators[operatorName] = true;
        }
    }

    return result;
};

/**
 * Find the context created by the external based on the canvas
 * @param canvas
 * @returns {{context: *, contextIndex: number}|{context: null, contextIndex: number}}
 */
utils.findRenderingContextIndex = (canvas) => {
    const contextIds = [
        '2d',
        'webgl', 'experimental-webgl',
        'webgl2', 'experimental-webgl2',
        'bitmaprenderer',
    ];

    for (let contextId of contextIds) {
        let context = null;

        if (utils.cache.Object.getPrototypeOf(canvas) === OffscreenCanvas.prototype) {
            context = utils.cache.OffscreenCanvas.prototype.getContext.call(canvas, contextId);
        } else {
            context = utils.cache.HTMLCanvasElement.prototype.getContext.call(canvas, contextId);
        }

        const contextIndex = utils.variables.renderingContextWithOperators.findIndex(e => e.context === context);

        if (contextIndex >= 0) {
            return {context, contextIndex};
        }
    }

    return {context: null, contextIndex: -1};
};


module.exports = utils;
