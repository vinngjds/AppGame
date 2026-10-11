# 🦴 Era da Pedra — RPG mobile

RPG de turnos ambientado na Idade da Pedra. Funciona como PWA (HTML/CSS/JS puro, sem build, offline).

## Como jogar (v2)
- Herói nível 1 → 40. Atributos: Força ⚔️, Vida ❤️, Armadura 🛡️, Crítico 🎯, vida roubada 🩸.
- **Jornada**: um mapa com **15 locais** (Caverna Sombria, Floresta Densa, Margem do Lago, Colinas Rochosas… até o Covil do Tirano). Cada local tem **4 lutas**: fera, fera, **semi-chefe** e **chefe**. XP e ouro escalonam entre elas; vencer o chefe libera o próximo local, dá um troféu e avança a história. Locais vencidos podem ser rejogados (60% de XP/ouro).
- **Dragões** (fora do mapa): **Dragão Verde** (forte) e **Dragão Azul** (muito forte). Voltam a cada 5 minutos e dão caixas grandes e um troféu com bônus.
- **Itens de elite são raros**: épicos, lendários e **runas** só saem de caixas altas (+3 ou mais; a +1 e a +2 nunca os trazem). A loja não vende épico nem lendário, não vende caixas, cobra bem caro (3,5× o valor) por itens comuns, incomuns e raros, e uma runa é rara e mais cara ainda. Veja as chances no Baú (botão ℹ️ Chances).
- **Caixas +1 a +5**: as lutas não dão mais itens prontos. Feras fracas dão quase sempre +1, o semi-chefe tem chance de +2, chefes e dragões dão caixas maiores. Caixas maiores trazem itens mais raros (+1 comum … +5 épico/lendário). Abra no Baú.
- **Ritmo**: 12 slots de encontro (toda luta custa 1) que voltam 1 a cada 4 min; **sem espera entre batalhas** — enquanto houver slot, você luta. Zerou? Pague ouro para restaurar tudo (sobe com o nível). Vida regenera sozinha ou na fogueira.
- **Avatar** (homem ou mulher, pele e cabelo à escolha): começa só com a roupa de baixo e mostra elmo, armadura, luvas, botas, arma, escudo, amuleto e runas conforme você equipa (material pelo nível, contorno pela raridade).
- **Troféus**: cada chefe dá um **bônus vitalício** (Força +3%, Vida +4%, Armadura +4% ou Crítico +1,5, em rotação); troféus de evento também.
- **Combate**: só **Atacar**, **Poção** e **Fugir** — o poder vem das **habilidades da classe**, que viram botões na batalha (com recarga) e mostram seus efeitos (veneno, escudo, atordoamento, marca...). A luta é **1×1 em perspectiva 3D** (câmera, chão e plataformas em CSS 3D; herói de costas, monstro de frente, caixas de vida no estilo clássico).
- **Classes e árvore de habilidades** (aba 🌳 Árvore): escolha **Guerreiro**, **Arqueiro** ou **Mago**. A cada nível você ganha **1 ponto**; cada classe tem 3 ramos de 4 habilidades (36 no total), com 3 níveis cada. Quanto maior o tier e o nível da habilidade, mais pontos custa e mais nível do herói exige. Passivas valem sempre; ativas têm botão. Redefinir a árvore (e trocar de classe) custa ouro.
- **Evoluções de classe** (nível 14): cada ramo leva a uma classe nova — Guerreiro → Gladiador / Guardião de Pedra / Algoz Sanguinário; Arqueiro → Franco-Atirador / Mestre das Toxinas / Patrulheiro; Mago → Mago das Chamas / Criomante / Necromante. Dá bônus permanente e 2 habilidades exclusivas.
- **Treino**: atributos por tempo real (Força, Vida, Armadura, Crítico, dano crítico, vida roubada, poções, XP/ouro), que continuam com o app fechado.
- **Loja de conjuntos**: 5 conjuntos completos (Rastreador → Rei Mamute), comprados **peça por peça**; liberam com o nível e dão bônus a 3/5/7 peças equipadas. O conjunto lendário e as **runas** só se compram com 💎 **Diamantes** (raros: dragões, eventos e caixas +4/+5, no máximo 30%); evoluir lendários e runas também gasta diamantes. **VIP** (30 dias, 200 💎): 24 slots, +ouro/XP e reset mais barato. Poções, venda e ampliar baú continuam.
- **Ferreiro**: melhorias até +10 com chance de falha (usa ossos 🦴), desmontar itens, fundir 3 runas.
- **Baú**: filtros, ordenação, travar itens, limpeza em lote.
- **Eventos**: Desafio do Dia (2 tentativas, caixa e chance de 💎) e Chefe da Semana (caixas, 💎 e troféu), com fósseis 🦕 e loja de troca, bônus de calendário (fim de semana +50% XP, dias 1–3 +50% ouro, quarta: ferreiro -25%).
- **Itens**: 35 equipamentos realistas da Era da Pedra (7 peças × 5 materiais, de madeira e couro a marfim de mamute), ilustrados, com descrição; 5 runas esculpidas; caixas desenhadas. A **Coleção de Itens** (aba Herói) registra o que você já achou: cada conjunto completo dá +1,5% de Força, Vida e Armadura.
- **Arte**: monstros ilustrados (≈17 tipos, 70 criaturas com cores e traços próprios), cenário por local e avatar detalhado, tudo em SVG. Dá para trocar por imagens pintadas/IA sem mexer em código: veja `docs/ARTE.md` e `docs/arte-prompts.md`.
- Progresso salvo no aparelho; saves da v1 são migrados automaticamente.

## Rodar
```
npx http-server .     # ou abra index.html
```
No iPhone: abra o link no Safari → Compartilhar → *Adicionar à Tela de Início*.
Um workflow (`.github/workflows/pages.yml`) publica no GitHub Pages ao fazer merge na `main` (ative Pages → Source: GitHub Actions).

## Estrutura
- `js/skilltree.js` classes, árvore de habilidades, evoluções e regras de aprendizado · `js/shop.js` conjuntos, diamantes, VIP e slots · `js/art.js` ilustração dos monstros e cenários · `js/itemart.js` ilustração dos itens · `js/avatar.js` avatar em camadas
- `js/core.js` regras puras (itens, combate, recompensas, loja) — testável em Node.
- `js/ui.js` telas e animações · `css/style.css` tema pedra/couro · `sw.js` offline.

## Balanceamento
Fórmulas em `js/core.js` (`makeMonster`, `heroStats`, `makeItem`, `monsterXp`). A simulação (`node scripts/sim.js 30`) mostra a escalada de dificuldade (fera ≈ 10%, fera 2 ≈ 19%, semi-chefe ≈ 38%, chefe ≈ 80% da vida — um jogo difícil, mas não impossível), a vitória nos dragões e eventos. `node scripts/autotune.js` reajusta a força de cada chefe (`G.BOSS_TUNE`). A simulação joga as 3 classes (`CLS=mago node scripts/sim.js`) e também sem árvore (`NOTREE=1`) para medir o impacto das habilidades.
