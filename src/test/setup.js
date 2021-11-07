const {FakeBrowser} = require('../../dist/cjs/FakeBrowser');

const fs = require('fs-extra');
const mkdirp = require('mkdirp');
const os = require('os');
const path = require('path');

const DIR = path.join(os.tmpdir(), 'testFakeBrowserUserData');

module.exports = async function () {
    console.log('Setup FakeBrowser');

    const windowsDD = require('../../device-hub/Windows.json');

    // build fb
    const builder = new FakeBrowser.Builder()
        .deviceDescriptor(windowsDD)
        .displayUserActionLayer(true)
        .vanillaLaunchOptions({
            pipe: false,
            headless: true,
            devtools: false,
        })
        .userDataDir(DIR);

    const fakeBrowser = await builder.launch();
    global.fakeBrowser = fakeBrowser;

    // save context file
    mkdirp.sync(DIR);
    const testFBContextFile = path.join(DIR, '__testFBContext.json');

    console.log('context file', testFBContextFile);

    fs.writeJsonSync(
        testFBContextFile,
        {
            'wsEndpoint': fakeBrowser.vanillaBrowser.wsEndpoint(),
            'DD': fakeBrowser.launchParams.deviceDesc,
            'fakeDD': fakeBrowser.launchParams.fakeDeviceDesc,
        },
        {spaces: 2});
};
