// noinspection JSUnusedLocalSymbols,JSUnusedGlobalSymbols

import * as path from "path";
import {strict as assert} from 'assert';

import axios from "axios";
import {CDPSession, Protocol} from "puppeteer";
import {PuppeteerExtra} from "puppeteer-extra";

import {LaunchParameters} from "./Driver";
import {helper} from "./helper";
import {FakeBrowser} from "./FakeBrowser";

export class PptrPatcher {

    static async patch(
        uuid: string,
        pptr: PuppeteerExtra,
        launchParams: LaunchParameters,
    ) {
        assert(!!launchParams.fakeDeviceDesc)

        await this.patchTaskEnv(uuid, pptr, launchParams)
        await this.patchUserActionLayer(uuid, pptr, launchParams)

        await this.pathChrome(uuid, pptr, launchParams)
        await this.patchWindowHistoryLength(uuid, pptr, launchParams)
        await this.patchWindowMatchMedia(uuid, pptr, launchParams)
        await this.pathWebdriver(uuid, pptr, launchParams)
        await this.pathSourceUrl(uuid, pptr, launchParams)
        await this.patchPluginsMineTypes(uuid, pptr, launchParams)
        await this.patchWebGL(uuid, pptr, launchParams)
        await this.patchMimeTypes(uuid, pptr, launchParams)
        await this.patchMediaDevices(uuid, pptr, launchParams)
        await this.patchBluetooth(uuid, pptr, launchParams)
        await this.patchPermissions(uuid, pptr, launchParams)
        await this.patchBatteryManager(uuid, pptr, launchParams)
        await this.patchWebRtc(uuid, pptr, launchParams)
        await this.patchCanvas2DFingerprint(uuid, pptr, launchParams)
        await this.patchUserAgent(uuid, pptr, launchParams)
        await this.patchIFrame(uuid, pptr, launchParams)
        await this.patchPropertiesGetters(uuid, pptr, launchParams);
        await this.patchFonts(uuid, pptr, launchParams)
        await this.patchEmojis(uuid, pptr, launchParams)
        await this.patchSpeechSynthesis(uuid, pptr, launchParams)
        await this.patchWorkers(uuid, pptr, launchParams)
        await this.patchKeyboard(uuid, pptr, launchParams)
    }

    private static patchTaskEnv(
        uuid: string,
        pptr: PuppeteerExtra,
        launchParams: LaunchParameters,
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

    private static patchUserActionLayer(
        uuid: string,
        pptr: PuppeteerExtra,
        launchParams: LaunchParameters,
    ) {
        if (launchParams.displayUserActionLayer) {
            const Plugin = require(path.resolve(__dirname, '../plugins/user-action-layer'))
            const plugin = Plugin()
            pptr.use(plugin)
        }
    }

    private static pathChrome(
        uuid: string,
        pptr: PuppeteerExtra,
        launchParams: LaunchParameters,
    ) {
        const availableEvasions = [
            'chrome.app',
            'chrome.csi',
            'chrome.loadTimes',
            'chrome.runtime',
        ];

        for (const evasion of availableEvasions) {
            const Plugin = require(path.resolve(__dirname, `./plugins/evasions/${evasion}`))
            const plugin = Plugin()
            pptr.use(plugin)
        }
    }

    private static patchWindowHistoryLength(
        uuid: string,
        pptr: PuppeteerExtra,
        launchParams: LaunchParameters,
    ) {
        const historyLength = helper.rd(2, 10)

        const Plugin = require(path.resolve(__dirname, '../plugins/evasions/window.history.length'))
        const plugin = Plugin({historyLength})
        pptr.use(plugin)

    }

    private static patchWindowMatchMedia(
        uuid: string,
        pptr: PuppeteerExtra,
        launchParams: LaunchParameters,
    ) {
        const Plugin = require(path.resolve(__dirname, '../plugins/evasions/window.matchMedia'))
        const plugin = Plugin()
        pptr.use(plugin)
    }

    private static pathWebdriver(
        uuid: string,
        pptr: PuppeteerExtra,
        launchParams: LaunchParameters,
    ) {
        const Plugin = require(path.resolve(__dirname, '../plugins/evasions/navigator.webdriver'))
        const plugin = Plugin()
        pptr.use(plugin)
    }

    private static pathSourceUrl(
        uuid: string,
        pptr: PuppeteerExtra,
        launchParams: LaunchParameters,
    ) {
        const Plugin = require(path.resolve(__dirname, '../plugins/evasions/sourceurl'))
        const plugin = Plugin()
        pptr.use(plugin)
    }

    private static patchPluginsMineTypes(
        uuid: string,
        pptr: PuppeteerExtra,
        launchParams: LaunchParameters,
    ) {
        assert(launchParams.fakeDeviceDesc)

        //
        const Plugin = require(path.resolve(__dirname, '../plugins/evasions/navigator.plugins'))
        const plugin = Plugin({
            data: launchParams.fakeDeviceDesc.plugins
        })

        pptr.use(plugin)
    }

    private static patchWebGL(
        uuid: string,
        pptr: PuppeteerExtra,
        launchParams: LaunchParameters,
    ) {
        assert(launchParams.fakeDeviceDesc)

        const Plugin = require(path.resolve(__dirname, '../plugins/evasions/webgl'))
        const plugin = Plugin({
            data: {
                gpu: launchParams.fakeDeviceDesc.gpu,
                webgl: launchParams.fakeDeviceDesc.webgl
            },
        })

        pptr.use(plugin)
    }

    private static patchMimeTypes(
        uuid: string,
        pptr: PuppeteerExtra,
        launchParams: LaunchParameters,
    ) {
        assert(launchParams.fakeDeviceDesc)

        const Plugin = require(path.resolve(__dirname, '../plugins/evasions/mimeTypes'))
        const plugin = Plugin({
            data: launchParams.fakeDeviceDesc.mimeTypes
        })

        pptr.use(plugin)
    }

    private static patchMediaDevices(
        uuid: string,
        pptr: PuppeteerExtra,
        launchParams: LaunchParameters,
    ) {
        assert(launchParams.fakeDeviceDesc)

        const Plugin = require(path.resolve(__dirname, '../plugins/evasions/navigator.mediaDevices'))
        const plugin = Plugin({
            data: launchParams.fakeDeviceDesc.mediaDevices
        })

        pptr.use(plugin)
    }

    private static patchBluetooth(
        uuid: string,
        pptr: PuppeteerExtra,
        launchParams: LaunchParameters,
    ) {
        const Plugin = require(path.resolve(__dirname, '../plugins/evasions/bluetooth'))
        const plugin = Plugin({})

        pptr.use(plugin)
    }

    private static patchPermissions(
        uuid: string,
        pptr: PuppeteerExtra,
        launchParams: LaunchParameters,
    ) {
        const Plugin = require(path.resolve(__dirname, '../plugins/evasions/navigator.permissions'))
        const plugin = Plugin()

        pptr.use(plugin)
    }

    private static patchBatteryManager(
        uuid: string,
        pptr: PuppeteerExtra,
        launchParams: LaunchParameters,
    ) {
        assert(launchParams.fakeDeviceDesc)

        const Plugin = require(path.resolve(__dirname, '../plugins/evasions/navigator.batteryManager'))
        const plugin = Plugin({
            battery: launchParams.fakeDeviceDesc.battery
        })

        pptr.use(plugin)
    }

    private static async patchWebRtc(
        uuid: string,
        pptr: PuppeteerExtra,
        launchParams: LaunchParameters,
    ) {
        if (launchParams.proxy && launchParams.proxy.exportIP) {
            const myRealExportIP = await helper.myRealExportIP()
            const fakeIPs = [myRealExportIP]

            // if (launchParams.cluster && launchParams.cluster.length) {
            //     fakeIPs.push(launchParams.cluster)
            // }

            // console.log(
            //     '!!! proxyExportIP: ' + launchParams.proxy.exportIP +
            //     ' fakeIPs:' + JSON.stringify(fakeIPs)
            // );

            const Plugin = require(path.resolve(__dirname, '../plugins/evasions/webrtc'))
            const plugin = Plugin({
                proxyExportIP: launchParams.proxy.exportIP,
                fakeIPs
            })

            pptr.use(plugin)
        }
    }

    private static patchCanvas2DFingerprint(
        uuid: string,
        pptr: PuppeteerExtra,
        launchParams: LaunchParameters,
    ) {
        assert(launchParams.fakeDeviceDesc)

        const Plugin = require(path.resolve(__dirname, '../plugins/evasions/canvas.fingerprint'))
        const plugin = Plugin({
            canvasSalt: launchParams.fakeDeviceDesc.canvasSalt,
            fontSalt: launchParams.fakeDeviceDesc.fontSalt,
        })

        pptr.use(plugin)
    }

    private static patchFonts(
        uuid: string,
        pptr: PuppeteerExtra,
        launchParams: LaunchParameters,
    ) {
        assert(launchParams.fakeDeviceDesc)

        const Plugin = require(path.resolve(__dirname, '../plugins/evasions/font.fingerprint'))
        const plugin = Plugin({
            fontSalt: launchParams.fakeDeviceDesc.fontSalt,
        })

        pptr.use(plugin)
    }

    private static patchEmojis(
        uuid: string,
        pptr: PuppeteerExtra,
        launchParams: LaunchParameters,
    ) {
        assert(launchParams.fakeDeviceDesc)

        const Plugin = require(path.resolve(__dirname, '../plugins/evasions/emoji.fingerprint'))
        const plugin = Plugin({
            fontSalt: launchParams.fakeDeviceDesc.fontSalt,
        })

        pptr.use(plugin)
    }

    private static patchSpeechSynthesis(
        uuid: string,
        pptr: PuppeteerExtra,
        launchParams: LaunchParameters,
    ) {
        assert(launchParams.fakeDeviceDesc)

        const Plugin = require(path.resolve(__dirname, '../plugins/evasions/window.speechSynthesis'))
        const plugin = Plugin({
            voices: launchParams.fakeDeviceDesc.voices,
        })

        pptr.use(plugin)
    }

    private static patchWorkers(
        uuid: string,
        pptr: PuppeteerExtra,
        launchParams: LaunchParameters,
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

    private static patchKeyboard(
        uuid: string,
        pptr: PuppeteerExtra,
        launchParams: LaunchParameters,
    ) {
        assert(launchParams.fakeDeviceDesc)

        const Plugin = require(path.resolve(__dirname, '../plugins/evasions/keyboard'))
        const plugin = Plugin({
            keyboard: launchParams.fakeDeviceDesc.keyboard,
        })

        pptr.use(plugin)
    }

    private static patchUserAgent(
        uuid: string,
        pptr: PuppeteerExtra,
        launchParams: LaunchParameters,
    ) {
        assert(launchParams.fakeDeviceDesc)

        const Plugin = require(path.resolve(__dirname, '../plugins/evasions/user-agent-override'))
        const plugin = Plugin({
            userAgent: launchParams.fakeDeviceDesc.navigator.userAgent,
            locale: launchParams.fakeDeviceDesc.navigator.languages.join(','),
            maskLinux: true,
        })

        pptr.use(plugin)
    }

    private static patchIFrame(
        uuid: string,
        pptr: PuppeteerExtra,
        launchParams: LaunchParameters,
    ) {
        let Plugin = require(path.resolve(__dirname, '../plugins/evasions/iframe.contentWindow'))
        let plugin = Plugin()
        pptr.use(plugin)

        Plugin = require(path.resolve(__dirname, '../plugins/evasions/iframe.src'))
        plugin = Plugin()
        pptr.use(plugin)
    }

    private static patchPropertiesGetters(
        uuid: string,
        pptr: PuppeteerExtra,
        launchParams: LaunchParameters,
    ) {
        assert(launchParams.fakeDeviceDesc)

        let Plugin = require(path.resolve(__dirname, '../plugins/evasions/properties.getter'))
        let plugin = Plugin({
            data: {
                navigator: launchParams.fakeDeviceDesc.navigator,
                window: launchParams.fakeDeviceDesc.window,
                document: launchParams.fakeDeviceDesc.document,
                screen: launchParams.fakeDeviceDesc.screen
            }
        })

        pptr.use(plugin)
    }

    /**
     * Package evasions to js string for worker to use
     * @param pptr
     * @param jsContent
     */
    static async patchWorkerJsContent(pptr: PuppeteerExtra, jsContent: string) {
        let jsPatch = await this.evasionsCode(pptr);
        jsContent = jsPatch + jsContent

        return jsContent
    }

    static async evasionsCode(pptr: PuppeteerExtra) {
        let jsPatch = ''
        const utils = require('../plugins/evasions/_utils/index');

        // utils
        let utilsContent =
            `const utils = {};\n`;
        for (const [key, value] of Object.entries(utils) as [string, string][]) {
            utilsContent +=
                `
utils.${key} = ${value.toString()};
`;
        }

        utilsContent +=
            `
utils.init();
`;

        const plugins = pptr.plugins
        const runLast = plugins
            .filter(p => p.requirements.has('runLast'))
            .map(p => p.name);

        for (const name of runLast) {
            const index = plugins.findIndex(p => p.name === name);
            plugins.push(plugins.splice(index, 1)[0]);
        }

        for (const plugin of plugins) {
            if (plugin['onServiceWorkerContent']) {
                // console.log(`SW Patch: ${plugin.name}`)
                jsPatch = await plugin['onServiceWorkerContent'](jsPatch)
            }
        }

        jsPatch = utilsContent + jsPatch
        return `
(function() {
${jsPatch};
})();      

// end
// ===========================
`
    }

    static async patchServiceWorkerRequest(
        pptr: PuppeteerExtra,
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

                responseHeaders = Object.entries(jsResp.headers).map(e => ({name: e[0], value: e[1] as string}))
            }

            jsContent = await this.patchWorkerJsContent(pptr, jsContent)

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
