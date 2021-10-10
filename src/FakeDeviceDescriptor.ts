export interface DeviceDescriptor {
    plugins: {
        mimeTypes: Array<{
            type: string,
            suffixes: string,
            description: string,
            __pluginName: string,
        }>,
        plugins: Array<{
            name: string,
            filename: string,
            description: string,
            __mimeTypes: Array<string>,
        }>
    },
    allFonts: Array<{
        name: string,
        exists: number,
    }>,
    gpu: {
        vendor: string,
        renderer: string,
    },
    navigator: {
        languages: Array<string>,
        userAgent: string,
        "appCodeName": string,
        "appMinorVersion": string,
        "appName": string,
        "appVersion": string,
        "buildID": string,
        "platform": string,
        "product": string,
        "productSub": string,
        "hardwareConcurrency": number,
        "cpuClass": string,
        "maxTouchPoints": number,
        "oscpu": string,
        "vendor": string,
        "vendorSub": string,
        "deviceMemory": number,
        "doNotTrack": string,
        "msDoNotTrack": string,
        "vibrate": string,
        "credentials": string,
        "storage": string,
        "requestMediaKeySystemAccess": string,
        "bluetooth": string,
        "language": string,
        "systemLanguage": string,
        "userLanguage": string,
        webdriver: boolean,
    },
    "window": {
        "innerWidth": number,
        "innerHeight": number,
        "outerWidth": number,
        "outerHeight": number,
        "screenX": number,
        "screenY": number,
        "pageXOffset": number,
        "pageYOffset": number,
        "Image": string,
        "isSecureContext": boolean,
        "devicePixelRatio": number,
        "toolbar": string,
        "locationbar": string,
        "ActiveXObject": string,
        "external": string,
        "mozRTCPeerConnection": string,
        "postMessage": string,
        "webkitRequestAnimationFrame": string,
        "BluetoothUUID": string,
        "netscape": string,
        "localStorage": string,
        "sessionStorage": string,
        "indexDB": string,
    },
    "document": {
        "characterSet": string,
        "compatMode": string,
        "documentMode": string,
        "layers": string,
        "images": string,
    },
    "screen": {
        "availWidth": number,
        "availHeight": number,
        "availLeft": number,
        "availTop": number,
        "width": number,
        "height": number,
        "colorDepth": number,
        "pixelDepth": number
    },
    "body": {
        "clientWidth": number,
        "clientHeight": number
    },
    "webgl": {
        "supportedExtensions": Array<string>,
        "antialias": boolean,
        "contextAttributes": {
            "alpha": boolean,
            "antialias": boolean,
            "depth": boolean,
            "desynchronized": boolean,
            "failIfMajorPerformanceCaveat": boolean,
            "powerPreference": string,
            "premultipliedAlpha": boolean,
            "preserveDrawingBuffer": boolean,
            "stencil": boolean,
            "xrCompatible": boolean
        },
        "blueBits": number,
        "depthBits": number,
        "greenBits": number,
        "maxAnisotropy": number,
        "maxCombinedTextureImageUnits": number,
        "maxCubeMapTextureSize": number,
        "maxFragmentUniformVectors": number,
        "maxRenderbufferSize": number,
        "maxTextureImageUnits": number,
        "maxTextureSize": number,
        "maxVaryingVectors": number,
        "maxVertexAttribs": number,
        "maxVertexTextureImageUnits": number,
        "maxVertexUniformVectors": number,
        "shadingLanguageVersion": string,
        "stencilBits": number,
        "version": string,
        "aliasedLineWidthRange": {
            "0": number,
            "1": number
        },
        "aliasedPointSizeRange": {
            "0": number,
            "1": number
        },
        "maxViewportDims": {
            "0": number,
            "1": number
        },
        "alphaBits": number,
        "redBits": number,
        "renderer": string,
        "vendor": string,
        "shaderPrecisionFormats": Array<{
            "shaderType": number,
            "precisionType": number,
            "r": {
                "rangeMin": number,
                "rangeMax": number,
                "precision": number,
            }
        }>
    },
    "mediaCanPlayTypes": Array<{
        "mediaType": string,
        "r": string,
    }>,
    "mediaDevices": Array<{
        "deviceId": string,
        "kind": string,
        "label": string,
        "groupId": string
    }>,
    "battery": {
        charging: boolean,
        chargingTime: number,
        dischargingTime: number,
        level: number,
    },
}

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

export interface FakeDeviceDescriptor extends DeviceDescriptor {
    canvasSalt: Array<number>,
    fakeFonts: Array<FakeFont>,

}
