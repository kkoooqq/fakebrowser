// noinspection JSUnusedGlobalSymbols,JSUnusedLocalSymbols

import * as fs from "fs-extra";
import * as path from "path";
import * as URLToolkit from 'url-toolkit'
import * as http from "http";

import axios from "axios";
import * as express from "express";
import {Express} from "express";
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

const kDefaultWindowsDD = require(path.resolve(__dirname, '../../device-hub/Windows.json'))
const kFakeDDFileName = '__fakebrowser_fakeDD.json'
const kBrowserMaxSurvivalTime = 60 * 1000 * 15
const kDefaultReferers = ["https://www.google.com", "https://www.bing.com"]
const kInternalHttpServerPort = 17311

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
    static _app: Express | null = null
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

        if (options.args.filter(e => externalCannotSetArgs.includes(e.toLocaleLowerCase().split('=')[0])).length > 0) {
            throw new TypeError(`${externalCannotSetArgs} cannot be set in options.args`)
        }
    }

    private static checkLaunchParamsLegal(launchParams: LaunchParameters) {
        // deviceDesc must be set
        const dd: DeviceDescriptor = launchParams.deviceDesc
        assert(dd, 'deviceDesc must be set')

        assert(DeviceDescriptorHelper.isLegal(dd), 'deviceDesc illegal')

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
        this.bootInternalHTTPServer()

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
        } = await Driver.launch(uuid, launchParams)

        const fb = new FakeBrowser(
            launchParams,
            vanillaBrowser,
            pptrExtra,
            launchTime,
            launchParams.maxSurvivalTime,
            uuid
        )

        // browser.pages()[0] will not fire onTargetCreated, so we need to inject it manually.
        const pages = await vanillaBrowser.pages()
        if (pages.length > 0) {
            for (const page of pages) {
                // await fb.interceptPage(page)

                // FIXME: pages[0] keeps failing to hook effectively, I have to turn it off.
                await page.close()
            }
        }

        // Manage surviving browsers and kill them if they time out
        this._fakeBrowserInstances.push(fb)

        return fb
    }

    private static bootInternalHTTPServer() {
        if (!this._app) {
            this._app = express()
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
                    })

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

            this._appServer = this._app.listen(FakeBrowser.globalConfig.internalHttpServerPort)
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
                    p.push(this.shutdown(fb))
                }

                await Promise.all(p)
            }, 5 * 1000)
        }
    }

    static getBrowserWithUUID(uuid: string): FakeBrowser | undefined {
        return this._fakeBrowserInstances.find(e => e.uuid === uuid)
    }

    static async shutdown(fb: FakeBrowser) {
        if (fb.zombie) {
            console.warn('This instance has been shutdown and turned into a zombie.')
        } else {
            fb.zombie = true
            await Driver.shutdown(fb.vanillaBrowser)

            const browserIndex = this._fakeBrowserInstances.indexOf(fb)
            assert(browserIndex >= 0)

            this._fakeBrowserInstances.splice(browserIndex, 1)

            // If all browsers have exited, close internal http service
            if (this._fakeBrowserInstances.length === 0) {
                // console.log('close appserver')
                this._app = null
                this._appServer!.close()
            }
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

    get zombie(): boolean {
        return this._zombie
    }

    set zombie(value: boolean) {
        this._zombie = value
    }

    async shutdown() {
        if (!this._zombie) {
            await FakeBrowserLauncher.shutdown(this)
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

    private async onDisconnected() {
        if (!this._zombie) {
            await this.shutdown()
        }
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
        let langs: string = fakeDD.navigator.languages
            ? fakeDD.navigator.languages.join(',')
            : fakeDD.navigator.language

        if (langs && langs.length) {
            langs += ';q=0.9'
        }

        // FIXME: read version from the launched browser
        const chromeVersion = UserAgentHelper.chromeMajorVersion(fakeDD.navigator.userAgent)
        const os = UserAgentHelper.os(fakeDD.navigator.userAgent)

        assert(chromeVersion)
        assert(os)

        const extraHTTPHeaders: ChromeUACHHeaders = {
            'Accept-Language': langs ?? '',
            // FIXME: error occurs after the referer is set
            // 'referer': FakeBrowser.globalConfig.defaultReferers[sh.rd(0, referers.length - 1)],
            'sec-ch-ua':
                this._launchParams.launchOptions.executablePath && this._launchParams.launchOptions.executablePath.toLowerCase().includes('edge')
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
}

