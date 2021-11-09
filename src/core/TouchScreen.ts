// noinspection JSUnusedGlobalSymbols

import {CDPSession, Keyboard, MouseButton, MouseOptions, Point} from "puppeteer";

export class Touchscreen {
    private _client: CDPSession;
    private _keyboard: Keyboard;
    private _x: number = 0
    private _y: number = 0
    private _button: MouseButton | 'none' = 'none';

    constructor(client: CDPSession, keyboard: Keyboard) {
        this._client = client;
        this._keyboard = keyboard;
    }

    async move(
        x: number,
        y: number,
        options: { steps?: number } = {}
    ) {
        const {steps = 1} = options;
        const fromX = this._x, fromY = this._y;
        this._x = x;
        this._y = y;

        for (let i = 1; i <= steps; i++) {
            await this._client.send('Input.emulateTouchFromMouseEvent', {
                type: 'mouseMoved',
                button: this._button,
                x: fromX + (this._x - fromX) * (i / steps),
                y: fromY + (this._y - fromY) * (i / steps),
                modifiers: this._keyboard._modifiers
            });
        }
    }

    async tap(
        x: number,
        y: number,
        options: MouseOptions & { delay?: number } = {}
    ) {
        const {delay = null} = options;
        if (delay !== null) {
            await this.move(x, y);
            await this.down(options);
            await new Promise((f) => setTimeout(f, delay));
            await this.up(options);
        } else {
            await this.move(x, y);
            await this.down(options);
            await this.up(options);
        }
    }

    async down(options: MouseOptions = {}) {
        const {button = 'left', clickCount = 1} = options;
        this._button = button;

        await this._client.send('Input.emulateTouchFromMouseEvent', {
            type: 'mousePressed',
            button,
            x: this._x,
            y: this._y,
            modifiers: this._keyboard._modifiers,
            clickCount
        });
    }

    async up(options: MouseOptions = {}) {
        const {button = 'left', clickCount = 1} = options;
        this._button = 'none';

        await this._client.send('Input.emulateTouchFromMouseEvent', {
            type: 'mouseReleased',
            button,
            x: this._x,
            y: this._y,
            modifiers: this._keyboard._modifiers,
            clickCount
        });
    }

    async drag(start: Point, target: Point) {
        await this.move(start.x, start.y);
        await this.down();
        await this.move(target.x, target.y, {
            steps: Math.min(Math.abs(start.x - target.x), Math.abs(start.y - target.y)) / 1.5
        });
        await this.up();
    }
}
