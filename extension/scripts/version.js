const path = require('path');
const fs = require('fs');

console.log('Running version tagging..');

try {
  const version = process.argv[2];
  console.log('detected version:', version);

  const manifestPath = path.join(__dirname, '../dist/manifest.json');
  let manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  Object.assign(manifest, {version});
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
} catch (e) {
  console.error('version tagging error:', e);
}
