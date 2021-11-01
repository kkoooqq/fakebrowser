const {FakeBrowser} = require('fakebrowser');

!(async () => {
    const builder = new FakeBrowser.Builder()
        .displayUserActionLayer(true)
        .proxy({
            proxy: 'socks5://34.105.214.25:1080',
            exportIP: '34.105.214.25',
        })
        .vanillaLaunchOptions({
            headless: false,
        })
        .userDataDir('./fakeBrowserUserData');

    const fakeBrowser = await builder.launch();

    const page = await fakeBrowser.vanillaBrowser.newPage();
    await page.goto('https://whoer.net');
})();

