import {BoundingBox, Browser, ElementHandle, Frame, Page} from "puppeteer";

import {helper} from "./helper";
import {FakeDeviceDescriptor} from "./DeviceDescriptor";

export class PptrToolkit {
    static async waitForSelectorWithRegex(
        page: Page | Frame,
        reg: RegExp,
        attributeToSearch?: string | null,
        options = {timeout: 30 * 1000}
    ): Promise<ElementHandle[]> {
        const timestamp = new Date().getTime()
        for (; ;) {
            const result = await this.querySelectorAllWithRegex(page, reg, attributeToSearch)
            if (result.length) {
                return result
            }

            if (new Date().getTime() - timestamp >= options.timeout) {
                return []
            }

            await helper.sleep(100)
        }
    }

    /**
     * Search DOM nodes based on regular expressions
     * @param page
     * @param reg
     * @param attributeToSearch
     */
    static async querySelectorAllWithRegex(
        page: Page | Frame,
        reg: RegExp,
        attributeToSearch: string | null = 'class'
    ): Promise<ElementHandle[]> {
        if (attributeToSearch) {
            const doms = await page.$$(`[${attributeToSearch}]`)
            const output = []
            for (let e of doms) {
                const attrib = await page.evaluate(
                    (e, attributeToSearch) => {
                        return e.getAttribute(attributeToSearch)
                    }, e, attributeToSearch)

                // @ts-ignore
                if (reg.test(attrib)) {
                    output.push(e);
                }
            }

            return output
        } else {
            const doms = await page.$$('*')
            const output = []
            for (let e of doms) {
                const attribs = await page.evaluate(e => e.attributes, e)

                for (let attribute of attribs) {
                    // @ts-ignore
                    if (reg.test(attribute.value)) {
                        output.push(e);
                    }
                }
            }

            return output
        }
    }

    static async stopLoading(page: Page) {
        try {
            await page['_client'].send("Page.stopLoading");
        } catch (ex: any) {
        }

        try {
            await page.evaluate(() => window.stop());
        } catch (ex: any) {
        }
    }

    static async boundingBoxNew(eh: ElementHandle): Promise<{
        border: BoundingBox,
        content: BoundingBox,
        margin: BoundingBox,
        padding: BoundingBox,
        width: number,
        height: number,
    } | null> {
        try {
            const {model} = await eh._client.send('DOM.getBoxModel', {
                objectId: eh._remoteObject.objectId
            });

            if (!model) {
                return null
            }

            const calculatePos = function (quad: number[]) {
                const x = Math.min(quad[0], quad[2], quad[4], quad[6]);
                const y = Math.min(quad[1], quad[3], quad[5], quad[7]);
                return {
                    x: x,
                    y: y,
                    width: Math.max(quad[0], quad[2], quad[4], quad[6]) - x,
                    height: Math.max(quad[1], quad[3], quad[5], quad[7]) - y
                };
            };

            return {
                border: calculatePos(model.border),
                content: calculatePos(model.content),
                margin: calculatePos(model.margin),
                padding: calculatePos(model.padding),
                width: model.width,
                height: model.height
            };
        } catch (ignored: any) {
            return null;
        }
    }

    static async boundingBox(eh?: ElementHandle | null): Promise<BoundingBox | null> {
        if (!eh) {
            return null
        }

        let box = await eh.boundingBox()
        if (!box) {
            const boxNew = await this.boundingBoxNew(eh)
            if (boxNew) {
                box = boxNew.content
            }
        }

        return box
    }

    static async intersectingViewport(eh: ElementHandle, fakeDD: FakeDeviceDescriptor): Promise<BoundingBox | null> {
        if (!(await eh.isIntersectingViewport())) {
            return null
        }

        const box = await PptrToolkit.boundingBox(eh)
        if (!box) {
            return null
        }

        if (box.y > 0 && box.y + box.height < fakeDD.window.innerHeight &&
            box.x > 0 && box.x + box.width < fakeDD.window.innerWidth) {

            return box
        }

        return null
    }

    static async getActivePage(browser: Browser, timeout = 10 * 1000): Promise<Page> {
        const start = new Date().getTime()

        while (new Date().getTime() - start < timeout) {
            const pages = await browser.pages()
            const arr = []

            for (const p of pages) {
                if (await p.evaluate(() => {
                    return document.visibilityState == 'visible'
                })) {
                    arr.push(p)
                }
            }

            if (arr.length == 1) {
                return arr[0]
            }
        }

        throw "Unable to get active page"
    }
}
