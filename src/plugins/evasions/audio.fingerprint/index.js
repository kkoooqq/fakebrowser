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
        return 'evasions/audio.fingerprint';
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
    };

}

module.exports = function (pluginConfig) {
    return new Plugin(pluginConfig);
};
