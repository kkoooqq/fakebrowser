const {FakeBrowser} = require('../dist/cjs/FakeBrowser');
const {spawn, execSync} = require('child_process');
const path = require('path');

process.on('unhandledRejection', (error, p) => {
    console.log('=== UNHANDLED REJECTION ===');
    console.dir(error.stack);
});

const userDataDir = path.resolve(__dirname, './fakeBrowserUserData');

execSync(`rm -rf ${userDataDir}`);
execSync(`mkdir ${userDataDir}`);

const dd = require('../device-hub/macOS.json');
const child = spawn('/Applications/Google Chrome 93.0.4577.82.app/Contents/MacOS/Google Chrome',
    [
        '--no-default-browser-check',
        '--no-first-run',
        `--window-position=0,0`,
        `--window-size=${dd.window.outerWidth},${dd.window.outerHeight}`,
        `--user-data-dir=${userDataDir}`,
        '--remote-debugging-port=9222',
    ],
);

child.stdout.on('data', (data) => {
});

child.stderr.on('data', (data) => {
    const dataStr = data.toString();
    if (dataStr.includes('DevTools listening on ')) {
        const wsEndPoint = dataStr.substr(dataStr.indexOf('ws://'));
        console.log(wsEndPoint);

        launchFB(wsEndPoint).then(r => r);
    }
});

const launchFBPure = async (wsEndPoint) => {
    const {addExtra, PuppeteerExtra} = require('puppeteer-extra');
    const pptr = addExtra(require('puppeteer'));
    const browser = await pptr.connect({browserWSEndpoint: wsEndPoint});
    const page = await browser.newPage();
    await page.goto('https://nike.com/ca/');
};

const launchFB = async (wsEndPoint) => {
    const builder = new FakeBrowser.Builder()
        .deviceDescriptor(dd)
        .displayUserActionLayer(false)
        .doNotHook(false)
        .vanillaConnectOptions({
            browserWSEndpoint: wsEndPoint,
        })
        .userDataDir(userDataDir);

    const fakeBrowser = await builder.connect();
    const page = await fakeBrowser.vanillaBrowser.newPage();
    await page.goto('https://nike.com/ca');

    console.log('wait #hf_title_signin_membership appeared');
    await page.waitForSelector('#hf_title_signin_membership');

    await page.waitForTimeout(5 * 1000);

    console.log('click login button');
    const signInButton = await page.$('#hf_title_signin_membership');
    await fakeBrowser.userAction.simClickElement(signInButton);

    const emailTextField = await page.$('input[name="emailAddress"]');
    const passwordField = await page.$('input[name="password"]');
    const loginButton = await page.$('.loginSubmit');

    await fakeBrowser.userAction.simClickElement(emailTextField);
    await fakeBrowser.userAction.simKeyboardType('sdf99@gmail.com');

    await fakeBrowser.userAction.simClickElement(passwordField);
    await fakeBrowser.userAction.simKeyboardType('passowdd10-');

    await fakeBrowser.userAction.simClickElement(loginButton);


    // await fakeBrowser.shutdown();
};

