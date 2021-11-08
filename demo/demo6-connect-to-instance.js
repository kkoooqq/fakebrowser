const {FakeBrowser} = require('../dist/cjs/FakeBrowser');

process.on('unhandledRejection', (error, p) => {
    console.log('=== UNHANDLED REJECTION ===');
    console.dir(error.stack);
});

!(async () => {
    const dd = require('../device-hub/Windows.json');
    const builder = new FakeBrowser.Builder()
        .deviceDescriptor(dd)
        .doNotHook(false)
        .vanillaConnectOptions({
            browserWSEndpoint: 'ws://127.0.0.1:9222/devtools/browser/a060d8a6-82ad-4035-8e24-2fbf35ee4de9',
        })
        .userDataDir('./fakeBrowserUserData');

    const fakeBrowser = await builder.connect();

    const page = await fakeBrowser.vanillaBrowser.newPage();
    await page.goto('https://nike.com/ca');

    // await fakeBrowser.shutdown();
})();
