import fs from 'fs'
import Koa from 'Koa'
import serve from 'koa-static';
import koaBody from 'koa-body';
import { DeviceDescriptor, UserAgentHelper, DeviceDescriptorHelper } from '..'

const app = new Koa();
app.use(koaBody());
app.use(serve(__dirname, {index: 'index.html'}));

app.use(async ctx => {
    if (ctx.request.method === 'POST') {
        const body: DeviceDescriptor = await ctx.request.body;
        const os = UserAgentHelper.os(body.navigator.userAgent);
        const browser = UserAgentHelper.browserType(body.navigator.userAgent);
        const hash = DeviceDescriptorHelper.deviceUUID(body);
        const dest = `${os}-${browser}-${hash}.json`;
        const fpKeys = Object.keys(body).sort() as Array<keyof(DeviceDescriptor)>;
        const sortedfs = {} as any;

        // TODO
        // const rtc = body.rtc;
        // if (rtc) {
        //     for (const entry of rtc) {
        //         let {candidate} = entry
        //         if (!candidate)
        //             continue;
        //         // anonymize candidate       
        //     }
        // }

        for (const key of fpKeys) {
            // do not keep
            if (key == 'mediaDevices')
                continue;
            sortedfs[key] = body[key];
        }
        await fs.promises.writeFile(dest, JSON.stringify(sortedfs, null, 2));
        ctx.body = dest;
        console.log(`${dest} saved`);
    }
});
const port = 3000;
app.listen(port, () => console.log(`Server ready in port ${port}`));
