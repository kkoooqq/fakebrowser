const vanillaBrowser = require('puppeteer');
const timeout = 30000;

describe(
    '/ (Home Page)',
    () => {
        let page;
        beforeAll(async () => {
            page = await global.vanillaBrowser.newPage();
            await page.goto('https://google.com');
        }, timeout);

        afterAll(async () => {
            await page.close();
        });

        it('should load without error', async () => {
            let text = await page.evaluate(() => document.body.textContent);
            expect(text).toContain('google');
        }, timeout);
    },
    timeout,
);
