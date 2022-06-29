const path = require('path');
const timeout = 30000;

describe(
    'https://bot.sannysoft.com/',
    () => {
        /**
         * @type {import("puppeteer-extra-plugin/dist/puppeteer").Page}
         */
        let page;
        beforeAll(async () => {
            page = await global.vanillaBrowser.newPage();
            await page.goto('http://127.0.0.1:3000/sannysoft/');
            try {
                await page.waitForFunction(() => $$('.failed, .passed').length === 33, {timeout: 5000})
            } catch (e) {
            }
            try {
                await page.waitForFunction(() => $$('.failed, .passed').length === 33, {timeout: 1000})
            } catch (e) {
            }
        }, timeout);

        afterAll(async () => {
            await page.close();
        });

        it('should containd valid fingerprint data', async () => {
            const userAgentResult = await page.evaluate(el => el.textContent, await page.$('#user-agent-result'))
            const webglRenderer = await page.evaluate(el => el.textContent, await page.$('#webgl-renderer'))
            const fails = (await page.$$('.failed')).length
            const passed = (await page.$$('.passed')).length
            const screenshotPath = path.join(__dirname, `sannysoft.png`)
            await page.screenshot({ path: screenshotPath, fullPage: true })
            // console.log({ fails, passed })
            // await page.waitForTimeout(25000)
            expect(fails).toBeLessThan(4);
            expect(passed).toBeGreaterThan(28);
            expect(userAgentResult).toContain('Mozilla');
            expect(webglRenderer).toContain('Xe Graphics Direct3D11');
        }, timeout);
    },
    timeout,
);
