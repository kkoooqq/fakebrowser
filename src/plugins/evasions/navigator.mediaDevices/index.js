'use strict';

const {PuppeteerExtraPlugin} = require('puppeteer-extra-plugin');
const withUtils = require('../_utils/withUtils');
const withWorkerUtils = require('../_utils/withWorkerUtils');

class Plugin extends PuppeteerExtraPlugin {
    constructor(opts = {}) {
        super(opts);
    }

    get name() {
        return 'evasions/navigator.mediaDevices';
    }

    async onPageCreated(page) {
        await withUtils(page).evaluateOnNewDocument(
            this.mainFunction,
            {
                mediaDevices: this.opts.data,
            },
        );
    }

    onServiceWorkerContent(jsContent) {
        return withWorkerUtils(jsContent).evaluate(this.mainFunction,
            {
                mediaDevices: this.opts.data,
            });
    }

    mainFunction = (utils, {mediaDevices}) => {
        if ('undefined' !== typeof MediaDevices) {
            // The original value is changed only once at beginning
            const hex = '01234567890abcdef';
            const to = hex[Math.floor(Math.random() * hex.length)];
            const index = 4 + Math.floor(Math.random() * 32);

            const tempMediaDeviceObjs = [];
            for (let mediaDevice of mediaDevices) {
                const json = JSON.stringify(mediaDevice);
                mediaDevice.groupId = mediaDevice.groupId.substr(0, index) + to + mediaDevice.groupId.substr(index + 1);

                const o = utils.cache.Prototype.Object.create(mediaDevice.kind.includes('output') ? MediaDeviceInfo.prototype : InputDeviceInfo.prototype, {
                    deviceId: {
                        value: mediaDevice.deviceId,
                        writable: false,
                        enumerable: false,
                        configurable: true,
                    },
                    kind: {
                        value: mediaDevice.kind,
                        writable: false,
                        enumerable: false,
                        configurable: true,
                    },
                    label: {
                        value: mediaDevice.label,
                        writable: false,
                        enumerable: false,
                        configurable: true,
                    },
                    groupId: {
                        value: mediaDevice.groupId,
                        writable: false,
                        enumerable: false,
                        configurable: true,
                    },
                });

                const blacklist = ['deviceId', 'kind', 'label', 'groupId', 'toJSON'];
                utils.mockWithProxy(
                    o,
                    'toJSON',
                    window.alert,
                    {
                        apply(target, ctx, args) {
                            return json;
                        },
                    });

                utils.replaceObjPathWithProxy('InputDeviceInfo.prototype.getCapabilities', {
                    apply(target, ctx, args) {
                        return {};
                    },
                });

                const p = utils.newProxyInstance(o, {
                    // ownKeys(target) {
                    //     return Reflect.ownKeys(target).filter(k => !blacklist.includes(k));
                    // },
                    getOwnPropertyDescriptor(target, prop) {
                        if (blacklist.includes(prop)) {
                            return undefined;
                        }

                        return Reflect.getOwnPropertyDescriptor(target, prop);
                    },
                });

                tempMediaDeviceObjs.push({
                    p,
                    v: mediaDevice,
                });
            }

            utils.replaceWithProxy(MediaDevices.prototype, 'enumerateDevices', {
                apply(target, ctx, args) {
                    return Promise.resolve(tempMediaDeviceObjs.map(e => e.p));
                },
            });
        }
    };

}

module.exports = function (pluginConfig) {
    return new Plugin(pluginConfig);
};
