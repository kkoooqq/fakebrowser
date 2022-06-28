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

export const ALL_EVASION = [
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
] as const;

export class BrowserBuilder {
    public readonly driverParams: DriverParameters

    constructor() {
        this.driverParams = {
            doNotHook: false,
            deviceDesc: kDefaultWindowsDD,
            userDataDir: '',
            evasionPaths: ALL_EVASION.map(e => path.resolve(__dirname, `../plugins/evasions/${e}`)),
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

    doNotHook(value: boolean): this {
        this.launchParams.doNotHook = value
        return this
    }

    maxSurvivalTime(value: number): this {
        this.launchParams.maxSurvivalTime = value
        return this
    }

    deviceDescriptor(value: DeviceDescriptor): this {
        this.driverParams.deviceDesc = value
        return this
    }

    displayUserActionLayer(value: boolean): this {
        this.driverParams.displayUserActionLayer = value
        return this
    }

    userDataDir(value: string): this {
        this.driverParams.userDataDir = value
        return this
    }

    log(value: boolean): this {
        this.driverParams.log = value
        return this
    }

    proxy(value: ProxyServer): this {
        this.driverParams.proxy = value
        return this
    }

    vanillaLaunchOptions(value: VanillaLaunchOptions): this {
        this.launchParams.launchOptions = value
        return this
    }

    vanillaConnectOptions(value: VanillaConnectOptions): this {
        this.connectParams.connectOptions = value
        return this
    }

    evasionPaths(value: string[]): this {
        this.driverParams.evasionPaths = value
        return this
    }

    disableEvasion(evasion: typeof ALL_EVASION[number]): this {
        this.driverParams.evasionPaths = this.driverParams.evasionPaths.filter(a => !a.endsWith(evasion));
        return this
    }


    usePlugins(value: PuppeteerExtraPlugin[]): this {
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
