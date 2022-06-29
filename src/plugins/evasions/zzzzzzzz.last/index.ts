import { PluginRequirements, PuppeteerExtraPlugin, PuppeteerPage } from 'puppeteer-extra-plugin';
import Utils from '../_utils/'
import withUtils from '../_utils/withUtils';
import withWorkerUtils from '../_utils/withWorkerUtils';

export interface PluginOptions {
}

const mainFunction = (utils: typeof Utils) => {
    utils.removeTempVariables();
};

export class Plugin extends PuppeteerExtraPlugin<PluginOptions> {
    constructor(opts?: Partial<PluginOptions>) {
        super(opts);
    }

    get name(): 'evasions/zzzzzzzz.last' {
        return 'evasions/zzzzzzzz.last';
    }

    get requirements(): PluginRequirements {
        return new Set(['runLast']);
    }

    async onPageCreated(page: PuppeteerPage) {
        await withUtils(this, page).evaluateOnNewDocument(mainFunction);
    }

    onServiceWorkerContent(jsContent: any) {
        return withWorkerUtils(this, jsContent).evaluate(mainFunction);
    }
}

export default (pluginConfig?: Partial<PluginOptions>) => new Plugin(pluginConfig)
