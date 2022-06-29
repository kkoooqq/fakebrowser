const timeout = 30000;

describe(
    '/ (properties.getter)',
    () => {
        /**
         * @type {import("puppeteer-extra-plugin/dist/puppeteer").Page}
         */
        let page;
        beforeAll(async () => {
            page = await global.vanillaBrowser.newPage();
            await page.goto('https://google.com');
        }, timeout);

        afterAll(async () => {
            await page.close();
        });

        it('plugins matched with dd', async () => {
            const fakeValue = await page.evaluate(async () => {
                const dumpVoices = () => {
                    return new Promise(async resolve => {
                        try {
                            const win = window;
                            const supported = 'speechSynthesis' in win;
                            supported && speechSynthesis.getVoices(); // warm up

                            // noinspection JSCheckFunctionSignatures
                            await new Promise(setTimeout).catch(e => e);

                            if (!supported) {
                                return resolve([]);
                            }

                            // inspired by https://github.com/abrahamjuliot/creepjs/blob/master/creep.js
                            let success = false;
                            const getVoices = () => {
                                const data = win.speechSynthesis.getVoices();
                                if (!data || !data.length) {
                                    return;
                                }

                                success = true;

                                const voices = data.map(e => ({
                                    default: e.default,
                                    lang: e.lang,
                                    localService: e.localService,
                                    name: e.name,
                                    voiceURI: e.voiceURI,
                                }));

                                return resolve(voices);
                            };

                            getVoices();
                            win.speechSynthesis.onvoiceschanged = getVoices; // Chrome support

                            // handle pending resolve
                            const wait = 1000;
                            setTimeout(() => {
                                if (success) {
                                    return;
                                }

                                return resolve([]);
                            }, wait);
                        } catch (error) {
                            return resolve([]);
                        }
                    });
                };

                return JSON.stringify(await dumpVoices());
            });

            const origValue = JSON.stringify(global.fakeDeviceDesc['voices']);

            expect(fakeValue).toBe(origValue);
        }, timeout);
    },
    timeout,
);
