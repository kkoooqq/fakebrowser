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
        await withUtils(page).evaluateOnNewDocument(this.mainFunction, this.opts.battery);
    }

    onServiceWorkerContent(jsContent) {
        return withWorkerUtils(jsContent).evaluate(this.mainFunction, this.opts.battery);
    }

    mainFunction = (utils, battery) => {
        // TODO: If it is a charging state, the user's power should keep increasing to a certain time full.
        // It also needs to simulate the situation that the user has unplugged the power.
        if ('undefined' != typeof BatteryManager) {
            utils.replaceGetterWithProxy(
                BatteryManager.prototype,
                'charging',
                utils.makeHandler().getterValue(battery.charging),
            );

            utils.replaceGetterWithProxy(
                BatteryManager.prototype,
                'chargingTime',
                utils.makeHandler().getterValue(!battery.chargingTime ? Infinity : battery.chargingTime),
            );

            utils.replaceGetterWithProxy(
                BatteryManager.prototype,
                'dischargingTime',
                utils.makeHandler().getterValue(!battery.dischargingTime ? Infinity : battery.dischargingTime),
            );

            utils.replaceGetterWithProxy(
                BatteryManager.prototype,
                'level',
                utils.makeHandler().getterValue(battery.level),
            );
        }
    };
}

module.exports = function (pluginConfig) {
    return new Plugin(pluginConfig);
};
