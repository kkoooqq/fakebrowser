// noinspection JSUnusedLocalSymbols,JSUnusedGlobalSymbols

import * as path from "path";
import {strict as assert} from 'assert';

import axios from "axios";
import {CDPSession, Protocol} from "puppeteer";
import {PuppeteerExtra, PuppeteerExtraPlugin} from "puppeteer-extra";

import {DriverParameters} from "./Driver";
import {helper} from "./helper";
import {FakeBrowser} from "./FakeBrowser";

export class PptrPatcher {

    static async patch(
        uuid: string,
        pptr: PuppeteerExtra,
        params: DriverParameters,
    ) {
        assert(!!params.fakeDeviceDesc)

        await this.patchTaskEnv(uuid, pptr, params)
        await this.patchUserActionLayer(uuid, pptr, params)

        await this.pathChrome(uuid, pptr, params)
        await this.patchWindowHistoryLength(uuid, pptr, params)
        await this.patchWindowMatchMedia(uuid, pptr, params)
        await this.pathWebdriver(uuid, pptr, params)
        await this.pathSourceUrl(uuid, pptr, params)
        await this.patchPluginsMineTypes(uuid, pptr, params)
        await this.patchWebGL(uuid, pptr, params)
        await this.patchMimeTypes(uuid, pptr, params)
        await this.patchMediaDevices(uuid, pptr, params)
        await this.patchBluetooth(uuid, pptr, params)
        await this.patchPermissions(uuid, pptr, params)
        await this.patchBatteryManager(uuid, pptr, params)
        await this.patchWebRtc(uuid, pptr, params)
        await this.patchCanvas2DFingerprint(uuid, pptr, params)
        await this.patchUserAgent(uuid, pptr, params)
        await this.patchIFrame(uuid, pptr, params)
        await this.patchPropertiesGetters(uuid, pptr, params);
        await this.patchFonts(uuid, pptr, params)
        await this.patchEmojis(uuid, pptr, params)
        await this.patchSpeechSynthesis(uuid, pptr, params)
        await this.patchWorkers(uuid, pptr, params)
        await this.patchKeyboard(uuid, pptr, params)
        await this.patchLast(uuid, pptr, params)
    }

    // @ts-ignore
    private static patchTaskEnv(
        uuid: string,
        pptr: PuppeteerExtra,
        params: DriverParameters,
    ) {
        const Plugin = require(path.resolve(__dirname, '../plugins/taskEnv'))
        const plugin = Plugin({
            env: {
                uuid: uuid,
                internalHttpServerPort: FakeBrowser.globalConfig.internalHttpServerPort
            }
        })

        pptr.use(plugin)
    }

    // @ts-ignore
    private static patchUserActionLayer(
        uuid: string,
        pptr: PuppeteerExtra,
        params: DriverParameters,
    ) {
        if (params.displayUserActionLayer) {
            const Plugin = require(path.resolve(__dirname, '../plugins/user-action-layer'))
            const plugin = Plugin()
            pptr.use(plugin)
        }
    }

    // @ts-ignore
    private static pathChrome(
        uuid: string,
        pptr: PuppeteerExtra,
        params: DriverParameters,
    ) {
        const availableEvasions = [
            'chrome.app',
            'chrome.csi',
            'chrome.loadTimes',
            'chrome.runtime',
        ];

        for (const evasion of availableEvasions) {
            const Plugin = require(path.resolve(__dirname, `../plugins/evasions/${evasion}`))
            const plugin = Plugin()
            pptr.use(plugin)
        }
    }

    // @ts-ignore
    private static patchWindowHistoryLength(
        uuid: string,
        pptr: PuppeteerExtra,
        params: DriverParameters,
    ) {
        const historyLength = helper.rd(2, 10)

        const Plugin = require(path.resolve(__dirname, '../plugins/evasions/window.history.length'))
        const plugin = Plugin({historyLength})
        pptr.use(plugin)

    }

    // @ts-ignore
    private static patchWindowMatchMedia(
        uuid: string,
        pptr: PuppeteerExtra,
        params: DriverParameters,
    ) {
        const Plugin = require(path.resolve(__dirname, '../plugins/evasions/window.matchMedia'))
        const plugin = Plugin()
        pptr.use(plugin)
    }

    // @ts-ignore
    private static pathWebdriver(
        uuid: string,
        pptr: PuppeteerExtra,
        params: DriverParameters,
    ) {
        const Plugin = require(path.resolve(__dirname, '../plugins/evasions/navigator.webdriver'))
        const plugin = Plugin()
        pptr.use(plugin)
    }

    // @ts-ignore
    private static pathSourceUrl(
        uuid: string,
        pptr: PuppeteerExtra,
        params: DriverParameters,
    ) {
        const Plugin = require(path.resolve(__dirname, '../plugins/evasions/sourceurl'))
        const plugin = Plugin()
        pptr.use(plugin)
    }

    // @ts-ignore
    private static patchPluginsMineTypes(
        uuid: string,
        pptr: PuppeteerExtra,
        params: DriverParameters,
    ) {
        assert(params.fakeDeviceDesc)

        //
        const Plugin = require(path.resolve(__dirname, '../plugins/evasions/navigator.plugins'))
        const plugin = Plugin({
            plugins: params.fakeDeviceDesc.plugins
        })

        pptr.use(plugin)
    }

    // @ts-ignore
    private static patchWebGL(
        uuid: string,
        pptr: PuppeteerExtra,
        params: DriverParameters,
    ) {
        assert(params.fakeDeviceDesc)

        const Plugin = require(path.resolve(__dirname, '../plugins/evasions/webgl'))
        const plugin = Plugin({
            gpu: params.fakeDeviceDesc.gpu,
            webgl: params.fakeDeviceDesc.webgl
        })

        pptr.use(plugin)
    }

    // @ts-ignore
    private static patchMimeTypes(
        uuid: string,
        pptr: PuppeteerExtra,
        params: DriverParameters,
    ) {
        assert(params.fakeDeviceDesc)

        const Plugin = require(path.resolve(__dirname, '../plugins/evasions/mimeTypes'))
        const plugin = Plugin({
            data: params.fakeDeviceDesc.mimeTypes
        })

        pptr.use(plugin)
    }

    // @ts-ignore
    private static patchMediaDevices(
        uuid: string,
        pptr: PuppeteerExtra,
        params: DriverParameters,
    ) {
        assert(params.fakeDeviceDesc)

        const Plugin = require(path.resolve(__dirname, '../plugins/evasions/navigator.mediaDevices'))
        const plugin = Plugin({
            data: params.fakeDeviceDesc.mediaDevices
        })

        pptr.use(plugin)
    }

    // @ts-ignore
    private static patchBluetooth(
        uuid: string,
        pptr: PuppeteerExtra,
        params: DriverParameters,
    ) {
        const Plugin = require(path.resolve(__dirname, '../plugins/evasions/bluetooth'))
        const plugin = Plugin({})

        pptr.use(plugin)
    }

    // @ts-ignore
    private static patchPermissions(
        uuid: string,
        pptr: PuppeteerExtra,
        params: DriverParameters,
    ) {
        assert(params.fakeDeviceDesc)

        const Plugin = require(path.resolve(__dirname, '../plugins/evasions/navigator.permissions'))
        const plugin = Plugin({
            permissions: params.fakeDeviceDesc.permissions
        })

        pptr.use(plugin)
    }

    // @ts-ignore
    private static patchBatteryManager(
        uuid: string,
        pptr: PuppeteerExtra,
        params: DriverParameters,
    ) {
        assert(params.fakeDeviceDesc)

        const Plugin = require(path.resolve(__dirname, '../plugins/evasions/navigator.batteryManager'))
        const plugin = Plugin({
            battery: params.fakeDeviceDesc.battery
        })

        pptr.use(plugin)
    }

    // @ts-ignore
    private static async patchWebRtc(
        uuid: string,
        pptr: PuppeteerExtra,
        params: DriverParameters,
    ) {
        if (params.proxy && params.proxy.exportIP) {
            const myRealExportIP = await helper.myRealExportIP()
            const fakeIPs = [myRealExportIP]

            // if (driverParams.cluster && driverParams.cluster.length) {
            //     fakeIPs.push(driverParams.cluster)
            // }

            // console.log(
            //     '!!! proxyExportIP: ' + driverParams.proxy.exportIP +
            //     ' fakeIPs:' + JSON.stringify(fakeIPs)
            // );

            const Plugin = require(path.resolve(__dirname, '../plugins/evasions/webrtc'))
            const plugin = Plugin({
                proxyExportIP: params.proxy.exportIP,
                fakeIPs
            })

            pptr.use(plugin)
        }
    }

    // @ts-ignore
    private static patchCanvas2DFingerprint(
        uuid: string,
        pptr: PuppeteerExtra,
        params: DriverParameters,
    ) {
        assert(params.fakeDeviceDesc)

        const Plugin = require(path.resolve(__dirname, '../plugins/evasions/canvas.fingerprint'))
        const plugin = Plugin({
            canvasSalt: params.fakeDeviceDesc.canvasSalt,
            fontSalt: params.fakeDeviceDesc.fontSalt,
        })

        pptr.use(plugin)
    }

    // @ts-ignore
    private static patchFonts(
        uuid: string,
        pptr: PuppeteerExtra,
        params: DriverParameters,
    ) {
        assert(params.fakeDeviceDesc)

        const Plugin = require(path.resolve(__dirname, '../plugins/evasions/font.fingerprint'))
        const plugin = Plugin({
            fontSalt: params.fakeDeviceDesc.fontSalt,
        })

        pptr.use(plugin)
    }

    // @ts-ignore
    private static patchEmojis(
        uuid: string,
        pptr: PuppeteerExtra,
        params: DriverParameters,
    ) {
        assert(params.fakeDeviceDesc)

        const Plugin = require(path.resolve(__dirname, '../plugins/evasions/emoji.fingerprint'))
        const plugin = Plugin({
            fontSalt: params.fakeDeviceDesc.fontSalt,
        })

        pptr.use(plugin)
    }

    // @ts-ignore
    private static patchSpeechSynthesis(
        uuid: string,
        pptr: PuppeteerExtra,
        params: DriverParameters,
    ) {
        assert(params.fakeDeviceDesc)

        const Plugin = require(path.resolve(__dirname, '../plugins/evasions/window.speechSynthesis'))
        const plugin = Plugin({
            voices: params.fakeDeviceDesc.voices,
        })

        pptr.use(plugin)
    }

    // @ts-ignore
    private static patchWorkers(
        uuid: string,
        pptr: PuppeteerExtra,
        params: DriverParameters,
    ) {
        const Plugin = require(path.resolve(__dirname, '../plugins/evasions/workers'))
        const plugin = Plugin({
            env: {
                uuid: uuid,
                internalHttpServerPort: FakeBrowser.globalConfig.internalHttpServerPort
            }
        })

        pptr.use(plugin)
    }

    // @ts-ignore
    private static patchKeyboard(
        uuid: string,
        pptr: PuppeteerExtra,
        params: DriverParameters,
    ) {
        assert(params.fakeDeviceDesc)

        const Plugin = require(path.resolve(__dirname, '../plugins/evasions/keyboard'))
        const plugin = Plugin({
            keyboard: params.fakeDeviceDesc.keyboard,
        })

        pptr.use(plugin)
    }

    // @ts-ignore
    private static patchUserAgent(
        uuid: string,
        pptr: PuppeteerExtra,
        params: DriverParameters,
    ) {
        assert(params.fakeDeviceDesc)

        const Plugin = require(path.resolve(__dirname, '../plugins/evasions/user-agent-override'))
        const plugin = Plugin({
            userAgent: params.fakeDeviceDesc.navigator.userAgent,
            locale: params.fakeDeviceDesc.navigator.languages.join(','),
            maskLinux: true,
        })

        pptr.use(plugin)
    }

    // @ts-ignore
    private static patchIFrame(
        uuid: string,
        pptr: PuppeteerExtra,
        params: DriverParameters,
    ) {
        let Plugin = require(path.resolve(__dirname, '../plugins/evasions/iframe.contentWindow'))
        let plugin = Plugin()
        pptr.use(plugin)

        Plugin = require(path.resolve(__dirname, '../plugins/evasions/iframe.src'))
        plugin = Plugin()
        pptr.use(plugin)
    }

    // @ts-ignore
    private static patchPropertiesGetters(
        uuid: string,
        pptr: PuppeteerExtra,
        params: DriverParameters,
    ) {
        assert(params.fakeDeviceDesc)

        let Plugin = require(path.resolve(__dirname, '../plugins/evasions/properties.getter'))
        let plugin = Plugin({
            navigator: params.fakeDeviceDesc.navigator,
            window: params.fakeDeviceDesc.window,
            document: params.fakeDeviceDesc.document,
            screen: params.fakeDeviceDesc.screen
        })

        pptr.use(plugin)
    }

    // @ts-ignore
    private static patchLast(
        uuid: string,
        pptr: PuppeteerExtra,
        params: DriverParameters,
    ) {
        let Plugin = require(path.resolve(__dirname, '../plugins/evasions/zzzzzzzz.last'))
        let plugin = Plugin()
        pptr.use(plugin)
    }

    /**
     * Package evasions to js string for worker to use
     * @param browser
     * @param jsContent
     */
    static async patchWorkerJsContent(browser: FakeBrowser, jsContent: string) {
        const jsPatch = await this.evasionsCode(browser);
        jsContent = jsPatch + jsContent

        return jsContent
    }

    static async evasionsCode(browser: FakeBrowser) {
        let jsPatch = ''
        const utils = require('../plugins/evasions/_utils');

        // utils
        let utilsContent = `const utils = {};\n`;

        for (const [key, value] of Object.entries(utils) as [string, string][]) {
            utilsContent += `utils.${key} = ${value.toString()}; \n`;
        }

        utilsContent += `utils.init(); \n`;

        // code from puppeteer-extra
        const plugins: PuppeteerExtraPlugin[] = browser.pptrExtra.plugins
        const runLast = plugins
            .filter(p => p.requirements.has('runLast'))
            .map(p => p.name);

        for (const name of runLast) {
            const index = plugins.findIndex(p => p.name === name);
            plugins.push(plugins.splice(index, 1)[0]);
        }

        for (const plugin of plugins) {
            if (plugin['onBrowser']) {
                await plugin['onBrowser'](browser.vanillaBrowser)
            }

            if (plugin['onServiceWorkerContent']) {
                // console.log(`SW Patch: ${plugin.name}`)
                jsPatch = await plugin['onServiceWorkerContent'](jsPatch)
            }
        }

        jsPatch = utilsContent + jsPatch

        // when all evasions are patched, delete OffscreenCanvas.prototype.constructor.__cache
        return `(function() {${jsPatch};})(); \n\n 
const tmpVarNames =
    Object.getOwnPropertyNames(
        OffscreenCanvas.prototype.constructor,
    ).filter(e => e.startsWith('__$'));

tmpVarNames.forEach(e => {
    delete OffscreenCanvas.prototype.constructor[e];
});
`
    }

    static async patchServiceWorkerRequest(
        browser: FakeBrowser,
        requestId: Protocol.Network.RequestId,
        request: Protocol.Network.Request,
        responseHeaders: Protocol.Fetch.HeaderEntry[],
        client: CDPSession
    ) {
        try {
            let base64Encoded = true
            let jsContent: string

            if (responseHeaders && responseHeaders.length) {
                let body: string;
                ;({body, base64Encoded} = await client.send('Fetch.getResponseBody', {requestId}))
                jsContent = base64Encoded ? Buffer.from(body, 'base64').toString('utf-8') : body
            } else {
                const jsResp = await axios.get(request.url, {headers: request.headers})
                jsContent = jsResp.data

                responseHeaders =
                    Object.entries(
                        jsResp.headers
                    ).map(
                        e => ({name: e[0], value: e[1] as string})
                    )
            }

            jsContent = await this.patchWorkerJsContent(browser, jsContent)

            // The order I used is: Fetch.enable -> on Fetch.requestPaused event -> Fetch.getResponseBody -> Fetch.fulfillRequest -> Fetch.disable
            await client.send('Fetch.fulfillRequest', {
                requestId,
                responseCode: 200,
                responseHeaders: responseHeaders,
                body: 1 ? Buffer.from(jsContent).toString('base64') : jsContent,
            })

            return true
        } catch (ex: any) {
            console.error('SW inject failed', ex);
            await client.send('Fetch.failRequest', {requestId, errorReason: 'Aborted'})
        }

        return false
    }
}
