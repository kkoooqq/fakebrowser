import { strict as assert } from 'assert'
import * as fs from 'fs-extra'

import { addExtra, PuppeteerExtra, PuppeteerExtraPlugin } from 'puppeteer-extra'
import { Browser, BrowserConnectOptions, BrowserLaunchArgumentOptions, ConnectOptions, LaunchOptions } from 'puppeteer'

import DeviceDescriptorHelper, { DeviceDescriptor, FakeDeviceDescriptor } from './DeviceDescriptor.js'
import { UserAgentHelper } from './UserAgentHelper.js'
import { PptrPatcher } from './PptrPatcher'

export interface ProxyServer {
    proxyType: 'socks5' | 'socks4' | 'http' | 'https',
    ipType: 'host' | 'pppoe' | 'resident' | 'tor',
    proxy: string,
    exportIP: string,
    username?: string,
    password?: string,
}

export type VanillaLaunchOptions = LaunchOptions & BrowserLaunchArgumentOptions & BrowserConnectOptions
export type VanillaConnectOptions = ConnectOptions

export interface DriverParameters {
    doNotHook: boolean,
    deviceDesc: DeviceDescriptor,
    fakeDeviceDesc?: FakeDeviceDescriptor,
    displayUserActionLayer?: boolean,
    log?: boolean,
    proxy?: ProxyServer,
    userDataDir?: string,
    evasionPaths: string[],
    usePlugins: PuppeteerExtraPlugin[],
}

export interface LaunchParameters extends DriverParameters {
    maxSurvivalTime: number,
    launchOptions: VanillaLaunchOptions,
}

export interface ConnectParameters extends DriverParameters {
    connectOptions: VanillaConnectOptions,
}

export const kDefaultTimeout = 15 * 1000

export const kDefaultLaunchOptions = {
    headless: true,
    devtools: false,
    timeout: kDefaultTimeout,
}

export default class Driver {

    private static checkParamsLegal(params: DriverParameters) {
        // deviceDesc must be set
        const dd: DeviceDescriptor = params.deviceDesc
        assert(dd, 'deviceDesc must be set')

        DeviceDescriptorHelper.checkLegal(dd)

        // user data dir
        // The userDataDir in launchParameters must be set
        assert(params.userDataDir, 'userDataDir must be set')
    }

    /**
     * Connect to browser
     * @param uuid
     * @param params
     */
    static async connect(
        uuid: string,
        params: ConnectParameters,
    ): Promise<{
        vanillaBrowser: Browser,
        pptrExtra: PuppeteerExtra,
    }> {
        // Different instances with different puppeteer configurations
        const pptr = addExtra(require('puppeteer'))

        // patch with evasions
        if (!params.doNotHook) {
            await PptrPatcher.patch(
                uuid,
                pptr,
                params,
            )
        }

        const fakeDD = params.fakeDeviceDesc
        assert(!!fakeDD)

        const browser: Browser = await pptr.connect(params.connectOptions)
        await this.patchUAFromLaunchedBrowser(browser, fakeDD)

        return {
            vanillaBrowser: browser,
            pptrExtra: pptr,
        }
    }

    /**
     * Launch browser
     * @param uuid
     * @param defaultLaunchArgs
     * @param params
     */
    static async launch(
        uuid: string,
        defaultLaunchArgs: string[],
        params: LaunchParameters,
    ): Promise<{
        vanillaBrowser: Browser,
        pptrExtra: PuppeteerExtra,
    }> {
        this.checkParamsLegal(params)

        if (
            !params.launchOptions
            || Object.keys(params.launchOptions).length === 0
        ) {
            params.launchOptions = kDefaultLaunchOptions
        }

        this.patchLaunchArgs(defaultLaunchArgs, params)

        // Different instances with different puppeteer configurations
        const pptr = addExtra(require('puppeteer'))

        // patch with evasions
        if (!params.doNotHook) {
            await PptrPatcher.patch(
                uuid,
                pptr,
                params,
            )
        }

        const fakeDD = params.fakeDeviceDesc
        assert(!!fakeDD)

        const browser: Browser = await pptr.launch(params.launchOptions)
        await this.patchUAFromLaunchedBrowser(browser, fakeDD)

        return {
            vanillaBrowser: browser,
            pptrExtra: pptr,
        }
    }

    private static async patchUAFromLaunchedBrowser(browser: Browser, fakeDD: FakeDeviceDescriptor) {
        // read major version from the launched browser and replace dd.userAgent
        const orgUA = await browser.userAgent()
        const orgVersion = UserAgentHelper.chromeVersion(orgUA)
        const fakeVersion = UserAgentHelper.chromeVersion(fakeDD.navigator.userAgent)

        assert(orgVersion)
        assert(fakeVersion)

        fakeDD.navigator.userAgent = fakeDD.navigator.userAgent.replace(fakeVersion, orgVersion)
        fakeDD.navigator.appVersion = fakeDD.navigator.appVersion.replace(fakeVersion, orgVersion)
    }

    private static patchLaunchArgs(defaultLaunchArgs: string[], launchParams: LaunchParameters) {
        // args
        // noinspection SuspiciousTypeOfGuard
        assert(defaultLaunchArgs instanceof Array)

        const args = [
            ...defaultLaunchArgs,
            ...(launchParams.launchOptions.args || []),
        ]

        const fakeDD = launchParams.fakeDeviceDesc
        assert(!!fakeDD)

        // Modify default options
        launchParams.launchOptions = {
            ignoreHTTPSErrors: true,
            ignoreDefaultArgs: [
                '--enable-automation',
                '--enable-blink-features=IdleDetection',
            ],
            handleSIGINT: false,
            handleSIGTERM: false,
            handleSIGHUP: false,
            pipe: true,
            defaultViewport: {
                width: fakeDD.window.innerWidth,
                height: fakeDD.window.innerHeight,
                deviceScaleFactor: fakeDD.window.devicePixelRatio,
                isMobile: UserAgentHelper.isMobile(fakeDD.navigator.userAgent),
                hasTouch: fakeDD.navigator.maxTouchPoints > 0,
                isLandscape: false,
            },
            ...launchParams.launchOptions,
            args,
        }

        // headless
        let headless = launchParams.launchOptions.headless
        if ('undefined' === typeof headless) {
            headless = true
        }

        if (launchParams.launchOptions.devtools) {
            headless = false
        }

        // proxy
        if (launchParams.proxy) {
            args.push(
                `--proxy-server=${launchParams.proxy.proxy}`,
            )
        }

        // browser language
        assert(fakeDD.acceptLanguage)
        args.push(
            `--lang=${fakeDD.acceptLanguage}`,
        )

        const userDataDir = launchParams.userDataDir
        assert(userDataDir)
        fs.mkdirSync(userDataDir, { recursive: true }) // throw exception

        args.push(
            `--user-data-dir=${userDataDir}`,
        )

        // window position & window size
        let {
            screenX,
            screenY,
            innerWidth,
            innerHeight,
            outerWidth,
            outerHeight,
        } = fakeDD.window

        outerWidth = outerWidth || innerWidth
        outerHeight = outerHeight || (innerHeight + 85)
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
            )
        }
    }

    private static async getPids(pid: string | number): Promise<number[]> {
        if ('string' === typeof (pid)) {
            pid = parseInt(pid)
        }

        try {
            const pidtree = require('pidtree')
            const pids: number[] = await pidtree(pid)
            return pids.includes(pid) ? pids : [...pids, pid]
        } catch (ignored: any) {
            return [pid]
        }
    }

    /**
     * Shutdown browser
     * @param browser
     */
    static async shutdown(browser: Browser) {
        const pid = browser.process()?.pid;
        const pids = pid ? await helper.getPids(pid) : [];

        try {
            await browser.close();
        } catch (ignored) {}

        pids.forEach((pid) => {
            try {
                process.kill(pid, 'SIGKILL');
            } catch (ignored) {}
        });
    }
}
