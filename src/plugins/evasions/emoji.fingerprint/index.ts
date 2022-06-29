import { PluginRequirements, PuppeteerExtraPlugin, PuppeteerPage } from 'puppeteer-extra-plugin';
import Utils from '../_utils/'
import withUtils from '../_utils/withUtils';
import withWorkerUtils from '../_utils/withWorkerUtils';


export interface PluginOptions {
}

export class Plugin extends PuppeteerExtraPlugin<PluginOptions> {
    constructor(opts?: Partial<PluginOptions>) {
        super(opts);
    }

    get name(): 'evasions/emoji.fingerprint' {
        return 'evasions/emoji.fingerprint';
    }

    // noinspection JSUnusedGlobalSymbols
    get requirements(): PluginRequirements {
        return new Set(['runLast']);
    }

    async onPageCreated(page: PuppeteerPage) {
        await withUtils(this, page).evaluateOnNewDocument(this.mainFunction);
    }

    onServiceWorkerContent(jsContent: any) {
        return withWorkerUtils(this, jsContent).evaluate(
            this.mainFunction,
        );
    }

    mainFunction = (utils: typeof Utils) => {
        const _Reflect = utils.cache.Reflect;

        utils.replaceWithProxy(String, 'fromCodePoint', {
            apply(target: any, thisArg, args) {
                const result = _Reflect.apply(target, thisArg, args);
                return result;
            },
        });
    };

}

export default (pluginConfig?: Partial<PluginOptions>) => new Plugin(pluginConfig)
