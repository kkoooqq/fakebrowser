// noinspection JSUnusedGlobalSymbols

import axios from 'axios'
import crypto from 'crypto'

function md5(data: string): string {
    const md5 = crypto.createHash('md5')
    const result = md5.update(data).digest('hex')
    return result
}

/**
 * setTimeout async wrapper
 * @param ms sleep timeout
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}

function sleepRd(a: number, b: number) {
    const rd = _rd(a, b)
    return sleep(rd)
}

/**
 * random method
 * @param min
 * @param max
 * @param pon random positive or negative
 */
function _rd(min: number, max: number, pon = false): number {
    const c = max - min + 1
    return Math.floor(Math.random() * c + min) * (pon ? _pon() : 1)
}

function _arrRd<T>(arr: T[]): T {
    if (!arr || !arr.length) {
        throw new TypeError('arr must not be empty')
    }

    return arr[_rd(0, arr.length - 1)]
}

/**
 * positive or negative
 */
function _pon(): number {
    return _rd(0, 10) >= 5 ? 1 : -1
}

function inMac() {
    return process.platform == 'darwin'
}

function inLinux() {
    return process.platform == 'linux'
}

function inWindow() {
    return process.platform == 'win32'
}

async function waitFor<T>(func: () => T, timeout: number): Promise<T | null> {
    let startTime = new Date().getTime()
    for (; ;) {
        const result: T = await func()
        if (result) {
            return result
        }

        if (new Date().getTime() - startTime > timeout) {
            return null
        }

        await sleep(100)
    }
}

function myRealExportIP(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        axios.get('https://httpbin.org/ip').then(response => {
            resolve(response.data.origin)
        }).catch(ex => {
            reject(Error(`failed to detect self IP using https://httpbin.org/ip ${(ex as Error).message}`))
            // reject(ex)
        })
    })
}

function arrShuffle<T>(arr: T[]): T[] {
    const result = arr.sort(() => 0.5 - Math.random())
    return result
}

function objClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj)) as T
}

/**
 * @desc Second-order Bessel curves
 * @param {number} t Current Percentage
 * @param {Array} p1 Starting point coordinates
 * @param {Array} p2 End point coordinates
 * @param {Array} cp Control Points
 */
function twoBezier(t: number, p1: number[], cp: number[], p2: number[]): number[] {
    const [x1, y1] = p1
    const [cx, cy] = cp
    const [x2, y2] = p2
    let x = (1 - t) * (1 - t) * x1 + 2 * t * (1 - t) * cx + t * t * x2
    let y = (1 - t) * (1 - t) * y1 + 2 * t * (1 - t) * cy + t * t * y2
    return [x, y]
}

/**
 * @desc Third-order Bessel curves
 * @param {number} t Current Percentage
 * @param {Array} p1 Starting point coordinates
 * @param {Array} p2 End point coordinates
 * @param {Array} cp1 First Control Points
 * @param {Array} cp2 Second Control Points
 */
function threeBezier(t: number, p1: number[], cp1: number[], cp2: number[], p2: number[]): number[] {
    const [x1, y1] = p1
    const [x2, y2] = p2
    const [cx1, cy1] = cp1
    const [cx2, cy2] = cp2
    let x =
        x1 * (1 - t) * (1 - t) * (1 - t) +
        3 * cx1 * t * (1 - t) * (1 - t) +
        3 * cx2 * t * t * (1 - t) +
        x2 * t * t * t
    let y =
        y1 * (1 - t) * (1 - t) * (1 - t) +
        3 * cy1 * t * (1 - t) * (1 - t) +
        3 * cy2 * t * t * (1 - t) +
        y2 * t * t * t
    return [x, y]
}

function makeFuncName(len = 4) {
    let result = ''
    for (let n = 0; n < len; ++n) {
        result += String.fromCharCode(_rd(65, 132))
    }

    return result
}

export const helper = {
    md5,
    sleep,
    sleepRd,
    rd: _rd,
    arrRd: _arrRd,
    pon: _pon,
    inMac,
    inLinux,
    inWindow,
    waitFor,
    myRealExportIP,
    arrShuffle,
    objClone,
    twoBezier,
    threeBezier,
    makeFuncName,
}
