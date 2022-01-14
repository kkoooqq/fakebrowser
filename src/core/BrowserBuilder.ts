// noinspection JSUnusedGlobalSymbols

import * as path from 'path'

import {
    ConnectParameters,
    DriverParameters,
    LaunchParameters,
    ProxyServer,
    VanillaConnectOptions,
    VanillaLaunchOptions,
} from './Driver.js'

import { DeviceDescriptor } from './DeviceDescriptor.js'
import { BrowserLauncher } from './BrowserLauncher'
import { FakeBrowser, kDefaultWindowsDD } from './FakeBrowser'
import { PuppeteerExtraPlugin } from 'puppeteer-extra'

export class BrowserBuilder {

    public readonly driverParams: DriverParameters

    constructor() {
        this.driverParams = {
            doNotHook: false,
            deviceDesc: kDefaultWindowsDD,
            userDataDir: '',
            evasionPaths: [
                'chrome.app',
                'chrome.csi',
                'chrome.loadTimes',
                'chrome.runtime',
                'window.history.length',
                'window.matchMedia',
                'navigator.webdriver',
                'sourceurl',
                'navigator.plugins-native',
                'webgl',
                'mimeTypes',
                'navigator.mediaDevices',
                'bluetooth',
                'navigator.permissions',
                'navigator.batteryManager',
                'webrtc',
                'canvas.fingerprint',
                'user-agent-override',
                'iframe.contentWindow',
                'iframe.src',
                'properties.getter',
                'font.fingerprint',
                'emoji.fingerprint',
                'window.speechSynthesis',
                'workers',
                'keyboard',
            ].map(e => path.resolve(__dirname, `../plugins/evasions/${e}`)),
            usePlugins: [],
        }
    }

    get launchParams(): LaunchParameters {
        const result = this.driverParams as LaunchParameters
        result.launchOptions = result.launchOptions || {}

        return result
    }

    get connectParams(): ConnectParameters {
        const result = this.driverParams as ConnectParameters
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
        this.driverParams.deviceDesc = value
        return this
    }

    displayUserActionLayer(value: boolean) {
        this.driverParams.displayUserActionLayer = value
        return this
    }

    userDataDir(value: string) {
        this.driverParams.userDataDir = value
        return this
    }

    log(value: boolean) {
        this.driverParams.log = value
        return this
    }

    proxy(value: ProxyServer) {
        this.driverParams.proxy = value
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

    evasionPaths(value: string[]) {
        this.driverParams.evasionPaths = value
        return this
    }

    usePlugins(value: PuppeteerExtraPlugin[]) {
        this.driverParams.usePlugins = value
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
