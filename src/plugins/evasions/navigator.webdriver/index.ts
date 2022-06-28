// import { FakeDeviceDescriptor } from 'core/DeviceDescriptor';
import { PptrExtraEvasionOpts } from 'core/PptrPatcher';
import { PuppeteerLaunchOption } from 'puppeteer-extra';
import { PuppeteerExtraPlugin, PuppeteerPage } from 'puppeteer-extra-plugin';
import Utils from '../_utils/'
import withUtils from '../_utils/withUtils';
import withWorkerUtils from '../_utils/withWorkerUtils';

// export interface PluginOptions {
//     fakeDD: FakeDeviceDescriptor;
// }

/** this code will be executed inside the browser */
const mainFunction = (utils: typeof Utils) => {
    // akamai set Object.defineProperty(navigator, 'webdriver', {value:'false'})
    // we cannot delete it
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

/**
 * Pass the Webdriver Test.
 * Will delete `navigator.webdriver` property.
 */
export class Plugin extends PuppeteerExtraPlugin<PptrExtraEvasionOpts> {
    constructor(opts?: Partial<PptrExtraEvasionOpts>) {
        super(opts);
    }

    get name(): 'evasions/navigator.webdriver' {
        return 'evasions/navigator.webdriver';
    }

    async onPageCreated(page: PuppeteerPage) {
        await withUtils(this, page).evaluateOnNewDocument(mainFunction);
        // debugger;
        console.log('evasions/navigator.webdriver loaded')
    }

    // Post Chrome 88.0.4291.0
    // Note: this will add an infobar to Chrome with a warning that an unsupported flag is set
    // To remove this bar on Linux, run: mkdir -p /etc/opt/chrome/policies/managed && echo '{ "CommandLineFlagSecurityWarningsEnabled": false }' > /etc/opt/chrome/policies/managed/managed_policies.json
    async beforeLaunch(options: PuppeteerLaunchOption): Promise<void | PuppeteerLaunchOption> {
        options = options || {};
        options.args = options.args || [];
        // options!.args = options!.args || [];
        // If disable-blink-features is already passed, append the AutomationControlled switch
        const idx = options.args.findIndex((arg) => arg.startsWith('--disable-blink-features='));
        if (idx !== -1) {
            const arg = options.args[idx];
            options.args[idx] = `${arg},AutomationControlled`;
        } else {
            options.args.push('--disable-blink-features=AutomationControlled');
        }
        return options;
    }

    async onServiceWorkerContent(jsContent: any) {
        await withWorkerUtils(this, jsContent).evaluate(mainFunction);
        // debugger;
        console.log('evasions/navigator.webdriver onServiceWorkerContent loaded')
    }
}

export default (pluginConfig?: Partial<PptrExtraEvasionOpts>) => new Plugin(pluginConfig)
