const {FakeBrowser} = require('fakebrowser');

!(async () => {
    // https://hideip.me/en/proxy/socks5list
    const builder = new FakeBrowser.Builder()
        .displayUserActionLayer(true)
        .proxy({
            // socks5://ip:port
            // http://ip:port
            // https://ip:port
            proxy: 'socks5://213.183.32.155:53335',
            exportIP: '213.183.32.155',
        })
        .vanillaLaunchOptions({
            headless: false,
        })
        .userDataDir('./fakeBrowserUserData');

    const fakeBrowser = await builder.launch();

    const page = await fakeBrowser.vanillaBrowser.newPage();
    await page.goto('https://whoer.net');
})();
