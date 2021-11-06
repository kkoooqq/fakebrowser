'use strict';

const {PuppeteerExtraPlugin} = require('puppeteer-extra-plugin');

const withUtils = require('../_utils/withUtils');
const withWorkerUtils = require('../_utils/withWorkerUtils');

/**
 * Fix `Notification.permission` behaving weirdly in headless mode
 *
 * @see https://bugs.chromium.org/p/chromium/issues/detail?id=1052332
 */

class Plugin extends PuppeteerExtraPlugin {
    constructor(opts = {}) {
        super(opts);
    }

    get name() {
        return 'evasions/navigator.permissions';
    }

    /* global Notification Permissions PermissionStatus */
    async onPageCreated(page) {
        await withUtils(page).evaluateOnNewDocument(this.mainFunction, this.opts);

        let permissions = {
            accelerometer: 'granted',
            'background-fetch': 'granted',
            'background-sync': 'granted',
            gyroscope: 'granted',
            magnetometer: 'granted',
            midi: 'granted',
            'screen-wake-lock': 'granted',

            camera: 'prompt',
            'display-capture': 'prompt',
            geolocation: 'prompt',
            microphone: 'prompt',
            notifications: 'prompt',
            'persistent-storage': 'prompt',
        };

        for (let permission in permissions) {
            await page._client.send('Browser.setPermission', {
                permission: {name: permission},
                setting: permissions[permission],
            });
        }
    }

    onServiceWorkerContent(jsContent) {
        return withWorkerUtils(jsContent).evaluate(this.mainFunction, this.opts);
    }

    mainFunction = (utils) => {
        if ('undefined' !== typeof Notification) {
            utils.replaceGetterWithProxy(Notification, 'permission', {
                apply() {
                    return 'default';
                },
            });
        }
    };
}

module.exports = function (pluginConfig) {
    return new Plugin(pluginConfig);
};
