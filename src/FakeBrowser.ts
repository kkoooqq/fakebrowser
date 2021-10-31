import {Browser} from "puppeteer";
import Driver, {FakeBrowserLaunchOptions, LaunchParameters, ProxyServer} from "./Driver.js";
import DeviceDescriptorHelper, {DeviceDescriptor, FakeDeviceDescriptor} from "./DeviceDescriptor.js";
import {strict as assert} from 'assert';
import {PuppeteerExtra} from "puppeteer-extra";
import * as fs from "fs-extra";
import * as path from "path";

const kWindowsDD = require('./device-hub/Windows.json')
const kFakeDDFileName = '__fakebrowser_fakeDD.json'
const kBrowserMaxSurvivalTime = 60 * 1000 * 10

class FakeBrowserBuilder {

    private readonly _launchParams: LaunchParameters

    constructor() {
        this._launchParams = {
            deviceDesc: kWindowsDD,
            userDataDir: "",
            maxSurvivalTime: kBrowserMaxSurvivalTime,
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

    async launch(options?: FakeBrowserLaunchOptions): Promise<FakeBrowser> {
        const result = FakeBrowserLauncher.launch(this._launchParams, options)
        return result
    }
}

class FakeBrowserLauncher {

    static _browserInstances: Array<FakeBrowser> = []
    static _checkerIntervalId: NodeJS.Timer | null = null

    private static checkOptionsLegal(options?: FakeBrowserLaunchOptions) {
        if (!options || !options.args || !options.args.length) {
            return
        }

        // These args are set by FakeBrowser and cannot be set externally: These values cannot be set externally:
        const externalCannotSetArgs = [
            '--user-data-dir',
            '--lang',
            '--window-position',
            '--window-size'
        ]

        if (options.args.filter(e => externalCannotSetArgs.includes(e.toLocaleLowerCase().split('=')[0])).length > 0) {
            throw new TypeError(`${externalCannotSetArgs} cannot not be set in options.args`)
        }
    }

    private static checkLaunchParamsLegal(launchParams: LaunchParameters) {
        // deviceDesc must be set
        const deviceDesc: DeviceDescriptor = launchParams.deviceDesc
        assert(deviceDesc, 'deviceDesc must be set')

        assert(DeviceDescriptorHelper.isLegal(deviceDesc), 'deviceDesc illegal')

        // user data dir
        // Browser fingerprint data FakeDeviceDescriptor will not change after generated, so we can use its UUID for user-data-dir.
        // The userDataDir in launchParameters must be set, and we will splice UUID after the path.
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

    static async launch(
        launchParams: LaunchParameters
        , options?: FakeBrowserLaunchOptions
    ): Promise<FakeBrowser> {
        // deviceDesc, userDataDir cannot be empty
        this.checkLaunchParamsLegal(launchParams)
        this.checkOptionsLegal(options)

        this.prepareFakeDeviceDesc(launchParams)

        assert(launchParams.fakeDeviceDesc)

        const launchTime = new Date().getTime()
        const uuid = DeviceDescriptorHelper.deviceUUID(launchParams.fakeDeviceDesc)

        const {
            browser,
            pptr
        } = await Driver.launch(uuid, launchParams, options)

        const result = new FakeBrowser(
            launchParams,
            browser,
            pptr,
            launchTime,
            launchParams.maxSurvivalTime,
            uuid
        )

        // Manage surviving browsers and kill them if they time out
        this._browserInstances.push(result)

        if (!this._checkerIntervalId) {
            this._checkerIntervalId = setInterval(async () => {
                const killTheseBrowsers = this._browserInstances.filter(
                    e =>
                        (e.launchParams.maxSurvivalTime > 0)
                        && (new Date().getTime() > e.launchTime + e.launchParams.maxSurvivalTime)
                )

                const p: Array<Promise<void>> = []
                for (const fb of killTheseBrowsers) {
                    p.push(this.shutdown(fb))
                }

                await Promise.all(p)
            }, 5 * 1000)
        }

        return result
    }

    static getBrowserWithUUID(uuid: string): FakeBrowser | undefined {
        return this._browserInstances.find(e => e.uuid === uuid)
    }

    static async shutdown(fb: FakeBrowser) {
        await Driver.shutdown(fb.vanillaBrowser)

        const browserIndex = this._browserInstances.indexOf(fb)
        assert(browserIndex >= 0)

        this._browserInstances.splice(browserIndex, 1)
    }
}

// Is there a friend class similar to C++ ?
// friend class FakeBrowserLauncher
export class FakeBrowser {
    static Builder = FakeBrowserBuilder

    private readonly _launchParams: LaunchParameters
    private readonly _vanillaBrowser: Browser
    private readonly _pptrExtra: PuppeteerExtra
    private readonly _launchTime: number
    private readonly _uuid: string

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

    async shutdown() {
        await FakeBrowserLauncher.shutdown(this)
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
    }

}

