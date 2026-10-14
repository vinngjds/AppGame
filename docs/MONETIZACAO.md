# Monetização: compras no app (diamantes) e anúncios com recompensa

O que já está pronto no código e o que **você** precisa fazer nas contas e no aparelho.

## O que existe no jogo
- **Diamantes à venda** (aba Loja → 💎 Diamantes, ou toque no 💎 do topo): 4 pacotes consumíveis.
- **Anúncios com recompensa** (opcionais, sempre iniciados pelo jogador): `+2 encontros` e `ouro extra`, 3 de cada por dia. Aparecem nos Encontros (mapa), nos Eventos e na aba 💎.
- **Sem anúncios forçados** (nada de intersticial ou banner): combina melhor com RPG de progressão e evita avaliação ruim.
- **As caixas de itens não são vendidas.** Diamantes compram o conjunto lendário, runas, evoluções do ferreiro e o VIP, sem sorteio.
- Código: regras em `js/shop.js` (`G.PRODUCTS`, `G.grantProduct`, `G.adReward`), conexão com os plugins em `js/monet.js`, telas em `js/ui.js`. Testes em `scripts/test-core.js`.
- No navegador comum nada disso funciona (compras desativadas, sem anúncios). Para **testar a interface** abra o jogo com `?debugpay=1` na URL: compras e anúncios são simulados. **Esse modo nunca liga dentro do app da loja.**

## Plugins usados
| Função | Plugin | Observação |
|---|---|---|
| Compras (Google Play Billing) | [`cordova-plugin-purchase`](https://github.com/j3k0/cordova-plugin-purchase) 13.x | API lida no pacote 13.18 (`CdvPurchase.store`) |
| Anúncios com recompensa | [`@capacitor-community/admob`](https://github.com/capacitor-community/admob) 6.x | versão 6 é a do Capacitor 6 deste projeto |

## Passo a passo
### 1. Contas (você)
1. **Google Play Console** (já necessário para publicar) + **perfil de pagamentos** com dados fiscais preenchidos. Sem isso não dá para vender produtos.
2. **AdMob**: https://admob.google.com → crie uma conta, adicione o app Android e crie um bloco de anúncios **"Premiado" (Rewarded)**. Você recebe dois IDs:
   - **ID do app** (`ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY`)
   - **ID do bloco premiado** (`ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ`)

### 2. Produtos no Play Console
Em **Monetizar → Produtos → Produtos no app**, crie 4 produtos (o ID precisa ser **idêntico**) e ative-os:

| ID do produto | Diamantes | Preço sugerido | R$ por 💎 |
|---|---|---|---|
| `diamantes_30`  | 30  | R$ 4,99  | 0,166 |
| `diamantes_85`  | 85  | R$ 12,99 | 0,153 |
| `diamantes_240` | 240 | R$ 34,99 | 0,146 |
| `diamantes_650` | 650 | R$ 89,99 | 0,138 |

O jogo mostra o preço **da loja** (já na moeda do jogador); os valores acima são só referência. Para ajustar preços ou pacotes: mude no Play Console, e a lista/quantidades em `G.PRODUCTS` (`js/shop.js`).
Referência de custo em dinheiro: conjunto lendário ≈ 154 💎 (≈ R$ 22 a R$ 26), VIP de 30 dias = 200 💎 (≈ R$ 29 a R$ 33). **Calibre depois do teste fechado** com os números reais.

### 3. Configurar o código
1. Em `js/monet.js` troque `rewardedAdId` pelo ID do **bloco premiado** e coloque `isTesting: false` (só na versão de produção; durante os testes mantenha os IDs de teste do Google, que já estão lá).
2. Instale e gere o projeto Android:
```
npm install
npm run cap:add:android
ADMOB_APP_ID=ca-app-pub-XXXX~YYYY npm run android:setup   # grava o ID do app no AndroidManifest e a permissão de compras
npm run cap:sync
npm run cap:android                                        # abre no Android Studio
```
`android:setup` também funciona sem a variável (usa o ID de **teste** do Google e avisa).

### 4. Testar antes de publicar
1. Play Console → **Configurações → Testes de licença**: adicione o seu Gmail. Compras feitas com ele **não cobram**.
2. Envie um `.aab` para **Teste interno** e instale pelo link de teste (compras só funcionam em build enviado à Play).
3. Confira: preços aparecem em R$; comprar credita os 💎 uma vez só; cancelar não credita; o anúncio de teste abre e a recompensa chega só no final; fechar o anúncio antes não dá nada; no dia seguinte o limite diário zera.
4. Ao terminar os testes, troque os IDs de teste do AdMob pelos seus (item 3.1) e gere o `.aab` de produção.

### 5. Conformidade (Play Console)
- **Política de privacidade**: já atualizada em `privacidade.html` (anúncios, compras, ID de publicidade). Publique-a (GitHub Pages) e informe a URL.
- **Segurança dos dados (Data safety)**: declare que o app **coleta** *identificadores de dispositivo ou outros (ID de publicidade)* e *histórico de compras*, para anúncios e funcionalidades do app, compartilhados com o Google (AdMob). Marque "contém anúncios".
- **Classificação de conteúdo**: responda o questionário; o jogo tem violência fantasiosa leve e **compras no app** e **elementos de sorte** (as caixas não são compradas, mas os itens saem delas): declare isso com honestidade.
- **Público-alvo**: escolha **13+** (ou 18+), **não** "crianças". Apps para crianças têm regras de anúncio e dados muito mais rígidas (Famílias).
- **Chances das caixas**: o jogo já mostra (Baú → Chances das Caixas). Mantenha atualizado se mudar as probabilidades.
- **Brasil**: há legislação recente sobre jogos e menores (inclusive sobre caixas de recompensa). **Não verifiquei o texto atual**; confirme com um advogado ou com o guia do Play Console antes de lançar. Não vender caixas e não oferecer compra para menores ajuda.

## Segurança: o que ainda **não** está coberto
- O progresso fica no aparelho (como já era). Quem sabe mexer no armazenamento do app pode **dar diamantes a si mesmo**. Para um lançamento pequeno isso é um risco aceitável, mas **receita real exige**:
  1. **Validação do recibo no servidor** (o Google confirma que a compra existe): o caminho mais simples é um serviço como o RevenueCat, ou um validador próprio (o plugin aceita `store.validator`).
  2. Saves na nuvem (Firebase/Supabase), para trocar de aparelho sem perder compras.
- O crédito já é **idempotente por transação** (o mesmo recibo nunca paga duas vezes) e a compra só é consumida na loja depois de salva.
- Reembolsos/estornos no Play **não** descontam diamantes automaticamente.

## Limites desta entrega (precisa de teste em aparelho)
- Escrevi o código a partir da leitura das APIs dos dois plugins e testei a lógica com plugins simulados, mas **não consegui testar contra a Play Store nem o AdMob de verdade** (isso exige conta, assinatura e aparelho). Espere pequenos ajustes no primeiro teste interno.
- A tela de consentimento (LGPD/GDPR) usa o UMP do AdMob; ela só aparece se você configurar a mensagem em AdMob → Privacidade e mensagens.
