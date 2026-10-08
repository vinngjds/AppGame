// Gera docs/arte-prompts.md: um prompt por monstro e por cenário, para gerar a arte com uma IA de imagem ou passar a um artista.
const fs = require('fs'), path = require('path');
const G = require('../js/core.js'), Art = require('../js/art.js');
const STYLE = 'dark fantasy stone-age (prehistoric) bestiary illustration, hand-painted digital art, dramatic rim lighting, rich textures, moody, front-facing bust portrait, centered, simple dark background, no text, no watermark';
const MOD = { feroz: 'ferocious, snarling', veloz: 'lean and fast, agile', couracado: 'heavily armored, thick plated hide', venenoso: 'venomous, toxic green drool', regenerador: 'scarred but regenerating, glowing healing veins', esmagador: 'brutish and massive' };
const KIND = { normal: 'wild beast', semi: 'alpha beast, larger and scarred, with bone trophies', boss: 'legendary boss creature, imposing, epic scale', event: 'legendary event boss, glowing aura', dragon: 'mighty dragon, epic, detailed scales, horns and wings' };
const rows = [], seen = new Set();
const add = (name, kind, mods, extra) => { if (seen.has(name)) return; seen.add(name); rows.push({ name, slug: Art.slug(name), prompt: `${name}${extra ? ' (' + extra + ')' : ''}, ${KIND[kind]}, ${mods.map((m) => MOD[m]).join(', ')}, ${STYLE}` }); };
G.ZONES.forEach((z) => { z.m.forEach((m) => add(m[0], 'normal', [m[2]], z.name)); add(z.semi[0], 'semi', [z.semi[2]], z.name); add(z.boss.name, 'boss', z.boss.mods, z.name); });
[...G.WEEKLY, ...G.MONTHLY].forEach((e) => add(e.name, 'event', e.mods, 'event boss'));
add('Dragão Verde', 'dragon', G.DRAGONS.verde.mods, 'emerald green dragon, forest glade'); add('Dragão Azul', 'dragon', G.DRAGONS.azul.mods, 'glacial blue dragon, frost crystals, ice cavern');
const SCENE = { cave: 'dark glowing cave with stalactites', forest: 'dense primeval forest, misty', lake: 'misty lake shore at dawn', rocks: 'rocky highlands, wind-swept crags', plain: 'golden savanna plain with tall grass', jungle: 'humid foggy jungle with vines', desert: 'desert dunes with giant bones', tundra: 'frozen tundra, snow peaks', valley: 'valley of ferns and prehistoric plants', coast: 'rocky seashore with crashing waves', peak: 'high mountain summit above clouds', cursed: 'cursed twisted forest, purple fog, moon', volcano: 'volcanic lands, rivers of lava, ember sky', ruins: 'ancient stone ruins with broken pillars', lair: 'tyrant lair, giant bones, fire glow', glade: 'emerald forest glade with glowing light', ice: 'ice cavern with blue crystals' };
let md = `# Prompts de arte — Era da Pedra\n\nGerado por \`node scripts/art-prompts.js\`. Veja \`docs/ARTE.md\` para saber onde colocar as imagens.\n\n**Estilo comum:** ${STYLE}\n\n## Monstros (${rows.length}) — 1024×1024, fundo simples escuro (ou PNG transparente)\n\n| Arquivo | Prompt |\n|---|---|\n`;
rows.forEach((r) => { md += `| \`art/monsters/${r.slug}.png\` | ${r.prompt.replace(/\|/g, '/')} |\n`; });
md += `\n## Cenários (${Art.BIOMES.length}) — 1200×760, sem personagens\n\n| Arquivo | Prompt |\n|---|---|\n`;
Art.BIOMES.forEach((b) => { md += `| \`art/scenes/${b}.jpg\` | ${SCENE[b]}, stone-age fantasy, painterly environment concept art, wide landscape, no characters, no text, atmospheric depth |\n`; });
fs.writeFileSync(path.join(__dirname, '..', 'docs', 'arte-prompts.md'), md);
console.log(`docs/arte-prompts.md: ${rows.length} monstros + ${Art.BIOMES.length} cenários`);
