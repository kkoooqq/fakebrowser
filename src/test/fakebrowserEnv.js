const NodeEnvironment = require('jest-environment-node');
const vanillaBrowser = require('puppeteer');
const fs = require('fs');
const os = require('os');
const path = require('path');

const DIR = path.join(os.tmpdir(), 'testFakeBrowserUserData');

class FakeBrowserEnvironment extends NodeEnvironment {
    constructor(config) {
        super(config);
    }

    async setup() {
        console.log('Setup Test Environment.');
        await super.setup();
        const wsEndpoint = fs.readFileSync(path.join(DIR, '__wsEndpoint'), 'utf8');
        if (!wsEndpoint) {
            throw new Error('wsEndpoint not found');
        }

        this.global.__BROWSER__ = await vanillaBrowser.connect({
            browserWSEndpoint: wsEndpoint,
        });
    }

    async teardown() {
        console.log('Teardown Test Environment.');
        await super.teardown();
    }

    runScript(script) {
        return super.runScript(script);
    }
}

module.exports = FakeBrowserEnvironment;
