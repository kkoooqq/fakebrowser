const {FakeBrowser} = require('fakebrowser');

!(async () => {
    // Change internal httpserver port number
    FakeBrowser.globalConfig.internalHttpServerPort = 17312

    const builder = new FakeBrowser.Builder()
        .displayUserActionLayer(true)
        .vanillaLaunchOptions({
            headless: false,
        })
        .userDataDir('./fakeBrowserUserData5');

    const fakeBrowser = await builder.launch();
    const page = await fakeBrowser.vanillaBrowser.newPage();
    await page.goto('https://whoer.net');

    // ***** Do something automatic *****

    // Don't forget to close your browser to release resources
    await fakeBrowser.shutdown();
})();

