import {strict as assert} from 'assert';
import * as fs from "fs-extra";

import {addExtra, PuppeteerExtra} from "puppeteer-extra";
import {Browser, BrowserConnectOptions, BrowserLaunchArgumentOptions, LaunchOptions} from "puppeteer";

import {DeviceDescriptor, FakeDeviceDescriptor} from "./DeviceDescriptor.js";
import {UserAgentHelper} from "./UserAgentHelper.js";
import {PptrPatcher} from "./PptrPatcher";

export interface ProxyServer {
    proxy: string,
    exportIP: string,
    username?: string,
    password?: string,
}

export type VanillaLaunchOptions = LaunchOptions & BrowserLaunchArgumentOptions & BrowserConnectOptions

export interface LaunchParameters {
    deviceDesc: DeviceDescriptor,
    fakeDeviceDesc?: FakeDeviceDescriptor,
    displayUserActionLayer?: boolean,
    userDataDir: string,
    maxSurvivalTime: number,
    proxy?: ProxyServer,
    log?: boolean,
    launchOptions: VanillaLaunchOptions,
}

export const kDefaultTimeout = 15 * 1000

export const kDefaultLaunchOptions = {
    headless: true,
    devtools: false,
    timeout: kDefaultTimeout,
}

export default class Driver {

    /**
     * Launch browser
     * @param uuid
     * @param defaultLaunchArgs
     * @param launchParams
     */
    static async launch(
        uuid: string,
        defaultLaunchArgs: string[],
        launchParams: LaunchParameters,
    ): Promise<{
        vanillaBrowser: Browser,
        pptrExtra: PuppeteerExtra,
    }> {
        if (
            !launchParams.launchOptions
            || Object.keys(launchParams.launchOptions).length === 0
        ) {
            launchParams.launchOptions = kDefaultLaunchOptions
        }

        // args
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
                '--enable-blink-features=IdleDetection'
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
                `--proxy-server=${launchParams.proxy.proxy}`
            )
        }

        // browser language
        if (
            (fakeDD.navigator.languages && fakeDD.navigator.languages.length)
            || fakeDD.navigator.language
        ) {
            const lang = (fakeDD.navigator.languages || []).length
                ? fakeDD.navigator.languages.join(',')
                : fakeDD.navigator.language

            args.push(
                `--lang=${lang};q=0.9`
            )
        }

        const userDataDir = launchParams.userDataDir
        fs.mkdirSync(userDataDir, {recursive: true}) // throw exception

        args.push(
            `--user-data-dir=${userDataDir}`
        )

        // window position & window size
        let {
            screenX,
            screenY,
            innerWidth,
            innerHeight,
            outerWidth,
            outerHeight
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

        // Different instances with different puppeteer configurations
        const pptr = addExtra(require('puppeteer'))

        // patch with evasions
        await PptrPatcher.patch(
            uuid,
            pptr,
            launchParams,
        )

        // noinspection UnnecessaryLocalVariableJS
        const browser: Browser = await pptr.launch(launchParams.launchOptions)

        // read major version from the launched browser and replace dd.userAgent
        const orgUA = await browser.userAgent()
        const orgVersion = UserAgentHelper.chromeVersion(orgUA)
        const fakeVersion = UserAgentHelper.chromeVersion(fakeDD.navigator.userAgent)

        assert(orgVersion)
        assert(fakeVersion)

        fakeDD.navigator.userAgent = fakeDD.navigator.userAgent.replace(fakeVersion, orgVersion)
        fakeDD.navigator.appVersion = fakeDD.navigator.appVersion.replace(fakeVersion, orgVersion)

        return {
            vanillaBrowser: browser,
            pptrExtra: pptr
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
