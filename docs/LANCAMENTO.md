# Guia de lançamento: Google Play e Apple App Store

O jogo é uma página web. O **Capacitor** a empacota como app nativo. Tudo já está configurado (`capacitor.config.json`, `package.json`, ícones em `resources/`).

## 0. Antes de começar
1. **Troque o `appId`** em `capacitor.config.json` (hoje `com.eradapedra.game`) por um identificador único seu, por exemplo `br.com.seunome.eradapedra`. Depois de publicado, **não dá mais para mudar**.
2. Instale Node 20+ e rode `npm install`.
3. Ative o GitHub Pages (já feito): a política de privacidade fica em
   `https://vinngjds.github.io/AppGame/privacidade.html`.

## 1. Gerar os projetos nativos
```
npm run cap:add:android
npm run cap:add:ios        # só em Mac
npm run assets             # gera ícones e splash de todos os tamanhos a partir de resources/
npm run cap:sync
```
Depois de qualquer mudança no jogo: `npm run cap:sync`.

## 2. Google Play (Android)
1. Conta de desenvolvedor: https://play.google.com/console (US$ 25, taxa única).
2. `npm run cap:android` abre o Android Studio.
3. **Build → Generate Signed Bundle → Android App Bundle (.aab)**. Crie uma *keystore* e **guarde o arquivo e a senha em local seguro** (sem ela você não atualiza mais o app; nunca coloque no Git).
4. No Play Console: criar app → enviar o `.aab` para **Teste interno** → preencher ficha da loja com `store/listagem.md`, ícone 512×512 (`icons/icon-512.png`), imagem de destaque 1024×500 (`store/feature-graphic.png`), pelo menos 2 capturas de tela de celular, classificação etária e segurança de dados ("não coleta dados").
5. Contas pessoais novas precisam de **teste fechado com 12 testadores por 14 dias** antes da produção (regra atual do Google; confira no console).

## 3. Apple App Store (iOS)
1. Precisa de um **Mac com Xcode**. Sem Mac, use um serviço de build na nuvem (Codemagic, Ionic Appflow).
2. Conta: https://developer.apple.com/programs (US$ 99/ano).
3. `npm run cap:ios` abre o Xcode. Em **Signing & Capabilities** escolha seu time e confirme o Bundle Identifier.
4. **Product → Archive → Distribute App → App Store Connect**.
5. Em https://appstoreconnect.apple.com crie o app, anexe o build (use **TestFlight** para testar), preencha a ficha com `store/listagem.md`, capturas de tela (6,7" e 6,5" ou 5,5", conforme o Xcode pedir), política de privacidade e "Dados não coletados".
6. A Apple pode rejeitar apps que parecem "só um site". Vantagens que ajudam: funciona offline, vibração nativa, ícone e splash próprios. Se vier rejeição, acrescente recursos nativos (notificação local de "vida cheia", por exemplo).

## 4. Dica importante sobre saves
Cada app guarda o progresso no próprio armazenamento. O save da versão web **não** passa para a versão da loja. Para salvar na nuvem no futuro, use Firebase ou Supabase (login + um documento por jogador).

## 5. Antes do lançamento público
- Trocar emojis por arte própria (opcional, mas melhora muito a aceitação).
- Adicionar som e música.
- Rodar `npm test` e `npm run test:balance` após mexer em fórmulas.
- Testar em aparelhos reais (Android e iPhone) por alguns dias.
