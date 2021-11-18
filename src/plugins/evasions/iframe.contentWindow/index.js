// noinspection JSUnusedLocalSymbols

'use strict';

const {PuppeteerExtraPlugin} = require('puppeteer-extra-plugin');

const withUtils = require('../_utils/withUtils');
const withWorkerUtils = require('../_utils/withWorkerUtils');

/**
 * Fix for the HEADCHR_IFRAME detection (iframe.contentWindow.chrome), hopefully this time without breaking iframes.
 * Note: Only `srcdoc` powered iframes cause issues due to a chromium bug:
 *
 * https://github.com/puppeteer/puppeteer/issues/1106
 */
class Plugin extends PuppeteerExtraPlugin {
    constructor(opts = {}) {
        super(opts);
    }

    get name() {
        return 'evasions/iframe.contentWindow';
    }

    get requirements() {
        // Make sure `chrome.runtime` has ran, we use data defined by it (e.g. `window.chrome`)
        return new Set(['runLast']);
    }

    async onPageCreated(page) {
        await withUtils(this, page).evaluateOnNewDocument(this.mainFunction);
    }

    mainFunction = (utils) => {
        const _Object = utils.cache.Object;
        const _Reflect = utils.cache.Reflect;

        try {
            // Adds a contentWindow proxy to the provided iframe element
            const addContentWindowProxy = iframe => {
                if (!iframe.contentWindow) {
                    const proxy = utils.newProxyInstance(window, {
                        get(target, key) {
                            // console.log(`!!!!!! hook !! get subframe key: ${key}`);

                            // Now to the interesting part:
                            // We actually make this thing behave like a regular iframe window,
                            // by intercepting calls to e.g. `.self` and redirect it to the correct thing. :)
                            // That makes it possible for these assertions to be correct:
                            // iframe.contentWindow.self === window.top // must be false
                            if (key === 'self') {
                                return this;
                            }

                            // iframe.contentWindow.frameElement === iframe // must be true
                            if (key === 'frameElement') {
                                return iframe;
                            }

                            // Intercept iframe.contentWindow[0] to hide the property 0 added by the proxy.
                            if (key === '0') {
                                return undefined;
                            }

                            let result = _Reflect.get(target, key);
                            if (!result) {
                                result = target[key];
                            }

                            return result;
                        },
                    });

                    _Object.defineProperty(iframe, 'contentWindow', {
                        get(target, key) {
                            if (!iframe.parentElement) {
                                return null;
                            }

                            return proxy;
                        },
                        set(newValue) {
                            return newValue; // contentWindow is immutable
                        },
                        enumerable: true,
                        configurable: false,
                    });
                }
            };

            // Handles iframe element creation, augments `srcdoc` property so we can intercept further
            const handleIframeCreation = (target, thisArg, args) => {
                const iframe = target.apply(thisArg, args);

                // We need to keep the originals around
                const _iframe = iframe;
                const _srcdoc = _iframe.srcdoc;
                const _src = _iframe.src;

                // Add hook for the srcdoc property
                // We need to be very surgical here to not break other iframes by accident
                _Object.defineProperty(iframe, 'srcdoc', {
                    configurable: true, // Important, so we can reset this later
                    get: function () {
                        return _srcdoc;
                    },
                    set: function (newValue) {
                        addContentWindowProxy(this);

                        // Reset property, the hook is only needed once
                        _Object.defineProperty(iframe, 'srcdoc', {
                            configurable: false,
                            writable: false,
                            value: _srcdoc,
                        });

                        _iframe.srcdoc = newValue;
                    },
                });

                return iframe;
            };

            // Adds a hook to intercept iframe creation events
            const addIframeCreationSniffer = () => {
                // All this just due to iframes with srcdoc bug
                utils.replaceWithProxy(
                    document,
                    'createElement',
                    {
                        // Make toString() native
                        get(target, key) {
                            return _Reflect.get(target, key);
                        },
                        apply: function (target, thisArg, args) {
                            const isIframe = args && args.length && `${args[0]}`.toLowerCase() === 'iframe';
                            if (!isIframe) {
                                return target.apply(thisArg, args);
                            } else {
                                return handleIframeCreation(target, thisArg, args);
                            }
                        },
                    },
                );
            };

            // Let's go
            addIframeCreationSniffer();
        } catch (err) {
            // console.warn(err);
        }
    };

}

module.exports = function (pluginConfig) {
    return new Plugin(pluginConfig);
};
