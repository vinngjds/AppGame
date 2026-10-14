/* Era da Pedra — adaptador de compras no app (Google Play Billing) e anúncios com recompensa (AdMob).
   As regras (produtos, créditos, limites diários) ficam em shop.js; aqui só falamos com os plugins nativos:
   - cordova-plugin-purchase  → window.CdvPurchase
   - @capacitor-community/admob → Capacitor.Plugins.AdMob
   No navegador comum (GitHub Pages) nada disso existe: as compras e os anúncios ficam indisponíveis,
   exceto com ?debugpay=1 na URL, que simula tudo localmente para testar a interface. */
(function (root) {
  'use strict';
  const G = root.G;
  const M = {};
  const C = M.CONFIG = {
    isTesting: true,                                          // troque para false na versão de produção
    rewardedAdId: 'ca-app-pub-3940256099942544/5224354917',   // ID de TESTE do Google; use o seu da conta AdMob ao publicar
  };
  let ctx = null, store = null, adsOn = false, adReady = false;
  const cap = () => root.Capacitor;
  const admob = () => (cap() && cap().Plugins && cap().Plugins.AdMob) || null;
  const here = () => (typeof location !== 'undefined' ? location.search || '' : '');

  M.native = () => { try { return !!(cap() && cap().isNativePlatform && cap().isNativePlatform()); } catch (e) { return false; } };
  M.debug = () => !M.native() && /[?&]debugpay=1/.test(here());
  M.canBuy = () => (M.native() ? !!store : M.debug());
  M.canAds = () => (M.native() ? adsOn : M.debug());
  M.mode = () => (M.native() ? 'native' : M.debug() ? 'debug' : 'web');

  // preço de cada pacote: o da loja (já na moeda do jogador) ou o valor de referência
  M.priceOf = function (id) {
    const p = G.PRODUCTS.find((x) => x.id === id);
    try {
      const P = root.CdvPurchase;
      if (store && P) {
        const pr = store.get(id, P.Platform.GOOGLE_PLAY), off = pr && pr.getOffer && pr.getOffer();
        if (off && off.pricingPhases && off.pricingPhases[0] && off.pricingPhases[0].price) return off.pricingPhases[0].price;
      }
    } catch (e) { /* usa a referência */ }
    return p ? p.hint : '';
  };

  /* ---------- Compras ---------- */
  function initStore() {
    const P = root.CdvPurchase;
    if (!P || !P.store) return Promise.resolve();
    const s = P.store, { ProductType, Platform } = P;
    s.register(G.PRODUCTS.map((p) => ({ id: p.id, type: ProductType.CONSUMABLE, platform: Platform.GOOGLE_PLAY })));
    // compra aprovada: credita uma única vez (idempotente por transação), salva e só então consome na loja
    s.when().approved((t) => {
      const st = ctx.getState(); let msg = '';
      for (const pr of t.products || []) { const r = G.grantProduct(st, pr.id, t.transactionId); if (r.ok && !r.dup) msg = r.msg; }
      ctx.onChange(msg);
      return t.finish();
    });
    s.when().productUpdated(() => ctx.onChange(''));
    return s.initialize([Platform.GOOGLE_PLAY]).then((errs) => { store = s; if (errs && errs.length && ctx.log) ctx.log('store', errs); });
  }
  M.buy = function (id) {
    if (!G.PRODUCTS.find((x) => x.id === id)) return Promise.resolve({ ok: false, msg: 'Produto inválido.' });
    if (M.debug()) {   // simulação local, só para testar a tela
      const r = G.grantProduct(ctx.getState(), id, 'debug-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7));
      ctx.onChange(r.msg); return Promise.resolve(r);
    }
    if (!store) return Promise.resolve({ ok: false, msg: 'Compras disponíveis apenas no app da loja.' });
    const P = root.CdvPurchase, pr = store.get(id, P.Platform.GOOGLE_PLAY), off = pr && pr.getOffer();
    if (!off) return Promise.resolve({ ok: false, msg: 'Produto indisponível no momento. Tente de novo em instantes.' });
    return store.order(off).then((err) => (err ? { ok: false, msg: (P.ErrorCode && err.code === P.ErrorCode.PAYMENT_CANCELLED) ? 'Compra cancelada.' : 'Não foi possível comprar: ' + err.message } : { ok: true, pending: true, msg: 'Processando a compra…' }));
  };

  /* ---------- Anúncios com recompensa ---------- */
  function preload() {
    const a = admob(); if (!a || !adsOn) return Promise.resolve();
    return a.prepareRewardVideoAd({ adId: C.rewardedAdId, isTesting: C.isTesting }).then(() => { adReady = true; }).catch(() => { adReady = false; });
  }
  function initAds() {
    const a = admob(); if (!a) return Promise.resolve();
    // 1) consentimento (LGPD/GDPR) → 2) inicializa → 3) carrega o 1º anúncio
    const consent = a.requestConsentInfo
      ? a.requestConsentInfo().then((info) => (info && info.isConsentFormAvailable && info.status === 'REQUIRED' ? a.showConsentForm() : info)).catch(() => null)
      : Promise.resolve();
    const att = a.requestTrackingAuthorization ? a.requestTrackingAuthorization().catch(() => null) : Promise.resolve();
    return consent.then(() => att).then(() => a.initialize({ initializeForTesting: C.isTesting, tagForChildDirectedTreatment: false }))
      .then(() => { adsOn = true; return preload(); }).catch(() => { adsOn = false; });
  }
  // abre o anúncio; resolve true só se o jogador viu até o fim (recompensa liberada pelo AdMob)
  M.showRewarded = function () {
    if (M.debug()) return Promise.resolve(root.confirm ? root.confirm('[teste] Assistir ao anúncio e ganhar a recompensa?') : true);
    const a = admob();
    if (!a || !adsOn) return Promise.resolve(false);
    return (adReady ? Promise.resolve() : a.prepareRewardVideoAd({ adId: C.rewardedAdId, isTesting: C.isTesting }))
      .then(() => a.showRewardVideoAd()).then((item) => { adReady = false; preload(); return !!item; })
      .catch(() => { adReady = false; preload(); return false; });
  };

  // ctx: { getState(), onChange(msg) }
  M.init = function (c) {
    ctx = c;
    if (!M.native()) return Promise.resolve();
    return Promise.all([initStore().catch(() => null), initAds()]);
  };

  root.Monet = M;
  if (typeof module !== 'undefined' && module.exports) module.exports = M;
})(typeof window !== 'undefined' ? window : globalThis);
