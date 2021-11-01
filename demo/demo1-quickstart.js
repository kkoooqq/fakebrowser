// cjs
const {FakeBrowser} = require('fakebrowser');

// esm
// import {FakeBrowser} from 'fakebrowser';
// import {createRequire} from 'module';
// const require = createRequire(import.meta.url);

!(async () => {
    // [Optional]: Select a fake device description
    const windowsDD = require('./node_modules/fakebrowser/device-hub/Windows.json');

    const builder = new FakeBrowser.Builder()
        // [Optional]: Set the fake device description
        .deviceDescriptor(windowsDD)
        // [Optional]: Show user action layers
        .displayUserActionLayer(true)
        // [Optional]: Set startup options (https://pptr.dev/#?product=Puppeteer&show=api-puppeteerlaunchoptions)
        .vanillaLaunchOptions({
            headless: false,
            executablePath: '/Applications/Google Chrome 93.0.4577.82.app/Contents/MacOS/Google Chrome',
        })
        // Must be set: path to save user data
        // We will create a fake device description (fake browser fingerprint) and save the browser's user cache information to this folder.
        // Note: Once the fake browser fingerprint is created, it will not change, just like a normal user using the browser.
        // If you want to get a different browser fingerprint, see demo2.
        .userDataDir('./fakeBrowserUserData');

    const fakeBrowser = await builder.launch();

    // vanillaBrowser is a puppeteer.Browser object
    const page = await fakeBrowser.vanillaBrowser.newPage();
    await page.goto('https://abrahamjuliot.github.io/creepjs/');
})();

