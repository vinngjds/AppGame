/* Era da Pedra — loja de conjuntos, diamantes, VIP e slots (encontros).
   Complementa core.js (usa o objeto global G). */
(function (root) {
  'use strict';
  const G = root.G || (typeof require === 'function' ? require('./core.js') : null);
  const R = Math.random;

  /* ---------- Conjuntos: cada um é um material (tier) com raridade fixa ---------- */
  G.SETS = [
    { id: 0, name: 'Conjunto do Rastreador', mat: 'Madeira e couro', minLevel: 10, ilvlMin: 1,  rarity: 0, cur: 'gold' },
    { id: 1, name: 'Conjunto do Batedor',    mat: 'Sílex e pele',    minLevel: 10, ilvlMin: 8,  rarity: 1, cur: 'gold' },
    { id: 2, name: 'Conjunto do Caçador',    mat: 'Pedra polida',    minLevel: 10, ilvlMin: 16, rarity: 2, cur: 'gold' },
    { id: 3, name: 'Conjunto do Bárbaro',    mat: 'Osso e casco',    minLevel: 10, ilvlMin: 24, rarity: 3, cur: 'gold' },
    { id: 4, name: 'Conjunto do Rei Mamute', mat: 'Marfim de mamute', minLevel: 10, ilvlMin: 32, rarity: 4, cur: 'gem' },
  ];
  G.SET_MARKUP = 3.5;
  G.setUnlocked = (st, set) => st.level >= set.minLevel;
  // o nível do item acompanha o herói, dentro da faixa do material do conjunto
  G.setIlvl = (st, set) => Math.max(set.ilvlMin, Math.min(st.level, set.id === 4 ? 99 : set.id * 8 + 7));
  G.setPiece = function (st, set, slot) {
    const it = G.makeItem(slot, G.setIlvl(st, set), set.rarity);
    it.set = set.id;
    return it;
  };
  G.setPrice = function (st, set, slot) {
    const it = G.setPiece(st, set, slot);
    if (set.cur === 'gem') return { cur: 'diamonds', n: Math.round(12 + it.ilvl * 0.3) };
    return { cur: 'gold', n: Math.round(G.itemPrice(it) * G.SET_MARKUP) };
  };
  const allItems = (st) => st.bag.concat(G.SLOT_ORDER.map((s) => st.equipped[s]).filter(Boolean));
  // "Comprado": peça comprada na loja, ou peça de caixa do mesmo conjunto que seja igual ou melhor que a vendida agora
  // (uma peça de caixa mais fraca não bloqueia a compra da melhor)
  G.setOwned = (st, set, slot) => { const il = G.setIlvl(st, set); return allItems(st).some((x) => x.set === set.id && x.slot === slot && (x.shop || x.ilvl >= il)); };
  G.setProgress = (st, set) => G.SLOT_ORDER.filter((s) => G.setOwned(st, set, s)).length;
  G.buySetPiece = function (st, setId, slot) {
    const set = G.SETS[setId];
    if (!set || !G.SLOT_ORDER.includes(slot)) return { ok: false, msg: 'Peça indisponível.' };
    if (!G.setUnlocked(st, set)) return { ok: false, msg: `Alcance o nível ${set.minLevel} para comprar este conjunto.` };
    if (G.setOwned(st, set, slot)) return { ok: false, msg: 'Você já tem esta peça.' };
    if (st.bag.length >= st.bagSize) return { ok: false, msg: 'Baú cheio!' };
    const p = G.setPrice(st, set, slot), it = G.setPiece(st, set, slot);
    if (p.cur === 'diamonds') { if (st.diamonds < p.n) return { ok: false, msg: 'Diamantes insuficientes.' }; st.diamonds -= p.n; }
    else { if (st.gold < p.n) return { ok: false, msg: 'Ouro insuficiente.' }; st.gold -= p.n; }
    it.shop = true; st.bag.push(it); G.discover(st, it);
    return { ok: true, msg: `Comprou ${G.itemName(it)}.`, item: it };
  };
  // bônus por peças equipadas do mesmo conjunto (3 / 5 / 7 peças)
  G.SET_BONUS = [[7, 10], [5, 5], [3, 2]];
  G.setBonusFor = (n) => { for (const [k, v] of G.SET_BONUS) if (n >= k) return v; return 0; };
  G.setBonus = function (st) {
    const cnt = {};
    for (const s of G.SLOT_ORDER) { const it = st.equipped[s]; if (it && it.set != null) cnt[it.set] = (cnt[it.set] || 0) + 1; }
    return Object.values(cnt).reduce((m, n) => Math.max(m, G.setBonusFor(n)), 0);
  };

  /* ---------- Runas: só por diamantes ---------- */
  G.RUNE_SHOP_LEVEL = 10;
  G.runeOffers = function (st) {
    const out = [];
    for (const t of Object.keys(G.RUNES)) for (const rar of [2, 3]) {
      out.push({ t, rarity: rar, price: rar === 2 ? 6 + Math.floor(st.level / 5) : 14 + Math.floor(st.level / 3) });
    }
    return out;
  };
  G.buyRune = function (st, t, rarity) {
    const o = G.runeOffers(st).find((x) => x.t === t && x.rarity === rarity);
    if (!o) return { ok: false, msg: 'Runa indisponível.' };
    if (st.level < G.RUNE_SHOP_LEVEL) return { ok: false, msg: `Alcance o nível ${G.RUNE_SHOP_LEVEL} para comprar runas.` };
    if (st.diamonds < o.price) return { ok: false, msg: 'Diamantes insuficientes.' };
    if (st.bag.length >= st.bagSize) return { ok: false, msg: 'Baú cheio!' };
    st.diamonds -= o.price;
    const it = G.makeRune(st.level, rarity, t); st.bag.push(it); G.discover(st, it);
    return { ok: true, msg: `Comprou ${it.name}.`, item: it };
  };

  /* ---------- Diamantes: raros (dragões, eventos, caixas +4/+5) ---------- */
  G.BOX_DIAMOND = [0, 0, 0, 0.1, 0.3];   // chance por caixa +1..+5 (no máximo 30%)
  G.rollDiamonds = (p, max = 1) => (R() < p ? 1 + Math.floor(R() * max) : 0);
  // evoluir lendários e runas também gasta diamantes
  G.upgradeDiamonds = (it) => (it.rune || it.rarity >= 4 ? 1 + Math.floor((it.plus || 0) / 2) : 0);

  /* ---------- VIP e slots ---------- */
  G.VIP = { price: 200, days: 30, slots: 24, xp: 1.1, gold: 1.2, regen: 0.75, resetDiscount: 0.7 };
  G.isVip = (st, now = Date.now()) => (st.vipUntil || 0) > now;
  G.vipLeft = (st, now = Date.now()) => Math.max(0, (st.vipUntil || 0) - now);
  G.buyVip = function (st, now = Date.now()) {
    if (st.diamonds < G.VIP.price) return { ok: false, msg: `Diamantes insuficientes (precisa de ${G.VIP.price}).` };
    st.diamonds -= G.VIP.price;
    st.vipUntil = Math.max(now, st.vipUntil || 0) + G.VIP.days * 86400000;
    return { ok: true, msg: `VIP ativo por mais ${G.VIP.days} dias!` };
  };
  G.maxEnergy = (st, now = Date.now()) => (G.isVip(st, now) ? G.VIP.slots : G.MAX_ENERGY);
  G.energySecs = (st, now = Date.now()) => (G.isVip(st, now) ? G.ENERGY_SECS * G.VIP.regen : G.ENERGY_SECS);
  // zerou os slots: pagar caro para restaurá-los de uma vez (sobe com o nível)
  G.energyResetCost = (st) => Math.round((160 + 45 * st.level) * (G.isVip(st) ? G.VIP.resetDiscount : 1));
  G.resetEnergy = function (st) {
    if (st.energy > 0) return { ok: false, msg: 'Só dá para restaurar quando os encontros acabam.' };
    const c = G.energyResetCost(st);
    if (st.gold < c) return { ok: false, msg: 'Ouro insuficiente.' };
    st.gold -= c; st.energy = G.maxEnergy(st); st.energyAt = Date.now();
    return { ok: true, msg: 'Encontros restaurados!' };
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = G;
})(typeof window !== 'undefined' ? window : globalThis);
