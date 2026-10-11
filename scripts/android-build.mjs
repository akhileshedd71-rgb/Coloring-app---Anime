/** Build a self-contained debug APK. No signing secrets are required. */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const env = { ...process.env };
if (existsSync('/workspace/android-sdk')) {
  env.ANDROID_HOME ||= '/workspace/android-sdk';
  env.ANDROID_USER_HOME ||= '/workspace/.android';
  env.GRADLE_USER_HOME ||= '/workspace/.gradle';
}
if (!env.JAVA_HOME && existsSync('/workspace/jdk-21/bin/javac')) env.JAVA_HOME = '/workspace/jdk-21';
// The managed Debian trust store contains the session proxy's trusted CA.
// Preserve an explicitly configured trust store on other environments.
if (env.CODEX_PROXY_CERT && existsSync('/etc/ssl/certs/java/cacerts') && !env.JAVA_TOOL_OPTIONS?.includes('javax.net.ssl.trustStore')) {
  env.JAVA_TOOL_OPTIONS = `${env.JAVA_TOOL_OPTIONS || ''} -Djavax.net.ssl.trustStore=/etc/ssl/certs/java/cacerts`.trim();
}
// Java does not inherit HTTP(S)_PROXY automatically. Preserve normal TLS trust.
// No proxy username/password or credential values are copied into project files.
for (const [scheme, variable] of [['http', 'HTTP_PROXY'], ['https', 'HTTPS_PROXY']]) {
  if (!env[variable]) continue;
  const proxy = new URL(env[variable]);
  if (proxy.username || proxy.password) {
    throw new Error('Authenticated build proxy: configure Java proxy authentication securely before running Gradle.');
  }
  env.JAVA_TOOL_OPTIONS = `${env.JAVA_TOOL_OPTIONS || ''} -D${scheme}.proxyHost=${proxy.hostname} -D${scheme}.proxyPort=${proxy.port || (proxy.protocol === 'https:' ? '443' : '80')}`.trim();
}
const run = (command, args, cwd = root) => {
  const result = spawnSync(command, args, { cwd, env, stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
};
run('npm', ['run', 'build']);
run('npx', ['cap', 'sync', 'android']);
run(process.platform === 'win32' ? 'gradlew.bat' : './gradlew', ['assembleDebug', '--no-daemon', '--max-workers=2'], path.join(root, 'android'));
mkdirSync(path.join(root, 'delivery'), { recursive: true });
const name = 'hoshii-1.0.0-debug.apk';
const destination = path.join(root, 'delivery', name);
copyFileSync(path.join(root, 'android/app/build/outputs/apk/debug/app-debug.apk'), destination);
const digest = createHash('sha256').update(readFileSync(destination)).digest('hex');
writeFileSync(`${destination}.sha256`, `${digest}  ${name}\n`);
console.log(`\nInstallable APK: delivery/${name}\nSHA256: ${digest}`);
