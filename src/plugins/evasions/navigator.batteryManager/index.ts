import { DeviceDescriptorMediaBattery, FakeDeviceDescriptor } from 'DeviceDescriptor';
import { PuppeteerExtraPlugin, PuppeteerPage } from 'puppeteer-extra-plugin';
import Utils from '../_utils/'
import withUtils from '../_utils/withUtils';
import withWorkerUtils from '../_utils/withWorkerUtils';

declare var BatteryManager: any;

export interface PluginOptions {
    fakeDD: FakeDeviceDescriptor;
}

export class Plugin extends PuppeteerExtraPlugin<PluginOptions> {
    constructor(opts?: Partial<PluginOptions>) {
        super(opts);
    }

    get name(): 'evasions/navigator.batteryManager' {
        return 'evasions/navigator.batteryManager';
    }

    async onPageCreated(page: PuppeteerPage) {
        await withUtils(this, page).evaluateOnNewDocument(this.mainFunction, this.opts.fakeDD.battery);
    }

    onServiceWorkerContent(jsContent: any) {
        return withWorkerUtils(this, jsContent).evaluate(this.mainFunction, this.opts.fakeDD.battery);
    }

    mainFunction = (utils: typeof Utils, fakeBattery: DeviceDescriptorMediaBattery) => {
        // TODO: If it is a charging state, the user's power should keep increasing to a certain time full.
        // It also needs to simulate the situation that the user has unplugged the power.
        if ('undefined' != typeof BatteryManager) {
            utils.replaceGetterWithProxy(
                BatteryManager.prototype,
                'charging',
                utils.makeHandler().getterValue(fakeBattery.charging),
            );

            utils.replaceGetterWithProxy(
                BatteryManager.prototype,
                'chargingTime',
                utils.makeHandler().getterValue(!fakeBattery.chargingTime ? Infinity : fakeBattery.chargingTime),
            );

            utils.replaceGetterWithProxy(
                BatteryManager.prototype,
                'dischargingTime',
                utils.makeHandler().getterValue(!fakeBattery.dischargingTime ? Infinity : fakeBattery.dischargingTime),
            );

            utils.replaceGetterWithProxy(
                BatteryManager.prototype,
                'level',
                utils.makeHandler().getterValue(fakeBattery.level),
            );
        }
    };
}

export default (pluginConfig?: Partial<PluginOptions>) => new Plugin(pluginConfig)
