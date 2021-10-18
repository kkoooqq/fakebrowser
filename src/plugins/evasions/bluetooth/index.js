// noinspection JSUnusedLocalSymbols

'use strict';

const {PuppeteerExtraPlugin} = require('puppeteer-extra-plugin');
const withUtils = require('../_utils/withUtils');
const withWorkerUtils = require('../_utils/withWorkerUtils');

// bluetooth can only be supported in linux by turning on the switch "--enable-experimental-web-platform-features"
// However, when the experimental turns on, the properties of window, document, navigator will be polluted by new parameters
// so the version number of the browser does not correspond to it.
// We need to implement bluetooth class manually:
//
// "Bluetooth"
// "BluetoothCharacteristicProperties"
// "BluetoothDevice"
// "BluetoothRemoteGATTCharacteristic"
// "BluetoothRemoteGATTDescriptor"
// "BluetoothRemoteGATTServer"
// "BluetoothRemoteGATTService"
// "BluetoothUUID"

class Plugin extends PuppeteerExtraPlugin {
    constructor(opts = {}) {
        super(opts);
    }

    get name() {
        return 'evasions/bluetooth';
    }

    async onPageCreated(page) {
        await withUtils(page).evaluateOnNewDocument(
            this.mainFunction,
            this.opts,
        );
    }

    onServiceWorkerContent(jsContent) {
        return withWorkerUtils(jsContent).evaluate(
            this.mainFunction,
            this.opts,
        );
    }

    mainFunction = (utils, opts) => {
    };

}

module.exports = function (pluginConfig) {
    return new Plugin(pluginConfig);
};
