// noinspection JSUnusedGlobalSymbols,JSUnusedLocalSymbols

import {strict as assert} from 'assert';

import {ElementHandle, KeyInput, Page} from "puppeteer";

import {helper} from "./helper";
import {FakeBrowser} from "./FakeBrowser";
import {PptrToolkit} from "./PptrToolkit";

export interface IMousePosition {
    x: number,
    y: number,
}

export class FakeUserAction {

    private _mouseCurrPos: IMousePosition

    // WeakRef needs node >= 14.6.0
    // private _fakeBrowser: WeakRef<FakeBrowser> | null
    private _fakeBrowser: FakeBrowser | null

    constructor(fb: FakeBrowser) {
        this._mouseCurrPos = {x: helper.rd(0, 1280), y: helper.rd(0, 700)}
        // this._fakeBrowser = new WeakRef<FakeBrowser>(fb)
        this._fakeBrowser = fb
    }

    /**
     * Fake mouse movement track
     * @param startPos
     * @param endPos
     * @param maxPoints
     * @param cpDelta
     */
    static mouseMovementTrack(
        startPos: IMousePosition,
        endPos: IMousePosition,
        maxPoints = 30,
        cpDelta = 1,
    ): IMousePosition[] {
        // reference: https://github.com/mtsee/Bezier/blob/master/src/bezier.js

        let nums = []
        let maxNum = 0
        let moveStep = 1

        // Simulates the user's mouse movement acceleration / constant speed / deceleration
        for (let n = 0; n < maxPoints; ++n) {
            nums.push(maxNum)

            // noinspection PointlessArithmeticExpressionJS
            if (n < maxPoints * 1 / 10) {
                moveStep += helper.rd(60, 100)
            } else if (n >= maxPoints * 9 / 10) {
                moveStep -= helper.rd(60, 100)
                moveStep = Math.max(20, moveStep)
            }

            maxNum += moveStep
        }

        const result = []

        const p1 = [
            startPos.x,
            startPos.y
        ]
        const cp1 = [
            (startPos.x + endPos.x) / 2 + helper.rd(30, 100, true) * cpDelta,
            (startPos.y + endPos.y) / 2 + helper.rd(30, 100, true) * cpDelta,
        ]

        const cp2 = [
            (startPos.x + endPos.x) / 2 + helper.rd(30, 100, true) * cpDelta,
            (startPos.y + endPos.y) / 2 + helper.rd(30, 100, true) * cpDelta,
        ]
        const p2 = [
            endPos.x,
            endPos.y
        ]

        for (let num of nums) {
            const [x, y] = helper.threeBezier(num / maxNum, p1, cp1, cp2, p2)
            result.push({x, y})
        }

        return result
    }

    /**
     * Simulate mouse movement
     * @param page
     * @param options
     */
    static async simMouseMove(page: Page, options: {
        startPos: IMousePosition,
        endPos: IMousePosition,
        maxPoints?: number,
        timestamp?: number,
        cpDelta?: number,
    }) {
        const points = this.mouseMovementTrack(
            options.startPos,
            options.endPos,
            options.maxPoints || helper.rd(15, 25),
            options.cpDelta || 1
        )

        for (let n = 0; n < points.length; n += 1) {
            const point = points[n]
            await page.mouse.move(
                point.x,
                point.y,
                {steps: helper.rd(1, 2)}
            )

            await helper.sleep((options.timestamp || helper.rd(300, 800)) / points.length)
        }
    }

    get fakeBrowser(): FakeBrowser | null {
        // @ts-ignore
        if (!this._fakeBrowser || this._fakeBrowser._zombie) {
            return null
        }

        // const fb: FakeBrowser | undefined = this._fakeBrowser.deref()
        const fb: FakeBrowser | undefined = this._fakeBrowser
        if (!fb) {
            this._fakeBrowser = null
            return null
        }

        return fb
    }

    async simMouseMoveTo(
        endPos: IMousePosition,
        maxPoints?: number,
        timestamp?: number,
        cpDelta?: number,
    ): Promise<boolean> {
        const fb = this.fakeBrowser
        if (!fb) {
            return false
        }

        // Get the current page of the browser
        const currPage = await fb.getActivePage()
        assert(currPage)

        await FakeUserAction.simMouseMove(currPage, {
            startPos: this._mouseCurrPos,
            endPos,
            maxPoints,
            timestamp,
            cpDelta
        })

        this._mouseCurrPos = endPos

        return true
    }

    async simRandomMouseMove(): Promise<boolean> {
        //       1/6
        //  1/4      1/4
        //       1/6

        const fb = this.fakeBrowser
        if (!fb) {
            return false
        }

        const fakeDD = fb.driverParams.fakeDeviceDesc
        assert(fakeDD)

        const innerWidth = fakeDD.window.innerWidth
        const innerHeight = fakeDD.window.innerHeight

        const startX = innerWidth / 4
        const startY = innerHeight / 6
        const endX = innerWidth * 3 / 4
        const endY = innerHeight * 5 / 6

        const endPos = {x: helper.rd(startX, endX), y: helper.rd(startY, endY)}
        await this.simMouseMoveTo(endPos)

        return true
    }

    async simClick(options = {
        pauseAfterMouseUp: true
    }): Promise<boolean> {
        const fb = this.fakeBrowser
        if (!fb) {
            return false
        }

        const currPage = await fb.getActivePage()
        assert(currPage)

        await currPage.mouse.down()
        await helper.sleepRd(50, 80)
        await currPage.mouse.up()

        if (options && options.pauseAfterMouseUp) {
            await helper.sleepRd(300, 1000)
        }

        return true
    }

    async simMoveToAndClick(
        endPos: IMousePosition,
        options = {
            pauseAfterMouseUp: true
        }
    ): Promise<boolean> {
        const fb = this.fakeBrowser
        if (!fb) {
            return false
        }

        const currPage = await fb.getActivePage()
        assert(currPage)

        await this.simMouseMoveTo(endPos)
        await currPage.mouse.move(endPos.x + helper.rd(-10, 10), endPos.y, {steps: helper.rd(8, 20)})
        await helper.sleepRd(100, 300)

        return this.simClick(options)
    }

    async simClickElement(
        eh: ElementHandle,
        options = {
            pauseAfterMouseUp: true
        }
    ): Promise<boolean> {
        const fb = this.fakeBrowser
        if (!fb) {
            return false
        }

        const fakeDD = fb.driverParams.fakeDeviceDesc
        assert(fakeDD)

        const currPage = await fb.getActivePage()
        assert(currPage)

        let box = null
        for (; ;) {
            box = await PptrToolkit.boundingBox(eh)

            if (box) {
                // Check the node is in the visible area
                // @ts-ignore
                let deltaX: number = 0
                let deltaY: number = 0

                let viewportAdjust = false
                if (box.y <= 0) {
                    // If the top of the node is less than 0
                    deltaY = Math.min(-box.y + 30, helper.rd(100, 400))
                    await currPage.mouse.wheel({deltaY: -deltaY})
                    viewportAdjust = true
                } else if (box.y + box.height >= fakeDD.window.innerHeight) {
                    // If the bottom is beyond
                    deltaY = Math.min(box.y + box.height - fakeDD.window.innerHeight + 30, helper.rd(100, 400))
                    await currPage.mouse.wheel({deltaY: deltaY})
                    viewportAdjust = true
                }

                // if (box.x <= 0) {
                //     // If the top of the button is less than 0
                //     deltaX = Math.min(-box.x + 30, sh.rd(100, 400))
                //     await currPage.mouse.wheel({deltaX: -deltaX})
                //     viewportAdjust = true
                // } else if (box.x + box.width >= fakeDD.window.innerWidth) {
                //     // If the bottom is beyond
                //     deltaX = Math.min(box.x + box.width - fakeDD.window.innerWidth + 30, sh.rd(100, 400))
                //     await currPage.mouse.wheel({deltaX: deltaX})
                //     viewportAdjust = true
                // }

                if (viewportAdjust) {
                    await helper.sleepRd(100, 500)
                } else {
                    break
                }
            } else {
                break
            }
        }

        if (box) {
            // button cannot be smaller than 25 pixels
            let endPos: IMousePosition = {
                x: helper.rd(box.x + box.width / 2 - box.width / 3, box.x + box.width / 2 + box.width / 3),
                y: helper.rd(box.y, box.y + box.height)
            }

            await this.simMouseMoveTo(endPos)

            // The last click must be hit
            endPos = {
                x: box.x + box.width / 2,
                y: box.y + box.height / 2,
            }

            await currPage.mouse.move(
                endPos.x + helper.rd(-10, 10),
                endPos.y,
                {steps: 13}
            )

            // Pause
            await helper.sleepRd(100, 300)

            // click
            if (await this.simClick(options)) {
                if (options && options.pauseAfterMouseUp) {
                    // Pause
                    await helper.sleepRd(500, 1500)
                }

                return true
            } else {
                return false
            }
        }

        return false
    }

    async simKeyboardPress(
        text: KeyInput,
        options = {
            pauseAfterKeyUp: true
        }
    ): Promise<boolean> {
        const fb = this.fakeBrowser
        if (!fb) {
            return false
        }

        const currPage = await fb.getActivePage()
        assert(currPage)

        await currPage.keyboard.press(text)

        if (options && options.pauseAfterKeyUp) {
            await helper.sleepRd(500, 1500)
        }

        return true
    }

    async simKeyboardEnter(options = {
        pauseAfterKeyUp: true
    }): Promise<boolean> {
        return await this.simKeyboardPress('Enter', options)
    }

    async simKeyboardEsc(options = {
        pauseAfterKeyUp: true
    }): Promise<boolean> {
        return await this.simKeyboardPress('Escape', options)
    }

    async simKeyboardType(
        text: string,
        options = {
            pauseAfterLastKeyUp: true
        }
    ): Promise<boolean> {
        const fb = this.fakeBrowser
        if (!fb) {
            return false
        }

        const currPage = await fb.getActivePage()
        assert(currPage)

        const needsShiftKey = '~!@#$%^&*()_+QWERTYUIOP{}|ASDFGHJKL:"ZXCVBNM<>?'

        for (let ch of text) {
            let needsShift = false
            if (needsShiftKey.includes(ch)) {
                needsShift = true
                await currPage.keyboard.down('ShiftLeft')
                await helper.sleepRd(800, 1500)
            }

            // if a Chinese character
            const isCh = ch.match(/^[\u4e00-\u9fa5]/)
            const delay = isCh ? helper.rd(300, 1500) : helper.rd(80, 250)

            await currPage.keyboard.type('' + ch, {delay})

            if (needsShift) {
                await helper.sleepRd(300, 800)
                await currPage.keyboard.up('ShiftLeft')
            }

            await helper.sleepRd(50, 150)
        }

        if (options && options.pauseAfterLastKeyUp) {
            await helper.sleepRd(500, 1500)
        }

        return true
    }
}
