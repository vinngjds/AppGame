/* Era da Pedra — núcleo do jogo (regras puras, sem DOM). Funciona no navegador e no Node. */
(function (root) {
  'use strict';
  const G = {};
  G.rng = Math.random;
  const R = () => G.rng();
  const rand = (a, b) => a + R() * (b - a);
  const randInt = (a, b) => Math.floor(rand(a, b + 1));
  const pick = (arr) => arr[Math.floor(R() * arr.length)];

  G.MAX_LEVEL = 50;
  G.KILLS_PER_BOSS = 3;
  G.MAX_ENERGY = 10;
  G.ENERGY_SECS = 60;      // 1 encontro de treino a cada 60 s
  G.HP_REGEN_SECS = 150;   // vida cheia em 150 s fora de combate
  G.BAG_SIZE = 30;
  G.MAX_PLUS = 10;

  /* ---------- Raridades e slots ---------- */
  G.RARITIES = [
    { id: 0, name: 'Comum',    mult: 1.0,  color: '#b9a98c', w: 60 },
    { id: 1, name: 'Incomum',  mult: 1.25, color: '#7fb95a', w: 27 },
    { id: 2, name: 'Raro',     mult: 1.6,  color: '#4f9be0', w: 10 },
    { id: 3, name: 'Épico',    mult: 2.1,  color: '#b06be0', w: 2.6 },
    { id: 4, name: 'Lendário', mult: 2.8,  color: '#f0a824', w: 0.4 },
  ];
  G.SLOTS = {
    arma:     { name: 'Arma',     icon: '🪓' },
    elmo:     { name: 'Elmo',     icon: '💀' },
    armadura: { name: 'Armadura', icon: '🦴' },
    botas:    { name: 'Botas',    icon: '🥾' },
    amuleto:  { name: 'Amuleto',  icon: '📿' },
  };
  G.SLOT_ORDER = ['arma', 'elmo', 'armadura', 'botas', 'amuleto'];

  // Nomes por faixa de nível (0: 1-9, 1: 10-19, 2: 20-29, 3: 30-39, 4: 40+)
  const BASES = {
    arma:     [['Clava de Madeira', '🏏'], ['Lança de Pedra', '🔱'], ['Machado de Sílex', '🪓'], ['Maça de Osso', '🦴'], ['Tacape de Mamute', '⚒️']],
    elmo:     [['Capuz de Pele', '🧢'], ['Elmo de Crânio', '💀'], ['Elmo de Presas', '🦷'], ['Elmo de Chifres', '🐂'], ['Elmo do Mamute', '🦣']],
    armadura: [['Tanga de Couro', '🩲'], ['Peitoral de Pele', '🦺'], ['Armadura de Ossos', '🦴'], ['Couraça de Casco', '🐢'], ['Manto do Mamute', '🧥']],
    botas:    [['Sandálias de Palha', '🩴'], ['Botas de Couro', '🥾'], ['Botas de Pele', '👢'], ['Botas de Garra', '🦶'], ['Botas Trovejantes', '⚡']],
    amuleto:  [['Dente de Lobo', '🐺'], ['Colar de Conchas', '🐚'], ['Totem de Pedra', '🗿'], ['Olho do Espírito', '🧿'], ['Coração do Vulcão', '🌋']],
  };
  const PREFIX = ['', 'Reforçad', 'Selvagem', 'Ancestral', 'Primordial'];
  const tierOf = (lvl) => Math.min(4, Math.floor(lvl / 10));
  const uid = () => Math.random().toString(36).slice(2, 10);

  function rollRarity(bonus = 0, min = 0) {
    // bonus desloca a chance para raridades maiores
    const ws = G.RARITIES.map((r) => (r.id === 0 ? r.w : r.w * (1 + bonus * r.id)));
    const tot = ws.reduce((a, b) => a + b, 0);
    let x = R() * tot;
    for (let i = 0; i < ws.length; i++) { x -= ws[i]; if (x <= 0) return Math.max(i, min); }
    return Math.max(0, min);
  }

  /* ---------- Itens ---------- */
  G.makeItem = function (slot, ilvl, rarity) {
    const rar = G.RARITIES[rarity];
    const b = (4 + 2.2 * ilvl) * rar.mult;
    const t = tierOf(ilvl);
    let st = { atk: 0, hp: 0, arm: 0, crit: 0 };
    if (slot === 'arma') st = { atk: b * 0.9, hp: 0, arm: 0, crit: rarity * 1.5 };
    if (slot === 'elmo') st = { atk: 0, hp: b * 1.5, arm: b * 0.35, crit: 0 };
    if (slot === 'armadura') st = { atk: 0, hp: b * 2.2, arm: b * 0.5, crit: 0 };
    if (slot === 'botas') st = { atk: b * 0.25, hp: b * 1.0, arm: b * 0.3, crit: 0 };
    if (slot === 'amuleto') st = { atk: b * 0.3, hp: b * 1.0, arm: b * 0.2, crit: 2 + rarity * 2 };
    const [base, icon] = BASES[slot][t];
    const rt = rarity >= 3 ? ' ' + ['', '', '', 'Ancestral', 'Primordial'][rarity] : '';
    return {
      id: uid(), slot, ilvl, rarity, plus: 0, icon,
      name: base + rt,
      base: { atk: Math.round(st.atk), hp: Math.round(st.hp), arm: Math.round(st.arm), crit: +st.crit.toFixed(1) },
    };
  };
  G.itemStats = function (it) {
    const m = 1 + 0.1 * (it.plus || 0);
    return { atk: Math.round(it.base.atk * m), hp: Math.round(it.base.hp * m), arm: Math.round(it.base.arm * m), crit: +(it.base.crit * (1 + 0.05 * (it.plus || 0))).toFixed(1) };
  };
  G.itemScore = function (it) {
    if (!it) return 0;
    const s = G.itemStats(it);
    return s.atk * 2.2 + s.hp * 0.22 + s.arm * 2 + s.crit * 3;
  };
  G.itemPrice = function (it) {
    const rar = G.RARITIES[it.rarity];
    const b = 4 + 2.2 * it.ilvl;
    return Math.round(b * rar.mult * rar.mult * 3 * (1 + 0.25 * (it.plus || 0)));
  };
  G.sellPrice = (it) => Math.max(1, Math.round(G.itemPrice(it) * 0.35));
  G.upgradeCost = (it) => Math.round((4 + 2.2 * it.ilvl) * 2.2 * (it.plus + 1) * (1 + it.rarity * 0.35));

  /* ---------- Herói ---------- */
  G.xpToNext = (L) => Math.round(30 * Math.pow(L, 1.5));

  G.newState = function (name) {
    const now = Date.now();
    const st = {
      v: 1, name: name || 'Herói', level: 1, xp: 0, hp: 1, hpAt: now,
      gold: 60, kills: 0, bossNo: 1, totalKills: 0, trophies: [], bossesBeaten: 0,
      bag: [], equipped: { arma: null, elmo: null, armadura: null, botas: null, amuleto: null },
      potions: { small: 3, large: 0 }, energy: G.MAX_ENERGY, energyAt: now,
      shop: null, finished: false, createdAt: now,
    };
    st.equipped.arma = G.makeItem('arma', 1, 0);
    st.hp = G.heroStats(st).hp;
    G.refreshShop(st);
    return st;
  };

  G.heroStats = function (st) {
    const L = st.level;
    const s = { atk: 10 + 3 * L, hp: 50 + 14 * L, arm: 5 + 2 * L, crit: 5 };
    for (const slot of G.SLOT_ORDER) {
      const it = st.equipped[slot];
      if (!it) continue;
      const i = G.itemStats(it);
      s.atk += i.atk; s.hp += i.hp; s.arm += i.arm; s.crit += i.crit;
    }
    s.crit = Math.min(60, s.crit);
    return s;
  };

  G.syncTime = function (st, now = Date.now()) {
    const max = G.heroStats(st).hp;
    const dt = Math.max(0, (now - st.hpAt) / 1000);
    st.hp = Math.min(max, st.hp + (dt * max) / G.HP_REGEN_SECS);
    st.hpAt = now;
    if (st.energy < G.MAX_ENERGY) {
      const gain = Math.floor((now - st.energyAt) / 1000 / G.ENERGY_SECS);
      if (gain > 0) { st.energy = Math.min(G.MAX_ENERGY, st.energy + gain); st.energyAt += gain * G.ENERGY_SECS * 1000; }
    } else st.energyAt = now;
    if (st.hp > max) st.hp = max;
  };
  G.setHp = (st, hp) => { st.hp = Math.max(0, Math.min(G.heroStats(st).hp, hp)); st.hpAt = Date.now(); };

  /* ---------- Inimigos ---------- */
  G.MODS = {
    feroz:       { name: 'Feroz',       icon: '🔥', desc: '+25% de força, menos vida' },
    veloz:       { name: 'Veloz',       icon: '💨', desc: '30% de chance de atacar duas vezes' },
    couracado:   { name: 'Couraçado',   icon: '🛡️', desc: 'Armadura muito alta' },
    venenoso:    { name: 'Venenoso',    icon: '☠️', desc: 'Ataques podem envenenar' },
    regenerador: { name: 'Regenerador', icon: '💚', desc: 'Recupera vida a cada turno' },
    esmagador:   { name: 'Esmagador',   icon: '💫', desc: 'Pode atordoar o herói' },
  };
  // [nome, emoji, modalidade]
  const POOL = [
    [['Rato Gigante', '🐀', 'veloz'], ['Lobo Jovem', '🐺', 'feroz'], ['Cobra da Mata', '🐍', 'venenoso'], ['Morcego da Caverna', '🦇', 'veloz']],
    [['Javali Selvagem', '🐗', 'esmagador'], ['Hiena Faminta', '🐕', 'feroz'], ['Macaco Feroz', '🐒', 'veloz'], ['Aranha Gigante', '🕷️', 'venenoso']],
    [['Urso das Cavernas', '🐻', 'esmagador'], ['Tigre Caçador', '🐅', 'feroz'], ['Crocodilo do Pântano', '🐊', 'couracado'], ['Bisão Enraivecido', '🐃', 'esmagador']],
    [['Rinoceronte Lanudo', '🦏', 'couracado'], ['Gorila Ancestral', '🦍', 'esmagador'], ['Raptor Veloz', '🦖', 'veloz'], ['Escorpião Gigante', '🦂', 'venenoso']],
    [['Mamute Jovem', '🦣', 'regenerador'], ['Tigre Dentes-de-Sabre', '🐯', 'feroz'], ['Guerreiro Rival', '🧟', 'couracado'], ['Dinossauro Chifrudo', '🦕', 'esmagador']],
    [['Pterodáctilo', '🦅', 'veloz'], ['Besta de Lava', '🌋', 'regenerador'], ['Fera Primordial', '👹', 'feroz'], ['Tiranete', '🦖', 'esmagador']],
  ];
  G.BOSSES = [
    { no: 1,  name: 'Lobo Cinzento Alfa',      emoji: '🐺', mods: ['feroz', 'veloz'],            trophy: 'Presa do Alfa',          tIcon: '🦷' },
    { no: 2,  name: 'Javali Chifre-de-Ferro',  emoji: '🐗', mods: ['esmagador', 'couracado'],    trophy: 'Chifre de Ferro',        tIcon: '🐂' },
    { no: 3,  name: 'Grande Urso da Caverna',  emoji: '🐻', mods: ['esmagador', 'feroz'],        trophy: 'Garra do Urso',          tIcon: '🐾' },
    { no: 4,  name: 'Víbora das Sombras',      emoji: '🐍', mods: ['venenoso', 'veloz'],         trophy: 'Escama Sombria',         tIcon: '🐉' },
    { no: 5,  name: 'Tigre Dentes-de-Sabre',   emoji: '🐯', mods: ['feroz', 'veloz'],            trophy: 'Dente de Sabre',         tIcon: '🗡️' },
    { no: 6,  name: 'Rei Macaco Gigante',      emoji: '🦍', mods: ['esmagador', 'regenerador'],  trophy: 'Coroa de Ossos',         tIcon: '👑' },
    { no: 7,  name: 'Rinoceronte Blindado',    emoji: '🦏', mods: ['couracado', 'esmagador'],    trophy: 'Chifre Blindado',        tIcon: '🛡️' },
    { no: 8,  name: 'Aranha Rainha',           emoji: '🕷️', mods: ['venenoso', 'regenerador'],   trophy: 'Teia Dourada',           tIcon: '🕸️' },
    { no: 9,  name: 'Mamute Ancestral',        emoji: '🦣', mods: ['regenerador', 'esmagador'],  trophy: 'Presa do Mamute',        tIcon: '🦣' },
    { no: 10, name: 'Pterodáctilo Tempestade', emoji: '🦅', mods: ['veloz', 'feroz'],            trophy: 'Pena da Tempestade',     tIcon: '🪶' },
    { no: 11, name: 'Anquilossauro Pétreo',    emoji: '🐢', mods: ['couracado', 'regenerador'],  trophy: 'Martelo de Cauda',       tIcon: '🔨' },
    { no: 12, name: 'Xamã Sombrio',            emoji: '👹', mods: ['venenoso', 'esmagador'],     trophy: 'Máscara Tribal',         tIcon: '🎭' },
    { no: 13, name: 'Rei dos Raptores',        emoji: '🦖', mods: ['veloz', 'venenoso'],         trophy: 'Garra Dourada',          tIcon: '🥇' },
    { no: 14, name: 'Dragão de Lava',          emoji: '🐉', mods: ['feroz', 'regenerador'],      trophy: 'Coração de Magma',       tIcon: '🌋' },
    { no: 15, name: 'Tiranossauro Rei',        emoji: '👑', mods: ['feroz', 'esmagador'],        trophy: 'Coroa do Rei Rex',       tIcon: '🏆' },
  ];

  G.makeMonster = function (level, boss) {
    const L = Math.max(1, level);
    let m = { atk: 9 + 3.4 * L, hp: 36 + 15 * L, arm: 2 + 1.8 * L };
    let name, emoji, mods;
    if (boss) {
      const b = boss;
      name = b.name; emoji = b.emoji; mods = b.mods.slice();
      m.atk *= 1.25 + 0.005 * L; m.hp *= 2.2 + 0.04 * L; m.arm *= 1.2;
    } else {
      const tier = Math.min(POOL.length - 1, Math.floor((L - 1) / 8));
      const tr = R() < 0.3 && tier > 0 ? tier - 1 : tier;
      const [n, e, md] = pick(POOL[tr]);
      name = n; emoji = e; mods = [md];
      const v = rand(0.92, 1.08);
      m.atk *= v; m.hp *= v;
    }
    for (const md of mods) {
      if (md === 'feroz') { m.atk *= 1.25; m.hp *= 0.85; }
      if (md === 'couracado') { m.arm *= 1.6; m.atk *= 0.9; }
      if (md === 'esmagador') { m.hp *= 1.1; }
    }
    return { name, emoji, level: L, boss: !!boss, bossNo: boss ? boss.no : 0, mods,
      atk: Math.round(m.atk), hp: Math.round(m.hp), maxHp: Math.round(m.hp), arm: Math.round(m.arm) };
  };

  /* ---------- Combate ---------- */
  const reduce = (arm) => 100 / (100 + arm * 1.5);
  G.HEAVY_CD = 3;

  G.startFight = function (st, mon, opts = {}) {
    const h = G.heroStats(st);
    return {
      mon, mode: opts.mode || 'story', // story | boss | training
      hero: { hp: Math.round(st.hp), max: h.hp, atk: h.atk, arm: h.arm, crit: h.crit },
      turn: 0, heavyCd: 0, stunned: false, poison: 0, poisonDmg: 0,
      over: false, won: false, fled: false, potionsUsed: 0, events: [],
    };
  };

  function snap(f) { return { h: Math.max(0, Math.round(f.hero.hp)), m: Math.max(0, Math.round(f.mon.hp)) }; }
  function ev(f, kind, text, extra) { const e = Object.assign({ kind, text }, snap(f), extra || {}); f.events.push(e); return e; }

  function monsterTurn(f) {
    const m = f.mon;
    if (m.mods.includes('regenerador') && m.hp > 0) {
      const heal = Math.round(m.maxHp * 0.05);
      m.hp = Math.min(m.maxHp, m.hp + heal);
      ev(f, 'heal', `${m.name} recupera ${heal} de vida.`, { who: 'mon' });
    }
    const swings = m.mods.includes('veloz') && R() < 0.3 ? 2 : 1;
    for (let i = 0; i < swings; i++) {
      let dmg = m.atk * rand(0.85, 1.15) * reduce(f.hero.arm) * (swings === 2 ? 0.7 : 1);
      dmg = Math.max(1, Math.round(dmg));
      f.hero.hp -= dmg;
      ev(f, 'hit', `${m.name} ataca e causa ${dmg} de dano.`, { who: 'mon', dmg });
      if (f.hero.hp <= 0) { f.hero.hp = 0; break; }
      if (m.mods.includes('venenoso') && R() < 0.35) {
        f.poison = 3; f.poisonDmg = Math.max(1, Math.round(m.atk * 0.12));
        ev(f, 'info', `☠️ Você foi envenenado!`);
      }
      if (m.mods.includes('esmagador') && R() < 0.18 && !f.stunned) {
        f.stunned = true; ev(f, 'info', `💫 Você foi atordoado!`);
      }
    }
    if (f.hero.hp > 0 && f.poison > 0) {
      f.hero.hp -= f.poisonDmg; f.poison--;
      ev(f, 'hit', `☠️ O veneno causa ${f.poisonDmg} de dano.`, { who: 'mon', dmg: f.poisonDmg });
    }
    if (f.hero.hp <= 0) { f.hero.hp = 0; f.over = true; f.won = false; ev(f, 'end', 'Você caiu em combate...'); }
  }

  // action: attack | heavy | potion-small | potion-large | flee
  G.heroAction = function (st, f, action) {
    if (f.over) return [];
    const start = f.events.length;
    const m = f.mon;
    f.turn++;
    if (f.stunned) {
      f.stunned = false; ev(f, 'info', '💫 Você está atordoado e perde o turno!');
    } else if (action === 'flee') {
      if (f.mode === 'boss') { ev(f, 'info', 'Não há como fugir de um chefe!'); f.turn--; return f.events.slice(start); }
      if (R() < 0.6) { f.over = true; f.fled = true; ev(f, 'end', 'Você fugiu da batalha.'); return f.events.slice(start); }
      ev(f, 'info', 'A fuga falhou!');
    } else if (action === 'potion-small' || action === 'potion-large') {
      const key = action === 'potion-small' ? 'small' : 'large';
      if (st.potions[key] <= 0) { f.turn--; ev(f, 'info', 'Você não tem essa poção.'); return f.events.slice(start); }
      st.potions[key]--; f.potionsUsed++;
      const heal = Math.round(f.hero.max * (key === 'small' ? 0.35 : 0.65));
      const before = f.hero.hp;
      f.hero.hp = Math.min(f.hero.max, f.hero.hp + heal);
      ev(f, 'heal', `🧪 Você bebe uma poção e recupera ${Math.round(f.hero.hp - before)} de vida.`, { who: 'hero' });
    } else {
      const heavy = action === 'heavy';
      if (heavy && f.heavyCd > 0) { f.turn--; ev(f, 'info', 'Golpe Forte ainda está recarregando.'); return f.events.slice(start); }
      let dmg = f.hero.atk * rand(0.85, 1.15) * reduce(m.arm) * (heavy ? 1.8 : 1);
      const crit = R() * 100 < f.hero.crit;
      if (crit) dmg *= 1.75;
      dmg = Math.max(1, Math.round(dmg));
      m.hp -= dmg;
      if (heavy) f.heavyCd = G.HEAVY_CD - 1;
      ev(f, 'hit', `${heavy ? '💥 Golpe Forte' : '⚔️ Você ataca'}${crit ? ' CRÍTICO' : ''}: ${dmg} de dano em ${m.name}.`, { who: 'hero', dmg, crit });
      if (m.hp <= 0) { m.hp = 0; f.over = true; f.won = true; ev(f, 'end', `${m.name} foi derrotado!`); }
    }
    if (f.heavyCd > 0 && action !== 'heavy') f.heavyCd--;
    if (!f.over) monsterTurn(f);
    return f.events.slice(start);
  };

  /* ---------- Recompensas ---------- */
  G.addItem = function (st, it) {
    if (st.bag.length >= G.BAG_SIZE) return false;
    st.bag.push(it); return true;
  };

  function giveXp(st, xp) {
    const levels = [];
    if (st.level >= G.MAX_LEVEL) return levels;
    st.xp += xp;
    while (st.level < G.MAX_LEVEL && st.xp >= G.xpToNext(st.level)) {
      st.xp -= G.xpToNext(st.level); st.level++; levels.push(st.level);
    }
    if (st.level >= G.MAX_LEVEL) st.xp = 0;
    if (levels.length) { G.setHp(st, G.heroStats(st).hp); G.refreshShop(st); }
    return levels;
  }

  // Aplica o resultado de uma luta ao estado. Retorna relatório para a UI.
  G.finishFight = function (st, f) {
    const rep = { won: f.won, fled: f.fled, xp: 0, gold: 0, items: [], lost: [], levels: [], trophy: null, bossNo: 0, bagFull: false, finishedGame: false };
    G.setHp(st, f.won ? f.hero.hp : Math.max(1, Math.round(f.hero.max * 0.1)));
    if (f.fled || !f.won) {
      if (!f.won && !f.fled) {
        const loss = Math.min(st.gold, Math.round(st.gold * 0.1));
        st.gold -= loss; rep.gold = -loss;
      }
      return rep;
    }
    const m = f.mon, L = st.level;
    const train = f.mode === 'training';
    const boss = f.mode === 'boss';
    rep.xp = Math.round(G.xpToNext(L) * (boss ? 1.0 : train ? 0.25 : 0.4));
    rep.gold = Math.round((6 + 3 * L) * rand(0.8, 1.2) * (boss ? 6 : train ? 0.8 : 1));
    st.gold += rep.gold; st.totalKills++;

    // Itens
    const drops = [];
    if (boss) {
      const no = m.bossNo;
      const min = no <= 4 ? 2 : no <= 9 ? 3 : 3;
      const legChance = no <= 4 ? 0 : no <= 9 ? 0.25 : 0.6;
      const slot1 = pick(G.SLOT_ORDER), slot2 = pick(G.SLOT_ORDER);
      drops.push(G.makeItem(slot1, m.level, R() < legChance ? 4 : Math.max(min, rollRarity(0.5, min))));
      if (R() < 0.5) drops.push(G.makeItem(slot2, m.level, Math.max(min - 1, rollRarity(0.5, min - 1))));
      st.potions.large += 1;
    } else if (R() < (train ? 0.3 : 0.4)) {
      drops.push(G.makeItem(pick(G.SLOT_ORDER), m.level, rollRarity(L / 25)));
    }
    if (R() < 0.18) st.potions.small++;
    for (const it of drops) {
      if (G.addItem(st, it)) rep.items.push(it);
      else { const p = G.sellPrice(it); st.gold += p; rep.gold += p; rep.lost.push(it); rep.bagFull = true; }
    }

    // Progressão
    if (f.mode === 'story') {
      st.kills++;
    } else if (boss) {
      const b = G.BOSSES[m.bossNo - 1];
      if (!st.trophies.includes(b.no)) st.trophies.push(b.no);
      st.bossesBeaten = st.trophies.length;
      rep.trophy = b; rep.bossNo = b.no;
      if (st.bossNo < G.BOSSES.length) { st.bossNo++; st.kills = 0; }
      else { st.kills = 0; if (!st.finished) { st.finished = true; rep.finishedGame = true; } }
    }
    rep.levels = giveXp(st, rep.xp);
    return rep;
  };

  /* ---------- Fluxo da história ---------- */
  G.bossReady = (st) => st.kills >= G.KILLS_PER_BOSS;
  G.nextStoryMonster = function (st) {
    if (G.bossReady(st)) {
      const b = G.BOSSES[Math.min(st.bossNo, G.BOSSES.length) - 1];
      return { mon: G.makeMonster(st.level + 1, b), mode: 'boss' };
    }
    return { mon: G.makeMonster(st.level), mode: 'story' };
  };
  G.trainingMonster = (st) => G.makeMonster(st.level);

  /* ---------- Loja e ferreiro ---------- */
  G.refreshShop = function (st) {
    const L = st.level, eq = [], am = [];
    const roll = () => (R() < 0.12 ? 2 : R() < 0.4 ? 1 : 0);
    for (const slot of ['arma', 'arma', 'elmo', 'armadura', 'armadura', 'botas']) eq.push(G.makeItem(slot, L, roll()));
    for (let i = 0; i < 3; i++) am.push(G.makeItem('amuleto', L, roll() + (R() < 0.08 ? 1 : 0)));
    st.shop = { level: L, equip: eq, amulet: am };
  };
  G.shopRefreshCost = (st) => 20 + st.level * 6;
  G.potionPrice = (st, kind) => Math.round((15 + 4 * st.level) * (kind === 'large' ? 2.4 : 1));

  G.buyItem = function (st, id) {
    const list = st.shop.equip.concat(st.shop.amulet);
    const it = list.find((x) => x.id === id);
    if (!it) return { ok: false, msg: 'Item indisponível.' };
    const p = G.itemPrice(it);
    if (st.gold < p) return { ok: false, msg: 'Conchas insuficientes.' };
    if (st.bag.length >= G.BAG_SIZE) return { ok: false, msg: 'Baú cheio!' };
    st.gold -= p; st.bag.push(it);
    st.shop.equip = st.shop.equip.filter((x) => x.id !== id);
    st.shop.amulet = st.shop.amulet.filter((x) => x.id !== id);
    return { ok: true, msg: `Comprou ${it.name}.` };
  };
  G.buyPotion = function (st, kind) {
    const p = G.potionPrice(st, kind);
    if (st.gold < p) return { ok: false, msg: 'Conchas insuficientes.' };
    st.gold -= p; st.potions[kind]++;
    return { ok: true, msg: 'Poção comprada.' };
  };
  G.findItem = function (st, id) {
    const i = st.bag.findIndex((x) => x.id === id);
    if (i >= 0) return { it: st.bag[i], where: 'bag', i };
    for (const s of G.SLOT_ORDER) if (st.equipped[s] && st.equipped[s].id === id) return { it: st.equipped[s], where: 'eq', slot: s };
    return null;
  };
  G.equip = function (st, id) {
    const f = G.findItem(st, id);
    if (!f || f.where !== 'bag') return false;
    const it = f.it, old = st.equipped[it.slot];
    st.bag.splice(f.i, 1);
    if (old) st.bag.push(old);
    st.equipped[it.slot] = it;
    const max = G.heroStats(st).hp; if (st.hp > max) st.hp = max;
    return true;
  };
  G.unequip = function (st, slot) {
    const it = st.equipped[slot];
    if (!it || st.bag.length >= G.BAG_SIZE) return false;
    st.equipped[slot] = null; st.bag.push(it);
    const max = G.heroStats(st).hp; if (st.hp > max) st.hp = max;
    return true;
  };
  G.sell = function (st, id) {
    const f = G.findItem(st, id);
    if (!f || f.where !== 'bag') return 0;
    const p = G.sellPrice(f.it);
    st.bag.splice(f.i, 1); st.gold += p; return p;
  };
  G.upgrade = function (st, id) {
    const f = G.findItem(st, id);
    if (!f) return { ok: false, msg: 'Item não encontrado.' };
    const it = f.it;
    if (it.plus >= G.MAX_PLUS) return { ok: false, msg: 'Já está no máximo.' };
    const c = G.upgradeCost(it);
    if (st.gold < c) return { ok: false, msg: 'Conchas insuficientes.' };
    st.gold -= c; it.plus++;
    return { ok: true, msg: `${it.name} agora é +${it.plus}!` };
  };

  /* ---------- Salvamento ---------- */
  G.KEY = 'era-da-pedra-save-v1';
  G.save = (st) => { try { localStorage.setItem(G.KEY, JSON.stringify(st)); } catch (e) { /* ignore */ } };
  G.load = function () {
    try { const s = localStorage.getItem(G.KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; }
  };
  G.wipe = () => { try { localStorage.removeItem(G.KEY); } catch (e) { /* ignore */ } };

  root.G = G;
  if (typeof module !== 'undefined' && module.exports) module.exports = G;
})(typeof window !== 'undefined' ? window : globalThis);
