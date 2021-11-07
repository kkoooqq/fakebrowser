// noinspection JSUnresolvedVariable,JSCheckFunctionSignatures,JSValidateTypes

'use strict';

const {PuppeteerExtraPlugin} = require('puppeteer-extra-plugin');

const withUtils = require('../_utils/withUtils');
const withWorkerUtils = require('../_utils/withWorkerUtils');

class Plugin extends PuppeteerExtraPlugin {

    _override = null;

    constructor(opts = {}) {
        super(opts);
        this._headless = false;
    }

    onBrowser(browser, opts) {
        this._override = this.getOverride(browser);
    }

    getOverride = (browser) => {
        // Determine the full user agent string, strip the "Headless" part
        let ua =
            this.opts.userAgent ||
            browser && (browser.userAgent()).replace('HeadlessChrome/', 'Chrome/');

        if (!ua) {
            return null;
        }

        if (
            this.opts.maskLinux &&
            ua.includes('Linux') &&
            !ua.includes('Android') // Skip Android user agents since they also contain Linux
        ) {
            ua = ua.replace(/\(([^)]+)\)/, '(Windows NT 10.0; Win64; x64)'); // Replace the first part in parentheses with Windows data
        }

        // Full version number from Chrome
        const uaVersion = ua.includes('Chrome/')
            ? ua.match(/Chrome\/([\d|.]+)/)[1]
            : (browser && (browser.version()).match(/\/([\d|.]+)/)[1]);

        if (!uaVersion) {
            return null;
        }

        // Get platform identifier (short or long version)
        const _getPlatform = (extended = false) => {
            if (ua.includes('Mac OS X')) {
                return extended ? 'Mac OS X' : 'MacIntel';
            } else if (ua.includes('Android')) {
                return 'Android';
            } else if (ua.includes('Linux')) {
                return 'Linux';
            } else {
                return extended ? 'Windows' : 'Win32';
            }
        };

        // Source in C++: https://source.chromium.org/chromium/chromium/src/+/master:components/embedder_support/user_agent_utils.cc;l=55-100
        const _getBrands = () => {
            const seed = uaVersion.split('.')[0]; // the major version number of Chrome

            const order = [
                [0, 1, 2],
                [0, 2, 1],
                [1, 0, 2],
                [1, 2, 0],
                [2, 0, 1],
                [2, 1, 0],
            ][seed % 6];
            const escapedChars = [' ', ' ', ';'];

            const greaseyBrand = `${escapedChars[order[0]]}Not${
                escapedChars[order[1]]
            }A${escapedChars[order[2]]}Brand`;

            const greasedBrandVersionList = [];
            greasedBrandVersionList[order[0]] = {
                brand: greaseyBrand,
                version: '99',
            };
            greasedBrandVersionList[order[1]] = {
                brand: 'Chromium',
                version: seed,
            };
            greasedBrandVersionList[order[2]] = {
                brand: 'Google Chrome',
                version: seed,
            };

            return greasedBrandVersionList;
        };

        // Return OS version
        const _getPlatformVersion = () => {
            if (ua.includes('Mac OS X ')) {
                return ua.match(/Mac OS X ([^)]+)/)[1];
            } else if (ua.includes('Android ')) {
                return ua.match(/Android ([^;]+)/)[1];
            } else if (ua.includes('Windows ')) {
                return ua.match(/Windows .*?([\d|.]+);?/)[1];
            } else {
                return '';
            }
        };

        // Get architecture, this seems to be empty on mobile and x86 on desktop
        const _getPlatformArch = () => (_getMobile() ? '' : 'x86');

        // Return the Android model, empty on desktop
        const _getPlatformModel = () =>
            _getMobile() ? ua.match(/Android.*?;\s([^)]+)/)[1] : '';

        const _getMobile = () => ua.includes('Android');

        const override = {
            userAgent: ua,
            platform: _getPlatform(),
            userAgentMetadata: {
                brands: _getBrands(),
                fullVersion: uaVersion,
                platform: _getPlatform(true),
                platformVersion: _getPlatformVersion(),
                architecture: _getPlatformArch(),
                model: _getPlatformModel(),
                mobile: _getMobile(),
            },
        };

        // In case of headless, override the acceptLanguage in CDP.
        // This is not preferred, as it messed up the header order.
        // On headful, we set the user preference language setting instead.
        if (this._headless) {
            override.acceptLanguage = this.opts.locale || 'en-US,en';
        }

        this.debug('onPageCreated - Will set these user agent options', {
            override,
            opts: this.opts,
        });

        return override;
    };

    get name() {
        return 'evasions/user-agent-override';
    }

    get dependencies() {
        return new Set(['user-preferences']);
    }

    get defaults() {
        return {
            userAgent: null,
            locale: 'en-US,en',
            maskLinux: true,
        };
    }

    async onPageCreated(page) {
        const override = this._override;
        await withUtils(this, page).evaluateOnNewDocument(this.mainFunction, override);

        try {
            await page._client.send('Network.setUserAgentOverride', override);
        } catch (ex) {
            console.warn('Network.setUserAgentOverride CDPSession Error', ex, JSON.stringify(override));
        }
    }

    async onServiceWorkerContent(jsContent) {
        const override = this._override;

        if (override) {
            return withWorkerUtils(this, jsContent).evaluate(this.mainFunction, override);
        } else {
            return jsContent;
        }
    }

    mainFunction = (utils, override) => {
        if ('undefined' !== typeof NavigatorUAData) {
            utils.replaceGetterWithProxy(NavigatorUAData.prototype, 'brands', {
                apply() {
                    return JSON.parse(JSON.stringify(override.userAgentMetadata.brands));
                },
            });

            utils.replaceGetterWithProxy(NavigatorUAData.prototype, 'platform', {
                apply() {
                    return override.userAgentMetadata.platform;
                },
            });

            utils.replaceWithProxy(NavigatorUAData.prototype, 'getHighEntropyValues', {
                apply(target, thisArg, args) {
                    const result = {
                        brands: override.userAgentMetadata.brands,
                        mobile: override.userAgentMetadata.mobile,
                    };

                    if (args && args[0] && args[0].length) {
                        for (const n of args[0]) {
                            if (n in override.userAgentMetadata) {
                                result[n] = override.userAgentMetadata[n];
                            } else if (n === 'uaFullVersion') {
                                result[n] = override.userAgentMetadata.fullVersion;
                            }
                        }
                    }

                    return Promise.resolve(JSON.parse(JSON.stringify(result)));
                },
            });

            // noinspection JSUnresolvedVariable
            utils.replaceWithProxy(NavigatorUAData.prototype, 'toJSON', {
                apply() {
                    const result = {
                        brands: override.userAgentMetadata.brands,
                        mobile: override.userAgentMetadata.mobile,
                    };

                    return Promise.resolve(JSON.parse(JSON.stringify(result)));
                },
            });
        }
    };

    async beforeLaunch(options) {
        // Check if launched headless
        this._headless = options.headless;
    }

    async beforeConnect() {
        // Treat browsers using connect() as headless browsers
        this._headless = true;
    }

    get data() {
        return [
            {
                name: 'userPreferences',
                value: {
                    intl: {accept_languages: this.opts.locale || 'en-US,en'},
                },
            },
        ];
    }
}

const defaultExport = opts => new Plugin(opts);
module.exports = defaultExport;
