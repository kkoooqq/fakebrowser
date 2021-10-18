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

            const voiceObjs = [];
            for (const voice of opts.voices) {
                const voiceObj = new SpeechSynthesisVoice();
                voiceObjs.push(voiceObj);

                Object.setPrototypeOf(voiceObj, new Proxy(SpeechSynthesisVoice.prototype, {
                    ownKeys(target) {
                        return Reflect.ownKeys(target).filter(e => e !== 'constructor');
                    },
                }));

                _Object.defineProperty(voiceObj.constructor, 'name', {
                    value: 'Object',
                });

                utils.patchToString(voiceObj.constructor, 'function Object() { [native code] }');
            }

            for (const prop of ['default', 'lang', 'localService', 'name', 'voiceURI']) {
                utils.mockGetterWithProxy(
                    SpeechSynthesisVoice.prototype,
                    prop,
                    utils.cache.Prototype.Object.create,
                    {
                        apply: (target, thisArg, args) => {
                            return opts.voices[voiceObjs.indexOf(thisArg)][prop];
                        },
                    },
                );
            }

            utils.replaceWithProxy(_Object.getPrototypeOf(window.speechSynthesis), 'getVoices', {
                apply(target, thisArg, args) {
                    return voiceObjs;
                },
            });
        }
    };

}

module.exports = function (pluginConfig) {
    return new Plugin(pluginConfig);
};
