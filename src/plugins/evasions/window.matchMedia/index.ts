import { PuppeteerExtraPlugin, PuppeteerPage } from 'puppeteer-extra-plugin';
import Utils from '../_utils/'
import withUtils from '../_utils/withUtils';

export interface PluginOptions {
}

export class Plugin extends PuppeteerExtraPlugin<PluginOptions> {
    constructor(opts?: Partial<PluginOptions>) {
        super(opts);
    }

    get name() {
        return 'evasions/window.matchMedia';
    }

    async onPageCreated(page: PuppeteerPage) {
        await withUtils(this, page).evaluateOnNewDocument((utils: typeof Utils) => {
            // const _Object = utils.cache.Object;
            const _Reflect = utils.cache.Reflect;

            utils.replaceWithProxy(window, 'matchMedia', {
                apply(target: any, thisArg, args) {
                    // console.log(`hook window matchMedia ${args.join('|')}`);
                    return _Reflect.apply(target, thisArg, args);
                },
            });
        });
    }
}

export default (pluginConfig?: Partial<PluginOptions>) => new Plugin(pluginConfig)
