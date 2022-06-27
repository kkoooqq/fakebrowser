import { DeviceDescriptorMediaDevices, FakeDeviceDescriptor } from 'DeviceDescriptor';
import { PuppeteerExtraPlugin, PuppeteerPage } from 'puppeteer-extra-plugin';
import Utils from '../_utils/'
import withUtils from '../_utils/withUtils';
import withWorkerUtils from '../_utils/withWorkerUtils';

export interface PluginOptions {
    fakeDD: FakeDeviceDescriptor;
}

export class Plugin extends PuppeteerExtraPlugin<PluginOptions> {
    constructor(opts?: Partial<PluginOptions>) {
        super(opts);
    }

    get name(): 'evasions/navigator.mediaDevices' {
        return 'evasions/navigator.mediaDevices';
    }

    async onPageCreated(page: PuppeteerPage) {
        await withUtils(this, page).evaluateOnNewDocument(this.mainFunction, this.opts.fakeDD.mediaDevices);
    }

    onServiceWorkerContent(jsContent: any) {
        return withWorkerUtils(this, jsContent).evaluate(this.mainFunction, this.opts.fakeDD.mediaDevices);
    }
    /**
     * 
     * @param {Utils} utils 
     * @param {object[]} fakeMediaDevices 
     */
    mainFunction = (utils: typeof Utils, fakeMediaDevices: DeviceDescriptorMediaDevices[]) => {
        // debugger;
        // const _Object = utils.cache.Object;
        const _Reflect = utils.cache.Reflect;
        
        if ('undefined' !== typeof MediaDevices) {
            // The original value is changed only once at beginning
            const hex = '01234567890abcdef';
            const to = hex[Math.floor(Math.random() * hex.length)];
            const index = 4 + Math.floor(Math.random() * 32);

            const tempMediaDeviceObjs: Array<{p: any, v: DeviceDescriptorMediaDevices}> = [];
            for (let mediaDevice of fakeMediaDevices) {
                const json = JSON.stringify(mediaDevice);
                mediaDevice.groupId = mediaDevice.groupId.substr(0, index) + to + mediaDevice.groupId.substr(index + 1);

                const o = utils.cache.Object.create(
                    mediaDevice.kind.includes('output')
                        ? MediaDeviceInfo.prototype
                        : InputDeviceInfo.prototype, {
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
                    {},
                    {
                        apply(target, thisArg, args) {
                            return json;
                        },
                    });

                utils.replaceObjPathWithProxy('InputDeviceInfo.prototype.getCapabilities', {
                    apply(target, thisArg, args) {
                        _Reflect.apply(target, thisArg, args);
                        return {};
                    },
                });

                const p = utils.newProxyInstance(o, {
                    // ownKeys(target) {
                    //     return Reflect.ownKeys(target).filter(k => !blacklist.includes(k));
                    // },
                    getOwnPropertyDescriptor(target, prop) {
                        if (blacklist.includes(prop as string)) {
                            return undefined;
                        }

                        return _Reflect.getOwnPropertyDescriptor(target, prop);
                    },
                });

                tempMediaDeviceObjs.push({
                    p,
                    v: mediaDevice,
                });
            }

            utils.replaceWithProxy(MediaDevices.prototype, 'enumerateDevices', {
                apply(target: any, thisArg, args) {
                    try {
                        _Reflect.apply(target, thisArg, args).catch((e: Error) => e);
                    } catch (ignored) {
                    }

                    return Promise.resolve(tempMediaDeviceObjs.map(e => e.p));
                },
            });
        }
    };
}

export default (pluginConfig?: Partial<PluginOptions>) => new Plugin(pluginConfig)
