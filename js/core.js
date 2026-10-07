/* Era da Pedra v2 — núcleo do jogo (regras puras, sem DOM). Funciona no navegador e no Node. */
(function (root) {
  'use strict';
  const G = {};
  G.rng = Math.random;
  const R = () => G.rng();
  const rand = (a, b) => a + R() * (b - a);
  const pick = (arr) => arr[Math.floor(R() * arr.length)];
  const r1 = (n) => Math.round(n * 10) / 10;

  G.STATE_V = 2;
  G.MAX_LEVEL = 40;
  G.KILLS_PER_BOSS = 3;           // 2 feras + 1 semi-chefe, depois o chefe
  G.MAX_ENERGY = 12;
  G.ENERGY_SECS = 240;            // 1 encontro a cada 4 min
  G.HP_REGEN_SECS = 420;          // vida cheia em 7 min
  G.BATTLE_CD = 25;               // segundos entre batalhas
  G.BAG_START = 30;
  G.BAG_MAX = 60;
  G.MAX_PLUS = 10;
  G.SHOP_SECS = 20 * 60;          // estoque renova a cada 20 min
  G.ENERGY_COST = { story: 1, semi: 1, boss: 2, training: 1 };

  /* ---------- Raridades e slots ---------- */
  G.RARITIES = [
    { id: 0, name: 'Comum',    mult: 1.0,  color: '#b9a98c', w: 55 },
    { id: 1, name: 'Incomum',  mult: 1.25, color: '#7fb95a', w: 30 },
    { id: 2, name: 'Raro',     mult: 1.6,  color: '#4f9be0', w: 12 },
    { id: 3, name: 'Épico',    mult: 2.1,  color: '#b06be0', w: 2.7 },
    { id: 4, name: 'Lendário', mult: 2.8,  color: '#f0a824', w: 0.3 },
  ];
  G.SLOTS = {
    arma:     { name: 'Arma',     icon: '🪓' },
    escudo:   { name: 'Escudo',   icon: '🛡️' },
    elmo:     { name: 'Elmo',     icon: '💀' },
    armadura: { name: 'Armadura', icon: '🦴' },
    luvas:    { name: 'Luvas',    icon: '🧤' },
    botas:    { name: 'Botas',    icon: '🥾' },
    amuleto:  { name: 'Amuleto',  icon: '📿' },
    runa:     { name: 'Runa',     icon: '🔶' },
  };
  G.SLOT_ORDER = ['arma', 'escudo', 'elmo', 'armadura', 'luvas', 'botas', 'amuleto'];
  G.RUNE_SLOTS = 3;

  const BASES = {
    arma:     [['Clava de Madeira', '🏏'], ['Lança de Pedra', '🔱'], ['Machado de Sílex', '🪓'], ['Maça de Osso', '🦴'], ['Tacape de Mamute', '⚒️']],
    escudo:   [['Escudo de Casca', '🪵'], ['Escudo de Couro', '🛡️'], ['Escudo de Pedra', '🪨'], ['Escudo de Casco', '🐢'], ['Escudo do Titã', '🗿']],
    elmo:     [['Capuz de Pele', '🧢'], ['Elmo de Crânio', '💀'], ['Elmo de Presas', '🦷'], ['Elmo de Chifres', '🐂'], ['Elmo do Mamute', '🦣']],
    armadura: [['Tanga de Couro', '🩲'], ['Peitoral de Pele', '🦺'], ['Armadura de Ossos', '🦴'], ['Couraça de Casco', '🐢'], ['Manto do Mamute', '🧥']],
    luvas:    [['Faixas de Pele', '🧤'], ['Luvas de Couro', '🧤'], ['Manoplas de Osso', '🦴'], ['Garras de Fera', '🐾'], ['Punhos do Vulcão', '🌋']],
    botas:    [['Sandálias de Palha', '🩴'], ['Botas de Couro', '🥾'], ['Botas de Pele', '👢'], ['Botas de Garra', '🦶'], ['Botas Trovejantes', '⚡']],
    amuleto:  [['Dente de Lobo', '🐺'], ['Colar de Conchas', '🐚'], ['Totem de Pedra', '🗿'], ['Olho do Espírito', '🧿'], ['Coração do Vulcão', '🌋']],
  };
  // Runas: bônus percentuais / especiais
  G.RUNES = {
    forca:  { name: 'Força',        icon: '🔶', unit: '% de Força',        f: 1.0 },
    vida:   { name: 'Vida',         icon: '🔴', unit: '% de Vida',         f: 1.2 },
    pedra:  { name: 'Pedra',        icon: '🔷', unit: '% de Armadura',    f: 1.1 },
    sorte:  { name: 'Sorte',        icon: '🍀', unit: '% de Crítico',     f: 0.6 },
    sangue: { name: 'Sangue',       icon: '🩸', unit: '% de Vida Roubada', f: 0.45 },
  };
  const RUNE_NAMES = ['Menor', 'Antiga', 'Ancestral', 'Primordial', 'Divina'];
  const tierOf = (lvl) => Math.min(4, Math.floor(lvl / 8));
  const uid = () => Math.random().toString(36).slice(2, 10);

  function rollRarity(bonus = 0, min = 0) {
    const ws = G.RARITIES.map((r) => (r.id === 0 ? r.w : r.w * (1 + bonus * r.id)));
    const tot = ws.reduce((a, b) => a + b, 0);
    let x = R() * tot;
    for (let i = 0; i < ws.length; i++) { x -= ws[i]; if (x <= 0) return Math.max(i, min); }
    return Math.max(0, min);
  }
  G.rollRarity = rollRarity;

  /* ---------- Itens ---------- */
  const SHAPE = {
    arma:     { atk: 0.85, crit: 1 },
    escudo:   { arm: 0.45, hp: 0.9 },
    elmo:     { hp: 1.1, arm: 0.25 },
    armadura: { hp: 1.7, arm: 0.4 },
    luvas:    { atk: 0.35, arm: 0.12, crit: 0.5 },
    botas:    { hp: 0.7, arm: 0.2, atk: 0.1 },
    amuleto:  { atk: 0.25, hp: 0.8, arm: 0.15, crit: 2 },
  };
  const budget = (ilvl, rarity) => (4 + 2.2 * ilvl) * G.RARITIES[rarity].mult;

  G.makeItem = function (slot, ilvl, rarity) {
    const sh = SHAPE[slot], b = budget(ilvl, rarity);
    const [base, icon] = BASES[slot][tierOf(ilvl)];
    const rt = rarity >= 3 ? ' ' + ['', '', '', 'Ancestral', 'Primordial'][rarity] : '';
    const crit = (sh.crit || 0) * (slot === 'amuleto' ? 1 + rarity : 1.2 * rarity);
    return {
      id: uid(), slot, ilvl, rarity, plus: 0, icon, lock: false, pity: 0,
      name: base + rt,
      base: { atk: Math.round(b * (sh.atk || 0)), hp: Math.round(b * (sh.hp || 0)), arm: Math.round(b * (sh.arm || 0)), crit: r1(crit) },
    };
  };
  G.makeRune = function (ilvl, rarity, type) {
    type = type || pick(Object.keys(G.RUNES));
    const def = G.RUNES[type];
    let v = (1.5 + ilvl * 0.12) * G.RARITIES[rarity].mult * def.f;
    if (type === 'sorte') v = Math.min(v, 12);
    if (type === 'sangue') v = Math.min(v, 8);
    return { id: uid(), slot: 'runa', ilvl, rarity, plus: 0, lock: false, pity: 0, icon: def.icon,
      name: `Runa ${RUNE_NAMES[rarity]} da ${def.name}`, rune: { t: type, v: r1(v) }, base: { atk: 0, hp: 0, arm: 0, crit: 0 } };
  };
  const PLUS_STEP = 0.12;
  G.itemStats = function (it) {
    const m = 1 + PLUS_STEP * (it.plus || 0);
    return { atk: Math.round(it.base.atk * m), hp: Math.round(it.base.hp * m), arm: Math.round(it.base.arm * m), crit: r1(it.base.crit * (1 + 0.06 * (it.plus || 0))) };
  };
  G.runeValue = (it) => r1(it.rune.v * (1 + PLUS_STEP * (it.plus || 0)));
  G.itemScore = function (it) {
    if (!it) return 0;
    if (it.rune) return G.runeValue(it) * 9;
    const s = G.itemStats(it);
    return s.atk * 2.2 + s.hp * 0.22 + s.arm * 2 + s.crit * 3;
  };
  G.itemPrice = function (it) {
    const rar = G.RARITIES[it.rarity];
    return Math.round((4 + 2.2 * it.ilvl) * rar.mult * rar.mult * 3.2 * (1 + 0.3 * (it.plus || 0)));
  };
  G.sellPrice = (it) => Math.max(1, Math.round(G.itemPrice(it) * 0.3));
  G.shopPrice = (st, it) => Math.round(G.itemPrice(it) * (st.shop && st.shop.deal === it.id ? 0.75 : 1));

  /* ---------- Habilidades (treinamento) ---------- */
  G.SKILLS = {
    forca:    { name: 'Força Bruta',     icon: '💪', max: 10, desc: (r) => `+${3 * r}% de Força` },
    vigor:    { name: 'Vigor',           icon: '❤️', max: 10, desc: (r) => `+${4 * r}% de Vida` },
    casca:    { name: 'Couraça Natural', icon: '🪨', max: 10, desc: (r) => `+${4 * r}% de Armadura` },
    olho:     { name: 'Olho de Águia',   icon: '🎯', max: 8,  desc: (r) => `+${r}% de Crítico` },
    letal:    { name: 'Golpe Mortal',    icon: '☠️', max: 5,  desc: (r) => `+${8 * r}% de dano crítico` },
    golpe:    { name: 'Mestre do Golpe', icon: '💥', max: 5,  desc: (r) => `+${10 * r}% de dano do Golpe Forte` },
    sangue:   { name: 'Sede de Sangue',  icon: '🩸', max: 5,  desc: (r) => `+${(1.5 * r).toFixed(1)}% de vida roubada` },
    cura:     { name: 'Curandeiro',      icon: '🧪', max: 5,  desc: (r) => `Poções curam +${6 * r}%` },
    cacador:  { name: 'Caçador Nato',    icon: '🏹', max: 5,  desc: (r) => `+${3 * r}% de XP e +${4 * r}% de conchas` },
    grito:    { name: 'Grito de Guerra', icon: '📣', max: 5,  active: true, desc: (r) => `Ativa: +${25 + 5 * r}% de dano por 3 turnos (recarga 5)` },
    postura:  { name: 'Postura de Pedra', icon: '🗿', max: 5, active: true, desc: (r) => `Ativa: -${40 + 3 * r}% de dano recebido por 3 turnos (recarga 5)` },
  };
  G.SKILL_ORDER = ['forca', 'vigor', 'casca', 'olho', 'letal', 'golpe', 'sangue', 'cura', 'cacador', 'grito', 'postura'];
  G.skillRank = (st, id) => (st.skills && st.skills[id]) || 0;
  G.skillReqLevel = (st, id) => 1 + G.skillRank(st, id) * 2 + (G.SKILLS[id].active ? 4 : 0);
  G.skillTime = (st, id) => Math.round(90 * Math.pow(G.skillRank(st, id) + 1, 1.5));       // segundos
  G.skillCost = (st, id) => Math.round(45 * Math.pow(G.skillRank(st, id) + 1, 1.6) * (1 + st.level * 0.06));
  G.speedupCost = (st) => {
    if (!st.training) return 0;
    const left = Math.max(0, (st.training.endsAt - Date.now()) / 1000);
    return Math.max(1, Math.ceil((left / 60) * (2 + st.level * 0.35)));
  };

  G.startTraining = function (st, id) {
    const sk = G.SKILLS[id];
    if (!sk) return { ok: false, msg: 'Habilidade inválida.' };
    if (st.training) return { ok: false, msg: 'Você já está treinando.' };
    if (G.skillRank(st, id) >= sk.max) return { ok: false, msg: 'Habilidade no máximo.' };
    if (st.level < G.skillReqLevel(st, id)) return { ok: false, msg: `Requer nível ${G.skillReqLevel(st, id)}.` };
    const c = G.skillCost(st, id);
    if (st.gold < c) return { ok: false, msg: 'Conchas insuficientes.' };
    st.gold -= c;
    st.training = { id, endsAt: Date.now() + G.skillTime(st, id) * 1000, from: G.skillRank(st, id) };
    return { ok: true, msg: `Treinando ${sk.name}...` };
  };
  G.finishTraining = function (st, now = Date.now()) {
    if (!st.training || now < st.training.endsAt) return null;
    const id = st.training.id; st.skills[id] = G.skillRank(st, id) + 1; st.training = null;
    return id;
  };
  G.speedupTraining = function (st) {
    if (!st.training) return { ok: false, msg: 'Nada em treino.' };
    const c = G.speedupCost(st);
    if (st.gold < c) return { ok: false, msg: 'Conchas insuficientes.' };
    st.gold -= c; st.training.endsAt = Date.now();
    return { ok: true, id: G.finishTraining(st) };
  };

  /* ---------- Herói ---------- */
  G.xpToNext = (L) => Math.round(40 * Math.pow(L, 1.55));
  const KIND_XP = { normal: 1, elite: 1.6, semi: 2.0, boss: 3.5, training: 0.5, event: 3 };
  const KIND_GOLD = { normal: 1, elite: 1.6, semi: 2.2, boss: 5, training: 0.7, event: 6 };
  G.monsterXp = (L, kind) => G.xpToNext(L) / (2.2 + 0.18 * L) * KIND_XP[kind];

  G.newState = function (name) {
    const now = Date.now();
    const st = {
      v: G.STATE_V, name: name || 'Herói', level: 1, xp: 0, hp: 1, hpAt: now,
      gold: 80, ossos: 0, fossils: 0, kills: 0, bossNo: 1, totalKills: 0, trophies: [], evTrophies: [],
      bag: [], bagSize: G.BAG_START,
      equipped: { arma: null, escudo: null, elmo: null, armadura: null, luvas: null, botas: null, amuleto: null, runas: [null, null, null] },
      potions: { small: 5, large: 0 }, energy: G.MAX_ENERGY, energyAt: now, cdUntil: 0,
      skills: {}, training: null, shop: null, finished: false, createdAt: now,
      ev: { day: '', weekly: 0, monthly: 0, claimW: '', claimM: '' },
    };
    st.equipped.arma = G.makeItem('arma', 1, 0);
    st.hp = G.heroStats(st).hp;
    G.refreshShop(st);
    return st;
  };

  G.heroStats = function (st) {
    const L = st.level;
    const s = { atk: 10 + 3 * L, hp: 50 + 14 * L, arm: 5 + 2 * L, crit: 5, critDmg: 1.75, vamp: 0, heavy: 1.8, potion: 1, xp: 1, gold: 1, grito: 0, postura: 0 };
    const pct = { atk: 0, hp: 0, arm: 0 };
    const add = (it) => { const i = G.itemStats(it); s.atk += i.atk; s.hp += i.hp; s.arm += i.arm; s.crit += i.crit; };
    for (const slot of G.SLOT_ORDER) if (st.equipped[slot]) add(st.equipped[slot]);
    for (const it of st.equipped.runas || []) {
      if (!it) continue;
      const v = G.runeValue(it), t = it.rune.t;
      if (t === 'forca') pct.atk += v / 100; else if (t === 'vida') pct.hp += v / 100; else if (t === 'pedra') pct.arm += v / 100;
      else if (t === 'sorte') s.crit += v; else if (t === 'sangue') s.vamp += v;
    }
    const k = (id) => G.skillRank(st, id);
    pct.atk += 0.03 * k('forca'); pct.hp += 0.04 * k('vigor'); pct.arm += 0.04 * k('casca');
    s.crit += k('olho'); s.critDmg += 0.08 * k('letal'); s.heavy *= 1 + 0.1 * k('golpe');
    s.vamp += 1.5 * k('sangue'); s.potion += 0.06 * k('cura');
    s.xp += 0.03 * k('cacador'); s.gold += 0.04 * k('cacador');
    s.grito = k('grito') ? 1.25 + 0.05 * k('grito') : 0;
    s.postura = k('postura') ? 1 - (0.4 + 0.03 * k('postura')) : 0;
    s.atk = Math.round(s.atk * (1 + pct.atk)); s.hp = Math.round(s.hp * (1 + pct.hp)); s.arm = Math.round(s.arm * (1 + pct.arm));
    s.crit = Math.min(60, r1(s.crit)); s.vamp = Math.min(20, r1(s.vamp));
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
    const done = G.finishTraining(st, now);
    if (st.shop && now - st.shop.at > G.SHOP_SECS) G.refreshShop(st);
    G.evSync(st, new Date(now));
    return done;
  };
  G.setHp = (st, hp) => { st.hp = Math.max(0, Math.min(G.heroStats(st).hp, hp)); st.hpAt = Date.now(); };
  G.restCost = (st) => {
    const miss = Math.max(0, G.heroStats(st).hp - st.hp) / G.heroStats(st).hp;
    return Math.round(miss * (25 + 7 * st.level));
  };
  G.rest = function (st) {
    const c = G.restCost(st);
    if (c <= 0) return { ok: false, msg: 'Você já está com a vida cheia.' };
    if (st.gold < c) return { ok: false, msg: 'Conchas insuficientes.' };
    st.gold -= c; G.setHp(st, G.heroStats(st).hp);
    return { ok: true, msg: 'Você descansou na fogueira.' };
  };
  G.cooldownLeft = (st, now = Date.now()) => Math.max(0, Math.ceil(((st.cdUntil || 0) - now) / 1000));

  /* ---------- Inimigos ---------- */
  G.MODS = {
    feroz:       { name: 'Feroz',       icon: '🔥', desc: '+25% de força, menos vida' },
    veloz:       { name: 'Veloz',       icon: '💨', desc: '30% de chance de atacar duas vezes' },
    couracado:   { name: 'Couraçado',   icon: '🛡️', desc: 'Armadura muito alta' },
    venenoso:    { name: 'Venenoso',    icon: '☠️', desc: 'Ataques podem envenenar' },
    regenerador: { name: 'Regenerador', icon: '💚', desc: 'Recupera vida a cada turno' },
    esmagador:   { name: 'Esmagador',   icon: '💫', desc: 'Pode atordoar o herói' },
  };
  const POOL = [
    [['Rato Gigante', '🐀', 'veloz'], ['Lobo Jovem', '🐺', 'feroz'], ['Cobra da Mata', '🐍', 'venenoso'], ['Morcego da Caverna', '🦇', 'veloz'], ['Sapo Venenoso', '🐸', 'venenoso'], ['Gavião Faminto', '🦅', 'veloz']],
    [['Javali Selvagem', '🐗', 'esmagador'], ['Hiena Faminta', '🐕', 'feroz'], ['Macaco Feroz', '🐒', 'veloz'], ['Aranha Gigante', '🕷️', 'venenoso'], ['Tartaruga de Pedra', '🐢', 'couracado'], ['Lagarto Espinhoso', '🦎', 'couracado']],
    [['Urso das Cavernas', '🐻', 'esmagador'], ['Tigre Caçador', '🐅', 'feroz'], ['Crocodilo do Pântano', '🐊', 'couracado'], ['Bisão Enraivecido', '🐃', 'esmagador'], ['Cobra Real', '🐍', 'venenoso'], ['Lobo Gigante', '🐺', 'regenerador']],
    [['Rinoceronte Lanudo', '🦏', 'couracado'], ['Gorila Ancestral', '🦍', 'esmagador'], ['Raptor Veloz', '🦖', 'veloz'], ['Escorpião Gigante', '🦂', 'venenoso'], ['Alce Colossal', '🦌', 'feroz'], ['Hipopótamo Bruto', '🦛', 'regenerador']],
    [['Mamute Jovem', '🦣', 'regenerador'], ['Tigre Dentes-de-Sabre', '🐯', 'feroz'], ['Guerreiro Rival', '🧟', 'couracado'], ['Dinossauro Chifrudo', '🦕', 'esmagador'], ['Caçador de Crânios', '👹', 'feroz'], ['Besta das Brumas', '🐲', 'veloz']],
    [['Pterodáctilo', '🦅', 'veloz'], ['Besta de Lava', '🌋', 'regenerador'], ['Fera Primordial', '👹', 'feroz'], ['Tiranete', '🦖', 'esmagador'], ['Golem de Rocha', '🗿', 'couracado'], ['Serpente de Fogo', '🐉', 'venenoso']],
  ];
  G.BOSSES = [
    { no: 1,  name: 'Lobo Cinzento Alfa',      emoji: '🐺', mods: ['feroz', 'veloz'],            sp: 'Uivo Selvagem',      trophy: 'Presa do Alfa',      tIcon: '🦷' },
    { no: 2,  name: 'Javali Chifre-de-Ferro',  emoji: '🐗', mods: ['esmagador', 'couracado'],    sp: 'Investida Brutal',   trophy: 'Chifre de Ferro',    tIcon: '🐂' },
    { no: 3,  name: 'Grande Urso da Caverna',  emoji: '🐻', mods: ['esmagador', 'feroz'],        sp: 'Abraço Esmagador',   trophy: 'Garra do Urso',      tIcon: '🐾' },
    { no: 4,  name: 'Víbora das Sombras',      emoji: '🐍', mods: ['venenoso', 'veloz'],         sp: 'Bote Mortal',        trophy: 'Escama Sombria',     tIcon: '🐉' },
    { no: 5,  name: 'Tigre Dentes-de-Sabre',   emoji: '🐯', mods: ['feroz', 'veloz'],            sp: 'Salto Fatal',        trophy: 'Dente de Sabre',     tIcon: '🗡️' },
    { no: 6,  name: 'Rei Macaco Gigante',      emoji: '🦍', mods: ['esmagador', 'regenerador'],  sp: 'Soco do Trovão',     trophy: 'Coroa de Ossos',     tIcon: '👑' },
    { no: 7,  name: 'Rinoceronte Blindado',    emoji: '🦏', mods: ['couracado', 'esmagador'],    sp: 'Carga Devastadora',  trophy: 'Chifre Blindado',    tIcon: '🛡️' },
    { no: 8,  name: 'Aranha Rainha',           emoji: '🕷️', mods: ['venenoso', 'regenerador'],   sp: 'Teia Corrosiva',     trophy: 'Teia Dourada',       tIcon: '🕸️' },
    { no: 9,  name: 'Mamute Ancestral',        emoji: '🦣', mods: ['regenerador', 'esmagador'],  sp: 'Pisão Sísmico',      trophy: 'Presa do Mamute',    tIcon: '🦣' },
    { no: 10, name: 'Pterodáctilo Tempestade', emoji: '🦅', mods: ['veloz', 'feroz'],            sp: 'Mergulho Trovejante', trophy: 'Pena da Tempestade', tIcon: '🪶' },
    { no: 11, name: 'Anquilossauro Pétreo',    emoji: '🐢', mods: ['couracado', 'regenerador'],  sp: 'Cauda Martelo',      trophy: 'Martelo de Cauda',   tIcon: '🔨' },
    { no: 12, name: 'Xamã Sombrio',            emoji: '👹', mods: ['venenoso', 'esmagador'],     sp: 'Maldição Tribal',    trophy: 'Máscara Tribal',     tIcon: '🎭' },
    { no: 13, name: 'Rei dos Raptores',        emoji: '🦖', mods: ['veloz', 'venenoso'],         sp: 'Chuva de Garras',    trophy: 'Garra Dourada',      tIcon: '🥇' },
    { no: 14, name: 'Dragão de Lava',          emoji: '🐉', mods: ['feroz', 'regenerador'],      sp: 'Sopro de Magma',     trophy: 'Coração de Magma',   tIcon: '🌋' },
    { no: 15, name: 'Tiranossauro Rei',        emoji: '👑', mods: ['feroz', 'esmagador'],        sp: 'Rugido do Rei',      trophy: 'Coroa do Rei Rex',   tIcon: '🏆' },
  ];

  // kind: normal | elite | semi | boss | event
  const KIND_MUL = {
    normal: { hp: 1.0, atk: 1.0, arm: 1.0 },
    elite:  { hp: 1.5, atk: 1.18, arm: 1.15 },
    semi:   { hp: 2.2, atk: 1.22, arm: 1.2 },
    boss:   { hp: 2.9, atk: 1.28, arm: 1.2 },
    event:  { hp: 3.7, atk: 1.32, arm: 1.25 },
  };
  G.makeMonster = function (level, kind, def) {
    const L = Math.max(1, level);
    kind = kind || 'normal';
    const k = KIND_MUL[kind];
    const m = { atk: (10 + 3.8 * L) * k.atk, hp: (40 + 16.5 * L) * k.hp, arm: (2 + 1.8 * L) * k.arm };
    if (kind === 'boss' && def && def.no) {
      const ease = Math.min(1, 0.7 + 0.05 * def.no);   // chefes iniciais são mais brandos
      m.hp *= (1.8 + 0.22 * def.no) * ease / k.hp; m.atk *= (1.15 + 0.06 * def.no) * ease / k.atk;
    }
    let name, emoji, mods, special = null, bossNo = 0;
    if (kind === 'boss' || kind === 'event') {
      name = def.name; emoji = def.emoji; mods = def.mods.slice(); bossNo = def.no || 0;
      special = { every: kind === 'boss' ? 4 : 3, mult: kind === 'boss' ? 1.9 : 2.0, name: def.sp || 'Ataque Devastador' };
    } else {
      const tier = Math.min(POOL.length - 1, Math.floor((L - 1) / 7));
      const tr = R() < 0.3 && tier > 0 ? tier - 1 : tier;
      const [n, e, md] = pick(POOL[tr]);
      name = kind === 'semi' ? 'Alfa ' + n : kind === 'elite' ? n + ' Veterano' : n;
      emoji = e; mods = [md];
      if (kind === 'semi') special = { every: 5, mult: 1.6, name: 'Investida Selvagem' };
      const v = rand(0.93, 1.07); m.atk *= v; m.hp *= v;
    }
    for (const md of mods) {
      if (md === 'feroz') { m.atk *= 1.25; m.hp *= 0.85; }
      if (md === 'couracado') { m.arm *= 1.6; m.atk *= 0.9; }
      if (md === 'esmagador') { m.hp *= 1.1; }
    }
    return { name, emoji, level: L, kind, boss: kind === 'boss' || kind === 'event', bossNo, mods, special,
      atk: Math.round(m.atk), hp: Math.round(m.hp), maxHp: Math.round(m.hp), arm: Math.round(m.arm) };
  };

  /* ---------- Combate ---------- */
  const reduce = (arm) => 100 / (100 + arm * 1.5);
  G.HEAVY_CD = 2; G.ACTIVE_CD = 4;

  G.startFight = function (st, mon, opts = {}) {
    const h = G.heroStats(st);
    return {
      mon, mode: opts.mode || 'story', event: opts.event || null,
      hero: { hp: Math.round(st.hp), max: h.hp, atk: h.atk, arm: h.arm, crit: h.crit, critDmg: h.critDmg, vamp: h.vamp, heavy: h.heavy,
        potion: h.potion, grito: h.grito, postura: h.postura },
      turn: 0, mturn: 0, cd: { heavy: 0, grito: 0, postura: 0 }, buff: { grito: 0, postura: 0 },
      guard: false, stunned: false, poison: 0, poisonDmg: 0, warn: false, enraged: false,
      over: false, won: false, fled: false, potionsUsed: 0, events: [],
    };
  };
  const snap = (f) => ({ h: Math.max(0, Math.round(f.hero.hp)), m: Math.max(0, Math.round(f.mon.hp)) });
  function ev(f, kind, text, extra) { const e = Object.assign({ kind, text }, snap(f), extra || {}); f.events.push(e); return e; }

  function monsterTurn(f) {
    const m = f.mon, h = f.hero;
    f.mturn++;
    if (m.boss && !f.enraged && m.hp < m.maxHp * 0.5) {
      f.enraged = true; m.atk = Math.round(m.atk * 1.25);
      ev(f, 'warn', `💢 ${m.name} entra em fúria!`);
    }
    if (m.mods.includes('regenerador') && m.hp > 0) {
      const heal = Math.round(m.maxHp * 0.04);
      m.hp = Math.min(m.maxHp, m.hp + heal);
      ev(f, 'heal', `${m.name} recupera ${heal} de vida.`, { who: 'mon' });
    }
    const sp = m.special;
    const isSpecial = sp && f.mturn % sp.every === 0;
    const swings = !isSpecial && m.mods.includes('veloz') && R() < 0.3 ? 2 : 1;
    for (let i = 0; i < swings; i++) {
      let dmg = m.atk * rand(0.85, 1.15) * reduce(h.arm) * (swings === 2 ? 0.7 : 1) * (isSpecial ? sp.mult : 1);
      if (f.guard) dmg *= 0.4;
      if (f.buff.postura > 0) dmg *= h.postura;
      dmg = Math.max(1, Math.round(dmg));
      h.hp -= dmg;
      ev(f, 'hit', isSpecial ? `💥 ${m.name} usa ${sp.name}: ${dmg} de dano!` : `${m.name} ataca e causa ${dmg} de dano.`, { who: 'mon', dmg, special: !!isSpecial });
      if (h.hp <= 0) { h.hp = 0; break; }
      if (m.mods.includes('venenoso') && R() < 0.35) {
        f.poison = 3; f.poisonDmg = Math.max(1, Math.round(m.atk * 0.1));
        ev(f, 'info', '☠️ Você foi envenenado!');
      }
      if (m.mods.includes('esmagador') && R() < 0.16 && !f.stunned) { f.stunned = true; ev(f, 'info', '💫 Você foi atordoado!'); }
    }
    f.guard = false;
    if (h.hp > 0 && f.poison > 0) {
      h.hp -= f.poisonDmg; f.poison--;
      ev(f, 'hit', `☠️ O veneno causa ${f.poisonDmg} de dano.`, { who: 'mon', dmg: f.poisonDmg });
    }
    if (f.buff.grito > 0) f.buff.grito--;
    if (f.buff.postura > 0) f.buff.postura--;
    if (h.hp <= 0) { h.hp = 0; f.over = true; f.won = false; ev(f, 'end', 'Você caiu em combate...'); return; }
    // aviso do próximo golpe especial
    f.warn = !!(sp && (f.mturn + 1) % sp.every === 0);
    if (f.warn) ev(f, 'warn', `⚠️ ${m.name} prepara ${sp.name}! Defenda-se!`);
  }

  // action: attack | heavy | guard | grito | postura | potion-small | potion-large | flee
  G.heroAction = function (st, f, action) {
    if (f.over) return [];
    const start = f.events.length, m = f.mon, h = f.hero;
    const bad = (msg) => { ev(f, 'info', msg); return f.events.slice(start); };
    let used = null;
    f.turn++;
    if (f.stunned) {
      f.stunned = false; ev(f, 'info', '💫 Você está atordoado e perde o turno!');
    } else if (action === 'flee') {
      if (f.mode !== 'story' && f.mode !== 'training') { f.turn--; return bad('Não há como fugir deste combate!'); }
      if (m.boss) { f.turn--; return bad('Não há como fugir de um chefe!'); }
      if (R() < 0.6) { f.over = true; f.fled = true; ev(f, 'end', 'Você fugiu da batalha.'); return f.events.slice(start); }
      ev(f, 'info', 'A fuga falhou!');
    } else if (action === 'potion-small' || action === 'potion-large') {
      const key = action === 'potion-small' ? 'small' : 'large';
      if (st.potions[key] <= 0) { f.turn--; return bad('Você não tem essa poção.'); }
      st.potions[key]--; f.potionsUsed++;
      const heal = Math.round(h.max * (key === 'small' ? 0.35 : 0.65) * h.potion);
      const before = h.hp; h.hp = Math.min(h.max, h.hp + heal);
      ev(f, 'heal', `🧪 Você bebe uma poção e recupera ${Math.round(h.hp - before)} de vida.`, { who: 'hero' });
    } else if (action === 'guard') {
      f.guard = true; ev(f, 'info', '🛡️ Você se protege atrás do escudo (-60% de dano no próximo golpe).');
    } else if (action === 'grito') {
      if (!h.grito) { f.turn--; return bad('Você ainda não aprendeu essa habilidade.'); }
      if (f.cd.grito > 0) { f.turn--; return bad('Grito de Guerra recarregando.'); }
      f.buff.grito = 4; f.cd.grito = G.ACTIVE_CD; used = 'grito';
      ev(f, 'info', `📣 Grito de Guerra! +${Math.round((h.grito - 1) * 100)}% de dano por 3 ataques.`);
    } else if (action === 'postura') {
      if (!h.postura) { f.turn--; return bad('Você ainda não aprendeu essa habilidade.'); }
      if (f.cd.postura > 0) { f.turn--; return bad('Postura de Pedra recarregando.'); }
      f.buff.postura = 3; f.cd.postura = G.ACTIVE_CD; used = 'postura';
      ev(f, 'info', `🗿 Postura de Pedra! -${Math.round((1 - h.postura) * 100)}% de dano por 3 turnos.`);
    } else {
      const heavy = action === 'heavy';
      if (heavy && f.cd.heavy > 0) { f.turn--; return bad('Golpe Forte ainda está recarregando.'); }
      let dmg = h.atk * rand(0.85, 1.15) * reduce(m.arm) * (heavy ? h.heavy : 1) * (f.buff.grito > 0 ? h.grito : 1);
      const crit = R() * 100 < h.crit;
      if (crit) dmg *= h.critDmg;
      dmg = Math.max(1, Math.round(dmg));
      m.hp -= dmg;
      if (heavy) { f.cd.heavy = G.HEAVY_CD; used = 'heavy'; }
      ev(f, 'hit', `${heavy ? '💥 Golpe Forte' : '⚔️ Você ataca'}${crit ? ' CRÍTICO' : ''}: ${dmg} de dano em ${m.name}.`, { who: 'hero', dmg, crit });
      if (h.vamp > 0 && m.hp > 0 || (h.vamp > 0 && m.hp <= 0)) {
        const heal = Math.round(dmg * h.vamp / 100);
        if (heal > 0 && h.hp < h.max) { h.hp = Math.min(h.max, h.hp + heal); ev(f, 'heal', `🩸 Você rouba ${heal} de vida.`, { who: 'hero' }); }
      }
      if (m.hp <= 0) { m.hp = 0; f.over = true; f.won = true; ev(f, 'end', `${m.name} foi derrotado!`); }
    }
    for (const key of ['heavy', 'grito', 'postura']) if (f.cd[key] > 0 && key !== used) f.cd[key]--;
    if (!f.over) monsterTurn(f);
    return f.events.slice(start);
  };

  /* ---------- Eventos (calendário) ---------- */
  const pad = (n) => String(n).padStart(2, '0');
  G.dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  G.isoWeek = function (d) {
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dn = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - dn);
    const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return { y: t.getUTCFullYear(), w: Math.ceil(((t - y0) / 86400000 + 1) / 7) };
  };
  G.WEEKLY = [
    { id: 'mamute', name: 'Mamute Alfa',            emoji: '🦣', mods: ['regenerador', 'esmagador'], sp: 'Pisão Sísmico',   tIcon: '🦣' },
    { id: 'sabre',  name: 'Rei Dentes-de-Sabre',    emoji: '🐯', mods: ['feroz', 'veloz'],           sp: 'Salto Fatal',     tIcon: '🗡️' },
    { id: 'raptor', name: 'Matriarca dos Raptores', emoji: '🦖', mods: ['veloz', 'venenoso'],        sp: 'Chuva de Garras', tIcon: '🥇' },
    { id: 'urso',   name: 'Urso Fantasma',          emoji: '🐻‍❄️', mods: ['esmagador', 'couracado'],   sp: 'Abraço Gélido',   tIcon: '❄️' },
  ];
  G.MONTHLY = [
    { id: 'dragao',  name: 'Dragão de Fogo',        emoji: '🐉', mods: ['feroz', 'regenerador'],     sp: 'Sopro Infernal',  tIcon: '🔥' },
    { id: 'trex',    name: 'Tiranossauro Ancestral', emoji: '🦖', mods: ['feroz', 'esmagador'],       sp: 'Rugido Ancestral', tIcon: '👑' },
    { id: 'tita',    name: 'Titã de Pedra',         emoji: '🗿', mods: ['couracado', 'esmagador'],   sp: 'Avalanche',       tIcon: '⛰️' },
    { id: 'hidra',   name: 'Hidra do Pântano',      emoji: '🐍', mods: ['venenoso', 'regenerador'],  sp: 'Mordida Tripla',  tIcon: '🧪' },
  ];
  G.EVENT_UNLOCK = { weekly: 3, monthly: 6 };      // chefes derrotados necessários
  G.EVENT_ATTEMPTS = { weekly: 3, monthly: 1 };    // por dia
  G.weeklyEvent = function (d) { const w = G.isoWeek(d); return { key: `${w.y}-W${pad(w.w)}`, def: G.WEEKLY[(w.y * 53 + w.w) % G.WEEKLY.length] }; };
  G.monthlyEvent = function (d) { return { key: `${d.getFullYear()}-${pad(d.getMonth() + 1)}`, def: G.MONTHLY[(d.getFullYear() * 12 + d.getMonth()) % G.MONTHLY.length] }; };
  G.bonusEvents = function (d) {
    const out = [], wd = d.getDay(), dm = d.getDate();
    if (wd === 0 || wd === 6) out.push({ id: 'fds', name: 'Fim de Semana do Caçador', icon: '🏕️', desc: '+50% de XP em todas as batalhas', xp: 1.5, gold: 1 });
    if (dm <= 3) out.push({ id: 'festival', name: 'Festival das Conchas', icon: '🐚', desc: '+50% de conchas nos primeiros dias do mês', xp: 1, gold: 1.5 });
    if (wd === 3) out.push({ id: 'quarta', name: 'Quarta da Forja', icon: '🔨', desc: 'Ferreiro com 25% de desconto', xp: 1, gold: 1, forge: 0.75 });
    return out;
  };
  G.bonusMul = function (d = new Date()) {
    const e = G.bonusEvents(d); return { xp: e.reduce((a, b) => a * b.xp, 1), gold: e.reduce((a, b) => a * b.gold, 1), forge: e.reduce((a, b) => a * (b.forge || 1), 1) };
  };
  G.evSync = function (st, d = new Date()) {
    const day = G.dayKey(d);
    if (!st.ev) st.ev = { day: '', weekly: 0, monthly: 0, claimW: '', claimM: '' };
    if (st.ev.day !== day) { st.ev.day = day; st.ev.weekly = G.EVENT_ATTEMPTS.weekly; st.ev.monthly = G.EVENT_ATTEMPTS.monthly; }
  };
  G.eventUnlocked = (st, type) => st.trophies.length >= G.EVENT_UNLOCK[type];
  G.eventMonster = function (st, type, d = new Date()) {
    const e = type === 'weekly' ? G.weeklyEvent(d) : G.monthlyEvent(d);
    const mon = G.makeMonster(st.level + (type === 'monthly' ? 2 : 1), 'event', Object.assign({}, e.def, type === 'monthly' ? { sp: e.def.sp } : {}));
    const sc = 0.7 + 0.07 * Math.min(15, st.trophies.length);   // cresce com o progresso na campanha
    mon.hp = mon.maxHp = Math.round(mon.maxHp * sc); mon.atk = Math.round(mon.atk * (1 + (sc - 1) * 0.8));
    if (type === 'monthly') { mon.hp = mon.maxHp = Math.round(mon.maxHp * 1.35); mon.atk = Math.round(mon.atk * 1.12); }
    return { mon, key: e.key, def: e.def };
  };
  G.EVENT_SHOP = [
    { id: 'pot',   name: '3 Poções Grandes', icon: '🧪', cost: 10 },
    { id: 'ossos', name: '40 Ossos',          icon: '🦴', cost: 12 },
    { id: 'runaE', name: 'Runa Épica',        icon: '🔶', cost: 45 },
    { id: 'itemL', name: 'Item Lendário',     icon: '🏆', cost: 140 },
  ];
  G.buyEventOffer = function (st, id) {
    const o = G.EVENT_SHOP.find((x) => x.id === id);
    if (!o) return { ok: false, msg: 'Oferta inválida.' };
    if (st.fossils < o.cost) return { ok: false, msg: 'Fósseis insuficientes.' };
    if ((id === 'runaE' || id === 'itemL') && st.bag.length >= st.bagSize) return { ok: false, msg: 'Baú cheio!' };
    st.fossils -= o.cost;
    if (id === 'pot') st.potions.large += 3;
    if (id === 'ossos') st.ossos += 40;
    if (id === 'runaE') st.bag.push(G.makeRune(st.level, 3));
    if (id === 'itemL') st.bag.push(G.makeItem(pick(G.SLOT_ORDER), st.level, 4));
    return { ok: true, msg: `Trocou por ${o.name}.` };
  };

  /* ---------- Fluxo da história ---------- */
  G.bossReady = (st) => st.kills >= G.KILLS_PER_BOSS;
  G.nextStoryKind = (st) => (G.bossReady(st) ? 'boss' : st.kills === G.KILLS_PER_BOSS - 1 ? 'semi' : 'normal');
  G.nextStoryMonster = function (st) {
    const kind = G.nextStoryKind(st);
    if (kind === 'boss') return { mon: G.makeMonster(st.level + 1, 'boss', G.BOSSES[Math.min(st.bossNo, G.BOSSES.length) - 1]), mode: 'boss', cost: G.ENERGY_COST.boss };
    if (kind === 'semi') return { mon: G.makeMonster(st.level, 'semi'), mode: 'story', cost: G.ENERGY_COST.semi };
    const elite = R() < 0.08;
    return { mon: G.makeMonster(st.level, elite ? 'elite' : 'normal'), mode: 'story', cost: G.ENERGY_COST.story };
  };
  G.trainingMonster = (st) => G.makeMonster(st.level, 'normal');

  // Verifica se pode iniciar uma luta. type: story | training | event-weekly | event-monthly
  G.canFight = function (st, type, now = Date.now()) {
    G.syncTime(st, now);
    if (G.cooldownLeft(st, now) > 0) return { ok: false, msg: `Recuperando o fôlego (${G.cooldownLeft(st, now)}s).` };
    if (type === 'story') {
      const cost = G.ENERGY_COST[G.nextStoryKind(st) === 'boss' ? 'boss' : 'story'];
      if (st.energy < cost) return { ok: false, msg: `Faltam encontros (precisa de ${cost}).` };
    } else if (type === 'training') {
      if (st.energy < 1) return { ok: false, msg: 'Sem encontros restantes.' };
    } else if (type === 'event-weekly' || type === 'event-monthly') {
      const t = type.split('-')[1];
      if (!G.eventUnlocked(st, t)) return { ok: false, msg: `Derrote ${G.EVENT_UNLOCK[t]} chefes para liberar.` };
      if (st.ev[t] <= 0) return { ok: false, msg: 'Sem tentativas hoje.' };
    }
    return { ok: true };
  };

  /* ---------- Recompensas ---------- */
  G.addItem = function (st, it) { if (st.bag.length >= st.bagSize) return false; st.bag.push(it); return true; };

  function giveXp(st, xp) {
    const levels = [];
    if (st.level >= G.MAX_LEVEL) return levels;
    st.xp += xp;
    while (st.level < G.MAX_LEVEL && st.xp >= G.xpToNext(st.level)) { st.xp -= G.xpToNext(st.level); st.level++; levels.push(st.level); }
    if (st.level >= G.MAX_LEVEL) st.xp = 0;
    if (levels.length) { G.setHp(st, G.heroStats(st).hp); G.refreshShop(st); }
    return levels;
  }
  function dropItem(L, kind, bonus) {
    const rune = R() < 0.18;
    const rar = rollRarity(bonus);
    return rune ? G.makeRune(L, rar) : G.makeItem(pick(G.SLOT_ORDER), L, rar);
  }

  G.finishFight = function (st, f, now = new Date()) {
    const rep = { won: f.won, fled: f.fled, xp: 0, gold: 0, ossos: 0, fossils: 0, items: [], lost: [], levels: [], trophy: null, evTrophy: null, bossNo: 0, bagFull: false, finishedGame: false, kind: f.mon.kind };
    G.setHp(st, f.won ? f.hero.hp : Math.max(1, Math.round(f.hero.max * 0.1)));
    if (f.mode !== 'training' || !f.fled) st.cdUntil = now.getTime() + G.BATTLE_CD * 1000;
    if (f.fled) return rep;
    if (!f.won) {
      const loss = Math.min(st.gold, Math.round(st.gold * 0.08));
      st.gold -= loss; rep.gold = -loss;
      if (f.mode === 'event-weekly' || f.mode === 'event-monthly') st.ev[f.mode.split('-')[1]]--;
      return rep;
    }
    const m = f.mon, L = st.level, kind = f.mode === 'training' ? 'training' : m.kind;
    const bm = G.bonusMul(now), h = G.heroStats(st);
    rep.xp = Math.round(G.monsterXp(L, kind) * bm.xp * h.xp);
    rep.gold = Math.round((6 + 3 * L) * rand(0.8, 1.2) * KIND_GOLD[kind] * bm.gold * h.gold);
    st.gold += rep.gold; st.totalKills++;
    const drops = [];
    if (f.mode === 'training') { if (R() < 0.3) drops.push(dropItem(m.level, 'normal', L / 25)); rep.ossos = 1 + Math.floor(L / 12); }
    else if (m.kind === 'normal') { if (R() < 0.35) drops.push(dropItem(m.level, 'normal', L / 25)); rep.ossos = 1 + Math.floor(L / 10); }
    else if (m.kind === 'elite') { if (R() < 0.8) drops.push(dropItem(m.level, 'elite', L / 15 + 0.5)); rep.ossos = 3 + Math.floor(L / 8); }
    else if (m.kind === 'semi') { drops.push(dropItem(m.level, 'semi', L / 12 + 1)); rep.ossos = 5 + Math.floor(L / 6); }
    else if (m.kind === 'boss') {
      const no = m.bossNo, min = no <= 4 ? 2 : 3, leg = no <= 4 ? 0 : no <= 9 ? 0.2 : 0.5;
      const mk = (mn) => (R() < 0.5 ? G.makeItem(pick(G.SLOT_ORDER), m.level, R() < leg ? 4 : Math.max(mn, rollRarity(0.5, mn))) : G.makeRune(m.level, R() < leg ? 4 : Math.max(mn, rollRarity(0.5, mn))));
      drops.push(mk(min)); if (R() < 0.6) drops.push(mk(min - 1));
      st.potions.large += 1; rep.ossos = 12 + Math.floor(L / 3);
    } else if (m.kind === 'event') {
      const t = f.mode.split('-')[1];
      st.ev[t]--;
      rep.fossils = t === 'weekly' ? 6 + Math.floor(L / 4) : 25 + Math.floor(L / 2);
      st.fossils += rep.fossils;
      const claimKey = t === 'weekly' ? 'claimW' : 'claimM';
      if (st.ev[claimKey] !== f.event.key) {
        st.ev[claimKey] = f.event.key;
        const mn = t === 'weekly' ? 3 : 3;
        drops.push(G.makeItem(pick(G.SLOT_ORDER), m.level, t === 'monthly' && R() < 0.5 ? 4 : mn));
        drops.push(G.makeRune(m.level, t === 'monthly' ? 4 : 3));
        const tid = `${t[0]}-${f.event.key}-${f.event.def.id}`;
        if (!st.evTrophies.find((x) => x.id === tid)) {
          rep.evTrophy = { id: tid, name: `${f.event.def.name} (${f.event.key})`, icon: f.event.def.tIcon, type: t };
          st.evTrophies.push(rep.evTrophy);
        }
      }
      rep.ossos = t === 'weekly' ? 15 : 30;
    }
    st.ossos += rep.ossos;
    if (R() < 0.18) st.potions.small++;
    for (const it of drops) {
      if (G.addItem(st, it)) rep.items.push(it);
      else { const p = G.sellPrice(it); st.gold += p; rep.gold += p; rep.lost.push(it); rep.bagFull = true; }
    }
    if (f.mode === 'story') {
      st.kills++;
    } else if (f.mode === 'boss') {
      const b = G.BOSSES[m.bossNo - 1];
      if (!st.trophies.includes(b.no)) st.trophies.push(b.no);
      rep.trophy = b; rep.bossNo = b.no;
      if (st.bossNo < G.BOSSES.length) { st.bossNo++; st.kills = 0; }
      else { st.kills = 0; if (!st.finished) { st.finished = true; rep.finishedGame = true; } }
    }
    rep.levels = giveXp(st, rep.xp);
    return rep;
  };

  /* ---------- Loja ---------- */
  G.refreshShop = function (st) {
    const L = st.level, eq = [], runes = [];
    const roll = () => { const x = R(); return x < 0.45 ? 0 : x < 0.8 ? 1 : x < 0.97 ? 2 : 3; };
    for (const slot of ['arma', 'arma', 'escudo', 'elmo', 'armadura', 'armadura', 'luvas', 'botas', 'amuleto', 'amuleto']) eq.push(G.makeItem(slot, L, roll()));
    for (let i = 0; i < 4; i++) runes.push(G.makeRune(L, Math.min(3, roll())));
    const all = eq.concat(runes);
    const best = all.slice().sort((a, b) => b.rarity - a.rarity)[0];
    st.shop = { level: L, at: Date.now(), equip: eq, runes, deal: best ? best.id : null };
  };
  G.shopRefreshCost = (st) => 20 + st.level * 6;
  G.potionPrice = (st, kind) => Math.round((15 + 4 * st.level) * (kind === 'large' ? 2.4 : 1));
  G.bagUpgradeCost = (st) => 150 * Math.pow(2, (st.bagSize - G.BAG_START) / 5);

  G.buyItem = function (st, id) {
    const it = st.shop.equip.concat(st.shop.runes).find((x) => x.id === id);
    if (!it) return { ok: false, msg: 'Item indisponível.' };
    const p = G.shopPrice(st, it);
    if (st.gold < p) return { ok: false, msg: 'Conchas insuficientes.' };
    if (st.bag.length >= st.bagSize) return { ok: false, msg: 'Baú cheio!' };
    st.gold -= p; st.bag.push(it);
    st.shop.equip = st.shop.equip.filter((x) => x.id !== id);
    st.shop.runes = st.shop.runes.filter((x) => x.id !== id);
    return { ok: true, msg: `Comprou ${it.name}.` };
  };
  G.buyPotion = function (st, kind) {
    const p = G.potionPrice(st, kind);
    if (st.gold < p) return { ok: false, msg: 'Conchas insuficientes.' };
    st.gold -= p; st.potions[kind]++;
    return { ok: true, msg: 'Poção comprada.' };
  };
  G.buyBagSlots = function (st) {
    if (st.bagSize >= G.BAG_MAX) return { ok: false, msg: 'Baú no tamanho máximo.' };
    const c = Math.round(G.bagUpgradeCost(st));
    if (st.gold < c) return { ok: false, msg: 'Conchas insuficientes.' };
    st.gold -= c; st.bagSize += 5;
    return { ok: true, msg: 'Baú ampliado em 5 vagas.' };
  };

  /* ---------- Equipamento ---------- */
  G.findItem = function (st, id) {
    const i = st.bag.findIndex((x) => x.id === id);
    if (i >= 0) return { it: st.bag[i], where: 'bag', i };
    for (const s of G.SLOT_ORDER) if (st.equipped[s] && st.equipped[s].id === id) return { it: st.equipped[s], where: 'eq', slot: s };
    const ri = (st.equipped.runas || []).findIndex((x) => x && x.id === id);
    if (ri >= 0) return { it: st.equipped.runas[ri], where: 'eq', slot: 'runa', ri };
    return null;
  };
  const clampHp = (st) => { const max = G.heroStats(st).hp; if (st.hp > max) st.hp = max; };
  G.equip = function (st, id, runeIdx) {
    const f = G.findItem(st, id);
    if (!f || f.where !== 'bag') return false;
    const it = f.it;
    st.bag.splice(f.i, 1);
    if (it.slot === 'runa') {
      let idx = runeIdx != null ? runeIdx : st.equipped.runas.findIndex((x) => !x);
      if (idx < 0) idx = 0;
      const old = st.equipped.runas[idx]; if (old) st.bag.push(old);
      st.equipped.runas[idx] = it;
    } else {
      const old = st.equipped[it.slot]; if (old) st.bag.push(old);
      st.equipped[it.slot] = it;
    }
    clampHp(st); return true;
  };
  G.unequip = function (st, slot, ri) {
    if (st.bag.length >= st.bagSize) return false;
    if (slot === 'runa') { const it = st.equipped.runas[ri]; if (!it) return false; st.equipped.runas[ri] = null; st.bag.push(it); }
    else { const it = st.equipped[slot]; if (!it) return false; st.equipped[slot] = null; st.bag.push(it); }
    clampHp(st); return true;
  };
  G.sell = function (st, id) {
    const f = G.findItem(st, id);
    if (!f || f.where !== 'bag' || f.it.lock) return 0;
    const p = G.sellPrice(f.it);
    st.bag.splice(f.i, 1); st.gold += p; return p;
  };
  G.toggleLock = function (st, id) { const f = G.findItem(st, id); if (!f) return false; f.it.lock = !f.it.lock; return f.it.lock; };

  /* ---------- Ferreiro ---------- */
  const PLUS_CHANCE = [1, 1, 1, 0.85, 0.7, 0.55, 0.45, 0.35, 0.25, 0.18];
  G.upgradeChance = (it) => Math.min(1, PLUS_CHANCE[it.plus] + (it.pity || 0));
  G.upgradeCost = (it, forge = 1) => Math.round((4 + 2.2 * it.ilvl) * 1.1 * (it.plus + 1) * (1 + it.rarity * 0.3) * forge);
  G.upgradeOssos = (it) => Math.round(3 + it.plus * 2.5 + it.rarity * 3);
  G.dismantleYield = (it) => Math.round([2, 4, 8, 16, 32][it.rarity] * (1 + it.ilvl / 20) * (1 + (it.plus || 0) * 0.3));

  G.upgrade = function (st, id, now = new Date()) {
    const f = G.findItem(st, id);
    if (!f) return { ok: false, msg: 'Item não encontrado.' };
    const it = f.it;
    if (it.plus >= G.MAX_PLUS) return { ok: false, msg: 'Já está no máximo.' };
    const forge = G.bonusMul(now).forge, c = G.upgradeCost(it, forge), o = G.upgradeOssos(it);
    if (st.gold < c) return { ok: false, msg: 'Conchas insuficientes.' };
    if (st.ossos < o) return { ok: false, msg: 'Ossos insuficientes.' };
    st.gold -= c;
    if (R() < G.upgradeChance(it)) {
      st.ossos -= o; it.plus++; it.pity = 0;
      return { ok: true, success: true, msg: `${it.name} agora é +${it.plus}!` };
    }
    st.ossos -= Math.ceil(o / 2); it.pity = Math.min(0.3, (it.pity || 0) + 0.1);
    return { ok: true, success: false, msg: 'A melhoria falhou! Próxima tentativa tem mais chance.' };
  };
  G.dismantle = function (st, id) {
    const f = G.findItem(st, id);
    if (!f || f.where !== 'bag' || f.it.lock) return 0;
    const y = G.dismantleYield(f.it);
    st.bag.splice(f.i, 1); st.ossos += y; return y;
  };
  // Funde 3 runas iguais (mesmo tipo e raridade) em 1 de raridade maior
  G.runeGroups = function (st) {
    const g = {};
    for (const it of st.bag) if (it.rune && it.rarity < 4 && !it.lock) { const k = it.rune.t + ':' + it.rarity; (g[k] = g[k] || []).push(it); }
    return Object.entries(g).filter(([, v]) => v.length >= 3).map(([k, v]) => ({ key: k, t: k.split(':')[0], rarity: +k.split(':')[1], items: v }));
  };
  G.fuseCost = (rarity) => 30 * (rarity + 1) * (rarity + 1);
  G.fuseRunes = function (st, key) {
    const grp = G.runeGroups(st).find((x) => x.key === key);
    if (!grp) return { ok: false, msg: 'Você não tem 3 runas iguais.' };
    const c = G.fuseCost(grp.rarity);
    if (st.gold < c) return { ok: false, msg: 'Conchas insuficientes.' };
    const use = grp.items.slice(0, 3), ilvl = Math.max(...use.map((x) => x.ilvl));
    st.gold -= c;
    st.bag = st.bag.filter((x) => !use.includes(x));
    const n = G.makeRune(ilvl, grp.rarity + 1, grp.t); st.bag.push(n);
    return { ok: true, msg: `Criou ${n.name}!` };
  };

  /* ---------- Salvamento ---------- */
  G.KEY = 'era-da-pedra-save-v1';
  G.migrate = function (s) {
    if (!s) return s;
    if (!s.v || s.v < 2) {
      s.equipped = s.equipped || {};
      for (const k of ['arma', 'escudo', 'elmo', 'armadura', 'luvas', 'botas', 'amuleto']) if (!(k in s.equipped)) s.equipped[k] = null;
      s.equipped.runas = s.equipped.runas || [null, null, null];
      s.bagSize = s.bagSize || G.BAG_START; s.ossos = s.ossos || 0; s.fossils = s.fossils || 0;
      s.skills = s.skills || {}; s.training = s.training || null; s.cdUntil = s.cdUntil || 0;
      s.evTrophies = s.evTrophies || []; s.ev = s.ev || { day: '', weekly: 0, monthly: 0, claimW: '', claimM: '' };
      s.level = Math.min(s.level, G.MAX_LEVEL); s.energy = Math.min(s.energy == null ? G.MAX_ENERGY : s.energy, G.MAX_ENERGY);
      s.shop = null; s.v = 2;
      G.refreshShop(s);
    }
    return s;
  };
  G.save = (st) => { try { localStorage.setItem(G.KEY, JSON.stringify(st)); } catch (e) { /* ignore */ } };
  G.load = function () {
    try { const s = localStorage.getItem(G.KEY); return s ? G.migrate(JSON.parse(s)) : null; } catch (e) { return null; }
  };
  G.wipe = () => { try { localStorage.removeItem(G.KEY); } catch (e) { /* ignore */ } };

  root.G = G;
  if (typeof module !== 'undefined' && module.exports) module.exports = G;
})(typeof window !== 'undefined' ? window : globalThis);
