# Arte do jogo

O jogo já vem com **ilustrações vetoriais** próprias (SVG desenhado em código, em `js/art.js` e `js/avatar.js`): monstros com sombreamento, cenário por local e avatar em camadas. Elas funcionam sem nenhum arquivo extra e ocupam pouco espaço.

Se você quiser um visual **mais realista ou pintado**, o jogo aceita imagens prontas (de um artista ou de uma IA de imagem) e usa elas no lugar do desenho, **monstro a monstro**, sem mexer em código.

## Como colocar suas imagens
1. Gere os prompts: `node scripts/art-prompts.js` (cria `docs/arte-prompts.md` com um prompt por monstro e por cenário).
2. Salve as imagens com o nome indicado:
   - monstros em `art/monsters/<nome>.png` (ex.: `art/monsters/lobo-jovem.png`), 1024×1024, de preferência PNG com fundo transparente ou escuro;
   - cenários em `art/scenes/<bioma>.jpg` (ex.: `art/scenes/forest.jpg`), 1200×760;
   - itens em `art/items/<peça>-<material>.png` (ex.: `art/items/arma-2.png`, material 0 a 4) e `art/items/runa-forca.png`, 512×512.
3. Gere o índice: `node scripts/art-manifest.js` (cria `art/manifest.json` com o que existir).
4. Rode `npm run build` e publique. Monstros sem imagem continuam com o desenho em SVG.

Dicas: use o mesmo estilo (a lista de prompts já repete o estilo comum), mantenha o monstro centralizado e o fundo simples, e prefira WebP/PNG otimizados (idealmente menos de 200 KB cada) para o app abrir rápido.

## Arte de referência (já aplicada)
`docs/arte-referencia.jpg` é a folha de referência de estilo (heróis e criaturas desenhados à mão, contorno marrom escuro, tons terrosos). Dela já saíram, recortados e com fundo transparente:
- **Retratos**: Guerreiro, Arqueiro e Mago (e o Guardião de Pedra, evolução do Guerreiro), em `art/portraits/` — aparecem na escolha de classe, na árvore e nas evoluções.
- **Monstros**: Raptor, Morcego, Dragão primitivo, Tigre dentes-de-sabre e Mamute, em `art/monsters/`.

`art/styles.json` reaproveita essas imagens em outros monstros com outra cor/brilho (por exemplo o Dragão Verde, o Azul e o de Fogo vêm do mesmo dragão, com filtro de cor; chefes e eventos ganham um brilho dourado). Uma imagem própria em `art/monsters/<nome>.png` sempre tem prioridade. Depois de mudar arquivos, rode `node scripts/art-manifest.js`.

Para o restante (≈60 criaturas, cenários e itens) o jogo continua no desenho em SVG. Para chegar ao mesmo nível de qualidade, gere o resto com o **mesmo estilo**: `node scripts/art-prompts.js` já usa a descrição desse estilo em todos os prompts (anexe também a folha de referência na ferramenta de imagem).

## Itens e conjuntos da loja (já aplicados)
Os 35 ícones de equipamento (`art/items/<peça>-<conjunto 0 a 4>.png`) e as 5 miniaturas dos conjuntos (`art/sets/<0 a 4>.png`) foram recortados das imagens de referência da loja (`docs/loja-referencia-itens.jpg` e `docs/loja-referencia-conjuntos.jpg`). Sem as imagens, o jogo usa os desenhos vetoriais de reserva.

## Direitos de uso
Confira os termos da ferramenta de IA ou do artista antes de publicar nas lojas: é preciso ter direito de uso comercial das imagens. Guarde a licença/comprovante. **Isso vale também para a folha de referência (`docs/arte-referencia.jpg`) e para os recortes dela em `art/`.**

## Avatar
## Itens
O jogo traz 35 equipamentos (7 peças × 5 conjuntos: Assassino – metal e couro, Xamã – penas e osso, Gladiador – bronze e ferro, Cavaleiro – aço e malha, Druida Ancião – raízes e magia), 5 runas esculpidas e as caixas +1 a +5, tudo em SVG (`js/itemart.js`). Nomes e descrições ficam em `js/core.js` (`BASES`, `ITEM_DESC`).

## Avatar
O avatar (homem ou mulher, pele e cabelo) é desenhado em camadas e reflete cada peça equipada. Para trocar por arte própria no futuro, o ponto de entrada é `Avatar.svg()` em `js/avatar.js`.
