const {FakeBrowser} = require('../../dist/cjs/FakeBrowser');

const fs = require('fs');
const mkdirp = require('mkdirp');
const os = require('os');
const path = require('path');

const DIR = path.join(os.tmpdir(), 'testFakeBrowserUserData');

module.exports = async function () {
    console.log('Setup FakeBrowser');

    const windowsDD = require('../../device-hub/Windows.json');

    const builder = new FakeBrowser.Builder()
        .deviceDescriptor(windowsDD)
        .displayUserActionLayer(true)
        .vanillaLaunchOptions({
            pipe: false,
            headless: false,
        })
        .userDataDir(DIR);

    const fakeBrowser = await builder.launch();

    global.__BROWSER_GLOBAL__ = fakeBrowser;
    mkdirp.sync(DIR);

    const wsEndPointFile = path.join(DIR, '__wsEndpoint')
    fs.writeFileSync(wsEndPointFile, fakeBrowser.vanillaBrowser.wsEndpoint());
};
