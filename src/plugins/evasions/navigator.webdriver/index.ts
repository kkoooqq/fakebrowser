import { FakeDeviceDescriptor } from 'DeviceDescriptor';
import { PuppeteerLaunchOption } from 'puppeteer-extra';
import { PuppeteerExtraPlugin, PuppeteerPage } from 'puppeteer-extra-plugin';
import Utils from '../_utils/'
import withUtils from '../_utils/withUtils';
import withWorkerUtils from '../_utils/withWorkerUtils';

export interface PluginOptions {
    fakeDD: FakeDeviceDescriptor;
}

/**
 * Pass the Webdriver Test.
 * Will delete `navigator.webdriver` property.
 */
 export class Plugin extends PuppeteerExtraPlugin<PluginOptions> {
    constructor(opts?: Partial<PluginOptions>) {
        super(opts);
    }


    get name() {
        return 'evasions/navigator.webdriver';
    }

    async onPageCreated(page: PuppeteerPage) {
        await withUtils(this, page).evaluateOnNewDocument(this.mainFunction);
    }

    // Post Chrome 88.0.4291.0
    // Note: this will add an infobar to Chrome with a warning that an unsupported flag is set
    // To remove this bar on Linux, run: mkdir -p /etc/opt/chrome/policies/managed && echo '{ "CommandLineFlagSecurityWarningsEnabled": false }' > /etc/opt/chrome/policies/managed/managed_policies.json
    async beforeLaunch(options: PuppeteerLaunchOption): Promise<void | PuppeteerLaunchOption> {
        // options!.args = options!.args || [];
        // If disable-blink-features is already passed, append the AutomationControlled switch
        const idx = options!.args!.findIndex((arg) => arg.startsWith('--disable-blink-features='));
        if (idx !== -1) {
            const arg = options!.args![idx];
            options!.args![idx] = `${arg},AutomationControlled`;
        } else {
            options!.args!.push('--disable-blink-features=AutomationControlled');
        }
    }

    onServiceWorkerContent(jsContent: any) {
        return withWorkerUtils(this, jsContent).evaluate(this.mainFunction);
    }

    mainFunction = (utils: typeof Utils) => {
        // akamai set Object.defineProperty(navigator, 'webdriver', {value:'false'})
        // we cannot delete it

        // noinspection JSUnresolvedVariable
        const webdriverDesc = utils.cache.Descriptor.Navigator.prototype.webdriver
            || utils.cache.Descriptor.WorkerNavigator.prototype.webdriver;

        if (webdriverDesc === undefined) {
            // Post Chrome 89.0.4339.0 and already good
            return;
        }

        // invoke the original getter of prototype, *DO NOT* use the code like: ' navigator.webdriver === false '
        const get_webdriverFunc = webdriverDesc.get.bind(utils.cache.window.navigator);
        if (get_webdriverFunc() === false) {
            // Pre Chrome 89.0.4339.0 and already good
            return;
        }

        // Pre Chrome 88.0.4291.0 and needs patching
        delete Object.getPrototypeOf(navigator).webdriver;
    };

}

export default (pluginConfig?: Partial<PluginOptions>) => new Plugin(pluginConfig)
