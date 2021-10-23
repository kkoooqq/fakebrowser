import {addExtra, PuppeteerExtra} from "puppeteer-extra";
import {Browser, BrowserConnectOptions, BrowserLaunchArgumentOptions, LaunchOptions} from "puppeteer";
import DeviceDescriptorHelper, {FakeDeviceDescriptor} from "./DeviceDescriptor.js";
import {strict as assert} from 'assert';
import * as path from "path";
import {UserAgentHelper} from "./UserAgentHelper.js";
import * as fs from "fs-extra";
import pidtree = require('pidtree');

// chromium startup parameters
// https://peter.sh/experiments/chromium-command-line-switches/
// https://www.scrapehero.com/how-to-increase-web-scraping-speed-using-puppeteer/
// noinspection TypeScriptValidateJSTypes,SpellCheckingInspection
export const defaultLaunchArgs = [
    '--no-sandbox',
    '--no-pings',
    '--no-zygote',
    '--mute-audio',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-software-rasterizer',
    '--disable-cloud-import',
    '--disable-gesture-typing',
    '--disable-setuid-sandbox',
    '--disable-offer-store-unmasked-wallet-cards',
    '--disable-offer-upload-credit-cards',
    '--disable-print-preview',
    '--disable-voice-input',
    '--disable-wake-on-wifi',
    '--ignore-gpu-blocklist',
    '--enable-async-dns',
    '--enable-simple-cache-backend',
    '--enable-tcp-fast-open',
    '--enable-webgl',
    '--prerender-from-omnibox=disabled',
    '--enable-web-bluetooth',
    // '--enable-experimental-web-platform-features', // Make Chrome for Linux support Bluetooth. eg: navigator.bluetooth, window.BluetoothUUID
    '--ignore-certificate-errors',
    '--ignore-certificate-errors-spki-list',
    '--disable-web-security',
    '--disable-site-isolation-trials',
    '--disable-features=AudioServiceOutOfProcess,IsolateOrigins,site-per-process,TranslateUI,BlinkGenPropertyTrees', // do not disable UserAgentClientHint
    '--aggressive-cache-discard',
    '--disable-cache',
    '--disable-application-cache',
    '--disable-offline-load-stale-cache',
    '--disable-gpu-shader-disk-cache',
    '--media-cache-size=0',
    '--disk-cache-size=0',
    '--disable-extensions',
    '--disable-blink-features',
    '--disable-blink-features=AutomationControlled',
    '--disable-ipc-flooding-protection',
    '--enable-features=NetworkService,NetworkServiceInProcess',  // support ServiceWorkers
    '--metrics-recording-only',
    '--disable-component-extensions-with-background-pages',
    '--disable-default-apps',
    '--disable-breakpad',
    '--disable-component-update',
    '--disable-domain-reliability',
    '--disable-sync',
    '--disable-client-side-phishing-detection',
    '--disable-hang-monitor',
    '--disable-popup-blocking',
    '--disable-prompt-on-repost',
    '--metrics-recording-only',
    '--safebrowsing-disable-auto-update',
    '--password-store=basic',
    '--autoplay-policy=no-user-gesture-required',
    '--use-mock-keychain',
    '--force-webrtc-ip-handling-policy=default_public_interface_only',
    '--disable-crash-reporter',
    '--disable-dev-shm-usage',
    '--force-color-profile=srgb',
    '--disable-accelerated-2d-canvas',
    '--disable-translate',
    '--disable-background-networking',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-infobars',
    '--hide-scrollbars',
    '--disable-renderer-backgrounding',
    '--font-render-hinting=none',
    '--use-gl=swiftshader',
    // '--single-process',              // Chrome cannot run in single process mode
    // '--disable-logging',
    // '--disable-gpu',                 // Cannot be disabled: otherwise webgl will not work
    // '--disable-speech-api',          // Cannot be disabled: some websites use speech-api as fingerprint
    // '--no-startup-window',           // Cannot be enabled: Chrome won't open the window and puppeteer thinks it's not connected
    // '--disable-webgl',               // Requires webgl fingerprint
    // '--disable-webgl2',
    // '--disable-notifications',       // Cannot be disabled: notification-api not available, fingerprints will be dirty
]

export enum InterceptWorkerTypes {
    DoNotIntercept,
    Intercept,
    InterceptViaRequest,
}

export interface ProxyServer {
    proxy: string,
    exportIP: string,
    username?: string,
    password?: string,
}

export interface LaunchParameters {
    fakeDevice: FakeDeviceDescriptor,
    displayUserActionLayer?: boolean,
    userDataDir: string,
    interceptWorkerType?: InterceptWorkerTypes,
    proxy?: ProxyServer,
}

export const DefaultTimeout = 15 * 1000

export const DefaultLaunchOptions = {
    headless: true,
    devtools: false,
    timeout: DefaultTimeout,
}

export default class Driver {

    /**
     * Launch browser
     * @param launchParameters
     * @param options
     */
    static async launch(
        launchParameters: LaunchParameters,
        options: LaunchOptions & BrowserLaunchArgumentOptions & BrowserConnectOptions = DefaultLaunchOptions
    ): Promise<{
        browser: Browser,
        pptr: PuppeteerExtra
    }> {

        // fakeDevice must be set
        const fakeDevice: FakeDeviceDescriptor = launchParameters.fakeDevice
        assert(fakeDevice)

        // args
        const args = [
            ...(options.args || []),
            ...defaultLaunchArgs,
        ]

        // Modify default options
        options = {
            ...options,
            ignoreHTTPSErrors: true,
            ignoreDefaultArgs: [
                '--enable-automation',
                '--enable-blink-features=IdleDetection'
            ],
            handleSIGINT: false,
            handleSIGTERM: false,
            handleSIGHUP: false,
            pipe: true,
            defaultViewport: {
                width: fakeDevice.window.innerWidth,
                height: fakeDevice.window.innerHeight,
                deviceScaleFactor: fakeDevice.window.devicePixelRatio,
                isMobile: UserAgentHelper.isMobile(fakeDevice.navigator.userAgent),
                hasTouch: UserAgentHelper.isMobile(fakeDevice.navigator.userAgent),
                isLandscape: false,
            },
            args,
        }

        // headless
        let headless = options.headless
        if ('undefined' === typeof headless) {
            headless = true
        }

        if (options.devtools) {
            headless = false
        }

        // proxy
        if (launchParameters.proxy) {
            args.push(
                `--proxy-server=${launchParameters.proxy}`
            )
        }

        // browser language
        if (
            (fakeDevice.navigator.languages && fakeDevice.navigator.languages.length)
            || fakeDevice.navigator.language
        ) {
            const lang = (fakeDevice.navigator.languages || []).length
                ? fakeDevice.navigator.languages.join(',')
                : fakeDevice.navigator.language

            args.push(
                `--lang=${lang};q=0.9`
            )
        }

        // user data dir
        // Browser fingerprint data FakeDeviceDescriptor will not change after generated, so we can use its UUID for user-data-dir.
        // The userDataDir in launchParameters must be set, and we will splice UUID after the path.
        assert(launchParameters.userDataDir)

        const deviceUUID = DeviceDescriptorHelper.deviceUUID(launchParameters.fakeDevice)
        const userDataDir = path.resolve(launchParameters.userDataDir, `./${deviceUUID}`)

        fs.mkdirSync(userDataDir, {recursive: true}) // throw exception

        args.push(
            `--user-data-dir=${userDataDir}`
        )

        // window position & window size
        let {screenX, screenY, innerWidth, innerHeight, outerWidth, outerHeight} = fakeDevice.window

        outerWidth ||= innerWidth
        outerHeight ||= (innerHeight + 85)
        args.push(
            `--window-position=${screenX},${screenY}`,
            `--window-size=${outerWidth},${outerHeight}`,
        )

        // Some options can only be used in headless.
        // If you use them again in headful, you will see a plain white browser window without any content.
        if (headless) {
            args.push(
                '--in-process-gpu', // https://source.chromium.org/search?q=lang:cpp+symbol:kInProcessGPU&ss=chromium
                '--disable-canvas-aa', // Disable antialiasing on 2d canvas
                '--disable-2d-canvas-clip-aa', // Disable antialiasing on 2d canvas clips
                '--disable-gl-drawing-for-tests', // BEST OPTION EVER! Disables GL drawing operations which produce pixel output. With this the GL output will not be correct but tests will run faster.
                // '--use-gl=swiftshader', // better cpu usage with --use-gl=desktop rather than --use-gl=swiftshader, still needs more testing.

            )
        }

        // Different instances with different puppeteer configurations
        const pptr = addExtra(require('puppeteer'))

        // noinspection UnnecessaryLocalVariableJS
        const browser: Browser = await pptr.launch(options)

        return {browser, pptr}
    }

    private static async getPids(pid) {
        const pids = await pidtree(pid)
        return pids.includes(pid) ? pids : [...pids, pid]
    }

    /**
     * Shutdown browser
     * @param browser
     */
    static async shutdown(browser: Browser) {
        try {
            const pages = await browser.pages()
            for (const page of pages) {
                await page.close();
            }
        } catch (ignored) {
        }

        const browserProcess = browser.process()
        if (browserProcess) {
            const pid = browserProcess.pid

            if (pid) {
                const pids = await this.getPids(pid)
                pids.forEach(pid => {
                    try {
                        process.kill(pid, 'SIGKILL')
                    } catch (ignored) {
                    }
                })
            }
        }

        try {
            await browser.close()
        } catch (ignored) {
        }
    }
}
