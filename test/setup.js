const {FakeBrowser} = require('../dist/cjs/core/FakeBrowser');

const fs = require('fs-extra');
const mkdirp = require('mkdirp');
const os = require('os');
const path = require('path');

const Koa = require('koa');
const serve = require('koa-static');

const DIR = path.join(os.tmpdir(), 'testFakeBrowserUserData');

module.exports = async function () {
    console.log('Setup FakeBrowser');

    const windowsDD = require('../device-hub-demo/Windows.json');

    // build fb
    const builder = new FakeBrowser.Builder()
        .deviceDescriptor(windowsDD)
        .displayUserActionLayer(true)
        // .disableEvasion("navigator.plugins-native")
        .vanillaLaunchOptions({
            pipe: false,
            headless: true,
            devtools: false,
        })
        .userDataDir(DIR);

    const fakeBrowser = await builder.launch();
    global.fakeBrowser = fakeBrowser;

    /** local Webserver */
    const root = path.join(__dirname, 'static');
    const app = new Koa();
    app.use(serve(root, {}));
    const server = await new Promise((accept) => {const srv = app.listen(3000, () => accept(srv))});
    global.server = server;

    // save context file
    mkdirp.sync(DIR);
    const testFBContextFile = path.join(DIR, '__testFBContext.json');

    console.log('context file', testFBContextFile);

    fs.writeJsonSync(
        testFBContextFile,
        {
            wsEndpoint: fakeBrowser.vanillaBrowser.wsEndpoint(),
            DD: fakeBrowser.driverParams.deviceDesc,
            fakeDD: fakeBrowser.driverParams.fakeDeviceDesc,
        },
        {spaces: 2});
};
