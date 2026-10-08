# Arte do jogo

O jogo já vem com **ilustrações vetoriais** próprias (SVG desenhado em código, em `js/art.js` e `js/avatar.js`): monstros com sombreamento, cenário por local e avatar em camadas. Elas funcionam sem nenhum arquivo extra e ocupam pouco espaço.

Se você quiser um visual **mais realista ou pintado**, o jogo aceita imagens prontas (de um artista ou de uma IA de imagem) e usa elas no lugar do desenho, **monstro a monstro**, sem mexer em código.

## Como colocar suas imagens
1. Gere os prompts: `node scripts/art-prompts.js` (cria `docs/arte-prompts.md` com um prompt por monstro e por cenário).
2. Salve as imagens com o nome indicado:
   - monstros em `art/monsters/<nome>.png` (ex.: `art/monsters/lobo-jovem.png`), 1024×1024, de preferência PNG com fundo transparente ou escuro;
   - cenários em `art/scenes/<bioma>.jpg` (ex.: `art/scenes/forest.jpg`), 1200×760.
3. Gere o índice: `node scripts/art-manifest.js` (cria `art/manifest.json` com o que existir).
4. Rode `npm run build` e publique. Monstros sem imagem continuam com o desenho em SVG.

Dicas: use o mesmo estilo (a lista de prompts já repete o estilo comum), mantenha o monstro centralizado e o fundo simples, e prefira WebP/PNG otimizados (idealmente menos de 200 KB cada) para o app abrir rápido.

## Direitos de uso
Confira os termos da ferramenta de IA ou do artista antes de publicar nas lojas: é preciso ter direito de uso comercial das imagens. Guarde a licença/comprovante.

## Avatar
O avatar (homem ou mulher, pele e cabelo) é desenhado em camadas e reflete cada peça equipada. Para trocar por arte própria no futuro, o ponto de entrada é `Avatar.svg()` em `js/avatar.js`.
