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
        utils.replaceWithProxy(
            HTMLMediaElement.prototype,
            'canPlayType',
            {
                apply: function (target, thisArg, args) {
                    if (!args || !args.length) {
                        return target.apply(thisArg, args);
                    }

                    const type = args[0];
                    const mimeType = opts.data.find(e => e.mimeType === type);
                    if (mimeType) {
                        if (thisArg instanceof HTMLVideoElement) {
                            return mimeType.videoPlayType;
                        } else if (thisArg instanceof HTMLAudioElement) {
                            return mimeType.audioPlayType;
                        }
                    } else {
                        return '';
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
                        return target.apply(thisArg, args);
                    }

                    const type = args[0];
                    const mimeType = opts.data.find(e => e.mimeType === type);
                    if (mimeType) {
                        return mimeType.mediaSource;
                    } else {
                        return false;
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
                            return target.apply(thisArg, args);
                        }

                        const type = args[0];
                        const mimeType = opts.data.find(e => e.mimeType === type);
                        if (mimeType) {
                            return mimeType.mediaRecorder;
                        } else {
                            return false;
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
