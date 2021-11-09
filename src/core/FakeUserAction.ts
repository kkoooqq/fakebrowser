// noinspection JSUnusedGlobalSymbols,JSUnusedLocalSymbols,PointlessArithmeticExpressionJS

import {strict as assert} from 'assert';

import {BoundingBox, ElementHandle, KeyInput, Page, Point} from "puppeteer";

import {helper} from "./helper";
import {FakeBrowser} from "./FakeBrowser";
import {PptrToolkit} from "./PptrToolkit";
import {FakeDeviceDescriptor} from "./DeviceDescriptor";
import {Touchscreen} from "./TouchScreen";

export class FakeUserAction {

    private _mouseCurrPos: Point

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
    private static mouseMovementTrack(
        startPos: Point,
        endPos: Point,
        maxPoints = 30,
        cpDelta = 1,
    ): Point[] {
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
    private static async simMouseMove(page: Page, options: {
        startPos: Point,
        endPos: Point,
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

        // WeakRef:
        // const fb: FakeBrowser | undefined = this._fakeBrowser.deref()
        const fb: FakeBrowser | undefined = this._fakeBrowser
        if (!fb) {
            this._fakeBrowser = null
            return null
        }

        return fb
    }

    async simMouseMoveTo(
        endPos: Point,
        maxPoints?: number,
        timestamp?: number,
        cpDelta?: number,
    ): Promise<boolean> {
        const fb = this.fakeBrowser
        if (!fb) {
            return false
        }

        if (fb.isMobileBrowser) {
            // We don't need to simulate mouse slide.
            await helper.sleepRd(300, 800)
            return true
        }

        // Get the current page of the browser
        const currPage = await fb.getActivePage()
        assert(currPage)

        // first move to a close position, then finally move to the target position
        const closeToEndPos: Point = {
            x: endPos.x + helper.rd(5, 30, true),
            y: endPos.y + helper.rd(5, 20, true),
        }

        await FakeUserAction.simMouseMove(currPage, {
            startPos: this._mouseCurrPos,
            endPos: closeToEndPos,
            maxPoints,
            timestamp,
            cpDelta
        })

        // The last pos must correction
        await currPage.mouse.move(
            endPos.x,
            endPos.y,
            {steps: helper.rd(5, 13)}
        )

        this._mouseCurrPos = endPos

        return true
    }

    async simRandomMouseMove(): Promise<boolean> {
        const fb = this.fakeBrowser
        if (!fb) {
            return false
        }

        if (fb.isMobileBrowser) {
            // We don't need to simulate mouse slide.
            await helper.sleepRd(300, 800)
            return true
        }

        const fakeDD = fb.driverParams.fakeDeviceDesc
        assert(fakeDD)

        const innerWidth = fakeDD.window.innerWidth
        const innerHeight = fakeDD.window.innerHeight

        // -----------------
        // |      1/6      |
        // | 1/4      1/4  |
        // |      1/6      |
        // -----------------

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

        if (fb.isMobileBrowser) {
            // We can't use mouse obj, we have to use touchscreen
            await currPage.touchscreen.tap(this._mouseCurrPos.x, this._mouseCurrPos.y)
        } else {
            await currPage.mouse.down()
            await helper.sleepRd(50, 80)
            await currPage.mouse.up()
        }

        if (options && options.pauseAfterMouseUp) {
            await helper.sleepRd(200, 1000)
        }

        return true
    }

    async simMoveToAndClick(
        endPos: Point,
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

        if (!fb.isMobileBrowser) {
            await this.simMouseMoveTo(endPos)
            await currPage.mouse.move(
                endPos.x + helper.rd(-10, 10),
                endPos.y,
                {steps: helper.rd(8, 20)}
            )
        }

        this._mouseCurrPos = endPos
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

        let box: BoundingBox | null

        if (fb.isMobileBrowser) {
            box = await FakeUserAction.adjustElementPositionWithTouchscreen(eh, currPage, fakeDD)
        } else {
            box = await FakeUserAction.adjustElementPositionWithMouse(eh, currPage, fakeDD)
        }

        if (box) {
            // The position of each element click should not be the center of the element
            // size of the clicked element must larger than 10 x 10
            let endPos: Point = {
                x: box.x + box.width / 2 + helper.rd(0, 5, true),
                y: box.y + box.height / 2 + helper.rd(0, 5, true),
            }

            await this.simMouseMoveTo(endPos)

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

    private static async adjustElementPositionWithMouse(
        eh: ElementHandle<Element>,
        currPage: Page,
        fakeDD: FakeDeviceDescriptor
    ): Promise<BoundingBox | null> {
        let box = null
        for (; ;) {
            box = await PptrToolkit.boundingBox(eh)

            if (box) {
                // Check the node is in the visible area
                // @ts-ignore
                let deltaX: number = 0
                let deltaY: number = 0

                let viewportAdjust = false

                // If the top of the node is less than 0
                if (box.y <= 0) {
                    // deltaY always positive

                    // ---------------------
                    //     30px           |
                    //    [   ]           |
                    // ..         Distance to be moved
                    // ..                 |
                    // ..                 |
                    // ---------------------body top

                    deltaY = Math.min(
                        -(box.y - 30) - 0,
                        helper.rd(150, 400)
                    )

                    deltaY = -deltaY
                    viewportAdjust = true
                } else if (box.y + box.height >= fakeDD.window.innerHeight) {
                    // If the bottom is beyond

                    deltaY = Math.min(
                        box.y + box.height + 30 - fakeDD.window.innerHeight,
                        helper.rd(150, 400)
                    )

                    viewportAdjust = true
                }

                // if (box.x <= 0) {
                //     // If the top of the button is less than 0
                //     deltaX = Math.min(-box.x + 30, sh.rd(100, 400))
                //     deltaX = -deltaX
                //     viewportAdjust = true
                // } else if (box.x + box.width >= fakeDD.window.innerWidth) {
                //     // If the bottom is beyond
                //     deltaX = Math.min(box.x + box.width - fakeDD.window.innerWidth + 30, sh.rd(100, 400))
                //     viewportAdjust = true
                // }

                if (viewportAdjust) {
                    // await currPage.mouse.wheel({deltaX})
                    await currPage.mouse.wheel({deltaY})
                    await helper.sleepRd(100, 500)
                } else {
                    break
                }
            } else {
                break
            }
        }

        return box;
    }

    private static async adjustElementPositionWithTouchscreen(
        eh: ElementHandle<Element>,
        currPage: Page,
        fakeDD: FakeDeviceDescriptor
    ): Promise<BoundingBox | null> {
        let box = null
        for (; ;) {
            box = await PptrToolkit.boundingBox(eh)

            if (box) {
                // @ts-ignore
                let deltaX: number = 0
                let deltaY: number = 0

                let viewportAdjust = false
                if (box.y <= 0) {
                    deltaY = Math.min(-box.y + 30, helper.rd(100, 400))
                    deltaY = -deltaY
                    viewportAdjust = true
                } else if (box.y + box.height >= fakeDD.window.innerHeight) {
                    deltaY = Math.min(box.y + box.height - fakeDD.window.innerHeight + 30, helper.rd(100, 400))
                    viewportAdjust = true
                }

                if (viewportAdjust) {
                    // noinspection TypeScriptValidateTypes
                    const _patchTouchscreenDesc = Object.getOwnPropertyDescriptor(currPage, '_patchTouchscreen')
                    assert(_patchTouchscreenDesc)

                    const touchscreen: Touchscreen = _patchTouchscreenDesc.value
                    assert(touchscreen)

                    // if deltaY is negative, drop down, otherwise drop up
                    const startX: number = fakeDD.window.innerWidth / 2 + helper.rd(0, fakeDD.window.innerWidth / 6)
                    const endX: number = fakeDD.window.innerWidth / 2 + helper.rd(0, fakeDD.window.innerWidth / 6)
                    let startY: number
                    let endY: number

                    if (deltaY < 0) {
                        startY = helper.rd(0, fakeDD.window.innerHeight - (-deltaY))
                        endY = startY + deltaY
                    } else {
                        startY = helper.rd(deltaY, fakeDD.window.innerHeight)
                        endY = startY - deltaY
                    }

                    await touchscreen.drag({
                        x: startX, y: startY
                    }, {
                        x: endX, y: endY
                    })

                    await helper.sleepRd(100, 500)
                } else {
                    break
                }
            } else {
                break
            }
        }

        return box;
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

        // TODO: check if shiftKey, alt, ctrl can be fired in mobile browsers
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
