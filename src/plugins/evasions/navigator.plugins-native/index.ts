import { DeviceDescriptorPlugins, FakeDeviceDescriptor } from 'core/DeviceDescriptor';
import { BrowserEventOptions } from 'puppeteer-extra';
import { PuppeteerBrowser, PuppeteerExtraPlugin, PuppeteerPage } from 'puppeteer-extra-plugin';
import withUtils from '../_utils/withUtils';
import { mainFunction } from './main';

export interface PluginOptions {
    chromeMajorVersion: number | null;
    fakeDD: FakeDeviceDescriptor;
}

export interface internalPluginOptions {
    chromeMajorVersion: number,
    fakePlugins: DeviceDescriptorPlugins,
}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/NavigatorPlugins/mimeTypes
 * @see https://developer.mozilla.org/en-US/docs/Web/API/MimeTypeArray
 * @see https://developer.mozilla.org/en-US/docs/Web/API/NavigatorPlugins/plugins
 * @see https://developer.mozilla.org/en-US/docs/Web/API/PluginArray
 */
 export class Plugin extends PuppeteerExtraPlugin<PluginOptions> {
    constructor(opts?: Partial<PluginOptions>) {
        super(opts);
    }

    get name(): 'evasions/navigator.plugins' {
        return 'evasions/navigator.plugins';
    }

    async onBrowser(browser: PuppeteerBrowser, opts: BrowserEventOptions): Promise<void> {
        function chromeMajorVersion(userAgent: string): number | null {
            const chromeVersionPart = userAgent.match(/Chrome\/(.*?)\./);
            if (chromeVersionPart) {
                return parseInt(chromeVersionPart[1]);
            }
            return null;
        }
        const orgUA = await browser.userAgent();
        // https://www.chromestatus.com/feature/5741884322349056#details
        this.opts.chromeMajorVersion = chromeMajorVersion(orgUA);
    }

    async onPageCreated(page: PuppeteerPage) {
        const ctx: internalPluginOptions= {
            chromeMajorVersion: this.opts.chromeMajorVersion!,
            fakePlugins: this.opts.fakeDD.plugins,
        };
        await withUtils(this, page).evaluateOnNewDocument(mainFunction, ctx);
    }
}

export default (pluginConfig?: Partial<PluginOptions>) => new Plugin(pluginConfig)
