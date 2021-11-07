import {LaunchParameters, ProxyServer, VanillaLaunchOptions} from "./Driver.js";
import {DeviceDescriptor} from "./DeviceDescriptor.js";
import {BrowserLauncher} from "./BrowserLauncher";
import {FakeBrowser, kDefaultWindowsDD} from "./FakeBrowser";

export class BrowserBuilder {

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

    deviceDescriptor(value: DeviceDescriptor) {
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
        const result = await BrowserLauncher.launch(this._launchParams)
        return result
    }
}
