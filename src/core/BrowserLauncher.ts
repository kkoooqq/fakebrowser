import * as fs from "fs-extra";
import * as path from "path";
import * as URLToolkit from 'url-toolkit'
import * as http from "http";

import axios from "axios";
import express, {Application} from "express";
import {Agent} from "https";
import {strict as assert} from 'assert';

import Driver, {LaunchParameters, VanillaLaunchOptions} from "./Driver.js";
import DeviceDescriptorHelper, {DeviceDescriptor, FakeDeviceDescriptor} from "./DeviceDescriptor.js";
import {PptrPatcher} from "./PptrPatcher";
import {FakeBrowser} from "./FakeBrowser";

const kFakeDDFileName = '__fakebrowser_fakeDD.json'
const kInternalHttpServerHeartbeatMagic = '__fakebrowser__&88ff22--'

export class BrowserLauncher {

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
        let tempFakeDD: FakeDeviceDescriptor | null = null

        try {
            tempFakeDD = (
                fs.existsSync(fakeDDPathName)
                    ? fs.readJsonSync(fakeDDPathName)
                    : launchParams.deviceDesc
            ) as FakeDeviceDescriptor

            DeviceDescriptorHelper.checkLegal(tempFakeDD)
        } catch (ex: any) {
            console.warn('FakeDD illegal')

            // It is possible that some fields are missing due to the deviceDesc update and need to recreate fakeDD
            const orgTempFakeDD = tempFakeDD

            tempFakeDD = launchParams.deviceDesc as FakeDeviceDescriptor

            if (orgTempFakeDD) {
                tempFakeDD.fontSalt = orgTempFakeDD.fontSalt
                tempFakeDD.canvasSalt = orgTempFakeDD.canvasSalt
            }
        }

        const {
            fakeDeviceDesc,
            needsUpdate
        } = DeviceDescriptorHelper.buildFakeDeviceDescriptor(tempFakeDD)

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

        // pages 0 cannot be hook, lets drop it
        await fb._patchPages0Bug()

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

                // Object.fromEntries ES2019
                const reqHeaders = Object.fromEntries(
                    Object.entries(
                        req.headers
                    ).map(
                        e => ([e[0], e[1]![0]])
                    )
                )

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
                const browser = BrowserLauncher.getBrowserWithUUID(uuid)

                if (browser) {
                    jsContent = await PptrPatcher.patchWorkerJsContent(browser, jsContent)
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
