// noinspection JSUnusedGlobalSymbols,JSUnusedLocalSymbols

import * as path from 'path'
import {strict as assert} from 'assert'

import {Browser, CDPSession, Page, Target, WebWorker} from 'puppeteer'
import {PuppeteerExtra} from 'puppeteer-extra'

import {UserAgentHelper} from './UserAgentHelper'
import {PptrToolkit} from './PptrToolkit'
import {ConnectParameters, DriverParameters, LaunchParameters} from './Driver.js'
import {ChromeUACHHeaders} from './DeviceDescriptor.js'
import {PptrPatcher} from './PptrPatcher'
import {FakeUserAction} from './FakeUserAction'
import {BrowserLauncher} from './BrowserLauncher'
import {BrowserBuilder} from './BrowserBuilder'
import {Touchscreen} from './TouchScreen'

export const kDefaultWindowsDD = require(path.resolve(__dirname, '../../device-hub-demo/Windows.json'))

const kBrowserMaxSurvivalTime = 60 * 1000 * 15
const kDefaultReferers = ['https://www.google.com', 'https://www.bing.com']
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
    '--disable-cookie-encryption',
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

    '--disable-new-content-rendering-timeout',
    '--disable-image-animation-resync',
    '--disable-partial-raster',

    '--blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4',

    // '--deterministic-mode',                          // Some friends commented that with this parameter mouse movement is stuck, so let's comment it out
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

// if (helper.inLinux()) {
//     kDefaultLaunchArgs.push(...[
//         '--single-process',              // Chrome does not run with single process in windows / macos, but it runs very well in linux (from Anton bro).
//     ])
// }

// Is there a friend class similar to C++ ?
// friend class BrowserLauncher
export class FakeBrowser {
    static Builder = BrowserBuilder

    static readonly globalConfig = {
        defaultBrowserMaxSurvivalTime: kBrowserMaxSurvivalTime,
        defaultReferers: kDefaultReferers,
        internalHttpServerPort: kInternalHttpServerPort,
        defaultLaunchArgs: kDefaultLaunchArgs,
    }

    readonly isMobileBrowser: boolean
    readonly userAction: FakeUserAction

    // friend to FakeUserAction
    private _zombie: boolean

    // private readonly _workerUrls: string[]

    get launchParams(): LaunchParameters {
        assert((this.driverParams as LaunchParameters).launchOptions)
        return this.driverParams as LaunchParameters
    }

    get connectParams(): ConnectParameters {
        assert((this.driverParams as ConnectParameters).connectOptions)
        return this.driverParams as ConnectParameters
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
        const result = await PptrToolkit.getActivePage(this.vanillaBrowser)
        return result
    }

    constructor(
        public readonly driverParams: DriverParameters,
        public readonly vanillaBrowser: Browser,
        public readonly pptrExtra: PuppeteerExtra,
        public readonly bindingTime: number,
        public readonly uuid: string,
    ) {
        assert(
            driverParams.deviceDesc
            && driverParams.deviceDesc.navigator
            && driverParams.deviceDesc.navigator.userAgent,
        )

        this.isMobileBrowser = UserAgentHelper.isMobile(driverParams.deviceDesc.navigator.userAgent)
        this.uuid = uuid
        this.userAction = new FakeUserAction(this)

        this._zombie = false
        // this._workerUrls = []

        vanillaBrowser.on('disconnected', this.onDisconnected.bind(this))

        if (!driverParams.doNotHook) {
            vanillaBrowser.on('targetcreated', this.onTargetCreated.bind(this))
        }
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
            await this.interceptTarget(target, cdpSession)
        } else if (targetType === 'page') {
            await this.interceptPage((await target.page())!)
        }
    }

    private async interceptWorker(worker: WebWorker) {
        assert(!!worker)

        const injectJs: string = await PptrPatcher.evasionsCode(this)
        await worker.evaluate(injectJs)
    }

    private async interceptTarget(target: Target, client: CDPSession) {
        assert(!!client)

        // FIXME: Worker & SharedWorker does not work with this way
        // console.log('intercept', target.url())
        const injectJs: string = await PptrPatcher.evasionsCode(this)

        await client.send('Runtime.evaluate', {
            expression: injectJs,
        })
    }

    async interceptPage(page: Page) {
        // console.log('inject page')
        let cdpSession: CDPSession | null = null

        const fakeDD = this.driverParams.fakeDeviceDesc
        assert(fakeDD)

        // if there is an account password that proxy needs to log in
        if (
            this.driverParams.proxy &&
            this.driverParams.proxy.username &&
            this.driverParams.proxy.password
        ) {
            await page.authenticate({
                username: this.driverParams.proxy.username,
                password: this.driverParams.proxy.password,
            })
        }

        // cdp
        try {
            await page['_client'].send('ServiceWorker.setForceUpdateOnPageLoad', {forceUpdateOnPageLoad: true})
        } catch (ex: any) {
            console.warn('CDP ServiceWorker.setForceUpdateOnPageLoad exception', ex)
        }

        // touch
        if (this.isMobileBrowser) {
            try {
                await page['_client'].send('Emulation.setEmitTouchEventsForMouse', {
                    enabled: true,
                })
            } catch (ex: any) {
                console.warn('CDP Emulation.setEmitTouchEventsForMouse exception', ex)
            }

            Object.defineProperty(page, '_patchTouchscreen', {
                value: new Touchscreen(page['_client'], page.keyboard),
            })
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
        // read version from the launched browser
        const ua = await this.vanillaBrowser.userAgent()
        const chromeMajorVersion = UserAgentHelper.chromeMajorVersion(ua)
        const os = UserAgentHelper.os(fakeDD.navigator.userAgent)

        assert(chromeMajorVersion)
        assert(os)

        const extraHTTPHeaders: ChromeUACHHeaders = {
            // MUST NOT SET ACCEPT-LANGUAGE!!!! : https://github.com/puppeteer/puppeteer/issues/1984
            // 'Accept-Language': UserAgentHelper.buildAcceptLanguage(fakeDD),
            // FIXME: error occurs after the referer is set
            // 'referer': FakeBrowser.globalConfig.defaultReferers[sh.rd(0, referers.length - 1)],
            'sec-ch-ua':
                UserAgentHelper.browserType(ua) === 'Edge'
                    ? `"Microsoft Edge";v="${chromeMajorVersion}", "Chromium";v="${chromeMajorVersion}", ";Not A Brand";v="99"`
                    : `"Google Chrome";v="${chromeMajorVersion}", "Chromium";v="${chromeMajorVersion}", ";Not A Brand";v="99"`,
            'sec-ch-ua-mobile': '?0',
            // 'sec-fetch-site': 'cross-site',
        }

        if (chromeMajorVersion >= 93) {
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
                ...pages.map(e => e.target()['_targetId']),
            )
        }

        const pagesFn = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(this.vanillaBrowser), 'pages')!.value.bind(this.vanillaBrowser)
        Object.defineProperty(Object.getPrototypeOf(this.vanillaBrowser), 'pages', {
            value: new Proxy(this.vanillaBrowser.pages, {
                async apply(target, thisArg, args) {
                    let pages: Page[] = await pagesFn()

                    // Maybe browser is created based on connect, with different instances
                    // so can only compare TargetId
                    pages = pages.filter(
                        e => !abandonedPageTargetIds.includes(e.target()['_targetId']),
                    )

                    return pages
                },
            }),
        })

    }
}

