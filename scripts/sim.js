// Simulação de equilíbrio: um bot joga a jornada inteira (15 locais + dragões). Uso: node scripts/sim.js [execuções]
//   WEAK=1 node scripts/sim.js   -> jogador que NÃO investe (sem habilidades, ferreiro só até +2)
const path = require('path');
const G = require(path.join(__dirname, '..', 'js', 'core.js'));

function play(opts = {}) {
  const st = G.newState('bot');
  const S = { fights: 0, farm: 0, stepLoss: [[0, 0], [0, 0], [0, 0], [0, 0]], deaths: [0, 0, 0, 0], first: {}, arrive: {}, bossLoss: {}, dragon: {}, ev: {}, tries: {} };

  function manage() {
    for (const b of st.boxes.slice()) G.openBox(st, b.id);
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
    for (const it of st.shop.equip) {
      if (G.itemScore(it) > G.itemScore(st.equipped[it.slot]) * 1.1 && st.gold > G.shopPrice(st, it) + 200) { G.buyItem(st, it.id); G.equip(st, it.id); }
    }
    for (const s of G.SLOT_ORDER) {
      const it = st.equipped[s];
      for (let i = 0; it && i < 6 && it.plus < (opts.maxPlus || 6) && st.gold > G.upgradeCost(it) * (opts.forgeReserve || 1.5) && st.ossos >= G.upgradeOssos(it); i++) G.upgrade(st, it.id);
    }
    if (!opts.noSkills) for (const id of G.SKILL_ORDER) {
      if (st.gold > G.skillCost(st, id) * (opts.skillReserve || 1.1) && G.skillRank(st, id) < G.SKILLS[id].max && st.level >= G.skillReqLevel(st, id)) {
        const r = G.startTraining(st, id); if (r.ok) { st.training.endsAt = 0; G.finishTraining(st); }
      }
    }
    while (st.potions.small < 3 && st.gold > G.potionPrice(st, 'small') * 2) G.buyPotion(st, 'small');
  }
  let probing = false;
  const restore = () => { G.setHp(st, G.heroStats(st).hp); st.energy = G.MAX_ENERGY; st.cdUntil = 0; for (const d of Object.values(st.dragons)) d.readyAt = 0; };

  function fight(mon, mode, extra) {
    const f = G.startFight(st, mon, Object.assign({ mode }, extra || {}));
    const hp0 = f.hero.hp; let n = 0;
    while (!f.over && n++ < 400) {
      let a = 'attack';
      if (f.hero.hp < f.hero.max * 0.35 && st.potions.large > 0) a = 'potion-large';
      else if (f.hero.hp < f.hero.max * 0.35 && st.potions.small > 0) a = 'potion-small';
      else if (f.warn) a = f.hero.postura && f.cd.postura === 0 ? 'postura' : 'guard';
      else if (f.hero.grito && f.cd.grito === 0 && f.mon.hp > f.mon.maxHp * 0.4) a = 'grito';
      else if (f.cd.heavy === 0) a = 'heavy';
      G.heroAction(st, f, a);
    }
    const loss = (hp0 - f.hero.hp) / f.hero.max;
    const rep = G.finishFight(st, f);
    if (!probing) S.fights++;
    return { rep, loss, turns: f.turn };
  }

  // testa um chefe especial várias vezes a partir do estado atual (sem alterar o jogador)
  function probe(label, mkFight, T = 10) {
    let w = 0; probing = true;
    for (let i = 0; i < T; i++) {
      const save = JSON.stringify(st);
      restore(); const r = mkFight(); if (r.rep.won) w++;
      Object.assign(st, JSON.parse(save));
    }
    probing = false;
    return Math.round(100 * w / T);
  }

  for (let z = 1; z <= 15; z++) {
    S.arrive[z] = st.level;
    for (let step = 0; step < 4; step++) {
      let tries = 0;
      while (G.zoneProgress(st, z) <= step && tries < 40) {
        restore(); manage(); restore();
        const mon = G.stepMonster(z, step);
        const r = fight(mon, 'zone', { zone: { z, step } });
        tries++; S.stepLoss[step][0] += r.loss; S.stepLoss[step][1]++;
        if (tries === 1) { (S.first[z] = S.first[z] || [])[step] = r.rep.won ? 1 : 0; }
        if (step === 3) { const b = (S.bossLoss[z] = S.bossLoss[z] || { n: 0, loss: 0, turns: 0 }); b.n++; b.loss += r.loss; b.turns += r.turns; }
        if (!r.rep.won) {
          S.deaths[step]++;
          // farma rejogando lutas já vencidas
          for (let i = 0; i < (opts.trainChunk || 6); i++) {
            restore(); manage(); restore();
            const zz = step === 0 && z > 1 ? z - 1 : z, ss = step === 0 ? 1 : Math.max(0, step - 1);
            fight(G.stepMonster(zz, ss), 'zone', { zone: { z: zz, step: ss } }); S.farm++;
          }
        }
      }
    }
    if ([6, 8, 10, 12, 15].includes(z)) {
      for (const id of ['verde', 'azul']) if (G.dragonUnlocked(st, id)) S.dragon[`${id}@zona${z}(nv${st.level})`] = probe(id, () => fight(G.dragonMonster(id), 'dragon'));
    }
    if ([5, 9, 13].includes(z)) {
      for (const type of ['weekly', 'monthly']) {
        S.ev[`${type}@zona${z}`] = probe(type, () => { G.evSync(st); st.ev.weekly = st.ev.monthly = 9; const e = G.eventMonster(st, type); return fight(e.mon, 'event-' + type, { event: { key: 'k' + Math.random(), def: e.def } }); });
      }
    }
  }
  return { st, S };
}

function evaluate(N, opts) {
const A = { lvl: 0, fights: 0, farm: 0, d: [0, 0, 0, 0], sl: [[0, 0], [0, 0], [0, 0], [0, 0]] }, arrive = {}, first = {}, bl = {}, dr = {}, ev = {};
for (let i = 0; i < N; i++) {
  const { st, S } = play(opts);
  S.stepLoss.forEach((v, k) => { A.sl[k][0] += v[0]; A.sl[k][1] += v[1]; });
  A.lvl += st.level; A.fights += S.fights; A.farm += S.farm; S.deaths.forEach((v, k) => (A.d[k] += v));
  for (const [z, v] of Object.entries(S.arrive)) arrive[z] = (arrive[z] || 0) + v;
  for (const [z, arr] of Object.entries(S.first)) { first[z] = first[z] || [0, 0, 0, 0]; arr.forEach((v, k) => (first[z][k] += v || 0)); }
  for (const [z, v] of Object.entries(S.bossLoss)) { const a = (bl[z] = bl[z] || { n: 0, loss: 0, turns: 0 }); a.n += v.n; a.loss += v.loss; a.turns += v.turns; }
  for (const [k, v] of Object.entries(S.dragon)) { const key = k.replace(/\(nv\d+\)/, ''); dr[key] = (dr[key] || 0) + v; }
  for (const [k, v] of Object.entries(S.ev)) ev[k] = (ev[k] || 0) + v;
}
return { N, A, arrive, first, bl, dr, ev };
}
function report(r) {
const { N, A, arrive, first, bl, dr, ev } = r;
const f = (x) => (x / N).toFixed(1);
console.log(`Execuções: ${N} | nível final ${f(A.lvl)} | lutas ${f(A.fights)} (farm ${f(A.farm)})`);
console.log('Vida perdida média por luta (fera1/fera2/semi/chefe):', A.sl.map((v) => (100 * v[0] / v[1]).toFixed(0) + '%').join(' / '));
console.log(`Mortes médias por luta do local — fera1 ${f(A.d[0])} · fera2 ${f(A.d[1])} · semi ${f(A.d[2])} · chefe ${f(A.d[3])}`);
console.log('Nível do herói ao chegar em cada local   :', Object.keys(arrive).map((z) => `${z}:${(arrive[z] / N).toFixed(0)}`).join(' '), '| nível-base:', G.ZONE_LEVELS.join(','));
console.log('Vitória 1ª tentativa (fera1/fera2/semi/chefe):', Object.keys(first).map((z) => `${z}:${first[z].map((v) => Math.round(100 * v / N)).join('/')}`).join('  '));
console.log('Vida perdida/turnos no chefe do local    :', Object.keys(bl).map((z) => `${z}:${(100 * bl[z].loss / bl[z].n).toFixed(0)}%/${(bl[z].turns / bl[z].n).toFixed(0)}t`).join(' '));
console.log('Dragões (vitória do bot):', Object.keys(dr).map((k) => `${k} ${(dr[k] / N).toFixed(0)}%`).join(' | '));
console.log('Eventos (vitória do bot):', Object.keys(ev).map((k) => `${k} ${(ev[k] / N).toFixed(0)}%`).join(' | '));
}
module.exports = { play, evaluate, report };
if (require.main === module) report(evaluate(+process.argv[2] || 20, process.env.WEAK ? { noSkills: true, maxPlus: 2 } : {}));
