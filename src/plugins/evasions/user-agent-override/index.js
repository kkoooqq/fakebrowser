'use strict';

const {PuppeteerExtraPlugin} = require('puppeteer-extra-plugin');

const withUtils = require('../_utils/withUtils');
const withWorkerUtils = require('../_utils/withWorkerUtils');

/**
 * Fixes the UserAgent info (composed of UA string, Accept-Language, Platform, and UA hints).
 *
 * If you don't provide any values this plugin will default to using the regular UserAgent string (while stripping the headless part).
 * Default language is set to "en-US,en", the other settings match the UserAgent string.
 * If you are running on Linux, it will mask the settins to look like Windows. This behavior can be disabled with the `maskLinux` option.
 *
 * By default puppeteer will not set a `Accept-Language` header in headless:
 * It's (theoretically) possible to fix that using either `page.setExtraHTTPHeaders` or a `--lang` launch arg.
 * Unfortunately `page.setExtraHTTPHeaders` will lowercase everything and launch args are not always available. :)
 *
 * In addition, the `navigator.platform` property is always set to the host value, e.g. `Linux` which makes detection very easy.
 *
 * Note: You cannot use the regular `page.setUserAgent()` puppeteer call in your code,
 * as it will reset the language and platform values you set with this plugin.
 *
 * @example
 * const puppeteer = require("puppeteer-extra")
 *
 * const StealthPlugin = require("puppeteer-extra-plugin-stealth")
 * const stealth = StealthPlugin()
 * // Remove this specific stealth plugin from the default set
 * stealth.enabledEvasions.delete("user-agent-override")
 * puppeteer.use(stealth)
 *
 * // Stealth plugins are just regular `puppeteer-extra` plugins and can be added as such
 * const UserAgentOverride = require("puppeteer-extra-plugin-evasions/user-agent-override")
 * // Define custom UA and locale
 * const ua = UserAgentOverride({ userAgent: "Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1)", locale: "de-DE,de" })
 * puppeteer.use(ua)
 *
 * @param {Object} [opts] - Options
 * @param {string} [opts.userAgent] - The user agent to use (default: browser.userAgent())
 * @param {string} [opts.locale] - The locale to use in `Accept-Language` header and in `navigator.languages` (default: `en-US,en`)
 * @param {boolean} [opts.maskLinux] - Wether to hide Linux as platform in the user agent or not - true by default
 *
 */
class Plugin extends PuppeteerExtraPlugin {
    constructor(opts = {}) {
        super(opts);

        this._headless = false;
    }

    getOverride = async (page) => {
        // Determine the full user agent string, strip the "Headless" part
        let ua =
            this.opts.userAgent ||
            page && (await page.browser().userAgent()).replace('HeadlessChrome/', 'Chrome/');

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
            : (page && (await page.browser().version()).match(/\/([\d|.]+)/)[1]);

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
        const override = await this.getOverride(page);

        try {
            await page._client.send('Network.setUserAgentOverride', override);
        } catch (ex) {
            console.warn('Network.setUserAgentOverride CDPSession Error', ex, JSON.stringify(override));
        }

        await withUtils(page).evaluateOnNewDocument(this.mainFunction, override);
    }

    async onServiceWorkerContent(jsContent) {
        const override = await this.getOverride();

        if (override) {
            return withWorkerUtils(jsContent).evaluate(this.mainFunction, override);
        } else {
            return jsContent;
        }
    }

    mainFunction = (utils, override) => {
        if ('undefined' !== typeof NavigatorUAData) {
            utils.replaceGetterWithProxy(NavigatorUAData.prototype, 'brands', {
                apply(target, thisArg, args) {
                    return JSON.parse(JSON.stringify(override.userAgentMetadata.brands));
                },
            });

            utils.replaceGetterWithProxy(NavigatorUAData.prototype, 'platform', {
                apply(target, thisArg, args) {
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

            utils.replaceWithProxy(NavigatorUAData.prototype, 'toJSON', {
                apply(target, thisArg, args) {
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
