import DeviceDescriptorHelper, { DeviceDescriptorNavigator, FakeDeviceDescriptor, IFontSalt } from 'DeviceDescriptor';
import { BrowserEventOptions } from 'puppeteer-extra';
import { PluginRequirements, PuppeteerBrowser, PuppeteerExtraPlugin, PuppeteerPage } from 'puppeteer-extra-plugin';
import Utils from '../_utils/'
import withUtils from '../_utils/withUtils';
import withWorkerUtils from '../_utils/withWorkerUtils';

declare var WorkerNavigator: any;

export interface PluginOptions {
    realUA: string;
    fakeDD: FakeDeviceDescriptor;
}

interface PluginInternalArgs {
    realUA: string,
    fakeNavigator: DeviceDescriptorNavigator,
    fakeWindow: string,
    fakeDocument: string,
    fakeScreen: string,
    fakeBody: string,
}

export class Plugin extends PuppeteerExtraPlugin<PluginOptions> {
    constructor(opts?: Partial<PluginOptions>) {
        super(opts);
    }

    get name(): 'evasions/properties.getter' {
        return 'evasions/properties.getter';
    }

    async onBrowser(browser: PuppeteerBrowser, opts: BrowserEventOptions): Promise<void> {
        this.opts.realUA = await browser.userAgent();
    }

    async onPageCreated(page: PuppeteerPage) {
        await withUtils(this, page).evaluateOnNewDocument(this.mainFunction, {
            realUA: this.opts.realUA,
            fakeNavigator: this.opts.fakeDD.navigator,
            fakeWindow: this.opts.fakeDD.window,
            fakeDocument: this.opts.fakeDD.document,
            fakeScreen: this.opts.fakeDD.screen,
            fakeBody: this.opts.fakeDD.body,
        });
    }

    onServiceWorkerContent(jsContent: any) {
        return withWorkerUtils(this, jsContent).evaluate(this.mainFunction, {
            realUA: this.opts.realUA,
            fakeNavigator: this.opts.fakeDD.navigator,
            fakeWindow: this.opts.fakeDD.window,
            fakeDocument: this.opts.fakeDD.document,
            fakeScreen: this.opts.fakeDD.screen,
            fakeBody: this.opts.fakeDD.body,
        });
    }

    mainFunction = (utils: typeof Utils, opts: PluginInternalArgs) => {
        const {
            realUA,
            fakeNavigator,
            fakeWindow,
            fakeDocument,
            fakeScreen,
            fakeBody,
        } = opts;
        const _Object = utils.cache.Object;
        const _Reflect = utils.cache.Reflect;

        // replace Chrome version of fakeDDs' userAgent and appVersion with real version
        function chromeVersion(userAgent: string) {
            const chromeVersionPart = userAgent.match(/Chrome\/(.*?) /);
            if (chromeVersionPart) {
                return chromeVersionPart[1];
            }

            return null;
        }

        const realVersion = chromeVersion(realUA)!;
        const fakeVersion = chromeVersion(fakeNavigator.userAgent)!;

        fakeNavigator.userAgent = fakeNavigator.userAgent.replace(fakeVersion, realVersion);

        if (fakeNavigator.appVersion) {
            fakeNavigator.appVersion = fakeNavigator.appVersion.replace(fakeVersion, realVersion);
        }

        /* Define variables */
        const kObjPlaceHolder = '_$obj!_//+_';
        const kObjUndefinedPlaceHolder = '_$obj!_undefined_//+_';

        const overwriteObjectProperties = function (obj: any, newPropValues: any, blackList?: string[]) {
            if (!obj) {
                return;
            }

            for (const name in newPropValues) {
                if (blackList && blackList.includes(name)) {
                    continue;
                }

                // Check if the original has this property
                const desc = _Object.getOwnPropertyDescriptor(obj, name);
                if (!desc) {
                    // Does not exist, just exit
                    // console.warn('!!! Property not found:' + o.constructor.name + ' propertyKey:' + key);
                    continue;
                }

                let newPropValue = newPropValues[name];
                if (newPropValue === kObjUndefinedPlaceHolder) {
                    newPropValue = undefined;
                }

                if (newPropValue === kObjPlaceHolder) {
                    // If it contains attribute and has value, exit directly
                    continue;
                } else if ('undefined' == typeof newPropValue) {
                    // If empty, delete this property
                    delete obj[name];
                } else {
                    // Other value, direct assignment
                }

                let func = null;
                if ('undefined' !== typeof desc['value']) {
                    func = utils.replaceWithProxy;
                } else if ('undefined' !== typeof desc['get']) {
                    func = utils.replaceGetterWithProxy;
                } else {
                    if ('value' in desc) {
                        func = utils.replaceWithProxy;
                    } else if ('get' in desc) {
                        func = utils.replaceGetterWithProxy;
                    } else {
                        func = utils.replaceSetterWithProxy;
                    }
                }

                // Consider whether the check for undefined elsewhere contains
                if ('undefined' == typeof newPropValue) {
                    // TODO: Ignore this property
                    // utils.addIgnoreProperty(o, propertyKey);
                }

                func(obj, name, {
                    apply(target, thisArgs, args) {
                        _Reflect.apply(target, thisArgs, args);
                        return newPropValue;
                    },
                });
            }
        };

        if ('undefined' !== typeof WorkerNavigator) {
            overwriteObjectProperties(WorkerNavigator.prototype, fakeNavigator);
        }

        if ('undefined' !== typeof Navigator) {
            overwriteObjectProperties(Navigator.prototype, fakeNavigator);
        }

        if ('undefined' !== typeof window) {
            overwriteObjectProperties(window, fakeWindow, ['pageXOffset', 'pageYOffset']);
        }

        if ('undefined' !== typeof Document) {
            overwriteObjectProperties(Document.prototype, fakeDocument);
        }

        if ('undefined' !== typeof HTMLBodyElement) {
            overwriteObjectProperties(HTMLBodyElement.prototype, fakeBody, ['clientWidth', 'clientHeight']);
        }

        if ('undefined' !== typeof Screen) {
            overwriteObjectProperties(Screen.prototype, fakeScreen);
        }
    };
}

export default (pluginConfig?: Partial<PluginOptions>) => new Plugin(pluginConfig)
