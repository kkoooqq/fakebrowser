'use strict';

const {PuppeteerExtraPlugin} = require('puppeteer-extra-plugin');
const withUtils = require('../_utils/withUtils');

class Plugin extends PuppeteerExtraPlugin {
    constructor(opts = {}) {
        super(opts);
    }

    get name() {
        return 'evasions/window.history.length';
    }

    async onPageCreated(page) {
        await withUtils(page).evaluateOnNewDocument(
            (utils, {historyLength}) => {
                for (let n = 0; n < historyLength; ++n) {
                    if (window.history.length >= historyLength) {
                        break;
                    }

                    window.history.pushState(null, '');
                }
            },
            {
                historyLength: this.opts.historyLength,
            },
        );
    }
}

module.exports = function (pluginConfig) {
    return new Plugin(pluginConfig);
};