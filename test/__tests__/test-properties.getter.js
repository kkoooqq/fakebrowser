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

        it('props matched with dd', async () => {
            const hookedDesc = await page.evaluate(async () => {
                // from dumpDD.js
                // props
                const dumpObjProps = async (obj, keys) => {
                    const result = {};

                    if (obj) {
                        for (let n in keys) {
                            const key = keys[n];
                            const val = obj[key];

                            try {
                                if (
                                    ('function' == typeof val || 'object' == typeof val)
                                    && !(val === null)
                                    && !(val instanceof Array)
                                ) {
                                    result[key] = '_$obj!_//+_';
                                } else {
                                    if ('undefined' == typeof val) {
                                        result[key] = '_$obj!_undefined_//+_';
                                    } else {
                                        result[key] = val;
                                    }
                                }
                            } catch (_) {
                            }
                        }
                    }

                    return result;
                };

                const dumpNavigatorProps = async () => {
                    return dumpObjProps(navigator, [
                        'languages', 'userAgent', 'appCodeName', 'appMinorVersion', 'appName', 'appVersion', 'buildID',
                        'platform', 'product', 'productSub', 'hardwareConcurrency', 'cpuClass', 'maxTouchPoints', 'oscpu',
                        'vendor', 'vendorSub', 'deviceMemory', 'doNotTrack', 'msDoNotTrack', 'vibrate', 'credentials',
                        'storage', 'requestMediaKeySystemAccess', 'bluetooth', 'language', 'systemLanguage', 'userLanguage',
                    ]);
                };

                const dumpWindowProps = async () => {
                    return dumpObjProps(window, [
                        'innerWidth', 'innerHeight',
                        'outerWidth', 'outerHeight',
                        'screenX', 'screenY',
                        'pageXOffset', 'pageYOffset',
                        'Image', 'isSecureContext', 'devicePixelRatio', 'toolbar', 'locationbar', 'ActiveXObject', 'external',
                        'mozRTCPeerConnection', 'postMessage', 'webkitRequestAnimationFrame', 'BluetoothUUID', 'netscape',
                        'localStorage', 'sessionStorage', 'indexDB', 'BarcodeDetector',
                    ]);
                };

                const dumpScreenProps = async () => {
                    return dumpObjProps(screen, [
                        'availWidth', 'availHeight',
                        'availLeft', 'availTop',
                        'width', 'height',
                        'colorDepth', 'pixelDepth',
                    ]);
                };

                const dumpDocumentProps = async () => {
                    return dumpObjProps(document, ['characterSet', 'compatMode', 'documentMode', 'layers', 'images']);
                };

                const dumpBodyProps = async () => {
                    return dumpObjProps(document.body, ['clientWidth', 'clientHeight']);
                };

                return {
                    'navigator': await dumpNavigatorProps(),
                    'window': await dumpWindowProps(),
                    'screen': await dumpScreenProps(),
                    'document': await dumpDocumentProps(),
                    'body': await dumpBodyProps(),
                };
            });

            const keys = [
                ['navigator', []],
                ['window', ['pageXOffset', 'pageYOffset']],
                ['screen', []],
                ['document', []],
                ['body', ['clientWidth', 'clientHeight']],
            ];

            for (const [key, ignorePropNames] of keys) {
                const orgProps = global.fakeDeviceDesc[key];
                const props = hookedDesc[key];

                for (const name in orgProps) {
                    if (!ignorePropNames.includes(name)) {
                        expect(String(props[name])).toBe(String(orgProps[name]));
                    }
                }
            }
        }, timeout);
    },
    timeout,
);
