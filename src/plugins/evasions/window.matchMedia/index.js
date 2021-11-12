'use strict';

const {PuppeteerExtraPlugin} = require('puppeteer-extra-plugin');

const withUtils = require('../_utils/withUtils');

class Plugin extends PuppeteerExtraPlugin {
    constructor(opts = {}) {
        super(opts);
    }

    get name() {
        return 'evasions/window.matchMedia';
    }

    async onPageCreated(page) {
        await withUtils(this, page).evaluateOnNewDocument((utils) => {
            const _Object = utils.cache.Object;
            const _Reflect = utils.cache.Reflect;

            utils.replaceWithProxy(window, 'matchMedia', {
                apply(target, thisArg, args) {
                    // console.log(`hook window matchMedia ${args.join('|')}`);
                    return _Reflect.apply(target, thisArg, args);
                },
            });
        });
    }
}

module.exports = function (pluginConfig) {
    return new Plugin(pluginConfig);
};
