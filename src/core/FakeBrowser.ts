// noinspection JSUnusedGlobalSymbols,JSUnusedLocalSymbols

import * as path from "path";

import {Browser, CDPSession, Page, Target, WebWorker} from "puppeteer";
import {strict as assert} from 'assert';
import {PuppeteerExtra} from "puppeteer-extra";

import {helper} from "./helper";
import {PptrToolkit} from "./PptrToolkit";
import {LaunchParameters} from "./Driver.js";
import {ChromeUACHHeaders} from "./DeviceDescriptor.js";
import {PptrPatcher} from "./PptrPatcher";
import {UserAgentHelper} from "./UserAgentHelper";
import {FakeUserAction} from "./FakeUserAction";
import {BrowserLauncher} from "./BrowserLauncher";
import {BrowserBuilder} from "./BrowserBuilder";

export const kDefaultWindowsDD = require(path.resolve(__dirname, '../../device-hub/Windows.json'))

const kBrowserMaxSurvivalTime = 60 * 1000 * 15
const kDefaultReferers = ["https://www.google.com", "https://www.bing.com"]
const kInternalHttpServerPort = 17311

// chromium startup parameters
// https://peter.sh/experiments/chromium-command-line-switches/
// https://www.scrapehero.com/how-to-increase-web-scraping-speed-using-puppeteer/
// noinspection TypeScriptValidateJSTypes,SpellCheckingInspection
export const kDefaultLaunchArgs = [
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
    '--ignore-certificate-errors',
    '--ignore-certificate-errors-spki-list',
    '--disable-site-isolation-trials',
    '--disable-features=AudioServiceOutOfProcess,IsolateOrigins,site-per-process,TranslateUI,BlinkGenPropertyTrees', // do not disable UserAgentClientHint
    '--aggressive-cache-discard',
    '--disable-extensions',
    '--disable-blink-features',
    '--disable-blink-features=AutomationControlled',
    '--disable-ipc-flooding-protection',
    '--enable-features=NetworkService,NetworkServiceInProcess,TrustTokens,TrustTokensAlwaysAllowIssuance',  // support ServiceWorkers
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
    '--disable-session-crashed-bubble',
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
    '--disable-logging',
    '--use-gl=swiftshader',             // better cpu usage with --use-gl=desktop rather than --use-gl=swiftshader, still needs more testing.

    // optimze fps
    '--enable-surface-synchronization',
    '--run-all-compositor-stages-before-draw',
    '--disable-threaded-animation',
    '--disable-threaded-scrolling',
    '--disable-checker-imaging',

    '--deterministic-mode',
    '--disable-new-content-rendering-timeout',
    '--disable-image-animation-resync',
    '--disable-partial-raster',

    '--blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4',

    // '--disable-web-security',
    // '--disable-cache',                               // cache
    // '--disable-application-cache',
    // '--disable-offline-load-stale-cache',
    // '--disable-gpu-shader-disk-cache',
    // '--media-cache-size=0',
    // '--disk-cache-size=0',
    // '--enable-experimental-web-platform-features',   // Make Chrome for Linux support Bluetooth. eg: navigator.bluetooth, window.BluetoothUUID
    // '--disable-gpu',                                 // Cannot be disabled: otherwise webgl will not work
    // '--disable-speech-api',                          // Cannot be disabled: some websites use speech-api as fingerprint
    // '--no-startup-window',                           // Cannot be enabled: Chrome won't open the window and puppeteer thinks it's not connected
    // '--disable-webgl',                               // Requires webgl fingerprint
    // '--disable-webgl2',
    // '--disable-notifications',                       // Cannot be disabled: notification-api not available, fingerprints will be dirty
]

if (helper.inLinux()) {
    kDefaultLaunchArgs.push(...[
        '--single-process',              // Chrome does not run with single process in windows / macos, but it runs very well in linux (from Anton bro).
    ])
}

// Is there a friend class similar to C++ ?
// friend class FakeBrowserLauncher
export class FakeBrowser {
    static Builder = BrowserBuilder

    static readonly globalConfig = {
        defaultBrowserMaxSurvivalTime: kBrowserMaxSurvivalTime,
        defaultReferers: kDefaultReferers,
        internalHttpServerPort: kInternalHttpServerPort,
        defaultLaunchArgs: kDefaultLaunchArgs,
    }

    private readonly _launchParams: LaunchParameters
    private readonly _vanillaBrowser: Browser
    private readonly _pptrExtra: PuppeteerExtra
    private readonly _launchTime: number
    private readonly _uuid: string
    private readonly _userAction: FakeUserAction
    private _zombie: boolean

    // private readonly _workerUrls: string[]

    get launchParams(): LaunchParameters {
        return this._launchParams
    }

    get vanillaBrowser(): Browser {
        return this._vanillaBrowser
    }

    get pptrExtra(): PuppeteerExtra {
        return this._pptrExtra
    }

    get launchTime(): number {
        return this._launchTime
    }

    get uuid(): string {
        return this._uuid
    }

    get userAction(): FakeUserAction {
        return this._userAction
    }

    private async beforeShutdown() {

    }

    async shutdown() {
        if (!this._zombie) {
            await this.beforeShutdown()
            this._zombie = true
            await BrowserLauncher._forceShutdown(this)
        } else {
            console.warn('This instance has been shutdown and turned into a zombie.')
        }
    }

    async getActivePage(): Promise<Page | null> {
        const result = await PptrToolkit.getActivePage(this._vanillaBrowser)
        return result
    }

    constructor(
        launchParams: LaunchParameters,
        vanillaBrowser: Browser,
        pptrExtra: PuppeteerExtra,
        launchTime: number,
        maxSurvivalTime: number,
        uuid: string,
    ) {
        this._launchParams = launchParams
        this._vanillaBrowser = vanillaBrowser
        this._pptrExtra = pptrExtra
        this._launchTime = launchTime
        this._uuid = uuid
        this._zombie = false
        // this._workerUrls = []

        this._userAction = new FakeUserAction(this)

        vanillaBrowser.on('targetcreated', this.onTargetCreated.bind(this))
        vanillaBrowser.on('disconnected', this.onDisconnected.bind(this))
    }

    private onDisconnected() {
        return this.shutdown()
    }

    private async onTargetCreated(target: Target) {
        // console.log('targetcreated type:', target.type(), target.url())

        const targetType = target.type()
        const worker = await target.worker()

        if (0 && worker) {
            await this.interceptWorker(worker)
        } else if (
            targetType === 'service_worker'
            || targetType === 'other' && (target.url().startsWith('http'))
        ) {
            const cdpSession = await target.createCDPSession()
            await this.interceptTarget(target, cdpSession);
        } else if (targetType === 'page') {
            await this.interceptPage((await target.page())!)
        }
    }

    private async interceptWorker(worker: WebWorker) {
        assert(!!worker)

        const injectJs: string = await PptrPatcher.evasionsCode(this.pptrExtra)
        await worker.evaluate(injectJs)
    }

    private async interceptTarget(target: Target, client: CDPSession) {
        assert(!!client)

        // FIXME: Worker & SharedWorker does not work with this way
        // console.log('intercept', target.url())
        const injectJs: string = await PptrPatcher.evasionsCode(this.pptrExtra)

        await client.send('Runtime.evaluate', {
            expression: injectJs
        })
    }

    async interceptPage(page: Page) {
        // console.log('inject page')
        let cdpSession: CDPSession | null = null

        const fakeDD = this._launchParams.fakeDeviceDesc
        assert(fakeDD)

        // if there is an account password that proxy needs to log in
        if (
            this._launchParams.proxy &&
            this._launchParams.proxy.username &&
            this._launchParams.proxy.password
        ) {
            await page.authenticate({
                username: this._launchParams.proxy.username,
                password: this._launchParams.proxy.password,
            });
        }

        // cdp
        try {
            await page['_client'].send('ServiceWorker.setForceUpdateOnPageLoad', {forceUpdateOnPageLoad: true})
        } catch (ex: any) {
            console.warn('ServiceWorker.setForceUpdateOnPageLoad exception', ex)
        }

        // intercept worker
        // const target = page.target()
        // cdpSession = await target.createCDPSession()
        // await this.interceptWorker(target, cdpSession);
        //
        // page.on('workercreated', (worker: WebWorker) => {
        //     console.log(`worker created ${worker.url()}`)
        //     this._workerUrls.push(worker.url())
        // })
        //
        // page.on('workerdestroyed', async (worker: WebWorker) => {
        //     console.log(`worker destroyed ${worker.url()}`)
        // })

        // set additional request headers
        let lang: string = fakeDD.navigator.languages
            ? fakeDD.navigator.languages.join(',')
            : fakeDD.navigator.language

        if (lang && lang.length) {
            lang += ';q=0.9'
        }

        // FIXME: read version from the launched browser
        const chromeVersion = UserAgentHelper.chromeMajorVersion(fakeDD.navigator.userAgent)
        const os = UserAgentHelper.os(fakeDD.navigator.userAgent)

        assert(chromeVersion)
        assert(os)

        const extraHTTPHeaders: ChromeUACHHeaders = {
            'Accept-Language': lang || '',
            // FIXME: error occurs after the referer is set
            // 'referer': FakeBrowser.globalConfig.defaultReferers[sh.rd(0, referers.length - 1)],
            'sec-ch-ua':
                this._launchParams.launchOptions.executablePath
                && this._launchParams.launchOptions.executablePath.toLowerCase().includes('edge')
                    ? `"Microsoft Edge";v="${chromeVersion}", " Not;A Brand";v="99", "Chromium";v="${chromeVersion}"`
                    : `"Google Chrome";v="${chromeVersion}", " Not;A Brand";v="99", "Chromium";v="${chromeVersion}"`,
            'sec-ch-ua-mobile': '?0',
            // 'sec-fetch-site': 'cross-site',
        }

        if (chromeVersion >= 93) {
            extraHTTPHeaders['sec-ch-ua-platform'] = `"${os}"`
        }

        await page.setExtraHTTPHeaders(extraHTTPHeaders)
        await page.setUserAgent(fakeDD.navigator.userAgent)
        await page.setViewport({
            width: fakeDD.window.innerWidth,
            height: fakeDD.window.innerHeight,
            isMobile: UserAgentHelper.isMobile(fakeDD.navigator.userAgent),
            hasTouch: fakeDD.navigator.maxTouchPoints > 0,
            deviceScaleFactor: fakeDD.window.devicePixelRatio,
        })

        return {page, cdpSession}
    }

    async _patchPages0Bug() {
        // pages[0] keeps failing to hook effectively
        // But I can't close it, because in windows, closing this page will cause the whole browser to close
        // So I can only make it inaccessible to users

        const abandonedPageTargetIds: string[] = []

        const pages = await this.vanillaBrowser.pages()
        if (pages.length > 0) {
            abandonedPageTargetIds.push(
                ...pages.map(e => e.target()['_targetId'])
            )
        }

        Object.defineProperty(Object.getPrototypeOf(this.vanillaBrowser), 'pages', {
            value: new Proxy(this.vanillaBrowser.pages, {
                async apply(target, thisArg, args) {
                    let pages: Page[] = await Reflect.apply(target, thisArg, args)

                    // Maybe browser is created based on connect, with different instances
                    // so can only compare TargetId
                    pages = pages.filter(
                        e => !abandonedPageTargetIds.includes(e.target()['_targetId'])
                    )

                    return pages
                }
            })
        })

    }
}

