const timeout = 30000;

describe(
    '/ (properties.getter)',
    () => {
        let page;
        beforeAll(async () => {
            page = await global.vanillaBrowser.newPage();
            await page.goto('https://google.com');
        }, timeout);

        afterAll(async () => {
            await page.close();
        });

        it('plugins matched with dd', async () => {
            const names = await page.evaluate(async () => {
                return [
                    window.PluginArray.toString(),
                    window.Plugin.toString(),
                    window.MimeTypeArray.toString(),
                    window.MimeType.toString(),
                ];
            });

            console.log(names);

            // expect(names).toBe([
            //     'function PluginArray() { [native code] }',
            //     'function Plugin() { [native code] }',
            //     'function MimeTypeArray() { [native code] }',
            //     'function MimeType() { [native code] }',
            // ]);
        }, timeout);
    },
    timeout,
);
