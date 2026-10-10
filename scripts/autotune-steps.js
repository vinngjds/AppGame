// Ajusta G.STEP_TUNE (fera 1, fera 2, semi-chefe) para que a vida perdida na 1ª tentativa cresça de forma gradual a cada local.
// Uso: node scripts/autotune-steps.js [rodadas] [execuções]
const path = require('path');
const G = require(path.join(__dirname, '..', 'js', 'core.js'));
const { evaluate } = require('./sim.js');
const rounds = +process.argv[2] || 5, N = +process.argv[3] || 18;
// vida-alvo perdida na 1ª tentativa: sempre fera1 < fera2 < semi < chefe, e todas sobem com o local
const TARGET = [(z) => 0.10 + 0.012 * (z - 1), (z) => 0.17 + 0.02 * (z - 1), (z) => 0.30 + 0.022 * (z - 1)];
for (let r = 0; r < rounds; r++) {
  const res = evaluate(N, {});
  const rows = [[], [], []];
  for (let z = 1; z <= 15; z++) {
    const zl = res.zl[z]; if (!zl) continue;
    for (let k = 0; k < 3; k++) {
      if (!zl[k][1]) continue;
      const loss = Math.max(0.02, Math.min(0.95, zl[k][0] / zl[k][1]));
      G.STEP_TUNE[k][z - 1] = Math.max(0.3, Math.min(4, G.STEP_TUNE[k][z - 1] * Math.pow(TARGET[k](z) / loss, 0.8)));
      rows[k].push(`${z}:${(100 * loss).toFixed(0)}`);
    }
  }
  console.log(`rodada ${r + 1}: perda 1ª tentativa\n  fera1 ${rows[0].join(' ')}\n  fera2 ${rows[1].join(' ')}\n  semi  ${rows[2].join(' ')}`);
}
console.log('G.STEP_TUNE = [' + G.STEP_TUNE.map((a) => '[' + a.map((v) => v.toFixed(2)).join(', ') + ']').join(', ') + '];');
