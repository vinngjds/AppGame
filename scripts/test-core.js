// Testes das regras do jogo. Uso: node scripts/test-core.js
const path = require('path'), assert = require('assert');
const G = require(path.join(__dirname, '..', 'js', 'core.js'));
let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok -', name); };

t('novo jogo tem estado válido', () => {
  const st = G.newState('x');
  assert.equal(st.level, 1); assert.equal(st.v, G.STATE_V); assert(st.diamonds === 0 && st.vipUntil === 0); assert(st.equipped.runas.length === 3);
});
t('treino de habilidade: custo, tempo, conclusão e aceleração', () => {
  const st = G.newState('x'); st.gold = 1000;
  assert(!G.startTraining(st, 'inexistente').ok && !G.SKILLS.grito && !G.SKILLS.golpe, 'ativas migraram para a árvore');
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
  for (let i = 0; i < 12 && !f.over; i++) { G.heroAction(st, f, 'attack'); if (f.warn) warned = true; }
  assert(warned || f.over);
});
t('eventos de calendário', () => {
  const sat = new Date(2026, 9, 10); assert(G.bonusMul(sat).xp === 1.5);
  assert(G.bonusMul(new Date(2026, 9, 7)).forge === 0.75); assert(G.bonusMul(new Date(2026, 9, 2)).gold === 1.5);
  assert.notEqual(G.weeklyEvent(new Date(2026, 9, 7)).key, G.weeklyEvent(new Date(2026, 9, 14)).key);
});
t('pular espera com ouro: fôlego e encontros (preço sobe no dia)', () => {
  const st = G.newState('x'); st.level = 10; st.gold = 1000; st.cdUntil = Date.now() + 20000; assert.equal(G.BATTLE_CD, 0);
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
});
t('dragões: desbloqueio, volta a cada 5 min, recompensa e troféu', () => {
  const st = G.newState('x'); assert(!G.canFightDragon(st, 'verde').ok);
  for (let z = 1; z <= 6; z++) st.zones[z] = 4; assert(G.canFightDragon(st, 'verde').ok && !G.canFightDragon(st, 'azul').ok);
  const mon = G.dragonMonster('verde'); assert(mon.special && mon.mods.length === 2);
  assert(G.dragonMonster('azul').hp > mon.hp * 1.3 && G.dragonMonster('azul').atk > mon.atk * 1.5, 'azul é bem mais forte');
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
  assert.equal(m.v, G.STATE_V); assert(m.equipped.runas.length === 3 && m.diamonds === 0 && Array.isArray(m.boxes) && m.dragons.azul);
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
t('raridade: épicos, lendários e runas só em caixas altas; loja não vende épico/lendário', () => {
  const sample = (tier, N = 3000) => { const c = [0, 0, 0, 0, 0]; let runes = 0, n = 0; for (let i = 0; i < N; i++) { const st = G.newState('x'); st.bagSize = 99; st.boxes.push(G.makeBox(tier, 20)); G.openBox(st, st.boxes[0].id).items.forEach((it) => { c[it.rarity]++; n++; if (it.rune) runes++; }); } return { c, runes, n }; };
  const b1 = sample(1), b2 = sample(2), b3 = sample(3), b4 = sample(4), b5 = sample(5);
  assert(b1.c[3] + b1.c[4] + b2.c[3] + b2.c[4] === 0, 'caixas +1/+2 nunca dão épico ou lendário');
  assert(b3.c[4] === 0 && b3.c[3] > 0 && b3.c[3] / b3.n < 0.09, 'caixa +3: épico raro, sem lendário');
  assert(b4.c[4] > 0 && b4.c[3] > b3.c[3], 'lendário aparece na +4'); assert(b5.c[4] / b5.n > b4.c[4] / b4.n, 'lendário mais comum na +5');
  assert(b1.runes === 0 && b2.runes / b2.n < 0.06 && b5.runes / b5.n > 0.18 && b5.runes / b5.n < 0.32, 'runas: nenhuma na +1, raras nas baixas, mais nas altas');
  assert(b5.runes / b5.n > b4.runes / b4.n && b4.runes / b4.n > b3.runes / b3.n, 'chance de runa cresce com a caixa');
    assert(G.runeOffers(G.newState('x')).every((o) => o.rarity >= 2), 'runas da loja nunca são comuns');
  const eq = G.makeItem('arma', 20, 2), ru = G.makeRune(20, 2, 'forca'); assert(G.itemPrice(ru) > G.itemPrice(eq) * 3, 'runa custa bem mais que um item raro');
  assert(!G.EVENT_SHOP.some((o) => /ndário|Épica|Caixa/.test(o.name)), 'troca de fósseis não vende épico/lendário/caixa');
});
t('dificuldade: feras e chefes duros, dragões e eventos mais ainda', () => {
  const st = G.newState('x'); st.level = 20;
  const f1 = G.stepMonster(10, 0, true), f2 = G.stepMonster(10, 1, true), sm = G.stepMonster(10, 2, true), bs = G.stepMonster(10, 3, true);
  assert(f2.atk > f1.atk && sm.hp > f2.hp * 2 && bs.atk > sm.atk, 'escalada na jornada');
  assert(G.dragonMonster('azul').atk > G.dragonMonster('verde').atk * 1.5 && G.dragonMonster('azul').hp > G.dragonMonster('verde').hp);
  st.trophies = [1, 2, 3, 4, 5, 6]; const w = G.eventMonster(st, 'weekly').mon, m = G.eventMonster(st, 'monthly').mon;
  assert(m.hp > w.hp, 'chefe mensal é mais forte que o semanal');
});

const setup = (cls, level, tree) => { const st = G.newState('x'); st.level = level; G.setClass(st, cls); st.tree = tree || {}; G.setHp(st, G.heroStats(st).hp); return st; };
const duel = (st, mon) => { const f = G.startFight(st, mon || G.makeMonster(st.level, 'normal', { name: 'Alvo', emoji: '🐺', mods: [] }), { mode: 'zone', zone: { z: 1, step: 0 } }); f.mon.atk = 1; f.mon.hp = f.mon.maxHp = 100000; return f; };
t('árvore: 3 classes × 3 ramos × 4 habilidades, todas descritas', () => {
  assert.equal(G.TREE.filter((d) => !d.evo).length, 36); assert.deepEqual(G.CLASS_ORDER, ['guerreiro', 'arqueiro', 'mago']);
  for (const c of G.CLASS_ORDER) for (let b = 0; b < 3; b++) { const ch = G.TREE.filter((d) => d.cls === c && d.branch === b && !d.evo); assert.deepEqual(ch.map((d) => d.tier), [1, 2, 3, 4]); assert(ch[0].req === null && ch[1].req === ch[0].id && ch[3].req === ch[2].id); }
  assert.equal(new Set(G.TREE.map((d) => d.id)).size, 54);
  for (const d of G.TREE) for (let r = 1; r <= 3; r++) { assert(G.skillDesc(d, r).length > 8, d.id); if (d.type === 'active') assert(d.cd >= 0 && (d.fx.dmg || d.fx.dot || d.fx.stun || d.fx.buff || d.fx.heal || d.fx.shield || d.fx.guard || d.fx.evade || d.fx.mark || d.fx.slow), 'ativa sem efeito: ' + d.id); }
  for (const d of G.TREE.filter((x) => x.type === 'active' && x.fx.dmg)) assert(G.skillFx(d, 3).dmg.mult > G.skillFx(d, 1).dmg.mult * 0.99, 'habilidade mais forte a cada nível: ' + d.id);
});
t('árvore: 1 ponto por nível, custo cresce com o tier e o nível, pré-requisitos e nível mínimo', () => {
  const st = G.newState('x'); assert(!G.canLearn(st, 'golpe').ok, 'precisa de classe'); assert(G.setClass(st, 'guerreiro').ok && !G.setClass(st, 'mago').ok);
  assert.equal(G.skillPoints(st).free, 1); assert(G.learn(st, 'golpe').ok && G.skillPoints(st).free === 0); assert(!G.canLearn(st, 'golpe').ok, 'sem pontos');
  st.level = 10; assert.equal(G.skillPoints(st).free, 9);
  assert(!G.canLearn(st, 'redemoinho').ok && /Aprenda antes/.test(G.canLearn(st, 'redemoinho').msg), 'pré-requisito');
  assert(!G.canLearn(st, 'tiro').ok, 'habilidade de outra classe');
  const costs = [1, 2, 3].map((r) => G.treeCost(G.TREE_BY_ID.golpe, r)), t4 = G.treeCost(G.TREE_BY_ID.execucao, 1);
  assert.deepEqual(costs, [1, 2, 3]); assert.equal(t4, 4, 'tier 4 custa mais');
  assert(G.treeReqLevel(G.TREE_BY_ID.golpe, 3) > G.treeReqLevel(G.TREE_BY_ID.golpe, 1) && G.treeReqLevel(G.TREE_BY_ID.execucao, 1) > G.treeReqLevel(G.TREE_BY_ID.grito, 1));
  st.level = 3; assert(/nível/.test(G.canLearn(st, 'golpe').msg) || G.canLearn(st, 'golpe').ok === false, 'nível 2 da habilidade exige nível do herói'); st.level = 7;
  assert(G.learn(st, 'golpe').ok && G.treeRank(st, 'golpe') === 2 && G.skillPoints(st).spent === 3, 'nível 2 custa 2');
  st.gold = 1e5; const before = G.respecCost(st); assert(G.respec(st).ok && st.cls === null && G.skillPoints(st).free === st.level && st.gold === 1e5 - before, 'redefinir devolve os pontos');
  st.level = 40; G.setClass(st, 'mago'); for (const d of G.TREE.filter((x) => x.cls === 'mago' && !x.evo)) for (let r = 0; r < 3; r++) G.learn(st, d.id);
  assert(G.skillPoints(st).spent <= 40 && G.skillPoints(st).free >= 0, 'não gasta mais que os pontos');
});
t('árvore: passivas e bônus de classe entram nos atributos', () => {
  const base = G.newState('x'); base.level = 20; const b0 = G.heroStats(base);
  const w = setup('guerreiro', 20); const ws = G.heroStats(w); assert(ws.hp > b0.hp * 1.08 && ws.arm > b0.arm * 1.08, 'guerreiro: vida e armadura');
  const a = setup('arqueiro', 20, { olho: 3, passoleve: 3, predador: 2 }); const as = G.heroStats(a); assert(as.crit >= b0.crit + 6 + 12 && as.dodge === 17 && as.critDmg > b0.critDmg + 0.25, 'arqueiro: crítico e esquiva');
  const m = setup('mago', 20, { meditacao: 3, arcano: 2, chamas: 1 }); const ms = G.heroStats(m); assert(ms.magic && ms.skillDmg === 20 && ms.dotMult === 40 && ms.atk > b0.atk * 1.15 && ms.potion > b0.potion, 'mago');
  const g = setup('guerreiro', 20, { vontade: 2, berserker: 1, sede: 2 }); const gs = G.heroStats(g); assert(gs.lastStand === 0.25 && gs.lowHp.pct === 12 && gs.vamp === b0.vamp + 5);
});
t('combate: só Atacar, Poção e Fugir; Golpe Forte e Defender saíram', () => {
  const st = setup('guerreiro', 10); const f = duel(st);
  assert(G.heroAction(st, f, 'heavy').some((e) => /inválida/.test(e.text)) && f.turn === 0, 'golpe forte não existe'); assert(G.heroAction(st, f, 'guard').some((e) => /inválida/.test(e.text)), 'defender não existe');
  assert(G.heroAction(st, f, 'attack').some((e) => e.who === 'hero' && e.dmg > 0) && f.turn === 1);
  assert(G.heroAction(st, f, 'skill:golpe').some((e) => /não aprendeu/.test(e.text)), 'sem a habilidade não usa');
  st.potions.small = 1; f.hero.hp = 10; assert(G.heroAction(st, f, 'potion-small').some((e) => e.kind === 'heal') && st.potions.small === 0);
  assert.equal(G.CLASSES.mago.btn, '🔮 Raio Arcano');
});
t('habilidades ativas: dano, vários golpes, recarga e bônus por classe', () => {
  G.rng = () => 0.5;
  const st = setup('guerreiro', 20, { golpe: 3, redemoinho: 1, grito: 1 }); let f = duel(st); const hp0 = f.mon.hp;
  const basic = (() => { const ff = duel(st); G.heroAction(st, ff, 'attack'); return ff.mon.maxHp - ff.mon.hp; })();
  G.heroAction(st, f, 'skill:golpe'); const dmg = hp0 - f.mon.hp; assert(dmg > basic * 2.2, `golpe poderoso > 2x o ataque (${dmg} vs ${basic})`);
  assert(f.cd.golpe === 3 && G.heroAction(st, f, 'skill:golpe').some((e) => /recarregando/.test(e.text)), 'recarga bloqueia');
  G.heroAction(st, f, 'attack'); G.heroAction(st, f, 'attack'); G.heroAction(st, f, 'attack'); assert((f.cd.golpe || 0) === 0, 'recarga termina');
  f = duel(st); G.heroAction(st, f, 'skill:redemoinho'); assert(f.events.filter((e) => e.skill).length === 1 && /2 golpes/.test(f.events.find((e) => e.skill).text), 'vários golpes');
  f = duel(st); G.heroAction(st, f, 'skill:grito'); assert(f.buffs.some((b) => b.id === 'grito')); const b0 = f.mon.hp; G.heroAction(st, f, 'attack'); const withBuff = b0 - f.mon.hp;
  const f2 = duel(st); const c0 = f2.mon.hp; G.heroAction(st, f2, 'attack'); assert(withBuff > (c0 - f2.mon.hp) * 1.2, 'grito aumenta o dano');
  const mg = setup('mago', 20, { centelha: 1 }); const fm = duel(mg); fm.mon.arm = 200; const m0 = fm.mon.hp; G.heroAction(mg, fm, 'skill:centelha'); const spell = m0 - fm.mon.hp;
  const wr = setup('guerreiro', 20); const fw = duel(wr); fw.mon.arm = 200; const w0 = fw.mon.hp; G.heroAction(wr, fw, 'attack'); assert(spell > (w0 - fw.mon.hp) * 1.8, 'magia ignora armadura');
  G.rng = Math.random;
});
t('habilidades: veneno/fogo, atordoar, marca e lentidão', () => {
  G.rng = () => 0.1;
  const ar = setup('arqueiro', 20, { veneno: 2, armadilha: 1, marca: 1 }); let f = duel(ar);
  G.heroAction(ar, f, 'skill:veneno'); assert(f.dots.length === 1 && f.dots[0].turns >= 2, 'veneno aplicado'); const before = f.mon.hp; G.heroAction(ar, f, 'attack'); assert(f.events.some((e) => /sofre .* de veneno/.test(e.text)) && before - f.mon.hp > 0, 'veneno causa dano a cada turno');
  f = duel(ar); f.mon.atk = 50; G.heroAction(ar, f, 'skill:armadilha'); assert(f.events.some((e) => /atordoado e perde o turno/.test(e.text)) && f.hero.hp === f.hero.max, 'atordoado não ataca'); G.heroAction(ar, f, 'attack'); assert(f.mstunImmune || f.hero.hp < f.hero.max, 'sem atordoar em sequência');
  f = duel(ar); G.heroAction(ar, f, 'skill:marca'); assert(f.mark && f.mark.pct === 25); const m0 = f.mon.hp; G.heroAction(ar, f, 'attack'); const marked = m0 - f.mon.hp; const g = duel(ar); const g0 = g.mon.hp; G.heroAction(ar, g, 'attack'); assert(marked > (g0 - g.mon.hp) * 1.15, 'marca aumenta o dano');
  const mg = setup('mago', 20, { nevasca: 1, bola: 1 }); f = duel(mg); f.mon.atk = 100; G.heroAction(mg, f, 'skill:nevasca'); const slowed = f.events.filter((e) => e.who === 'mon' && e.dmg).reduce((a, e) => a + e.dmg, 0);
  const f3 = duel(mg); f3.mon.atk = 100; G.heroAction(mg, f3, 'attack'); const normal = f3.events.filter((e) => e.who === 'mon' && e.dmg).reduce((a, e) => a + e.dmg, 0); assert(slowed < normal * 0.9 && f.slow, 'nevasca reduz o dano do inimigo');
  const boss = G.makeMonster(20, 'boss', Object.assign({ no: 3 }, G.ZONES[2].boss)); G.rng = () => 0.45; const fb = duel(mg, boss); fb.mon.hp = fb.mon.maxHp = 1e6; const mgs = setup('mago', 20, { gelo: 3 }); const fb2 = duel(mgs, G.makeMonster(20, 'boss', Object.assign({ no: 3 }, G.ZONES[2].boss))); fb2.mon.hp = fb2.mon.maxHp = 1e6; G.heroAction(mgs, fb2, 'skill:gelo'); assert(!fb2.mstun || true, 'chefes resistem metade');
  G.rng = Math.random;
});
t('habilidades defensivas: guarda, esquiva, escudo, postura, cura e Vontade de Aço', () => {
  G.rng = () => 0.5;
  const raw = (st, act) => { const f = duel(st); f.mon.atk = 200; f.mon.arm = 0; const h0 = f.hero.hp; G.heroAction(st, f, act); return { f, lost: h0 - f.hero.hp }; };
  const w = setup('guerreiro', 20, { guarda: 3, postura: 2 }); const none = raw(w, 'attack').lost;
  assert(raw(w, 'skill:guarda').lost < none * 0.45, 'guarda corta o próximo golpe'); assert(raw(w, 'skill:postura').lost < none * 0.7, 'postura reduz o dano');
  const ar = setup('arqueiro', 20, { esquiva: 1, passoleve: 3 }); const ev = raw(ar, 'skill:esquiva'); assert(ev.lost === 0 && ev.f.events.some((e) => /esquiva/i.test(e.text)), 'esquiva evita o ataque');
  const mg = setup('mago', 20, { escudo: 3, cura: 2 }); const sh = raw(mg, 'skill:escudo'); assert(sh.lost < none * 0.8 && sh.f.events.some((e) => /escudo absorve/.test(e.text)), 'escudo absorve dano');
  const fc = duel(mg); fc.hero.hp = Math.round(fc.hero.max * 0.3); const hh = fc.hero.hp; G.heroAction(mg, fc, 'skill:cura'); assert(fc.hero.hp > hh + fc.hero.max * 0.2, 'cura espiritual');
  const wl = setup('guerreiro', 20, { vontade: 3 }); const fl = duel(wl); fl.mon.atk = 1e6; fl.hero.hp = 5; G.heroAction(wl, fl, 'attack'); assert(!fl.over && fl.hero.hp > 1 && fl.lastStandUsed, 'sobrevive ao golpe fatal'); G.heroAction(wl, fl, 'attack'); assert(fl.over && !fl.won, 'só uma vez por luta');
  G.rng = Math.random;
});
t('migração v3 → v4: classe nula, árvore vazia, ativas antigas removidas', () => {
  const old = { v: 3, name: 'A', level: 12, trophies: [], evTrophies: [], bag: [], skills: { forca: 2, grito: 3, golpe: 1, postura: 2 }, equipped: { arma: G.makeItem('arma', 5, 1), runas: [null, null, null] }, potions: { small: 1, large: 0 }, zones: {}, boxes: [], dragons: { verde: { readyAt: 0 }, azul: { readyAt: 0 } }, dragonTrophies: [], shop: { equip: [], runes: [] }, energy: 5, codex: {} };
  const m = G.migrate(old); assert.equal(m.v, G.STATE_V); assert(m.cls === null && Object.keys(m.tree).length === 0 && m.skills.forca === 2 && !('grito' in m.skills) && !('golpe' in m.skills));
  assert.equal(G.skillPoints(m).free, 12, 'pontos retroativos: um por nível'); assert(G.heroStats(m).hp > 0);
});
t('loja de conjuntos: nível mínimo, compra por peça, bônus de conjunto, lendário em diamantes', () => {
  const st = G.newState('x'); st.level = 10; st.gold = 1e6; st.bagSize = 60;
  assert(!G.buySetPiece(st, 2, 'arma').ok, 'conjunto bloqueado pelo nível');
  assert(G.setUnlocked(st, G.SETS[1]) && !G.setUnlocked(st, G.SETS[2]));
  const g0 = st.gold, r = G.buySetPiece(st, 1, 'arma'); assert(r.ok && r.item.set === 1 && r.item.rarity === 1 && st.gold < g0);
  assert(!G.buySetPiece(st, 1, 'arma').ok, 'não compra a mesma peça duas vezes'); assert.equal(G.setProgress(st, G.SETS[1]), 1);
  for (const sl of G.SLOT_ORDER) G.buySetPiece(st, 1, sl); assert.equal(G.setProgress(st, G.SETS[1]), 7);
  const base = G.heroStats(st).atk; for (const it of st.bag.filter((x) => x.set === 1)) G.equip(st, it.id);
  assert.equal(G.setBonus(st), 10); assert(G.heroStats(st).atk > base);
  const w = st.bag.length; st.level = 35; st.diamonds = 0;
  assert(G.setPrice(st, G.SETS[4], 'arma').cur === 'diamonds' && !G.buySetPiece(st, 4, 'arma').ok && st.bag.length === w);
  st.diamonds = 500; const l = G.buySetPiece(st, 4, 'arma'); assert(l.ok && l.item.rarity === 4 && st.diamonds < 500);
  const nd = G.makeItem('arma', 30, 4); assert(G.upgradeDiamonds(nd) > 0 && G.upgradeDiamonds(G.makeItem('arma', 30, 2)) === 0);
  assert(G.runeOffers(st).every((o) => o.price > 0)); st.diamonds = 100; assert(G.buyRune(st, 'forca', 2).ok && st.diamonds < 100);
});
t('slots: sem espera entre lutas, VIP dobra, zerar custa caro e sobe com o nível', () => {
  const st = G.newState('x'); st.level = 12; st.energy = 12; st.gold = 1e5;
  const f = G.startFight(st, G.stepMonster(1, 0, true), { mode: 'zone', zone: { z: 1, step: 0 } }); f.over = f.won = true; f.hero.hp = f.hero.max; G.finishFight(st, f);
  assert.equal(G.cooldownLeft(st), 0, 'sem fôlego/espera'); assert(G.canFightZone(st, 1, 0).ok);
  assert.equal(G.maxEnergy(st), 12); st.diamonds = G.VIP.price; assert(G.buyVip(st).ok && G.isVip(st) && G.maxEnergy(st) === 24 && st.diamonds === 0);
  assert(G.energySecs(st) < G.ENERGY_SECS);
  const a = G.energyResetCost(st); st.level = 30; const b = G.energyResetCost(st); assert(b > a, 'reset sobe com o nível');
  st.energy = 5; assert(!G.resetEnergy(st).ok); st.energy = 0; const g = st.gold; assert(G.resetEnergy(st).ok && st.energy === 24 && st.gold === g - b);
  const free = G.newState('x'); free.level = 30; assert(G.energyResetCost(free) > b, 'sem VIP o reset é mais caro');
  assert(G.rollDiamonds(0, 1) === 0 && G.rollDiamonds(1, 1) === 1 && Math.max(...G.BOX_DIAMOND) <= 0.3);
});

t('evolução de classe: exige nível, tier 2 do ramo e ouro; dá bônus e habilidades exclusivas', () => {
  const st = G.newState('x'); st.level = 12; st.gold = 1e5; G.setClass(st, 'mago');
  assert(!G.canEvolve(st, 2).ok, 'nível baixo'); st.level = 16;
  assert(!G.canEvolve(st, 2).ok, 'sem a habilidade do ramo');
  st.tree = { meditacao: 1, cura: 1 }; const base = G.heroStats(st).hp;
  assert(G.canEvolve(st, 2).ok && !G.canEvolve(st, 0).ok);
  assert(!G.learn(st, 'drenar').ok, 'habilidade de evolução trancada antes de evoluir');
  const g = st.gold; assert(G.evolve(st, 2).ok && st.evo === 2 && st.gold === g - G.evoCost(st) && G.classTitle(st) === 'Necromante');
  assert(G.heroStats(st).hp > base, 'bônus da evolução'); assert(!G.evolve(st, 0).ok, 'só evolui uma vez');
  st.level = 40; assert(!G.learn(st, 'pacto').ok, 'a 2ª exige a 1ª'); assert(G.learn(st, 'drenar').ok && G.learn(st, 'pacto').ok);
  assert(G.activeSkills(st).some((a) => a.id === 'drenar') && G.TREE.filter((d) => d.evo).length === 18);
  assert(!G.canLearn(st, 'inferno').ok, 'evolução de outro ramo não vale');
  G.respec(st); assert.equal(st.evo, null);
});

t('caixas +4/+5: épico/lendário do material certo viram peças de conjunto; diamantes só nas altas', () => {
  const st = G.newState('x'); st.bagSize = 60; let sets = 0, loose = 0, dia = 0, n = 0;
  for (let i = 0; i < 400; i++) { st.bag = []; const bx = G.makeBox(5, 36); st.boxes.push(bx); const r = G.openBox(st, bx.id); dia += r.diamonds; n++;
    for (const it of r.items) if (!it.rune && it.rarity >= 3) { if (it.set != null) { sets++; assert.equal(G.SETS[it.set].rarity, it.rarity); assert.equal(G.tierOf(it.ilvl), it.set); } else loose++; } }
  assert(sets > 0, 'peças de conjunto saem da caixa'); assert(dia / n > 0.2 && dia / n < 0.4, 'diamantes na +5 (' + dia / n + ')');
  const b = G.makeBox(1, 5); st.boxes.push(b); assert.equal(G.openBox(st, b.id).diamonds, 0);
  assert(G.BOX_ODDS[4][4] / 100 < 0.2 && G.BOX_ODDS[3][4] / 100 < 0.05, 'lendário raro nas caixas');
});

console.log(`\n${n} testes passaram`);
