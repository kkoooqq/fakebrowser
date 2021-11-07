const rimraf = require('rimraf');
const os = require('os');
const path = require('path');

const DIR = path.join(os.tmpdir(), 'testFakeBrowserUserData');

module.exports = async function () {
    console.log('Teardown FakeBrowser');

    // noinspection JSUnresolvedVariable
    await global.fakeBrowser.shutdown();

    rimraf.sync(DIR);
};
