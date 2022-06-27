import { FakeDeviceDescriptor } from 'DeviceDescriptor';
import { PuppeteerExtraPlugin, PuppeteerPage } from 'puppeteer-extra-plugin';
import Utils from '../_utils/'
import withUtils from '../_utils/withUtils';
import withWorkerUtils from '../_utils/withWorkerUtils';

declare var KeyboardLayoutMap: any;

export interface PluginOptions {
    fakeDD: FakeDeviceDescriptor;
}

export class Plugin extends PuppeteerExtraPlugin<PluginOptions> {
    constructor(opts?: Partial<PluginOptions>) {
        super(opts);
    }

    get name(): 'evasions/keyboard' {
        return 'evasions/keyboard';
    }

    async onPageCreated(page: PuppeteerPage) {
        await withUtils(this, page).evaluateOnNewDocument(this.mainFunction, this.opts.fakeDD.keyboard);
    }

    onServiceWorkerContent(jsContent: any) {
        return withWorkerUtils(this, jsContent).evaluate(this.mainFunction, this.opts.fakeDD.keyboard);
    }

    mainFunction = (utils: typeof Utils, fakeKeyboard: Record<string, string>) => {
        const _Reflect = utils.cache.Reflect;

        if (
            fakeKeyboard
            && 'undefined' !== typeof KeyboardLayoutMap
        ) {
            utils.replaceWithProxy(KeyboardLayoutMap.prototype, 'get', {
                apply(target: any, thisArg: any, args: any[]) {
                    if (args && args.length) {
                        return fakeKeyboard[args[0]];
                    }

                    return _Reflect.apply(target, thisArg, args);
                },
            });
        }
    };

}

export default (pluginConfig?: Partial<PluginOptions>) => new Plugin(pluginConfig)
