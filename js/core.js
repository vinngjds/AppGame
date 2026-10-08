/* Era da Pedra v2 — núcleo do jogo (regras puras, sem DOM). Funciona no navegador e no Node. */
(function (root) {
  'use strict';
  const G = {};
  G.rng = Math.random;
  const R = () => G.rng();
  const rand = (a, b) => a + R() * (b - a);
  const pick = (arr) => arr[Math.floor(R() * arr.length)];
  const r1 = (n) => Math.round(n * 10) / 10;

  G.STATE_V = 3;
  G.MAX_LEVEL = 40;
  G.MAX_ENERGY = 12;
  G.ENERGY_SECS = 240;            // 1 encontro a cada 4 min
  G.HP_REGEN_SECS = 420;          // vida cheia em 7 min
  G.BATTLE_CD = 25;               // segundos entre batalhas
  G.BAG_START = 30;
  G.BAG_MAX = 60;
  G.MAX_PLUS = 10;
  G.SHOP_SECS = 20 * 60;          // estoque renova a cada 20 min
  G.GOLD_RATE = 0.6;              // ouro mais escasso
  G.XP_RATE = 0.8;                // XP mais escasso
  G.STEP_COST = [1, 1, 1, 2];     // custo em encontros de cada luta do local (chefe custa 2)

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
    arma:     [['Clava de Carvalho Nodoso', '🏏'], ['Lança de Sílex Lascado', '🔱'], ['Machado de Pedra Polida', '🪓'], ['Maça de Fêmur com Presas', '🦴'], ['Martelo de Presa de Mamute', '⚒️']],
    escudo:   [['Escudo de Tábuas e Couro', '🪵'], ['Escudo de Couro Pintado', '🛡️'], ['Escudo de Laje de Pedra', '🪨'], ['Escudo de Carapaça', '🐢'], ['Escudo de Pele de Mamute', '🗿']],
    elmo:     [['Gorro de Pele de Lobo', '🧢'], ['Elmo de Crânio de Lobo', '💀'], ['Elmo de Presas e Chifres', '🦷'], ['Elmo de Casco Crestado', '🐂'], ['Coroa de Crânio de Mamute', '🦣']],
    armadura: [['Colete de Pele de Urso', '🩲'], ['Couraça de Couro Curtido', '🦺'], ['Peitoral de Costelas', '🦴'], ['Couraça de Escamas de Casco', '🐢'], ['Manto de Mamute com Presas', '🧥']],
    luvas:    [['Faixas de Couro Cru', '🧤'], ['Luvas de Pele Forrada', '🧤'], ['Braçadeiras de Osso', '🦴'], ['Manoplas de Garras', '🐾'], ['Manoplas de Marfim', '🌋']],
    botas:    [['Sandálias de Tiras de Couro', '🩴'], ['Botas de Couro Costurado', '🥾'], ['Botas de Pele Forrada', '👢'], ['Botas de Garras', '🦶'], ['Botas do Trovão', '⚡']],
    amuleto:  [['Colar de Dente de Lobo', '🐺'], ['Colar de Conchas e Contas', '🐚'], ['Totem de Pedra Entalhada', '🗿'], ['Olho do Espírito', '🧿'], ['Coração do Vulcão', '🌋']],
  };
  G.MATERIALS = ['Madeira e couro', 'Sílex e pele', 'Pedra polida', 'Osso e casco', 'Marfim de mamute'];
  G.ITEM_DESC = {
    arma:     ['Cortada de um carvalho velho, ainda com os nós da casca. Pesada, simples e eficaz.', 'Ponta de sílex lascada a golpes de pedra e amarrada com tendão ao cabo de madeira.', 'Lâmina de pedra polida por dias contra a rocha, presa ao cabo com tiras de couro.', 'Um fêmur de fera com presas cravadas na ponta, amarrado com tendão.', 'Cabo de presa de mamute e cabeça de pedra, com faixas de ouro e marcas de ocre.'],
    escudo:   ['Tábuas de madeira unidas e cobertas de couro, com um umbigo de pedra no centro.', 'Pele esticada num aro de madeira e pintada com ocre vermelho: marcas de caça.', 'Uma laje redonda de pedra, lascada e reforçada com pregos de osso.', 'A carapaça de uma tartaruga gigante: leve, dura e coberta de placas.', 'Pele grossa de mamute com franja de pelo, presas cruzadas e um umbigo dourado.'],
    elmo:     ['Gorro de pele de lobo com abas para as orelhas e tiras para amarrar.', 'O crânio de um lobo, com os dentes à mostra, preso por tiras de couro.', 'Elmo de couro e pedra com presas e chifres que assustam qualquer fera.', 'Um casco crestado de réptil gigante, com abas laterais e uma crista no topo.', 'O crânio de um mamute com presas curvas, faixa de ouro e uma pluma vermelha.'],
    armadura: ['Colete de pele de urso, com o pelo para fora e amarras na frente.', 'Couro curtido e costurado, com tiras cruzadas na frente para ajustar.', 'Costelas de grandes feras presas em couro, formando um peitoral de osso.', 'Escamas de casco sobrepostas como telhas, leves e muito resistentes.', 'Pele de mamute com gola de pelo, ombreiras de presas e um fecho dourado.'],
    luvas:    ['Tiras de couro cru enroladas nas mãos e nos pulsos.', 'Luvas de pele forradas de pelo macio, quentes e firmes.', 'Placas de osso amarradas nos antebraços, para defender e para bater.', 'Manoplas de casco com garras de fera nas pontas dos dedos.', 'Manoplas de pele de mamute com espinhos de marfim e aros de ouro.'],
    botas:    ['Solas de couro presas por tiras que sobem pela perna.', 'Botas de couro costurado, com cadarço de tendão.', 'Pele forrada de pelo e abas macias que aquecem os pés.', 'Botas de casco com solas cheias de garras e dentes.', 'Botas escuras de couro vermelho, com raios dourados que estalam a cada passo.'],
    amuleto:  ['Uma presa de lobo presa a um cordão: lembrança da primeira grande caça.', 'Conchas e contas polidas em volta de uma concha rosada.', 'Uma pequena pedra entalhada com o rosto de um espírito protetor.', 'Uma pedra azul-turquesa com um olho gravado, que nunca pisca.', 'Uma pedra de lava ainda quente, presa numa gaiola de ouro.'],
  };
  G.itemName = function (it) {
    if (it.rune) return it.name;
    const t = tierOf(it.ilvl), rt = it.rarity >= 3 ? ' ' + ['', '', '', 'Ancestral', 'Primordial'][it.rarity] : '';
    return BASES[it.slot][t][0] + rt;
  };
  G.itemDesc = function (it) {
    if (it.rune) return `Uma pedra esculpida com o símbolo da ${G.RUNES[it.rune.t].name}. Encaixa em um dos 3 espaços de runa.`;
    return G.ITEM_DESC[it.slot][tierOf(it.ilvl)];
  };
  G.itemMaterial = (it) => (it.rune ? 'Pedra esculpida' : G.MATERIALS[tierOf(it.ilvl)]);
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
  G.tierOf = tierOf;
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
    return Math.round((4 + 2.2 * it.ilvl) * rar.mult * rar.mult * 2.5 * (it.rune ? 3.5 : 1) * (1 + 0.3 * (it.plus || 0)));
  };
  G.sellPrice = (it) => Math.max(1, Math.round(G.itemPrice(it) * 0.25));
  G.SHOP_MARKUP = 3.5;   // a loja cobra bem mais que o valor do item (a venda continua pelo valor base)
  G.shopPrice = (st, it) => Math.round(G.itemPrice(it) * G.SHOP_MARKUP * (st.shop && st.shop.deal === it.id ? 0.75 : 1));

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
    cacador:  { name: 'Caçador Nato',    icon: '🏹', max: 5,  desc: (r) => `+${3 * r}% de XP e +${4 * r}% de ouro` },
    grito:    { name: 'Grito de Guerra', icon: '📣', max: 5,  active: true, desc: (r) => `Ativa: +${25 + 5 * r}% de dano por 3 turnos (recarga 5)` },
    postura:  { name: 'Postura de Pedra', icon: '🗿', max: 5, active: true, desc: (r) => `Ativa: -${40 + 3 * r}% de dano recebido por 3 turnos (recarga 5)` },
  };
  G.SKILL_ORDER = ['forca', 'vigor', 'casca', 'olho', 'letal', 'golpe', 'sangue', 'cura', 'cacador', 'grito', 'postura'];
  G.skillRank = (st, id) => (st.skills && st.skills[id]) || 0;
  G.skillReqLevel = (st, id) => 1 + G.skillRank(st, id) * 2 + (G.SKILLS[id].active ? 4 : 0);
  G.skillTime = (st, id) => Math.round(90 * Math.pow(G.skillRank(st, id) + 1, 1.5));       // segundos
  G.skillCost = (st, id) => Math.round(34 * Math.pow(G.skillRank(st, id) + 1, 1.6) * (1 + st.level * 0.06));
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
    if (st.gold < c) return { ok: false, msg: 'Ouro insuficiente.' };
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
    if (st.gold < c) return { ok: false, msg: 'Ouro insuficiente.' };
    st.gold -= c; st.training.endsAt = Date.now();
    return { ok: true, id: G.finishTraining(st) };
  };

  /* ---------- Coleção de itens (códice) ---------- */
  G.COLLECTION_BONUS = 1.5;   // % de Força/Vida/Armadura por conjunto completo
  G.itemKey = (it) => (it.rune ? 'runa:' + it.rune.t : `${it.slot}:${tierOf(it.ilvl)}`);
  G.discover = function (st, it) { if (!st.codex) st.codex = {}; const k = G.itemKey(it); const fresh = !st.codex[k]; st.codex[k] = 1; return fresh; };
  // 5 conjuntos de material (7 peças cada) + o conjunto das 5 runas
  G.collection = function (st) {
    const cx = st.codex || {}, fam = [];
    for (let t = 0; t < 5; t++) { const have = G.SLOT_ORDER.filter((s) => cx[`${s}:${t}`]).length; fam.push({ id: 't' + t, name: G.MATERIALS[t], have, total: 7, complete: have >= 7 }); }
    const rn = Object.keys(G.RUNES).filter((r) => cx['runa:' + r]).length;
    fam.push({ id: 'runas', name: 'Runas esculpidas', have: rn, total: 5, complete: rn >= 5 });
    const found = fam.reduce((a, f) => a + f.have, 0), total = fam.reduce((a, f) => a + f.total, 0), done = fam.filter((f) => f.complete).length;
    return { fam, found, total, done, bonus: done * G.COLLECTION_BONUS };
  };

  /* ---------- Bônus vitalício dos troféus ---------- */
  const TB = ['atk', 'hp', 'arm', 'crit'];
  G.TB_NAMES = { atk: 'Força', hp: 'Vida', arm: 'Armadura', crit: 'Crítico' };
  G.TB_ICON = { atk: '⚔️', hp: '❤️', arm: '🛡️', crit: '🎯' };
  // chefe n: Força, Vida, Armadura, Crítico em rotação (valores em % — crítico em pontos)
  G.trophyBonus = function (no) {
    const stat = TB[(no - 1) % 4];
    return { stat, v: stat === 'crit' ? 1.5 : stat === 'atk' ? 3 : 4 };
  };
  G.evTrophyBonus = function (type, idx) {
    const stat = TB[idx % 4], big = type === 'monthly';
    return { stat, v: stat === 'crit' ? (big ? 1 : 0.5) : (big ? 2 : 1) };
  };
  G.bonusText = (b) => `${G.TB_ICON[b.stat]} +${b.v}${b.stat === 'crit' ? ' pts de' : '% de'} ${G.TB_NAMES[b.stat]}`;
  G.trophyTotals = function (st) {
    const t = { atk: 0, hp: 0, arm: 0, crit: 0 };
    for (const no of st.trophies) { const b = G.trophyBonus(no); t[b.stat] += b.v; }
    for (const e of st.evTrophies || []) if (e.bonus) t[e.bonus.stat] += e.bonus.v;
    for (const id of st.dragonTrophies || []) { const b = G.DRAGONS[id].bonus; t[b.stat] += b.v; }
    return t;
  };

  /* ---------- Herói ---------- */
  G.xpToNext = (L) => Math.round(40 * Math.pow(L, 1.55));
  // Multiplicadores de XP/ouro: as 4 lutas de cada local escalonam (fera, fera, semi-chefe, chefe)
  const STEP_XP = [1, 1.25, 2.0, 3.5], STEP_GOLD = [1, 1.3, 2.2, 5];
  const OTHER_XP = { event: 3, verde: 6, azul: 9 }, OTHER_GOLD = { event: 6, verde: 10, azul: 16 };
  const ELITE_MUL = 1.6;
  G.monsterXp = (L, mult) => G.xpToNext(L) / (2.2 + 0.18 * L) * mult * G.XP_RATE;
  // Lutas contra inimigos muito abaixo/acima do seu nível rendem menos/mais
  G.relFactor = (monLevel, heroLevel) => Math.max(0.35, Math.min(1.4, 1 + 0.08 * (monLevel - heroLevel)));

  G.DEFAULT_AVATAR = { g: 'm', skin: 1, hair: 1 };
  G.newState = function (name, avatar) {
    const now = Date.now();
    const st = {
      v: G.STATE_V, name: name || 'Herói', avatar: Object.assign({}, G.DEFAULT_AVATAR, avatar || {}), level: 1, xp: 0, hp: 1, hpAt: now,
      gold: 80, ossos: 0, fossils: 0, totalKills: 0, trophies: [], evTrophies: [], dragonTrophies: [], zones: {}, boxes: [], dragons: { verde: { readyAt: 0 }, azul: { readyAt: 0 } },
      bag: [], bagSize: G.BAG_START,
      equipped: { arma: null, escudo: null, elmo: null, armadura: null, luvas: null, botas: null, amuleto: null, runas: [null, null, null] },
      potions: { small: 5, large: 0 }, energy: G.MAX_ENERGY, energyAt: now, cdUntil: 0,
      skills: {}, training: null, shop: null, finished: false, createdAt: now, codex: {},
      ev: { day: '', weekly: 0, monthly: 0, claimW: '', claimM: '' },
    };
    st.equipped.arma = G.makeItem('arma', 1, 0); G.discover(st, st.equipped.arma);
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
    const cb = G.collection(st).bonus / 100;
    pct.atk += cb; pct.hp += cb; pct.arm += cb;
    const tt = G.trophyTotals(st);
    pct.atk += tt.atk / 100; pct.hp += tt.hp / 100; pct.arm += tt.arm / 100; s.crit += tt.crit;
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
    if (st.gold < c) return { ok: false, msg: 'Ouro insuficiente.' };
    st.gold -= c; G.setHp(st, G.heroStats(st).hp);
    return { ok: true, msg: 'Você descansou na fogueira.' };
  };
  // Pagar ouro para encurtar a espera (preço sobe a cada compra no dia)
  const buyMul = (st) => 1 + 0.35 * ((st.ev && st.ev.buys) || 0);
  G.cooldownSkipCost = (st, now = Date.now()) => Math.ceil(G.cooldownLeft(st, now) * (0.35 + 0.04 * st.level));
  G.skipCooldown = function (st) {
    const left = G.cooldownLeft(st);
    if (left <= 0) return { ok: false, msg: 'Você já está pronto.' };
    const c = G.cooldownSkipCost(st);
    if (st.gold < c) return { ok: false, msg: 'Ouro insuficiente.' };
    st.gold -= c; st.cdUntil = 0;
    return { ok: true, msg: 'Fôlego recuperado!' };
  };
  G.energyBuyCost = (st) => Math.round((22 + 5 * st.level) * buyMul(st));
  G.buyEnergy = function (st) {
    if (st.energy >= G.MAX_ENERGY) return { ok: false, msg: 'Encontros já estão cheios.' };
    const c = G.energyBuyCost(st);
    if (st.gold < c) return { ok: false, msg: 'Ouro insuficiente.' };
    st.gold -= c; st.energy++; st.ev.buys = (st.ev.buys || 0) + 1;
    return { ok: true, msg: '+1 encontro.' };
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
  /* ---------- Mapa da jornada: 15 locais × 4 lutas ---------- */
  // m: 2 feras · semi: semi-chefe · boss: chefe do local
  G.ZONES = [
    { id: 1, name: 'Caverna Sombria', icon: '🕳️', color: '#3a2f4d',
      story: 'Você acorda numa caverna fria. O fogo sagrado da tribo foi roubado e o rastro do ladrão leva para dentro da escuridão.',
      clear: 'Entre as cinzas, uma pegada gigante aponta para a mata densa. A jornada começou.',
      m: [['Morcego da Caverna', '🦇', 'veloz'], ['Cobra das Sombras', '🐍', 'venenoso']], semi: ['Morcego Vampiro', '🦇', 'veloz'],
      boss: { name: 'Víbora das Sombras', emoji: '🐍', mods: ['venenoso', 'veloz'], sp: 'Bote Mortal', trophy: 'Escama Sombria', tIcon: '🐉' } },
    { id: 2, name: 'Floresta Densa', icon: '🌲', color: '#27472a',
      story: 'A mata esconde feras famintas. Os rastros do ladrão seguem entre as árvores, e o uivo de um lobo gigante ecoa ao longe.',
      clear: 'O alfa caiu. Do outro lado da mata, o brilho de um lago chama você.',
      m: [['Lobo Jovem', '🐺', 'feroz'], ['Javali Selvagem', '🐗', 'esmagador']], semi: ['Leão da Mata', '🦁', 'feroz'],
      boss: { name: 'Lobo Cinzento Alfa', emoji: '🐺', mods: ['feroz', 'veloz'], sp: 'Uivo Selvagem', trophy: 'Presa do Alfa', tIcon: '🦷' } },
    { id: 3, name: 'Margem do Lago', icon: '🏞️', color: '#1f4a5e',
      story: 'As águas calmas escondem predadores. Algo enorme se move debaixo da superfície e você precisa atravessar.',
      clear: 'O monstro do lago afundou. A travessia está livre e as colinas rochosas se erguem à frente.',
      m: [['Enguia do Lago', '🐟', 'veloz'], ['Sapo Venenoso', '🐸', 'venenoso']], semi: ['Crocodilo do Pântano', '🐊', 'couracado'],
      boss: { name: 'Monstro do Lago', emoji: '🦕', mods: ['regenerador', 'esmagador'], sp: 'Onda Devastadora', trophy: 'Escama do Lago', tIcon: '🌊' } },
    { id: 4, name: 'Colinas Rochosas', icon: '⛰️', color: '#4d4a47',
      story: 'O vento corta as pedras e aves enormes patrulham o céu. Um caminho estreito sobe entre os rochedos.',
      clear: 'O rei do céu caiu. No horizonte, uma planície coberta de pegadas gigantes.',
      m: [['Águia das Pedras', '🦅', 'veloz'], ['Lagarto Espinhoso', '🦎', 'couracado']], semi: ['Bode da Montanha', '🐐', 'esmagador'],
      boss: { name: 'Rei Águia', emoji: '🦅', mods: ['veloz', 'feroz'], sp: 'Mergulho Trovejante', trophy: 'Pena do Rei', tIcon: '🪶' } },
    { id: 5, name: 'Planície do Mamute', icon: '🌾', color: '#5c4d27',
      story: 'Manadas inteiras cruzam o capim alto. A terra treme: o grande mamute guarda o caminho do leste.',
      clear: 'O mamute tombou. Dele você leva uma presa e a coragem para entrar na selva.',
      m: [['Hiena Faminta', '🐕', 'feroz'], ['Bisão Enraivecido', '🐃', 'esmagador']], semi: ['Tigre Caçador', '🐅', 'feroz'],
      boss: { name: 'Mamute Ancestral', emoji: '🦣', mods: ['regenerador', 'esmagador'], sp: 'Pisão Sísmico', trophy: 'Presa do Mamute', tIcon: '🦣' } },
    { id: 6, name: 'Selva das Brumas', icon: '🌴', color: '#1f4d3a',
      story: 'Névoa quente e cipós grossos. Macacos gritam nas copas e teias brilham entre as árvores.',
      clear: 'O rei da selva reconheceu sua força. A névoa se abre e revela o deserto.',
      m: [['Macaco Feroz', '🐒', 'veloz'], ['Aranha Gigante', '🕷️', 'venenoso']], semi: ['Gorila Ancestral', '🦍', 'esmagador'],
      boss: { name: 'Rei Macaco Gigante', emoji: '🦍', mods: ['esmagador', 'regenerador'], sp: 'Soco do Trovão', trophy: 'Coroa de Ossos', tIcon: '👑' } },
    { id: 7, name: 'Deserto de Ossos', icon: '🏜️', color: '#7a5a2a',
      story: 'Ossos de criaturas colossais cobrem a areia. O sol queima e o ladrão do fogo deixou rastros que o vento apaga.',
      clear: 'Sob o ferrão do imperador você acha uma pista: o ladrão fugiu para o frio.',
      m: [['Escorpião Gigante', '🦂', 'venenoso'], ['Cascavel do Deserto', '🐍', 'veloz']], semi: ['Lagarto das Dunas', '🦎', 'couracado'],
      boss: { name: 'Escorpião Imperador', emoji: '🦂', mods: ['venenoso', 'couracado'], sp: 'Ferrão Mortal', trophy: 'Ferrão Imperial', tIcon: '🦂' } },
    { id: 8, name: 'Tundra Gelada', icon: '❄️', color: '#3d5a6e',
      story: 'O vento gela até os ossos. Pegadas largas cruzam a neve em direção às ruínas do vale.',
      clear: 'A fera de gelo caiu. Do alto da tundra, você vê um vale cheio de garras e rugidos.',
      m: [['Lobo das Neves', '🐺', 'feroz'], ['Mamute Jovem', '🦣', 'regenerador']], semi: ['Urso das Cavernas', '🐻', 'esmagador'],
      boss: { name: 'Rinoceronte Lanudo', emoji: '🦏', mods: ['couracado', 'esmagador'], sp: 'Carga Devastadora', trophy: 'Chifre Gelado', tIcon: '🛡️' } },
    { id: 9, name: 'Vale dos Raptores', icon: '🦖', color: '#4f5a22',
      story: 'Bandos de raptores caçam em silêncio. Cada passo no vale é uma emboscada.',
      clear: 'A matriarca dos raptores caiu e o bando recuou. O mar surge no horizonte.',
      m: [['Raptor Veloz', '🦖', 'veloz'], ['Dinossauro Chifrudo', '🦕', 'esmagador']], semi: ['Dilofossauro', '🦖', 'venenoso'],
      boss: { name: 'Rei dos Raptores', emoji: '🦖', mods: ['veloz', 'venenoso'], sp: 'Chuva de Garras', trophy: 'Garra Dourada', tIcon: '🥇' } },
    { id: 10, name: 'Costa dos Tubarões', icon: '🌊', color: '#14506b',
      story: 'Ondas batem em rochas negras. Há criaturas enormes nas águas rasas e o caminho passa pela praia.',
      clear: 'O abismo recuou. Depois da praia, o paredão de uma montanha toca as nuvens.',
      m: [['Caranguejo Gigante', '🦀', 'couracado'], ['Tubarão Pré-histórico', '🦈', 'feroz']], semi: ['Polvo Gigante', '🐙', 'regenerador'],
      boss: { name: 'Kraken do Abismo', emoji: '🦑', mods: ['esmagador', 'regenerador'], sp: 'Abraço do Abismo', trophy: 'Tentáculo Negro', tIcon: '🦑' } },
    { id: 11, name: 'Cume da Montanha', icon: '🏔️', color: '#555a66',
      story: 'O ar é fino e a rocha, afiada. Gigantes de pedra guardam a subida para o pico.',
      clear: 'No topo, você avista fumaça negra ao longe: uma floresta amaldiçoada.',
      m: [['Golem de Rocha', '🗿', 'couracado'], ['Alce Colossal', '🦌', 'feroz']], semi: ['Troll de Pedra', '👹', 'esmagador'],
      boss: { name: 'Anquilossauro Pétreo', emoji: '🐢', mods: ['couracado', 'regenerador'], sp: 'Cauda Martelo', trophy: 'Martelo de Cauda', tIcon: '🔨' } },
    { id: 12, name: 'Floresta Maldita', icon: '🌑', color: '#2d2440',
      story: 'As árvores sussurram e a luz some. Um xamã sombrio comanda as feras com cantos antigos.',
      clear: 'A maldição se desfez. O xamã revelou: o fogo está nas terras vulcânicas.',
      m: [['Caçador de Crânios', '👹', 'feroz'], ['Espectro das Árvores', '👻', 'veloz']], semi: ['Xamã Aprendiz', '🧙', 'venenoso'],
      boss: { name: 'Xamã Sombrio', emoji: '🎭', mods: ['venenoso', 'esmagador'], sp: 'Maldição Tribal', trophy: 'Máscara Tribal', tIcon: '🎭' } },
    { id: 13, name: 'Terras Vulcânicas', icon: '🌋', color: '#6b2a18',
      story: 'O chão ferve e o ar queima. Rios de lava cortam o caminho e criaturas de fogo rondam as crateras.',
      clear: 'O titã de magma ruiu. Além da fumaça, antigas ruínas guardam o segredo do roubo.',
      m: [['Besta de Lava', '🔥', 'regenerador'], ['Serpente de Fogo', '🐍', 'venenoso']], semi: ['Salamandra Gigante', '🦎', 'feroz'],
      boss: { name: 'Titã de Magma', emoji: '🌋', mods: ['feroz', 'regenerador'], sp: 'Sopro de Magma', trophy: 'Coração de Magma', tIcon: '🌋' } },
    { id: 14, name: 'Ruínas Ancestrais', icon: '🏛️', color: '#4a4a3a',
      story: 'Tribos rivais ocupam as ruínas. Eles servem ao Tirano, o verdadeiro ladrão do fogo.',
      clear: 'O senhor da guerra caiu e revelou: o Tirano espera no covil, no fim do mundo.',
      m: [['Guerreiro Rival', '🧟', 'couracado'], ['Fera das Ruínas', '🐗', 'feroz']], semi: ['Capitão dos Rivais', '🧟', 'couracado'],
      boss: { name: 'Senhor da Guerra', emoji: '👺', mods: ['couracado', 'feroz'], sp: 'Golpe Brutal', trophy: 'Machado de Guerra', tIcon: '🪓' } },
    { id: 15, name: 'Covil do Tirano', icon: '👑', color: '#5a1d1d',
      story: 'O fogo sagrado arde no fundo do covil. Ossos de reis tombados formam o trono do Tirano.',
      clear: 'O Tirano caiu! O fogo sagrado volta à tribo e você se torna lenda.',
      m: [['Tiranete', '🦖', 'esmagador'], ['Fera Primordial', '👹', 'feroz']], semi: ['Alfa do Tirano', '🦖', 'feroz'],
      boss: { name: 'Tiranossauro Rei', emoji: '👑', mods: ['feroz', 'esmagador'], sp: 'Rugido do Rei', trophy: 'Coroa do Rei Rex', tIcon: '🏆' } },
  ];
  G.BOSSES = G.ZONES.map((z) => Object.assign({ no: z.id, zone: z.name }, z.boss));
  // nível-base de cada local (as 4 lutas somam -1, 0, +1 e +2 a esse nível)
  G.ZONE_LEVELS = [2, 4, 5, 7, 9, 11, 12, 14, 16, 18, 19, 21, 23, 25, 26];
  // reforço das feras de cada local (a 2ª é mais forte que a 1ª)
  G.STEP_MUL = [{ hp: 1.4, atk: 1.9 }, { hp: 1.55, atk: 2.2 }];
  G.STEPS = [{ kind: 'normal', dl: -1, label: 'Fera' }, { kind: 'normal', dl: 0, label: 'Fera' }, { kind: 'semi', dl: 1, label: 'Semi-chefe' }, { kind: 'boss', dl: 2, label: 'Chefe' }];

  // Dragões: fora dos locais, voltam a cada 5 minutos
  G.DRAGONS = {
    verde: { id: 'verde', name: 'Dragão Verde', emoji: '🐲', level: 27, mods: ['venenoso', 'regenerador'], sp: 'Sopro Venenoso', unlockZone: 6, respawn: 300,
      mul: { hp: 8.5, atk: 2.3, arm: 1.5 }, tierPower: 3.9, trophy: 'Escama Esmeralda', tIcon: '💚', bonus: { stat: 'hp', v: 6 },
      blurb: 'Forte, mas justo. Guarda a clareira esmeralda.' },
    azul: { id: 'azul', name: 'Dragão Azul', emoji: '🐉', level: 36, mods: ['esmagador', 'couracado', 'feroz'], sp: 'Sopro Gélido', unlockZone: 10, respawn: 300,
      mul: { hp: 10, atk: 3.0, arm: 1.6 }, tierPower: 4.7, trophy: 'Escama Glacial', tIcon: '💙', bonus: { stat: 'atk', v: 6 },
      blurb: 'Muito forte. Só os heróis mais poderosos o derrotam.' },
  };

  // Ajuste fino da força de cada chefe (nivela a dificuldade entre efeitos diferentes)
  G.BOSS_TUNE = [1.08, 1.32, 1.28, 1.41, 0.94, 0.64, 1.40, 1.34, 1.63, 0.95, 1.63, 1.46, 1.83, 2.44, 2.22];
  // kind: normal | elite | semi | boss | event | dragon
  const KIND_MUL = {
    normal: { hp: 1.0, atk: 1.0, arm: 1.0 },
    elite:  { hp: 1.5, atk: 1.18, arm: 1.15 },
    semi:   { hp: 3.4, atk: 2.3, arm: 1.35 },
    boss:   { hp: 2.9, atk: 1.28, arm: 1.2 },
    event:  { hp: 4.0, atk: 1.5, arm: 1.3 },
  };
  G.makeMonster = function (level, kind, def) {
    const L = Math.max(1, level);
    kind = kind || 'normal';
    const k = kind === 'dragon' ? def.mul : KIND_MUL[kind];
    const m = { atk: (10 + 3.8 * L) * k.atk, hp: (40 + 16.5 * L) * k.hp, arm: (2 + 1.8 * L) * k.arm };
    if (kind === 'boss' && def && def.no) {
      const ease = Math.min(1, 0.66 + 0.05 * def.no);   // chefes iniciais são mais brandos
      m.hp *= (1.8 + 0.27 * def.no) * ease / k.hp; m.atk *= (1.15 + 0.075 * def.no + 0.13 * Math.max(0, def.no - 5)) * ease * G.BOSS_TUNE[def.no - 1] / k.atk;
    }
    let name, emoji, mods, special = null, bossNo = 0;
    if (kind === 'boss' || kind === 'event' || kind === 'dragon') {
      name = def.name; emoji = def.emoji; mods = def.mods.slice(); bossNo = def.no || 0;
      special = kind === 'dragon' ? { every: 3, mult: def.id === 'azul' ? 2.4 : 2.1, name: def.sp }
        : { every: kind === 'boss' ? (bossNo > 5 ? 3 : 4) : 3, mult: kind === 'boss' ? 1.8 + 0.03 * bossNo : 2.0, name: def.sp || 'Ataque Devastador' };
    } else {
      if (def) { name = def.name; emoji = def.emoji; mods = def.mods.slice(); }
      else {
        const tier = Math.min(POOL.length - 1, Math.floor((L - 1) / 7));
        const tr = R() < 0.3 && tier > 0 ? tier - 1 : tier;
        const [n, e, md] = pick(POOL[tr]);
        name = kind === 'semi' ? 'Alfa ' + n : n; emoji = e; mods = [md];
      }
      if (kind === 'elite') name += ' Veterano';
      if (kind === 'semi') special = { every: 5, mult: 1.6, name: 'Investida Selvagem' };
      const v = rand(0.93, 1.07); m.atk *= v; m.hp *= v;
    }
    for (const md of mods) {
      if (md === 'feroz') { m.atk *= 1.25; m.hp *= 0.85; }
      if (md === 'couracado') { m.arm *= 1.6; m.atk *= 0.9; }
      if (md === 'esmagador') { m.hp *= 1.1; }
    }
    return { name, emoji, level: L, kind, boss: kind === 'boss' || kind === 'event' || kind === 'dragon', bossNo, mods, special, dragon: kind === 'dragon' ? def.id : null,
      atk: Math.round(m.atk), hp: Math.round(m.hp), maxHp: Math.round(m.hp), arm: Math.round(m.arm) };
  };

  /* ---------- Combate ---------- */
  const reduce = (arm) => 100 / (100 + arm * 1.5);
  G.HEAVY_CD = 2; G.ACTIVE_CD = 4;

  G.startFight = function (st, mon, opts = {}) {
    const h = G.heroStats(st);
    return {
      mon, mode: opts.mode || 'zone', event: opts.event || null, zone: opts.zone || null,
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
    if (m.boss && !f.enraged && m.hp < m.maxHp * 0.6) {
      f.enraged = true; m.atk = Math.round(m.atk * 1.3);
      ev(f, 'warn', `💢 ${m.name} entra em fúria!`);
    }
    if (m.mods.includes('regenerador') && m.hp > 0) {
      const heal = Math.round(m.maxHp * 0.03);
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
      if (f.mode !== 'zone') { f.turn--; return bad('Não há como fugir deste combate!'); }
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
    if (dm <= 3) out.push({ id: 'festival', name: 'Festival do Ouro', icon: '🪙', desc: '+50% de ouro nos primeiros dias do mês', xp: 1, gold: 1.5 });
    if (wd === 3) out.push({ id: 'quarta', name: 'Quarta da Forja', icon: '🔨', desc: 'Ferreiro com 25% de desconto', xp: 1, gold: 1, forge: 0.75 });
    return out;
  };
  G.bonusMul = function (d = new Date()) {
    const e = G.bonusEvents(d); return { xp: e.reduce((a, b) => a * b.xp, 1), gold: e.reduce((a, b) => a * b.gold, 1), forge: e.reduce((a, b) => a * (b.forge || 1), 1) };
  };
  G.evSync = function (st, d = new Date()) {
    const day = G.dayKey(d);
    if (!st.ev) st.ev = { day: '', weekly: 0, monthly: 0, claimW: '', claimM: '' };
    if (st.ev.day !== day) { st.ev.day = day; st.ev.buys = 0; st.ev.weekly = G.EVENT_ATTEMPTS.weekly; st.ev.monthly = G.EVENT_ATTEMPTS.monthly; }
  };
  G.eventUnlocked = (st, type) => st.trophies.length >= G.EVENT_UNLOCK[type];
  G.eventMonster = function (st, type, d = new Date()) {
    const e = type === 'weekly' ? G.weeklyEvent(d) : G.monthlyEvent(d);
    const mon = G.makeMonster(st.level + (type === 'monthly' ? 2 : 1), 'event', Object.assign({}, e.def, type === 'monthly' ? { sp: e.def.sp } : {}));
    const sc = 0.4 + 0.14 * Math.min(15, st.trophies.length);   // cresce com o progresso na campanha
    mon.hp = mon.maxHp = Math.round(mon.maxHp * sc); mon.atk = Math.round(mon.atk * (1 + (sc - 1) * 0.8));
    if (type === 'monthly') { mon.hp = mon.maxHp = Math.round(mon.maxHp * 1.35); mon.atk = Math.round(mon.atk * 1.12); }
    return { mon, key: e.key, def: e.def };
  };
  G.EVENT_SHOP = [
    { id: 'pot',   name: '3 Poções Grandes', icon: '🧪', cost: 10 },
    { id: 'ossos', name: '40 Ossos',          icon: '🦴', cost: 12 },
    { id: 'runaR', name: 'Runa Rara',         icon: '🔶', cost: 60 },
    { id: 'itemR', name: 'Item Raro',         icon: '🎁', cost: 45 },
  ];
  G.buyEventOffer = function (st, id) {
    const o = G.EVENT_SHOP.find((x) => x.id === id);
    if (!o) return { ok: false, msg: 'Oferta inválida.' };
    if (st.fossils < o.cost) return { ok: false, msg: 'Fósseis insuficientes.' };
    if ((id === 'runaR' || id === 'itemR') && st.bag.length >= st.bagSize) return { ok: false, msg: 'Baú cheio!' };
    st.fossils -= o.cost;
    if (id === 'pot') st.potions.large += 3;
    if (id === 'ossos') st.ossos += 40;
    if (id === 'runaR') { const r = G.makeRune(st.level, 2); st.bag.push(r); G.discover(st, r); }
    if (id === 'itemR') { const it = G.makeItem(pick(G.SLOT_ORDER), st.level, 2); st.bag.push(it); G.discover(st, it); }
    return { ok: true, msg: `Trocou por ${o.name}.` };
  };

  /* ---------- Jornada: locais, lutas e progresso ---------- */
  G.zoneProgress = (st, z) => Math.min(4, (st.zones && st.zones[z]) || 0);       // lutas vencidas no local (0–4)
  G.zoneCleared = (st, z) => G.zoneProgress(st, z) >= 4;
  G.zoneUnlocked = (st, z) => z === 1 || G.zoneCleared(st, z - 1);
  G.zonesCleared = (st) => G.ZONES.filter((x) => G.zoneCleared(st, x.id)).length;
  G.currentZone = (st) => { for (const x of G.ZONES) if (!G.zoneCleared(st, x.id)) return x.id; return G.ZONES.length; };
  G.zoneLevel = (z) => G.ZONE_LEVELS[z - 1];
  G.stepLevel = (z, step) => Math.max(1, G.zoneLevel(z) + G.STEPS[step].dl);

  // Inimigo de uma luta do local. step: 0, 1 (feras), 2 (semi-chefe), 3 (chefe)
  G.stepMonster = function (z, step, noElite) {
    const Z = G.ZONES[z - 1], lvl = G.stepLevel(z, step), kind = G.STEPS[step].kind;
    if (kind === 'boss') return G.makeMonster(lvl, 'boss', Object.assign({ no: z }, Z.boss));
    const ease = Math.min(1, 0.3 + 0.13 * z);   // os primeiros locais são mais brandos
    const soften = (mon) => { mon.atk = Math.round(mon.atk * ease); mon.hp = mon.maxHp = Math.round(mon.hp * (0.5 + 0.5 * ease)); return mon; };
    if (kind === 'semi') { const [n, e, md] = Z.semi; const mon = soften(G.makeMonster(lvl, 'semi', { name: n, emoji: e, mods: [md] })); if (z === 1) { mon.atk = Math.round(mon.atk * 0.8); } return mon; }
    const [n, e, md] = Z.m[step], elite = !noElite && R() < 0.08;
    const mon = G.makeMonster(lvl, elite ? 'elite' : 'normal', { name: n, emoji: e, mods: [md] });
    mon.hp = mon.maxHp = Math.round(mon.hp * G.STEP_MUL[step].hp); mon.atk = Math.round(mon.atk * G.STEP_MUL[step].atk);
    return soften(mon);
  };

  // Verifica se pode lutar. Retorna { ok, msg, cost, replay }
  G.canFightZone = function (st, z, step, now = Date.now()) {
    G.syncTime(st, now);
    if (!G.zoneUnlocked(st, z)) return { ok: false, msg: 'Local bloqueado: vença o chefe do local anterior.' };
    const prog = G.zoneProgress(st, z);
    if (step > prog) return { ok: false, msg: 'Vença as lutas anteriores primeiro.' };
    if (G.cooldownLeft(st, now) > 0) return { ok: false, msg: `Recuperando o fôlego (${G.cooldownLeft(st, now)}s).` };
    const cost = G.STEP_COST[step];
    if (st.energy < cost) return { ok: false, msg: `Faltam encontros (precisa de ${cost}).` };
    return { ok: true, cost, replay: step < prog };
  };
  G.spendEnergy = function (st, n) { if (st.energy >= G.MAX_ENERGY) st.energyAt = Date.now(); st.energy -= n; };

  /* ---------- Dragões ---------- */
  G.dragonUnlocked = (st, id) => G.zonesCleared(st) >= G.DRAGONS[id].unlockZone;
  G.dragonLeft = (st, id, now = Date.now()) => Math.max(0, Math.ceil(((st.dragons[id].readyAt || 0) - now) / 1000));
  G.dragonMonster = (id) => G.makeMonster(G.DRAGONS[id].level, 'dragon', G.DRAGONS[id]);
  G.canFightDragon = function (st, id, now = Date.now()) {
    G.syncTime(st, now);
    const d = G.DRAGONS[id];
    if (!G.dragonUnlocked(st, id)) return { ok: false, msg: `Vença ${d.unlockZone} locais para encontrar o ${d.name}.` };
    if (G.dragonLeft(st, id, now) > 0) return { ok: false, msg: `O dragão volta em ${G.dragonLeft(st, id, now)}s.` };
    if (G.cooldownLeft(st, now) > 0) return { ok: false, msg: `Recuperando o fôlego (${G.cooldownLeft(st, now)}s).` };
    return { ok: true };
  };
  G.dragonSkipCost = (st, id) => Math.ceil(G.dragonLeft(st, id) * (0.5 + 0.07 * st.level));
  G.skipDragon = function (st, id) {
    if (G.dragonLeft(st, id) <= 0) return { ok: false, msg: 'O dragão já está pronto.' };
    const c = G.dragonSkipCost(st, id);
    if (st.gold < c) return { ok: false, msg: 'Ouro insuficiente.' };
    st.gold -= c; st.dragons[id].readyAt = 0;
    return { ok: true, msg: 'O dragão despertou!' };
  };

  // Verifica eventos (chefes semanal/mensal). type: event-weekly | event-monthly
  G.canFight = function (st, type, now = Date.now()) {
    G.syncTime(st, now);
    if (G.cooldownLeft(st, now) > 0) return { ok: false, msg: `Recuperando o fôlego (${G.cooldownLeft(st, now)}s).` };
    if (type === 'event-weekly' || type === 'event-monthly') {
      const t = type.split('-')[1];
      if (!G.eventUnlocked(st, t)) return { ok: false, msg: `Derrote ${G.EVENT_UNLOCK[t]} chefes para liberar.` };
      if (st.ev[t] <= 0) return { ok: false, msg: 'Sem tentativas hoje.' };
    }
    return { ok: true };
  };

  /* ---------- Caixas (+1 a +5) ---------- */
  G.BOX_ITEMS = [1, 1, 2, 2, 3];
  // chance de cada raridade (comum, incomum, raro, épico, lendário) por nível de caixa
  G.BOX_ODDS = [[88, 11, 1, 0, 0], [40, 48, 12, 0, 0], [8, 37, 50, 5, 0], [0, 10, 50, 36, 4], [0, 0, 30, 50, 20]];
  // chance de cada item da caixa ser uma runa: raras, só em caixas altas
  G.BOX_RUNE = [0, 0.03, 0.07, 0.15, 0.25];
  G.boxName = (tier) => `Caixa +${tier}`;
  G.makeBox = (tier, ilvl) => ({ id: uid(), tier, ilvl });
  // "poder" base de cada tipo de luta; cresce com o local (feras fracas → +1; chefes → caixas maiores)
  const BOX_BASE = { normal: 0.75, elite: 1.3, semi: 1.35, boss: 2.5 };
  G.rollBoxTier = function (power) { return Math.max(1, Math.min(5, Math.round(power + rand(-0.8, 0.8)))); };
  G.boxPower = (kind, z) => BOX_BASE[kind] + 2 * (z - 1) / 14;
  G.openBox = function (st, boxId) {
    const i = st.boxes.findIndex((b) => b.id === boxId);
    if (i < 0) return { ok: false, msg: 'Caixa não encontrada.' };
    const box = st.boxes[i], n = G.BOX_ITEMS[box.tier - 1];
    if (st.bag.length + n > st.bagSize) return { ok: false, msg: `Baú sem espaço (precisa de ${n} vagas).` };
    const odds = G.BOX_ODDS[box.tier - 1], tot = odds.reduce((a, b) => a + b, 0), items = [];
    for (let k = 0; k < n; k++) {
      let x = R() * tot, rar = 0;
      for (let r = 0; r < odds.length; r++) { x -= odds[r]; if (x <= 0) { rar = r; break; } }
      const it = R() < G.BOX_RUNE[box.tier - 1] ? G.makeRune(box.ilvl, rar) : G.makeItem(pick(G.SLOT_ORDER), box.ilvl, rar);
      st.bag.push(it); items.push(it); G.discover(st, it);
    }
    st.boxes.splice(i, 1);
    return { ok: true, items, box };
  };

  /* ---------- Recompensas ---------- */
  G.addItem = function (st, it) { if (st.bag.length >= st.bagSize) return false; st.bag.push(it); G.discover(st, it); return true; };

  function giveXp(st, xp) {
    const levels = [];
    if (st.level >= G.MAX_LEVEL) return levels;
    st.xp += xp;
    while (st.level < G.MAX_LEVEL && st.xp >= G.xpToNext(st.level)) { st.xp -= G.xpToNext(st.level); st.level++; levels.push(st.level); }
    if (st.level >= G.MAX_LEVEL) st.xp = 0;
    if (levels.length) { G.setHp(st, G.heroStats(st).hp); G.refreshShop(st); }
    return levels;
  }
  const REPLAY = 0.6;   // rejogar um local já vencido rende 60% do XP/ouro

  G.finishFight = function (st, f, now = new Date()) {
    const rep = { won: f.won, fled: f.fled, xp: 0, gold: 0, ossos: 0, fossils: 0, boxes: [], levels: [], trophy: null, trophyBonus: null, evTrophy: null, dragonTrophy: null,
      zoneCleared: null, nextZone: null, finishedGame: false, replay: false, kind: f.mon.kind, mode: f.mode };
    G.setHp(st, f.won ? f.hero.hp : Math.max(1, Math.round(f.hero.max * 0.1)));
    st.cdUntil = now.getTime() + G.BATTLE_CD * 1000;
    const isDragon = f.mode === 'dragon', isEvent = f.mode === 'event-weekly' || f.mode === 'event-monthly';
    if (isDragon && !f.fled) st.dragons[f.mon.dragon].readyAt = now.getTime() + G.DRAGONS[f.mon.dragon].respawn * 1000;
    if (f.fled) return rep;
    if (!f.won) {
      const loss = Math.min(st.gold, Math.round(st.gold * 0.1));
      st.gold -= loss; rep.gold = -loss;
      if (isEvent) st.ev[f.mode.split('-')[1]]--;
      return rep;
    }
    const m = f.mon, h = f.hero ? G.heroStats(st) : G.heroStats(st), bm = G.bonusMul(now);
    let xpMul, goldMul, replay = false;
    if (f.mode === 'zone') {
      replay = f.zone.step < G.zoneProgress(st, f.zone.z);
      xpMul = STEP_XP[f.zone.step]; goldMul = STEP_GOLD[f.zone.step];
      if (m.kind === 'elite') { xpMul *= ELITE_MUL; goldMul *= ELITE_MUL; }
    } else if (isDragon) { xpMul = OTHER_XP[m.dragon]; goldMul = OTHER_GOLD[m.dragon]; }
    else { xpMul = OTHER_XP.event; goldMul = OTHER_GOLD.event; }
    const rel = G.relFactor(m.level, st.level), rp = replay ? REPLAY : 1;
    rep.replay = replay;
    rep.xp = Math.round(G.monsterXp(m.level, xpMul) * rel * rp * bm.xp * h.xp);
    rep.gold = Math.round((6 + 3 * m.level) * rand(0.8, 1.2) * goldMul * rel * rp * bm.gold * h.gold * G.GOLD_RATE);
    st.gold += rep.gold; st.totalKills++;

    // caixas
    const mk = (power) => { const bx = G.makeBox(G.rollBoxTier(power), m.level); st.boxes.push(bx); rep.boxes.push(bx); };
    if (f.mode === 'zone') {
      const z = f.zone.z, kind = m.kind, pw = G.boxPower(kind, z);
      if (kind === 'normal') { if (R() < 0.55) mk(pw); }
      else if (kind === 'elite') { if (R() < 0.85) mk(pw); }
      else if (kind === 'semi') { mk(pw); if (R() < 0.25) mk(pw - 0.5); }
      else { mk(pw); if (R() < 0.6) mk(pw - 1); }
      rep.ossos = kind === 'boss' ? 12 + Math.floor(m.level / 3) : kind === 'semi' ? 5 + Math.floor(m.level / 6) : 1 + Math.floor(m.level / 10);
      if (replay) rep.ossos = Math.ceil(rep.ossos * REPLAY);
      if (kind === 'boss' && !replay) st.potions.large += 1;
    } else if (isDragon) {
      const d = G.DRAGONS[m.dragon];
      mk(d.tierPower); if (R() < (m.dragon === 'azul' ? 0.7 : 0.5)) mk(d.tierPower - 1);
      rep.ossos = m.dragon === 'azul' ? 40 : 25; rep.fossils = m.dragon === 'azul' ? 20 : 10; st.fossils += rep.fossils;
      st.potions.large += m.dragon === 'azul' ? 2 : 1;
      if (!st.dragonTrophies.includes(m.dragon)) { st.dragonTrophies.push(m.dragon); rep.dragonTrophy = d; }
    } else {
      const t = f.mode.split('-')[1];
      st.ev[t]--;
      rep.fossils = t === 'weekly' ? 6 + Math.floor(m.level / 4) : 25 + Math.floor(m.level / 2); st.fossils += rep.fossils;
      const claimKey = t === 'weekly' ? 'claimW' : 'claimM';
      if (st.ev[claimKey] !== f.event.key) {
        st.ev[claimKey] = f.event.key;
        if (t === 'weekly') { mk(3.2); mk(2.4); } else { mk(4.8); mk(3.4); }
        const tid = `${t[0]}-${f.event.key}-${f.event.def.id}`;
        if (!st.evTrophies.find((x) => x.id === tid)) {
          rep.evTrophy = { id: tid, name: `${f.event.def.name} (${f.event.key})`, icon: f.event.def.tIcon, type: t, bonus: G.evTrophyBonus(t, st.evTrophies.length) };
          st.evTrophies.push(rep.evTrophy);
        }
      }
      rep.ossos = t === 'weekly' ? 15 : 30;
    }
    st.ossos += rep.ossos;
    if (R() < 0.18) st.potions.small++;

    // progresso na jornada
    if (f.mode === 'zone' && !replay) {
      const z = f.zone.z; st.zones[z] = f.zone.step + 1;
      if (f.zone.step === 3) {
        const b = G.BOSSES[z - 1];
        if (!st.trophies.includes(b.no)) st.trophies.push(b.no);
        rep.trophy = b; rep.trophyBonus = G.trophyBonus(b.no); rep.zoneCleared = G.ZONES[z - 1];
        if (z < G.ZONES.length) rep.nextZone = G.ZONES[z]; else if (!st.finished) { st.finished = true; rep.finishedGame = true; }
      }
    }
    rep.levels = giveXp(st, rep.xp);
    return rep;
  };

  /* ---------- Loja ---------- */
  G.SHOP_ODDS = [0.58, 0.35];          // comum, incomum (o resto é raro: 7%)
  G.SHOP_RUNE_CHANCE = 0.3;
  G.refreshShop = function (st) {
    const L = st.level, eq = [], runes = [];
    // a loja só vende comum, incomum e (raramente) raro: épico e lendário só saem de caixas altas
    const roll = () => { const x = R(); return x < G.SHOP_ODDS[0] ? 0 : x < G.SHOP_ODDS[0] + G.SHOP_ODDS[1] ? 1 : 2; };
    for (const slot of ['arma', 'arma', 'escudo', 'elmo', 'armadura', 'armadura', 'luvas', 'botas', 'amuleto', 'amuleto']) eq.push(G.makeItem(slot, L, roll()));
    // runas: item raro, em média menos de 1 por renovação (e nunca comuns)
    const nr = R() < G.SHOP_RUNE_CHANCE ? (R() < 0.2 ? 2 : 1) : 0;
    for (let i = 0; i < nr; i++) runes.push(G.makeRune(L, R() < 0.7 ? 1 : 2));
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
    if (st.gold < p) return { ok: false, msg: 'Ouro insuficiente.' };
    if (st.bag.length >= st.bagSize) return { ok: false, msg: 'Baú cheio!' };
    st.gold -= p; st.bag.push(it); G.discover(st, it);
    st.shop.equip = st.shop.equip.filter((x) => x.id !== id);
    st.shop.runes = st.shop.runes.filter((x) => x.id !== id);
    return { ok: true, msg: `Comprou ${G.itemName(it)}.` };
  };
  G.buyPotion = function (st, kind) {
    const p = G.potionPrice(st, kind);
    if (st.gold < p) return { ok: false, msg: 'Ouro insuficiente.' };
    st.gold -= p; st.potions[kind]++;
    return { ok: true, msg: 'Poção comprada.' };
  };
  G.buyBagSlots = function (st) {
    if (st.bagSize >= G.BAG_MAX) return { ok: false, msg: 'Baú no tamanho máximo.' };
    const c = Math.round(G.bagUpgradeCost(st));
    if (st.gold < c) return { ok: false, msg: 'Ouro insuficiente.' };
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
  G.upgradeCost = (it, forge = 1) => Math.round((4 + 2.2 * it.ilvl) * 0.85 * (it.plus + 1) * (1 + it.rarity * 0.3) * forge);
  G.upgradeOssos = (it) => Math.round(3 + it.plus * 2.5 + it.rarity * 3);
  G.dismantleYield = (it) => Math.round([2, 4, 8, 16, 32][it.rarity] * (1 + it.ilvl / 20) * (1 + (it.plus || 0) * 0.3));

  G.upgrade = function (st, id, now = new Date()) {
    const f = G.findItem(st, id);
    if (!f) return { ok: false, msg: 'Item não encontrado.' };
    const it = f.it;
    if (it.plus >= G.MAX_PLUS) return { ok: false, msg: 'Já está no máximo.' };
    const forge = G.bonusMul(now).forge, c = G.upgradeCost(it, forge), o = G.upgradeOssos(it);
    if (st.gold < c) return { ok: false, msg: 'Ouro insuficiente.' };
    if (st.ossos < o) return { ok: false, msg: 'Ossos insuficientes.' };
    st.gold -= c;
    if (R() < G.upgradeChance(it)) {
      st.ossos -= o; it.plus++; it.pity = 0;
      return { ok: true, success: true, msg: `${G.itemName(it)} agora é +${it.plus}!` };
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
  G.fuseCost = (rarity) => 90 * (rarity + 1) * (rarity + 1);
  G.fuseRunes = function (st, key) {
    const grp = G.runeGroups(st).find((x) => x.key === key);
    if (!grp) return { ok: false, msg: 'Você não tem 3 runas iguais.' };
    const c = G.fuseCost(grp.rarity);
    if (st.gold < c) return { ok: false, msg: 'Ouro insuficiente.' };
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
    if (s.v < 3) {   // v2 -> v3: jornada em locais, caixas e dragões
      s.zones = {};
      const done = s.finished ? G.ZONES.length : Math.max(0, (s.bossNo || 1) - 1);
      for (let z = 1; z <= done; z++) s.zones[z] = 4;
      if (!s.finished && done < G.ZONES.length) s.zones[done + 1] = Math.min(3, s.kills || 0);
      s.boxes = s.boxes || []; s.dragonTrophies = s.dragonTrophies || [];
      s.dragons = s.dragons || { verde: { readyAt: 0 }, azul: { readyAt: 0 } };
      delete s.kills; delete s.bossNo; s.v = 3;
    }
    if (!s.codex) { s.codex = {}; [].concat(s.bag || [], Object.values(s.equipped || {}).filter((x) => x && !Array.isArray(x)), (s.equipped && s.equipped.runas) || []).filter(Boolean).forEach((it) => G.discover(s, it)); }
    if (!s.avatar) s.avatar = Object.assign({}, G.DEFAULT_AVATAR);
    (s.evTrophies || []).forEach((e, i) => { if (!e.bonus) e.bonus = G.evTrophyBonus(e.type, i); });
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
