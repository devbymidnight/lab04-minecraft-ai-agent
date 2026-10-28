import fs from 'node:fs';
import { spawn } from 'node:child_process';
const config = JSON.parse(fs.readFileSync('.local/runtime.json', 'utf8').replace(/^\uFEFF/, ''));
const properties = fs.readFileSync(`${config.server}/server.properties`, 'utf8').replace(/^\uFEFF/, '');
if (!/^server-ip=127\.0\.0\.1\r?$/m.test(properties) || !/^server-port=25585\r?$/m.test(properties)) throw new Error('The local test server must remain on 127.0.0.1:25585.');
const child = spawn(config.java, ['-Xms512M', '-Xmx2G', '-jar', 'paper.jar', '--nogui'], { cwd: config.server, stdio: 'inherit', windowsHide: true });
child.on('error', () => { console.error('Java could not start. Check .local/runtime.json.'); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code || 0; });
