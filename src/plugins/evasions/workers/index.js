'use strict';

const {PuppeteerExtraPlugin} = require('puppeteer-extra-plugin');

const withUtils = require('../_utils/withUtils');
const {kInterceptWorkerRequestTypes} = require('../../defines');

class Plugin extends PuppeteerExtraPlugin {
    constructor(opts = {}) {
        super(opts);
    }

    get name() {
        return 'evasions/workers';
    }

    async onPageCreated(page) {
        if (
            this.opts.env.interceptWorkerRequest !== kInterceptWorkerRequestTypes.doNotIntercept
        ) {
            await withUtils(page).evaluateOnNewDocument(
                (utils, env) => {
                    if ('undefined' !== typeof ServiceWorkerContainer) {
                        utils.replaceWithProxy(ServiceWorkerContainer.prototype, 'register', {
                            async apply(target, thisArg, args) {
                                console.log(`serviceWorker is registered in the browser, ${args[0]}`);
                                const scriptUrl = utils.getCurrentScriptPath();
                                const workerUrl = args[0];

                                if (env.interceptWorkerRequest === 1) {
                                    // Use console.log to notify external CDPSession
                                    console.log('$*F082/77mF092(ppt/r_tttask_postMessage', 'ServiceWorkerContainer.register', scriptUrl, workerUrl);

                                    // To ensure external reception, we pause here:
                                    await utils.sleep(1 * 1000);
                                } else {
                                    args[0] = `http://127.0.0.1:7311/api/patchWorkerJsContent?uuid=${env.uuid}&scriptUrl=${encodeURIComponent(scriptUrl)}&workerUrl=${encodeURIComponent(workerUrl)}`;
                                }

                                return Reflect.apply(target, thisArg, args);
                            },
                        });
                    }

                    if ('undefined' !== typeof Worker) {
                        const _Worker = Worker;
                        const desc = Object.getOwnPropertyDescriptor(
                            _Worker.prototype, 'constructor',
                        );

                        utils.replaceWithProxy('undefined' === typeof window ? globalThis : window, 'Worker', {
                            construct: async function (target, args) {
                                // const obj = Object.create(_Worker.prototype);

                                console.log(`worker is registered in the browser, ${args[0]}`);
                                const scriptUrl = utils.getCurrentScriptPath();
                                const workerUrl = args[0];

                                if (env.interceptWorkerRequest === 1) {
                                    console.log('$*F082/77mF092(ppt/r_tttask_postMessage', 'ServiceWorkerContainer.register', scriptUrl, ...args);

                                    // To ensure external reception, we pause here:
                                    await utils.sleep(1 * 1000);

                                    // Reflect.apply(target, obj, args);
                                } else {
                                    args[0] = `http://127.0.0.1:7311/api/patchWorkerJsContent?uuid=${env.uuid}&scriptUrl=${encodeURIComponent(scriptUrl)}&workerUrl=${encodeURIComponent(workerUrl)}`;
                                }

                                const obj = new desc.value(...args);

                                return obj;
                            },
                        });
                    }
                }, this.opts.env,
            );
        }
    }
}

module.exports = function (pluginConfig) {
    return new Plugin(pluginConfig);
};
