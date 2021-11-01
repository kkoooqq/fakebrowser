const {FakeBrowser} = require('fakebrowser');

!(async () => {
    FakeBrowser.globalConfig.internalHttpServerPort = 17313

    const builder = new FakeBrowser.Builder()
        .displayUserActionLayer(true)
        .vanillaLaunchOptions({
            headless: false,
        })
        .userDataDir('./fakeBrowserUserData6');

    const fakeBrowser = await builder.launch();
    const page = await fakeBrowser.vanillaBrowser.newPage();
    await page.goto('https://google.com');

    // ***** Do something automatic *****

    // Don't forget to close your browser to release resources
    await fakeBrowser.shutdown();
})();

