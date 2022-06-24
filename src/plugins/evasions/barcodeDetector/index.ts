import { PuppeteerExtraPlugin, PuppeteerPage } from 'puppeteer-extra-plugin';
import Utils from '../_utils/'
import withUtils from '../_utils/withUtils';
import withWorkerUtils from '../_utils/withWorkerUtils';

export interface PluginOptions {
}

// "BarcodeDetector"

class Plugin extends PuppeteerExtraPlugin<PluginOptions> {
    constructor(opts?: Partial<PluginOptions>) {
        super(opts);
    }

    get name(): 'evasions/barcodeDetector' {
        return 'evasions/barcodeDetector';
    }

    async onPageCreated(page: PuppeteerPage) {
        await withUtils(this, page).evaluateOnNewDocument(this.mainFunction);
    }

    onServiceWorkerContent(jsContent: any) {
        return withWorkerUtils(this, jsContent).evaluate(this.mainFunction);
    }

    mainFunction = (utils: typeof Utils, opts: any) => {
    };
}

export default (pluginConfig?: Partial<PluginOptions>) => new Plugin(pluginConfig)
