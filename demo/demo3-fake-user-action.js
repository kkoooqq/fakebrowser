const {FakeBrowser} = require('fakebrowser');
const {PptrToolkit} = require('fakebrowser/dist/cjs/PptrToolkit');

!(async () => {
    const builder = new FakeBrowser.Builder()
        .displayUserActionLayer(true)
        .vanillaLaunchOptions({
            headless: false,
        })
        .userDataDir('./fakeBrowserUserData');

    const fakeBrowser = await builder.launch();

    const page = await fakeBrowser.vanillaBrowser.newPage();
    await page.goto('https://google.com/');

    // github has the annoying CSP, so we need to bypass it.
    await page.setBypassCSP(true);

    // Find the google search input box and submit button
    const searchInput = await page.$('input[name="q"]');
    const submitButtons = await page.$$('input[type="submit"]');

    let submitButton = null;
    for (const sb of submitButtons) {
        // There are lots of type="submit" buttons on the page, we need to find the button that intersects with viewport,
        // and the first button we found is the "search" button.
        if (await PptrToolkit.intersectingViewport(sb, fakeBrowser.launchParams.fakeDeviceDesc)) {
            submitButton = sb;
            break;
        }
    }

    // Search input box and search button are found, proceed to next step
    if (searchInput && submitButton) {
        // "userAction" contains lots of useful functions for simulating user actions.
        const userAction = fakeBrowser.userAction;

        // Simulate clicking the "Search Text" input box,
        // the return value is: click on input box is successful.
        const clickInputSuccess = await userAction.simClickElement(searchInput);

        if (clickInputSuccess) {
            // Simulates keyboard input, Shift / Alt / Ctrl operations are wrapped
            await userAction.simKeyboardType('github');
            await userAction.simKeyboardEsc();

            // Attention! Here we have to set: pauseAfterMouseUp=false.
            // By default, when we simulate mouse up, we will pause randomly from 500ms to 1500ms, and the page may jump within a second,
            // we won't be able to capture the page.waitForNavigation event.
            const clickSearchSuccess = await userAction.simClickElement(
                submitButton,
                {pauseAfterMouseUp: false},
            );

            if (clickSearchSuccess) {
                // Waiting for page to jump
                await page.waitForNavigation();

                // first result from google search
                const githubLink = await page.$('a[href="https://github.com/"]');
                if (githubLink) {
                    // Click this link and DO NOT pause after click is complete
                    await userAction.simClickElement(
                        githubLink,
                        {pauseAfterMouseUp: false},
                    );

                    // Wait for page jump to github.com
                    await page.waitForNavigation();

                    // github home page has a spinning ball to make computer especially laggy, let's delete it
                    await page.evaluate(() => {
                        const earthElem = document.querySelector('div[data-feature="home_page_globe"]');
                        if (earthElem) {
                            earthElem.remove();
                        }
                    });

                    // find the input box to search repo
                    const searchRepoInput = await page.$('input[name="q"]');
                    if (searchRepoInput) {
                        // Click the input box
                        await userAction.simClickElement(searchRepoInput);

                        // type the content of the search
                        await userAction.simKeyboardType('fakebrowser');

                        // Press enter. same, DO NOT pause after return keyup
                        await userAction.simKeyboardEnter({pauseAfterKeyUp: false});

                        await page.waitForNavigation();

                        // The first search result is our repo
                        const firstLink = await page.$('a.v-align-middle');
                        if (firstLink) {
                            // Click this link
                            await userAction.simClickElement(firstLink, {pauseAfterMouseUp: false});

                            await page.waitForNavigation();

                            // Give me a STAR!!!
                            const starButton = (await page.$$('a.tooltipped'))[1];
                            if (starButton) {
                                await userAction.simClickElement(starButton);
                            }
                        }
                    }
                }
            }
        }
    }
})();

