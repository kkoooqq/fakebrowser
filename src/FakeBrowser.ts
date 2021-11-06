// noinspection JSUnusedGlobalSymbols,JSUnusedLocalSymbols

import * as fs from "fs-extra";
import * as path from "path";
import * as URLToolkit from 'url-toolkit'
import * as http from "http";

import axios from "axios";
import express, {Application} from "express";
import {Agent} from "https";

import {Browser, CDPSession, Page, Target} from "puppeteer";
import {strict as assert} from 'assert';
import {PuppeteerExtra} from "puppeteer-extra";

import Driver, {LaunchParameters, ProxyServer, VanillaLaunchOptions} from "./Driver.js";
import DeviceDescriptorHelper, {ChromeUACHHeaders, DeviceDescriptor, FakeDeviceDescriptor} from "./DeviceDescriptor.js";
import {PptrPatcher} from "./PptrPatcher";
import {UserAgentHelper} from "./UserAgentHelper";
import {PptrToolkit} from "./PptrToolkit";
import {FakeUserAction} from "./FakeUserAction";
import {helper} from "./helper";

const kDefaultWindowsDD = require(path.resolve(__dirname, '../../device-hub/Windows.json'))
const kFakeDDFileName = '__fakebrowser_fakeDD.json'
const kBrowserMaxSurvivalTime = 60 * 1000 * 15
const kDefaultReferers = ["https://www.google.com", "https://www.bing.com"]
const kInternalHttpServerPort = 17311
const kInternalHttpServerHeartbeatMagic = '__fakebrowser__&88ff22--'

// chromium startup parameters
// https://peter.sh/experiments/chromium-command-line-switches/
// https://www.scrapehero.com/how-to-increase-web-scraping-speed-using-puppeteer/
// noinspection TypeScriptValidateJSTypes,SpellCheckingInspection
const kDefaultLaunchArgs = [
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

class FakeBrowserBuilder {

    private readonly _launchParams: LaunchParameters

    constructor() {
        this._launchParams = {
            deviceDesc: kDefaultWindowsDD,
            userDataDir: "",
            maxSurvivalTime: FakeBrowser.globalConfig.defaultBrowserMaxSurvivalTime,
            launchOptions: {}
        }
    }

    get launchParams(): LaunchParameters {
        return this._launchParams
    }

    maxSurvivalTime(value: number) {
        this._launchParams.maxSurvivalTime = value
        return this
    }

    deviceDescriptor(value: FakeDeviceDescriptor) {
        this._launchParams.deviceDesc = value
        return this
    }

    displayUserActionLayer(value: boolean) {
        this._launchParams.displayUserActionLayer = value
        return this
    }

    userDataDir(value: string) {
        this._launchParams.userDataDir = value
        return this
    }

    log(value: boolean) {
        this._launchParams.log = value
        return this
    }

    proxy(value: ProxyServer) {
        this._launchParams.proxy = value
        return this
    }

    vanillaLaunchOptions(value: VanillaLaunchOptions) {
        this._launchParams.launchOptions = value
        return this
    }

    async launch(): Promise<FakeBrowser> {
        const result = FakeBrowserLauncher.launch(this._launchParams)
        return result
    }
}

class FakeBrowserLauncher {

    static _fakeBrowserInstances: FakeBrowser[] = []
    static _checkerIntervalId: NodeJS.Timer | null = null
    static _app: Application | null = null
    static _appServer: http.Server | null = null

    private static checkOptionsLegal(options?: VanillaLaunchOptions) {
        if (!options || !options.args || !options.args.length) {
            return
        }

        // These args are set by FakeBrowser and cannot be set externally:
        const externalCannotSetArgs = [
            '--user-data-dir',
            '--lang',
            '--window-position',
            '--window-size'
        ]

        if (options.args.filter(
            e => externalCannotSetArgs.includes(e.toLocaleLowerCase().split('=')[0])
        ).length > 0) {
            throw new TypeError(`${externalCannotSetArgs} cannot be set in options.args`)
        }
    }

    private static checkLaunchParamsLegal(launchParams: LaunchParameters) {
        // deviceDesc must be set
        const dd: DeviceDescriptor = launchParams.deviceDesc
        assert(dd, 'deviceDesc must be set')

        DeviceDescriptorHelper.checkLegal(dd)

        // user data dir
        // The userDataDir in launchParameters must be set
        assert(launchParams.userDataDir, 'userDataDir must be set')
    }

    private static prepareFakeDeviceDesc(launchParams: LaunchParameters) {
        // Go to the userDataDir specified by the user and read the __fakebrowser_fakeDD.json file
        // or create it if it does not exist.

        const userDataDir = launchParams.userDataDir

        if (!fs.existsSync(userDataDir)) {
            // may throw
            fs.mkdirSync(userDataDir, {recursive: true})
        }

        // Read from existing files, or generate if not available.
        const fakeDDPathName = path.resolve(userDataDir, `./${kFakeDDFileName}`)
        const tempFakeDD = (fs.existsSync(fakeDDPathName) ? fs.readJsonSync(fakeDDPathName) : launchParams.deviceDesc) as FakeDeviceDescriptor

        const {fakeDeviceDesc, needsUpdate} = DeviceDescriptorHelper.buildFakeDeviceDescriptor(tempFakeDD)
        if (needsUpdate) {
            fs.writeJsonSync(fakeDDPathName, fakeDeviceDesc, {spaces: 2})
        }

        launchParams.fakeDeviceDesc = fakeDeviceDesc
    }

    static async launch(launchParams: LaunchParameters): Promise<FakeBrowser> {
        this.bootBrowserSurvivalChecker();
        await this.bootInternalHTTPServer()

        // deviceDesc, userDataDir cannot be empty
        this.checkLaunchParamsLegal(launchParams)
        this.checkOptionsLegal(launchParams.launchOptions)

        this.prepareFakeDeviceDesc(launchParams)

        assert(launchParams.fakeDeviceDesc)

        const launchTime = new Date().getTime()
        const uuid = DeviceDescriptorHelper.deviceUUID(launchParams.fakeDeviceDesc)

        const {
            vanillaBrowser,
            pptrExtra
        } = await Driver.launch(
            uuid,
            FakeBrowser.globalConfig.defaultLaunchArgs,
            launchParams
        )

        const fb = new FakeBrowser(
            launchParams,
            vanillaBrowser,
            pptrExtra,
            launchTime,
            launchParams.maxSurvivalTime,
            uuid
        )

        // Manage surviving browsers and kill them if they time out
        this._fakeBrowserInstances.push(fb)

        return fb
    }

    private static async bootInternalHTTPServer() {
        if (!this._app) {
            this._app = express()

            this._app.get('/hb', async (req, res) => {
                res.send(kInternalHttpServerHeartbeatMagic)
            })

            this._app.get('/patchWorker', async (req, res) => {
                const relUrl = req.query['relUrl'] as string
                const workerUrl = req.query['workerUrl'] as string
                const uuid = req.query['uuid'] as string

                const fullUrl = URLToolkit.buildAbsoluteURL(relUrl, workerUrl)

                console.log('request worker content from: ', fullUrl)

                const reqHeaders = Object.fromEntries(Object.entries(req.headers).map(e => ([e[0], e[1]![0]])))
                delete reqHeaders.host

                const jsResp = await axios.get(
                    fullUrl, {
                        headers: reqHeaders,
                        httpsAgent: new Agent({
                            rejectUnauthorized: false
                        })
                    }
                )

                let jsContent = jsResp.data
                const browser = FakeBrowserLauncher.getBrowserWithUUID(uuid)

                if (browser) {
                    jsContent = await PptrPatcher.patchWorkerJsContent(browser.pptrExtra, jsContent)
                }

                for (const {name, value} of Object.entries(jsResp.headers).map(e => ({
                    name: e[0],
                    value: e[1] as string
                }))) {
                    if (name.toLowerCase() != 'content-length') {
                        res.header(name, value)
                    }
                }

                res.send(jsContent)
            })

            // If the port listens to errors, determine if the heartbeat interface is successful
            try {
                this._appServer = this._app.listen(FakeBrowser.globalConfig.internalHttpServerPort)
            } catch (ex: any) {
                const hbUrl = `http://127.0.0.1:${FakeBrowser.globalConfig.internalHttpServerPort}/hb`
                try {
                    const hbData = (await axios.get(hbUrl)).data
                    if (hbData === kInternalHttpServerHeartbeatMagic) {
                        return
                    }
                } catch (ignore: any) {
                }

                throw ex
            }
        }
    }

    private static bootBrowserSurvivalChecker() {
        if (!this._checkerIntervalId) {
            this._checkerIntervalId = setInterval(async () => {
                const killThese = this._fakeBrowserInstances.filter(
                    e =>
                        (e.launchParams.maxSurvivalTime > 0)
                        && (new Date().getTime() > e.launchTime + e.launchParams.maxSurvivalTime)
                )

                const p: Promise<void>[] = []
                for (const fb of killThese) {
                    p.push(fb.shutdown())
                }

                await Promise.all(p)
            }, 5 * 1000)
        }
    }

    static getBrowserWithUUID(uuid: string): FakeBrowser | undefined {
        return this._fakeBrowserInstances.find(e => e.uuid === uuid)
    }

    static async _forceShutdown(fb: FakeBrowser) {
        await Driver.shutdown(fb.vanillaBrowser)

        const browserIndex = this._fakeBrowserInstances.indexOf(fb)
        assert(browserIndex >= 0)

        this._fakeBrowserInstances.splice(browserIndex, 1)

        // If all browsers have exited, close internal http service
        if (this._fakeBrowserInstances.length === 0) {
            // console.log('close appserver')
            this._appServer!.close()
            this._app = null
        }
    }
}

// Is there a friend class similar to C++ ?
// friend class FakeBrowserLauncher
export class FakeBrowser {
    static Builder = FakeBrowserBuilder

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
            await FakeBrowserLauncher._forceShutdown(this)
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

        // pages 0 cannot be hook, lets drop it
        this.patchPages0Bug().then(e => e)

        vanillaBrowser.on('targetcreated', this.onTargetCreated.bind(this))
        vanillaBrowser.on('disconnected', this.onDisconnected.bind(this))
    }

    private onDisconnected() {
        return this.shutdown()
    }

    private async onTargetCreated(target: Target) {
        // console.log('targetcreated type:', target.type(), target.url())

        const targetType = target.type()

        if (
            targetType === 'service_worker'
            || targetType === 'other' && (target.url().startsWith('http'))
        ) {
            const cdpSession = await target.createCDPSession()
            await this.interceptWorker(target, cdpSession);
        } else if (targetType === 'page') {
            await this.interceptPage((await target.page())!)
        }
    }

    private async interceptWorker(target: Target, client: CDPSession) {
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

        return {page, cdpSession}
    }

    private async patchPages0Bug() {
        // pages[0] keeps failing to hook effectively
        // But I can't close it, because in windows, closing this page will cause the whole browser to close
        // So I can only make it inaccessible to users

        const abandonedPages: Page[] = []

        const pages = await this.vanillaBrowser.pages()
        if (pages.length > 0) {
            abandonedPages.push(...pages)
        }

        Object.defineProperty(this.vanillaBrowser, 'pages', {
            value: new Proxy(this.vanillaBrowser.pages, {
                async apply(target, thisArg, args) {
                    let pages: Page[] = await Reflect.apply(target, thisArg, args)
                    pages = pages.filter(e => !abandonedPages.includes(e))

                    return pages
                }
            })
        })

    }
}

