// Copia apenas os arquivos do jogo para www/ (pasta usada pelo Capacitor).
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), out = path.join(root, 'www');
const items = ['index.html', 'manifest.json', 'sw.js', 'privacidade.html', 'css', 'js', 'icons'].concat(fs.existsSync(path.join(root, 'art')) ? ['art'] : []);
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const i of items) fs.cpSync(path.join(root, i), path.join(out, i), { recursive: true });
console.log('www/ gerado com:', items.join(', '));
