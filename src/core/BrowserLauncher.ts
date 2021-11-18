import * as fs from 'fs-extra'
import * as path from 'path'
import * as URLToolkit from 'url-toolkit'
import * as http from 'http'
import {IncomingMessage, ServerResponse} from 'http'
import * as url from 'url'

import axios from 'axios'
import {Agent} from 'https'
import {strict as assert} from 'assert'

import Driver, {ConnectParameters, DriverParameters, LaunchParameters, VanillaLaunchOptions} from './Driver.js'
import DeviceDescriptorHelper, {FakeDeviceDescriptor} from './DeviceDescriptor.js'
import {PptrPatcher} from './PptrPatcher'
import {FakeBrowser} from './FakeBrowser'

const kFakeDDFileName = '__fakebrowser_fakeDD.json'
const kInternalHttpServerHeartbeatMagic = '__fakebrowser__&88ff22--'

export class BrowserLauncher {

    static _fakeBrowserInstances: FakeBrowser[] = []
    static _checkerIntervalId: NodeJS.Timer | null = null
    static _httpServer: http.Server | null = null

    private static checkLaunchOptionsLegal(options?: VanillaLaunchOptions) {
        if (!options || !options.args || !options.args.length) {
            return
        }

        // These args are set by FakeBrowser and cannot be set externally:
        const externalCannotSetArgs = [
            '--user-data-dir',
            '--lang',
            '--window-position',
            '--window-size',
        ]

        if (options.args.filter(
            e => externalCannotSetArgs.includes(e.toLocaleLowerCase().split('=')[0]),
        ).length > 0) {
            throw new TypeError(`${externalCannotSetArgs} cannot be set in options.args`)
        }
    }

    private static prepareFakeDeviceDesc(params: DriverParameters) {
        // Go to the userDataDir specified by the user and read the __fakebrowser_fakeDD.json file
        // or create it if it does not exist.

        const userDataDir = params.userDataDir
        assert(userDataDir)

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
                    : params.deviceDesc
            ) as FakeDeviceDescriptor

            DeviceDescriptorHelper.checkLegal(tempFakeDD)
        } catch (ex: any) {
            console.warn('FakeDD illegal')

            // It is possible that some fields are missing due to the deviceDesc update and need to recreate fakeDD
            const orgTempFakeDD = tempFakeDD

            tempFakeDD = params.deviceDesc as FakeDeviceDescriptor

            if (orgTempFakeDD) {
                tempFakeDD.fontSalt = orgTempFakeDD.fontSalt
                tempFakeDD.canvasSalt = orgTempFakeDD.canvasSalt
            }
        }

        const {
            fakeDeviceDesc,
            needsUpdate,
        } = DeviceDescriptorHelper.buildFakeDeviceDescriptor(tempFakeDD)

        if (needsUpdate) {
            fs.writeJsonSync(fakeDDPathName, fakeDeviceDesc, {spaces: 2})
        }

        params.fakeDeviceDesc = fakeDeviceDesc
    }

    static async connect(params: ConnectParameters): Promise<FakeBrowser> {
        await this.bootInternalHTTPServer()

        this.prepareFakeDeviceDesc(params)
        assert(params.fakeDeviceDesc)

        const uuid = DeviceDescriptorHelper.deviceUUID(params.fakeDeviceDesc)
        const {
            vanillaBrowser,
            pptrExtra,
        } = await Driver.connect(
            uuid,
            params,
        )

        const launchTime = new Date().getTime()
        const fb = new FakeBrowser(
            params,
            vanillaBrowser,
            pptrExtra,
            launchTime,
            uuid,
        )

        // pages 0 cannot be hook, lets drop it
        await fb._patchPages0Bug()

        return fb
    }

    static async launch(params: LaunchParameters): Promise<FakeBrowser> {
        this.bootBrowserSurvivalChecker()
        await this.bootInternalHTTPServer()

        // deviceDesc, userDataDir cannot be empty
        this.checkLaunchOptionsLegal(params.launchOptions)

        this.prepareFakeDeviceDesc(params)
        assert(params.fakeDeviceDesc)

        const uuid = DeviceDescriptorHelper.deviceUUID(params.fakeDeviceDesc)
        const {
            vanillaBrowser,
            pptrExtra,
        } = await Driver.launch(
            uuid,
            FakeBrowser.globalConfig.defaultLaunchArgs,
            params,
        )

        const launchTime = new Date().getTime()
        const fb = new FakeBrowser(
            params,
            vanillaBrowser,
            pptrExtra,
            launchTime,
            uuid,
        )

        // pages 0 cannot be hook, lets drop it
        await fb._patchPages0Bug()

        // Manage surviving browsers and kill them if they time out
        this._fakeBrowserInstances.push(fb)

        return fb
    }

    private static async bootInternalHTTPServer() {
        if (!this._httpServer) {
            this._httpServer = http.createServer()

            this._httpServer.on('request', async (req: IncomingMessage, res: ServerResponse) => {
                assert(req.url)
                const {query, pathname} = url.parse(req.url, true)

                if (pathname === '/hb') {
                    res.write(kInternalHttpServerHeartbeatMagic)
                    res.end()
                }

                if (pathname === '/patchWorker') {
                    const relUrl = query['relUrl'] as string
                    const workerUrl = query['workerUrl'] as string
                    const uuid = query['uuid'] as string

                    const fullUrl = URLToolkit.buildAbsoluteURL(relUrl, workerUrl)

                    console.log('request worker content from: ', fullUrl)

                    // Object.fromEntries ES2019
                    const reqHeaders = Object.fromEntries(
                        Object.entries(
                            req.headers,
                        ).map(
                            e => ([e[0], e[1]![0]]),
                        ),
                    )

                    delete reqHeaders['host']

                    // TODO: get through proxy
                    const jsResp = await axios.get(
                        fullUrl, {
                            headers: reqHeaders,
                            httpsAgent: new Agent({
                                rejectUnauthorized: false,
                            }),
                        },
                    )

                    let jsContent = jsResp.data
                    const browser = BrowserLauncher.getBrowserWithUUID(uuid)

                    if (browser) {
                        jsContent = await PptrPatcher.patchWorkerJsContent(browser, jsContent)
                    }

                    const respHeaders = jsResp.headers as NodeJS.Dict<string>
                    delete respHeaders['content-length']

                    res.writeHead(
                        jsResp.status,
                        jsResp.statusText,
                        respHeaders,
                    )

                    res.write(jsContent)
                    res.end()
                }
            })

            // If the port listens to errors, determine if the heartbeat interface is successful
            try {
                this._httpServer.listen(FakeBrowser.globalConfig.internalHttpServerPort)
            } catch (ex: any) {
                const hbUrl = `http://127.0.0.1:${FakeBrowser.globalConfig.internalHttpServerPort}/hb`
                try {
                    const hbData = (await axios.get(hbUrl)).data
                    if (hbData === kInternalHttpServerHeartbeatMagic) {
                        try {
                            this._httpServer.close()
                        } finally {
                            this._httpServer = null
                        }

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
                        && (new Date().getTime() > e.bindingTime + e.launchParams.maxSurvivalTime),
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

            if (this._httpServer) {
                try {
                    this._httpServer.close()
                } finally {
                    this._httpServer = null
                }
            }
        }
    }
}
