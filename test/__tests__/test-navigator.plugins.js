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
            const pluginsValueString = await page.evaluate(async () => {
                const dumpPlugins = async () => {
                    const result = {};

                    try {
                        result.mimeTypes = [];
                        // noinspection JSDeprecatedSymbols
                        const mimeTypes = navigator.mimeTypes;

                        for (let n = 0; n < mimeTypes.length; ++n) {
                            const mimeType = mimeTypes[n];

                            // noinspection JSDeprecatedSymbols
                            result.mimeTypes.push({
                                'type': mimeType.type,
                                'suffixes': mimeType.suffixes,
                                'description': mimeType.description,
                                '__pluginName': mimeType.enabledPlugin.name,
                            });
                        }

                        result.plugins = [];

                        // noinspection JSDeprecatedSymbols
                        const plugins = navigator.plugins;
                        for (let n = 0; n < plugins.length; ++n) {
                            const plugin = plugins[n];
                            const __mimeTypes = [];

                            for (let m = 0; m < plugin.length; ++m) {
                                __mimeTypes.push(plugin[m].type);
                            }

                            result.plugins.push({
                                'name': plugin.name,
                                'filename': plugin.filename,
                                'description': plugin.description,
                                '__mimeTypes': __mimeTypes,
                            });
                        }
                    } catch (_) {
                    }

                    return result;
                };

                return JSON.stringify(await dumpPlugins());
            });

            const originalPluginValueString = JSON.stringify(global.fakeDeviceDesc['plugins']);

            expect(pluginsValueString).toBe(originalPluginValueString);
        }, timeout);
    },
    timeout,
);
