import { FakeDeviceDescriptor } from 'core/DeviceDescriptor';
import { PuppeteerExtraPlugin, PuppeteerPage } from 'puppeteer-extra-plugin';
import withUtils from '../_utils/withUtils';
import withWorkerUtils from '../_utils/withWorkerUtils';
import { mainFunction } from './main'

export interface PluginOptions {
    fakeDD: FakeDeviceDescriptor;
}

export class Plugin extends PuppeteerExtraPlugin<PluginOptions> {
    constructor(opts?: Partial<PluginOptions>) {
        super(opts);
    }

    get name(): 'evasions/webgl' {
        return 'evasions/webgl';
    }

    /* global WebGLRenderingContext WebGL2RenderingContext */
    async onPageCreated(page: PuppeteerPage) {
        await withUtils(this, page).evaluateOnNewDocument(mainFunction, {
            gpu: this.opts.fakeDD.gpu,
            webgl: this.opts.fakeDD.webgl,
            webgl2: this.opts.fakeDD.webgl2,
        });
    }

    onServiceWorkerContent(jsContent: any) {
        return withWorkerUtils(this, jsContent).evaluate(mainFunction, {
            gpu: this.opts.fakeDD.gpu,
            webgl: this.opts.fakeDD.webgl,
            webgl2: this.opts.fakeDD.webgl2,
        });
    }
}

export default (pluginConfig?: Partial<PluginOptions>) => new Plugin(pluginConfig)
