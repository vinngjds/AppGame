// Simulação de equilíbrio: um bot joga a campanha inteira. Uso: node scripts/sim.js [execuções]
const path = require('path');
const G = require(path.join(__dirname, '..', 'js', 'core.js'));

function play(opts = {}) {
  const st = G.newState('bot');
  const stats = { first: {}, fights: 0, deaths: { normal: 0, elite: 0, semi: 0, boss: 0 }, train: 0, byBoss: [], kinds: {} };
  const kindStat = (k) => (stats.kinds[k] = stats.kinds[k] || { n: 0, win: 0, hpLoss: 0 });

  function manage() {
    // equipa o melhor de cada slot
    for (const it of st.bag.slice()) {
      if (it.rune) {
        const idx = st.equipped.runas.findIndex((x) => !x);
        if (idx >= 0) G.equip(st, it.id, idx);
        else {
          let wi = 0; st.equipped.runas.forEach((r, i) => { if (G.itemScore(r) < G.itemScore(st.equipped.runas[wi])) wi = i; });
          if (G.itemScore(it) > G.itemScore(st.equipped.runas[wi])) G.equip(st, it.id, wi);
        }
      } else if (G.itemScore(it) > G.itemScore(st.equipped[it.slot])) G.equip(st, it.id);
    }
    for (const it of st.bag.slice()) G.dismantle(st, it.id);
    // compra equipamento melhor na loja se sobrar dinheiro
    for (const it of st.shop.equip.concat(st.shop.runes)) {
      if (it.rune) continue;
      if (G.itemScore(it) > G.itemScore(st.equipped[it.slot]) * 1.1 && st.gold > G.shopPrice(st, it) + 200) { G.buyItem(st, it.id); G.equip(st, it.id); }
    }
    // ferreiro
    for (const s of G.SLOT_ORDER) {
      const it = st.equipped[s];
      for (let i = 0; it && i < 6 && it.plus < (opts.maxPlus || 6) && st.gold > G.upgradeCost(it) * (opts.forgeReserve || 1.5) && st.ossos >= G.upgradeOssos(it); i++) G.upgrade(st, it.id);
    }
    // treino de habilidades (instantâneo na simulação)
    if (!opts.noSkills) for (const id of G.SKILL_ORDER) {
      if (st.gold > G.skillCost(st, id) * (opts.skillReserve || 1.1) && G.skillRank(st, id) < G.SKILLS[id].max && st.level >= G.skillReqLevel(st, id)) {
        const r = G.startTraining(st, id); if (r.ok) { st.training.endsAt = 0; G.finishTraining(st); }
      }
    }
    // poções
    while (st.potions.small < 3 && st.gold > G.potionPrice(st, 'small') * 2) G.buyPotion(st, 'small');
  }

  function fight(mon, mode, event) {
    const f = G.startFight(st, mon, { mode, event });
    const hp0 = f.hero.hp; let n = 0;
    while (!f.over && n++ < 300) {
      let a = 'attack';
      if (f.hero.hp < f.hero.max * 0.35 && st.potions.large > 0) a = 'potion-large';
      else if (f.hero.hp < f.hero.max * 0.35 && st.potions.small > 0) a = 'potion-small';
      else if (f.warn) a = f.hero.postura && f.cd.postura === 0 ? 'postura' : 'guard';
      else if (f.hero.grito && f.cd.grito === 0 && f.mon.hp > f.mon.maxHp * 0.4) a = 'grito';
      else if (f.cd.heavy === 0) a = 'heavy';
      G.heroAction(st, f, a);
    }
    const lossPct = (hp0 - f.hero.hp) / f.hero.max;
    const rep = G.finishFight(st, f);
    if (mon.kind === 'boss') { const bk = (stats.bl = stats.bl || {}); const a = (bk[mon.bossNo] = bk[mon.bossNo] || { n: 0, loss: 0, turns: 0 }); a.n++; a.loss += lossPct; a.turns += f.turn; }
    const ks = kindStat(mon.kind); ks.n++; if (rep.won) ks.win++; ks.hpLoss += lossPct;
    return rep;
  }
  const restore = () => { G.setHp(st, G.heroStats(st).hp); st.energy = G.MAX_ENERGY; st.cdUntil = 0; };

  while (st.trophies.length < 15 && stats.fights < 3000) {
    restore(); manage(); restore();
    const { mon, mode } = G.nextStoryMonster(st);
    const rep = fight(mon, mode); stats.fights++;
    if (mode === 'boss') { const a = (stats.first[mon.bossNo] = stats.first[mon.bossNo] || { lvl: st.level, win: rep.won ? 1 : 0, tries: 0 }); }
    if (!rep.won) {
      stats.deaths[mon.kind] = (stats.deaths[mon.kind] || 0) + 1;
      // volta a treinar na arena até ficar mais forte
      for (let i = 0; i < (opts.trainChunk || 6); i++) { restore(); manage(); restore(); fight(G.trainingMonster(st), 'training'); stats.train++; }
    }
    if (rep.trophy && [5, 9, 13].includes(rep.trophy.no)) {
      for (const type of ['weekly', 'monthly']) {
        let w = 0; const T = 12;
        for (let i = 0; i < T; i++) {
          const save = JSON.stringify(st); const bak = Object.assign({}, st);
          restore(); G.evSync(st); st.ev.weekly = st.ev.monthly = 9; const e = G.eventMonster(st, type);
          const r = fight(e.mon, 'event-' + type, { key: 'k' + i, def: e.def }); if (r.won) w++;
          Object.assign(st, JSON.parse(save));
        }
        (stats.ev = stats.ev || []).push(`${type} (após chefe ${rep.trophy.no}):${Math.round(100 * w / T)}%`);
      }
    }
    if (rep.trophy) stats.byBoss.push({ boss: rep.trophy.no, lvl: st.level, train: stats.train, deaths: stats.deaths.boss + stats.deaths.semi });
  }
  return { st, stats };
}

const N = +process.argv[2] || 20;
let firstAgg = {}, blAgg = {}, evAgg = {}, agg = { lvl: 0, bosses: 0, fights: 0, train: 0, dBoss: 0, dSemi: 0, dNorm: 0, done: 0 }, kinds = {}, byBoss = {};
for (let i = 0; i < N; i++) {
  const { st, stats } = play(process.env.WEAK ? { noSkills: true, maxPlus: 2 } : {});
  for (const [b, v] of Object.entries(stats.first)) { const a = (firstAgg[b] = firstAgg[b] || { win: 0, n: 0, lvl: 0 }); a.win += v.win; a.n++; a.lvl += v.lvl; }
  for (const [b, v] of Object.entries(stats.bl || {})) { const a = (blAgg[b] = blAgg[b] || { n: 0, loss: 0, turns: 0 }); a.n += v.n; a.loss += v.loss; a.turns += v.turns; }
  agg.lvl += st.level; agg.bosses += st.trophies.length; agg.fights += stats.fights; agg.train += stats.train;
  (stats.ev || []).forEach((x) => { const k = x.split(':')[0]; const v = +x.split(':')[1].replace('%', ''); evAgg[k] = (evAgg[k] || 0) + v; }); agg.dBoss += stats.deaths.boss; agg.dSemi += stats.deaths.semi; agg.dNorm += stats.deaths.normal + stats.deaths.elite;
  if (st.trophies.length >= 15) agg.done++;
  for (const [k, v] of Object.entries(stats.kinds)) { const a = (kinds[k] = kinds[k] || { n: 0, win: 0, hpLoss: 0 }); a.n += v.n; a.win += v.win; a.hpLoss += v.hpLoss; }
  for (const b of stats.byBoss) { const a = (byBoss[b.boss] = byBoss[b.boss] || { lvl: 0, n: 0, train: 0 }); a.lvl += b.lvl; a.n++; a.train += b.train; }
}
const f = (x) => (x / N).toFixed(1);
console.log(`Execuções: ${N} | concluíram: ${agg.done} | nível final médio ${f(agg.lvl)} | lutas ${f(agg.fights)} | treinos ${f(agg.train)}`);
console.log(`Mortes médias — normais/elites: ${f(agg.dNorm)} · semi-chefes: ${f(agg.dSemi)} · chefes: ${f(agg.dBoss)}`);
for (const [k, v] of Object.entries(kinds)) console.log(`  ${k.padEnd(7)} vitória ${(100 * v.win / v.n).toFixed(0)}%  vida perdida média ${(100 * v.hpLoss / v.n).toFixed(0)}%  (${v.n})`);
console.log('Nível ao derrotar cada chefe:', Object.keys(byBoss).map((b) => `${b}:${(byBoss[b].lvl / byBoss[b].n).toFixed(0)}`).join(' '));
console.log('1ª tentativa no chefe (vitória%@nível):', Object.keys(firstAgg).map((b) => `${b}:${(100 * firstAgg[b].win / firstAgg[b].n).toFixed(0)}%@${(firstAgg[b].lvl / firstAgg[b].n).toFixed(0)}`).join(' '));
console.log('Vitória nos chefes de evento (bot):', Object.keys(evAgg).map((k) => `${k} ${(evAgg[k] / N).toFixed(0)}%`).join(' | '));
console.log('Vida perdida / turnos por chefe:', Object.keys(blAgg).map((b) => `${b}:${(100 * blAgg[b].loss / blAgg[b].n).toFixed(0)}%/${(blAgg[b].turns / blAgg[b].n).toFixed(0)}t`).join(' '));
