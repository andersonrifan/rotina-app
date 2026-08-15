# Publicar no Google Play

O que já está pronto no projeto, o que falta, e o que só você pode fazer.

---

## 1. O que já está feito

| Item | Situação |
|---|---|
| Projeto Android nativo | `android/`, gerado pelo Capacitor 7 |
| `applicationId` | `br.com.rotina.diaria` — **veja o alerta abaixo** |
| Target API | **36** (Android 16) — a exigência do Play a partir de 31/08/2026 |
| Min API | 26 (Android 8.0) — cobre praticamente todo aparelho em uso |
| Ícone adaptativo | frente + fundo creme, nas 5 densidades |
| Ícone 512×512 da loja | `public/icones/play-512.png` |
| Versão | `versionCode 1`, `versionName 1.0.0` |
| Funciona offline | sim, integralmente — sem rede em nenhum momento |
| Coleta de dados | nenhuma |

## 2. ⚠️ Decida ANTES do primeiro envio

### O `applicationId` é permanente

`br.com.rotina.diaria` foi um palpite meu. **Depois do primeiro envio ao Play,
ele nunca mais pode mudar** — nem por atualização, nem por suporte. Trocar
exige publicar outro app do zero, perdendo instalações e avaliações.

Escolha agora, com calma. Se você tem (ou pretende ter) um domínio, use-o
invertido: `com.seudominio.rotina`. Para mudar:

```bash
npx cap migrate-package br.com.seudominio.rotina
```

Se o comando não existir na sua versão, troque `appId` em
`capacitor.config.json`, `applicationId` em `android/app/build.gradle`, e
renomeie a pasta do pacote em `android/app/src/main/java/`.

### A chave de assinatura é permanente

Perder a chave = não conseguir mais atualizar o app. Gere uma vez, guarde em
dois lugares (gerenciador de senhas + backup offline) e **nunca** a coloque no
Git — o `.gitignore` já bloqueia `*.jks` e `*.keystore`.

```bash
keytool -genkey -v -keystore rotina.jks -keyalg RSA -keysize 4096 -validity 10000 -alias rotina
```

Recomendo ativar o **Play App Signing** no Console: o Google guarda a chave de
assinatura final e você só perde a de upload, que é substituível.

---

## 3. Como gerar o AAB

Falta na sua máquina: **Android SDK** e **Gradle**. Ambos vêm com o
Android Studio.

1. Instale o [Android Studio](https://developer.android.com/studio).
2. No SDK Manager, instale o **Android SDK Platform 36**.
3. Depois, na pasta do projeto:

```bash
npm run android:sincronizar
```

Isso roda `vite build` e copia o `dist/` para dentro do projeto Android.

4. Abra no Android Studio:

```bash
npm run android:abrir
```

5. **Build → Generate Signed App Bundle**, escolha a chave do passo anterior.
   O `.aab` sai em `android/app/release/`.

O Play só aceita **AAB** (Android App Bundle) — APK não serve para apps novos
desde 2021.

### A cada nova versão

`versionCode` precisa **aumentar** a cada envio, sempre. `versionName` é o que
o usuário vê. Ambos em `android/app/build.gradle`.

---

## 4. O que o Console do Google Play vai pedir

### Conta
- **US$ 25**, pagamento único, vitalício.
- Conta pessoal exige **verificação de identidade** (documento).
- Contas pessoais criadas depois de nov/2023 precisam de **12 testadores
  fechados por 14 dias seguidos** antes de liberar produção. Comece a recrutar
  cedo — costuma ser o maior atraso.

### Ficha da loja
| Item | Exigência | Situação |
|---|---|---|
| Nome | até 30 caracteres | `Rotina` |
| Descrição curta | até 80 caracteres | ver rascunho abaixo |
| Descrição completa | até 4.000 caracteres | ver rascunho abaixo |
| Ícone | 512×512 PNG, 32 bits | ✅ `public/icones/play-512.png` |
| Gráfico de destaque | 1024×500 PNG/JPG | ❌ **falta** |
| Capturas de tela | mín. 2, 16:9 ou 9:16, lado maior 320–3840 px | ❌ **falta** |
| Política de privacidade | URL pública | ✅ texto em `docs/PRIVACIDADE.md`, falta hospedar |

**Rascunho da descrição curta** (74 caracteres):
> Seu dia, seus treinos, sua comida e seus remédios — offline e sem conta.

**Rascunho da descrição completa:**
> O Rotina reúne num app só o que costuma ficar espalhado em cinco: o
> calendário do seu dia, os treinos da semana, o cardápio com a lista de
> compras e a caixa de remédios.
>
> • **Dia** — seu dia em blocos. Toque para marcar feito, atrasei ou pulei.
>   Segure para arrastar e reorganizar.
> • **Treino** — um treino por dia da semana, com séries, circuitos e voltas.
> • **Comida** — refeições configuráveis, cardápio da semana e lista de
>   compras gerada dos ingredientes.
> • **Caixa** — a grade da caixinha de remédios, com dose, horário e estoque.
>
> Funciona **100% offline**. Não pede cadastro, não tem anúncios, não envia
> nada para lugar nenhum: seus dados ficam apenas no seu aparelho.

### Formulário de Segurança dos Dados
Este é fácil no seu caso, e é bom que seja:

- Coleta dados? **Não**
- Compartilha dados? **Não**
- Dados criptografados em trânsito? **N/A** (não há trânsito)
- Usuário pode pedir exclusão? **Sim** — desinstalar apaga tudo

> ⚠️ O `AndroidManifest.xml` declara `android.permission.INTERNET`, herdado do
> template do Capacitor. O app não usa rede. Você pode removê-lo para deixar a
> declaração ainda mais limpa — mas **teste antes**: em algumas configurações
> o WebView do Capacitor precisa dela mesmo servindo só arquivos locais. Como
> não tenho o Android SDK aqui, não pude verificar, então deixei a permissão
> no lugar, que é o padrão que funciona.

### Classificação de conteúdo
Questionário no Console. Um app de rotina sem conteúdo gerado por usuário nem
comunicação deve sair como **Livre / 3+**.

### Backup automático
`allowBackup="true"` está ativo: os dados vão para o backup do Google Drive do
usuário e voltam se ele trocar de aparelho. Bom para ele, e precisa constar na
declaração de dados como backup do próprio sistema Android.

---

## 5. Antes de enviar — o que testar num aparelho de verdade

Nada disso pôde ser verificado aqui, porque exige toque real e o SDK Android:

- [ ] Toque e segure 480 ms entra no modo de edição sem falso positivo ao rolar
- [ ] Arrastar bloco e alça funciona com o dedo (foi testado só com ponteiro)
- [ ] Dados sobrevivem a fechar e reabrir o app
- [ ] Dados sobrevivem a uma atualização do app (teste a migração de esquema)
- [ ] Modo avião: tudo funciona, fontes incluídas
- [ ] Botão Voltar do Android não fecha o app com folha aberta
- [ ] A barra de abas não fica embaixo da barra de gestos

O último item é o mais provável de dar problema. Se der, o
`@capacitor/status-bar` já está instalado para ajustar.

---

## 6. Alternativa sem loja

O app é uma PWA completa. Hospedando o `dist/` em qualquer HTTPS
(GitHub Pages, Netlify, Cloudflare Pages — todos de graça), dá para instalar
pelo próprio navegador: *Menu → Adicionar à tela inicial*. Fica com ícone,
tela cheia e offline, sem os US$ 25, sem verificação de identidade e sem os
14 dias de teste fechado.

Vale considerar como primeiro passo — publicar na loja depois continua
possível, a partir exatamente do mesmo código.
