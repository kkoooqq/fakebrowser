const path = require('path');
const timeout = 30000;

describe(
    'https://intoli.com/blog/not-possible-to-block-chrome-headless/chrome-headless-test.html',
    () => {
        /**
         * @type {import("puppeteer-extra-plugin/dist/puppeteer").Page}
         */
        let page;
        beforeAll(async () => {
            page = await global.vanillaBrowser.newPage();
            await page.waitForTimeout(1000)
            await page.goto('http://127.0.0.1:3000/intoli/');
            try {
                await page.waitForFunction(() => $$('.failed, .passed').length === 6, {timeout: 5000})
            } catch (e) {
            }
        }, timeout);

        afterAll(async () => {
            await page.close();
        });

        it('should containd valid fingerprint data', async () => {
            // const fails = (await page.$$('.failed')).length
            const passed = (await page.$$('.passed')).length
            const screenshotPath = path.join(__dirname, `intoli.png`)
            await page.screenshot({ path: screenshotPath, fullPage: true })
            // console.log({ fails, passed })
            // await page.waitForTimeout(25000)
            expect(passed).toBe(6);
            // console.log('done', screenshotPath)
        }, timeout);
    },
    timeout,
);
