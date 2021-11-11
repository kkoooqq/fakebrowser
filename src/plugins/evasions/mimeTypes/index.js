'use strict';

const {PuppeteerExtraPlugin} = require('puppeteer-extra-plugin');

const withUtils = require('../_utils/withUtils');
const withWorkerUtils = require('../_utils/withWorkerUtils');

class Plugin extends PuppeteerExtraPlugin {
    constructor(opts = {}) {
        super(opts);
    }

    get name() {
        return 'evasions/mimeTypes';
    }

    async onPageCreated(page) {
        await withUtils(this, page).evaluateOnNewDocument(this.mainFunction, this.opts);
    }

    mainFunction = (utils, opts) => {
        const _Reflect = utils.cache.Reflect;

        utils.replaceWithProxy(
            HTMLMediaElement.prototype,
            'canPlayType',
            {
                apply: function (target, thisArg, args) {
                    if (!args || !args.length) {
                        return _Reflect.apply(target, thisArg, args);
                    }

                    const type = args[0];
                    let trimmedType = type.trim();
                    if (trimmedType.endsWith(trimmedType)) {
                        trimmedType = trimmedType.substr(0, trimmedType.length - 1);
                    }

                    // akamai uses Object.create(HTMLMediaElement.prototype) to create the abstract Object and test the types
                    // check this ObjectType and the type if matched or not
                    if (!trimmedType
                        || thisArg.constructor.name === 'HTMLMediaElement' // Object.create(HTMLMediaElement.prototype) sht
                        || thisArg.constructor.name === 'HTMLVideoElement' && !trimmedType.startsWith('video')
                        || thisArg.constructor.name === 'HTMLAudioElement' && !trimmedType.startsWith('audio')
                    ) {
                        return _Reflect.apply(target, thisArg, args);
                    }

                    const mimeType = opts.data.find(e => e.mimeType === trimmedType);
                    if (mimeType) {
                        if (thisArg instanceof HTMLVideoElement) {
                            return mimeType.videoPlayType;
                        } else if (thisArg instanceof HTMLAudioElement) {
                            return mimeType.audioPlayType;
                        }
                    } else {
                        return _Reflect.apply(target, thisArg, args);
                    }
                },
            },
        );

        utils.replaceWithProxy(
            MediaSource,
            'isTypeSupported',
            {
                apply: function (target, thisArg, args) {
                    if (!args || !args.length) {
                        return _Reflect.apply(target, thisArg, args);
                    }

                    const type = args[0];
                    let trimmedType = type.trim();
                    if (trimmedType.endsWith(trimmedType)) {
                        trimmedType = trimmedType.substr(0, trimmedType.length - 1);
                    }

                    const mimeType = opts.data.find(e => e.mimeType === trimmedType);
                    if (mimeType) {
                        return mimeType.mediaSource;
                    } else {
                        return _Reflect.apply(target, thisArg, args);
                    }
                },
            },
        );

        if ('undefined' !== typeof MediaRecorder) {
            utils.replaceWithProxy(
                MediaRecorder,
                'isTypeSupported',
                {
                    apply: function (target, thisArg, args) {
                        if (!args || !args.length) {
                            return _Reflect.apply(target, thisArg, args);
                        }

                        const type = args[0];
                        let trimmedType = type.trim();
                        if (trimmedType.endsWith(trimmedType)) {
                            trimmedType = trimmedType.substr(0, trimmedType.length - 1);
                        }

                        const mimeType = opts.data.find(e => e.mimeType === trimmedType);
                        if (mimeType) {
                            return mimeType.mediaRecorder;
                        } else {
                            return _Reflect.apply(target, thisArg, args);
                        }
                    },
                },
            );
        }
    };

}

module.exports = function (pluginConfig) {
    return new Plugin(pluginConfig);
};
