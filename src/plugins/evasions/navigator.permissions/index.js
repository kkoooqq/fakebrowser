'use strict';

const {PuppeteerExtraPlugin} = require('puppeteer-extra-plugin');

const withUtils = require('../_utils/withUtils');
const withWorkerUtils = require('../_utils/withWorkerUtils');

/**
 * Fix `Notification.permission` behaving weirdly in headless mode
 *
 * @see https://bugs.chromium.org/p/chromium/issues/detail?id=1052332
 */

// https://source.chromium.org/chromium/chromium/src/+/master:third_party/blink/renderer/modules/permissions/permission_descriptor.idl

class Plugin extends PuppeteerExtraPlugin {
    constructor(opts = {}) {
        super(opts);
    }

    get name() {
        return 'evasions/navigator.permissions';
    }

    /* global Notification Permissions PermissionStatus */
    async onPageCreated(page) {
        // "permissions": Record<string, {
        //     "state"?: string,
        //     "exType"?: string,
        //     "msg"?: string,
        // }>

        await withUtils(this, page).evaluateOnNewDocument(
            this.mainFunction,
            {
                fakePermissions: this.opts.fakeDD.permissions,
                fakeUA: this.opts.fakeDD.navigator.userAgent,
            },
        );

        // // invoke CDP setPermission
        // const permissions = this.opts.permissions;
        // for (const name in permissions) {
        //     const permission = permissions[name];
        //     if (permission.state) {
        //         try {
        //             await page['_client'].send('Browser.setPermission', {
        //                 permission: {name},
        //                 setting: permission.state,
        //             });
        //         } catch (ignore) {
        //         }
        //     }
        // }
    }

    onServiceWorkerContent(jsContent) {
        return withWorkerUtils(this, jsContent).evaluate(
            this.mainFunction,
            {
                fakePermissions: this.opts.fakeDD.permissions,
                fakeUA: this.opts.fakeDD.navigator.userAgent,
            },
        );
    }

    mainFunction = (utils, {fakePermissions, fakeUA}) => {
        const _Object = utils.cache.Object;
        const _Reflect = utils.cache.Reflect;

        // after test, iOS chrome did not implements `navigator.permissions`
        const osType = utils.osType(fakeUA)
        if (osType === 'iPhone' || osType === 'iPad' || osType === 'iPod') {
            delete _Object.getPrototypeOf(navigator).permission;
        } else {
            if ('undefined' !== typeof Notification) {
                utils.replaceGetterWithProxy(Notification, 'permission', {
                    apply(target, thisArg, args) {
                        _Reflect.apply(target, thisArg, args);
                        return 'default';
                    },
                });
            }

            // We need to handle exceptions
            utils.replaceWithProxy(Permissions.prototype, 'query', {
                apply(target, thisArg, args) {
                    const param = (args || [])[0];
                    const paramName = param && param.name;

                    return new utils.cache.Promise((resolve, reject) => {
                        const permission = fakePermissions[paramName];

                        if (permission) {
                            let exType = permission.exType;
                            if (exType) {
                                if (!globalThis[exType]) {
                                    exType = 'Error';
                                }

                                return reject(
                                    utils.patchError(new globalThis[exType](permission.msg), 'apply'),
                                );
                            }

                            let state = permission.state;
                            if (state) {
                                return resolve(_Object.setPrototypeOf({
                                    state: state,
                                    onchange: null,
                                }, PermissionStatus.prototype));
                            }
                        }

                        _Reflect.apply(...arguments).then(result => {
                            return resolve(result);
                        }).catch(ex => {
                            return reject(utils.patchError(ex, 'apply'));
                        });
                    });
                },
            });
        }
    };
}

module.exports = function (pluginConfig) {
    return new Plugin(pluginConfig);
};
