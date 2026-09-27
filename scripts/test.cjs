const {readdirSync} = require('node:fs');
const {resolve} = require('node:path');
const {spawnSync} = require('node:child_process');
const root = resolve(__dirname, '..');
const kind = process.argv[2];
const files = readdirSync(root).filter(file => kind === 'unit' ? file.endsWith('.test.cjs') : kind === 'browser' ? file.endsWith('.browser-test.cjs') : /\.(test|browser-test)\.cjs$/.test(file)).sort();
for (const file of files) {
  const result = spawnSync(process.execPath, ['--test', file], {cwd: root, stdio: 'inherit'});
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
