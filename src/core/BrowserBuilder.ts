// noinspection JSUnusedGlobalSymbols

import {
    ConnectParameters,
    DriverParameters,
    LaunchParameters,
    ProxyServer,
    VanillaConnectOptions,
    VanillaLaunchOptions
} from "./Driver.js";

import {DeviceDescriptor} from "./DeviceDescriptor.js";
import {BrowserLauncher} from "./BrowserLauncher";
import {FakeBrowser, kDefaultWindowsDD} from "./FakeBrowser";

export class BrowserBuilder {

    private readonly _driverParams: DriverParameters

    constructor() {
        this._driverParams = {
            doNotHook: false,
            deviceDesc: kDefaultWindowsDD,
            userDataDir: ""
        }
    }

    get driverParams(): DriverParameters {
        return this._driverParams
    }

    get launchParams(): LaunchParameters {
        const result = this._driverParams as LaunchParameters
        result.launchOptions = result.launchOptions || {}

        return result
    }

    get connectParams(): ConnectParameters {
        const result = this._driverParams as ConnectParameters
        result.connectOptions = result.connectOptions || {}

        return result
    }

    doNotHook(value: boolean) {
        this.launchParams.doNotHook = value
        return this
    }

    maxSurvivalTime(value: number) {
        this.launchParams.maxSurvivalTime = value
        return this
    }

    deviceDescriptor(value: DeviceDescriptor) {
        this._driverParams.deviceDesc = value
        return this
    }

    displayUserActionLayer(value: boolean) {
        this._driverParams.displayUserActionLayer = value
        return this
    }

    userDataDir(value: string) {
        this._driverParams.userDataDir = value
        return this
    }

    log(value: boolean) {
        this._driverParams.log = value
        return this
    }

    proxy(value: ProxyServer) {
        this._driverParams.proxy = value
        return this
    }

    vanillaLaunchOptions(value: VanillaLaunchOptions) {
        this.launchParams.launchOptions = value
        return this
    }

    vanillaConnectOptions(value: VanillaConnectOptions) {
        this.connectParams.connectOptions = value
        return this
    }

    async launch(): Promise<FakeBrowser> {
        if ('undefined' === typeof this.launchParams.maxSurvivalTime) {
            this.launchParams.maxSurvivalTime = FakeBrowser.globalConfig.defaultBrowserMaxSurvivalTime
        }

        const result = await BrowserLauncher.launch(this.launchParams)
        return result
    }

    async connect(): Promise<FakeBrowser> {
        const result = await BrowserLauncher.connect(this.connectParams)
        return result
    }


}
