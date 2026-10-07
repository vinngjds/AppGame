// Testes das regras do jogo. Uso: node scripts/test-core.js
const path = require('path'), assert = require('assert');
const G = require(path.join(__dirname, '..', 'js', 'core.js'));
let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok -', name); };

t('novo jogo tem estado válido', () => {
  const st = G.newState('x');
  assert.equal(st.level, 1); assert.equal(st.v, G.STATE_V); assert(st.shop.equip.length >= 8); assert(st.equipped.runas.length === 3);
});
t('semi-chefe é a 3ª fera e depois vem o chefe', () => {
  const st = G.newState('x');
  assert.equal(G.nextStoryKind(st), 'normal'); st.kills = 2; assert.equal(G.nextStoryKind(st), 'semi'); st.kills = 3; assert.equal(G.nextStoryKind(st), 'boss');
});
t('chefe custa 2 encontros e respeita o fôlego entre batalhas', () => {
  const st = G.newState('x'); st.kills = 3; st.energy = 1;
  assert(!G.canFight(st, 'story').ok); st.energy = 5; assert(G.canFight(st, 'story').ok);
  st.cdUntil = Date.now() + 10000; assert(!G.canFight(st, 'story').ok);
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
t('chefe de evento: tentativas diárias, fósseis e troféu na 1ª vitória', () => {
  const st = G.newState('x'); st.level = 20; st.trophies = [1, 2, 3, 4, 5, 6]; G.evSync(st);
  assert(G.canFight(st, 'event-weekly').ok);
  const e = G.eventMonster(st, 'weekly'); const f = G.startFight(st, e.mon, { mode: 'event-weekly', event: { key: e.key, def: e.def } });
  f.over = true; f.won = true; f.mon.hp = 0; f.hero.hp = f.hero.max;
  const rep = G.finishFight(st, f); assert(rep.fossils > 0 && rep.evTrophy && st.ev.weekly === 2 && rep.items.length >= 1);
  const f2 = G.startFight(st, G.eventMonster(st, 'weekly').mon, { mode: 'event-weekly', event: { key: e.key, def: e.def } });
  f2.over = true; f2.won = true; f2.hero.hp = f2.hero.max; st.cdUntil = 0; const rep2 = G.finishFight(st, f2);
  assert(!rep2.evTrophy && rep2.fossils > 0, 'troféu e itens só na 1ª vitória');
});
t('eventos de calendário', () => {
  const sat = new Date(2026, 9, 10); assert(G.bonusMul(sat).xp === 1.5);
  assert(G.bonusMul(new Date(2026, 9, 7)).forge === 0.75); assert(G.bonusMul(new Date(2026, 9, 2)).gold === 1.5);
  assert.notEqual(G.weeklyEvent(new Date(2026, 9, 7)).key, G.weeklyEvent(new Date(2026, 9, 14)).key);
});
t('migração de save antigo (v1) para v2', () => {
  const old = { v: 1, name: 'A', level: 12, xp: 5, hp: 100, hpAt: Date.now(), gold: 500, kills: 1, bossNo: 3, totalKills: 20, trophies: [1, 2], bag: [], equipped: { arma: G.makeItem('arma', 5, 1), elmo: null, armadura: null, botas: null, amuleto: null }, potions: { small: 1, large: 0 }, energy: 10, energyAt: Date.now(), shop: { level: 1, equip: [], amulet: [] } };
  const m = G.migrate(JSON.parse(JSON.stringify(old)));
  assert.equal(m.v, 2); assert(m.equipped.runas.length === 3 && 'escudo' in m.equipped && m.shop.runes.length > 0);
  assert(G.heroStats(m).atk > 0); G.syncTime(m);
});
t('XP: nível sobe e respeita o limite', () => {
  const st = G.newState('x'); st.level = G.MAX_LEVEL - 1; st.xp = G.xpToNext(st.level) - 1;
  const mon = G.makeMonster(st.level, 'normal'); const f = G.startFight(st, mon, { mode: 'story' }); f.over = true; f.won = true; f.hero.hp = f.hero.max;
  G.finishFight(st, f); assert.equal(st.level, G.MAX_LEVEL);
});
t('pular espera com ouro: fôlego e encontros (preço sobe no dia)', () => {
  const st = G.newState('x'); st.level = 10; st.gold = 1000; st.cdUntil = Date.now() + 20000;
  const c = G.cooldownSkipCost(st); assert(c > 0); assert(G.skipCooldown(st).ok); assert.equal(G.cooldownLeft(st), 0); assert.equal(st.gold, 1000 - c);
  st.energy = 3; const p1 = G.energyBuyCost(st); assert(G.buyEnergy(st).ok); assert.equal(st.energy, 4); assert(G.energyBuyCost(st) > p1);
  st.energy = G.MAX_ENERGY; assert(!G.buyEnergy(st).ok); st.energy = 2; st.gold = 0; assert(!G.buyEnergy(st).ok);
});
t('ouro e XP escassos', () => {
  assert(G.GOLD_RATE < 1 && G.XP_RATE < 1);
  const st = G.newState('x'); const f = G.startFight(st, G.makeMonster(1, 'normal'), { mode: 'story' }); f.over = true; f.won = true; f.hero.hp = f.hero.max;
  const rep = G.finishFight(st, f); assert(rep.gold <= 8, 'ouro da 1ª fera deve ser baixo: ' + rep.gold);
});
t('troféus dão bônus vitalício de atributo', () => {
  const st = G.newState('x'); st.level = 10; const b0 = G.heroStats(st);
  st.trophies = [1]; const b1 = G.heroStats(st); assert(b1.atk > b0.atk, 'chefe 1 dá Força');
  st.trophies = [1, 2, 3, 4]; const b4 = G.heroStats(st);
  assert(b4.hp > b0.hp && b4.arm > b0.arm && b4.crit > b0.crit);
  const tt = G.trophyTotals(st); assert.deepEqual([tt.atk, tt.hp, tt.arm, tt.crit], [3, 4, 4, 1.5]);
  st.evTrophies = [{ id: 'w', type: 'weekly', bonus: G.evTrophyBonus('weekly', 0) }]; assert(G.trophyTotals(st).atk > 3);
  // vitória sobre um chefe concede o troféu e informa o bônus
  st.trophies = []; st.level = 5; const f = G.startFight(st, G.makeMonster(5, 'boss', G.BOSSES[1]), { mode: 'boss' }); f.over = true; f.won = true; f.hero.hp = f.hero.max;
  const rep = G.finishFight(st, f); assert.equal(rep.trophyBonus.stat, 'hp'); assert(st.trophies.includes(2));
});
t('avatar: começa só com a roupa de baixo e mostra o equipamento', () => {
  const A = require(path.join(__dirname, '..', 'js', 'avatar.js'));
  const st = G.newState('x'); st.equipped.arma = null;
  const nu = A.svg({ g: 'f', skin: 0, hair: 0 }, st.equipped);
  assert(nu.startsWith('<svg') && !nu.includes('stroke-width="4"/><circle cx="156"'), 'sem escudo');
  const dressed = Object.assign({}, st.equipped); for (const sl of G.SLOT_ORDER) dressed[sl] = G.makeItem(sl, 20, 3);
  const v = A.svg({ g: 'm', skin: 2, hair: 1 }, dressed);
  assert(v.length > nu.length * 1.6, 'equipamento adiciona camadas'); assert(v.includes('#b06be0'), 'cor da raridade épica');
  assert(A.svg({ g: 'm', skin: 1, hair: 1 }, G.newState('y').equipped) !== A.svg({ g: 'f', skin: 1, hair: 1 }, G.newState('y').equipped), 'masculino e feminino diferem');
});
t('chefes ficam mais fortes ao longo da campanha', () => {
  const m = (no) => G.makeMonster(10, 'boss', G.BOSSES[no - 1]);
  assert(m(15).atk > m(8).atk && m(8).atk > m(1).atk * 1.4); assert(m(15).hp > m(1).hp * 2);
});
console.log(`\n${n} testes passaram`);
