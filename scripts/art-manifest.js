// Gera art/manifest.json a partir das imagens que existirem em art/monsters e art/scenes.
// Nome do arquivo = "slug" do nome do monstro (ex.: "Lobo Jovem" -> lobo-jovem.png) ou do bioma (ex.: forest.jpg).
const fs = require('fs'), path = require('path');
const G = require('../js/core.js'), Art = require('../js/art.js');
const root = path.join(__dirname, '..', 'art'), EXT = ['png', 'webp', 'jpg', 'jpeg', 'avif'];
const find = (dir, slug) => { for (const e of EXT) if (fs.existsSync(path.join(root, dir, `${slug}.${e}`))) return `art/${dir}/${slug}.${e}`; return null; };
const names = new Set();
G.ZONES.forEach((z) => { z.m.forEach((m) => names.add(m[0])); names.add(z.semi[0]); names.add(z.boss.name); });
[...G.WEEKLY, ...G.MONTHLY].forEach((e) => names.add(e.name)); Object.values(G.DRAGONS).forEach((d) => names.add(d.name));
const manifest = { monsters: {}, scenes: {}, items: {} };
for (const n of names) { const f = find('monsters', Art.slug(n)); if (f) manifest.monsters[n] = f; }
for (const b of Art.BIOMES) { const f = find('scenes', b); if (f) manifest.scenes[b] = f; }
for (const sl of G.SLOT_ORDER) for (let t = 0; t < 5; t++) { const f = find('items', `${sl}-${t}`); if (f) manifest.items[`${sl}-${t}`] = f; }
for (const r of Object.keys(G.RUNES)) { const f = find('items', `runa-${r}`); if (f) manifest.items[`runa-${r}`] = f; }
fs.mkdirSync(root, { recursive: true });
fs.writeFileSync(path.join(root, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`manifest.json: ${Object.keys(manifest.monsters).length}/${names.size} monstros, ${Object.keys(manifest.scenes).length}/${Art.BIOMES.length} cenários e ${Object.keys(manifest.items).length}/40 itens com imagem.`);
