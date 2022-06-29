// noinspection JSUnusedGlobalSymbols

import {strict as assert} from 'assert'
import {UserAgentHelper} from './UserAgentHelper.js'
import {helper} from './helper'

export enum FontExistTypes {
    FontNotExists,
    FontExists,
    BaseFont,
}

export interface DeviceDescriptorNavigator {
    languages: string[],
    userAgent: string,
    appCodeName: string,
    appMinorVersion: string,
    appName: string,
    appVersion: string,
    buildID: string,
    platform: string,
    product: string,
    productSub: string,
    hardwareConcurrency: number,
    cpuClass: string,
    maxTouchPoints: number,
    oscpu: string,
    vendor: string,
    vendorSub: string,
    deviceMemory: number,
    doNotTrack: string,
    msDoNotTrack: string,
    vibrate: string,
    credentials: string,
    storage: string,
    requestMediaKeySystemAccess: string,
    bluetooth: string,
    language: string,
    systemLanguage: string,
    userLanguage: string,
    webdriver: boolean,
}

export interface DeviceDescriptorVoices {
    default: boolean;
    lang: string;
    localService: boolean;
    name: string;
    voiceURI: string;
}

export interface DeviceDescriptorMediaDevices {
    deviceId: string;
    kind: string;
    label: string;
    groupId: string;
}

export interface DeviceDescriptorMediaBattery {
    charging: boolean;
    chargingTime: number;
    dischargingTime: number;
    level: number;
}

export interface DeviceDescriptorPluginsMimeTypes {
    type: string, // "application/pdf",
    suffixes: string, //  "pdf",
    description: string, //  "Portable Document Format",
    __pluginName: string, //  "Chrome PDF Plugin"
}

export interface DeviceDescriptorPluginsPlugins {
    name: string,
    filename: string,
    description: string,
    __mimeTypes: string[],
}

export interface DeviceDescriptorPlugins {
    mimeTypes: Array<DeviceDescriptorPluginsMimeTypes>,
    plugins: Array<DeviceDescriptorPluginsPlugins>
}
/**
 * Source information for browser fingerprint.
 * Includes plugins, gpu, fonts, webgl, etc.
 *
 * Q: How do we get this information?
 * A: Use dumpDD.js to collect fingerprints.
 */
export interface DeviceDescriptor {
    plugins: DeviceDescriptorPlugins,
    allFonts: Array<{
        name: string,
        exists: FontExistTypes,
    }>,
    rtc?: Array<{candidate: string, reg: Array<string| null>}>,
    gpu: {
        vendor: string,
        renderer: string,
    },
    navigator: DeviceDescriptorNavigator,
    window: {
        innerWidth: number,
        innerHeight: number,
        outerWidth: number,
        outerHeight: number,
        screenX: number,
        screenY: number,
        pageXOffset: number,
        pageYOffset: number,
        Image: string,
        isSecureContext: boolean,
        devicePixelRatio: number,
        toolbar: string,
        locationbar: string,
        ActiveXObject: string,
        external: string,
        mozRTCPeerConnection: string,
        postMessage: string,
        webkitRequestAnimationFrame: string,
        BluetoothUUID: string,
        netscape: string,
        localStorage: string,
        sessionStorage: string,
        indexDB: string,
    },
    document: {
        characterSet: string,
        compatMode: string,
        documentMode: string,
        layers: string,
        images: string,
    },
    screen: {
        availWidth: number,
        availHeight: number,
        availLeft: number,
        availTop: number,
        width: number,
        height: number,
        colorDepth: number,
        pixelDepth: number
    },
    body: {
        clientWidth: number,
        clientHeight: number
    },
    webgl: WebGLDescriptor,
    webgl2: WebGLDescriptor,
    mimeTypes: Array<{
        mimeType: string,
        audioPlayType: string,
        videoPlayType: string,
        mediaSource: boolean,
        mediaRecorder: boolean,
    }>,
    mediaDevices: Array<DeviceDescriptorMediaDevices>,
    battery: DeviceDescriptorMediaBattery,
    voices: Array<DeviceDescriptorVoices>,
    windowVersion: string[],
    htmlElementVersion: string[],
    keyboard: Record<string, string>,
    permissions: Record<string, {
        state?: string,
        exType?: string,
        msg?: string,
    }>,
}

export interface WebGLDescriptor {
    supportedExtensions: string[],
    contextAttributes: {
        alpha: boolean,
        antialias: boolean,
        depth: boolean,
        desynchronized: boolean,
        failIfMajorPerformanceCaveat: boolean,
        powerPreference: string,
        premultipliedAlpha: boolean,
        preserveDrawingBuffer: boolean,
        stencil: boolean,
        xrCompatible: boolean
    },
    maxAnisotropy: number,
    params: Record<string, {
        type: string,
        value: null | string | number | number[] | Record<string, number>
    }>,
    shaderPrecisionFormats: Array<{
        shaderType: number,
        precisionType: number,
        r: {
            rangeMin: number,
            rangeMax: number,
            precision: number,
        }
    }>
}

export type ChromeUACHHeaders = {
    'Accept-Language'?: string,
    // 'referer': referers[sh.rd(0, referers.length - 1)],
    'sec-ch-ua'?: string,
    'sec-ch-ua-mobile'?: string,
    'sec-ch-ua-platform'?: string,
}

/**
 * Simplify the font information into family, style, weight, size
 */
export interface FontDescriptor {
    fontFamily: string,
    fontStyle: string,
    fontWeight: string,
    fontSize: number,
}

export interface FakeFont {
    exists: boolean,
    originalFontFamily: string,
    fakeFont: FontDescriptor,
}

export type IFontSalt = {
    exists: boolean,
    offsetWidth: number,
    offsetHeight: number,
    style: string,
    weight: string,
    size: number,
}

export interface FakeDeviceDescriptor extends DeviceDescriptor {
    canvasSalt?: number[],
    // TODO: I should make a correspondence between user's existing fonts and required fonts,
    //  but I don't have time to do it for now.
    // fakeFonts: Array<FakeFont>,
    fontSalt?: {
        [key: string]: IFontSalt
    },
    acceptLanguage?: string,
}

export default class DeviceDescriptorHelper {

    /**
     * Check device descriptor legal based on attributes
     * @param dd
     */
    static checkLegal(dd: DeviceDescriptor): boolean {
        if (!dd) {
            throw new Error('DeviceDescriptor empty')
        }

        if (!dd.navigator) {
            throw new Error('navigator empty')
        }
        const { innerHeight, innerWidth } = dd.window;
        const { availHeight, availWidth } = dd.screen;
        if (!UserAgentHelper.isMobile(dd.navigator.userAgent)) {
            // If not mobile phone, but screen is too small, filter it out
            if (innerWidth < 900 || innerHeight < 450) {
                throw new Error('width and height of windows is too small')
            }

            // Screen height greater than width, remove it
            if (innerHeight > innerWidth) {
                throw new Error('Height of window is greater than width of window, non-normal browser')
            }

            if (innerWidth > availWidth) {
                throw new Error(`Width of browser(${innerWidth}) window cannot be greater than width of screen(${availWidth})`)
            }

            if (innerHeight > availHeight) {
                throw new Error(`Height of browser(${innerHeight}) window cannot be greater than height of screen(${availHeight})`)
            }

            // No plugins and mineType information, remove
            // noinspection RedundantIfStatementJS
            if (!dd.plugins || !dd.plugins.mimeTypes.length || !dd.plugins.plugins.length) {
                throw new Error('Plugins of desktop browser cannot be empty')
            }

            // Ordinary PC computers should not have touch screens
            if (dd.navigator.maxTouchPoints != 0) {
                throw new Error('Desktop browsers cannot have touchscreens')
            }

            // mimeTypes
            if (!dd.mimeTypes || !dd.mimeTypes.length) {
                throw new Error('mimeTypes cannot be empty')
            }

            // permissions
            if (!dd.permissions || Object.keys(dd.permissions).length === 0) {
                throw new Error('permissions cannot be empty')
            }
        } else {
            if (dd.navigator.maxTouchPoints === 0) {
                throw new Error('Mobile devices must have touch screen')
            }
        }

        assert(dd.navigator.userAgent, 'userAgent cannot be empty')
        const lowerCaseUserAgent = dd.navigator.userAgent.toLowerCase()

        if (
            !dd.navigator.language
            || !dd.navigator.languages
            || !dd.navigator.languages.length
        ) {
            throw new Error('language cannot be empty')
        }

        // if (e.window.screenX != 0 || e.window.screenY != 0) {
        //     return false
        // }

        // Only chrome browser is allowed
        if (
            !lowerCaseUserAgent.includes('chrome')
            && !lowerCaseUserAgent.includes('crios')
        ) {
            throw new Error('Only chrome kernel browsers are supported')
        }

        // chrome os
        if (lowerCaseUserAgent.includes('cros')) {
            throw new Error('ChromeOS is not supported')
        }

        // Googlebot
        if (lowerCaseUserAgent.includes('googlebot')) {
            throw new Error('google bot')
        }
        if (lowerCaseUserAgent.includes('adsbot-google')) {
            throw new Error('google bot')
        }

        if (lowerCaseUserAgent.includes('mediapartners')) {
            throw new Error('google bot')
        }

        // Chrome-Lighthouse
        if (lowerCaseUserAgent.includes('chrome-lighthouse')) {
            throw new Error('google bot')
        }

        // voices
        if (!dd.voices || !dd.voices.length) {
            throw new Error('voices cannot be empty')
        }

        return true
    }

    /**
     * Calculate browser UUID
     * We simply use DeviceDescriptor JSON string and take MD5.
     * @param e
     */
    static deviceUUID(e: DeviceDescriptor): string {
        // TODO sort e before serialize
        return helper.md5(JSON.stringify(e))
    }

    static buildFakeDeviceDescriptor(
        deviceDesc: DeviceDescriptor,
    ): {
        fakeDeviceDesc: FakeDeviceDescriptor,
        needsUpdate: boolean
    } {
        assert(!!deviceDesc)

        let needsUpdate = false
        const fakeDD: FakeDeviceDescriptor = helper.objClone(deviceDesc) as FakeDeviceDescriptor

        // Fake new fonts
        if (!fakeDD.fontSalt) {
            // Handling font correspondence
            const fonts: Record<string, IFontSalt> = {}

            let fontEntries = fakeDD.allFonts

            // Find the remaining fonts that have not been added
            const extraFonts = ['Trebuchet MS', 'Wingdings', 'Sylfaen', 'Segoe UI', 'Constantia', 'SimSun-ExtB', 'MT Extra', 'Gulim', 'Leelawadee', 'Tunga', 'Meiryo', 'Vrinda', 'CordiaUPC', 'Aparajita', 'IrisUPC', 'Palatino', 'Colonna MT', 'Playbill', 'Jokerman', 'Parchment', 'MS Outlook', 'Tw Cen MT', 'OPTIMA', 'Futura', 'AVENIR', 'Arial Hebrew', 'Savoye LET', 'Castellar', 'MYRIAD PRO', 'Andale Mono', 'Arial Narrow', 'Arial Unicode MS', 'Batang', 'Bell MT', 'Brush Script', 'Brush Script MT', 'Calibri', 'Charter', 'Courier', 'Courier New', 'Curlz MT', 'DejaVu Sans', 'DejaVu Sans Mono', 'DejaVu Serif Condensed', 'Droid Sans', 'Droid Sans Fallback', 'Droid Serif', 'Forte', 'Geneva', 'Hei', 'Levenim MT', 'Liberation Sans', 'Liberation Sans Narrow', 'Marlett', 'Meiryo UI', 'Microsoft Uighur', 'Microsoft YaHei UI', 'MS Mincho', 'MS UI Gothic', 'NanumGothic', 'Nirmala UI', 'Papyrus', 'PMingLiU', 'PT Serif', 'SimHei', 'STIXVariants', 'STSong', 'Traditional Arabic', 'Urdu Typesetting', 'Verdana', 'Wingdings 3', 'Helkevtrica', 'Al Bayan', 'Al Nile', 'Al Tarikh', 'American Typewriter', 'Apple Braille', 'Apple Chancery', 'Apple Color Emoji', 'Apple SD Gothic Neo', 'Apple Symbols', 'AppleGothic', 'AppleMyungjo', 'Arial Black', 'Arial Rounded MT Bold', 'Arial', 'Avenir Next Condensed', 'Avenir Next', 'Avenir', 'Ayuthaya', 'Baghdad', 'Bangla MN', 'Bangla Sangam MN', 'Baskerville', 'Beirut', 'Big Caslon', 'Bodoni Ornaments', 'Bradley Hand', 'Chalkboard SE', 'Chalkboard', 'Chalkduster', 'Cochin', 'Comic Sans MS', 'Copperplate', 'Corsiva Hebrew', 'Damascus', 'DecoType Naskh', 'Devanagari MT', 'Devanagari Sangam MN', 'Didot', 'Diwan Kufi', 'Diwan Thuluth', 'Euphemia UCAS', 'Farah', 'Farisi', 'GB18030 Bitmap', 'Geeza Pro', 'Georgia', 'Gill Sans', 'Gujarati MT', 'Gujarati Sangam MN', 'Gurmukhi MN', 'Gurmukhi MT', 'Gurmukhi Sangam MN', 'Heiti SC', 'Helvetica Neue', 'Helvetica', 'Herculanum', 'Hiragino Sans GB', 'Hiragino Sans', 'Hoefler Text', 'ITF Devanagari', 'Impact', 'InaiMathi', 'Kannada MN', 'Kefa', 'Khmer MN', 'Khmer Sangam MN', 'Kohinoor Bangla', 'Kohinoor Telugu', 'Kokonor', 'Krungthep', 'KufiStandardGK', 'Lao MN', 'Lao Sangam MN', 'Lucida Grande', 'Luminari', 'Marker Felt', 'Menlo', 'Microsoft Sans Serif', 'Mishafi Gold', 'Monaco', 'Mshtakan', 'Muna', 'Nadeem', 'New Peninim MT', 'Noteworthy', 'Optima', 'Oriya Sangam MN', 'PT Mono', 'PT Sans Caption', 'PT Sans Narrow', 'PT Sans', 'PT Serif Caption', 'Phosphate', 'PingFang HK', 'Plantagenet Cherokee', 'Raanana', 'STIXGeneral', 'STIXIntegralsD', 'STIXIntegralsSm', 'STIXIntegralsUp', 'STIXIntegralsUpD', 'STIXIntegralsUpSm', 'STIXSizeFiveSym', 'STIXSizeFourSym', 'STIXSizeOneSym', 'STIXSizeThreeSym', 'STIXSizeTwoSym', 'Sana', 'Sathu', 'SignPainter', 'Silom', 'Sinhala Sangam MN', 'Skia', 'Snell Roundhand', 'Songti SC', 'Sukhumvit Set', 'Symbol', 'Tahoma', 'Tamil Sangam MN', 'Telugu Sangam MN', 'Thonburi', 'Trattatello', 'Waseem', 'Zapfino', 'DIN Alternate', 'DIN Condensed', 'Noto Nastaliq Urdu', 'Rockwell', 'Zapf Dingbats', 'BlinkMacSystemFont', 'Mishafi', 'Myanmar MN', 'Myanmar Sangam MN', 'Oriya MN', 'Songti TC', 'Tamil MN', 'Telugu MN', 'Webdings', 'Cambria Math', 'Cambria', 'Candara', 'Consolas', 'Corbel', 'Ebrima', 'Franklin Gothic', 'Gabriola', 'Lucida Console', 'Lucida Sans Unicode', 'MS Gothic', 'MS PGothic', 'MV Boli', 'Malgun Gothic', 'Microsoft Himalaya', 'Microsoft JhengHei', 'Microsoft New Tai Lue', 'Microsoft PhagsPa', 'Microsoft YaHei', 'Microsoft Yi Baiti', 'MingLiU-ExtB', 'Mongolian Baiti', 'PMingLiU-ExtB', 'Palatino Linotype', 'Segoe Print', 'Segoe Script', 'Segoe UI Symbol', 'SimSun', 'Gadugi', 'Javanese Text', 'Microsoft JhengHei UI', 'Myanmar Text', 'Sitka Small', 'Sitka Text', 'Sitka Subheading', 'Sitka Heading', 'Sitka Display', 'Sitka Banner', 'Yu Gothic', 'Microsoft Tai Le', 'MingLiU_HKSCS-ExtB', 'Segoe UI Emoji', 'Bahnschrift', 'Abyssinica SIL', 'Liberation Mono', 'Liberation Serif', 'Lohit Tamil', 'Padauk', 'Waree', 'DejaVu Serif', 'Lohit Kannada', 'Samyak Devanagari', 'OpenSymbol', 'Nakula', 'Chandas', 'Keraleeyam', 'Mukti Narrow', 'Meera', 'Nimbus Roman', 'Kalimati', 'KacstQurn', 'Gubbi', 'Tibetan Machine Uni', 'Umpush', 'Purisa', 'Pothana2000', 'Noto Serif CJK JP', 'Norasi', 'Loma', 'Karumbi', 'mry_KacstQurn', 'Noto Serif CJK SC', 'Likhan', 'RaghuMalayalamSans', 'Padauk Book', 'Phetsarath OT', 'Sawasdee', 'Sahadeva', 'Nimbus Sans', 'Tlwg Typist', 'Noto Sans Mono CJK SC', 'Manjari', 'Ubuntu', 'Chilanka', 'FreeSerif', 'Nimbus Mono PS', 'Lohit Assamese', 'AnjaliOldLipi', 'Samyak Gujarati', 'Nimbus Sans Narrow', 'Kinnari', 'KacstOne', 'Mitra Mono', 'Kalapi', 'Laksaman', 'padmaa', 'Ani', 'Rachana', 'Pagul', 'Lohit Telugu', 'Samanata', 'Vemana2000', 'Lohit Gujarati', 'KacstDecorative', 'Lohit Malayalam', 'Noto Sans CJK HK', 'FreeSans', 'Sarai', 'Lohit Devanagari', 'Noto Color Emoji', 'Uroob', 'Noto Mono', 'Dyuthi', 'Suruma', 'Jamrul', 'Saab', 'Navilu', 'Gargi', 'Garuda', 'Rekha', 'Lohit Gurmukhi', 'FreeMono', 'KacstScreen', 'KacstTitle', 'KacstFarsi', 'Tlwg Typo', 'KacstNaskh', 'KacstPoster', 'Noto Sans CJK KR', 'LKLUG', 'KacstPen', 'Tlwg Mono', 'Lohit Odia', 'KacstOffice', 'ori1Uni', 'Samyak Tamil', 'Noto Sans Mono CJK JP', 'Tlwg Typewriter', 'KacstTitleL', 'KacstDigital', 'KacstLetter', 'KacstBook', 'Sans', 'sans-serif', 'serif', 'monospace', 'Arial MT', 'Bitstream Vera Sans Mono', 'Book Antiqua', 'Bookman Old Style', 'Century', 'Century Gothic', 'Century Schoolbook', 'Comic Sans', 'Lucida Bright', 'Lucida Calligraphy', 'Lucida Fax', 'LUCIDA GRANDE', 'Lucida Handwriting', 'Lucida Sans', 'Lucida Sans Typewriter', 'Monotype Corsiva', 'MS Reference Sans Serif', 'MS Sans Serif', 'MS Serif', 'MYRIAD', 'Segoe UI Light', 'Segoe UI Semibold', 'Times', 'Times New Roman', 'Times New Roman PS', 'Wingdings 2', 'Abadi MT Condensed Light', 'Academy Engraved LET', 'ADOBE CASLON PRO', 'Adobe Garamond', 'ADOBE GARAMOND PRO', 'Agency FB', 'Aharoni', 'Albertus Extra Bold', 'Albertus Medium', 'Algerian', 'Amazone BT', 'American Typewriter Condensed', 'AmerType Md BT', 'Andalus', 'Angsana New', 'AngsanaUPC', 'Antique Olive', 'Arabic Typesetting', 'ARCHER', 'ARNO PRO', 'Arrus BT', 'Aurora Cn BT', 'AvantGarde Bk BT', 'AvantGarde Md BT', 'Bandy', 'Bank Gothic', 'BankGothic Md BT', 'Baskerville Old Face', 'BatangChe', 'Bauer Bodoni', 'Bauhaus 93', 'Bazooka', 'Bembo', 'Benguiat Bk BT', 'Berlin Sans FB', 'Berlin Sans FB Demi', 'Bernard MT Condensed', 'BernhardFashion BT', 'BernhardMod BT', 'BinnerD', 'Blackadder ITC', 'BlairMdITC TT', 'Bodoni 72', 'Bodoni 72 Oldstyle', 'Bodoni 72 Smallcaps', 'Bodoni MT', 'Bodoni MT Black', 'Bodoni MT Condensed', 'Bodoni MT Poster Compressed', 'Bookshelf Symbol 7', 'Boulder', 'Bradley Hand ITC', 'Bremen Bd BT', 'Britannic Bold', 'Broadway', 'Browallia New', 'BrowalliaUPC', 'Californian FB', 'Calisto MT', 'Calligrapher', 'CaslonOpnface BT', 'Centaur', 'Cezanne', 'CG Omega', 'CG Times', 'Charlesworth', 'Charter Bd BT', 'Charter BT', 'Chaucer', 'ChelthmITC Bk BT', 'Chiller', 'Clarendon', 'Clarendon Condensed', 'CloisterBlack BT', 'Cooper Black', 'Copperplate Gothic', 'Copperplate Gothic Bold', 'Copperplate Gothic Light', 'CopperplGoth Bd BT', 'Cordia New', 'Cornerstone', 'Coronet', 'Cuckoo', 'DaunPenh', 'Dauphin', 'David', 'DB LCD Temp', 'DELICIOUS', 'Denmark', 'DFKai-SB', 'DilleniaUPC', 'DIN', 'DokChampa', 'Dotum', 'DotumChe', 'Edwardian Script ITC', 'Elephant', 'English 111 Vivace BT', 'Engravers MT', 'EngraversGothic BT', 'Eras Bold ITC', 'Eras Demi ITC', 'Eras Light ITC', 'Eras Medium ITC', 'EucrosiaUPC', 'Euphemia', 'EUROSTILE', 'Exotc350 Bd BT', 'FangSong', 'Felix Titling', 'Fixedsys', 'FONTIN', 'Footlight MT Light', 'FrankRuehl', 'Fransiscan', 'Freefrm721 Blk BT', 'FreesiaUPC', 'Freestyle Script', 'French Script MT', 'FrnkGothITC Bk BT', 'Fruitger', 'FRUTIGER', 'Futura Bk BT', 'Futura Lt BT', 'Futura Md BT', 'Futura ZBlk BT', 'FuturaBlack BT', 'Galliard BT', 'Gautami', 'Geometr231 BT', 'Geometr231 Hv BT', 'Geometr231 Lt BT', 'GeoSlab 703 Lt BT', 'GeoSlab 703 XBd BT', 'Gigi', 'Gill Sans MT', 'Gill Sans MT Condensed', 'Gill Sans MT Ext Condensed Bold', 'Gill Sans Ultra Bold', 'Gill Sans Ultra Bold Condensed', 'Gisha', 'Gloucester MT Extra Condensed', 'GOTHAM', 'GOTHAM BOLD', 'Goudy Old Style', 'Goudy Stout', 'GoudyHandtooled BT', 'GoudyOLSt BT', 'GulimChe', 'Gungsuh', 'GungsuhChe', 'Haettenschweiler', 'Harlow Solid Italic', 'Harrington', 'Heather', 'Heiti TC', 'HELV', 'Herald', 'High Tower Text', 'Hiragino Kaku Gothic ProN', 'Hiragino Mincho ProN', 'Humanst 521 Cn BT', 'Humanst521 BT', 'Humanst521 Lt BT', 'Imprint MT Shadow', 'Incised901 Bd BT', 'Incised901 BT', 'Incised901 Lt BT', 'INCONSOLATA', 'Informal Roman', 'Informal011 BT', 'INTERSTATE', 'Iskoola Pota', 'JasmineUPC', 'Jazz LET', 'Jenson', 'Jester', 'Juice ITC', 'Kabel Bk BT', 'Kabel Ult BT', 'Kailasa', 'KaiTi', 'Kalinga', 'Kannada Sangam MN', 'Kartika', 'Kaufmann Bd BT', 'Kaufmann BT', 'Khmer UI', 'KodchiangUPC', 'Kokila', 'Korinna BT', 'Kristen ITC', 'Kunstler Script', 'Lao UI', 'Latha', 'Letter Gothic', 'LilyUPC', 'Lithograph', 'Lithograph Light', 'Long Island', 'Lydian BT', 'Magneto', 'Maiandra GD', 'Malayalam Sangam MN', 'Mangal', 'Marigold', 'Marion', 'Market', 'Matisse ITC', 'Matura MT Script Capitals', 'MingLiU', 'MingLiU_HKSCS', 'Minion', 'Minion Pro', 'Miriam', 'Miriam Fixed', 'Mistral', 'Modern', 'Modern No. 20', 'Mona Lisa Solid ITC TT', 'MONO', 'MoolBoran', 'Mrs Eaves', 'MS LineDraw', 'MS PMincho', 'MS Reference Specialty', 'MUSEO', 'Narkisim', 'NEVIS', 'News Gothic', 'News GothicMT', 'NewsGoth BT', 'Niagara Engraved', 'Niagara Solid', 'NSimSun', 'Nyala', 'OCR A Extended', 'Old Century', 'Old English Text MT', 'Onyx', 'Onyx BT', 'OSAKA', 'OzHandicraft BT', 'Palace Script MT', 'Party LET', 'Pegasus', 'Perpetua', 'Perpetua Titling MT', 'PetitaBold', 'Pickwick', 'Poor Richard', 'Poster', 'PosterBodoni BT', 'PRINCETOWN LET', 'Pristina', 'PTBarnum BT', 'Pythagoras', 'Raavi', 'Rage Italic', 'Ravie', 'Ribbon131 Bd BT', 'Rockwell Condensed', 'Rockwell Extra Bold', 'Rod', 'Roman', 'Sakkal Majalla', 'Santa Fe LET', 'Sceptre', 'Script', 'Script MT Bold', 'SCRIPTINA', 'Serifa', 'Serifa BT', 'Serifa Th BT', 'ShelleyVolante BT', 'Sherwood', 'Shonar Bangla', 'Showcard Gothic', 'Shruti', 'Signboard', 'SILKSCREEN', 'Simplified Arabic', 'Simplified Arabic Fixed', 'Sketch Rockwell', 'Small Fonts', 'Snap ITC', 'Socket', 'Souvenir Lt BT', 'Staccato222 BT', 'Steamer', 'Stencil', 'Storybook', 'Styllo', 'Subway', 'Swis721 BlkEx BT', 'Swiss911 XCm BT', 'Synchro LET', 'System', 'Technical', 'Teletype', 'Tempus Sans ITC', 'Terminal', 'Trajan', 'TRAJAN PRO', 'Tristan', 'Tubular', 'Tw Cen MT Condensed', 'Tw Cen MT Condensed Extra Bold', 'TypoUpright BT', 'Unicorn', 'Univers', 'Univers CE 55 Medium', 'Univers Condensed', 'Utsaah', 'Vagabond', 'Vani', 'Vijaya', 'Viner Hand ITC', 'VisualUI', 'Vivaldi', 'Vladimir Script', 'Westminster', 'WHITNEY', 'Wide Latin', 'ZapfEllipt BT', 'ZapfHumnst BT', 'ZapfHumnst Dm BT', 'Zurich BlkEx BT', 'Zurich Ex BT', 'ZWAdobeF', 'ABeeZee', 'Abel', 'Abhaya Libre', 'Abril Fatface', 'Aclonica', 'Acme', 'Actor', 'Adamina', 'Advent Pro', 'Aguafina Script', 'Akronim', 'Aladin', 'Aldrich', 'Alef', 'Alegreya', 'Alegreya SC', 'Alegreya Sans', 'Alegreya Sans SC', 'Aleo', 'Alex Brush', 'Alfa Slab One', 'Alice', 'Alike', 'Alike Angular', 'Allan', 'Allerta', 'Allerta Stencil', 'Allura', 'Almarai', 'Almendra', 'Almendra Display', 'Almendra SC', 'Amarante', 'Amaranth', 'Amatic SC', 'Amethysta', 'Amiko', 'Amiri', 'Amita', 'Anaheim', 'Andada', 'Andika', 'Angkor', 'Annie Use Your Telescope', 'Anonymous Pro', 'Antic', 'Antic Didone', 'Antic Slab', 'Anton', 'Arapey', 'Arbutus', 'Arbutus Slab', 'Architects Daughter', 'Archivo', 'Archivo Black', 'Archivo Narrow', 'Aref Ruqaa', 'Arima Madurai', 'Arimo', 'Arizonia', 'Armata', 'Arsenal', 'Artifika', 'Arvo', 'Arya', 'Asap', 'Asap Condensed', 'Asar', 'Asset', 'Assistant', 'Astloch', 'Asul', 'Athiti', 'Atma', 'Atomic Age', 'Aubrey', 'Audiowide', 'Autour One', 'Average', 'Average Sans', 'Averia Gruesa Libre', 'Averia Libre', 'Averia Sans Libre', 'Averia Serif Libre', 'B612', 'B612 Mono', 'Bad Script', 'Bahiana', 'Bahianita', 'Bai Jamjuree', 'Baloo', 'Baloo Bhai', 'Baloo Bhaijaan', 'Baloo Bhaina', 'Baloo Chettan', 'Baloo Da', 'Baloo Paaji', 'Baloo Tamma', 'Baloo Tammudu', 'Baloo Thambi', 'Balthazar', 'Bangers', 'Barlow', 'Barlow Condensed', 'Barlow Semi Condensed', 'Barriecito', 'Barrio', 'Basic', 'Battambang', 'Baumans', 'Bayon', 'Be Vietnam', 'Bebas Neue', 'Belgrano', 'Bellefair', 'Belleza', 'BenchNine', 'Bentham', 'Berkshire Swash', 'Beth Ellen', 'Bevan', 'Big Shoulders Display', 'Big Shoulders Text', 'Bigelow Rules', 'Bigshot One', 'Bilbo', 'Bilbo Swash Caps', 'BioRhyme', 'BioRhyme Expanded', 'Biryani', 'Bitter', 'Black And White Picture', 'Black Han Sans', 'Black Ops One', 'Blinker', 'Bokor', 'Bonbon', 'Boogaloo', 'Bowlby One', 'Bowlby One SC', 'Brawler', 'Bree Serif', 'Bubblegum Sans', 'Bubbler One', 'Buda', 'Buenard', 'Bungee', 'Bungee Hairline', 'Bungee Inline', 'Bungee Outline', 'Bungee Shade', 'Butcherman', 'Butterfly Kids', 'Cabin', 'Cabin Condensed', 'Cabin Sketch', 'Caesar Dressing', 'Cagliostro', 'Cairo', 'Calligraffitti', 'Cambay', 'Cambo', 'Candal', 'Cantarell', 'Cantata One', 'Cantora One', 'Capriola', 'Cardo', 'Carme', 'Carrois Gothic', 'Carrois Gothic SC', 'Carter One', 'Catamaran', 'Caudex', 'Caveat', 'Caveat Brush', 'Cedarville Cursive', 'Ceviche One', 'Chakra Petch', 'Changa', 'Changa One', 'Chango', 'Charm', 'Charmonman', 'Chathura', 'Chau Philomene One', 'Chela One', 'Chelsea Market', 'Chenla', 'Cherry Cream Soda', 'Cherry Swash', 'Chewy', 'Chicle', 'Chivo', 'Chonburi', 'Cinzel', 'Cinzel Decorative', 'Clicker Script', 'Coda', 'Coda Caption', 'Codystar', 'Coiny', 'Combo', 'Comfortaa', 'Coming Soon', 'Concert One', 'Condiment', 'Content', 'Contrail One', 'Convergence', 'Cookie', 'Copse', 'Corben', 'Cormorant', 'Cormorant Garamond', 'Cormorant Infant', 'Cormorant SC', 'Cormorant Unicase', 'Cormorant Upright', 'Courgette', 'Cousine', 'Coustard', 'Covered By Your Grace', 'Crafty Girls', 'Creepster', 'Crete Round', 'Crimson Pro', 'Crimson Text', 'Croissant One', 'Crushed', 'Cuprum', 'Cute Font', 'Cutive', 'Cutive Mono', 'DM Sans', 'DM Serif Display', 'DM Serif Text', 'Damion', 'Dancing Script', 'Dangrek', 'Darker Grotesque', 'David Libre', 'Dawning of a New Day', 'Days One', 'Dekko', 'Delius', 'Delius Swash Caps', 'Delius Unicase', 'Della Respira', 'Denk One', 'Devonshire', 'Dhurjati', 'Didact Gothic', 'Diplomata', 'Diplomata SC', 'Do Hyeon', 'Dokdo', 'Domine', 'Donegal One', 'Doppio One', 'Dorsa', 'Dosis', 'Dr Sugiyama', 'Duru Sans', 'Dynalight', 'EB Garamond', 'Eagle Lake', 'East Sea Dokdo', 'Eater', 'Economica', 'Eczar', 'El Messiri', 'Electrolize', 'Elsie', 'Elsie Swash Caps', 'Emblema One', 'Emilys Candy', 'Encode Sans', 'Encode Sans Condensed', 'Encode Sans Expanded', 'Encode Sans Semi Condensed', 'Encode Sans Semi Expanded', 'Engagement', 'Englebert', 'Enriqueta', 'Erica One', 'Esteban', 'Euphoria Script', 'Ewert', 'Exo', 'Exo 2', 'Expletus Sans', 'Fahkwang', 'Fanwood Text', 'Farro', 'Farsan', 'Fascinate', 'Fascinate Inline', 'Faster One', 'Fasthand', 'Fauna One', 'Faustina', 'Federant', 'Federo', 'Felipa', 'Fenix', 'Finger Paint', 'Fira Code', 'Fira Mono', 'Fira Sans', 'Fira Sans Condensed', 'Fira Sans Extra Condensed', 'Fjalla One', 'Fjord One', 'Flamenco', 'Flavors', 'Fondamento', 'Fontdiner Swanky', 'Forum', 'Francois One', 'Frank Ruhl Libre', 'Freckle Face', 'Fredericka the Great', 'Fredoka One', 'Freehand', 'Fresca', 'Frijole', 'Fruktur', 'Fugaz One', 'GFS Didot', 'GFS Neohellenic', 'Gabriela', 'Gaegu', 'Gafata', 'Galada', 'Galdeano', 'Galindo', 'Gamja Flower', 'Gayathri', 'Gentium Basic', 'Gentium Book Basic', 'Geo', 'Geostar', 'Geostar Fill', 'Germania One', 'Gidugu', 'Gilda Display', 'Give You Glory', 'Glass Antiqua', 'Glegoo', 'Gloria Hallelujah', 'Goblin One', 'Gochi Hand', 'Gorditas', 'Gothic A1', 'Goudy Bookletter 1911', 'Graduate', 'Grand Hotel', 'Gravitas One', 'Great Vibes', 'Grenze', 'Griffy', 'Gruppo', 'Gudea', 'Gugi', 'Gurajada', 'Habibi', 'Halant', 'Hammersmith One', 'Hanalei', 'Hanalei Fill', 'Handlee', 'Hanuman', 'Happy Monkey', 'Harmattan', 'Headland One', 'Heebo', 'Henny Penny', 'Hepta Slab', 'Herr Von Muellerhoff', 'Hi Melody', 'Hind', 'Hind Guntur', 'Hind Madurai', 'Hind Siliguri', 'Hind Vadodara', 'Holtwood One SC', 'Homemade Apple', 'Homenaje', 'IBM Plex Mono', 'IBM Plex Sans', 'IBM Plex Sans Condensed', 'IBM Plex Serif', 'IM Fell DW Pica', 'IM Fell DW Pica SC', 'IM Fell Double Pica', 'IM Fell Double Pica SC', 'IM Fell English', 'IM Fell English SC', 'IM Fell French Canon', 'IM Fell French Canon SC', 'IM Fell Great Primer', 'IM Fell Great Primer SC', 'Iceberg', 'Iceland', 'Imprima', 'Inconsolata', 'Inder', 'Indie Flower', 'Inika', 'Inknut Antiqua', 'Irish Grover', 'Istok Web', 'Italiana', 'Italianno', 'Itim', 'Jacques Francois', 'Jacques Francois Shadow', 'Jaldi', 'Jim Nightshade', 'Jockey One', 'Jolly Lodger', 'Jomhuria', 'Jomolhari', 'Josefin Sans', 'Josefin Slab', 'Joti One', 'Jua', 'Judson', 'Julee', 'Julius Sans One', 'Junge', 'Jura', 'Just Another Hand', 'Just Me Again Down Here', 'K2D', 'Kadwa', 'Kalam', 'Kameron', 'Kanit', 'Kantumruy', 'Karla', 'Karma', 'Katibeh', 'Kaushan Script', 'Kavivanar', 'Kavoon', 'Kdam Thmor', 'Keania One', 'Kelly Slab', 'Kenia', 'Khand', 'Khmer', 'Khula', 'Kirang Haerang', 'Kite One', 'Knewave', 'KoHo', 'Kodchasan', 'Kosugi', 'Kosugi Maru', 'Kotta One', 'Koulen', 'Kranky', 'Kreon', 'Kristi', 'Krona One', 'Krub', 'Kulim Park', 'Kumar One', 'Kumar One Outline', 'Kurale', 'La Belle Aurore', 'Lacquer', 'Laila', 'Lakki Reddy', 'Lalezar', 'Lancelot', 'Lateef', 'Lato', 'League Script', 'Leckerli One', 'Ledger', 'Lekton', 'Lemon', 'Lemonada', 'Lexend Deca', 'Lexend Exa', 'Lexend Giga', 'Lexend Mega', 'Lexend Peta', 'Lexend Tera', 'Lexend Zetta', 'Libre Barcode 128', 'Libre Barcode 128 Text', 'Libre Barcode 39', 'Libre Barcode 39 Extended', 'Libre Barcode 39 Extended Text', 'Libre Barcode 39 Text', 'Libre Baskerville', 'Libre Caslon Display', 'Libre Caslon Text', 'Libre Franklin', 'Life Savers', 'Lilita One', 'Lily Script One', 'Limelight', 'Linden Hill', 'Literata', 'Liu Jian Mao Cao', 'Livvic', 'Lobster', 'Lobster Two', 'Londrina Outline', 'Londrina Shadow', 'Londrina Sketch', 'Londrina Solid', 'Long Cang', 'Lora', 'Love Ya Like A Sister', 'Loved by the King', 'Lovers Quarrel', 'Luckiest Guy', 'Lusitana', 'Lustria', 'M PLUS 1p', 'M PLUS Rounded 1c', 'Ma Shan Zheng', 'Macondo', 'Macondo Swash Caps', 'Mada', 'Magra', 'Maiden Orange', 'Maitree', 'Major Mono Display', 'Mako', 'Mali', 'Mallanna', 'Mandali', 'Mansalva', 'Manuale', 'Marcellus', 'Marcellus SC', 'Marck Script', 'Margarine', 'Markazi Text', 'Marko One', 'Marmelad', 'Martel', 'Martel Sans', 'Marvel', 'Mate', 'Mate SC', 'Material Icons', 'Maven Pro', 'McLaren', 'Meddon', 'MedievalSharp', 'Medula One', 'Meera Inimai', 'Megrim', 'Meie Script', 'Merienda', 'Merienda One', 'Merriweather', 'Merriweather Sans', 'Metal', 'Metal Mania', 'Metamorphous', 'Metrophobic', 'Michroma', 'Milonga', 'Miltonian', 'Miltonian Tattoo', 'Mina', 'Miniver', 'Miriam Libre', 'Mirza', 'Miss Fajardose', 'Mitr', 'Modak', 'Modern Antiqua', 'Mogra', 'Molengo', 'Molle', 'Monda', 'Monofett', 'Monoton', 'Monsieur La Doulaise', 'Montaga', 'Montez', 'Montserrat', 'Montserrat Alternates', 'Montserrat Subrayada', 'Moul', 'Moulpali', 'Mountains of Christmas', 'Mouse Memoirs', 'Mr Bedfort', 'Mr Dafoe', 'Mr De Haviland', 'Mrs Saint Delafield', 'Mrs Sheppards', 'Mukta', 'Mukta Mahee', 'Mukta Malar', 'Mukta Vaani', 'Muli', 'Mystery Quest', 'NTR', 'Nanum Brush Script', 'Nanum Gothic', 'Nanum Gothic Coding', 'Nanum Myeongjo', 'Nanum Pen Script', 'Neucha', 'Neuton', 'New Rocker', 'News Cycle', 'Niconne', 'Niramit', 'Nixie One', 'Nobile', 'Nokora', 'Norican', 'Nosifer', 'Notable', 'Nothing You Could Do', 'Noticia Text', 'Noto Sans', 'Noto Sans HK', 'Noto Sans JP', 'Noto Sans KR', 'Noto Sans SC', 'Noto Sans TC', 'Noto Serif', 'Noto Serif JP', 'Noto Serif KR', 'Noto Serif SC', 'Noto Serif TC', 'Nova Cut', 'Nova Flat', 'Nova Mono', 'Nova Oval', 'Nova Round', 'Nova Script', 'Nova Slim', 'Nova Square', 'Numans', 'Nunito', 'Nunito Sans', 'Odor Mean Chey', 'Offside', 'Old Standard TT', 'Oldenburg', 'Oleo Script', 'Oleo Script Swash Caps', 'Open Sans', 'Open Sans Condensed', 'Oranienbaum', 'Orbitron', 'Oregano', 'Orienta', 'Original Surfer', 'Oswald', 'Over the Rainbow', 'Overlock', 'Overlock SC', 'Overpass', 'Overpass Mono', 'Ovo', 'Oxygen', 'Oxygen Mono', 'Pacifico', 'Palanquin', 'Palanquin Dark', 'Pangolin', 'Paprika', 'Parisienne', 'Passero One', 'Passion One', 'Pathway Gothic One', 'Patrick Hand', 'Patrick Hand SC', 'Pattaya', 'Patua One', 'Pavanam', 'Paytone One', 'Peddana', 'Peralta', 'Permanent Marker', 'Petit Formal Script', 'Petrona', 'Philosopher', 'Piedra', 'Pinyon Script', 'Pirata One', 'Plaster', 'Play', 'Playball', 'Playfair Display', 'Playfair Display SC', 'Podkova', 'Poiret One', 'Poller One', 'Poly', 'Pompiere', 'Pontano Sans', 'Poor Story', 'Poppins', 'Port Lligat Sans', 'Port Lligat Slab', 'Pragati Narrow', 'Prata', 'Preahvihear', 'Press Start 2P', 'Pridi', 'Princess Sofia', 'Prociono', 'Prompt', 'Prosto One', 'Proza Libre', 'Public Sans', 'Puritan', 'Purple Purse', 'Quando', 'Quantico', 'Quattrocento', 'Quattrocento Sans', 'Questrial', 'Quicksand', 'Quintessential', 'Qwigley', 'Racing Sans One', 'Radley', 'Rajdhani', 'Rakkas', 'Raleway', 'Raleway Dots', 'Ramabhadra', 'Ramaraja', 'Rambla', 'Rammetto One', 'Ranchers', 'Rancho', 'Ranga', 'Rasa', 'Rationale', 'Ravi Prakash', 'Red Hat Display', 'Red Hat Text', 'Redressed', 'Reem Kufi', 'Reenie Beanie', 'Revalia', 'Rhodium Libre', 'Ribeye', 'Ribeye Marrow', 'Righteous', 'Risque', 'Roboto', 'Roboto Condensed', 'Roboto Mono', 'Roboto Slab', 'Rochester', 'Rock Salt', 'Rokkitt', 'Romanesco', 'Ropa Sans', 'Rosario', 'Rosarivo', 'Rouge Script', 'Rozha One', 'Rubik', 'Rubik Mono One', 'Ruda', 'Rufina', 'Ruge Boogie', 'Ruluko', 'Rum Raisin', 'Ruslan Display', 'Russo One', 'Ruthie', 'Rye', 'Sacramento', 'Sahitya', 'Sail', 'Saira', 'Saira Condensed', 'Saira Extra Condensed', 'Saira Semi Condensed', 'Saira Stencil One', 'Salsa', 'Sanchez', 'Sancreek', 'Sansita', 'Sarabun', 'Sarala', 'Sarina', 'Sarpanch', 'Satisfy', 'Sawarabi Gothic', 'Sawarabi Mincho', 'Scada', 'Scheherazade', 'Schoolbell', 'Scope One', 'Seaweed Script', 'Secular One', 'Sedgwick Ave', 'Sedgwick Ave Display', 'Sevillana', 'Seymour One', 'Shadows Into Light', 'Shadows Into Light Two', 'Shanti', 'Share', 'Share Tech', 'Share Tech Mono', 'Shojumaru', 'Short Stack', 'Shrikhand', 'Siemreap', 'Sigmar One', 'Signika', 'Signika Negative', 'Simonetta', 'Single Day', 'Sintony', 'Sirin Stencil', 'Six Caps', 'Skranji', 'Slabo 13px', 'Slabo 27px', 'Slackey', 'Smokum', 'Smythe', 'Sniglet', 'Snippet', 'Snowburst One', 'Sofadi One', 'Sofia', 'Song Myung', 'Sonsie One', 'Sorts Mill Goudy', 'Source Code Pro', 'Source Sans Pro', 'Source Serif Pro', 'Space Mono', 'Special Elite', 'Spectral', 'Spectral SC', 'Spicy Rice', 'Spinnaker', 'Spirax', 'Squada One', 'Sree Krushnadevaraya', 'Sriracha', 'Srisakdi', 'Staatliches', 'Stalemate', 'Stalinist One', 'Stardos Stencil', 'Stint Ultra Condensed', 'Stint Ultra Expanded', 'Stoke', 'Strait', 'Stylish', 'Sue Ellen Francisco', 'Suez One', 'Sumana', 'Sunflower', 'Sunshiney', 'Supermercado One', 'Sura', 'Suranna', 'Suravaram', 'Suwannaphum', 'Swanky and Moo Moo', 'Syncopate', 'Tajawal', 'Tangerine', 'Taprom', 'Tauri', 'Taviraj', 'Teko', 'Telex', 'Tenali Ramakrishna', 'Tenor Sans', 'Text Me One', 'Thasadith', 'The Girl Next Door', 'Tienne', 'Tillana', 'Timmana', 'Tinos', 'Titan One', 'Titillium Web', 'Tomorrow', 'Trade Winds', 'Trirong', 'Trocchi', 'Trochut', 'Trykker', 'Tulpen One', 'Turret Road', 'Ubuntu Condensed', 'Ubuntu Mono', 'Ultra', 'Uncial Antiqua', 'Underdog', 'Unica One', 'UnifrakturCook', 'UnifrakturMaguntia', 'Unkempt', 'Unlock', 'Unna', 'VT323', 'Vampiro One', 'Varela', 'Varela Round', 'Vast Shadow', 'Vesper Libre', 'Vibes', 'Vibur', 'Vidaloka', 'Viga', 'Voces', 'Volkhov', 'Vollkorn', 'Vollkorn SC', 'Voltaire', 'Waiting for the Sunrise', 'Wallpoet', 'Walter Turncoat', 'Warnes', 'Wellfleet', 'Wendy One', 'Wire One', 'Work Sans', 'Yanone Kaffeesatz', 'Yantramanav', 'Yatra One', 'Yellowtail', 'Yeon Sung', 'Yeseva One', 'Yesteryear', 'Yrsa', 'ZCOOL KuaiLe', 'ZCOOL QingKe HuangYou', 'ZCOOL XiaoWei', 'Zeyada', 'Zhi Mang Xing', 'Zilla Slab', 'Zilla Slab Highlight', 'Noto Naskh Arabic', 'Noto Sans Armenian', 'Noto Sans Bengali', 'Noto Sans Buginese', 'Noto Sans Canadian Aboriginal', 'Noto Sans Cherokee', 'Noto Sans Devanagari', 'Noto Sans Ethiopic', 'Noto Sans Georgian', 'Noto Sans Gujarati', 'Noto Sans Gurmukhi', 'Noto Sans Hebrew', 'Noto Sans JP Regular', 'Noto Sans KR Regular', 'Noto Sans Kannada', 'Noto Sans Khmer', 'Noto Sans Lao', 'Noto Sans Malayalam', 'Noto Sans Mongolian', 'Noto Sans Myanmar', 'Noto Sans Oriya', 'Noto Sans SC Regular', 'Noto Sans Sinhala', 'Noto Sans TC Regular', 'Noto Sans Tamil', 'Noto Sans Telugu', 'Noto Sans Thaana', 'Noto Sans Thai', 'Noto Sans Tibetan', 'Noto Sans Yi', 'Noto Serif Armenian', 'Noto Serif Khmer', 'Noto Serif Lao', 'Noto Serif Thai', 'Aqua Kana', 'Aqua Kana Bold', 'Helvetica LT MM', 'Helvetica Neue Desk UI', 'Helvetica Neue Desk UI Bold', 'Helvetica Neue Desk UI Bold Italic', 'Helvetica Neue Desk UI Italic', 'Helvetica Neue DeskInterface', 'Times LT MM', 'AR PL UKai CN', 'AR PL UKai HK', 'AR PL UKai TW', 'AR PL UKai TW MBE', 'AR PL UMing CN', 'AR PL UMing HK', 'AR PL UMing TW', 'AR PL UMing TW MBE', 'Aharoni Bold', 'Aharoni CLM', 'Al Bayan Bold', 'Al Bayan Plain', 'Al Nile Bold', 'Al Tarikh Regular', 'AlArabiya', 'AlBattar', 'AlHor', 'AlManzomah', 'AlYarmook', 'Aldhabi', 'AlternateGothic2 BT', 'American Typewriter Bold', 'American Typewriter Condensed Bold', 'American Typewriter Condensed Light', 'American Typewriter Light', 'American Typewriter Semibold', 'Amiri Quran', 'Amiri Quran Colored', 'Angsana New Bold', 'Angsana New Bold Italic', 'Angsana New Italic', 'AngsanaUPC Bold', 'AngsanaUPC Bold Italic', 'AngsanaUPC Italic', 'Aparajita Bold', 'Aparajita Bold Italic', 'Aparajita Italic', 'Apple Braille Outline 6 Dot', 'Apple Braille Outline 8 Dot', 'Apple Braille Pinpoint 6 Dot', 'Apple Braille Pinpoint 8 Dot', 'Apple LiGothic Medium', 'Apple LiSung Light', 'Apple SD Gothic Neo Bold', 'Apple SD Gothic Neo Heavy', 'Apple SD Gothic Neo Light', 'Apple SD Gothic Neo Medium', 'Apple SD Gothic Neo Regular', 'Apple SD Gothic Neo SemiBold', 'Apple SD Gothic Neo Thin', 'Apple SD Gothic Neo UltraLight', 'Apple SD GothicNeo ExtraBold', 'AppleGothic Regular', 'AppleMyungjo Regular', 'Arab', 'Arial Bold', 'Arial Bold Italic', 'Arial Hebrew Bold', 'Arial Hebrew Light', 'Arial Hebrew Scholar', 'Arial Hebrew Scholar Bold', 'Arial Hebrew Scholar Light', 'Arial Italic', 'Arial Narrow Bold', 'Arial Narrow Bold Italic', 'Arial Narrow Italic', 'Arial Nova', 'Arial Nova Bold', 'Arial Nova Bold Italic', 'Arial Nova Cond', 'Arial Nova Cond Bold', 'Arial Nova Cond Bold Italic', 'Arial Nova Cond Italic', 'Arial Nova Cond Light', 'Arial Nova Cond Light Italic', 'Arial Nova Italic', 'Arial Nova Light', 'Arial Nova Light Italic', 'Athelas Bold', 'Athelas Bold Italic', 'Athelas Italic', 'Athelas Regular', 'Avenir Black', 'Avenir Black Oblique', 'Avenir Book', 'Avenir Book Oblique', 'Avenir Heavy', 'Avenir Heavy Oblique', 'Avenir Light', 'Avenir Light Oblique', 'Avenir Medium', 'Avenir Medium Oblique', 'Avenir Next Bold', 'Avenir Next Bold Italic', 'Avenir Next Condensed Bold', 'Avenir Next Condensed Bold Italic', 'Avenir Next Condensed Demi Bold', 'Avenir Next Condensed Demi Bold Italic', 'Avenir Next Condensed Heavy', 'Avenir Next Condensed Heavy Italic', 'Avenir Next Condensed Italic', 'Avenir Next Condensed Medium', 'Avenir Next Condensed Medium Italic', 'Avenir Next Condensed Regular', 'Avenir Next Condensed Ultra Light', 'Avenir Next Condensed Ultra Light Italic', 'Avenir Next Demi Bold', 'Avenir Next Demi Bold Italic', 'Avenir Next Heavy', 'Avenir Next Heavy Italic', 'Avenir Next Italic', 'Avenir Next Medium', 'Avenir Next Medium Italic', 'Avenir Next Regular', 'Avenir Next Ultra Light', 'Avenir Next Ultra Light Italic', 'Avenir Oblique', 'Avenir Roman', 'BIZ UDGothic', 'BIZ UDGothic Bold', 'BIZ UDMincho', 'BIZ UDMincho Medium', 'BIZ UDPGothic', 'BIZ UDPGothic Bold', 'BIZ UDPMincho', 'BIZ UDPMincho Medium', 'Baghdad Regular', 'Bahnschrift Light', 'Bahnschrift SemiBold', 'Bahnschrift SemiLight', 'Bangla MN Bold', 'Bangla Sangam MN Bold', 'Baoli SC Regular', 'Baoli TC Regular', 'Baskerville Bold', 'Baskerville Bold Italic', 'Baskerville Italic', 'Baskerville SemiBold', 'Baskerville SemiBold Italic', 'Beirut Regular', 'BiauKai', 'Big Caslon Medium', 'Bitstream Charter', 'Bodoni 72 Bold', 'Bodoni 72 Book', 'Bodoni 72 Book Italic', 'Bodoni 72 Oldstyle Bold', 'Bodoni 72 Oldstyle Book', 'Bodoni 72 Oldstyle Book Italic', 'Bodoni 72 Smallcaps Book', 'Bradley Hand Bold', 'Browallia New Bold', 'Browallia New Bold Italic', 'Browallia New Italic', 'BrowalliaUPC Bold', 'BrowalliaUPC Bold Italic', 'BrowalliaUPC Italic', 'Brush Script MT Italic', 'C059', 'Caladea', 'Caladings CLM', 'Calibri Bold', 'Calibri Bold Italic', 'Calibri Italic', 'Calibri Light', 'Calibri Light Italic', 'Cambria Bold', 'Cambria Bold Italic', 'Cambria Italic', 'Candara Bold', 'Candara Bold Italic', 'Candara Italic', 'Candara Light', 'Candara Light Italic', 'Cantarell Extra Bold', 'Cantarell Light', 'Cantarell Thin', 'Carlito', 'Century Schoolbook L', 'Chalkboard Bold', 'Chalkboard SE Bold', 'Chalkboard SE Light', 'Chalkboard SE Regular', 'Charcoal CY', 'Charter Black', 'Charter Black Italic', 'Charter Bold', 'Charter Bold Italic', 'Charter Italic', 'Charter Roman', 'Cochin Bold', 'Cochin Bold Italic', 'Cochin Italic', 'Comfortaa Light', 'Comic Sans MS Bold', 'Comic Sans MS Bold Italic', 'Comic Sans MS Italic', 'Consolas Bold', 'Consolas Bold Italic', 'Consolas Italic', 'Constantia Bold', 'Constantia Bold Italic', 'Constantia Italic', 'Copperplate Bold', 'Copperplate Light', 'Corbel Bold', 'Corbel Bold Italic', 'Corbel Italic', 'Corbel Light', 'Corbel Light Italic', 'Cordia New Bold', 'Cordia New Bold Italic', 'Cordia New Italic', 'CordiaUPC Bold', 'CordiaUPC Bold Italic', 'CordiaUPC Italic', 'Corsiva Hebrew Bold', 'Cortoba', 'Courier 10 Pitch', 'Courier Bold', 'Courier Bold Oblique', 'Courier New Bold', 'Courier New Bold Italic', 'Courier New Italic', 'Courier Oblique', 'D050000L', 'DIN Alternate Bold', 'DIN Condensed Bold', 'Damascus Bold', 'Damascus Light', 'Damascus Medium', 'Damascus Regular', 'Damascus Semi Bold', 'David Bold', 'David CLM', 'DecoType Naskh Regular', 'DejaVu Math TeX Gyre', 'DejaVu Sans Condensed', 'DejaVu Sans Light', 'DengXian', 'DengXian Bold', 'DengXian Light', 'Devanagari MT Bold', 'Devanagari Sangam MN Bold', 'Didot Bold', 'Didot Italic', 'DilleniaUPC Bold', 'DilleniaUPC Bold Italic', 'DilleniaUPC Italic', 'Dimnah', 'Dingbats', 'Diwan Kufi Regular', 'Diwan Mishafi', 'Diwan Thuluth Regular', 'Droid Arabic Kufi', 'Droid Sans Armenian', 'Droid Sans Devanagari', 'Droid Sans Ethiopic', 'Droid Sans Georgian', 'Droid Sans Hebrew', 'Droid Sans Japanese', 'Droid Sans Mono', 'Droid Sans Tamil', 'Droid Sans Thai', 'Drugulin CLM', 'Ebrima Bold', 'Electron', 'Ellinia CLM', 'EmojiOne Mozilla', 'Estrangelo Edessa', 'EucrosiaUPC Bold', 'EucrosiaUPC Bold Italic', 'EucrosiaUPC Italic', 'Euphemia UCAS Bold', 'Euphemia UCAS Italic', 'Ezra SIL', 'Ezra SIL SR', 'Farah Regular', 'Farisi Regular', 'Frank Ruehl CLM', 'Franklin Gothic Medium', 'Franklin Gothic Medium Italic', 'FreesiaUPC Bold', 'FreesiaUPC Bold Italic', 'FreesiaUPC Italic', 'Furat', 'Futura Bold', 'Futura Condensed ExtraBold', 'Futura Condensed Medium', 'Futura Medium', 'Futura Medium Italic', 'Gadugi Bold', 'Gautami Bold', 'Gayathri Thin', 'Geeza Pro Bold', 'Geeza Pro Regular', 'Geneva CY', 'Georgia Bold', 'Georgia Bold Italic', 'Georgia Italic', 'Georgia Pro', 'Georgia Pro Black', 'Georgia Pro Black Italic', 'Georgia Pro Bold', 'Georgia Pro Bold Italic', 'Georgia Pro Cond', 'Georgia Pro Cond Black', 'Georgia Pro Cond Black Italic', 'Georgia Pro Cond Bold', 'Georgia Pro Cond Bold Italic', 'Georgia Pro Cond Italic', 'Georgia Pro Cond Light', 'Georgia Pro Cond Light Italic', 'Georgia Pro Cond Semibold', 'Georgia Pro Cond Semibold Italic', 'Georgia Pro Italic', 'Georgia Pro Light', 'Georgia Pro Light Italic', 'Georgia Pro Semibold', 'Georgia Pro Semibold Italic', 'Gill Sans Bold', 'Gill Sans Bold Italic', 'Gill Sans Italic', 'Gill Sans Light', 'Gill Sans Light Italic', 'Gill Sans Nova', 'Gill Sans Nova Bold', 'Gill Sans Nova Bold Italic', 'Gill Sans Nova Cond', 'Gill Sans Nova Cond Bold', 'Gill Sans Nova Cond Bold Italic', 'Gill Sans Nova Cond Italic', 'Gill Sans Nova Cond Lt', 'Gill Sans Nova Cond Lt Italic', 'Gill Sans Nova Cond Ultra Bold', 'Gill Sans Nova Cond XBd', 'Gill Sans Nova Cond XBd Italic', 'Gill Sans Nova Italic', 'Gill Sans Nova Light', 'Gill Sans Nova Light Italic', 'Gill Sans Nova Ultra Bold', 'Gill Sans SemiBold', 'Gill Sans SemiBold Italic', 'Gill Sans UltraBold', 'Gisha Bold', 'Granada', 'Graph', 'Gujarati MT Bold', 'Gujarati Sangam MN Bold', 'GungSeo Regular', 'Gurmukhi MN Bold', 'Gurmukhi Sangam MN Bold', 'Hadasim CLM', 'Hani', 'Hannotate SC Bold', 'Hannotate SC Regular', 'Hannotate TC Bold', 'Hannotate TC Regular', 'HanziPen SC Bold', 'HanziPen SC Regular', 'HanziPen TC Bold', 'HanziPen TC Regular', 'Haramain', 'HeadLineA Regular', 'Hei Regular', 'Heiti SC Light', 'Heiti SC Medium', 'Heiti TC Light', 'Heiti TC Medium', 'Helvetica Bold', 'Helvetica Bold Oblique', 'Helvetica CY Bold', 'Helvetica CY BoldOblique', 'Helvetica CY Oblique', 'Helvetica CY Plain', 'Helvetica Light', 'Helvetica Light Oblique', 'Helvetica Neue Bold', 'Helvetica Neue Bold Italic', 'Helvetica Neue Condensed Black', 'Helvetica Neue Condensed Bold', 'Helvetica Neue Italic', 'Helvetica Neue Light', 'Helvetica Neue Light Italic', 'Helvetica Neue Medium', 'Helvetica Neue Medium Italic', 'Helvetica Neue Thin', 'Helvetica Neue Thin Italic', 'Helvetica Neue UltraLight', 'Helvetica Neue UltraLight Italic', 'Helvetica Oblique', 'Hiragino Kaku Gothic Pro W3', 'Hiragino Kaku Gothic Pro W6', 'Hiragino Kaku Gothic ProN W3', 'Hiragino Kaku Gothic ProN W6', 'Hiragino Kaku Gothic Std W8', 'Hiragino Kaku Gothic StdN W8', 'Hiragino Maru Gothic Pro W4', 'Hiragino Maru Gothic ProN', 'Hiragino Maru Gothic ProN W4', 'Hiragino Mincho Pro W3', 'Hiragino Mincho Pro W6', 'Hiragino Mincho ProN W3', 'Hiragino Mincho ProN W6', 'Hiragino Sans CNS W3', 'Hiragino Sans CNS W6', 'Hiragino Sans GB W3', 'Hiragino Sans GB W6', 'Hiragino Sans W0', 'Hiragino Sans W1', 'Hiragino Sans W2', 'Hiragino Sans W3', 'Hiragino Sans W4', 'Hiragino Sans W5', 'Hiragino Sans W6', 'Hiragino Sans W7', 'Hiragino Sans W8', 'Hiragino Sans W9', 'Hoefler Text Black', 'Hoefler Text Black Italic', 'Hoefler Text Italic', 'Hoefler Text Ornaments', 'HoloLens MDL2 Assets', 'Homa', 'Hor', 'ITF Devanagari Bold', 'ITF Devanagari Book', 'ITF Devanagari Demi', 'ITF Devanagari Light', 'ITF Devanagari Marathi', 'ITF Devanagari Marathi Bold', 'ITF Devanagari Marathi Book', 'ITF Devanagari Marathi Demi', 'ITF Devanagari Marathi Light', 'ITF Devanagari Marathi Medium', 'ITF Devanagari Medium', 'InaiMathi Bold', 'Ink Free', 'Iowan Old Style Black', 'Iowan Old Style Black Italic', 'Iowan Old Style Bold', 'Iowan Old Style Bold Italic', 'Iowan Old Style Italic', 'Iowan Old Style Roman', 'Iowan Old Style Titling', 'IrisUPC Bold', 'IrisUPC Bold Italic', 'IrisUPC Italic', 'Iskoola Pota Bold', 'Japan', 'JasmineUPC Bold', 'JasmineUPC Bold Italic', 'JasmineUPC Italic', 'Jet', 'KacstArt', 'Kai Regular', 'Kailasa Bold', 'Kailasa Regular', 'Kaiti SC Black', 'Kaiti SC Bold', 'Kaiti SC Regular', 'Kaiti TC Black', 'Kaiti TC Bold', 'Kaiti TC Regular', 'Kalinga Bold', 'Kannada MN Bold', 'Kannada Sangam MN Bold', 'Kartika Bold', 'Kayrawan', 'Kefa Bold', 'Kefa Regular', 'Keter YG', 'Keyboard', 'Khalid', 'Khmer MN Bold', 'Khmer OS', 'Khmer OS Battambang', 'Khmer OS Bokor', 'Khmer OS Content', 'Khmer OS Fasthand', 'Khmer OS Freehand', 'Khmer OS Metal Chrieng', 'Khmer OS Muol', 'Khmer OS Muol Light', 'Khmer OS Muol Pali', 'Khmer OS Siemreap', 'Khmer OS System', 'Khmer UI Bold', 'Klee Demibold', 'Klee Medium', 'KodchiangUPC Bold', 'KodchiangUPC Bold Italic', 'KodchiangUPC Italic', 'Kohinoor Bangla Bold', 'Kohinoor Bangla Light', 'Kohinoor Bangla Medium', 'Kohinoor Bangla Semibold', 'Kohinoor Devanagari', 'Kohinoor Devanagari Bold', 'Kohinoor Devanagari Light', 'Kohinoor Devanagari Medium', 'Kohinoor Devanagari Regular', 'Kohinoor Devanagari Semibold', 'Kohinoor Telugu Bold', 'Kohinoor Telugu Light', 'Kohinoor Telugu Medium', 'Kohinoor Telugu Semibold', 'Kokila Bold', 'Kokila Bold Italic', 'Kokila Italic', 'Kokonor Regular', 'KufiStandardGK Regular', 'Lantinghei SC Demibold', 'Lantinghei SC Extralight', 'Lantinghei SC Heavy', 'Lantinghei TC Demibold', 'Lantinghei TC Extralight', 'Lantinghei TC Heavy', 'Lao MN Bold', 'Lao UI Bold', 'LastResort', 'Latha Bold', 'Leelawadee Bold', 'Leelawadee UI', 'Leelawadee UI Bold', 'Leelawadee UI Semilight', 'Levenim MT Bold', 'LiHei Pro', 'LiSong Pro', 'Libian SC Regular', 'Libian TC Regular', 'LilyUPC Bold', 'LilyUPC Bold Italic', 'LilyUPC Italic', 'LingWai SC Medium', 'LingWai TC Medium', 'Lohit Bengali', 'Lohit Tamil Classical', 'Lucida Grande Bold', 'Malayalam MN', 'Malayalam MN Bold', 'Malayalam Sangam MN Bold', 'Malgun Gothic Bold', 'Malgun Gothic Semilight', 'Mangal Bold', 'Manjari Thin', 'Marion Bold', 'Marion Italic', 'Marion Regular', 'Marker Felt Thin', 'Marker Felt Wide', 'Mashq', 'Mashq-Bold', 'Meiryo Bold', 'Meiryo Bold Italic', 'Meiryo Italic', 'Meiryo UI Bold', 'Meiryo UI Bold Italic', 'Meiryo UI Italic', 'Menlo Bold', 'Menlo Bold Italic', 'Menlo Italic', 'Menlo Regular', 'Microsoft JhengHei Bold', 'Microsoft JhengHei Light', 'Microsoft JhengHei Regular', 'Microsoft JhengHei UI Bold', 'Microsoft JhengHei UI Light', 'Microsoft JhengHei UI Regular', 'Microsoft New Tai Lue Bold', 'Microsoft PhagsPa Bold', 'Microsoft Tai Le Bold', 'Microsoft Uighur Bold', 'Microsoft YaHei Bold', 'Microsoft YaHei Light', 'Microsoft YaHei UI Bold', 'Microsoft YaHei UI Light', 'Mingzat', 'Miriam CLM', 'Miriam Mono CLM', 'Mishafi Gold Regular', 'Mishafi Regular', 'Montserrat Black', 'Montserrat ExtraBold', 'Montserrat ExtraLight', 'Montserrat Light', 'Montserrat Medium', 'Montserrat SemiBold', 'Montserrat Thin', 'Mshtakan Bold', 'Mshtakan BoldOblique', 'Mshtakan Oblique', 'Mukti Narrow Bold', 'Muna Black', 'Muna Bold', 'Muna Regular', 'Myanmar MN Bold', 'Myanmar Sangam MN Bold', 'Myanmar Text Bold', 'Myriad Arabic', 'Myriad Arabic Black', 'Myriad Arabic Black Italic', 'Myriad Arabic Bold', 'Myriad Arabic Bold Italic', 'Myriad Arabic Italic', 'Myriad Arabic Light', 'Myriad Arabic Light Italic', 'Myriad Arabic Semibold', 'Myriad Arabic Semibold Italic', 'Nachlieli CLM', 'Nada', 'Nadeem Regular', 'Nagham', 'NanumGothic Bold', 'NanumGothic ExtraBold', 'NanumMyeongjo', 'NanumMyeongjo Bold', 'NanumMyeongjo ExtraBold', 'Nazli', 'Neue Haas Grotesk Text Pro', 'Neue Haas Grotesk Text Pro Bold', 'Neue Haas Grotesk Text Pro Bold Italic', 'Neue Haas Grotesk Text Pro Italic', 'Neue Haas Grotesk Text Pro Medium', 'Neue Haas Grotesk Text Pro Medium Italic', 'New Peninim MT Bold', 'New Peninim MT Bold Inclined', 'New Peninim MT Inclined', 'Nice', 'Nimbus Mono L', 'Nimbus Roman No9 L', 'Nimbus Sans L', 'Nirmala UI Bold', 'Nirmala UI Semilight', 'Noteworthy Bold', 'Noteworthy Light', 'Noto Emoji', 'Noto Kufi Arabic', 'Noto Sans Adlam', 'Noto Sans Adlam Unjoined', 'Noto Sans Anatolian Hieroglyphs', 'Noto Sans Arabic', 'Noto Sans Avestan', 'Noto Sans Balinese', 'Noto Sans Bamum', 'Noto Sans Batak', 'Noto Sans Brahmi', 'Noto Sans Buhid', 'Noto Sans CJK HK Black', 'Noto Sans CJK HK DemiLight', 'Noto Sans CJK HK Light', 'Noto Sans CJK HK Medium', 'Noto Sans CJK HK Thin', 'Noto Sans CJK JP', 'Noto Sans CJK JP Black', 'Noto Sans CJK JP DemiLight', 'Noto Sans CJK JP Light', 'Noto Sans CJK JP Medium', 'Noto Sans CJK JP Thin', 'Noto Sans CJK KR Black', 'Noto Sans CJK KR DemiLight', 'Noto Sans CJK KR Light', 'Noto Sans CJK KR Medium', 'Noto Sans CJK KR Thin', 'Noto Sans CJK SC', 'Noto Sans CJK SC Black', 'Noto Sans CJK SC DemiLight', 'Noto Sans CJK SC Light', 'Noto Sans CJK SC Medium', 'Noto Sans CJK SC Regular', 'Noto Sans CJK SC Thin', 'Noto Sans CJK TC', 'Noto Sans CJK TC Black', 'Noto Sans CJK TC DemiLight', 'Noto Sans CJK TC Light', 'Noto Sans CJK TC Medium', 'Noto Sans CJK TC Thin', 'Noto Sans Carian', 'Noto Sans Chakma', 'Noto Sans Cham', 'Noto Sans Coptic', 'Noto Sans Cuneiform', 'Noto Sans Cypriot', 'Noto Sans Deseret', 'Noto Sans Display', 'Noto Sans Egyptian Hieroglyphs', 'Noto Sans Glagolitic', 'Noto Sans Gothic', 'Noto Sans Hanunoo', 'Noto Sans Imperial Aramaic', 'Noto Sans Inscriptional Pahlavi', 'Noto Sans Inscriptional Parthian', 'Noto Sans Javanese', 'Noto Sans Kaithi', 'Noto Sans Kayah Li', 'Noto Sans Kharoshthi', 'Noto Sans Lepcha', 'Noto Sans Limbu', 'Noto Sans Linear B', 'Noto Sans Lisu', 'Noto Sans Lycian', 'Noto Sans Lydian', 'Noto Sans Mandaic', 'Noto Sans Meetei Mayek', 'Noto Sans Mono', 'Noto Sans Mono CJK HK', 'Noto Sans Mono CJK KR', 'Noto Sans Mono CJK TC', 'Noto Sans NKo', 'Noto Sans New Tai Lue', 'Noto Sans Ogham', 'Noto Sans Ol Chiki', 'Noto Sans Old Italic', 'Noto Sans Old Persian', 'Noto Sans Old South Arabian', 'Noto Sans Old Turkic', 'Noto Sans Osage', 'Noto Sans Osmanya', 'Noto Sans Phags Pa', 'Noto Sans Phoenician', 'Noto Sans Rejang', 'Noto Sans Runic', 'Noto Sans Samaritan', 'Noto Sans Saurashtra', 'Noto Sans Shavian', 'Noto Sans Sundanese', 'Noto Sans Syloti Nagri', 'Noto Sans Symbols', 'Noto Sans Symbols2', 'Noto Sans Syriac Eastern', 'Noto Sans Syriac Estrangela', 'Noto Sans Syriac Western', 'Noto Sans Tagalog', 'Noto Sans Tagbanwa', 'Noto Sans Tai Le', 'Noto Sans Tai Tham', 'Noto Sans Tai Viet', 'Noto Sans Tifinagh', 'Noto Sans Ugaritic', 'Noto Sans Vai', 'Noto Serif Bengali', 'Noto Serif CJK JP Black', 'Noto Serif CJK JP ExtraLight', 'Noto Serif CJK JP Light', 'Noto Serif CJK JP Medium', 'Noto Serif CJK JP SemiBold', 'Noto Serif CJK KR', 'Noto Serif CJK KR Black', 'Noto Serif CJK KR ExtraLight', 'Noto Serif CJK KR Light', 'Noto Serif CJK KR Medium', 'Noto Serif CJK KR SemiBold', 'Noto Serif CJK SC Black', 'Noto Serif CJK SC ExtraLight', 'Noto Serif CJK SC Light', 'Noto Serif CJK SC Medium', 'Noto Serif CJK SC SemiBold', 'Noto Serif CJK TC', 'Noto Serif CJK TC Black', 'Noto Serif CJK TC ExtraLight', 'Noto Serif CJK TC Light', 'Noto Serif CJK TC Medium', 'Noto Serif CJK TC SemiBold', 'Noto Serif Devanagari', 'Noto Serif Display', 'Noto Serif Ethiopic', 'Noto Serif Georgian', 'Noto Serif Gujarati', 'Noto Serif Hebrew', 'Noto Serif Kannada', 'Noto Serif Malayalam', 'Noto Serif Myanmar', 'Noto Serif Sinhala', 'Noto Serif Tamil', 'Noto Serif Telugu', 'Nuosu SIL', 'Optima Bold', 'Optima Bold Italic', 'Optima ExtraBlack', 'Optima Italic', 'Optima Regular', 'Oriya MN Bold', 'Oriya Sangam MN Bold', 'Osaka', 'Osaka-Mono', 'Ostorah', 'Ouhod', 'Ouhod-Bold', 'P052', 'PCMyungjo Regular', 'PT Mono Bold', 'PT Sans Bold', 'PT Sans Bold Italic', 'PT Sans Caption Bold', 'PT Sans Italic', 'PT Sans Narrow Bold', 'PT Serif Bold', 'PT Serif Bold Italic', 'PT Serif Caption Italic', 'PT Serif Italic', 'PakType Naskh Basic', 'Palatino Bold', 'Palatino Bold Italic', 'Palatino Italic', 'Palatino Linotype Bold', 'Palatino Linotype Bold Italic', 'Palatino Linotype Italic', 'Papyrus Condensed', 'Petra', 'Phosphate Inline', 'Phosphate Solid', 'PilGi Regular', 'PingFang HK Light', 'PingFang HK Medium', 'PingFang HK Regular', 'PingFang HK Semibold', 'PingFang HK Thin', 'PingFang HK Ultralight', 'PingFang SC', 'PingFang SC Light', 'PingFang SC Medium', 'PingFang SC Regular', 'PingFang SC Semibold', 'PingFang SC Thin', 'PingFang SC Ultralight', 'PingFang TC', 'PingFang TC Light', 'PingFang TC Medium', 'PingFang TC Regular', 'PingFang TC Semibold', 'PingFang TC Thin', 'PingFang TC Ultralight', 'Raanana Bold', 'Raavi Bold', 'Rasa Light', 'Rasa Medium', 'Rasa SemiBold', 'Rasheeq', 'Rasheeq-Bold', 'Rehan', 'Rockwell Bold', 'Rockwell Bold Italic', 'Rockwell Italic', 'Rockwell Nova', 'Rockwell Nova Bold', 'Rockwell Nova Bold Italic', 'Rockwell Nova Cond', 'Rockwell Nova Cond Bold', 'Rockwell Nova Cond Bold Italic', 'Rockwell Nova Cond Italic', 'Rockwell Nova Cond Light', 'Rockwell Nova Cond Light Italic', 'Rockwell Nova Extra Bold', 'Rockwell Nova Extra Bold Italic', 'Rockwell Nova Italic', 'Rockwell Nova Light Italic', 'Rockwell Nova Rockwell', 'STFangsong', 'STHeiti', 'STIX', 'STIX Math', 'STIX Two Math', 'STIX Two Text', 'STIX Two Text Bold', 'STIX Two Text Bold Italic', 'STIX Two Text Italic', 'STIXGeneral-Bold', 'STIXGeneral-BoldItalic', 'STIXGeneral-Italic', 'STIXGeneral-Regular', 'STIXIntegralsD-Bold', 'STIXIntegralsD-Regular', 'STIXIntegralsSm-Bold', 'STIXIntegralsSm-Regular', 'STIXIntegralsUp-Bold', 'STIXIntegralsUp-Regular', 'STIXIntegralsUpD-Bold', 'STIXIntegralsUpD-Regular', 'STIXIntegralsUpSm-Bold', 'STIXIntegralsUpSm-Regular', 'STIXNonUnicode', 'STIXNonUnicode-Bold', 'STIXNonUnicode-BoldItalic', 'STIXNonUnicode-Italic', 'STIXNonUnicode-Regular', 'STIXSizeFiveSym-Regular', 'STIXSizeFourSym-Bold', 'STIXSizeFourSym-Regular', 'STIXSizeOneSym-Bold', 'STIXSizeOneSym-Regular', 'STIXSizeThreeSym-Bold', 'STIXSizeThreeSym-Regular', 'STIXSizeTwoSym-Bold', 'STIXSizeTwoSym-Regular', 'STIXVariants-Bold', 'STIXVariants-Regular', 'STKaiti', 'STXihei', 'Sakkal Majalla Bold', 'Salem', 'Samyak Malayalam', 'Sana Regular', 'Sanskrit Text', 'Savoye LET Plain CC.:1.0', 'Savoye LET Plain:1.0', 'Segoe MDL2 Assets', 'Segoe Print Bold', 'Segoe Pseudo', 'Segoe Script Bold', 'Segoe UI Black', 'Segoe UI Black Italic', 'Segoe UI Bold', 'Segoe UI Bold Italic', 'Segoe UI Historic', 'Segoe UI Italic', 'Segoe UI Light Italic', 'Segoe UI Semibold Italic', 'Segoe UI Semilight', 'Segoe UI Semilight Italic', 'Seravek', 'Seravek Bold', 'Seravek Bold Italic', 'Seravek ExtraLight', 'Seravek ExtraLight Italic', 'Seravek Italic', 'Seravek Light', 'Seravek Light Italic', 'Seravek Medium', 'Seravek Medium Italic', 'Shado', 'Sharjah', 'Shofar', 'Shonar Bangla Bold', 'Shree Devanagari 714', 'Shree Devanagari 714 Bold', 'Shree Devanagari 714 Bold Italic', 'Shree Devanagari 714 Italic', 'Shruti Bold', 'SignPainter-HouseScript', 'SignPainter-HouseScript Semibold', 'Simple CLM', 'Simplified Arabic Bold', 'Sindbad', 'Sinhala MN', 'Sinhala MN Bold', 'Sinhala Sangam MN Bold', 'Sitka Banner Bold', 'Sitka Banner Bold Italic', 'Sitka Banner Italic', 'Sitka Display Bold', 'Sitka Display Bold Italic', 'Sitka Display Italic', 'Sitka Heading Bold', 'Sitka Heading Bold Italic', 'Sitka Heading Italic', 'Sitka Small Bold', 'Sitka Small Bold Italic', 'Sitka Small Italic', 'Sitka Subheading Bold', 'Sitka Subheading Bold Italic', 'Sitka Subheading Italic', 'Sitka Text Bold', 'Sitka Text Bold Italic', 'Sitka Text Italic', 'Skia Black', 'Skia Black Condensed', 'Skia Black Extended', 'Skia Bold', 'Skia Condensed', 'Skia Extended', 'Skia Light', 'Skia Light Condensed', 'Skia Light Extended', 'Skia Regular', 'Snell Roundhand Black', 'Snell Roundhand Bold', 'Songti SC Black', 'Songti SC Bold', 'Songti SC Light', 'Songti SC Regular', 'Songti TC Bold', 'Songti TC Light', 'Songti TC Regular', 'Source Code Pro Black', 'Source Code Pro ExtraLight', 'Source Code Pro Light', 'Source Code Pro Medium', 'Source Code Pro Semibold', 'Stam Ashkenaz CLM', 'Stam Sefarad CLM', 'Standard Symbols L', 'Standard Symbols PS', 'Sukhumvit Set Bold', 'Sukhumvit Set Light', 'Sukhumvit Set Medium', 'Sukhumvit Set Semi Bold', 'Sukhumvit Set Text', 'Sukhumvit Set Thin', 'Superclarendon Black', 'Superclarendon Black Italic', 'Superclarendon Bold', 'Superclarendon Bold Italic', 'Superclarendon Italic', 'Superclarendon Light', 'Superclarendon Light Italic', 'Superclarendon Regular', 'Symbola', 'System Font Bold', 'System Font Regular', 'Tahoma Bold', 'Tahoma Negreta', 'Tamil MN Bold', 'Tamil Sangam MN Bold', 'Tarablus', 'Telugu MN Bold', 'Telugu Sangam MN Bold', 'Tholoth', 'Thonburi Bold', 'Thonburi Light', 'Times Bold', 'Times Bold Italic', 'Times Italic', 'Times New Roman Bold', 'Times New Roman Bold Italic', 'Times New Roman Italic', 'Times Roman', 'Titr', 'Toppan Bunkyu Gothic Demibold', 'Toppan Bunkyu Gothic Regular', 'Toppan Bunkyu Midashi Gothic Extrabold', 'Toppan Bunkyu Midashi Mincho Extrabold', 'Toppan Bunkyu Mincho Regular', 'Traditional Arabic Bold', 'Trebuchet MS Bold', 'Trebuchet MS Bold Italic', 'Trebuchet MS Italic', 'Tsukushi A Round Gothic Bold', 'Tsukushi A Round Gothic Regular', 'Tsukushi B Round Gothic Bold', 'Tsukushi B Round Gothic Regular', 'Tunga Bold', 'Twemoji Mozilla', 'UD Digi Kyokasho', 'UD Digi Kyokasho N-B', 'UD Digi Kyokasho N-R', 'UD Digi Kyokasho NK-B', 'UD Digi Kyokasho NK-R', 'UD Digi Kyokasho NP-B', 'UD Digi Kyokasho NP-R', 'UKIJ 3D', 'UKIJ Basma', 'UKIJ Bom', 'UKIJ CJK', 'UKIJ Chechek', 'UKIJ Chiwer Kesme', 'UKIJ Diwani', 'UKIJ Diwani Kawak', 'UKIJ Diwani Tom', 'UKIJ Diwani Yantu', 'UKIJ Ekran', 'UKIJ Elipbe', 'UKIJ Elipbe_Chekitlik', 'UKIJ Esliye', 'UKIJ Esliye Chiwer', 'UKIJ Esliye Neqish', 'UKIJ Esliye Qara', 'UKIJ Esliye Tom', 'UKIJ Imaret', 'UKIJ Inchike', 'UKIJ Jelliy', 'UKIJ Junun', 'UKIJ Kawak', 'UKIJ Kawak 3D', 'UKIJ Kesme', 'UKIJ Kesme Tuz', 'UKIJ Kufi', 'UKIJ Kufi 3D', 'UKIJ Kufi Chiwer', 'UKIJ Kufi Gul', 'UKIJ Kufi Kawak', 'UKIJ Kufi Tar', 'UKIJ Kufi Uz', 'UKIJ Kufi Yay', 'UKIJ Kufi Yolluq', 'UKIJ Mejnun', 'UKIJ Mejnuntal', 'UKIJ Merdane', 'UKIJ Moy Qelem', 'UKIJ Nasq', 'UKIJ Nasq Zilwa', 'UKIJ Orqun Basma', 'UKIJ Orqun Yazma', 'UKIJ Orxun-Yensey', 'UKIJ Qara', 'UKIJ Qolyazma', 'UKIJ Qolyazma Tez', 'UKIJ Qolyazma Tuz', 'UKIJ Qolyazma Yantu', 'UKIJ Ruqi', 'UKIJ Saet', 'UKIJ Sulus', 'UKIJ Sulus Tom', 'UKIJ Teng', 'UKIJ Tiken', 'UKIJ Title', 'UKIJ Tor', 'UKIJ Tughra', 'UKIJ Tuz', 'UKIJ Tuz Basma', 'UKIJ Tuz Gezit', 'UKIJ Tuz Kitab', 'UKIJ Tuz Neqish', 'UKIJ Tuz Qara', 'UKIJ Tuz Tom', 'UKIJ Tuz Tor', 'UKIJ Zilwa', 'UKIJ_Mac Basma', 'UKIJ_Mac Ekran', 'URW Bookman', 'URW Bookman L', 'URW Chancery L', 'URW Gothic', 'URW Gothic L', 'URW Palladio L', 'Ubuntu Light', 'Ubuntu Thin', 'Urdu Typesetting Bold', 'Utsaah Bold', 'Utsaah Bold Italic', 'Utsaah Italic', 'Vani Bold', 'Verdana Bold', 'Verdana Bold Italic', 'Verdana Italic', 'Verdana Pro', 'Verdana Pro Black', 'Verdana Pro Black Italic', 'Verdana Pro Bold', 'Verdana Pro Bold Italic', 'Verdana Pro Cond', 'Verdana Pro Cond Black', 'Verdana Pro Cond Black Italic', 'Verdana Pro Cond Bold', 'Verdana Pro Cond Bold Italic', 'Verdana Pro Cond Italic', 'Verdana Pro Cond Light', 'Verdana Pro Cond Light Italic', 'Verdana Pro Cond SemiBold', 'Verdana Pro Cond SemiBold Italic', 'Verdana Pro Italic', 'Verdana Pro Light', 'Verdana Pro Light Italic', 'Verdana Pro SemiBold', 'Verdana Pro SemiBold Italic', 'Vijaya Bold', 'Vrinda Bold', 'Waseem Light', 'Waseem Regular', 'Wawati SC Regular', 'Wawati TC Regular', 'Weibei SC Bold', 'Weibei TC Bold', 'Xingkai SC Bold', 'Xingkai SC Light', 'Xingkai TC Bold', 'Xingkai TC Light', 'Yehuda CLM', 'Yrsa Light', 'Yrsa Medium', 'Yrsa SemiBold', 'Yu Gothic Bold', 'Yu Gothic Light', 'Yu Gothic Medium', 'Yu Gothic Regular', 'Yu Gothic UI', 'Yu Gothic UI Bold', 'Yu Gothic UI Light', 'Yu Gothic UI Regular', 'Yu Gothic UI Semibold', 'Yu Gothic UI Semilight', 'Yu Mincho', 'Yu Mincho Demibold', 'Yu Mincho Light', 'Yu Mincho Regular', 'YuGothic Bold', 'YuGothic Medium', 'YuKyokasho Bold', 'YuKyokasho Medium', 'YuKyokasho Yoko Bold', 'YuKyokasho Yoko Medium', 'YuMincho +36p Kana Demibold', 'YuMincho +36p Kana Extrabold', 'YuMincho +36p Kana Medium', 'YuMincho Demibold', 'YuMincho Extrabold', 'YuMincho Medium', 'Yuanti SC Bold', 'Yuanti SC Light', 'Yuanti SC Regular', 'Yuanti TC Bold', 'Yuanti TC Light', 'Yuanti TC Regular', 'Yuppy SC Regular', 'Yuppy TC Regular', 'Z003', 'aakar', 'padmaa-Bold.1.1', 'padmmaa', 'utkal', 'מרים', 'गार्गी', 'नालिमाटी', 'অনি Dvf', 'মিত্র', 'মুক্তি', 'মুক্তি পাতনা', '宋体', '微软雅黑', `新細明`, `굴림`, `굴림체`, `바탕`, `ＭＳ ゴシック`, `ＭＳ 明朝`, `ＭＳ Ｐゴシック`, `ＭＳ Ｐ明朝`]
            const existsFonts = fontEntries.map(e => e.name)
            const nonexistentFonts = extraFonts.filter(e => !existsFonts.includes(e))

            for (const font of nonexistentFonts) {
                fontEntries.push({
                    name: font,
                    exists: 0,
                })
            }

            // disrupt them
            fontEntries = helper.arrShuffle(fontEntries)

            let fontSizeIncreasement = 1
            let fontStyleKeywordIndex = 0

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
            ]

            const fontStyleKeywords = [
                'normal',
                'italic',
                'oblique',
            ]

            for (const {name, exists} of fontEntries) {
                // e:
                // 0 Not Exist
                // 1 Exist
                // 2 Base Font

                // Random Number
                fonts[name] = exists === FontExistTypes.FontExists
                    ? {
                        // textMetrics salting
                        // actualBoundingBoxAscent: -1.4033203125
                        // actualBoundingBoxDescent: 43.126953125
                        // actualBoundingBoxLeft: -4.8095703125
                        // actualBoundingBoxRight: 240.3076171875
                        // fontBoundingBoxAscent: 5.65625
                        // fontBoundingBoxDescent: 51.34375
                        // width

                        exists: true,
                        offsetWidth: helper.rd(5, 10),
                        offsetHeight: helper.rd(1, 4),
                        style: helper.arrRd(fontStyleKeywords),
                        weight: fontWeightKeywords[fontStyleKeywordIndex],
                        size: fontSizeIncreasement,
                    }
                    : {
                        exists: exists !== FontExistTypes.FontNotExists, // Possible base font = 2
                        offsetWidth: 0,
                        offsetHeight: 0,
                        style: 'normal',
                        weight: 'normal',
                        size: 0,
                    }

                if (exists === FontExistTypes.FontExists) {
                    ++fontStyleKeywordIndex
                    ++fontSizeIncreasement

                    // The emoji may only have one type of italic, only up to 2 is fine.
                    if (fontStyleKeywordIndex >= 2) {
                        fontStyleKeywordIndex = 0
                        // ++fontSizeIncreasement
                    }
                }
            }

            fakeDD.fontSalt = fonts
            needsUpdate = true
        }

        // canvas with salt
        if (!fakeDD.canvasSalt || !fakeDD.canvasSalt.length) {
            const random = (list: number[]) => {
                let min = 0
                let max = list.length
                return list[Math.floor(Math.random() * (max - min)) + min]
            }

            fakeDD.canvasSalt = []
            for (let n = 0; n < 100; ++n) {
                let r = random([0, 1, 2, 3, 4, 5, 6].map(a => a - 3))

                fakeDD.canvasSalt.push(r)
            }

            needsUpdate = true
        }

        // acceptLanguage
        if (!fakeDD.acceptLanguage) {
            fakeDD.acceptLanguage = this.buildAcceptLanguage(fakeDD)
            needsUpdate = true
        }

        return {
            fakeDeviceDesc: fakeDD,
            needsUpdate,
        }
    }

    private static buildAcceptLanguage(deviceDesc: DeviceDescriptor): string {
        // referer: https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Headers/Accept-Language
        // https://developer.mozilla.org/zh-CN/docs/Glossary/Quality_values

        assert(deviceDesc.navigator)
        assert(deviceDesc.navigator.languages)

        const langs = deviceDesc.navigator.languages
        let result = ''
        let counter = 9
        for (const lang of langs) {
            if (result) {
                result += ','
            }

            result += lang

            if (langs.length > 1) {
                result += `;q=0.${counter}`

                // Extreme situations: en,zh;q=0.9,fr;q=0.8,es;q=0.7,zh-CN;q=0.6,pt-BR;q=0.5,pt;q=0.4,sq;q=0.3,ar;q=0.2,an;q=0.1,am;q=0.1,az;q=0.1,ast;q=0.1,ga;q=0.1,et;q=0.1,oc;q=0.1,or;q=0.1,om;q=0.1,eu;q=0.1,be;q=0.1,bg;q=0.1
                // with the test, q must >= 0.1
                // so MDN is wrong:
                // The importance of a value is marked by the suffix ';q=' immediately followed by a value between 0 and 1 included, with up to three decimal digits
                counter = Math.max(--counter, 1)
            }
        }

        return result
    }

}
