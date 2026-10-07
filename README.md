# 🦴 Era da Pedra — RPG mobile

RPG de turnos ambientado na Idade da Pedra. Funciona como PWA (HTML/CSS/JS puro, sem build, offline).

## Como jogar (v2)
- Herói nível 1 → 40. Atributos: Força ⚔️, Vida ❤️, Armadura 🛡️, Crítico 🎯, vida roubada 🩸.
- **Caçar**: 2 feras → **Semi-chefe** (fera alfa com golpe especial) → **Chefe** (15 no total, troféu + itens raros). Chefes têm golpe especial **avisado um turno antes** (use *Defender*) e entram em fúria abaixo de 50% de vida.
- **Ritmo**: 12 encontros que voltam 1 a cada 4 min (chefe custa 2), 25 s de fôlego entre batalhas, vida cheia em 7 min (ou 🔥 Descansar por conchas).
- **Boneco**: elmo, armadura, luvas, botas, arma, escudo, amuleto + 3 runas (Força, Vida, Pedra, Sorte, Sangue).
- **Treino**: habilidades por tempo real (passivas e ativas *Grito de Guerra* / *Postura de Pedra*), que continuam com o app fechado; Arena de Treino.
- **Loja**: estoque renova a cada 20 min, ofertas -25%, comparação com o equipado, venda, ampliar baú.
- **Ferreiro**: melhorias até +10 com chance de falha (usa ossos 🦴), desmontar itens, fundir 3 runas.
- **Baú**: filtros, ordenação, travar itens, limpeza em lote.
- **Eventos**: Chefe da Semana e Chefe do Mês (fósseis 🦕, troféus e loja de troca), bônus de calendário (fim de semana +50% XP, dias 1–3 +50% conchas, quarta: ferreiro -25%).
- Progresso salvo no aparelho; saves da v1 são migrados automaticamente.

## Rodar
```
npx http-server .     # ou abra index.html
```
No iPhone: abra o link no Safari → Compartilhar → *Adicionar à Tela de Início*.
Um workflow (`.github/workflows/pages.yml`) publica no GitHub Pages ao fazer merge na `main` (ative Pages → Source: GitHub Actions).

## Estrutura
- `js/core.js` regras puras (itens, combate, recompensas, loja) — testável em Node.
- `js/ui.js` telas e animações · `css/style.css` tema pedra/couro · `sw.js` offline.

## Balanceamento
Fórmulas em `js/core.js` (`makeMonster`, `heroStats`, `makeItem`, `monsterXp`). A simulação (`node scripts/sim.js 30`) mostra a escalada de dificuldade: feras ≈ 16% da vida, semi-chefes ≈ 28%, chefes ≈ 55%.
