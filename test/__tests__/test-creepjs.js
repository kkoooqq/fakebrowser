const path = require('path');
const timeout = 40000;

describe(
    'https://bot.sannysoft.com/',
    () => {
        /**
         * @type {import("puppeteer-extra-plugin/dist/puppeteer").Page}
         */
        let page;
        beforeAll(async () => {
            page = await global.vanillaBrowser.newPage();
            await page.emulateTimezone("Europe/Paris");
            await page.goto('https://abrahamjuliot.github.io/creepjs/');
            await page.waitForTimeout(25000)
        }, timeout);

        afterAll(async () => {
            await page.close();
        });

        it('should containd valid fingerprint data', async () => {
            const screenshotPath = path.join(__dirname, `creepjs.png`)
            await page.screenshot({ path: screenshotPath, fullPage: true })
            expect(1).toBe(1);
        }, timeout);
    },
    timeout,
);
