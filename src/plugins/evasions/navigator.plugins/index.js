'use strict';

const {PuppeteerExtraPlugin} = require('puppeteer-extra-plugin');

const utils = require('../_utils');
const withUtils = require('../_utils/withUtils');

const {generateMimeTypeArray} = require('./mimeTypes');
const {generatePluginArray} = require('./plugins');
const {generateMagicArray} = require('./magicArray');
const {generateFunctionMocks} = require('./functionMocks');

const kPluginsLessThen93 = {
    'mimeTypes': [
        {
            'type': 'application/pdf',
            'suffixes': 'pdf',
            'description': '',
            '__pluginName': 'Chrome PDF Viewer',
        },
        {
            'type': 'application/x-google-chrome-pdf',
            'suffixes': 'pdf',
            'description': 'Portable Document Format',
            '__pluginName': 'Chrome PDF Plugin',
        },
        {
            'type': 'application/x-nacl',
            'suffixes': '',
            'description': 'Native Client Executable',
            '__pluginName': 'Native Client',
        },
        {
            'type': 'application/x-pnacl',
            'suffixes': '',
            'description': 'Portable Native Client Executable',
            '__pluginName': 'Native Client',
        },
    ],
    'plugins': [
        {
            'name': 'Chrome PDF Plugin',
            'filename': 'internal-pdf-viewer',
            'description': 'Portable Document Format',
            '__mimeTypes': [
                'application/x-google-chrome-pdf',
            ],
        },
        {
            'name': 'Chrome PDF Viewer',
            'filename': 'mhjfbmdgcfjbbpaeojofohoefgiehjai',
            'description': '',
            '__mimeTypes': [
                'application/pdf',
            ],
        },
        {
            'name': 'Native Client',
            'filename': 'internal-nacl-plugin',
            'description': '',
            '__mimeTypes': [
                'application/x-nacl',
                'application/x-pnacl',
            ],
        },
    ],
};

const kPluginsGreaterThen93 = {
    mimeTypes: [
        {
            type: 'application/pdf',
            suffixes: 'pdf',
            description: 'Portable Document Format',
            __pluginName: 'PDF Viewer',
        },
        {
            type: 'text/pdf',
            suffixes: 'pdf',
            description: 'Portable Document Format',
            __pluginName: 'PDF Viewer',
        },
    ],
    plugins: [
        {
            name: 'PDF Viewer',
            filename: 'internal-pdf-viewer',
            description: 'Portable Document Format',
            __mimeTypes: ['application/pdf', 'text/pdf'],
        },
        {
            name: 'Chrome PDF Viewer',
            filename: 'internal-pdf-viewer',
            description: 'Portable Document Format',
            __mimeTypes: ['application/pdf', 'text/pdf'],
        },
        {
            name: 'Chromium PDF Viewer',
            filename: 'internal-pdf-viewer',
            description: 'Portable Document Format',
            __mimeTypes: ['application/pdf', 'text/pdf'],
        },
        {
            name: 'Microsoft Edge PDF Viewer',
            filename: 'internal-pdf-viewer',
            description: 'Portable Document Format',
            __mimeTypes: ['application/pdf', 'text/pdf'],
        },
        {
            name: 'WebKit built-in PDF',
            filename: 'internal-pdf-viewer',
            description: 'Portable Document Format',
            __mimeTypes: ['application/pdf', 'text/pdf'],
        },
    ],
};

const withWorkerUtils = require('../_utils/withWorkerUtils');

/**
 * In headless mode `navigator.mimeTypes` and `navigator.plugins` are empty.
 * This plugin emulates both of these with functional mocks to match regular headful Chrome.
 *
 * Note: mimeTypes and plugins cross-reference each other, so it makes sense to do them at the same time.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/NavigatorPlugins/mimeTypes
 * @see https://developer.mozilla.org/en-US/docs/Web/API/MimeTypeArray
 * @see https://developer.mozilla.org/en-US/docs/Web/API/NavigatorPlugins/plugins
 * @see https://developer.mozilla.org/en-US/docs/Web/API/PluginArray
 */
class Plugin extends PuppeteerExtraPlugin {

    constructor(opts = {plugins: kPluginsLessThen93}) {
        super(opts);
    }

    get name() {
        return 'evasions/navigator.plugins';
    }

    async onBrowser(browser, opts) {
        function chromeMajorVersion(userAgent) {
            const chromeVersionPart = userAgent.match(/Chrome\/(.*?)\./);
            if (chromeVersionPart) {
                return parseInt(chromeVersionPart[1]);
            }

            return null;
        }

        const orgUA = await browser.userAgent();

        // https://www.chromestatus.com/feature/5741884322349056#details
        if (chromeMajorVersion(orgUA) > 93) {
            this.opts.plugins = kPluginsGreaterThen93;
        }
    }

    async onPageCreated(page) {
        await withUtils(this, page).evaluateOnNewDocument(
            this.mainFunction,
            {
                // We pass some functions to evaluate to structure the code more nicely
                fns: utils.stringifyFns({
                    generateMimeTypeArray,
                    generatePluginArray,
                    generateMagicArray,
                    generateFunctionMocks,
                }),
                plugins: this.opts.plugins,
            },
        );
    }

    mainFunction = (utils, {fns, plugins: pluginsData}) => {
        fns = utils.materializeFns(fns);

        const _Object = utils.cache.Object;

        // That means we're running headful
        // const hasPlugins = 'plugins' in navigator && navigator.plugins.length
        // if (hasPlugins) {
        //   return // nothing to do here
        // }

        const mimeTypes = fns.generateMimeTypeArray(utils, fns)(pluginsData.mimeTypes);
        const plugins = fns.generatePluginArray(utils, fns)(pluginsData.plugins);

        const enabledPluginSets = new Set();

        // Plugin and MimeType cross-reference each other, let's do that now
        // Note: We're looping through `data.plugins` here, not the generated `plugins`
        for (const pluginData of pluginsData.plugins) {
            pluginData.__mimeTypes.forEach((type, index) => {
                plugins[pluginData.name][index] = mimeTypes[type];

                _Object.defineProperty(plugins[pluginData.name], type, {
                    value: mimeTypes[type],
                    writable: false,
                    enumerable: false, // Not enumerable
                    configurable: true,
                });

                if (!enabledPluginSets.has(mimeTypes[type])) {
                    _Object.defineProperty(mimeTypes[type], 'enabledPlugin', {
                        value:
                            type === 'application/x-pnacl'
                                ? mimeTypes['application/x-nacl'].enabledPlugin // these reference the same plugin, so we need to re-use the Proxy in order to avoid leaks
                                // : utils.newProxyInstance(plugins[pluginData.name], {}), // Prevent circular references
                                : plugins[pluginData.name], // Prevent circular references
                        writable: false,
                        enumerable: false, // Important: `JSON.stringify(navigator.plugins)`
                        configurable: true,
                    });

                    enabledPluginSets.add(mimeTypes[type]);
                }
            });
        }

        utils.replaceGetterWithProxy(
            Navigator.prototype,
            'plugins',
            utils.makeHandler().getterValue(plugins),
        );

        utils.replaceGetterWithProxy(
            Navigator.prototype,
            'mimeTypes',
            utils.makeHandler().getterValue(mimeTypes),
        );
    };

}

module.exports = function (pluginConfig) {
    return new Plugin(pluginConfig);
};
