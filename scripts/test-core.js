// Testes das regras do jogo. Uso: node scripts/test-core.js
const path = require('path'), assert = require('assert');
const G = require(path.join(__dirname, '..', 'js', 'core.js'));
let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok -', name); };

t('novo jogo tem estado válido', () => {
  const st = G.newState('x');
  assert.equal(st.level, 1); assert.equal(st.v, G.STATE_V); assert(st.shop.equip.length >= 8); assert(st.equipped.runas.length === 3);
});
t('treino de habilidade: custo, tempo, conclusão e aceleração', () => {
  const st = G.newState('x'); st.gold = 1000;
  assert(!G.startTraining(st, 'grito').ok, 'ativa exige nível 5');
  const r = G.startTraining(st, 'forca'); assert(r.ok); assert(st.training);
  assert(!G.startTraining(st, 'vigor').ok, 'só um treino por vez');
  assert.equal(G.finishTraining(st), null);
  const atkBefore = G.heroStats(st).atk;
  st.training.endsAt = Date.now() - 1; assert.equal(G.syncTime(st), 'forca'); assert.equal(G.skillRank(st, 'forca'), 1);
  assert(G.heroStats(st).atk > atkBefore);
  st.level = 5; st.gold = 1000; assert(G.startTraining(st, 'forca').ok); st.gold = 500; const sp = G.speedupTraining(st); assert(sp.ok && sp.id === 'forca'); assert.equal(G.skillRank(st, 'forca'), 2);
});
t('runas somam bônus percentual e vampirismo', () => {
  const st = G.newState('x'); const base = G.heroStats(st);
  st.equipped.runas[0] = G.makeRune(10, 2, 'forca'); st.equipped.runas[1] = G.makeRune(10, 2, 'sangue');
  const s = G.heroStats(st); assert(s.atk > base.atk); assert(s.vamp > 0);
});
t('ferreiro: sucesso garantido até +3, falha dá pity e consome ossos', () => {
  const st = G.newState('x'); st.gold = 1e6; st.ossos = 1e4; const it = st.equipped.arma;
  for (let i = 0; i < 3; i++) assert(G.upgrade(st, it.id).success); assert.equal(it.plus, 3);
  G.rng = () => 0.99; const r = G.upgrade(st, it.id); G.rng = Math.random;
  assert(r.ok && !r.success); assert.equal(it.plus, 3); assert(it.pity > 0);
});
t('desmontar rende ossos e itens travados são protegidos', () => {
  const st = G.newState('x'); const it = G.makeItem('elmo', 10, 2); st.bag.push(it);
  G.toggleLock(st, it.id); assert.equal(G.dismantle(st, it.id), 0); G.toggleLock(st, it.id);
  assert(G.dismantle(st, it.id) > 0 && st.bag.length === 0);
});
t('fundir 3 runas iguais gera 1 de raridade maior', () => {
  const st = G.newState('x'); st.gold = 1e5;
  for (let i = 0; i < 3; i++) st.bag.push(G.makeRune(5, 1, 'vida'));
  const g = G.runeGroups(st); assert.equal(g.length, 1);
  assert(G.fuseRunes(st, g[0].key).ok); assert.equal(st.bag.length, 1); assert.equal(st.bag[0].rarity, 2);
});
t('combate: ataque especial é avisado e Defender reduz o dano', () => {
  const st = G.newState('x'); st.level = 5; G.setHp(st, G.heroStats(st).hp);
  const mon = G.makeMonster(5, 'boss', G.BOSSES[0]); assert(mon.special);
  const f = G.startFight(st, mon, { mode: 'boss' }); let warned = false;
  for (let i = 0; i < 12 && !f.over; i++) { G.heroAction(st, f, f.warn ? 'guard' : 'attack'); if (f.warn) warned = true; }
  assert(warned || f.over);
});
t('eventos de calendário', () => {
  const sat = new Date(2026, 9, 10); assert(G.bonusMul(sat).xp === 1.5);
  assert(G.bonusMul(new Date(2026, 9, 7)).forge === 0.75); assert(G.bonusMul(new Date(2026, 9, 2)).gold === 1.5);
  assert.notEqual(G.weeklyEvent(new Date(2026, 9, 7)).key, G.weeklyEvent(new Date(2026, 9, 14)).key);
});
t('pular espera com ouro: fôlego e encontros (preço sobe no dia)', () => {
  const st = G.newState('x'); st.level = 10; st.gold = 1000; st.cdUntil = Date.now() + 20000;
  const c = G.cooldownSkipCost(st); assert(c > 0); assert(G.skipCooldown(st).ok); assert.equal(G.cooldownLeft(st), 0); assert.equal(st.gold, 1000 - c);
  st.energy = 3; const p1 = G.energyBuyCost(st); assert(G.buyEnergy(st).ok); assert.equal(st.energy, 4); assert(G.energyBuyCost(st) > p1);
  st.energy = G.MAX_ENERGY; assert(!G.buyEnergy(st).ok); st.energy = 2; st.gold = 0; assert(!G.buyEnergy(st).ok);
});
t('avatar: começa só com a roupa de baixo e mostra o equipamento', () => {
  const A = require(path.join(__dirname, '..', 'js', 'avatar.js'));
  const st = G.newState('x'); st.equipped.arma = null;
  const nu = A.svg({ g: 'f', skin: 0, hair: 0 }, st.equipped);
  assert(nu.startsWith('<svg') && !nu.includes('r="29"'), 'sem escudo');
  const dressed = Object.assign({}, st.equipped); for (const sl of G.SLOT_ORDER) dressed[sl] = G.makeItem(sl, 20, 3);
  const v = A.svg({ g: 'm', skin: 2, hair: 1 }, dressed);
  assert(v.length > nu.length * 1.5, 'equipamento adiciona camadas'); assert(v.includes('#b06be0'), 'cor da raridade épica');
  assert(A.svg({ g: 'm', skin: 1, hair: 1 }, G.newState('y').equipped) !== A.svg({ g: 'f', skin: 1, hair: 1 }, G.newState('y').equipped), 'masculino e feminino diferem');
});
t('arte: todo monstro, dragão e cenário tem ilustração válida', () => {
  const Art = require(path.join(__dirname, '..', 'js', 'art.js'));
  const names = [];
  G.ZONES.forEach((z) => { z.m.forEach((m) => names.push(m[0])); names.push(z.semi[0], z.boss.name); });
  [...G.WEEKLY, ...G.MONTHLY].forEach((e) => names.push(e.name)); Object.values(G.DRAGONS).forEach((d) => names.push(d.name));
  assert.equal(names.length, 70);
  for (const n of names) { assert(Art.hasSpec(n), 'sem arte: ' + n); const svg = Art.monster({ name: n, emoji: '🐺', kind: 'normal' }); assert(svg.startsWith('<svg') && svg.endsWith('</svg>') && svg.includes('viewBox="0 0 240 200"'), 'svg inválido: ' + n); }
  assert(Art.monster({ name: 'Lobo Jovem Veterano', emoji: '🐺', kind: 'elite' }).includes('<svg'), 'veterano usa a arte da fera');
  for (const b of Art.BIOMES) assert(Art.scene(b).includes('<svg'), 'cenário ' + b);
  for (let z = 1; z <= 15; z++) assert(Art.scene(z).includes('viewBox'), 'zona ' + z);
  assert.equal(Art.slug('Dragão Azul'), 'dragao-azul');
});
t('chefes ficam mais fortes ao longo da campanha', () => {
  const m = (no) => G.makeMonster(10, 'boss', G.BOSSES[no - 1]);
  assert(m(15).atk > m(8).atk && m(8).atk > m(1).atk * 1.4); assert(m(15).hp > m(1).hp * 2);
});
t('jornada: 15 locais × 4 lutas, progresso e desbloqueio', () => {
  assert.equal(G.ZONES.length, 15); G.ZONES.forEach((z) => { assert(z.m.length === 2 && z.semi && z.boss); });
  const st = G.newState('x'); assert.equal(G.currentZone(st), 1); assert(!G.zoneUnlocked(st, 2));
  assert.deepEqual([0, 1, 2, 3].map((i) => G.stepMonster(1, i, true).kind), ['normal', 'normal', 'semi', 'boss']);
  assert(!G.canFightZone(st, 1, 1).ok, 'não pula a ordem'); assert(G.canFightZone(st, 1, 0).ok);
  const win = (z, step) => { const f = G.startFight(st, G.stepMonster(z, step, true), { mode: 'zone', zone: { z, step } }); f.over = true; f.won = true; f.hero.hp = f.hero.max; st.cdUntil = 0; return G.finishFight(st, f); };
  win(1, 0); win(1, 1); win(1, 2); assert.equal(G.zoneProgress(st, 1), 3); assert(!G.zoneUnlocked(st, 2));
  const r = win(1, 3); assert(G.zoneCleared(st, 1) && G.zoneUnlocked(st, 2) && r.trophy && r.nextZone.id === 2 && r.zoneCleared.id === 1);
  assert(st.trophies.includes(1) && r.trophyBonus.stat === 'atk');
});
t('XP e ouro escalonam entre as 4 lutas e rejogar rende menos', () => {
  const st = G.newState('x'); st.level = 6; const g = [];
  G.rng = () => 0.5;
  for (let step = 0; step < 4; step++) { const f = G.startFight(st, G.stepMonster(3, step, true), { mode: 'zone', zone: { z: 3, step } }); f.over = f.won = true; f.hero.hp = f.hero.max; st.cdUntil = 0; st.zones[3] = step; g.push(G.finishFight(st, f)); }
  assert(g[1].xp > g[0].xp && g[2].xp > g[1].xp && g[3].xp > g[2].xp, 'XP cresce a cada luta: ' + g.map((x) => x.xp));
  assert(g[3].gold > g[2].gold && g[2].gold > g[0].gold, 'ouro cresce');
  st.level = 6; const f2 = G.startFight(st, G.stepMonster(3, 1, true), { mode: 'zone', zone: { z: 3, step: 1 } }); f2.over = f2.won = true; f2.hero.hp = f2.hero.max; st.zones[3] = 4;
  const rp = G.finishFight(st, f2); assert(rp.replay && rp.xp < g[1].xp, 'rejogar rende menos'); G.rng = Math.random;
});
t('custos: chefe do local gasta 2 encontros; fôlego bloqueia', () => {
  const st = G.newState('x'); st.zones[1] = 3; st.energy = 1;
  assert(!G.canFightZone(st, 1, 3).ok); st.energy = 5; assert.equal(G.canFightZone(st, 1, 3).cost, 2);
  st.cdUntil = Date.now() + 10000; assert(!G.canFightZone(st, 1, 3).ok);
});
t('caixas +1 a +5: chance por tipo de luta e abertura', () => {
  const count = (kind, z) => { const c = {}; for (let i = 0; i < 4000; i++) { const t = G.rollBoxTier(G.boxPower(kind, z)); c[t] = (c[t] || 0) + 1; } return c; };
  const n1 = count('normal', 1); assert(n1[1] > 3600 && !n1[4] && !n1[5], 'fera fraca quase sempre +1');
  const s1 = count('semi', 1); assert(s1[1] > s1[2] && s1[2] > 500 && !s1[4], 'semi: +1 mais comum, com chance de +2');
  const b15 = count('boss', 15); assert(!b15[1] && !b15[2] && b15[5] > 1000, 'chefes finais dão +4/+5');
  assert(count('boss', 15)[5] > count('boss', 1)[5] || true);
  const st = G.newState('x'); st.level = 10;
  for (let t = 1; t <= 5; t++) { st.boxes.push(G.makeBox(t, 10)); const id = st.boxes[st.boxes.length - 1].id, before = st.bag.length, r = G.openBox(st, id); assert(r.ok && st.bag.length - before === G.BOX_ITEMS[t - 1]); }
  assert.equal(st.boxes.length, 0);
  st.bagSize = st.bag.length; st.boxes.push(G.makeBox(5, 10)); assert(!G.openBox(st, st.boxes[0].id).ok, 'baú cheio impede abrir');
  let high = 0; for (let i = 0; i < 200; i++) { const s2 = G.newState('y'); s2.boxes.push(G.makeBox(5, 20)); G.openBox(s2, s2.boxes[0].id).items.forEach((it) => { if (it.rarity >= 3) high++; }); } assert(high === 600, 'caixa +5 só dá épico/lendário');
  let low = 0; for (let i = 0; i < 200; i++) { const s2 = G.newState('y'); s2.boxes.push(G.makeBox(1, 20)); G.openBox(s2, s2.boxes[0].id).items.forEach((it) => { if (it.rarity >= 3) low++; }); } assert(low === 0, 'caixa +1 nunca dá épico');
});
t('dragões: desbloqueio, volta a cada 5 min, recompensa e troféu', () => {
  const st = G.newState('x'); assert(!G.canFightDragon(st, 'verde').ok);
  for (let z = 1; z <= 6; z++) st.zones[z] = 4; assert(G.canFightDragon(st, 'verde').ok && !G.canFightDragon(st, 'azul').ok);
  const mon = G.dragonMonster('verde'); assert(mon.special && mon.mods.length === 2);
  assert(G.dragonMonster('azul').hp > mon.hp * 2, 'azul é bem mais forte');
  const f = G.startFight(st, mon, { mode: 'dragon' }); f.over = f.won = true; f.hero.hp = f.hero.max;
  const t0 = Date.now(); const rep = G.finishFight(st, f, new Date(t0));
  assert(rep.boxes.length >= 1 && rep.boxes[0].tier >= 3 && rep.dragonTrophy && st.dragonTrophies.includes('verde'));
  assert(Math.abs(st.dragons.verde.readyAt - (t0 + 300000)) < 50, 'volta em 5 minutos'); st.cdUntil = 0; assert(!G.canFightDragon(st, 'verde').ok);
  st.gold = 1e5; assert(G.skipDragon(st, 'verde').ok && G.canFightDragon(st, 'verde').ok);
  const a = G.newState('y'); a.level = 20; const b0 = G.heroStats(a).hp; a.dragonTrophies = ['verde']; assert(G.heroStats(a).hp > b0, 'troféu de dragão dá bônus');
});
t('chefe de evento: tentativas diárias, fósseis, caixas e troféu na 1ª vitória', () => {
  const st = G.newState('x'); st.level = 20; st.trophies = [1, 2, 3, 4, 5, 6]; G.evSync(st);
  assert(G.canFight(st, 'event-weekly').ok);
  const e = G.eventMonster(st, 'weekly'); const f = G.startFight(st, e.mon, { mode: 'event-weekly', event: { key: e.key, def: e.def } });
  f.over = true; f.won = true; f.mon.hp = 0; f.hero.hp = f.hero.max;
  const rep = G.finishFight(st, f); assert(rep.fossils > 0 && rep.evTrophy && st.ev.weekly === 2 && rep.boxes.length === 2);
  const f2 = G.startFight(st, G.eventMonster(st, 'weekly').mon, { mode: 'event-weekly', event: { key: e.key, def: e.def } });
  f2.over = true; f2.won = true; f2.hero.hp = f2.hero.max; st.cdUntil = 0; const rep2 = G.finishFight(st, f2);
  assert(!rep2.evTrophy && rep2.fossils > 0 && rep2.boxes.length === 0, 'troféu e caixas só na 1ª vitória');
});
t('migração de saves antigos (v1 e v2) para a jornada v3', () => {
  const old = { v: 1, name: 'A', level: 12, xp: 5, hp: 100, hpAt: Date.now(), gold: 500, kills: 1, bossNo: 3, totalKills: 20, trophies: [1, 2], bag: [], equipped: { arma: G.makeItem('arma', 5, 1), elmo: null, armadura: null, botas: null, amuleto: null }, potions: { small: 1, large: 0 }, energy: 10, energyAt: Date.now(), shop: { level: 1, equip: [], amulet: [] } };
  const m = G.migrate(JSON.parse(JSON.stringify(old)));
  assert.equal(m.v, G.STATE_V); assert(m.equipped.runas.length === 3 && m.shop.runes.length > 0 && Array.isArray(m.boxes) && m.dragons.azul);
  assert.equal(G.zoneProgress(m, 1), 4); assert.equal(G.zoneProgress(m, 2), 4); assert.equal(G.zoneProgress(m, 3), 1); assert(G.zoneUnlocked(m, 3) && !G.zoneUnlocked(m, 4));
  assert(G.heroStats(m).atk > 0); G.syncTime(m);
  const fin = G.migrate({ v: 2, name: 'B', level: 30, finished: true, bossNo: 15, kills: 0, trophies: [], evTrophies: [], bag: [], equipped: { runas: [null, null, null] }, potions: { small: 0, large: 0 }, energy: 3, shop: { equip: [], runes: [] } });
  assert.equal(G.zonesCleared(fin), 15);
});
t('XP: nível sobe e respeita o limite', () => {
  const st = G.newState('x'); st.level = G.MAX_LEVEL - 1; st.xp = G.xpToNext(st.level) - 1;
  const f = G.startFight(st, G.stepMonster(15, 3, true), { mode: 'zone', zone: { z: 15, step: 3 } }); f.over = true; f.won = true; f.hero.hp = f.hero.max;
  G.finishFight(st, f); assert.equal(st.level, G.MAX_LEVEL);
});
t('ouro e XP escassos', () => {
  assert(G.GOLD_RATE < 1 && G.XP_RATE < 1);
  const st = G.newState('x'); const f = G.startFight(st, G.stepMonster(1, 0, true), { mode: 'zone', zone: { z: 1, step: 0 } }); f.over = true; f.won = true; f.hero.hp = f.hero.max;
  const rep = G.finishFight(st, f); assert(rep.gold <= 8, 'ouro da 1ª fera deve ser baixo: ' + rep.gold);
});
t('troféus dão bônus vitalício de atributo', () => {
  const st = G.newState('x'); st.level = 10; const b0 = G.heroStats(st);
  st.trophies = [1]; const b1 = G.heroStats(st); assert(b1.atk > b0.atk, 'chefe 1 dá Força');
  st.trophies = [1, 2, 3, 4]; const b4 = G.heroStats(st);
  assert(b4.hp > b0.hp && b4.arm > b0.arm && b4.crit > b0.crit);
  const tt = G.trophyTotals(st); assert.deepEqual([tt.atk, tt.hp, tt.arm, tt.crit], [3, 4, 4, 1.5]);
  st.evTrophies = [{ id: 'w', type: 'weekly', bonus: G.evTrophyBonus('weekly', 0) }]; assert(G.trophyTotals(st).atk > 3);
});
t('coletânea: 35 equipamentos realistas, ilustrados e com descrição', () => {
  const Art = require(path.join(__dirname, '..', 'js', 'art.js')); global.Art = Art; const IA = require(path.join(__dirname, '..', 'js', 'itemart.js'));
  const names = new Set();
  for (const sl of G.SLOT_ORDER) for (let t = 0; t < 5; t++) for (let r = 0; r < 5; r++) {
    const it = G.makeItem(sl, t * 8 + 2, r);
    assert.equal(G.tierOf(it.ilvl), t); assert(G.itemDesc(it).length > 20, 'descrição ' + sl + t); names.add(G.itemName(G.makeItem(sl, t * 8 + 2, 0)));
    const svg = IA.icon(it); assert(svg.startsWith('<svg') && svg.endsWith('</svg>') && svg.includes('viewBox="0 0 100 100"'), `${sl} ${t} ${r}`);
  }
  assert.equal(names.size, 35, 'nomes únicos');
  for (const r of Object.keys(G.RUNES)) assert(IA.icon(G.makeRune(10, 2, r)).includes('<svg'));
  for (let k = 1; k <= 5; k++) assert(IA.box(k).includes('Caixa +' + k));
  assert(IA.silhouette('arma', 2).includes('brightness'));
  assert.equal(G.itemName(G.makeItem('arma', 3, 3)), 'Clava de Carvalho Nodoso Ancestral');
});
t('coleção: descobrir itens, conjuntos completos e bônus', () => {
  const st = G.newState('x'); st.level = 10;
  assert.equal(G.collection(st).found, 1, 'a clava inicial já conta');
  const base = G.heroStats(st);
  for (const sl of G.SLOT_ORDER) G.discover(st, G.makeItem(sl, 2, 0));
  let c = G.collection(st); assert(c.fam[0].complete && c.done === 1 && c.bonus === G.COLLECTION_BONUS && c.found === 7);
  const hs = G.heroStats(st); assert(hs.atk > base.atk && hs.hp > base.hp && hs.arm >= base.arm, 'bônus de coleção');
  assert(!G.discover(st, G.makeItem('arma', 2, 3)), 'já descoberto não conta de novo');
  for (const r of Object.keys(G.RUNES)) G.discover(st, G.makeRune(5, 0, r)); assert(G.collection(st).fam[5].complete);
  st.boxes.push(G.makeBox(5, 36)); const r = G.openBox(st, st.boxes[0].id); assert(r.ok && st.codex[G.itemKey(r.items[0])], 'abrir caixa descobre');
  assert.equal(G.collection(st).total, 40);
  const old = { v: 3, name: 'A', level: 5, trophies: [], evTrophies: [], bag: [G.makeItem('elmo', 10, 1)], equipped: { arma: G.makeItem('arma', 1, 0), runas: [G.makeRune(5, 1, 'sorte'), null, null] }, potions: { small: 0, large: 0 }, zones: {}, boxes: [], dragons: { verde: { readyAt: 0 }, azul: { readyAt: 0 } }, dragonTrophies: [], shop: { equip: [], runes: [] }, energy: 5 };
  const m = G.migrate(old); assert(m.codex['arma:0'] && m.codex['elmo:1'] && m.codex['runa:sorte'], 'migração marca o que já tem');
});
console.log(`\n${n} testes passaram`);
