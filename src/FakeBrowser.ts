import {Browser, BrowserConnectOptions, BrowserLaunchArgumentOptions, LaunchOptions} from "puppeteer";
import Driver, {InterceptWorkerTypes, LaunchParameters, ProxyServer} from "./Driver.js";
import {FakeDeviceDescriptor} from "./DeviceDescriptor.js";
import {strict as assert} from 'assert';
import {PuppeteerExtra} from "puppeteer-extra";

export class FakeBrowserBuilder {

    private readonly _launchParams: LaunchParameters

    constructor() {
        this._launchParams = {
            fakeDevice: undefined,
            userDataDir: ""
        }
    }

    fakeDevice(value: FakeDeviceDescriptor) {
        this._launchParams.fakeDevice = value
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

    interceptWorkerType(value: InterceptWorkerTypes) {
        this._launchParams.interceptWorkerType = value
        return this
    }

    proxy(value: ProxyServer) {
        this._launchParams.proxy = value
        return this
    }

    async launch(options?: LaunchOptions & BrowserLaunchArgumentOptions & BrowserConnectOptions): Promise<FakeBrowser> {
        // fakeDevice, userDataDir cannot be empty
        assert(this._launchParams.fakeDevice)
        assert(this._launchParams.userDataDir)

        const {browser, pptr} = await Driver.launch(this._launchParams, options)

        // Create an instance of FakeBrowser using Object.create to bypass the constructor.
        const result = Object.create(browser)

        result._browser = browser
        result._pptr = pptr

        return result
    }
}

export class FakeBrowser {
    static Builder = FakeBrowserBuilder

    _browser: Browser
    _pptr: PuppeteerExtra

}

