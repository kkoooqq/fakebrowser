'use strict';

const {PuppeteerExtraPlugin} = require('puppeteer-extra-plugin');

const withUtils = require('../_utils/withUtils');
const withWorkerUtils = require('../_utils/withWorkerUtils');

/**
 * Fix Chromium not reporting "probably" to codecs like `videoEl.canPlayType('video/mp4; codecs="avc1.42E01E"')`.
 * (Chromium doesn't support proprietary codecs, only Chrome does)
 */
class Plugin extends PuppeteerExtraPlugin {
    constructor(opts = {}) {
        super(opts);
    }

    get name() {
        return 'evasions/media.codecs';
    }

    async onPageCreated(page) {
        await withUtils(page).evaluateOnNewDocument(this.mainFunction, this.opts);
    }

    mainFunction = (utils, opts) => {
        const canPlayType = {
            // Intercept certain requests
            apply: function (target, ctx, args) {
                if (!args || !args.length) {
                    return target.apply(ctx, args);
                }

                const type = args[0];
                const mediaCanPlayType = opts.data.find(e => e.mediaType === type);
                if (mediaCanPlayType) {
                    return mediaCanPlayType.r;
                }

                // Everything else as usual
                return target.apply(ctx, args);
            },
        };

        /* global HTMLMediaElement */
        utils.replaceWithProxy(
            HTMLMediaElement.prototype,
            'canPlayType',
            canPlayType,
        );
    };

}

module.exports = function (pluginConfig) {
    return new Plugin(pluginConfig);
};
