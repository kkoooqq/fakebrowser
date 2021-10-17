'use strict';

const {PuppeteerExtraPlugin} = require('puppeteer-extra-plugin');
const withUtils = require('../evasions/_utils/withUtils');
const withWorkerUtils = require('../evasions/_utils/withWorkerUtils');

class Plugin extends PuppeteerExtraPlugin {
    constructor(opts = {}) {
        super(opts);
    }

    get name() {
        return 'evasions/taskEnv';
    }

    async onPageCreated(page) {
        await withUtils(page).evaluateOnNewDocument(this.mainFunction, this.opts.env);
    }

    async onServiceWorkerContent(jsContent) {
        return withWorkerUtils(jsContent).evaluate(this.mainFunction, this.opts.env);
    }

    mainFunction = (utils, env) => {
        utils.variables.env = env;
    };
}

module.exports = function (pluginConfig) {
    return new Plugin(pluginConfig);
};
