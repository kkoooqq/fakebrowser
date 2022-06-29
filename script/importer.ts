import fs from 'fs'
import Koa from 'Koa'
import serve from 'koa-static';
import koaBody from 'koa-body';
import { DeviceDescriptor, UserAgentHelper, DeviceDescriptorHelper } from '..'
import { networkInterfaces } from 'os';

const app = new Koa();
app.use(koaBody());
app.use(serve(__dirname, { index: 'index.html' }));

function format(body: DeviceDescriptor): string {
    const fpKeys = Object.keys(body).sort() as Array<keyof (DeviceDescriptor)>;
    const result: string[] = [];
    for (const key of fpKeys) {
        // do not keep
        if (key == 'mediaDevices')
            continue;
        const value = body[key];
        if (Array.isArray(value)) {
            if (value.length > 0 && typeof value[0] === 'string') {
                let lines = [`  ${JSON.stringify(key)}: [`];
                lines.push('  ');
                for (let i = 0; i < value.length; i++) {
                    if (i > 0) lines[lines.length - 1] += ',';
                    const len = lines[lines.length - 1].length;
                    if (len + (value[i] as string).length < 180)
                        lines[lines.length - 1] += JSON.stringify(value[i]);
                    else
                        lines.push('  ' + JSON.stringify(value[i]));
                }
                lines.push('\n  ]')
                result.push(lines.join('\n'));
                // console.log('String array in ', key);
            } else {
                const content: string[] = [];
                for (const ent of value) {
                    content.push('    ' + JSON.stringify(ent))
                }
                result.push(`  ${JSON.stringify(key)}: [\n${content.join(',\n')}\n  ]`)
            }
        } else {
            const content: string[] = [];
            for (const [k, v] of Object.entries(value as Object)) {
                const line = '    ' + JSON.stringify(k) + ': ' + JSON.stringify(v);
                content.push(line);
            }
            result.push(`  ${JSON.stringify(key)}: {\n${content.join(',\n')}\n  }`)
        }
        // sortedfs[key] = body[key];
    }
    return `{\n${result.join(',\n')}\n}\n`;
}

app.use(async ctx => {
    if (ctx.request.method === 'POST') {
        const body: DeviceDescriptor = await ctx.request.body;
        const os = UserAgentHelper.os(body.navigator.userAgent);
        const browser = UserAgentHelper.browserType(body.navigator.userAgent);
        const hash = DeviceDescriptorHelper.deviceUUID(body);
        const dest = `${os}-${browser}-${hash}.json`;

        // const sortedfs = {} as any;
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

        // await fs.promises.writeFile(dest, JSON.stringify(sortedfs, null, 2));
        await fs.promises.writeFile(dest, format(body));
        ctx.body = dest;
        console.log(`${dest} saved`);
    }
    if (ctx.request.method === 'GET') {
        const { path } = ctx.request;
        // console.log('GET', path)
        const m = (path.match(/(\w+-\w+-[0-9a-f]{32}\.json$)/))
        if (m) {
            try {
                await fs.promises.stat(m[1])
                const data = await fs.promises.readFile(m[1]);
                // console.log('data', data.length)
                ctx.body = format(JSON.parse(data.toString('utf8')));
                return;
            } catch (e) {
            }
        }
    }

});
const port = 3000;
app.listen(port, () => {
    console.log(`Server ready in port ${port}`);
    const nets = networkInterfaces()
    const results: { [key: string]: string[] } = {};
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]!) {
            // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
            // 'IPv4' is in Node <= 17, from 18 it's a number 4 or 6
            const familyV4Value = typeof net.family === 'string' ? 'IPv4' : 4
            if (net.family === familyV4Value && !net.internal) {
                if (!results[name]) {
                    results[name] = [];
                }
                results[name].push(net.address);
            }
        }
    }
    for (const netName of Object.keys(results)) {
        console.log('')
        console.log(`On interface ${netName}:`)
        const ips = results[netName];
        for (const ip of ips)
            console.log(`- http://${ip}:${port}`)
    }
});
