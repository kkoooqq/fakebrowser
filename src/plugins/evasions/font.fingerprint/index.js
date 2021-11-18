// noinspection JSUnusedLocalSymbols

'use strict';

const {PuppeteerExtraPlugin} = require('puppeteer-extra-plugin');
const withUtils = require('../_utils/withUtils');
const withWorkerUtils = require('../_utils/withWorkerUtils');

class Plugin extends PuppeteerExtraPlugin {
    constructor(opts = {}) {
        super(opts);
    }

    get name() {
        return 'evasions/font.fingerprint';
    }

    // noinspection JSUnusedGlobalSymbols
    get requirements() {
        return new Set(['runLast']);
    }

    async onPageCreated(page) {
        await withUtils(this, page).evaluateOnNewDocument(this.mainFunction, this.opts.fakeDD.fontSalt);
    }

    onServiceWorkerContent(jsContent) {
        return withWorkerUtils(this, jsContent).evaluate(this.mainFunction, this.opts.fakeDD.fontSalt);
    }

    mainFunction = (utils, fontSalt) => {
        // Thanks to: https://github.com/dy/css-font
        function parseFont(value) {
            if (typeof value !== 'string') throw new Error('Font argument must be a string.');

            if (value === '') {
                throw new Error('Cannot parse an empty string.');
            }

            if (!this.cache) {
                this.cache = {};
            }

            const cache = this.cache;
            if (cache[value]) return cache[value];

            const globalKeywords = [
                'inherit',
                'initial',
                'unset',
            ];

            const systemFontKeywords = [
                'caption',
                'icon',
                'menu',
                'message-box',
                'small-caption',
                'status-bar',
            ];

            const fontWeightKeywords = [
                'normal',
                'bold',
                'bolder',
                'lighter',
                '100',
                '200',
                '300',
                '400',
                '500',
                '600',
                '700',
                '800',
                '900',
            ];

            const fontStyleKeywords = [
                'normal',
                'italic',
                'oblique',
            ];

            const fontStretchKeywords = [
                'normal',
                'condensed',
                'semi-condensed',
                'extra-condensed',
                'ultra-condensed',
                'expanded',
                'semi-expanded',
                'extra-expanded',
                'ultra-expanded',
            ];

            const sizes = [
                'xx-small',
                'x-small',
                'small',
                'medium',
                'large',
                'x-large',
                'xx-large',
                'larger',
                'smaller',
            ];

            function unquote(str) {
                // noinspection RegExpRedundantEscape
                const reg = /[\'\"]/;

                if (!str) {
                    return '';
                }
                if (reg.test(str.charAt(0))) {
                    str = str.substr(1);
                }
                if (reg.test(str.charAt(str.length - 1))) {
                    str = str.substr(0, str.length - 1);
                }
                return str;
            }

            function parse(str, opts) {
                // pretend non-string parsed per-se
                if (typeof str !== 'string') return [str];

                let res = [str];

                if (typeof opts === 'string' || Array.isArray(opts)) {
                    opts = {brackets: opts};
                } else if (!opts) opts = {};

                const brackets = opts.brackets ? (Array.isArray(opts.brackets) ? opts.brackets : [opts.brackets]) : ['{}', '[]', '()'];

                const escape = opts.escape || '___';

                const flat = !!opts.flat;

                brackets.forEach(function (bracket) {
                    // create parenthesis regex
                    const pRE = new RegExp(['\\', bracket[0], '[^\\', bracket[0], '\\', bracket[1], ']*\\', bracket[1]].join(''));

                    let ids = [];

                    function replaceToken(token, idx, str) {
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
                function nest(str, refs, escape) {
                    const res = [];
                    let match;

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

                return flat ? res : nest(res[0], res);
            }

            function stringify(arg, opts) {
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

                function replaceRef(match, idx) {
                    if (arg[idx] == null) throw Error('Reference ' + idx + 'is undefined');
                    return arg[idx];
                }
            }

            function parenthesis(arg, opts) {
                if (Array.isArray(arg)) {
                    return stringify(arg, opts);
                } else {
                    return parse(arg, opts);
                }
            }

            parenthesis.parse = parse;
            parenthesis.stringify = stringify;

            const paren = parenthesis;

            function splitBy(string, separator, o) {
                let i;
                if (string == null) throw Error('First argument should be a string');
                if (separator == null) throw Error('Separator should be a string or a RegExp');

                if (!o) o = {};
                else if (typeof o === 'string' || Array.isArray(o)) {
                    o = {ignore: o};
                }

                if (o.escape == null) o.escape = true;
                if (o.ignore == null) o.ignore = ['[]', '()', '{}', '<>', '""', '\'\'', '``', '“”', '«»'];
                else {
                    if (typeof o.ignore === 'string') {
                        o.ignore = [o.ignore];
                    }

                    o.ignore = o.ignore.map(function (pair) {
                        // '"' → '""'
                        if (pair.length === 1) pair = pair + pair;
                        return pair;
                    });
                }

                const tokens = paren.parse(string, {flat: true, brackets: o.ignore});
                const str = tokens[0];

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
                    parts[i] = paren.stringify(tokens, {flat: true});
                }

                return parts;
            }

            function parseLineHeight(value) {
                const parsed = parseFloat(value);
                if (parsed.toString() === value) {
                    return parsed;
                }
                return value;
            }

            const isSize = function isSize(value) {
                // noinspection RegExpRedundantEscape
                return /^[\d\.]/.test(value)
                    || value.indexOf('/') !== -1
                    || sizes.indexOf(value) !== -1;
            };

            if (systemFontKeywords.indexOf(value) !== -1) {
                return cache[value] = {system: value};
            }

            const font = {
                style: 'normal',
                variant: 'normal',
                weight: 'normal',
                stretch: 'normal',
                lineHeight: 'normal',
                size: '1rem',
                family: ['serif'],
            };

            let tokens = splitBy(value, /\s+/);
            let token;

            while (token = tokens.shift()) {
                if (globalKeywords.indexOf(token) !== -1) {
                    ['style', 'variant', 'weight', 'stretch'].forEach(function (prop) {
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
                        font.lineHeight = parseLineHeight(tokens.shift());
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

        const setFontList = [];
        const fakeFontConfigMaps = [];

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

        const hookFonts = [];
        let hookCount = 0;

        // All lowercase
        const fontSaltWithLowerCaseName = _Object.fromEntries(
            _Object.entries(fontSalt).map(e => {
                e[0] = e[0].toLowerCase();
                return e;
            }));

        const calcNewFont = (font, domNode) => {
            let newFont = null;

            // If the default font is set to trick us, we don't have to pay attention to it
            if (font && (font = font.toLowerCase()) !== '10px sans-serif') {
                if (!domNode) {
                    domNode = document.body;
                }

                try {
                    let style = '', variant, weight = '', stretch,
                        lineHeight, size = '', family;

                    try {
                        // noinspection JSUnusedAssignment
                        ({style, variant, weight, stretch, lineHeight, size, family} = parseFont(font));
                    } catch (ex) {
                        family = [font];

                        if (!domNode) {
                            domNode = document.body;
                        }

                        const cs = _window.getComputedStyle.call(null, domNode);
                        style = cs.fontStyle;
                        // noinspection JSUnusedAssignment
                        variant = cs.fontVariant;
                        weight = cs.fontWeight;
                        // noinspection JSUnusedAssignment
                        stretch = cs.fontStretch;
                        // noinspection JSUnusedAssignment
                        lineHeight = cs.lineHeight;
                        size = cs.fontSize;
                    }

                    if (family.length) {
                        let targetFontFamily = null;
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
                                org: {style, weight, size, family: targetFontFamily},
                                dest: {
                                    style: targetStyle,
                                    weight: targetWeight,
                                    size: targetSize,
                                    family: targetFontFamily,
                                },
                            };

                            fakeFontConfigMaps.push(fakeFontConfig);
                        }

                        // Set up with new fonts
                        // style weight size family
                        const newFontStr = [
                            fakeFontConfig.dest.style,
                            fakeFontConfig.dest.weight,
                            fakeFontConfig.dest.size,
                            fakeFontConfig.dest.family,
                        ].join(' ').trim();

                        newFont = {
                            fontStyle: fakeFontConfig.dest.style,
                            fontWeight: fakeFontConfig.dest.weight,
                            fontSize: fakeFontConfig.dest.size,
                            fontFamily: fakeFontConfig.dest.family,
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
            let _OffscreenCanvas_prototype_getContext = null;
            let _HTMLCanvasElement_prototype_getContext = null;

            const canvasAndContextClass = [];
            if ('undefined' !== typeof OffscreenCanvas) {
                canvasAndContextClass.push({
                    _Canvas: OffscreenCanvas,
                    _CanvasRenderingContext2D: OffscreenCanvasRenderingContext2D,
                    _Canvas_prototype_getContext: OffscreenCanvas.prototype.getContext,
                    _Canvas_prototype_toDataURL: OffscreenCanvas.prototype.toDataURL,
                    _CanvasRenderingContext2D_prototype_getImageData: OffscreenCanvasRenderingContext2D.prototype.getImageData,
                });

                // noinspection JSUnusedAssignment
                _OffscreenCanvas_prototype_getContext = OffscreenCanvas.prototype.getContext;
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
                _HTMLCanvasElement_prototype_getContext = HTMLCanvasElement.prototype.getContext;
            }

            for (const {
                _Canvas,
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
                    apply(target, thisArg, args) {
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
            const needsToHookStyles = [];

            // hook these properties
            const hookAttribs = [
                'font', 'fontFamily', 'fontFeatureSettings', 'fontKerning',
                'fontOpticalSizing', 'fontSize', 'fontSizeAdjust',
                'fontStretch', 'fontStyle', 'fontSynthesis', 'fontVariant', 'lineHeight'];

            const hookAttribsMap = {
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
            const finallyAttribsMap = {
                'font': 'font',
                'font-family': 'fontFamily',
                'font-style': 'fontStyle',
                'font-weight': 'fontWeight',
                'font-size': 'fontSize',
            };

            // Property Blacklist
            const hookAttribBlackList = [];

            const hookStyle = (domNode) => {
                let hookConfig = needsToHookStyles.find(e => e.domNode === domNode);

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
                    const cs = _window.getComputedStyle.call(null, domNode);

                    const handler = {
                        get: (target, property, receiver) => {
                            const orgResult = _Reflect.get(utils.getProxyTarget(target), property);
                            let result;

                            if (_Object.getOwnPropertyDescriptor(target, property)) {
                                if (hookAttribs.includes(property)) {
                                    result = hookConfig.userSettings[property];
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

                                if (hookAttribs.includes(property)) {
                                    handle = handleUserSetFontStyle(
                                        () => {
                                            setterInvoked = true;
                                            return _Reflect.set(utils.getProxyTarget(target), property, value);
                                        },
                                        styleDeclaration,
                                        property,
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
            const handleUserSetFontStyle = (cb, styleDeclaration, attr, value) => {
                const hookConfig = needsToHookStyles.find(e => e.styleDeclaration === styleDeclaration);
                if (hookConfig && attr && value) {
                    let domNode = hookConfig.domNode;

                    if (0) {
                        console.log(`hook font Set Properties ${attr} ${value}`);
                    }

                    // Find the correspondence of attr
                    let targetAttr = hookAttribsMap[attr];

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

                        const cs = [];
                        const csBefore = [];
                        const csAfter = [];

                        for (let n = 0; n < pseudos.length; ++n) {
                            const pseudo = pseudos[n];
                            cs[n] = _window.getComputedStyle.call(null, domNode, pseudo);
                            csBefore[n] = {};
                            csAfter[n] = {};

                            for (const attr of hookAttribs) {
                                csBefore[n][attr] = cs[n][attr];
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
                        const changedAttrs = [];

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
                                targetAttr = changedAttrs[0];
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
                            let style, variant, weight, stretch,
                                lineHeight, size, family;

                            try {
                                ({
                                    style,
                                    variant,
                                    weight,
                                    stretch,
                                    lineHeight,
                                    size,
                                    family,
                                } = parseFont(value));
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
                    apply(target, thisArg, args) {
                        const handle = handleUserSetFontStyle(
                            () => {
                                return _CSSStyleDeclaration_prototype_setProperty.apply(utils.getProxyTarget(thisArg), args);
                                // return _Reflect.apply(target, thisArg, args);
                            },
                            thisArg,
                            args && args[0],
                            args && args[1],
                        );

                        if (!handle) {
                            // _Reflect.apply(target, thisArg, args);
                            return _CSSStyleDeclaration_prototype_setProperty.apply(utils.getProxyTarget(thisArg), args);
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
            const fontFaceConfigCache = [];

            utils.replaceWithProxy(utils.cache.global, 'FontFace', {
                construct(target, args) {
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

                            fontFaceConfigCache.push({fontFace: result, args, fontFamily});
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
                        if (!err.message.includes('A network error occurred')) {
                            return Promise.reject(utils.patchError(ex, 'load'));
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
        if ('undefined' !== typeof globalThis && 'undefined' !== typeof globalThis.fonts) {
            const _FontFaceSet_prototype = _Object.getPrototypeOf(globalThis.fonts);

            utils.replaceWithProxy(_FontFaceSet_prototype, 'check', {
                apply(target, thisArg, args) {
                    _Reflect.apply(target, thisArg, args);

                    // args[0] is the font to be checked
                    const font = args[0];
                    let family = [];

                    try {
                        ({family} = parseFont(font));
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

module.exports = function (pluginConfig) {
    return new Plugin(pluginConfig);
};
