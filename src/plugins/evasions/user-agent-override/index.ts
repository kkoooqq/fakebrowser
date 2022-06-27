import { FakeDeviceDescriptor } from 'core/DeviceDescriptor';
import { BrowserEventOptions, PuppeteerLaunchOption } from 'puppeteer-extra';
import { PuppeteerBrowser, PuppeteerCDPSession, PuppeteerExtraPlugin, PuppeteerPage } from 'puppeteer-extra-plugin';
import Utils from '../_utils/'
import withUtils from '../_utils/withUtils';
import withWorkerUtils from '../_utils/withWorkerUtils';

declare var NavigatorUAData: any;

export interface PluginOptions {
    override: any;
    fakeDD: FakeDeviceDescriptor;
    userAgent: string | null,
    locale: string,
    // internalHttpServerPort: any;
    // browserUUID: any;
}


export interface PluginOverride {
    userAgent: string,
    acceptLanguage: string,
    platform: string,
    userAgentMetadata: {
        brands: { brand: string; version: string; }[],
        fullVersion: string,
        platform: string,
        platformVersion: string,
        architecture: string,
        model: string,
        mobile: boolean,
    },
}

export class Plugin extends PuppeteerExtraPlugin<PluginOptions> {
    private _headless?: boolean | 'chrome' = false;

    constructor(opts?: Partial<PluginOptions>) {
        super(opts);    
    }

    async onBrowser(browser: PuppeteerBrowser, opts: BrowserEventOptions): Promise<void> {
        this.opts.override = await this.getOverride(browser, this.opts);
    }

    getOverride = async (browser: PuppeteerBrowser, opts: PluginOptions): Promise<PluginOverride | null> => {
        // read major version from the launched browser and replace dd.userAgent
        const orgUA = await browser.userAgent();

        function chromeVersion(userAgent: string) {
            const chromeVersionPart = userAgent.match(/Chrome\/(.*?) /);
            if (chromeVersionPart) {
                return chromeVersionPart[1];
            }

            return null;
        }

        const orgVersion = chromeVersion(orgUA)!;
        const fakeVersion = chromeVersion(opts.fakeDD.navigator.userAgent)!;

        opts.fakeDD.navigator.userAgent = opts.fakeDD.navigator.userAgent.replace(fakeVersion, orgVersion);

        // Determine the full user agent string, strip the "Headless" part
        let ua = opts.fakeDD.navigator.userAgent;

        // Full version number from Chrome
        const uaVersion = ua.includes('Chrome/')
            ? ua.match(/Chrome\/([\d|.]+)/)![1]
            : (browser && (await browser.version()).match(/\/([\d|.]+)/)![1]);

        if (!uaVersion) {
            return null;
        }

        // Get platform identifier (short or long version)
        const _getPlatform = (extended = false) => {
            if (ua.includes('Mac OS X')) {
                return extended ? 'macOS' : 'MacIntel';
            } else if (ua.includes('Android')) {
                return 'Android';
            } else if (ua.includes('Linux')) {
                return 'Linux';
            } else {
                return extended ? 'Windows' : 'Win32';
            }
        };

        // Source in C++: https://source.chromium.org/chromium/chromium/src/+/master:components/embedder_support/user_agent_utils.cc;l=55-100
        const _getBrands = (): { brand: string; version: string; }[] => {
            const seed = uaVersion.split('.')[0]; // the major version number of Chrome

            const order = [
                [0, 1, 2],
                [0, 2, 1],
                [1, 0, 2],
                [1, 2, 0],
                [2, 0, 1],
                [2, 1, 0],
            ][Number(seed) % 6];
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
        const _getPlatformVersion = (): string => {
            let m = ua.match(/Mac OS X ([^)]+)/);
            if (m) return m[1]
            m = ua.match(/Android ([^;]+)/)
            if (m) return m[1]
            m = ua.match(/Windows .*?([\d|.]+);?/)
            if (m) return m[1]
            return ''
        }

        // Get architecture, this seems to be empty on mobile and x86 on desktop
        const _getPlatformArch = () => (_getMobile() ? '' : 'x86');

        // Return the Android model, empty on desktop
        const _getPlatformModel = () => {
            const m = ua.match(/Android.*?;\s([^)]+)/);
            if (m) return m[1]
            return '';
          }
      

        const _getMobile = () => ua.includes('Android');

        const override: PluginOverride = {
            userAgent: ua,
            acceptLanguage: '',
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
            override.acceptLanguage = opts.fakeDD.acceptLanguage || 'en-US,en';
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

    get defaults(): PluginOptions {
        return {
            // override: any;
            // fakeDD: FakeDeviceDescriptor;        
            userAgent: null,
            locale: 'en-US,en',
        } as PluginOptions;
    }

    async onPageCreated(page: PuppeteerPage): Promise<void> {
        const override = this.opts.override;
        await withUtils(this, page).evaluateOnNewDocument(this.mainFunction, override);


        const client: PuppeteerCDPSession | undefined =
        typeof page._client === 'function' ? page._client() : page._client
  
        if (!client) {
            throw Error ('Failed to acess CDPSession, with the current pptr version.')
        }
        try {
            client.send('Network.setUserAgentOverride', override)
        } catch (ex) {
            console.warn('Network.setUserAgentOverride CDPSession Error', ex, JSON.stringify(override));
        }
    }

    onServiceWorkerContent(jsContent: any) {
        const override = this.opts.override;

        if (override) {
            return withWorkerUtils(this, jsContent).evaluate(this.mainFunction, override);
        } else {
            return jsContent;
        }
    }

    mainFunction = (utils: typeof Utils, override: PluginOverride) => {
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
                    const result: any = {
                        brands: override.userAgentMetadata.brands,
                        mobile: override.userAgentMetadata.mobile,
                    };

                    if (args && args[0] && args[0].length) {
                        for (const n of args[0]) {
                            if (n in override.userAgentMetadata) {
                                result[n] = (override.userAgentMetadata as any)[n];
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

    async beforeLaunch(options: PuppeteerLaunchOption = {}): Promise<void | PuppeteerLaunchOption> {
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

export default (pluginConfig?: Partial<PluginOptions>) => new Plugin(pluginConfig)
