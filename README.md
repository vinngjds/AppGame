# 🦴 Era da Pedra — RPG mobile

RPG de turnos ambientado na Idade da Pedra. Funciona como PWA (HTML/CSS/JS puro, sem build, offline).

## Como jogar
- Você começa como caçador **nível 1** (Força ⚔️, Vida ❤️, Armadura 🛡️, Crítico 🎯).
- **Caçar**: cada fera derrotada dá XP, conchas 🐚 e chance de item. Feras escalam com o seu nível e têm *modalidades* (Feroz, Veloz, Couraçado, Venenoso, Regenerador, Esmagador).
- **A cada 3 feras** surge um **Chefe** (15 no total) → troféu 🏆 + itens raros/épicos/lendários conforme o chefe.
- **Combate**: Atacar, Golpe Forte (recarga de 3 turnos), Poções, Fugir (não vale contra chefes).
- **Arena de Treino**: 10 encontros que se recuperam 1/min; XP menor, serve para ficar mais forte quando um chefe travar.
- **Baú**, **Loja** (equipamento, amuletos, poções), **Ferreiro** (+1 a +10) e **Salão de Troféus**.
- Progresso salvo no aparelho (`localStorage`).

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
Fórmulas em `core.js` (`makeMonster`, `heroStats`, `makeItem`). Um bot simples zera os 15 chefes (nível ~32), com mortes só nos primeiros.
