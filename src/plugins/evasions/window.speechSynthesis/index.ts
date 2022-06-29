import { DeviceDescriptorVoices, FakeDeviceDescriptor } from 'core/DeviceDescriptor';
import { PuppeteerExtraPlugin, PuppeteerPage } from 'puppeteer-extra-plugin';
import Utils from '../_utils/'
import withUtils from '../_utils/withUtils';

export interface PluginOptions {
    fakeDD: FakeDeviceDescriptor;
}

export class Plugin extends PuppeteerExtraPlugin<PluginOptions> {
    constructor(opts?: Partial<PluginOptions>) {
        super(opts);
    }

    get name(): 'evasions/window.speechSynthesis' {
        return 'evasions/window.speechSynthesis';
    }

    async onPageCreated(page: PuppeteerPage) {
        await withUtils(this, page).evaluateOnNewDocument(this.mainFunction, this.opts.fakeDD.voices);
    }

    mainFunction = (utils: typeof Utils, fakeVoices: Array<DeviceDescriptorVoices>) => {
        const _Object = utils.cache.Object;
        const _Reflect = utils.cache.Reflect;

        if (window.speechSynthesis) {
            // SpeechSynthesisVoice
            // I tried everything but couldn't find the system's SpeechSynthesisVoice class, so I had to build it myself.
            // Does any expert know how to find this class?
            // We can replace it with Object.create to construct the object.

            class SpeechSynthesisVoice extends Object {
            }

            _Object.defineProperty(SpeechSynthesisVoice.prototype, Symbol.toStringTag, {
                configurable: true,
                enumerable: false,
                writable: false,
                value: 'SpeechSynthesisVoice',
            });

            // window.speechSynthesis.getVoices()[0].__proto__.constructor returns 'Object'
            _Object.defineProperty(SpeechSynthesisVoice.prototype, 'constructor', {
                value: Object,
            });

            // hook
            const props = ['default', 'lang', 'localService', 'name', 'voiceURI'];
            const voiceObjs: SpeechSynthesisVoice[] = [];

            // With the configuration, construct voices object and then we hook the properties with Proxy
            for (const _voice of fakeVoices) {
                const voiceObj = new SpeechSynthesisVoice();
                voiceObjs.push(voiceObj);
                _Object.setPrototypeOf(voiceObj, new Proxy(
                        SpeechSynthesisVoice.prototype,
                        {
                            ownKeys(target) {
                                // 'constructor' not in the prototype of SpeechSynthesisVoice
                                return _Reflect.ownKeys(target).filter(
                                    e => e !== 'constructor',
                                );
                            },
                            get: (target, property, receiver) => {
                                if (property === '__proto__') {
                                    return _Object.getPrototypeOf(voiceObj);
                                }
                                return _Reflect.get(target, property, receiver);
                            },
                        },
                    ),
                );
                utils.patchToString(voiceObj.constructor, 'function Object() { [native code] }');
            }

            for (const prop of props) {
                utils.mockGetterWithProxy(SpeechSynthesisVoice.prototype, prop, _Object.create, {
                        configurable: true,
                        enumerable: true,
                    },
                    {
                        apply: (target, thisArg, args) => {
                            if (voiceObjs.map(e => _Object.getPrototypeOf(e)).includes(thisArg)) {
                                // window.speechSynthesis.getVoices()[0].__proto__.default
                                // throw TypeError
                                if (props.includes(prop)) {
                                    throw utils.patchError(new TypeError('Illegal invocation'), prop);
                                } else {
                                    return undefined;
                                }
                            }
                            return (fakeVoices as any)[voiceObjs.indexOf(thisArg)][prop];
                        },
                    },
                );
            }
            // https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/onvoiceschanged
            // In chrome, getVoices can only get values after onvoiceschanged is fired, otherwise you get an empty array
            let voicesWarnup = false;
            let onvoiceschangedHandler: null | Function = null;
            utils.replaceWithProxy(_Object.getPrototypeOf(window.speechSynthesis), 'getVoices', {
                    apply(target: any, thisArg, args) {
                        _Reflect.apply(target, thisArg, args);

                        if (!voicesWarnup) {
                            return [];
                        }

                        return voiceObjs;
                    },
                },
            );
            utils.replaceSetterWithProxy(_Object.getPrototypeOf(window.speechSynthesis), 'onvoiceschanged', {
                    apply(target: any, thisArg: any, args: any[]) {
                        _Reflect.apply(target, thisArg, args);

                        if (args && args[0] instanceof Function) {
                            onvoiceschangedHandler = args[0];

                            if (voicesWarnup) {
                                onvoiceschangedHandler!();
                            }
                        }
                    },
                },
            );
            // Simulating delays and triggering events
            setTimeout(function () {
                voicesWarnup = true;
                // TODO: After testing, the callback order of voiceschanged and onvoiceschanged is the same as the order in which they are called.
                const event = new Event('voiceschanged');
                window.speechSynthesis.dispatchEvent(event);
                if (onvoiceschangedHandler) {
                    onvoiceschangedHandler();
                }
            }, utils.random(20, 40));
        }
    };
}

export default (pluginConfig?: Partial<PluginOptions>) => new Plugin(pluginConfig)
