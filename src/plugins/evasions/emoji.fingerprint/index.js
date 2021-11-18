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
        await withUtils(this, page).evaluateOnNewDocument(this.mainFunction);
    }

    onServiceWorkerContent(jsContent) {
        return withWorkerUtils(this, jsContent).evaluate(
            this.mainFunction,
        );
    }

    mainFunction = (utils) => {
        const _Reflect = utils.cache.Reflect;

        utils.replaceWithProxy(String, 'fromCodePoint', {
            apply(target, thisArg, args) {
                const result = _Reflect.apply(target, thisArg, args);
                return result;
            },
        });
    };

}

module.exports = function (pluginConfig) {
    return new Plugin(pluginConfig);
};
