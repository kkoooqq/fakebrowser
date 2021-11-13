const NodeEnvironment = require('jest-environment-node');
const PuppeteerExtra = require('puppeteer-extra');

const fs = require('fs-extra');
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

        // read context
        const testFBContextFile = path.join(DIR, '__testFBContext.json');
        const context = fs.readJsonSync(testFBContextFile);
        const wsEndpoint = context.wsEndpoint;
        if (!wsEndpoint) {
            throw new Error('wsEndpoint not found');
        }

        this.global.deviceDesc = context.DD;
        this.global.fakeDeviceDesc = context.fakeDD;
        this.global.vanillaBrowser = await PuppeteerExtra.connect({
            browserWSEndpoint: wsEndpoint,
        });
    }

    // noinspection JSCheckFunctionSignatures
    async teardown() {
        console.log('Teardown Test Environment.');
        await super.teardown();
    }

    runScript(script) {
        return super.runScript(script);
    }
}

module.exports = FakeBrowserEnvironment;
