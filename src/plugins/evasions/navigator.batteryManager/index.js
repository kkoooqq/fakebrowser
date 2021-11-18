'use strict';

const {PuppeteerExtraPlugin} = require('puppeteer-extra-plugin');
const withUtils = require('../_utils/withUtils');
const withWorkerUtils = require('../_utils/withWorkerUtils');

class Plugin extends PuppeteerExtraPlugin {
    constructor(opts = {}) {
        super(opts);
    }

    get name() {
        return 'evasions/navigator.batteryManager';
    }

    async onPageCreated(page) {
        await withUtils(this, page).evaluateOnNewDocument(this.mainFunction, this.opts.fakeDD.battery);
    }

    onServiceWorkerContent(jsContent) {
        return withWorkerUtils(this, jsContent).evaluate(this.mainFunction, this.opts.fakeDD.battery);
    }

    mainFunction = (utils, fakeBattery) => {
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

module.exports = function (pluginConfig) {
    return new Plugin(pluginConfig);
};
