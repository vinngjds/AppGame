// Depois de `npm run cap:add:android`: acrescenta ao AndroidManifest o ID do app AdMob e a permissão de compras.
// Uso: ADMOB_APP_ID=ca-app-pub-XXXX~YYYY npm run android:setup   (sem a variável, usa o ID de TESTE do Google)
const fs = require('fs'), path = require('path');
const TEST_APP_ID = 'ca-app-pub-3940256099942544~3347511713';

function patchManifest(xml, appId) {
  let out = xml, changed = [];
  if (!/com\.google\.android\.gms\.ads\.APPLICATION_ID/.test(out)) {
    out = out.replace(/<application\b([^>]*)>/, (m) => `${m}\n        <meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="${appId}"/>`);
    changed.push('ID do app AdMob');
  } else {
    out = out.replace(/(com\.google\.android\.gms\.ads\.APPLICATION_ID"\s+android:value=")[^"]*(")/, `$1${appId}$2`);
    changed.push('ID do app AdMob (atualizado)');
  }
  if (!/com\.android\.vending\.BILLING/.test(out)) {
    out = out.replace(/<\/manifest>/, '    <uses-permission android:name="com.android.vending.BILLING" />\n</manifest>');
    changed.push('permissão de compras');
  }
  return { xml: out, changed };
}

if (require.main === module) {
  const file = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
  if (!fs.existsSync(file)) { console.error('Não achei', file, '— rode antes: npm run cap:add:android'); process.exit(1); }
  const appId = process.env.ADMOB_APP_ID || TEST_APP_ID;
  const r = patchManifest(fs.readFileSync(file, 'utf8'), appId);
  fs.writeFileSync(file, r.xml);
  console.log('AndroidManifest atualizado:', r.changed.join(', '));
  if (appId === TEST_APP_ID) console.log('⚠️  Usando o ID de TESTE do AdMob. Defina ADMOB_APP_ID com o seu antes de publicar.');
}
module.exports = { patchManifest, TEST_APP_ID };
