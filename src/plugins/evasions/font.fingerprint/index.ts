import { FakeDeviceDescriptor, IFontSalt } from 'core/DeviceDescriptor';
import { PluginRequirements, PuppeteerExtraPlugin, PuppeteerPage } from 'puppeteer-extra-plugin';
import Utils from '../_utils/'
import withUtils from '../_utils/withUtils';
import withWorkerUtils from '../_utils/withWorkerUtils';

export interface PluginOptions {
    fakeDD: FakeDeviceDescriptor;
}

interface FontDesc {
    style: string;
    weight: string;
    size: string;
    family: string;
}

type NestNode = string | NestNode[];

// interface FontDesc2 {
//     style: string; variant: string; weight: string; stretch: string;
//     lineHeight: string | number; size: string; family: string[];
// };

export class Plugin extends PuppeteerExtraPlugin<PluginOptions> {
    constructor(opts?: Partial<PluginOptions>) {
        super(opts);
    }

    get name(): 'evasions/font.fingerprint' {
        return 'evasions/font.fingerprint';
    }

    // noinspection JSUnusedGlobalSymbols
    get requirements(): PluginRequirements {
        return new Set(['runLast']);
    }

    async onPageCreated(page: PuppeteerPage): Promise<void> {
        await withUtils(this, page).evaluateOnNewDocument(this.mainFunction, this.opts.fakeDD.fontSalt);
    }

    onServiceWorkerContent(jsContent: string) {
        return withWorkerUtils(this, jsContent).evaluate(this.mainFunction, this.opts.fakeDD.fontSalt);
    }

    mainFunction = (utils: typeof Utils, fontSalt: { [key: string]: IFontSalt }) => {
        // Thanks to: https://github.com/dy/css-font
        function parseFont(this: any, value: string) {
            if (typeof value !== 'string') throw new Error('Font argument must be a string.');

            if (value === '') {
                throw new Error('Cannot parse an empty string.');
            }

            if (!this.cache) {
                this.cache = {};
            }

            const cache = this.cache;
            if (cache[value]) return cache[value];

            const globalKeywords = [ 'inherit', 'initial', 'unset', ];

            const systemFontKeywords = [ 'caption', 'icon', 'menu', 'message-box', 'small-caption', 'status-bar'];

            const fontWeightKeywords = ['normal', 'bold', 'bolder', 'lighter', '100', '200', '300', '400', '500',
                '600', '700', '800', '900'];

            const fontStyleKeywords = [ 'normal', 'italic', 'oblique' ];

            const fontStretchKeywords = [ 'normal', 'condensed', 'semi-condensed', 'extra-condensed', 'ultra-condensed',
             'expanded', 'semi-expanded', 'extra-expanded', 'ultra-expanded' ];

            const sizes = [ 'xx-small', 'x-small', 'small', 'medium', 'large', 'x-large', 'xx-large', 'larger', 'smaller' ];

            function unquote(str: string) {
                // noinspection RegExpRedundantEscape
                const reg = /[\'\"]/;
                if (!str) return '';
                if (reg.test(str.charAt(0))) {
                    str = str.substr(1);
                }
                if (reg.test(str.charAt(str.length - 1))) {
                    str = str.substr(0, str.length - 1);
                }
                return str;
            }

            function parse(str: string, opts?: string | string[] | { brackets?: string | string[], escape?: string, flat?: boolean }) {
                // pretend non-string parsed per-se
                if (typeof str !== 'string') return [str];
                let res = [str];
                if (typeof opts === 'string' || Array.isArray(opts)) {
                    opts = { brackets: opts };
                } else if (!opts) opts = {};
                const brackets = opts.brackets ? (Array.isArray(opts.brackets) ? opts.brackets : [opts.brackets]) : ['{}', '[]', '()'];
                const escape = opts.escape || '___';
                const flat = !!opts.flat;
                brackets.forEach(function (bracket) {
                    // create parenthesis regex
                    const pRE = new RegExp(['\\', bracket[0], '[^\\', bracket[0], '\\', bracket[1], ']*\\', bracket[1]].join(''));
                    let ids: number[] = [];
                    function replaceToken(token: string, idx: number[], str: string) {
                        // save token to res
                        const refId = res.push(token.slice(bracket[0].length, -bracket[1].length)) - 1;
                        ids.push(refId);
                        return escape + refId + escape;
                    }
                    // noinspection JSUnusedAssignment
                    res.forEach(function (str, i) {
                        // noinspection ES6ConvertVarToLetConst
                        var prevStr;
                        // replace paren tokens till there’s none
                        let a = 0;
                        // noinspection EqualityComparisonWithCoercionJS,JSUnusedAssignment
                        while (str != prevStr) {
                            prevStr = str;
                            str = str.replace(pRE, replaceToken);
                            if (a++ > 10e3) throw Error('References have circular dependency. Please, check them.');
                        }

                        res[i] = str;
                    });

                    // wrap found refs to brackets
                    ids = ids.reverse();
                    res = res.map(function (str) {
                        ids.forEach(function (id) {
                            str = str.replace(new RegExp('(\\' + escape + id + '\\' + escape + ')', 'g'), bracket[0] + '$1' + bracket[1]);
                        });
                        return str;
                    });
                });

                const re = new RegExp('\\' + escape + '([0-9]+)' + '\\' + escape);

                // transform references to tree
                function nest(str: string, refs: { [key: string]: string }, escape?: boolean): Array<NestNode> {
                    const res: Array<NestNode> = [];
                    let match: RegExpExecArray | null;

                    let a = 0;
                    while (match = re.exec(str)) {
                        if (a++ > 10e3) throw Error('Circular references in parenthesis');

                        res.push(str.slice(0, match.index));

                        res.push(nest(refs[match[1]], refs));

                        str = str.slice(match.index + match[0].length);
                    }

                    res.push(str);

                    return res;
                }

                return flat ? res : nest(res[0], res as any);
            }

            function stringify(arg: any[], opts: any) {
                if (opts && opts.flat) {
                    const escape = opts && opts.escape || '___';
                    // noinspection ES6ConvertVarToLetConst
                    var str = arg[0], prevStr;
                    // pretend bad string stringified with no parentheses
                    if (!str) return '';
                    const re = new RegExp('\\' + escape + '([0-9]+)' + '\\' + escape);
                    let a = 0;
                    // noinspection EqualityComparisonWithCoercionJS,JSUnusedAssignment
                    while (str != prevStr) {
                        if (a++ > 10e3) throw Error('Circular references in ' + arg);
                        prevStr = str;
                        str = str.replace(re, replaceRef);
                    }
                    return str;
                }

                return arg.reduce(function f(prev, curr) {
                    if (Array.isArray(curr)) {
                        curr = curr.reduce(f, '');
                    }
                    return prev + curr;
                }, '');

                function replaceRef(match: any, idx: number) {
                    if (arg[idx] == null) throw Error('Reference ' + idx + 'is undefined');
                    return arg[idx];
                }
            }

            function parenthesis(arg: any, opts: any) {
                if (Array.isArray(arg)) {
                    return stringify(arg, opts);
                } else {
                    return parse(arg, opts);
                }
            }

            parenthesis.parse = parse;
            parenthesis.stringify = stringify;

            const paren = parenthesis;

            function splitBy(string: string, separator: string | RegExp, o?: any) {
                let i;
                if (string == null) throw Error('First argument should be a string');
                if (separator == null) throw Error('Separator should be a string or a RegExp');

                if (!o) o = {};
                else if (typeof o === 'string' || Array.isArray(o)) {
                    o = { ignore: o };
                }

                if (o.escape == null) o.escape = true;
                if (o.ignore == null) o.ignore = ['[]', '()', '{}', '<>', '""', '\'\'', '``', '“”', '«»'];
                else {
                    if (typeof o.ignore === 'string') {
                        o.ignore = [o.ignore];
                    }

                    o.ignore = o.ignore.map(function (pair: string) {
                        // '"' → '""'
                        if (pair.length === 1) pair = pair + pair;
                        return pair;
                    });
                }

                const tokens = paren.parse(string, { flat: true, brackets: o.ignore });
                const str = tokens[0] as string;

                let parts = str.split(separator);

                // join parts separated by escape
                if (o.escape) {
                    const cleanParts = [];
                    for (i = 0; i < parts.length; i++) {
                        const prev = parts[i];
                        const part = parts[i + 1];

                        if (prev[prev.length - 1] === '\\' && prev[prev.length - 2] !== '\\') {
                            cleanParts.push(prev + separator + part);
                            i++;
                        } else {
                            cleanParts.push(prev);
                        }
                    }
                    parts = cleanParts;
                }

                // open parens pack & apply unquotes, if any
                for (i = 0; i < parts.length; i++) {
                    tokens[0] = parts[i];
                    parts[i] = paren.stringify(tokens, { flat: true });
                }

                return parts;
            }

            function parseLineHeight(value: string): string | number {
                const parsed = parseFloat(value);
                if (parsed.toString() === value) {
                    return parsed;
                }
                return value;
            }

            const isSize = function isSize(value: string) {
                // noinspection RegExpRedundantEscape
                return /^[\d\.]/.test(value)
                    || value.indexOf('/') !== -1
                    || sizes.indexOf(value) !== -1;
            };

            if (systemFontKeywords.indexOf(value) !== -1) {
                return cache[value] = { system: value };
            }

            const font = {
                style: 'normal',
                variant: 'normal',
                weight: 'normal',
                stretch: 'normal',
                lineHeight: 'normal' as string | number,
                size: '1rem',
                family: ['serif'],
            };

            let tokens = splitBy(value, /\s+/);
            let token: any;

            while (token = tokens.shift()) {
                if (globalKeywords.indexOf(token) !== -1) {
                    (['style', 'variant', 'weight', 'stretch'] as const).forEach(function (prop) {
                        font[prop] = token;
                    });
                    return cache[value] = font;
                }
                if (fontStyleKeywords.indexOf(token) !== -1) {
                    font.style = token;
                    continue;
                }
                if (token === 'normal' || token === 'small-caps') {
                    font.variant = token;
                    continue;
                }
                if (fontStretchKeywords.indexOf(token) !== -1) {
                    font.stretch = token;
                    continue;
                }
                if (fontWeightKeywords.indexOf(token) !== -1) {
                    font.weight = token;
                    continue;
                }
                if (isSize(token)) {
                    let parts = splitBy(token, '/');
                    font.size = parts[0];
                    if (parts[1] != null) {
                        font.lineHeight = parseLineHeight(parts[1]);
                    } else if (tokens[0] === '/') {
                        tokens.shift();
                        font.lineHeight = parseLineHeight(tokens.shift()!);
                    }
                    if (!tokens.length) {
                        throw new Error('Missing required font-family.');
                    }
                    font.family = splitBy(tokens.join(' '), /\s*,\s*/).map(unquote);
                    return cache[value] = font;
                }
                throw new Error('Unknown or unsupported font token: ' + token);
            }
            throw new Error('Missing required font-size.');
        }

        const _Object = utils.cache.Object;
        const _window = utils.cache.window;
        const _Reflect = utils.cache.Reflect;

        const markRenderingContextOperator = utils.markRenderingContextOperator;

        // Font Measurement

        // There are two ways to do font checking:
        // 1: tt:
        //  font original font size
        //  eg:
        //
        //      14px serif
        //      50px 'Urdu Typesetting',  serif
        //
        //      If the font exists, need to change the current font into a random size
        //      (just in case, to be not equal to all stored font sizes now),
        //      save the mapping of the random font size to avoid double checking
        //
        //      If the font does not exist, fallback to [original font] and set the font
        //
        // 2: pixelscan.net:
        //  font size
        //  eg:
        //      normal 4px Segoe UI Emoji
        //
        //      If the font exists, you need to change the current font to a random size
        //      If the font does not exist, fallback to [default font] in the font settings list
        //      window.getComputedStyle(document.body).getPropertyValue('font-family')
        //  How to deal with no-real-font-123 encountered
        //

        // Setup Logic:
        // Maintains a list of fonts for each ctx, a two-dimensional array:
        // setFontList: []   =>   [ctxIndex: [{font, parseFont}, {}]]
        // When setting the font, check if the font exists
        // ==> exist:
        // Generate random size fonts, do mapping relationships,
        // ==> not exist:
        // Replace the font back to the default font

        const setFontList: Array<{ orgFont: any }> = [];
        const fakeFontConfigMaps: Array<{ org: FontDesc, dest: FontDesc }> = [];

        // fakeFontConfigMaps
        // const item = {
        //     org: {style: 'normal', weight: 'normal', size: '50px', family: 'monospace'},
        //     dest: {style: 'italic', weight: '100', size: '52px', family: 'monospace'},
        // };

        // Get out the font that exists
        const allFonts = _Object.keys(fontSalt)
            .map(e => e.toLowerCase());

        const existFonts = _Object.entries(fontSalt)
            .filter(e => e[1].exists)
            .map(e => e[0].toLowerCase());

        if (0) {
            console.log(`hook font Total fonts present ${existFonts.length}`);
        }

        const hookFonts: string[] = [];
        // let hookCount = 0;

        // All lowercase
        const fontSaltWithLowerCaseName: { [key: string]: { style: string; weight: string; size: string; } } = _Object.fromEntries(
            _Object.entries(fontSalt).map(e => {
                e[0] = e[0].toLowerCase();
                return e;
            })) as any;

        const calcNewFont = (font: string, domNode?: HTMLElement) => {
            let newFont = null;

            // If the default font is set to trick us, we don't have to pay attention to it
            if (font && (font = font.toLowerCase()) !== '10px sans-serif') {
                if (!domNode) {
                    domNode = document.body;
                }
                try {
                    // variant = '',  stretch = '', lineHeight = '', 
                    let style = '', weight = '', size = '', family: string[];
                    try {
                        // noinspection JSUnusedAssignment
                        ({ style, /*variant, */ weight, /*stretch, lineHeight,*/ size, family } = parseFont(font));
                    } catch (ex) {
                        family = [font];
                        if (!domNode) {
                            domNode = document.body;
                        }
                        const cs = _window.getComputedStyle.call(null, domNode);
                        style = cs.fontStyle;
                        // noinspection JSUnusedAssignment
                        // variant = cs.fontVariant;
                        weight = cs.fontWeight;
                        // noinspection JSUnusedAssignment
                        // stretch = cs.fontStretch;
                        // noinspection JSUnusedAssignment
                        // lineHeight = cs.lineHeight;
                        size = cs.fontSize;
                    }
                    if (family.length) {
                        let targetFontFamily: string | null = null;
                        let fCount = 0;
                        for (let f of family) {
                            f = f.toLowerCase();
                            if (existFonts.includes(f)) {
                                // Font Presence
                                targetFontFamily = f;
                                if (!hookFonts.includes(f)) {
                                    hookFonts.push(f);
                                    if (0) {
                                        console.log(`hook font new Font ${f}, count: ${hookFonts.length}`);
                                    }
                                }
                                break;
                            }
                            ++fCount;
                        }
                        if (!targetFontFamily) {
                            // Default Font
                            targetFontFamily = _window.getComputedStyle.call(null, domNode)
                                .getPropertyValue('font-family')
                                .toLowerCase();
                        }
                        if (!targetFontFamily) {
                            targetFontFamily = family[0];
                        }
                        // Font combinations
                        // style weight size family
                        let fakeFontConfig = fakeFontConfigMaps
                            .find(e =>
                                e.org.style === style &&
                                e.org.weight === weight &&
                                e.org.size === size &&
                                e.org.family === targetFontFamily,
                            );
                        if (!fakeFontConfig) {
                            // Can't find it, need to add a new configuration
                            let targetStyle, targetWeight, targetSize;
                            const fontSalt = fontSaltWithLowerCaseName[targetFontFamily];
                            const sizeNumericValue = parseInt(size) || 5;
                            if (fontSalt) {
                                targetStyle = fontSalt.style;
                                targetWeight = fontSalt.weight;
                                targetSize = '' + (sizeNumericValue + fontSalt.size) + 'px';
                            } else {
                                // Can't find the configuration, then we have to go to the original value
                                targetStyle = style;
                                targetWeight = weight;
                                targetSize = size;
                            }
                            fakeFontConfig = {
                                org: { style, weight, size, family: targetFontFamily },
                                dest: { style: targetStyle, weight: targetWeight, size: targetSize, family: targetFontFamily},
                            };
                            fakeFontConfigMaps.push(fakeFontConfig);
                        }
                        // Set up with new fonts
                        // style weight size family
                        const dst = fakeFontConfig.dest; 
                        const newFontStr = [ dst.style, dst.weight, dst.size, dst.family ].join(' ').trim();
                        newFont = {
                            fontStyle: dst.style,
                            fontWeight: dst.weight,
                            fontSize: dst.size,
                            fontFamily: dst.family,
                            font: newFontStr,
                        };
                        if (0) {
                            console.log(`!!! hook font Original font：${font} New Fonts: ${JSON.stringify(newFont)} ${fCount !== 0 ? ' Can\'t find the font ' : ''}`);
                        }
                    }
                } catch (ex) {
                    // console.warn('hook font Failed to process fonts', ex);
                }
            }

            return newFont;
        };

        if (1) {
            // noinspection DuplicatedCode
            // let _OffscreenCanvas_prototype_getContext = null;
            // let _HTMLCanvasElement_prototype_getContext = null;
            const canvasAndContextClass = [];
            if ('undefined' !== typeof OffscreenCanvas) {
                canvasAndContextClass.push({
                    _Canvas: OffscreenCanvas,
                    _CanvasRenderingContext2D: OffscreenCanvasRenderingContext2D,
                    _Canvas_prototype_getContext: OffscreenCanvas.prototype.getContext,
                    _Canvas_prototype_toDataURL: (OffscreenCanvas.prototype as any).toDataURL,
                    _CanvasRenderingContext2D_prototype_getImageData: OffscreenCanvasRenderingContext2D.prototype.getImageData,
                });
                // noinspection JSUnusedAssignment
                // _OffscreenCanvas_prototype_getContext = OffscreenCanvas.prototype.getContext;
            }
            if ('undefined' !== typeof HTMLCanvasElement) {
                canvasAndContextClass.push({
                    _Canvas: HTMLCanvasElement,
                    _CanvasRenderingContext2D: CanvasRenderingContext2D,
                    _Canvas_prototype_getContext: HTMLCanvasElement.prototype.getContext,
                    _Canvas_prototype_toDataURL: HTMLCanvasElement.prototype.toDataURL,
                    _CanvasRenderingContext2D_prototype_getImageData: CanvasRenderingContext2D.prototype.getImageData,
                });
                // noinspection JSUnusedAssignment
                // _HTMLCanvasElement_prototype_getContext = HTMLCanvasElement.prototype.getContext;
            }
            for (const {
                // _Canvas,
                _CanvasRenderingContext2D
            } of canvasAndContextClass) {
                utils.replaceGetterWithProxy(_CanvasRenderingContext2D.prototype, 'font', {
                    apply(target, thisArg, args) {
                        // Current font
                        const contextIndex = markRenderingContextOperator(thisArg, 'font');
                        if (setFontList[contextIndex]) {
                            return setFontList[contextIndex].orgFont;
                        }
                        return _Reflect.apply(target, thisArg, args);
                    },
                });
                utils.replaceSetterWithProxy(_CanvasRenderingContext2D.prototype, 'font', {
                    apply(target: any, thisArg: any, args: any[]) {
                        const contextIndex = markRenderingContextOperator(thisArg, 'font');
                        if (0) {
                            console.log(`!!! h00k context:${contextIndex} set font:${Array.from(args).join('|')}`);
                        }
                        const font = args[0];
                        const newFont = calcNewFont(font, thisArg.canvas);
                        if (newFont) {
                            setFontList[contextIndex] = {
                                orgFont: font,
                            };
                            args[0] = newFont.font;
                        }
                        return _Reflect.apply(target, thisArg, args);
                    },
                });
            }
        }

        if (1) {
            // hook style
            const needsToHookStyles: Array<{ domNode: any; styleDeclaration: any, userSettings: { [key: string]: string }, computedStyles: any }> = [];
            // hook these properties
            const hookAttribs: Array<string> = [
                'font', 'fontFamily', 'fontFeatureSettings', 'fontKerning',
                'fontOpticalSizing', 'fontSize', 'fontSizeAdjust',
                'fontStretch', 'fontStyle', 'fontSynthesis', 'fontVariant', 'lineHeight'];

            const hookAttribsMap: { [key: string]: string } = {
                'font': 'font',
                'font-family': 'fontFamily',
                'fontFamily': 'fontFamily',
                'font-feature-settings': 'fontFeatureSettings',
                'fontFeatureSettings': 'fontFeatureSettings',
                'font-kerning': 'fontKerning',
                'fontKerning': 'fontKerning',
                'font-optical-sizing': 'fontOpticalSizing',
                'fontOpticalSizing': 'fontOpticalSizing',
                'font-size': 'fontSize',
                'fontSize': 'fontSize',
                'font-weight': 'fontWeight',
                'fontWeight': 'fontWeight',
                'font-size-adjust': 'fontSizeAdjust',
                'fontSizeAdjust': 'fontSizeAdjust',
                'font-stretch': 'fontStretch',
                'fontStretch': 'fontStretch',
                'font-style': 'fontStyle',
                'fontStyle': 'fontStyle',
                'font-synthesis': 'fontSynthesis',
                'fontSynthesis': 'fontSynthesis',
                'font-variant': 'fontVariant',
                'fontVariant': 'fontVariant',
                'line-height': 'lineHeight',
                'lineHeight': 'lineHeight',
            };

            // Final Write
            const finallyAttribsMap: { [key: string]: 'font' | 'fontFamily' | 'fontStyle' | 'fontWeight' | 'fontSize' } = {
                'font': 'font',
                'font-family': 'fontFamily',
                'font-style': 'fontStyle',
                'font-weight': 'fontWeight',
                'font-size': 'fontSize',
            };

            // Property Blacklist
            const hookAttribBlackList: string[] = [];

            const hookStyle = (domNode: any) => {
                let hookConfig: {
                    domNode: any;
                    styleDeclaration: any;
                    userSettings: { [key: string]: string };
                    computedStyles: any;
                    proxy?: any;
                } = needsToHookStyles.find(e => e.domNode === domNode)!;

                if (!hookConfig) {
                    // Get the original value
                    // noinspection JSUnresolvedVariable
                    const styleDeclaration = _Reflect.apply(utils.cache.Descriptor.HTMLElement.prototype.style.get, domNode, []);

                    // Saved objects
                    // The style property of this object
                    // User-set values
                    hookConfig = {
                        domNode,
                        styleDeclaration,
                        userSettings: {},
                        computedStyles: {},
                    };

                    needsToHookStyles.push(hookConfig);

                    // Get the first calculated value
                    const cs = _window.getComputedStyle.call(null, domNode) as unknown as { [key: string]: string };

                    const handler: ProxyHandler<any> = {
                        get: (target, property, receiver) => {
                            const orgResult = _Reflect.get(utils.getProxyTarget(target), property);
                            let result: string | (() => string);
                            if (_Object.getOwnPropertyDescriptor(target, property)) {
                                if (hookAttribs.includes(property as string)) {
                                    result = hookConfig.userSettings[property as string];
                                } else {
                                    result = orgResult;
                                }
                            } else {
                                // If the property is in the prototype
                                result = utils.getProxyTarget(target)[property];
                            }
                            if ('function' === typeof result) {
                                result = result.bind(utils.getProxyTarget(target));
                            }
                            return result;
                        },
                        set: (target, property, value, receiver) => {
                            if (_Object.getOwnPropertyDescriptor(target, property)) {
                                let handle = false;
                                let setterInvoked = false;
                                if (hookAttribs.includes(property as string)) {
                                    handle = handleUserSetFontStyle(
                                        () => {
                                            setterInvoked = true;
                                            return _Reflect.set(utils.getProxyTarget(target), property, value);
                                        },
                                        styleDeclaration,
                                        property as string,
                                        value);
                                }
                                if (!handle && !setterInvoked) {
                                    return _Reflect.set(utils.getProxyTarget(target), property, value);
                                }
                            } else {
                                // If the property is in the prototype
                                target[property] = value;
                            }
                            return true;
                        },
                        apply: (target, thisArg, args) => {
                            return _Reflect.apply(target, thisArg, args);
                        },
                    };
                    for (const attr of hookAttribs) {
                        hookConfig.userSettings[attr] = '';
                        hookConfig.computedStyles[attr] = cs[attr];
                    }
                    // Return the new proxy
                    const proxy = utils.newProxyInstance(
                        styleDeclaration,
                        utils.stripProxyFromErrors(handler),
                    );
                    utils.redirectToString(proxy, styleDeclaration);
                    hookConfig.proxy = proxy;
                }
                return hookConfig.proxy;
            };

            /**
             * Set font style
             * @param cb
             * @param styleDeclaration
             * @param attr
             * @param value
             * @returns boolean
             */
            const handleUserSetFontStyle = (cb: () => void, styleDeclaration: any, attr: string, value: string): boolean => {
                const hookConfig = needsToHookStyles.find(e => e.styleDeclaration === styleDeclaration);
                if (hookConfig && attr && value) {
                    let domNode = hookConfig.domNode;
                    if (0) {
                        console.log(`hook font Set Properties ${attr} ${value}`);
                    }
                    // Find the correspondence of attr
                    let targetAttr = hookAttribsMap[attr] as "font" | "fontFamily" | "fontStyle" | "fontWeight" | "fontSize";
                    if (!targetAttr && !hookAttribBlackList.includes(attr)) {
                        // No correspondence found, then set it and get the changes from computedStyle
                        // May be set '', '::before', '::after'

                        // Note: Valid pseudo-element selector refers to syntactic validity, e.g.
                        // ::unsupported is considered valid,
                        // even though the pseudo-element itself is not supported.
                        // Additionally, the latest W3 standard explicitly supports only ::before and ::after,
                        // while the CSS WG draft does not restrict this value.
                        // Browser compatibility may vary.
                        const pseudos = ['', '::before', '::after'];
                        const cs: Array<{ [key: string]: string }> = [];
                        const csBefore: Array<{ [key: string]: string }> = [];
                        const csAfter: Array<{ [key: string]: string }> = [];
                        for (let n = 0; n < pseudos.length; ++n) {
                            const pseudo = pseudos[n];
                            cs[n] = _window.getComputedStyle.call(null, domNode, pseudo) as unknown as { [key: string]: string };
                            csBefore[n] = {};
                            csAfter[n] = {};
                            for (const attr of hookAttribs) {
                                csBefore[n][attr as string] = cs[n][attr as string];
                            }
                        }
                        // fuck it
                        cb();
                        for (let n = 0; n < pseudos.length; ++n) {
                            for (const attr of hookAttribs) {
                                csAfter[n][attr] = cs[n][attr];
                            }
                        }
                        // Find the properties that change
                        const changedAttrs: string[] = [];
                        for (let n = 0; n < pseudos.length; ++n) {
                            for (const attr of hookAttribs) {
                                if (csBefore[n][attr] !== csAfter[n][attr]) {
                                    if (!changedAttrs.includes(attr)) {
                                        changedAttrs.push(attr);
                                    }
                                }
                            }
                        }
                        if (changedAttrs.length) {
                            // 'font' has the highest priority, because it changes many attributes
                            if (changedAttrs.includes('font')) {
                                targetAttr = 'font';
                            } else {
                                // FIXME: Only the first changed property is taken here
                                targetAttr = changedAttrs[0] as "font" | "fontFamily" | "fontStyle" | "fontWeight" | "fontSize";
                            }
                            // Write back into the correspondence
                            hookAttribsMap[attr] = targetAttr;
                            // Eventually it has to be written in
                            finallyAttribsMap[attr] = targetAttr;
                        }
                        if (!targetAttr) {
                            // The font properties we care about are still unchanged and added to the blacklist
                            hookAttribBlackList.push(attr);
                        }
                    }
                    if (targetAttr) {
                        // Find correspondence
                        hookConfig.userSettings[targetAttr] = value;
                        // If it is 'font', then parse the font and split
                        if (targetAttr === 'font') {
                            let style, variant, weight, stretch, lineHeight, size, family;
                            try {
                                ({ style, variant, weight, stretch, lineHeight, size, family } = parseFont(value));
                            } catch (ex) {
                                family = [value];
                                // Get the value set by the user
                                style = hookConfig.userSettings.fontStyle || hookConfig.computedStyles.fontStyle;
                                weight = hookConfig.userSettings.fontWeight || hookConfig.computedStyles.fontWeight;
                                size = hookConfig.userSettings.fontSize || hookConfig.computedStyles.fontSize;
                                variant = hookConfig.userSettings.fontVariant || hookConfig.computedStyles.fontVariant;
                                stretch = hookConfig.userSettings.fontStretch || hookConfig.computedStyles.fontStretch;
                                lineHeight = hookConfig.userSettings.lineHeight || hookConfig.computedStyles.lineHeight;
                            }
                            // Set after parsing
                            hookConfig.userSettings.fontStyle = style;
                            hookConfig.userSettings.fontWeight = weight;
                            hookConfig.userSettings.fontSize = size;
                            hookConfig.userSettings.fontFamily = family[0];
                            hookConfig.userSettings.fontVariant = variant;
                            hookConfig.userSettings.fontStretch = stretch;
                            hookConfig.userSettings.lineHeight = lineHeight;
                        } else {
                            hookConfig.userSettings[targetAttr] = value;
                        }
                        // Finally finished, start constructing the new font
                        // The new font consists of these parameters.
                        // fontStyle
                        // fontWeight
                        // fontSize
                        // fontFamily
                        // If the user does not set it, then get the value from the calculated
                        const orgFont = [
                            hookConfig.userSettings.fontStyle || hookConfig.computedStyles.fontStyle,
                            hookConfig.userSettings.fontWeight || hookConfig.computedStyles.fontWeight,
                            hookConfig.userSettings.fontSize || hookConfig.computedStyles.fontSize,
                            hookConfig.userSettings.fontFamily || hookConfig.computedStyles.fontFamily,
                        ].join(' ').trim();
                        const newFont = calcNewFont(orgFont, domNode);
                        if (newFont) {
                            // Reflect.set(styleDeclaration, 'font', newFont);
                            // noinspection JSUnresolvedVariable
                            const setPropertyCaller = utils.cache.Descriptor.CSSStyleDeclaration.prototype.setProperty.value;
                            // Iterate over the content to be written
                            for (const [attr, destAttr] of Object.entries(finallyAttribsMap)) {
                                setPropertyCaller.call(styleDeclaration, attr, newFont[destAttr], 'important');
                            }
                            return true;
                        }
                    }
                }
                return false;
            };
            if ('undefined' !== typeof HTMLElement) {
                utils.replaceGetterWithProxy(HTMLElement.prototype, 'style', {
                    apply(target, thisArg, args) {
                        _Reflect.apply(target, thisArg, args);
                        return hookStyle(thisArg);
                    },
                });
            }
            // let handle = false;
            //
            // // TODO: getPropertyValue
            //
            // if ('setProperty' === target) {
            //     debugger;
            //     handle = handleUserSetFontStyle(
            //         () => _Reflect.apply(target, thisArg, args),
            //         null,
            //         thisArg,
            //         args && args[0],
            //         args && args[1],
            //     );
            // }
            //
            // if (!handle) {
            //     _Reflect.apply(target, thisArg, args).bind(target);
            // }
            if ('undefined' !== typeof CSSStyleDeclaration) {
                const _CSSStyleDeclaration_prototype_setProperty = CSSStyleDeclaration.prototype.setProperty;
                utils.replaceWithProxy(CSSStyleDeclaration.prototype, 'setProperty', {
                    apply(target: any, thisArg: any, args: any[]) {
                        const handle = handleUserSetFontStyle(
                            () => {
                                return _CSSStyleDeclaration_prototype_setProperty.apply(utils.getProxyTarget(thisArg), args as any);
                                // return _Reflect.apply(target, thisArg, args);
                            },
                            thisArg,
                            args && args[0],
                            args && args[1],
                        );
                        if (!handle) {
                            // _Reflect.apply(target, thisArg, args);
                            return _CSSStyleDeclaration_prototype_setProperty.apply(utils.getProxyTarget(thisArg), args as any);
                        }
                    },
                });
            }
            // utils.replaceSetterWithProxy(HTMLElement.prototype, 'style', {
            //     apply(target, thisArg, args) {
            //         const result = _Reflect.apply(target, thisArg, args);
            //         hookStyle(thisArg, args[0]);
            //
            //         return result;
            //     },
            // });
        }

        // font-face
        // noinspection JSUnresolvedVariable
        if ('undefined' !== utils.cache.global.FontFace) {
            const fontFaceConfigCache: Array<{ fontFace: any, args: any, fontFamily: string }> = [];
            utils.replaceWithProxy(utils.cache.global, 'FontFace', {
                construct(target: any, args) {
                    if (0) {
                        console.log('hook font fontFace constructor called', args);
                    }
                    const result = new target(...args);
                    // Determine if args[1] contains local and has a font
                    const source = args[1];
                    const matches = source.replace(/['"]+/g, '').match(/local\((.*)\)/);
                    if (matches && matches.length > 1) {
                        const fontFamily = matches[1].toLowerCase();
                        if (allFonts.includes(fontFamily)) {
                            if (0) {
                                console.log(`hook FontFace font ${fontFamily}`);
                            }
                            fontFaceConfigCache.push({ fontFace: result, args, fontFamily });
                        }
                    }
                    return result;
                },
            });

            // noinspection JSUnresolvedVariable
            utils.replaceWithProxy(FontFace.prototype, 'load', {
                async apply(target, thisArg, args) {
                    let result = null;
                    let err = null;
                    try {
                        // noinspection JSUnresolvedVariable
                        result = await utils.cache.Descriptor.FontFace.prototype.load.value.call(thisArg); //_Reflect.apply(target, thisArg, args);
                    } catch (ex) {
                        err = ex;
                        // If the descriptor is messed up, this error is thrown
                        if (!(err as Error).message.includes('A network error occurred')) {
                            return Promise.reject(utils.patchError(ex as Error, 'load'));
                        }
                    }
                    // Find the font configuration
                    const fontFaceConfig = fontFaceConfigCache.find(
                        e => e.fontFace === thisArg,
                    );
                    if (fontFaceConfig) {
                        // Get font configuration
                        const fontExists = existFonts.includes(fontFaceConfig.fontFamily);
                        if (fontExists) {
                            return Promise.resolve(thisArg);
                        } else {
                            return Promise.reject(
                                utils.patchError(new DOMException('A network error occurred.'), 'load'),
                            );
                        }
                    }
                    if (!result) {
                        if (err) {
                            return Promise.reject(err);
                        } else {
                            // FIXME: Theoretically it should not result in non-existent
                            return Promise.reject(
                                utils.patchError(new DOMException('A network error occurred.'), 'load'),
                            );
                        }
                    }
                    return Promise.resolve(result);
                },
            });
        }

        // FontFaceSet
        if ('undefined' !== typeof globalThis && 'undefined' !== typeof (globalThis as any).fonts) {
            const _FontFaceSet_prototype = _Object.getPrototypeOf((globalThis as any).fonts);
            utils.replaceWithProxy(_FontFaceSet_prototype, 'check', {
                apply(target: any, thisArg, args) {
                    _Reflect.apply(target, thisArg, args);
                    // args[0] is the font to be checked
                    const font = args[0];
                    let family = [];
                    try {
                        ({ family } = parseFont(font));
                    } catch (ex) {
                        family = [font];
                    }
                    if (family.length === 0) {
                        return false;
                    }
                    for (const f of family) {
                        if (existFonts.includes(f.toLowerCase())) {
                            return true;
                        }
                    }
                    return false;
                },
            });
        }
    };
}

export default (pluginConfig?: Partial<PluginOptions>) => new Plugin(pluginConfig)
