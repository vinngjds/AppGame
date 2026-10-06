/* Era da Pedra — interface (mobile first) */
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const view = $('#view'), top = $('#top'), nav = $('#nav'), overlay = $('#overlay'), modal = $('#modal'), toastEl = $('#toast');
  let st = G.load();
  let screen = 'cacar', shopTab = 'equip', bagFilter = 'todos';
  let fight = null, busy = false;

  const TABS = [['cacar', '⚔️', 'Caçar'], ['heroi', '🧍', 'Herói'], ['bau', '🧳', 'Baú'], ['loja', '🛒', 'Loja'], ['trofeus', '🏆', 'Troféus']];
  const fmt = (n) => Math.round(n).toLocaleString('pt-BR');
  const save = () => G.save(st);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const buzz = (ms) => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { /* ignore */ } };

  function toast(msg) {
    toastEl.textContent = msg; toastEl.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(() => (toastEl.hidden = true), 2200);
  }
  const rarColor = (it) => G.RARITIES[it.rarity].color;

  /* ---------- Cabeçalho / navegação ---------- */
  function renderTop() {
    const s = G.heroStats(st);
    const need = G.xpToNext(st.level);
    const pct = st.level >= G.MAX_LEVEL ? 100 : Math.floor((st.xp / need) * 100);
    top.innerHTML = `
      <div class="toprow"><div class="title">🦴 ERA DA PEDRA</div><div><span class="gold">🐚 ${fmt(st.gold)}</span> <button class="btn sm" data-act="menu" style="margin-left:6px">⚙️</button></div></div>
      <div class="stats"><span>⚔️ ${fmt(s.atk)}</span><span>❤️ ${fmt(s.hp)}</span><span>🛡️ ${fmt(s.arm)}</span><span>🎯 ${s.crit.toFixed(0)}%</span></div>
      <div class="xpbar"><b>⬆ ${st.level}</b><div class="bar"><i style="width:${pct}%"></i></div><b>${st.level >= G.MAX_LEVEL ? 'MÁX' : pct + '%'}</b></div>`;
    nav.innerHTML = TABS.map(([id, ic, nm]) => `<button data-nav="${id}" class="${id === screen ? 'on' : ''}"><span>${ic}</span>${nm}</button>`).join('');
  }
  function render() {
    G.syncTime(st);
    renderTop();
    ({ cacar: vCacar, heroi: vHeroi, bau: vBau, loja: vLoja, trofeus: vTrofeus })[screen]();
  }

  /* ---------- Caçar ---------- */
  function hpBar(cur, max, cls) { return `<div class="bar ${cls || 'hp'}"><i style="width:${Math.max(0, (cur / max) * 100)}%"></i><div class="t">${fmt(cur)} / ${fmt(max)}</div></div>`; }
  function modTags(mods) { return mods.map((m) => `<span class="tag" title="${esc(G.MODS[m].desc)}">${G.MODS[m].icon} ${G.MODS[m].name}</span>`).join(''); }

  function vCacar() {
    const s = G.heroStats(st), ready = G.bossReady(st);
    const boss = G.BOSSES[Math.min(st.bossNo, 15) - 1];
    const secs = Math.ceil(G.ENERGY_SECS - (Date.now() - st.energyAt) / 1000);
    const prog = Array.from({ length: G.KILLS_PER_BOSS }, (_, i) => `<b class="${i < st.kills ? 'on' : ''}"></b>`).join('');
    let h = `<div class="card"><div class="sub">Vida do herói</div>${hpBar(st.hp, s.hp)}
      <div class="sub" style="margin-top:6px">🧪 Poções: ${st.potions.small} pequenas · ${st.potions.large} grandes</div></div>`;
    if (st.finished) h += `<div class="card center"><div class="big">👑</div><div class="name">Você derrotou os 15 chefes!</div><div class="sub">Continue treinando e melhorando seus equipamentos.</div></div>`;
    h += `<h2 class="banner">${ready ? '🔥 O CHEFE TE DESAFIA!' : 'Caçada: ' + st.kills + '/' + G.KILLS_PER_BOSS + ' feras'}</h2>`;
    if (ready) {
      const m = G.makeMonster(st.level + 1, boss);
      h += `<div class="card boss"><div class="row"><div class="pic">${boss.emoji}</div><div class="grow">
        <div class="name">Chefe ${boss.no}/15 · ${boss.name}</div><div class="sub">Nível ${m.level} · Recompensa: ${boss.tIcon} ${boss.trophy} + itens raros</div>
        <div class="tags">${modTags(boss.mods)}</div></div></div>
        <button class="btn red" data-act="fight-story">⚔️ Enfrentar o Chefe</button></div>`;
    } else {
      h += `<div class="card"><div class="row"><div class="pic">🌿</div><div class="grow"><div class="name">Caçar na Selva</div>
        <div class="sub">Derrote ${G.KILLS_PER_BOSS - st.kills} fera(s) para despertar o chefe ${boss.no}.</div></div></div>
        <div class="prog">${prog}</div><button class="btn go" data-act="fight-story">🏹 Caçar</button></div>`;
    }
    h += `<div class="card"><div class="row"><div class="pic">🏟️</div><div class="grow"><div class="name">Arena de Treino</div>
      <div class="sub">Encontros restantes: <b>${st.energy}/${G.MAX_ENERGY}</b>${st.energy < G.MAX_ENERGY ? ` · próximo em ${secs}s` : ''}</div>
      <div class="sub">XP e conchas reduzidos, chance de itens. Não avança a caçada.</div></div></div>
      <button class="btn" data-act="fight-train" ${st.energy < 1 ? 'disabled' : ''}>🥊 Treinar</button></div>`;
    view.innerHTML = h;
  }

  /* ---------- Herói ---------- */
  function vHeroi() {
    const s = G.heroStats(st);
    const slots = G.SLOT_ORDER.map((sl) => {
      const it = st.equipped[sl];
      return it ? `<div class="slot" data-item="${it.id}" style="border-color:${rarColor(it)}">${it.icon}${it.plus ? `<small>+${it.plus}</small>` : ''}</div>`
        : `<div class="slot empty" title="${G.SLOTS[sl].name}">${G.SLOTS[sl].icon}</div>`;
    }).join('');
    view.innerHTML = `<div class="card center"><div class="heroart">🧔</div><div class="name">${esc(st.name)} · Nível ${st.level}</div>
      <div class="sub">Chefes derrotados: ${st.trophies.length}/15 · Feras abatidas: ${st.totalKills}</div>
      <div class="heroslots">${slots}</div><div class="sub" style="margin-top:6px">Toque em um item para ver detalhes.</div></div>
      <div class="card"><div class="name">Atributos</div><div class="hr"></div>
      <div class="row"><span class="grow">⚔️ Força</span><b>${fmt(s.atk)}</b></div>
      <div class="row"><span class="grow">❤️ Vida</span><b>${fmt(s.hp)}</b></div>
      <div class="row"><span class="grow">🛡️ Armadura</span><b>${fmt(s.arm)}</b></div>
      <div class="row"><span class="grow">🎯 Crítico</span><b>${s.crit.toFixed(1)}%</b></div></div>
      <div class="card"><div class="name">Como funciona</div><div class="sub" style="line-height:1.5">A cada ${G.KILLS_PER_BOSS} feras abatidas surge um chefe. Vença-o para ganhar um troféu e itens raros. Feras e chefes crescem junto com o seu nível. Use o Ferreiro e a Loja para ficar mais forte.</div></div>`;
  }

  /* ---------- Itens ---------- */
  function statLine(it) {
    const s = G.itemStats(it), p = [];
    if (s.atk) p.push(`⚔️ +${s.atk}`); if (s.hp) p.push(`❤️ +${s.hp}`); if (s.arm) p.push(`🛡️ +${s.arm}`); if (s.crit) p.push(`🎯 +${s.crit}%`);
    return p.join(' · ');
  }
  function itemRow(it, right, attr) {
    const cur = st.equipped[it.slot];
    const diff = cur && cur.id !== it.id ? G.itemScore(it) - G.itemScore(cur) : null;
    const arrow = diff == null ? '' : diff > 0 ? '<span class="up">▲</span>' : diff < 0 ? '<span class="down">▼</span>' : '';
    return `<div class="item" ${attr || `data-item="${it.id}"`} style="border-color:${rarColor(it)}">
      <div class="pic" style="border-color:${rarColor(it)}">${it.icon}</div>
      <div class="grow"><div class="name" style="color:${rarColor(it)}">${esc(it.name)}${it.plus ? ' +' + it.plus : ''} ${arrow}</div>
      <div class="stat">${G.RARITIES[it.rarity].name} · nv ${it.ilvl} · ${G.SLOTS[it.slot].name}</div><div class="stat">${statLine(it)}</div></div>${right || ''}</div>`;
  }

  function showItem(id, shopMode) {
    let it, where;
    if (shopMode) { it = st.shop.equip.concat(st.shop.amulet).find((x) => x.id === id); where = 'shop'; }
    else { const f = G.findItem(st, id); if (!f) return; it = f.it; where = f.where; }
    if (!it) return;
    const cur = st.equipped[it.slot];
    let h = itemRow(it, '', 'data-noop');
    if (cur && cur.id !== it.id) h += `<div class="sub">Equipado: ${esc(cur.name)} — ${statLine(cur)}</div>`;
    h += '<div class="hr"></div>';
    if (where === 'shop') h += `<button class="btn go" data-buy="${it.id}">Comprar · 🐚 ${fmt(G.itemPrice(it))}</button>`;
    if (where === 'bag') h += `<button class="btn go" data-eq="${it.id}">Equipar</button>`;
    if (where === 'eq') h += `<button class="btn" data-uneq="${it.slot}">Desequipar</button>`;
    if (where !== 'shop') {
      h += it.plus >= G.MAX_PLUS ? `<button class="btn" disabled>Ferreiro: nível máximo</button>`
        : `<button class="btn" data-up="${it.id}">🔨 Melhorar para +${it.plus + 1} · 🐚 ${fmt(G.upgradeCost(it))}</button>`;
    }
    if (where === 'bag') h += `<button class="btn red" data-sell="${it.id}">Vender · 🐚 ${fmt(G.sellPrice(it))}</button>`;
    h += `<button class="btn" data-close>Fechar</button>`;
    openModal(h);
  }
  function openModal(html) { modal.innerHTML = `<div class="sheet">${html}</div>`; modal.hidden = false; }
  function closeModal() { modal.hidden = true; modal.innerHTML = ''; }

  /* ---------- Baú ---------- */
  function vBau() {
    const f = ['todos', ...G.SLOT_ORDER];
    const list = st.bag.filter((i) => bagFilter === 'todos' || i.slot === bagFilter).sort((a, b) => G.itemScore(b) - G.itemScore(a));
    view.innerHTML = `<h2 class="banner">Baú de Itens (${st.bag.length}/${G.BAG_SIZE})</h2>
      <div class="seg" style="overflow-x:auto">${f.map((x) => `<button data-bf="${x}" class="${x === bagFilter ? 'on' : ''}">${x === 'todos' ? 'Todos' : G.SLOTS[x].icon}</button>`).join('')}</div>
      <div class="card"><div class="sub">Equipado</div><div class="heroslots">${G.SLOT_ORDER.map((sl) => { const it = st.equipped[sl]; return it ? `<div class="slot" data-item="${it.id}" style="border-color:${rarColor(it)}">${it.icon}</div>` : `<div class="slot empty">${G.SLOTS[sl].icon}</div>`; }).join('')}</div></div>
      ${list.length ? list.map((i) => itemRow(i)).join('') : '<div class="card center muted">Nada por aqui. Cace feras para encontrar itens!</div>'}
      ${list.length ? '<button class="btn red" data-act="sellweak">Vender todos os piores que o equipado</button>' : ''}`;
  }

  /* ---------- Loja ---------- */
  function vLoja() {
    const tabs = [['equip', '🛡️ Equipamento'], ['amulet', '📿 Amuletos'], ['pocao', '🧪 Poções'], ['ferreiro', '🔨 Ferreiro']];
    let h = `<h2 class="banner">Loja do Mercador</h2><div class="seg" style="flex-wrap:wrap">${tabs.map(([id, n]) => `<button data-st="${id}" class="${id === shopTab ? 'on' : ''}">${n}</button>`).join('')}</div>`;
    if (shopTab === 'equip' || shopTab === 'amulet') {
      const list = shopTab === 'equip' ? st.shop.equip : st.shop.amulet;
      h += list.length ? list.map((i) => itemRow(i, `<button class="btn sm go" data-buyq="${i.id}">🐚 ${fmt(G.itemPrice(i))}</button>`, `data-shopitem="${i.id}"`)).join('') : '<div class="card center muted">Estoque esgotado.</div>';
      h += `<button class="btn" data-act="refreshshop">🔄 Renovar estoque · 🐚 ${G.shopRefreshCost(st)}</button><div class="sub center" style="margin-top:6px">O estoque também se renova ao subir de nível.</div>`;
    } else if (shopTab === 'pocao') {
      h += [['small', 'Poção Pequena', 'Recupera 35% da vida em combate'], ['large', 'Poção Grande', 'Recupera 65% da vida em combate']].map(([k, n, d]) =>
        `<div class="card"><div class="row"><div class="pic">🧪</div><div class="grow"><div class="name">${n} (x${st.potions[k]})</div><div class="sub">${d}</div></div>
        <button class="btn sm go" data-pot="${k}">🐚 ${fmt(G.potionPrice(st, k))}</button></div></div>`).join('');
    } else {
      const all = G.SLOT_ORDER.map((s) => st.equipped[s]).filter(Boolean).concat(st.bag);
      h += `<div class="sub" style="margin-bottom:8px">O ferreiro afia seus itens: cada +1 aumenta os atributos em 10% (máx. +${G.MAX_PLUS}).</div>`;
      h += all.length ? all.map((i) => itemRow(i, i.plus >= G.MAX_PLUS ? '<span class="sub">MÁX</span>' : `<button class="btn sm" data-upq="${i.id}">🐚 ${fmt(G.upgradeCost(i))}</button>`, `data-noop`)).join('') : '<div class="card center muted">Sem itens.</div>';
    }
    view.innerHTML = h;
  }

  /* ---------- Troféus ---------- */
  function vTrofeus() {
    view.innerHTML = `<h2 class="banner">Salão de Troféus (${st.trophies.length}/15)</h2><div class="troph">${G.BOSSES.map((b) => {
      const got = st.trophies.includes(b.no);
      return `<div class="t ${got ? '' : 'lock'}"><div class="e">${got ? b.tIcon : '❔'}</div><b>${got ? b.trophy : 'Chefe ' + b.no}</b><div class="muted">${got ? b.name : 'Bloqueado'}</div></div>`;
    }).join('')}</div>`;
  }

  /* ---------- Combate ---------- */
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  function startFight(kind) {
    G.syncTime(st);
    let mon, mode;
    if (kind === 'train') {
      if (st.energy < 1) return toast('Sem encontros restantes.');
      if (st.energy === G.MAX_ENERGY) st.energyAt = Date.now();
      st.energy--; mon = G.trainingMonster(st); mode = 'training';
    } else ({ mon, mode } = G.nextStoryMonster(st));
    if (st.hp < 1) G.setHp(st, 1);
    fight = G.startFight(st, mon, { mode });
    save(); drawFight([]);
    overlay.hidden = false;
  }
  function drawFight(logLines) {
    const f = fight, m = f.mon;
    const potBtn = (k, n) => `<button class="btn" data-fa="potion-${k}" ${st.potions[k] > 0 ? '' : 'disabled'}>🧪 ${n} (${st.potions[k]})</button>`;
    overlay.innerHTML = `<div class="fight">
      <div class="arena ${m.boss ? 'boss' : ''}" id="arena" style="position:relative">
        <div class="sub">${m.boss ? '👑 CHEFE · ' : ''}Nível ${m.level}</div><div class="name">${esc(m.name)}</div>
        <div class="mon" id="mon">${m.emoji}</div>${hpBar(m.hp, m.maxHp, 'mhp')}
        <div class="tags" style="justify-content:center">${modTags(m.mods)}</div></div>
      <div class="log" id="log">${logLines.join('')}</div>
      <div style="font-size:13px;margin-bottom:4px">🧔 ${esc(st.name)} ${f.stunned ? '💫' : ''}${f.poison ? '☠️' : ''}</div>${hpBar(f.hero.hp, f.hero.max)}
      <div class="acts" style="margin-top:10px">
        <button class="btn red" data-fa="attack">⚔️ Atacar</button>
        <button class="btn" data-fa="heavy" ${f.heavyCd > 0 ? 'disabled' : ''}>💥 Golpe Forte${f.heavyCd > 0 ? ' (' + f.heavyCd + ')' : ''}</button>
        ${potBtn('small', 'Poção P')}${potBtn('large', 'Poção G')}
        <button class="btn" data-fa="flee" style="grid-column:span 2" ${m.boss ? 'disabled' : ''}>🏃 Fugir</button></div></div>`;
  }
  function lineHtml(e) {
    const c = e.kind === 'hit' ? (e.who === 'hero' ? 'hit-h' : 'hit-m') : e.kind;
    return `<div class="${c}">${esc(e.text)}</div>`;
  }
  function floatDmg(txt, cls, onMon) {
    const arena = $('#arena'); if (!arena) return;
    const d = document.createElement('div'); d.className = 'floatdmg ' + cls; d.textContent = txt;
    d.style.left = onMon ? '55%' : '20%'; d.style.top = onMon ? '45%' : '85%';
    arena.appendChild(d); setTimeout(() => d.remove(), 900);
  }
  async function doAction(action) {
    if (busy || !fight || fight.over) return;
    busy = true;
    const f = fight;
    const events = G.heroAction(st, f, action);
    // Reproduz os eventos um a um com a vida da época
    const lines = Array.from(document.querySelectorAll('#log div')).map((d) => d.outerHTML);
    for (const e of events) {
      lines.push(lineHtml(e));
      const logEl = $('#log'); if (logEl) logEl.innerHTML = lines.slice(-7).join('');
      const mon = $('#mon');
      if (e.kind === 'hit' && e.who === 'hero') { mon.classList.remove('shake'); void mon.offsetWidth; mon.classList.add('shake'); floatDmg('-' + e.dmg, e.crit ? 'crit' : '', true); buzz(e.crit ? 40 : 15); }
      if (e.kind === 'hit' && e.who === 'mon') { mon.classList.remove('lunge'); void mon.offsetWidth; mon.classList.add('lunge'); floatDmg('-' + e.dmg, '', false); buzz(25); }
      if (e.kind === 'heal') floatDmg('+', 'heal', e.who !== 'hero');
      const bars = document.querySelectorAll('#overlay .bar');
      if (bars[0]) { bars[0].firstElementChild.style.width = (e.m / f.mon.maxHp) * 100 + '%'; bars[0].querySelector('.t').textContent = fmt(e.m) + ' / ' + fmt(f.mon.maxHp); }
      if (bars[1]) { bars[1].firstElementChild.style.width = (e.h / f.hero.max) * 100 + '%'; bars[1].querySelector('.t').textContent = fmt(e.h) + ' / ' + fmt(f.hero.max); }
      await sleep(e.kind === 'info' ? 350 : 520);
    }
    if (f.over) { await sleep(350); endFight(); }
    else { drawFight(lines.slice(-7)); }
    busy = false;
  }
  function endFight() {
    const f = fight; fight = null;
    const rep = G.finishFight(st, f);
    save(); overlay.hidden = true;
    let h;
    if (rep.fled) h = `<div class="big">🏃</div><h2 class="banner">Você fugiu!</h2>`;
    else if (!rep.won) h = `<div class="big">💀</div><h2 class="banner">Derrota</h2><div class="center sub">Você perdeu ${fmt(-rep.gold)} 🐚 e foi levado de volta à fogueira. Descanse, melhore seus equipamentos ou treine e tente de novo.</div>`;
    else {
      h = `<div class="big">${rep.trophy ? rep.trophy.tIcon : '🏆'}</div><h2 class="banner">${rep.trophy ? 'Chefe derrotado!' : 'Vitória!'}</h2>
        <div class="center">✨ +${fmt(rep.xp)} XP · 🐚 +${fmt(rep.gold)}</div>`;
      if (rep.trophy) h += `<div class="card center" style="margin-top:10px"><b>Troféu conquistado</b><div>${rep.trophy.tIcon} ${rep.trophy.trophy}</div></div>`;
      if (rep.levels.length) h += `<div class="card center"><b>⬆ Subiu para o nível ${rep.levels[rep.levels.length - 1]}!</b><div class="sub">Vida restaurada e novo estoque na loja.</div></div>`;
      if (rep.items.length) h += `<div class="sub" style="margin:8px 0 4px">Itens encontrados:</div>` + rep.items.map((i) => itemRow(i, '', 'data-noop')).join('');
      if (rep.bagFull) h += `<div class="sub down">Baú cheio: ${rep.lost.length} item(ns) vendido(s) automaticamente.</div>`;
      if (rep.finishedGame) h += `<div class="card center"><div class="big">👑</div><b>Você é o Rei da Era da Pedra!</b><div class="sub">Todos os 15 chefes foram derrotados. Continue evoluindo!</div></div>`;
    }
    openModal(h + '<button class="btn go" data-close>Continuar</button>');
    render();
  }

  /* ---------- Menu / início ---------- */
  function menu() {
    openModal(`<h2 class="banner">Menu</h2>
      <button class="btn" data-act="rename">✏️ Mudar nome do herói</button>
      <button class="btn red" data-act="reset">🗑️ Reiniciar jogo</button>
      <button class="btn" data-close>Fechar</button>
      <div class="sub center" style="margin-top:10px">Era da Pedra v1.0 · progresso salvo neste aparelho</div>`);
  }
  function askName(first) {
    openModal(`<div class="big">🦴</div><h2 class="banner">${first ? 'Bem-vindo à Era da Pedra' : 'Nome do herói'}</h2>
      <div class="sub center" style="margin-bottom:8px">${first ? 'Você é um caçador de nível 1. Derrote feras, vença 15 chefes e vire lenda.' : ''}</div>
      <input id="nm" maxlength="14" value="${first ? '' : esc(st.name)}" placeholder="Nome do herói" style="width:100%;padding:12px;font:inherit;font-size:16px;border-radius:8px;border:2px solid var(--edge);background:#0b0705;color:var(--bone);user-select:text;-webkit-user-select:text">
      <button class="btn go" data-act="savename">${first ? 'Começar aventura' : 'Salvar'}</button>`);
  }

  /* ---------- Eventos ---------- */
  document.addEventListener('click', (ev) => {
    const t = ev.target.closest('[data-act],[data-nav],[data-item],[data-shopitem],[data-buy],[data-buyq],[data-eq],[data-uneq],[data-sell],[data-up],[data-upq],[data-close],[data-bf],[data-st],[data-pot],[data-fa]');
    if (!t) return;
    const d = t.dataset;
    if (d.fa !== undefined) return doAction(d.fa);
    if (d.close !== undefined) { closeModal(); return; }
    if (d.nav) { screen = d.nav; render(); view.scrollTop = 0; return; }
    if (d.bf) { bagFilter = d.bf; return render(); }
    if (d.st) { shopTab = d.st; return render(); }
    if (d.item) return showItem(d.item);
    if (d.shopitem) return showItem(d.shopitem, true);
    if (d.buy || d.buyq) { const r = G.buyItem(st, d.buy || d.buyq); toast(r.msg); if (r.ok) { buzz(20); save(); closeModal(); render(); } return; }
    if (d.eq) { G.equip(st, d.eq); save(); closeModal(); render(); toast('Equipado!'); return; }
    if (d.uneq) { if (!G.unequip(st, d.uneq)) toast('Baú cheio!'); save(); closeModal(); render(); return; }
    if (d.sell) { const p = G.sell(st, d.sell); toast(`Vendido por ${p} 🐚`); save(); closeModal(); render(); return; }
    if (d.up || d.upq) { const r = G.upgrade(st, d.up || d.upq); toast(r.msg); if (r.ok) { buzz(30); save(); closeModal(); } render(); return; }
    if (d.pot) { const r = G.buyPotion(st, d.pot); toast(r.msg); if (r.ok) save(); render(); return; }
    switch (d.act) {
      case 'fight-story': return startFight('story');
      case 'fight-train': return startFight('train');
      case 'menu': return menu();
      case 'rename': return askName(false);
      case 'savename': { const v = ($('#nm').value || '').trim(); if (st) { st.name = v || st.name; } closeModal(); save(); render(); return; }
      case 'reset': if (confirm('Apagar todo o progresso?')) { G.wipe(); st = G.newState(''); fight = null; closeModal(); save(); render(); askName(true); } return;
      case 'refreshshop': { const c = G.shopRefreshCost(st); if (st.gold < c) return toast('Conchas insuficientes.'); st.gold -= c; G.refreshShop(st); save(); return render(); }
      case 'sellweak': {
        let total = 0;
        for (const it of st.bag.slice()) { const cur = st.equipped[it.slot]; if (cur && G.itemScore(it) <= G.itemScore(cur)) total += G.sell(st, it.id); }
        toast(total ? `Vendeu itens por ${total} 🐚` : 'Nenhum item pior que o equipado.'); save(); return render();
      }
    }
  });

  /* ---------- Início ---------- */
  const fresh = !st;
  if (!st) { st = G.newState(''); st.name = 'Herói'; save(); }
  render();
  if (fresh) askName(true);
  setInterval(() => { if (!fight && modal.hidden) { G.syncTime(st); renderTop(); if (screen === 'cacar') vCacar(); } }, 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
