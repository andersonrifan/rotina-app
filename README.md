# Rotina

App de rotina diária: o calendário do dia, os treinos da semana, a alimentação
com lista de compras e a caixa de remédios, num app só.

Funciona **100% offline** — sem conta, sem servidor e sem nenhuma requisição de
rede. Os dados ficam no aparelho.

---

## Rodando

```bash
npm install
npm run dev
```

| Comando | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento com recarga instantânea |
| `npm run build` | gera `dist/` — PWA instalável, pronta pra hospedar |
| `npm run build:arquivo-unico` | gera **um** `.html` com tudo embutido |
| `npm test` | roda os testes |
| `npm run test:watch` | testes em modo contínuo |
| `npx eslint src` | análise estática |
| `npm run android:sincronizar` | build + copia para o projeto Android |
| `npm run android:abrir` | abre o projeto no Android Studio |

O build de **arquivo único** existe para quando o que importa é entregar um
arquivo pra alguém: dá pra abrir com duplo clique, mandar por mensagem ou
guardar no Drive, e continua funcionando.

---

## Como o código está organizado

```
src/
  principal.js        entrada — junta estilo e app
  app.js              roteamento, barra de abas, ciclo de desenho
  estilo.css          design system e todos os componentes
  fontes/             Caprasimo e Figtree (.woff2, embutidas)

  dados/
    modelo.js         ← a rotina-modelo. O ÚNICO arquivo pessoal.
    receitas.js       banco de alimentos e receitas

  nucleo/             sem DOM, testável fora do navegador
    tempo.js          datas e horários
    modelo.js         regras derivadas do domínio
    estado.js         os dados, a gravação e o desfazer
    armazem.js        localStorage à prova de falha + migração de esquema
    render.js         o gancho que quebra o ciclo estado ↔ app

  ui/index.js         h(), ícones, peças reaproveitadas, folha, aviso
  telas/              uma por aba, mais boas-vindas, perfil,
                      primeiro-uso e replanejar

testes/               103 testes sobre o núcleo
docs/                 publicação e privacidade
```

### Três ideias que explicam o resto

**1. O dia é derivado, não digitado.**
Um dia é a soma de três camadas: os blocos fixos daquele dia da semana, uma
refeição por slot configurado, e o treino do dia. Por isso mudar o horário do
almoço na aba Comida move o bloco no calendário, e apagar um treino some com o
bloco de exercício — sem nenhuma tela conhecer a outra.

Quando você edita um dia específico, ele é **materializado**: vira uma lista
própria que passa a ignorar a geração. É o que permite "hoje a aula atrasou"
sem reescrever todas as quintas.

**2. Toda mudança é desfazível.**
`agir()` tira uma fotografia dos dados antes de mexer. O botão "Desfazer" do
aviso restaura essa fotografia inteira. É por isso que desfazer um arraste
volta para antes do gesto começar, e não para o quadro anterior do movimento.

**3. A tela é redesenhada por inteiro.**
Não há atualização parcial de DOM. Num app de celular isso é barato e elimina
uma classe inteira de bug: a interface nunca fica dessincronizada dos dados.
As duas concessões — preservar rolagem e foco do teclado — estão em
`desenharTudo()`.

---

## Para o app servir a outra pessoa

Todo conteúdo pessoal está em [`src/dados/modelo.js`](src/dados/modelo.js).
O resto do código não conhece nenhum horário, treino ou remédio: só sabe ler as
estruturas definidas lá.

Duas formas de trocar:

- **Pelo app:** a tela de Primeiro uso oferece "Começar do zero", que carrega
  uma estrutura vazia para a pessoa montar a própria semana.
- **No código:** substitua o `MODELO` daquele arquivo. Nenhum outro precisa ser
  tocado.

O **nome não faz parte da rotina**: ele é pedido uma vez na abertura e sobrevive
a trocar de rotina. A rotina-modelo vem com `perfil.nome` vazio de propósito —
sem isso, quem escolhesse o exemplo seria saudado com o nome de outra pessoa.

Essa tela não some para sempre depois da primeira escolha: **Perfil → Recomeçar
do início** traz ela de volta, agora com aviso de que apaga tudo, atalho para
baixar o backup antes e a saída "Voltar sem mudar nada". Reabrir não grava nada
— os dados só são tocados quando uma das opções é escolhida.

O **Perfil** (avatar no canto da tela Início) reúne o que vale para o app todo:
nome, metas do dia, backup e recomeçar. Fica fora das cinco abas de propósito —
a barra é do dia a dia, isto é configuração.

---

## Mandar para alguém testar

O caminho recomendado é **hospedar a PWA**, não mandar arquivo:

```bash
npm run build          # gera dist/
```

Arraste a pasta `dist/` em [app.netlify.com/drop](https://app.netlify.com/drop)
e você recebe uma URL em segundos. Quem abrir no celular pode usar
*Menu → Adicionar à tela inicial*: fica com ícone, abre em tela cheia e passa a
funcionar offline.

Por que não mandar o `.html` de arquivo único para testar: no Android, abrir um
HTML vindo do WhatsApp geralmente cai num visualizador em vez do navegador, e
sob `file://` o armazenamento é frágil — os dados do testador podem sumir entre
uma sessão e outra. O arquivo único serve para mostrar o app a alguém na hora,
não para uma rodada de testes de dias.

**Peça a quem testar:** depois de alguns dias, tocar em *Baixar backup* na tela
Início e te enviar o JSON. Você consegue restaurar no seu aparelho e ver
exatamente o que a pessoa montou.

## Backlog

Ideias, incômodos e feedback dos testadores vão para
[`BACKLOG.md`](BACKLOG.md) — inclusive a lista do que ficou conscientemente
para depois, com o contexto para retomar.

## Publicar

Veja [`docs/PLAY-STORE.md`](docs/PLAY-STORE.md). Resumo:

- o projeto Android já está gerado, mirando API 36 (exigência do Play a partir
  de 31/08/2026);
- falta instalar o Android Studio para compilar o AAB;
- falta decidir o `applicationId` definitivo — **ele é permanente**;
- falta gerar capturas de tela e o gráfico de destaque;
- a política de privacidade está escrita em
  [`docs/PRIVACIDADE.md`](docs/PRIVACIDADE.md) e precisa ser hospedada.

Alternativa sem loja: o `dist/` é uma PWA completa. Hospedado em qualquer
HTTPS, instala pelo próprio navegador.
