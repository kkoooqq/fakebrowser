// noinspection JSUnusedLocalSymbols

'use strict';

const {PuppeteerExtraPlugin} = require('puppeteer-extra-plugin');

const withUtils = require('../_utils/withUtils');
const withWorkerUtils = require('../_utils/withWorkerUtils');

const STATIC_DATA = {
        'OnInstalledReason': {
            'CHROME_UPDATE': 'chrome_update',
            'INSTALL': 'install',
            'SHARED_MODULE_UPDATE': 'shared_module_update',
            'UPDATE': 'update',
        },
        'OnRestartRequiredReason': {
            'APP_UPDATE': 'app_update',
            'OS_UPDATE': 'os_update',
            'PERIODIC': 'periodic',
        },
        'PlatformArch': {
            'ARM': 'arm',
            'ARM64': 'arm64',
            'MIPS': 'mips',
            'MIPS64': 'mips64',
            'X86_32': 'x86-32',
            'X86_64': 'x86-64',
        },
        'PlatformNaclArch': {
            'ARM': 'arm',
            'MIPS': 'mips',
            'MIPS64': 'mips64',
            'X86_32': 'x86-32',
            'X86_64': 'x86-64',
        },
        'PlatformOs': {
            'ANDROID': 'android',
            'CROS': 'cros',
            'LINUX': 'linux',
            'MAC': 'mac',
            'OPENBSD': 'openbsd',
            'WIN': 'win',
        },
        'RequestUpdateCheckStatus': {
            'NO_UPDATE': 'no_update',
            'THROTTLED': 'throttled',
            'UPDATE_AVAILABLE': 'update_available',
        },
    }
;

/**
 * Mock the `chrome.runtime` object if not available (e.g. when running headless) and on a secure site.
 */
class Plugin extends PuppeteerExtraPlugin {
    constructor(opts = {}) {
        super(opts);
    }

    get name() {
        return 'evasions/chrome.runtime';
    }

    get defaults() {
        return {runOnInsecureOrigins: false}; // Override for testing
    }

    async onPageCreated(page) {
        await withUtils(this, page).evaluateOnNewDocument(
            this.mainFunction,
            {
                opts: this.opts,
                STATIC_DATA,
            },
        );
    }

    mainFunction = (utils, {opts, STATIC_DATA}) => {
        const _Object = utils.cache.Object;
        const _Reflect = utils.cache.Reflect;

        if (!window.chrome) {
            // Use the exact property descriptor found in headful Chrome
            // fetch it via `Object.getOwnPropertyDescriptor(window, 'chrome')`
            // FIXME: order of 'chrome' in window, cannot by modified
            // when defining this property, 'chrome' becomes the most bottom of the property list
            // inspired by creepjs

            _Object.defineProperty(window, 'chrome', {
                writable: true,
                enumerable: true,
                configurable: false, // note!
                value: {}, // We'll extend that later
            });
        }

        // That means we're running headful and don't need to mock anything
        const existsAlready = 'runtime' in window.chrome;

        // `chrome.runtime` is only exposed on secure origins
        let isNotSecure = false;
        try {
            isNotSecure = !window.top.location.protocol.startsWith('https');
        } catch (ex) {
            try {
                isNotSecure = !window.location.protocol.startsWith('https');
            } catch (ignore) {
            }

            // console.warn(ex);
        }

        if (existsAlready || (isNotSecure && !opts.runOnInsecureOrigins)) {
            return; // Nothing to do here
        }

        _Object.defineProperty(window.chrome, 'runtime', {
            configurable: true,
            enumerable: true,
            value: {
                // There's a bunch of static data in that property which doesn't seem to change,
                // we should periodically check for updates: `JSON.stringify(window.chrome.runtime, null, 2)`
                ...STATIC_DATA,
                // `chrome.runtime.id` is extension related and returns undefined in Chrome
                id: undefined,
                // These two require more sophisticated mocks
                connect: null,
                sendMessage: null,
            },
            writable: true,
        });

        const makeCustomRuntimeErrors = (preamble, method, extensionId) => ({
            NoMatchingSignature: new TypeError(
                preamble + `No matching signature.`,
            ),
            MustSpecifyExtensionID: new TypeError(
                preamble +
                `${method} called from a webpage must specify an Extension ID (string) for its first argument.`,
            ),
            InvalidExtensionID: new TypeError(
                preamble + `Invalid extension id: '${extensionId}'`,
            ),
        });

        // Valid Extension IDs are 32 characters in length and use the letter `a` to `p`:
        // https://source.chromium.org/chromium/chromium/src/+/master:components/crx_file/id_util.cc;drc=14a055ccb17e8c8d5d437fe080faba4c6f07beac;l=90
        const isValidExtensionID = str =>
            str.length === 32 && str.toLowerCase().match(/^[a-p]+$/);

        /** Mock `chrome.runtime.sendMessage` */
        const sendMessageHandler = {
            get: (target, property, receiver) => {
                // I use Object.create as a prototype native function to disguise our js function
                // However, Object.create contains two call parameters
                // So we have to hook length and return 0
                if (property === 'name') {
                    return 'sendMessage';
                } else if (property === 'length') {
                    return 0;
                }

                return _Reflect.get(target, property, receiver);
            },
            apply: function (target, thisArg, args) {
                const [extensionId, options, responseCallback] = args || [];

                // Define custom errors
                const errorPreamble = `Error in invocation of runtime.sendMessage(optional string extensionId, any message, optional object options, optional function responseCallback): `;
                const Errors = makeCustomRuntimeErrors(
                    errorPreamble,
                    `chrome.runtime.sendMessage()`,
                    extensionId,
                );

                // Check if the call signature looks ok
                const noArguments = args.length === 0;
                const tooManyArguments = args.length > 4;
                const incorrectOptions = options && typeof options !== 'object';
                const incorrectResponseCallback =
                    responseCallback && typeof responseCallback !== 'function';
                if (
                    noArguments ||
                    tooManyArguments ||
                    incorrectOptions ||
                    incorrectResponseCallback
                ) {
                    throw Errors.NoMatchingSignature;
                }

                // At least 2 arguments are required before we even validate the extension ID
                if (args.length < 2) {
                    throw Errors.MustSpecifyExtensionID;
                }

                // Now let's make sure we got a string as extension ID
                if (typeof extensionId !== 'string') {
                    throw Errors.NoMatchingSignature;
                }

                if (!isValidExtensionID(extensionId)) {
                    throw Errors.InvalidExtensionID;
                }

                return undefined; // Normal behavior
            },
        };

        utils.mockWithProxy(
            window.chrome.runtime,
            'sendMessage',
            _Object.create, // We just need a native function
            {},
            sendMessageHandler,
        );

        /**
         * Mock `chrome.runtime.connect`
         *
         * @see https://developer.chrome.com/apps/runtime#method-connect
         */
        const connectHandler = {
            get: (target, property, receiver) => {
                if (property === 'name') {
                    return 'connect';
                } else if (property === 'length') {
                    return 0;
                }

                return _Reflect.get(target, property, receiver);
            },
            apply: function (target, thisArg, args) {
                const [extensionId, connectInfo] = args || [];

                // Define custom errors
                const errorPreamble = `Error in invocation of runtime.connect(optional string extensionId, optional object connectInfo): `;
                const Errors = makeCustomRuntimeErrors(
                    errorPreamble,
                    `chrome.runtime.connect()`,
                    extensionId,
                );

                // Behavior differs a bit from sendMessage:
                const noArguments = args.length === 0;
                const emptyStringArgument = args.length === 1 && extensionId === '';
                if (noArguments || emptyStringArgument) {
                    throw Errors.MustSpecifyExtensionID;
                }

                const tooManyArguments = args.length > 2;
                const incorrectConnectInfoType =
                    connectInfo && typeof connectInfo !== 'object';

                if (tooManyArguments || incorrectConnectInfoType) {
                    throw Errors.NoMatchingSignature;
                }

                const extensionIdIsString = typeof extensionId === 'string';
                if (extensionIdIsString && extensionId === '') {
                    throw Errors.MustSpecifyExtensionID;
                }
                if (extensionIdIsString && !isValidExtensionID(extensionId)) {
                    throw Errors.InvalidExtensionID;
                }

                // There's another edge-case here: exteensionId is optional so we might find a connectInfo object as first param, which we need to validate
                const validateConnectInfo = ci => {
                    // More than a first param connectInfo as been provided
                    if (args.length > 1) {
                        throw Errors.NoMatchingSignature;
                    }
                    // An empty connectInfo has been provided
                    if (_Object.keys(ci).length === 0) {
                        throw Errors.MustSpecifyExtensionID;
                    }
                    // Loop over all connectInfo props an check them
                    _Object.entries(ci).forEach(([k, v]) => {
                        const isExpected = ['name', 'includeTlsChannelId'].includes(k);
                        if (!isExpected) {
                            throw new TypeError(
                                errorPreamble + `Unexpected property: '${k}'.`,
                            );
                        }
                        const MismatchError = (propName, expected, found) =>
                            TypeError(
                                errorPreamble +
                                `Error at property '${propName}': Invalid type: expected ${expected}, found ${found}.`,
                            );
                        if (k === 'name' && typeof v !== 'string') {
                            throw MismatchError(k, 'string', typeof v);
                        }
                        if (k === 'includeTlsChannelId' && typeof v !== 'boolean') {
                            throw MismatchError(k, 'boolean', typeof v);
                        }
                    });
                };
                if (typeof extensionId === 'object') {
                    validateConnectInfo(extensionId);
                    throw Errors.MustSpecifyExtensionID;
                }

                // Unfortunately even when the connect fails Chrome will return an object with methods we need to mock as well
                return utils.patchToStringNested(makeConnectResponse());
            },
        };

        utils.mockWithProxy(
            window.chrome.runtime,
            'connect',
            _Object.create,
            {},
            connectHandler,
        );

        function makeConnectResponse() {
            const onSomething = () => ({
                addListener: function addListener() {
                },
                dispatch: function dispatch() {
                },
                hasListener: function hasListener() {
                },
                hasListeners: function hasListeners() {
                    return false;
                },
                removeListener: function removeListener() {
                },
            });

            const response = {
                name: '',
                sender: undefined,
                disconnect: function disconnect() {
                },
                onDisconnect: onSomething(),
                onMessage: onSomething(),
                postMessage: function postMessage() {
                    if (!arguments.length) {
                        throw new TypeError(`Insufficient number of arguments.`);
                    }
                    throw new Error(`Attempting to use a disconnected port object`);
                },
            };

            return response;
        }
    };

}

module.exports = function (pluginConfig) {
    return new Plugin(pluginConfig);
};
