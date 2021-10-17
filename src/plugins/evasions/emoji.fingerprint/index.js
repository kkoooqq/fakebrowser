// noinspection JSUnusedLocalSymbols

'use strict';

const {PuppeteerExtraPlugin} = require('puppeteer-extra-plugin');
const withUtils = require('../_utils/withUtils');
const withWorkerUtils = require('../_utils/withWorkerUtils');

class Plugin extends PuppeteerExtraPlugin {
    constructor(opts = {}) {
        super(opts);
    }

    get name() {
        return 'evasions/emoji.fingerprint';
    }

    // noinspection JSUnusedGlobalSymbols
    get requirements() {
        return new Set(['runLast']);
    }

    async onPageCreated(page) {
        await withUtils(page).evaluateOnNewDocument(
            this.mainFunction,
            this.opts,
        );
    }

    onServiceWorkerContent(jsContent) {
        return withWorkerUtils(jsContent).evaluate(
            this.mainFunction,
            this.opts,
        );
    }

    mainFunction = (utils, opts) => {
        utils.replaceWithProxy(String, 'fromCodePoint', {
            apply(target, thisArg, args) {
                const result = utils.cache.Reflect.apply(target, thisArg, args);
                return result;
            },
        });
    };

}

module.exports = function (pluginConfig) {
    return new Plugin(pluginConfig);
};
