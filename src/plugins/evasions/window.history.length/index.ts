import { PuppeteerExtraPlugin, PuppeteerPage } from 'puppeteer-extra-plugin';
import Utils from '../_utils/'
import withUtils from '../_utils/withUtils';

export interface PluginOptions {
    historyLength: number;
}

class Plugin extends PuppeteerExtraPlugin<PluginOptions> {
    constructor(opts?: Partial<PluginOptions>) {
        super(opts);
    }

    get name(): 'evasions/window.history.length' {
        return 'evasions/window.history.length';
    }

    async onPageCreated(page: PuppeteerPage) {
        await withUtils(this, page).evaluateOnNewDocument(
            (utils: typeof Utils, historyLength: number) => {
                for (let n = 0; n < historyLength; ++n) {
                    if (window.history.length >= historyLength) {
                        break;
                    }
                    window.history.pushState(null, '');
                }
            },
            this.opts.historyLength,
        );
    }
}

export default (pluginConfig?: Partial<PluginOptions>) => new Plugin(pluginConfig)
