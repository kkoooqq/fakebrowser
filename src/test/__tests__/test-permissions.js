const vanillaBrowser = require('puppeteer');
const timeout = 300000;

describe(
    '/ (navigator.permissions)',
    () => {
        let page;
        beforeAll(async () => {
            page = await global.vanillaBrowser.newPage();
            await page.goto('https://google.com');
        }, timeout);

        afterAll(async () => {
            await page.close();
        });

        it('permissions matched with dd', async () => {
            const permissions = await page.evaluate(async () => {
                // from dumpDD.js
                const dumpPermissions = async () => {
                    const permissions = [
                        'storage-access',
                        'push',
                        'speaker',
                        'device-info',
                        'bluetooth',
                        'midi',
                        'background-fetch',
                        'background-sync',
                        'accelerometer',
                        'gyroscope',
                        'magnetometer',
                        'screen-wake-lock',
                        'clipboard',
                        'clipboard-read',
                        'clipboard-write',
                        'payment-handler',
                        'periodic-background-sync',
                        'geolocation',
                        'notifications',
                        'camera',
                        'microphone',
                        'display-capture',
                        'persistent-storage',
                        'ambient-light-sensor',
                        'accessibility-events',
                        'nfc',
                        'idle-detection',
                        'system-wake-lock',
                        'window-placement',
                        'font-access',
                    ];

                    const result = {};

                    await Promise.all(
                        permissions.map(e => new Promise(resolve => {
                            // noinspection JSCheckFunctionSignatures
                            navigator.permissions.query({name: e})
                                .then(({state}) => {
                                    result[e] = {state};
                                    resolve();
                                })
                                .catch((ex) => {
                                    result[e] = {
                                        'exType': ex.constructor.name,
                                        'msg': ex.message,
                                    };
                                    resolve();
                                });
                        })),
                    );

                    return result;
                };

                return await dumpPermissions();
            });

            const orgPermissions = global.fakeDeviceDesc.permissions;

            // await new Promise(resolve => {
            //     setTimeout(() => {
            //         resolve()
            //     }, 1000 * 1000)
            // })

            for (const name in permissions) {
                expect(permissions[name].state).toBe(orgPermissions[name].state);
                expect(permissions[name].exType).toBe(orgPermissions[name].exType);
                expect(permissions[name].msg).toBe(orgPermissions[name].msg);
            }
        }, timeout);
    },
    timeout,
);
