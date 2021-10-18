'use strict';

const {PuppeteerExtraPlugin} = require('puppeteer-extra-plugin');

const withUtils = require('../_utils/withUtils');
const withWorkerUtils = require('../_utils/withWorkerUtils');

class Plugin extends PuppeteerExtraPlugin {
    constructor(opts = {}) {
        super(opts);
    }

    get name() {
        return 'window.speechSynthesis';
    }

    async onPageCreated(page) {
        await withUtils(page).evaluateOnNewDocument(this.mainFunction, this.opts);
    }

    mainFunction = (utils, opts) => {
        const _Object = utils.cache.Prototype.Object;

        if (window.speechSynthesis) {
            // FIXME: SpeechSynthesisVoice
            // I tried everything but couldn't find the system's SpeechSynthesisVoice class, so I had to build it myself.
            // Does any expert know how to find this class?
            // We can replace it with Object.create to construct the object.

            class SpeechSynthesisVoice extends Object {
                get [Symbol.toStringTag]() {
                    return 'SpeechSynthesisVoice';
                }
            }

            // window.speechSynthesis.getVoices()[0].__proto__.constructor returns 'Object'
            _Object.defineProperty(SpeechSynthesisVoice.prototype, 'constructor', {
                value: Object,
            });

            // hook
            const props = ['default', 'lang', 'localService', 'name', 'voiceURI'];
            const voiceObjs = [];

            // With the configuration, construct voices object and then we hook the properties with Proxy
            for (const voice of opts.voices) {
                const voiceObj = new SpeechSynthesisVoice();
                voiceObjs.push(voiceObj);

                // window.speechSynthesis.getVoices()[0].constructor returns 'Object'
                _Object.defineProperty(voiceObj, 'constructor', {
                    value: Object,
                });

                _Object.setPrototypeOf(
                    voiceObj,
                    new Proxy(
                        SpeechSynthesisVoice.prototype,
                        {
                            ownKeys(target) {
                                // 'constructor' not in the prototype of SpeechSynthesisVoice
                                return Reflect.ownKeys(target).filter(
                                    e => e !== 'constructor',
                                );
                            },
                            get: (target, property, receiver) => {
                                //
                                if (property === '__proto__') {
                                    return _Object.getPrototypeOf(voiceObj);
                                }

                                return utils.cache.Reflect.get(target, property, receiver);
                            },
                        },
                    ),
                );

                utils.patchToString(voiceObj.constructor, 'function Object() { [native code] }');
            }

            for (const prop of props) {
                utils.mockGetterWithProxy(
                    SpeechSynthesisVoice.prototype,
                    prop,
                    _Object.create,
                    {
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

                            return opts.voices[voiceObjs.indexOf(thisArg)][prop];
                        },
                    },
                );
            }

            utils.replaceWithProxy(
                _Object.getPrototypeOf(window.speechSynthesis),
                'getVoices',
                {
                    apply(target, thisArg, args) {
                        return voiceObjs;
                    },
                },
            );
        }
    };

}

module.exports = function (pluginConfig) {
    return new Plugin(pluginConfig);
};
