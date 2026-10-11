// Simulação de equilíbrio: um bot joga a jornada inteira (15 locais + dragões). Uso: node scripts/sim.js [execuções]
//   WEAK=1 node scripts/sim.js   -> jogador que NÃO investe (sem habilidades, ferreiro só até +2)
const path = require('path');
const G = require(path.join(__dirname, '..', 'js', 'core.js'));


// Sequência de aprendizado (id, nível) de cada classe e política de uso das habilidades em combate
const BUILDS = {
  guerreiro: [['golpe', 1], ['guarda', 1], ['vigorbruto', 1], ['grito', 1], ['peleferro', 1], ['sede', 1], ['golpe', 2], ['redemoinho', 1], ['postura', 1], ['berserker', 1], ['execucao', 1], ['vontade', 1], ['furia', 1], ['grito', 2], ['vigorbruto', 2], ['peleferro', 2], ['sede', 2], ['golpe', 3], ['postura', 2], ['berserker', 2], ['execucao', 2], ['vontade', 2], ['redemoinho', 2], ['furia', 2]],
  arqueiro: [['veneno', 1], ['olho', 1], ['passoleve', 1], ['tiro', 1], ['armadilha', 1], ['esquiva', 1], ['chuva', 1], ['toxina', 1], ['predador', 1], ['tiromortal', 1], ['marca', 1], ['cacador', 1], ['veneno', 2], ['olho', 2], ['tiro', 2], ['passoleve', 2], ['toxina', 2], ['predador', 2], ['tiromortal', 2], ['chuva', 2], ['marca', 2], ['esquiva', 2], ['armadilha', 2], ['cacador', 2]],
  mago: [['centelha', 1], ['meditacao', 1], ['gelo', 1], ['bola', 1], ['cura', 1], ['escudo', 1], ['chamas', 1], ['nevasca', 1], ['arcano', 1], ['erupcao', 1], ['congelar', 1], ['tempestade', 1], ['centelha', 2], ['bola', 2], ['meditacao', 2], ['chamas', 2], ['arcano', 2], ['erupcao', 2], ['gelo', 2], ['escudo', 2], ['cura', 2], ['nevasca', 2], ['tempestade', 2], ['congelar', 2]],
};
const DEFENSIVE = ['esquiva', 'guarda', 'postura', 'escudo', 'armadilha', 'congelar', 'gelo'];
const BUFFS = ['grito', 'cacador', 'marca', 'furia'];
function chooseAction(st, f) {
  const h = f.hero, hpf = h.hp / h.max, ready = (id) => (f.cd[id] || 0) === 0 && h.skills.some((x) => x.id === id);
  if (hpf < 0.35 && st.potions.large > 0) return 'potion-large';
  if (hpf < 0.35 && st.potions.small > 0) return 'potion-small';
  const rank = (id) => (h.skills.find((x) => x.id === id) || {}).rank || 0;
  for (const s of h.skills) { const d = G.TREE_BY_ID[s.id], fx = G.skillFx(d, s.rank); if (fx.heal && !fx.buff && hpf < 0.5 && ready(s.id)) return 'skill:' + s.id; }
  if (f.warn) for (const id of DEFENSIVE) if (ready(id)) return 'skill:' + id;
  if (hpf < 0.6 && ready('escudo')) return 'skill:escudo';
  if (f.mon.boss || f.mon.kind === 'semi') for (const id of ['armadilha', 'congelar', 'gelo']) if (ready(id) && !f.mstun) return 'skill:' + id;
  for (const id of BUFFS) {
    if (!ready(id)) continue;
    if (id === 'furia' && hpf > 0.65) continue;
    if (f.mon.hp > f.mon.maxHp * 0.4 && !f.buffs.some((b) => b.id === id) && !(id === 'marca' && f.mark)) return 'skill:' + id;
  }
  let best = null, bv = 0;
  for (const s of h.skills) {
    const d = G.TREE_BY_ID[s.id], fx = G.skillFx(d, s.rank);
    if (!fx.dmg || !ready(s.id) || DEFENSIVE.includes(s.id)) continue;
    const v = fx.dmg.mult * (fx.dmg.hits || 1) * (1 + (fx.dmg.ignoreArm || 0) * 0.5) + (fx.dot ? 1 : 0);
    if (v > bv) { bv = v; best = s.id; }
  }
  return best ? 'skill:' + best : 'attack';
}
// ramo da evolução que o bot escolhe (EVO=0|1|2|none); padrão = o ramo principal da build
const EVO_DEFAULT = { guerreiro: 0, arqueiro: 1, mago: 0 };
function learnBuild(st, opts) {
  if (!st.cls) return;
  const evoB = process.env.EVO === 'none' ? null : process.env.EVO != null ? +process.env.EVO : EVO_DEFAULT[st.cls];
  if (evoB != null && st.evo == null && st.level >= G.EVO_LEVEL) {
    // só evolui se o ramo tem a habilidade de tier 2; senão aprende-a antes
    G.evolve(st, evoB);
  }
  const list = BUILDS[st.cls].slice();
  if (evoB != null && st.evo === evoB) {
    const ev = G.TREE.filter((d) => d.evo && d.cls === st.cls && d.branch === evoB).map((d) => [d.id, 1]);
    list.splice(10, 0, ev[0], ev[1], [ev[0][0], 2], [ev[1][0], 2]);
  }
  for (const [id, r] of list) {
    if (G.treeRank(st, id) >= r) continue;
    const c = G.canLearn(st, id);
    if (c.ok) G.learn(st, id);
    else if (/Faltam pontos/.test(c.msg)) return;
  }
}

function play(opts = {}) {
  const st = G.newState('bot');
  if (!opts.noTree) G.setClass(st, opts.cls || 'guerreiro');
  const S = { fights: 0, farm: 0, stepLoss: [[0, 0], [0, 0], [0, 0], [0, 0]], deaths: [0, 0, 0, 0], first: {}, zl: {}, arrive: {}, bossLoss: {}, dragon: {}, ev: {}, tries: {} };

  function manage() {
    if (!opts.noTree) learnBuild(st, opts);
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
    for (const it of st.bag.slice()) G.sell(st, it.id);
    for (const set of G.SETS.slice().reverse()) {
      if (set.cur !== 'gold' || !G.setUnlocked(st, set)) continue;
      for (const sl of G.SLOT_ORDER) {
        const p = G.setPrice(st, set, sl), it = G.setPiece(st, set, sl);
        if (!G.setOwned(st, set, sl) && G.itemScore(it) > G.itemScore(st.equipped[sl]) * 1.1 && st.gold > p.n + 200) { const r = G.buySetPiece(st, set.id, sl); if (r.ok) G.equip(st, r.item.id); }
      }
    }
    for (const s of G.SLOT_ORDER) {
      const it = st.equipped[s];
      for (let i = 0; it && i < 6 && it.plus < (opts.maxPlus || 6) && st.gold > G.upgradeCost(it) * (opts.forgeReserve || 1.5) ; i++) G.upgrade(st, it.id);
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
      const a = chooseAction(st, f);
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
        if (tries === 1) { (S.first[z] = S.first[z] || [])[step] = r.rep.won ? 1 : 0; const zl = (S.zl[z] = S.zl[z] || [[0, 0], [0, 0], [0, 0], [0, 0]]); zl[step][0] += r.loss; zl[step][1]++; }
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
      for (const type of ['daily', 'weekly']) {
        S.ev[`${type}@zona${z}`] = probe(type, () => { G.evSync(st); st.ev.weekly = st.ev.daily = 9; const e = G.eventMonster(st, type); return fight(e.mon, 'event-' + type, { event: { key: 'k' + Math.random(), def: e.def } }); });
      }
    }
  }
  return { st, S };
}

function evaluate(N, opts) {
const A = { lvl: 0, fights: 0, farm: 0, d: [0, 0, 0, 0], sl: [[0, 0], [0, 0], [0, 0], [0, 0]] }, arrive = {}, first = {}, zl = {}, bl = {}, dr = {}, ev = {}, byCls = {};
for (let i = 0; i < N; i++) {
  const cls = opts.cls || G.CLASS_ORDER[i % 3];
  const { st, S } = play(Object.assign({}, opts, { cls }));
  const C = (byCls[cls] = byCls[cls] || { n: 0, lvl: 0, farm: 0, d3: 0, bossLoss: [0, 0], semiLoss: [0, 0], dragon: {}, ev: {} });
  C.n++; C.lvl += st.level; C.farm += S.farm; C.d3 += S.deaths[3]; C.bossLoss[0] += S.stepLoss[3][0]; C.bossLoss[1] += S.stepLoss[3][1]; C.semiLoss[0] += S.stepLoss[2][0]; C.semiLoss[1] += S.stepLoss[2][1];
  for (const [k, v] of Object.entries(S.dragon)) { const kk = k.replace(/\(nv\d+\)/, ''); C.dragon[kk] = (C.dragon[kk] || 0) + v; }
  for (const [k, v] of Object.entries(S.ev)) C.ev[k] = (C.ev[k] || 0) + v;
  S.stepLoss.forEach((v, k) => { A.sl[k][0] += v[0]; A.sl[k][1] += v[1]; });
  A.lvl += st.level; A.fights += S.fights; A.farm += S.farm; S.deaths.forEach((v, k) => (A.d[k] += v));
  for (const [z, v] of Object.entries(S.arrive)) arrive[z] = (arrive[z] || 0) + v;
  for (const [z, arr] of Object.entries(S.first)) { first[z] = first[z] || [0, 0, 0, 0]; arr.forEach((v, k) => (first[z][k] += v || 0)); }
  for (const [z, arr] of Object.entries(S.zl)) { zl[z] = zl[z] || [[0, 0], [0, 0], [0, 0], [0, 0]]; arr.forEach((v, k) => { zl[z][k][0] += v[0]; zl[z][k][1] += v[1]; }); }
  for (const [z, v] of Object.entries(S.bossLoss)) { const a = (bl[z] = bl[z] || { n: 0, loss: 0, turns: 0 }); a.n += v.n; a.loss += v.loss; a.turns += v.turns; }
  for (const [k, v] of Object.entries(S.dragon)) { const key = k.replace(/\(nv\d+\)/, ''); dr[key] = (dr[key] || 0) + v; }
  for (const [k, v] of Object.entries(S.ev)) ev[k] = (ev[k] || 0) + v;
}
return { N, A, arrive, first, zl, bl, dr, ev, byCls };
}
function report(r) {
const { N, A, arrive, first, zl, bl, dr, ev, byCls } = r;
const f = (x) => (x / N).toFixed(1);
console.log(`Execuções: ${N} | nível final ${f(A.lvl)} | lutas ${f(A.fights)} (farm ${f(A.farm)})`);
console.log('Vida perdida média por luta (fera1/fera2/semi/chefe):', A.sl.map((v) => (100 * v[0] / v[1]).toFixed(0) + '%').join(' / '));
console.log(`Mortes médias por luta do local — fera1 ${f(A.d[0])} · fera2 ${f(A.d[1])} · semi ${f(A.d[2])} · chefe ${f(A.d[3])}`);
console.log('Nível do herói ao chegar em cada local   :', Object.keys(arrive).map((z) => `${z}:${(arrive[z] / N).toFixed(0)}`).join(' '), '| nível-base:', G.ZONE_LEVELS.join(','));
console.log('Vitória 1ª tentativa (fera1/fera2/semi/chefe):', Object.keys(first).map((z) => `${z}:${first[z].map((v) => Math.round(100 * v / N)).join('/')}`).join('  '));
console.log('Vida perdida na 1ª tentativa (fera1/fera2/semi/chefe):', Object.keys(zl).map((z) => `${z}:${zl[z].map((v) => (v[1] ? Math.round(100 * v[0] / v[1]) : '-')).join('/')}`).join('  '));
console.log('Vida perdida/turnos no chefe do local    :', Object.keys(bl).map((z) => `${z}:${(100 * bl[z].loss / bl[z].n).toFixed(0)}%/${(bl[z].turns / bl[z].n).toFixed(0)}t`).join(' '));
console.log('Dragões (vitória do bot):', Object.keys(dr).map((k) => `${k} ${(dr[k] / N).toFixed(0)}%`).join(' | '));
console.log('Eventos (vitória do bot):', Object.keys(ev).map((k) => `${k} ${(ev[k] / N).toFixed(0)}%`).join(' | '));
}

// resumo por classe (uso: node scripts/sim.js 60)
function byClass(r) { return Object.entries(r.byCls).map(([c, v]) => `${c.padEnd(9)} n=${v.n} nível ${(v.lvl / v.n).toFixed(1)} | semi ${(100 * v.semiLoss[0] / v.semiLoss[1]).toFixed(0)}% chefe ${(100 * v.bossLoss[0] / v.bossLoss[1]).toFixed(0)}% | mortes no chefe ${(v.d3 / v.n).toFixed(1)} | reforço ${(v.farm / v.n).toFixed(0)} | dragões ${Object.entries(v.dragon).filter(([k]) => /zona15|zona12/.test(k)).map(([k, x]) => `${k.replace(/\(.*\)/, '')} ${(x / v.n).toFixed(0)}%`).join(' ')} | eventos ${Object.entries(v.ev).map(([k, x]) => `${k.replace('@zona', '@')} ${(x / v.n).toFixed(0)}%`).join(' ')}`); }
module.exports = { play, evaluate, report, byClass };
if (require.main === module) { const o = process.env.WEAK ? { noSkills: true, maxPlus: 2 } : {}; if (process.env.NOTREE) o.noTree = true; if (process.env.CLS) o.cls = process.env.CLS; const r = evaluate(+process.argv[2] || 20, o); report(r); console.log('Por classe:'); byClass(r).forEach((l) => console.log('  ' + l)); }
