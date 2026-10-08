// Ajusta G.BOSS_TUNE por local para que cada chefe custe a vida-alvo do herói. Uso: node scripts/autotune.js [rodadas] [execuções]
const path = require('path');
const G = require(path.join(__dirname, '..', 'js', 'core.js'));
const { evaluate } = require('./sim.js');
const rounds = +process.argv[2] || 4, N = +process.argv[3] || 14;
const target = (z) => 0.74 + 0.007 * (z - 1);       // 58% no 1º chefe → ~70% no último
for (let r = 0; r < rounds; r++) {
  const res = evaluate(N, {});
  const row = [];
  for (let z = 1; z <= 15; z++) {
    const b = res.bl[z]; if (!b) continue;
    const loss = Math.min(0.97, b.loss / b.n);
    G.BOSS_TUNE[z - 1] = Math.max(0.4, Math.min(3.5, G.BOSS_TUNE[z - 1] * Math.pow(target(z) / loss, 0.75)));
    row.push(`${z}:${(100 * loss).toFixed(0)}%`);
  }
  console.log(`rodada ${r + 1}: perda no chefe`, row.join(' '));
}
console.log('G.BOSS_TUNE = [' + G.BOSS_TUNE.map((v) => v.toFixed(2)).join(', ') + '];');
