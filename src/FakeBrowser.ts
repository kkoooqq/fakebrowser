import {Browser} from "puppeteer";
import Driver, {FakeBrowserLaunchOptions, LaunchParameters, ProxyServer} from "./Driver.js";
import DeviceDescriptorHelper, {DeviceDescriptor, FakeDeviceDescriptor} from "./DeviceDescriptor.js";
import {strict as assert} from 'assert';
import {PuppeteerExtra} from "puppeteer-extra";

const windowsDD = require('./device-hub/Windows.json')

export class FakeBrowserBuilder {

    private readonly _launchParams: LaunchParameters

    constructor() {
        this._launchParams = {
            deviceDesc: windowsDD,
            userDataDir: ""
        }
    }

    get launchParams(): LaunchParameters {
        return this._launchParams
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

    async launch(options?: FakeBrowserLaunchOptions): Promise<FakeBrowser> {
        // deviceDesc, userDataDir cannot be empty
        FakeBrowserBuilder.checkLaunchParamsLegal(this._launchParams)
        FakeBrowserBuilder.checkOptionsLegal(options)

        const {
            browser,
            pptr
        } = await Driver.launch(this._launchParams, options)

        const result = new FakeBrowser(browser, pptr)
        return result
    }
}

export class FakeBrowser {
    static Builder = FakeBrowserBuilder

    private readonly _browser: Browser
    private readonly _pptr: PuppeteerExtra

    get browser(): Browser {
        return this._browser
    }

    get pptr(): PuppeteerExtra {
        return this._pptr
    }

    async shutdown() {
        await Driver.shutdown(this._browser)
    }

    constructor(browser: Browser, pptr: PuppeteerExtra) {
        this._browser = browser
        this._pptr = pptr
    }

}

