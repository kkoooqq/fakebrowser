const {FakeBrowser} = require('fakebrowser');

!(async () => {
    const createBrowserAndGoto = async (dd, userDataDir, url) => {
        const builder = new FakeBrowser.Builder()
            .deviceDescriptor(dd)
            .vanillaLaunchOptions({
                headless: false,
            })
            .userDataDir(userDataDir);

        const fakeBrowser = await builder.launch();
        const page = await fakeBrowser.vanillaBrowser.newPage();
        await page.goto(url);

        // ***** Do something automatic *****

        // Don't forget to close your browser to release resources
        await fakeBrowser.shutdown();
    };

    createBrowserAndGoto(
        require('./node_modules/fakebrowser/device-hub/Windows.json'),
        './fakeBrowserUserData3',
        'https://fingerprintjs.github.io/fingerprintjs/',
    ).then(e => e);

    createBrowserAndGoto(
        require('./node_modules/fakebrowser/device-hub/macOS.json'),
        './fakeBrowserUserData4',
        'https://fingerprintjs.github.io/fingerprintjs/',
    ).then(e => e);
})();
