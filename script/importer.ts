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
        await fs.promises.writeFile(`${os}-${browser}-${hash}.json`, JSON.stringify(body, null, 2));
        ctx.body = 'ok';
    }
});

app.listen(3000);
