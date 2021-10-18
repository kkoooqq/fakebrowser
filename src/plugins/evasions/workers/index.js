'use strict';

const {PuppeteerExtraPlugin} = require('puppeteer-extra-plugin');

const withUtils = require('../_utils/withUtils');

class Plugin extends PuppeteerExtraPlugin {
    constructor(opts = {}) {
        super(opts);
    }

    get name() {
        return 'evasions/workers';
    }

    async onPageCreated(page) {
        await withUtils(page).evaluateOnNewDocument(
            (utils, env) => {
                if ('undefined' !== typeof Worker) {
                    const _Worker = Worker;
                    const desc = Object.getOwnPropertyDescriptor(
                        _Worker.prototype, 'constructor',
                    );

                    utils.replaceWithProxy('undefined' === typeof window ? globalThis : window, 'Worker', {
                        construct: function (target, args) {
                            // const obj = Object.create(_Worker.prototype);

                            console.log(`worker is registered in the browser, ${args[0]}`);
                            const scriptUrl = utils.getCurrentScriptPath();
                            const workerUrl = args[0];

                            args[0] = `http://127.0.0.1:7311/api/patchWorkerJsContent?uuid=${env.uuid}&scriptUrl=${encodeURIComponent(scriptUrl)}&workerUrl=${encodeURIComponent(workerUrl)}`;

                            return new desc.value(...args);
                        },
                    });
                }
            }, this.opts.env,
        );
    }
}

module.exports = function (pluginConfig) {
    return new Plugin(pluginConfig);
};
