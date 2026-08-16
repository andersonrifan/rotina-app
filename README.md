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
    agenda.js         a régua do dia: janela, vãos, colunas, arraste
    sessoes.js        o treino que foi FEITO, separado do planejado
    estatisticas.js   as contas que os gráficos mostram
    estado.js         os dados e a gravação
    armazem.js        localStorage à prova de falha + migração de esquema
    render.js         o gancho que quebra o ciclo estado ↔ app

  ui/index.js         h(), ícones, peças reaproveitadas, folha, aviso
  ui/graficos.js      SVG à mão: colunas, barras, linha, medidor
  telas/              uma por aba, mais boas-vindas, perfil,
                      estatisticas e primeiro-uso

testes/               190 testes sobre o núcleo
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

Materializar congela os HORÁRIOS daquele dia, não o texto: o nome da refeição
e o prato continuam vindo da aba Comida, e o nome do treino, da aba Treino.
Sem isso as telas passavam a discordar sobre o mesmo almoço. A única exceção é
um título que você escreveu à mão no editor do dia — esse ninguém sobrescreve.

### O que acontece quando a semana vira

Nada reseta, e nada acumula. A estrutura é indexada por **dia da semana**, não
por data: toda segunda nasce da mesma `fixos.Seg`, com as mesmas refeições e o
mesmo treino. É por isso que a aba se chama Rotina.

O que é por data são as **marcações** — feito, atrasei, pulei, remédio tomado,
refeição consumida — e elas não atravessam: a segunda que vem chega em branco,
para ser vivida de novo. As **sessões de treino** também são por data, e é
justamente isso que dá histórico às estatísticas.

No meio dos dois está o dia materializado: ele vale só para aquela data. Mover
o almoço numa segunda não mexe nas outras segundas — e se você quis mudar a
rotina, e não só aquele dia, o caminho é a semana-modelo (o interruptor
"Repetir toda segunda-feira" ao criar um bloco, ou as abas Comida e Treino).
`testes/rotina-semanal.test.js` existe para que isso continue verdadeiro.

**2. O que foi feito é separado do que foi planejado.**
O treino é estrutura: "Força A tem 8 exercícios" vale para todas as quartas. A
sessão é fato: "na quarta dia 19 fiz 5, 4, 4 repetições" vale para aquela data.
Por isso editar um treino não reescreve o passado, e excluí-lo não apaga o
histórico. É essa separação que dá série temporal às estatísticas.

O mesmo vale para o dia: a semana-modelo é o plano, `blocos[data]` é a exceção.

**Não há desfazer.** Havia, e o aviso ficava no caminho o tempo todo — ele
aparece a cada toque, e quase tudo aqui é um toque. As ações destrutivas de
verdade (restaurar backup, recomeçar, excluir treino) confirmam antes, que é
onde a proteção pertence.

**3. O dia é uma régua, não uma lista.**
A aba Dia desenha as horas numa coluna à esquerda e posiciona cada bloco pelo
horário, com a altura da sua duração. O vazio entre dois blocos vira vazio na
tela — que é a única forma de *ver* onde sobra tempo. Três regras vêm junto,
todas em [`src/nucleo/agenda.js`](src/nucleo/agenda.js):

- **A régua começa quando você acorda**, e abre já na altura de agora. O sono
  da madrugada gastaria um terço da rolagem; ele sai da régua e vira uma linha
  compacta acima dela, ainda marcável e editável.
- **Blocos no mesmo horário aparecem lado a lado**, como num calendário. O
  lanche das 09:30 dentro do estudo das 08:30 é a rotina real, não um erro —
  empilhados, um esconderia o outro.
- **Arrastar é livre no tempo; trocar só ao ultrapassar.** O cartão vai para o
  horário onde o dedo está, de 5 em 5 minutos — inclusive para dentro de um
  buraco no meio do dia, sem que nada mais se mexa. O vizinho só entra na
  história quando o centro do cartão passa do centro dele: aí os dois trocam,
  e o ultrapassado assume a casa que ficou vazia. A duração muda um bloco e só
  ele — num dia com sobreposições legítimas, qualquer regra de empurrão
  mexeria em coisa que você não tocou.

No modo de edição cada gesto tem **uma área própria** do cartão: a alça da
esquerda arrasta, a borda de baixo estica, o corpo abre os horários exatos.
Só as duas alças bloqueiam o toque do navegador — é por isso que a lista volta
a rolar normalmente, o que não acontecia quando o cartão inteiro arrastava.
Perto das bordas da tela a régua rola sozinha, senão levar um bloco das 07:00
para as 20:00 não caberia num gesto só.

Duas saídas fecham o modo: **Concluir**, e **Voltar ao padrão da semana**, que
descarta as edições daquele dia e o devolve à semana-modelo. É o inverso exato
da materialização, e é o que substitui o desfazer — em vez de confirmar cada
remoção, existe uma volta atrás do tamanho do dia.

**4. A tela é redesenhada por inteiro.**
Não há atualização parcial de DOM. Num app de celular isso é barato e elimina
uma classe inteira de bug: a interface nunca fica dessincronizada dos dados.
As duas concessões — preservar rolagem e foco do teclado — estão em
`desenharTudo()`.

A terceira exceção é o arraste: enquanto o dedo está na tela, nada é
redesenhado. A prévia mexe direto no `top`, no `height` e no rótulo de cada
cartão, e os dados só são tocados ao soltar. Redesenhar a cada quadro era o
que fazia o cartão saltar embaixo do dedo.

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

**Peça a quem testar:** depois de alguns dias, abrir o **Perfil** (avatar no
canto da tela Início), tocar em *Baixar backup* e te enviar o JSON. Você
restaura no seu aparelho e vê exatamente o que a pessoa montou — quais
refeições renomeou, o que abandonou, onde travou. Vale mais que "achei legal".

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
