const {FakeBrowser} = require('fakebrowser')
const RecaptchaPlugin = require('puppeteer-extra-plugin-recaptcha')

!(async () => {
    const builder = new FakeBrowser.Builder()
        .displayUserActionLayer(true)
        .vanillaLaunchOptions({
            headless: false,
        })
        .usePlugins([
            RecaptchaPlugin({
                provider: {
                    id: '2captcha',
                    token: 'XXXXXXX', // REPLACE THIS WITH YOUR OWN 2CAPTCHA API KEY ⚡
                },
                visualFeedback: true, // colorize reCAPTCHAs (violet = detected, green = solved)
            }),
        ])
        .userDataDir('./fakeBrowserUserData7')

    const fakeBrowser = await builder.launch()
    const page = await fakeBrowser.vanillaBrowser.newPage()
    await page.goto('https://google.com')

})()

