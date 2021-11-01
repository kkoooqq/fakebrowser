const {FakeBrowser} = require('fakebrowser');

!(async () => {
    const createBrowserAndGoto = async (userDataDir, url) => {
        const builder = new FakeBrowser.Builder()
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

    createBrowserAndGoto('./fakeBrowserUserData1', 'https://fingerprintjs.github.io/fingerprintjs/').then(e => e);
    createBrowserAndGoto('./fakeBrowserUserData2', 'https://fingerprintjs.github.io/fingerprintjs/').then(e => e);
})();
