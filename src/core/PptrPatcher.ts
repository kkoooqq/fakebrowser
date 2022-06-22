// noinspection JSUnusedLocalSymbols,JSUnusedGlobalSymbols

import path from 'path'
import fs from 'fs'
import { strict as assert } from 'assert'

import axios from 'axios'
import { CDPSession, Protocol } from 'puppeteer'
import { PuppeteerExtra, PuppeteerExtraPlugin } from 'puppeteer-extra'

import { helper } from './helper'
import { DriverParameters } from './Driver'
import { FakeBrowser } from './FakeBrowser'
import { FakeDeviceDescriptor } from './DeviceDescriptor'

interface PptrExtraEvasionOpts {
    browserUUID: string,
    internalHttpServerPort: number,
    proxyExportIP?: string,
    myRealExportIP: string,
    historyLength: number
    fakeDD: FakeDeviceDescriptor,
}

function requireFix(name: string) {
    // start direct loading
    if (fs.existsSync(name))
        return require(name)
    const tested = [name]
    // replace dist by src so it can work without duplicate evasions files
    name = name.replace('dist', 'src')
    if (fs.existsSync(name))
        return require(name)
    tested.push(name)
    console.error(`Try to require ${tested.join(', ')} and Failed`)
    return require(name)
}

export class PptrPatcher {

    static async patch(
        browserUUID: string,
        pptr: PuppeteerExtra,
        params: DriverParameters,
    ) {
        assert(!!params.fakeDeviceDesc)

        const opts: PptrExtraEvasionOpts = {
            browserUUID: browserUUID,
            internalHttpServerPort: FakeBrowser.globalConfig.internalHttpServerPort,
            fakeDD: params.fakeDeviceDesc,
            proxyExportIP: params.proxy && params.proxy.exportIP,
            myRealExportIP: await helper.myRealExportIP(),
            historyLength: helper.rd(2, 10),
        }

        // user action layer
        await this.patchUserActionLayer(browserUUID, pptr, params, opts)

        // evasions
        for (const evasionPath of params.evasionPaths) {
            const Plugin = requireFix(evasionPath)
            const plugin = Plugin(opts)
            pptr.use(plugin)
        }

        // other plugins
        for (const plugin of params.usePlugins) {
            pptr.use(plugin)
        }

        // last, tidy up
        await this.patchLast(browserUUID, pptr, params, opts)
    }

    private static patchUserActionLayer(
        uuid: string,
        pptr: PuppeteerExtra,
        params: DriverParameters,
        opts: PptrExtraEvasionOpts,
    ) {
        if (params.displayUserActionLayer) {
            const Plugin = requireFix(path.resolve(__dirname, '../plugins/user-action-layer'))
            const plugin = Plugin(opts)
            pptr.use(plugin)
        }
    }

    private static patchLast(
        uuid: string,
        pptr: PuppeteerExtra,
        params: DriverParameters,
        opts: PptrExtraEvasionOpts,
    ) {
        let Plugin = requireFix(path.resolve(__dirname, '../plugins/evasions/zzzzzzzz.last'))
        let plugin = Plugin(opts)
        pptr.use(plugin)
    }

    /**
     * Package evasions to js string for worker to use
     * @param browser
     * @param jsContent
     */
    static async patchWorkerJsContent(browser: FakeBrowser, jsContent: string) {
        const jsPatch = await this.evasionsCode(browser)
        jsContent = jsPatch + jsContent

        return jsContent
    }

    static async evasionsCode(browser: FakeBrowser) {
        let jsPatch = ''
        const utils = requireFix(path.resolve(__dirname, '../plugins/evasions/_utils'))

        // utils
        let utilsContent = `const utils = {};\n`

        for (const [key, value] of Object.entries(utils) as [string, string][]) {
            const utilsFuncCode = value.toString()
            utilsContent += `utils.${key} = ${utilsFuncCode}; \n`
        }

        utilsContent += `utils.init(); \n`

        // code from puppeteer-extra
        const plugins: PuppeteerExtraPlugin[] = browser.pptrExtra.plugins
        const runLast = plugins
            .filter(p => p.requirements.has('runLast'))
            .map(p => p.name)

        for (const name of runLast) {
            const index = plugins.findIndex(p => p.name === name)
            plugins.push(plugins.splice(index, 1)[0])
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
        client: CDPSession,
    ) {
        try {
            let base64Encoded = true
            let jsContent: string

            if (responseHeaders && responseHeaders.length) {
                let body: string
                ;({ body, base64Encoded } = await client.send('Fetch.getResponseBody', { requestId }))
                jsContent = base64Encoded ? Buffer.from(body, 'base64').toString('utf-8') : body
            } else {
                // TODO: get through proxy
                const jsResp = await axios.get(request.url, { headers: request.headers })
                jsContent = jsResp.data

                responseHeaders =
                    Object.entries(
                        jsResp.headers,
                    ).map(
                        e => ({ name: e[0], value: e[1] as string }),
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
            console.error('SW inject failed', ex)
            await client.send('Fetch.failRequest', { requestId, errorReason: 'Aborted' })
        }

        return false
    }
}
