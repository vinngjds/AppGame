/* Era da Pedra — árvore de habilidades: 3 classes × 3 ramos × 4 habilidades. 1 ponto por nível; custo sobe com o tier e o nível da habilidade. */
(function (root) {
  'use strict';
  const G = root.G || (typeof require === 'function' ? require('./core.js') : null);

  G.CLASSES = {
    guerreiro: { id: 'guerreiro', name: 'Guerreiro', icon: '🛡️', color: '#c0502a', blurb: 'Resistente e brutal. Aguenta pancada, golpeia forte e se cura no combate.', bonus: { hpPct: 10, armPct: 10 }, bonusText: '+10% de Vida e +10% de Armadura', basic: '⚔️ Você golpeia', btn: '⚔️ Golpear', branches: [['Fúria', '🔥'], ['Muralha', '🛡️'], ['Sangue', '🩸']] },
    arqueiro: { id: 'arqueiro', name: 'Arqueiro', icon: '🏹', color: '#3f9a4a', blurb: 'Ágil e preciso. Acerta golpes críticos, envenena e desvia dos ataques.', bonus: { crit: 6, dodge: 5 }, bonusText: '+6 de Crítico e +5% de esquiva', basic: '🏹 Você atira', btn: '🏹 Atirar', branches: [['Precisão', '🎯'], ['Caçada', '🐍'], ['Agilidade', '💨']] },
    mago: { id: 'mago', name: 'Mago', icon: '🔮', color: '#7a5ae0', blurb: 'Poder arcano. Fogo, gelo e espíritos; seus ataques ignoram parte da armadura.', bonus: { atkPct: 12, magic: true }, bonusText: '+12% de Força e ataques ignoram 25% da armadura', basic: '🔮 Você lança um raio arcano', btn: '🔮 Raio Arcano', branches: [['Fogo', '🔥'], ['Gelo e Espírito', '❄️'], ['Arcano', '🔮']] },
  };
  G.CLASS_ORDER = ['guerreiro', 'arqueiro', 'mago'];
  G.TREE_MAX_RANK = 3;
  const TIER_LEVEL = [1, 4, 8, 12];           // nível do herói para o 1º nível da habilidade de cada tier
  G.treeReqLevel = (def, rank) => TIER_LEVEL[def.tier - 1] + (rank - 1) * 6;
  G.treeCost = (def, rank) => def.tier + (rank - 1);   // tier 1 = 1 ponto; tier 4 = 4; níveis seguintes custam +1 cada

  /* ---------- definição das habilidades ---------- */
  // fx: números em lista = valor por nível da habilidade (1, 2, 3). cd = turnos de recarga.
  const TREE = [];
  const S = (cls, branch, tier, id, name, icon, type, o) => TREE.push(Object.assign({ id, cls, branch, tier, name, icon, type }, o));
  // --- Guerreiro
  S('guerreiro', 0, 1, 'golpe', 'Golpe Poderoso', '⚔️', 'active', { cd: 3, fx: { dmg: { mult: [1.7, 2.0, 2.4] } } });
  S('guerreiro', 0, 2, 'grito', 'Grito de Guerra', '📣', 'active', { cd: 5, fx: { buff: { id: 'grito', icon: '📣', name: 'Grito de Guerra', turns: 4, atk: [1.25, 1.35, 1.5] } } });
  S('guerreiro', 0, 3, 'redemoinho', 'Redemoinho', '🌪️', 'active', { cd: 4, fx: { dmg: { mult: [0.9, 1.05, 1.2], hits: 2 } } });
  S('guerreiro', 0, 4, 'execucao', 'Execução', '💀', 'active', { cd: 6, fx: { dmg: { mult: [2.6, 3.1, 3.7], exec: { below: 0.35, mult: 1.5 } } } });
  S('guerreiro', 1, 1, 'guarda', 'Guarda', '🛡️', 'active', { cd: 2, fx: { guard: [0.4, 0.3, 0.2] } });
  S('guerreiro', 1, 2, 'peleferro', 'Pele de Ferro', '🪨', 'passive', { fx: { pass: { armPct: [8, 15, 22] } } });
  S('guerreiro', 1, 3, 'postura', 'Postura de Pedra', '🗿', 'active', { cd: 5, fx: { buff: { id: 'postura', icon: '🗿', name: 'Postura de Pedra', turns: 3, taken: [0.65, 0.58, 0.5] } } });
  S('guerreiro', 1, 4, 'vontade', 'Vontade de Aço', '💪', 'passive', { fx: { pass: { lastStand: [0.15, 0.25, 0.35] } } });
  S('guerreiro', 2, 1, 'vigorbruto', 'Vigor Bruto', '❤️', 'passive', { fx: { pass: { hpPct: [6, 12, 18] } } });
  S('guerreiro', 2, 2, 'sede', 'Sede de Sangue', '🩸', 'passive', { fx: { pass: { vamp: [3, 5, 7] } } });
  S('guerreiro', 2, 3, 'berserker', 'Berserker', '😤', 'passive', { fx: { pass: { lowHp: { below: 0.5, pct: [12, 20, 28] } } } });
  S('guerreiro', 2, 4, 'furia', 'Fúria Imortal', '🔥', 'active', { cd: 7, fx: { heal: [0.2, 0.3, 0.4], buff: { id: 'furia', icon: '🔥', name: 'Fúria Imortal', turns: 4, atk: [1.2, 1.3, 1.4] } } });
  // --- Arqueiro
  S('arqueiro', 0, 1, 'olho', 'Olho de Águia', '🎯', 'passive', { fx: { pass: { crit: [4, 8, 12] } } });
  S('arqueiro', 0, 2, 'tiro', 'Tiro Certeiro', '🏹', 'active', { cd: 3, fx: { dmg: { mult: [1.6, 1.9, 2.2], critAdd: 30 } } });
  S('arqueiro', 0, 3, 'chuva', 'Chuva de Flechas', '🌧️', 'active', { cd: 4, fx: { dmg: { mult: [0.65, 0.75, 0.85], hits: 3 } } });
  S('arqueiro', 0, 4, 'tiromortal', 'Tiro Mortal', '☠️', 'active', { cd: 6, fx: { dmg: { mult: [3.0, 3.6, 4.2], ignoreArm: 0.5 } } });
  S('arqueiro', 1, 1, 'veneno', 'Flecha Envenenada', '🧪', 'active', { cd: 3, fx: { dmg: { mult: [1.0, 1.1, 1.2] }, dot: { id: 'veneno', icon: '☠️', name: 'veneno', pct: [0.28, 0.38, 0.5], turns: 3 } } });
  S('arqueiro', 1, 2, 'armadilha', 'Armadilha', '🪤', 'active', { cd: 5, fx: { dmg: { mult: 0.6 }, stun: [0.6, 0.75, 0.9] } });
  S('arqueiro', 1, 3, 'toxina', 'Toxina Mortal', '🐍', 'passive', { fx: { pass: { dotMult: [30, 60, 90], poisonChance: [0.15, 0.22, 0.3] } } });
  S('arqueiro', 1, 4, 'marca', 'Presa Marcada', '📍', 'active', { cd: 6, fx: { mark: { pct: [25, 35, 45], turns: 4 } } });
  S('arqueiro', 2, 1, 'passoleve', 'Passo Leve', '👟', 'passive', { fx: { pass: { dodge: [4, 8, 12] } } });
  S('arqueiro', 2, 2, 'esquiva', 'Esquiva', '💨', 'active', { cd: 4, fx: { evade: [1, 1, 2] } });
  S('arqueiro', 2, 3, 'predador', 'Instinto Predador', '🦅', 'passive', { fx: { pass: { critDmg: [0.15, 0.3, 0.45] } } });
  S('arqueiro', 2, 4, 'cacador', 'Postura do Caçador', '🌲', 'active', { cd: 6, fx: { buff: { id: 'cacador', icon: '🌲', name: 'Postura do Caçador', turns: 4, crit: [15, 22, 30], dodge: [15, 22, 30] } } });
  // --- Mago
  S('mago', 0, 1, 'centelha', 'Centelha', '✨', 'active', { cd: 2, fx: { dmg: { mult: [1.5, 1.8, 2.1], ignoreArm: 0.4 } } });
  S('mago', 0, 2, 'bola', 'Bola de Fogo', '🔥', 'active', { cd: 4, fx: { dmg: { mult: [2.0, 2.4, 2.8] }, dot: { id: 'fogo', icon: '🔥', name: 'queimadura', pct: [0.18, 0.25, 0.32], turns: 2 } } });
  S('mago', 0, 3, 'chamas', 'Chamas Eternas', '🌋', 'passive', { fx: { pass: { dotMult: [40, 80, 120], atkPct: [4, 8, 12] } } });
  S('mago', 0, 4, 'erupcao', 'Erupção', '☄️', 'active', { cd: 7, fx: { dmg: { mult: [3.4, 4.0, 4.7], ignoreArm: 0.6 } } });
  S('mago', 1, 1, 'gelo', 'Lança de Gelo', '❄️', 'active', { cd: 3, fx: { dmg: { mult: [1.3, 1.5, 1.7] }, stun: [0.2, 0.3, 0.4] } });
  S('mago', 1, 2, 'escudo', 'Escudo de Espírito', '👻', 'active', { cd: 5, fx: { shield: { pct: [0.15, 0.22, 0.3], turns: 3 } } });
  S('mago', 1, 3, 'nevasca', 'Nevasca', '🌨️', 'active', { cd: 5, fx: { dmg: { mult: [0.8, 0.95, 1.1], hits: 2 }, slow: { mult: [0.8, 0.75, 0.7], turns: 3 } } });
  S('mago', 1, 4, 'congelar', 'Congelar', '🧊', 'active', { cd: 8, fx: { dmg: { mult: 1.5 }, stun: [0.8, 0.9, 1.0] } });
  S('mago', 2, 1, 'meditacao', 'Meditação', '🧘', 'passive', { fx: { pass: { hpPct: [6, 12, 18], potion: [8, 16, 24] } } });
  S('mago', 2, 2, 'cura', 'Cura Espiritual', '💚', 'active', { cd: 5, fx: { heal: [0.18, 0.26, 0.34] } });
  S('mago', 2, 3, 'arcano', 'Poder Arcano', '🔮', 'passive', { fx: { pass: { skillDmg: [10, 20, 30] } } });
  S('mago', 2, 4, 'tempestade', 'Tempestade de Espíritos', '🌩️', 'active', { cd: 7, fx: { dmg: { mult: [0.85, 1.0, 1.15], hits: 4, vamp: 0.3 } } });

  // pré-requisito: a habilidade anterior do mesmo ramo
  TREE.forEach((d) => { d.req = d.tier > 1 ? TREE.find((x) => x.cls === d.cls && x.branch === d.branch && x.tier === d.tier - 1).id : null; });
  G.TREE = TREE;
  G.TREE_BY_ID = Object.fromEntries(TREE.map((d) => [d.id, d]));

  /* ---------- efeito por nível ---------- */
  const resolve = (v, r) => (Array.isArray(v) ? v[Math.min(v.length, r) - 1] : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, resolve(x, r)])) : v);
  // equilíbrio entre as classes (aplicado nos números mostrados): dano das habilidades e cura/escudo
  G.CLASS_TUNE = { guerreiro: { dmg: 1.25, sus: 1.15 }, arqueiro: { dmg: 0.9, sus: 1 }, mago: { dmg: 0.82, sus: 0.85 } };
  const r2 = (x) => Math.round(x * 100) / 100;
  G.skillFx = function (def, rank) {
    const fx = resolve(def.fx, Math.max(1, rank)), t = G.CLASS_TUNE[def.cls] || { dmg: 1, sus: 1 };
    if (fx.dmg) fx.dmg.mult = r2(fx.dmg.mult * t.dmg);
    if (fx.heal) fx.heal = r2(fx.heal * t.sus);
    if (fx.shield) fx.shield.pct = r2(fx.shield.pct * t.sus);
    return fx;
  };
  const pc = (x) => Math.round(x * 100);
  const sg = (n) => (n >= 0 ? '+' : '') + n;
  G.skillDesc = function (def, rank) {
    const fx = G.skillFx(def, rank), t = [];
    if (fx.dmg) {
      const d = fx.dmg; let s = `${d.mult}× de dano${d.hits > 1 ? ` em ${d.hits} golpes` : ''}`;
      if (d.ignoreArm) s += `, ignora ${pc(d.ignoreArm)}% da armadura`; if (d.critAdd) s += `, +${d.critAdd}% de crítico`;
      if (d.exec) s += `, ×${d.exec.mult} se o alvo tem menos de ${pc(d.exec.below)}% de vida`; if (d.vamp) s += `, cura ${pc(d.vamp)}% do dano`;
      t.push(s);
    }
    if (fx.dot) t.push(`${fx.dot.name}: ${pc(fx.dot.pct)}% da Força por turno, ${fx.dot.turns} turnos`);
    if (fx.stun) t.push(`${pc(fx.stun)}% de chance de atordoar (metade em chefes)`);
    if (fx.buff) { const b = fx.buff, p = []; if (b.atk) p.push(`+${pc(b.atk - 1)}% de dano`); if (b.taken) p.push(`-${pc(1 - b.taken)}% de dano recebido`); if (b.crit) p.push(`+${b.crit}% de crítico`); if (b.dodge) p.push(`+${b.dodge}% de esquiva`); t.push(`${p.join(', ')} por ${b.turns - (b.atk || b.crit ? 1 : 0)} turnos`); }
    if (fx.heal) t.push(`cura ${pc(fx.heal)}% da vida`);
    if (fx.shield) t.push(`escudo de ${pc(fx.shield.pct)}% da vida por ${fx.shield.turns} turnos`);
    if (fx.guard != null) t.push(`reduz o próximo golpe em ${pc(1 - fx.guard)}%`);
    if (fx.evade) t.push(`esquiva dos próximos ${fx.evade} ataque(s)`);
    if (fx.slow) t.push(`o inimigo causa ${pc(1 - fx.slow.mult)}% menos dano por ${fx.slow.turns} turnos`);
    if (fx.mark) t.push(`o alvo recebe +${fx.mark.pct}% de dano por ${fx.mark.turns} turnos`);
    if (fx.pass) {
      const p = fx.pass, a = [];
      if (p.hpPct) a.push(`${sg(p.hpPct)}% de Vida`); if (p.armPct) a.push(`${sg(p.armPct)}% de Armadura`); if (p.atkPct) a.push(`${sg(p.atkPct)}% de Força`);
      if (p.crit) a.push(`${sg(p.crit)} de Crítico`); if (p.critDmg) a.push(`+${pc(p.critDmg)}% de dano crítico`); if (p.vamp) a.push(`${p.vamp}% de vida roubada`);
      if (p.dodge) a.push(`${sg(p.dodge)}% de esquiva`); if (p.potion) a.push(`poções curam +${p.potion}%`); if (p.dotMult) a.push(`veneno e fogo +${p.dotMult}%`);
      if (p.poisonChance) a.push(`ataques envenenam (${pc(p.poisonChance)}%)`); if (p.skillDmg) a.push(`habilidades +${p.skillDmg}% de dano`);
      if (p.lowHp) a.push(`+${p.lowHp.pct}% de Força com menos de ${pc(p.lowHp.below)}% de vida`); if (p.lastStand) a.push(`uma vez por luta: sobrevive a um golpe fatal e cura ${pc(p.lastStand)}%`);
      t.push(a.join(', '));
    }
    const s = t.join(' · ');
    return (s.charAt(0).toUpperCase() + s.slice(1)) + (def.cd != null ? ` · recarga ${def.cd}` : '');
  };

  /* ---------- pontos e aprendizado ---------- */
  G.treeRank = (st, id) => (st.tree && st.tree[id]) || 0;
  G.skillPoints = function (st) {
    let spent = 0;
    for (const d of TREE) { const r = G.treeRank(st, d.id); for (let k = 1; k <= r; k++) spent += G.treeCost(d, k); }
    return { total: st.level, spent, free: Math.max(0, st.level - spent) };
  };
  G.canLearn = function (st, id) {
    const d = G.TREE_BY_ID[id];
    if (!d) return { ok: false, msg: 'Habilidade inválida.' };
    if (!st.cls) return { ok: false, msg: 'Escolha uma classe primeiro.' };
    if (d.cls !== st.cls) return { ok: false, msg: `Habilidade de outra classe.` };
    const cur = G.treeRank(st, id), rank = cur + 1;
    if (cur >= G.TREE_MAX_RANK) return { ok: false, msg: 'Já está no nível máximo.', max: true };
    const cost = G.treeCost(d, rank), need = G.treeReqLevel(d, rank);
    if (d.req && G.treeRank(st, d.req) < 1) return { ok: false, msg: `Aprenda antes: ${G.TREE_BY_ID[d.req].name}.`, cost, rank, locked: true };
    if (st.level < need) return { ok: false, msg: `Requer nível ${need} do herói.`, cost, rank, need };
    if (G.skillPoints(st).free < cost) return { ok: false, msg: `Faltam pontos (custa ${cost}).`, cost, rank };
    return { ok: true, cost, rank };
  };
  G.learn = function (st, id) {
    const c = G.canLearn(st, id);
    if (!c.ok) return c;
    if (!st.tree) st.tree = {};
    st.tree[id] = c.rank;
    return { ok: true, msg: `${G.TREE_BY_ID[id].name} nível ${c.rank}!`, rank: c.rank, cost: c.cost };
  };
  G.setClass = function (st, cls) {
    if (!G.CLASSES[cls]) return { ok: false, msg: 'Classe inválida.' };
    if (st.cls) return { ok: false, msg: 'Você já tem uma classe. Redefina a árvore para trocar.' };
    st.cls = cls; st.tree = {};
    G.setHp(st, Math.min(G.heroStats(st).hp, st.hp));
    return { ok: true, msg: `Você é um ${G.CLASSES[cls].name}!` };
  };
  G.respecCost = (st) => 40 * st.level;
  G.respec = function (st) {
    if (!st.cls) return { ok: false, msg: 'Nada para redefinir.' };
    const c = G.respecCost(st);
    if (st.gold < c) return { ok: false, msg: 'Ouro insuficiente.' };
    st.gold -= c; st.tree = {}; st.cls = null;
    return { ok: true, msg: 'Habilidades redefinidas. Escolha uma classe.' };
  };
  G.activeSkills = (st) => TREE.filter((d) => d.type === 'active' && G.treeRank(st, d.id) > 0 && d.cls === st.cls).map((d) => ({ id: d.id, rank: G.treeRank(st, d.id) }));

  // soma dos bônus passivos (e da classe) para o cálculo de atributos
  G.treeStats = function (st) {
    const o = { hpPct: 0, armPct: 0, atkPct: 0, crit: 0, critDmg: 0, vamp: 0, dodge: 0, potion: 0, dotMult: 0, poisonChance: 0, skillDmg: 0, lowHp: null, lastStand: 0, magic: false };
    const cl = st.cls && G.CLASSES[st.cls];
    if (cl) for (const [k, v] of Object.entries(cl.bonus)) { if (k === 'magic') o.magic = !!v; else o[k] += v; }
    for (const d of TREE) {
      const r = G.treeRank(st, d.id);
      if (!r || d.type !== 'passive' || d.cls !== st.cls) continue;
      const p = G.skillFx(d, r).pass || {};
      for (const [k, v] of Object.entries(p)) { if (k === 'lowHp') o.lowHp = v; else if (k === 'lastStand') o.lastStand = Math.max(o.lastStand, v); else o[k] += v; }
    }
    return o;
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = G;
})(typeof window !== 'undefined' ? window : globalThis);
