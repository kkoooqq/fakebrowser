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
    }

    onServiceWorkerContent(jsContent) {
        return withWorkerUtils(jsContent).evaluate(this.mainFunction, this.opts);
    }

    mainFunction = (utils) => {
        const _Object = utils.cache.Prototype.Object;

        const isSecure = 'undefined' == typeof window ? true : window.top.document.location.protocol.startsWith('https');

        // In headful on secure origins the permission should be "default", not "denied"
        if (isSecure) {
            if ('undefined' !== typeof Notification) {
                utils.replaceGetterWithProxy(Notification, 'permission', {
                    apply() {
                        return 'default';
                    },
                });
            }

            // midi -> granted
            // background-fetch -> granted
            // background-sync -> granted
            // accelerometer -> granted
            // gyroscope -> granted
            // magnetometer -> granted
            // screen-wake-lock -> granted
            // display-capture -> new Error('TypeError: Failed to execute 'query' on 'Permissions': Display Capture is not enabled.')
            // clipboard-write -> granted
            // payment-handler -> granted
            // periodic-background-sync -> granted
            // storage-access -> new Error('TypeError: Failed to execute 'query' on 'Permissions': The Storage Access API is not enabled.')

            const handler = {
                apply(target, ctx, args) {
                    const param = (args || [])[0];
                    const paramName = param && param.name;

                    console.log('!!! h00k permission:' + paramName);

                    return new Promise((resolve, reject) => {
                        switch (paramName) {
                            case 'storage-access':
                                return reject(utils.patchError(new TypeError(`Failed to execute 'query' on 'Permissions': The Storage Access API is not enabled.`), 'query'));

                            case 'push':
                                return reject(utils.patchError(new /*NotSupported*/Error(`Failed to execute 'query' on 'Permissions': Push Permission without userVisibleOnly:true isn't supported yet.`), 'query'));

                            case 'speaker':
                                return reject(utils.patchError(new TypeError(`Failed to execute 'query' on 'Permissions': Failed to read the 'name' property from 'PermissionDescriptor': The provided value 'speaker' is not a valid enum value of type PermissionName.`), 'query'));

                            case 'device-info':
                                return reject(utils.patchError(new TypeError(`Failed to execute 'query' on 'Permissions': Failed to read the 'name' property from 'PermissionDescriptor': The provided value 'device-info' is not a valid enum value of type PermissionName.`), 'query'));

                            case 'bluetooth':
                                return reject(utils.patchError(new TypeError(`Failed to execute 'query' on 'Permissions': Failed to read the 'name' property from 'PermissionDescriptor': The provided value 'bluetooth' is not a valid enum value of type PermissionName.`), 'query'));

                            case 'clipboard':
                                return reject(utils.patchError(new TypeError(`Failed to execute 'query' on 'Permissions': Failed to read the 'name' property from 'PermissionDescriptor': The provided value 'clipboard' is not a valid enum value of type PermissionName.`), 'query'));

                            case 'midi':
                                return resolve(_Object.setPrototypeOf({
                                    state: 'granted',
                                    onchange: null,
                                }, PermissionStatus.prototype));

                            case 'background-fetch':
                                return resolve(_Object.setPrototypeOf({
                                    state: 'granted',
                                    onchange: null,
                                }, PermissionStatus.prototype));

                            case 'accelerometer':
                                return resolve(_Object.setPrototypeOf({
                                    state: 'granted',
                                    onchange: null,
                                }, PermissionStatus.prototype));

                            case 'gyroscope':
                                return resolve(_Object.setPrototypeOf({
                                    state: 'granted',
                                    onchange: null,
                                }, PermissionStatus.prototype));

                            case 'magnetometer':
                                return resolve(_Object.setPrototypeOf({
                                    state: 'granted',
                                    onchange: null,
                                }, PermissionStatus.prototype));

                            case 'screen-wake-lock':
                                return resolve(_Object.setPrototypeOf({
                                    state: 'granted',
                                    onchange: null,
                                }, PermissionStatus.prototype));

                            case 'clipboard-write':
                                return resolve(_Object.setPrototypeOf({
                                    state: 'granted',
                                    onchange: null,
                                }, PermissionStatus.prototype));

                            case 'payment-handler':
                                return resolve(_Object.setPrototypeOf({
                                    state: 'granted',
                                    onchange: null,
                                }, PermissionStatus.prototype));

                            case 'periodic-background-sync':
                                return resolve(_Object.setPrototypeOf({
                                    state: 'granted',
                                    onchange: null,
                                }, PermissionStatus.prototype));

                            case 'geolocation':
                                return resolve(_Object.setPrototypeOf({
                                    state: 'prompt',
                                    onchange: null,
                                }, PermissionStatus.prototype));

                            case 'notifications':
                                return resolve(_Object.setPrototypeOf({
                                    state: 'prompt',
                                    onchange: null,
                                }, PermissionStatus.prototype));

                            case 'camera':
                                return resolve(_Object.setPrototypeOf({
                                    state: 'prompt',
                                    onchange: null,
                                }, PermissionStatus.prototype));

                            case 'microphone':
                                return resolve(_Object.setPrototypeOf({
                                    state: 'prompt',
                                    onchange: null,
                                }, PermissionStatus.prototype));

                            case 'display-capture':
                                // return reject(utils.patchError(new TypeError(`Failed to execute 'query' on 'Permissions': Display Capture is not enabled.`), 'query'));
                                return resolve(_Object.setPrototypeOf({
                                    state: 'prompt',
                                    onchange: null,
                                }, PermissionStatus.prototype));

                            case 'background-sync':
                                return resolve(_Object.setPrototypeOf({
                                    state: 'granted',
                                    onchange: null,
                                }, PermissionStatus.prototype));

                            case 'persistent-storage':
                                return resolve(_Object.setPrototypeOf({
                                    state: 'prompt',
                                    onchange: null,
                                }, PermissionStatus.prototype));

                            case 'ambient-light-sensor':
                                return resolve(_Object.setPrototypeOf({
                                    state: 'granted',
                                    onchange: null,
                                }, PermissionStatus.prototype));

                            case 'accessibility-events':
                                return resolve(_Object.setPrototypeOf({
                                    state: 'prompt',
                                    onchange: null,
                                }, PermissionStatus.prototype));

                            case 'clipboard-read':
                                return resolve(_Object.setPrototypeOf({
                                    state: 'prompt',
                                    onchange: null,
                                }, PermissionStatus.prototype));

                            default:
                                utils.cache.Reflect.apply(...arguments).then(result => {
                                    console.log('!!! h00k permission:' + paramName + ' result state:' + result.state);
                                    return resolve(result);
                                }).catch(ex => {
                                    console.warn('!!! h00k permission:' + paramName + ' error:' + ex.toString());
                                    return reject(utils.patchError(ex, 'query'));
                                });
                        }
                    });
                },
            };

            utils.replaceWithProxy(Permissions.prototype, 'query', handler);
        }

        // Another weird behavior:
        // On insecure origins in headful the state is "denied",
        // whereas in headless it's "prompt"
        if (!isSecure) {
            const handler = {
                apply(target, ctx, args) {
                    const param = (args || [])[0];

                    const isNotifications =
                        param && param.name && param.name === 'notifications';
                    if (!isNotifications) {
                        return utils.cache.Reflect.apply(...arguments);
                    }

                    return Promise.resolve(
                        _Object.getOwnPropertyDescriptors({
                                state: 'denied',
                                onchange: null,
                            },
                            PermissionStatus.prototype,
                        ),
                    );
                },
            };
            // Note: Don't use `Object.getPrototypeOf` here
            utils.replaceWithProxy(Permissions.prototype, 'query', handler);
        }
    };

}

module.exports = function (pluginConfig) {
    return new Plugin(pluginConfig);
};
