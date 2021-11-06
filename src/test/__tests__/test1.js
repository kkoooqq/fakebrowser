const timeout = 5000;

describe(
    '/ (Home Page)',
    () => {
        let page;
        beforeAll(async () => {
            console.log('before new page')
            page = await global.__BROWSER__.newPage();
            console.log('before goto')
            await page.goto('https://google.com');
            console.log('after goto')
        }, timeout);

        afterAll(async () => {
            console.log('before page close')
            await page.close();
            console.log('after page close')
        });

        it('should load without error', async () => {
            console.log('before get html content')
            let text = await page.evaluate(() => document.body.textContent);
            console.log('after get html content')
            expect(text).toContain('google');
        });
    },
    timeout,
);
