# 🦴 Era da Pedra — RPG mobile

RPG de turnos ambientado na Idade da Pedra. Funciona como PWA (HTML/CSS/JS puro, sem build, offline).

## Como jogar (v2)
- Herói nível 1 → 40. Atributos: Força ⚔️, Vida ❤️, Armadura 🛡️, Crítico 🎯, vida roubada 🩸.
- **Jornada**: um mapa com **15 locais** (Caverna Sombria, Floresta Densa, Margem do Lago, Colinas Rochosas… até o Covil do Tirano). Cada local tem **4 lutas**: fera, fera, **semi-chefe** e **chefe**. XP e ouro escalonam entre elas; vencer o chefe libera o próximo local, dá um troféu e avança a história. Locais vencidos podem ser rejogados (60% de XP/ouro).
- **Dragões** (fora do mapa): **Dragão Verde** (forte) e **Dragão Azul** (muito forte). Voltam a cada 5 minutos e dão caixas grandes e um troféu com bônus.
- **Caixas +1 a +5**: as lutas não dão mais itens prontos. Feras fracas dão quase sempre +1, o semi-chefe tem chance de +2, chefes e dragões dão caixas maiores. Caixas maiores trazem itens mais raros (+1 comum … +5 épico/lendário). Abra no Baú.
- **Ritmo**: 12 encontros que voltam 1 a cada 4 min (chefe custa 2), 25 s de fôlego entre batalhas, vida cheia em 7 min (ou 🔥 Descansar por ouro). Dá para **pagar ouro** para pular o fôlego ou comprar encontros (o preço sobe a cada compra no dia). Ouro e XP são escassos.
- **Avatar** (homem ou mulher, pele e cabelo à escolha): começa só com a roupa de baixo e mostra elmo, armadura, luvas, botas, arma, escudo, amuleto e runas conforme você equipa (material pelo nível, contorno pela raridade).
- **Troféus**: cada chefe dá um **bônus vitalício** (Força +3%, Vida +4%, Armadura +4% ou Crítico +1,5, em rotação); troféus de evento também.
- **Treino**: habilidades por tempo real (passivas e ativas *Grito de Guerra* / *Postura de Pedra*), que continuam com o app fechado.
- **Loja**: estoque renova a cada 20 min, ofertas -25%, comparação com o equipado, venda, ampliar baú.
- **Ferreiro**: melhorias até +10 com chance de falha (usa ossos 🦴), desmontar itens, fundir 3 runas.
- **Baú**: filtros, ordenação, travar itens, limpeza em lote.
- **Eventos**: Chefe da Semana e Chefe do Mês (fósseis 🦕, troféus e loja de troca), bônus de calendário (fim de semana +50% XP, dias 1–3 +50% ouro, quarta: ferreiro -25%).
- **Arte**: monstros ilustrados (≈17 tipos, 70 criaturas com cores e traços próprios), cenário por local e avatar detalhado, tudo em SVG. Dá para trocar por imagens pintadas/IA sem mexer em código: veja `docs/ARTE.md` e `docs/arte-prompts.md`.
- Progresso salvo no aparelho; saves da v1 são migrados automaticamente.

## Rodar
```
npx http-server .     # ou abra index.html
```
No iPhone: abra o link no Safari → Compartilhar → *Adicionar à Tela de Início*.
Um workflow (`.github/workflows/pages.yml`) publica no GitHub Pages ao fazer merge na `main` (ative Pages → Source: GitHub Actions).

## Estrutura
- `js/art.js` ilustração dos monstros e cenários · `js/avatar.js` avatar em camadas
- `js/core.js` regras puras (itens, combate, recompensas, loja) — testável em Node.
- `js/ui.js` telas e animações · `css/style.css` tema pedra/couro · `sw.js` offline.

## Balanceamento
Fórmulas em `js/core.js` (`makeMonster`, `heroStats`, `makeItem`, `monsterXp`). A simulação (`node scripts/sim.js 30`) mostra a escalada de dificuldade (fera ≈ 7%, fera 2 ≈ 12%, semi-chefe ≈ 36%, chefe ≈ 66% da vida), a vitória nos dragões e eventos. `node scripts/autotune.js` reajusta a força de cada chefe (`G.BOSS_TUNE`).
