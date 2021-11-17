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
        return 'evasions/keyboard';
    }

    async onPageCreated(page) {
        await withUtils(this, page).evaluateOnNewDocument(
            this.mainFunction,
            this.opts,
        );
    }

    onServiceWorkerContent(jsContent) {
        return withWorkerUtils(this, jsContent).evaluate(
            this.mainFunction,
            this.opts,
        );
    }

    mainFunction = (utils, opts) => {
        const _Reflect = utils.cache.Reflect;

        if (
            opts.keyboard
            && 'undefined' !== typeof KeyboardLayoutMap
        ) {
            utils.replaceWithProxy(KeyboardLayoutMap.prototype, 'get', {
                apply(target, thisArg, args) {
                    if (args && args.length) {
                        return opts.keyboard[args[0]];
                    }

                    return _Reflect.apply(target, thisArg, args);
                },
            });
        }
    };

}

module.exports = function (pluginConfig) {
    return new Plugin(pluginConfig);
};
