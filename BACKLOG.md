# Backlog

Lugar para juntar ideias, incômodos e feedback sem interromper o que está em
andamento. Depois é só me mandar o arquivo inteiro (ou dizer "olha o backlog")
que eu leio tudo de uma vez.

**Escreva do jeito que vier.** Não precisa formatar, priorizar nem explicar
direito — "o botão X tá estranho" já é suficiente. Eu organizo depois.

---

## Suas anotações

<!-- Escreva aqui. Uma linha por ideia, ou parágrafos, tanto faz. -->

-


---

## Feedback dos testadores

<!-- O que amigos e família relatarem. Vale anotar QUEM disse: se duas pessoas
     reclamam da mesma coisa, isso pesa mais que uma opinião isolada. -->

-

---

## Pendências que eu já identifiquei

Coisas que eu deixei conscientemente para depois, com o contexto necessário
para retomar. Marque com `[x]` se alguma virar prioridade, ou risque se decidir
que não vale.

### Funcionalidade que o handoff previa e não foi feita

- [ ] **Notificação de horário de remédio.** É o item 4 do handoff (notificações
      locais nos horários e alerta de reposição). Precisa do app empacotado com
      Capacitor — numa PWA o Android não entrega notificação agendada de forma
      confiável.
- [ ] **Hábitos.** O handoff coloca explicitamente como fora de escopo desta
      versão. O app antigo tinha (leitura, oração, exercício, banho, TCC,
      terapia) e as marcações estão no backup de 15/08, se quiser resgatar.

### Limitações conhecidas do modelo atual

- [ ] **Recolocar o `arroz-lote` nos almoços.** A limitação de um prato por
      refeição acabou (agora é uma lista), mas o cardápio não se corrige
      sozinho: os almoços de seg/ter/qua continuam só com o prato principal
      desde a migração. Reabrir cada um em Comida → Semana e marcar o arroz
      junto faz a lista de compras voltar a pedir a quantidade certa.
- [ ] **Conferir quais receitas são mesmo de lote.** Tudo que rende mais de
      uma porção começou ligado, o que é um chute razoável mas é um chute.
      A chave está em Comida → Receitas, dentro de cada ficha.
- [ ] **Célula do cardápio não é tocável.** Os 30 px de altura vêm do handoff e
      não chegam ao alvo mínimo, então a edição é pela lista abaixo da grade.
      Funciona, mas alguém pode tentar tocar a célula primeiro.
- [ ] **Seletor de dia do cardápio tem 33 px de largura.** Consequência da
      coluna de rótulos de 64 px + 7 dias em 390 px. Acima do mínimo do WCAG AA
      (24 px), abaixo do ideal (44 px).

### Não testado — precisa de celular de verdade

Nada disso pôde ser verificado aqui; só com dedo e aparelho. Os gestos da
régua foram exercitados com eventos de ponteiro sintéticos (o arraste move os
vizinhos ao vivo, a borda segue o dedo 1 px por 1 px, a rolagem do container
continua livre), mas isso não substitui um polegar.

- [ ] Toque e segure 500 ms entra em edição sem disparar ao rolar a régua
- [ ] Segurar não abre mais a barra de Copiar/Compartilhar do navegador
- [ ] **Botão Voltar** com folha aberta fecha a folha; no Início, sai do app
      (só dá para testar no APK — no navegador o evento não existe)
- [ ] O `+` sumindo ao rolar não atrapalha quem rola devagar
- [ ] Rolar o dia em modo de edição encostando nos cartões — o corpo do cartão
      deve rolar, só as duas alças é que seguram o dedo
- [ ] Arrastar pela alça ≡ para um espaço livre e ver que nada mais se mexe
- [ ] Arrastar até ultrapassar o vizinho e sentir a vibração da troca
- [ ] Rolagem automática ao levar um bloco até a borda de cima ou de baixo
      (usa `requestAnimationFrame`, que só roda com o app em primeiro plano)
- [ ] Puxar a borda de baixo — deve acompanhar o dedo sem saltos
- [ ] Alvos pequenos: a alça de mover tem 28 px de largura e a de duração
      13 px de altura. São exceções conscientes aos 44 px, porque a altura do
      cartão É a duração do bloco — mas só o dedo diz se ficou confortável
- [ ] Barra de abas não fica embaixo da barra de gestos
- [ ] Teclado virtual no campo de nome — o `<form>` deve mostrar "Ir"/"OK"
- [ ] Dados sobrevivem a fechar/reabrir e a uma atualização do app

### Play Store

- [ ] **Decidir o `applicationId` definitivo.** Hoje é `br.com.rotina.diaria`,
      chutado por mim. **Depois do primeiro envio nunca mais muda.**
- [ ] Gerar e guardar a chave de assinatura (perder = não poder atualizar)
- [ ] Instalar Android Studio + SDK 36 para compilar o AAB
- [ ] Capturas de tela e gráfico de destaque 1024 × 500
- [ ] Hospedar `docs/PRIVACIDADE.md` numa URL pública
- [ ] Testar se dá para remover a permissão `INTERNET` do manifesto
- [ ] Recrutar 12 testadores para os 14 dias exigidos pelo Google

Detalhes de cada um em [`docs/PLAY-STORE.md`](docs/PLAY-STORE.md).

---

## Já resolvido

Fica registrado para não voltar à discussão.

**Da rodada da comida:**

- ~~Modo escuro só seguia o aparelho~~ — Perfil → Aparência, com Automático /
  Claro / Escuro, e a escolha vence o sistema nos dois sentidos
- ~~Modo de preparo, tempo e dica de conservação nunca apareciam~~ — estavam
  escritos para as 27 receitas e só existiam no arquivo-fonte. Agora Comida
  tem a aba Receitas e cada uma abre uma ficha completa
- ~~Não dava para criar nem editar receitas~~ — elas saíram do código e viraram
  dado (migração v7 → v8), com backup junto
- ~~Preparação em lote não existia~~ — chave por receita: ligada, a ficha
  mostra a panela que a semana vai exigir e a lista compra por panela;
  desligada, mostra uma porção e a lista compra o exato
- ~~A lista de compras pedia gramas, e no mercado se compra pacote~~ — o
  tamanho da embalagem estava no banco de alimentos e nunca tinha sido usado
- ~~Três tokens de texto ficaram de fora do tema manual~~ — achado pelo
  auditor de contraste, que é justamente para isso

**Da rodada de robustez:**

- ~~O backup não saía do aparelho no app empacotado~~ — compartilhar pela
  folha do sistema, baixar, ou copiar como texto; e o app lembra há quantos
  dias foi o último
- ~~O navegador podia despejar os dados sozinho~~ — `navigator.storage.persist()`
- ~~`aria-modal` era promessa vazia~~ — foco entra na folha, Tab fica preso,
  Esc fecha, o foco volta, e o fundo fica `inert`
- ~~Remover remédio, refeição e exercício apagava sem perguntar~~ — os três
  confirmam, dizendo o que se perde
- ~~Horário da refeição andava de 15 em 15 minutos~~ — seletor nativo
- ~~Sem modo escuro~~ — tema noturno completo, com auditoria de contraste
  passando nas seis telas nos dois temas
- ~~Um prato por refeição~~ — o cardápio guarda uma lista, e a lista de
  compras soma os ingredientes de todos

**Da rodada da semana-modelo:**

- ~~Não dava para editar a rotina, só um dia de cada vez~~ — o interruptor
  "Valer em toda segunda-feira" apareceu no editor de bloco (só existia ao
  CRIAR bloco, nunca ao editar um que já existia), e o Perfil ganhou a tela
  **Semana modelo** para redesenhar os sete dias
- ~~Mudar o molde reescreveria o passado~~ — antes de tocar na semana-modelo
  os dias já vividos são congelados, então a mudança vale de hoje em diante e
  a aderência das estatísticas continua sendo sobre o dia que existiu
- ~~Tirar um bloco da semana renumeraria os ids~~ — a remoção deixa um buraco
  no lugar; sem isso cada marcação passaria a apontar para o bloco seguinte

**Da rodada da Rotina:**

- ~~O botão Voltar do Android fechava o app~~ — agora ele fecha a camada de
  cima (folha, perfil, estatísticas, modo de edição), depois volta ao Início,
  e só então sai. `@capacitor/app` era dependência e nunca tinha sido usado
- ~~Refeição trocada na aba Comida não aparecia na Rotina~~ — materializar um
  dia congelava também o nome do prato; agora congela só os horários
- ~~O `+` tapava o fim do dia~~ — ele se recolhe ao rolar para baixo e volta
  ao rolar para cima
- ~~Aba "Dia"~~ — virou "Rotina", que é o que ela mostra
- ~~Replanejar o resto do dia~~ — removido, com a faixa de aviso junto
- ~~Novo treino só existia como botão no estado vazio~~ — ganhou o `+`
  flutuante, em sálvia, que também adiciona exercício quando já há treino
- ~~Exercício por tempo só oferecia repetições~~ — o exercício declara se
  conta reps ou segundos, o registro pergunta a coisa certa e os segundos
  ficam fora da conta de volume. O que já estava montado é reconhecido pelo
  alvo ("2 × 20–30s")
- ~~`estudo` e `pessoal` tinham a MESMA cor~~ — dez categorias, dez matizes
  terrosos distintos, e o fundo do cartão subiu de 13 % para 22 %
- ~~Barra de abas com respiro desigual~~ — 15 px acima e abaixo, em vez de
  10/22, o que a deixava empurrada para cima
- ~~Texto do cartão da régua deslocado para dentro~~ — o recuo da esquerda
  agora fecha com o da direita

**Da segunda rodada da régua:**

- ~~O arraste só sabia trocar cartões de lugar~~ — agora o cartão vai para o
  horário que o dedo indicar, inclusive para um buraco no meio do dia sem
  mexer em mais nada. A troca com o vizinho acontece só quando ele é de fato
  ultrapassado (centro passa do centro)
- ~~Segurar abria a barra de Copiar/Compartilhar do navegador~~ — o app
  desliga seleção de texto e callout fora dos campos de entrada
- ~~Abrir o Dia caía no café da manhã às 20h~~ — a régua abre na altura de
  agora quando o dia é hoje
- ~~Levar um bloco para longe exigia soltar no meio~~ — a régua rola sozinha
  perto das bordas durante o arraste
- ~~A edição do Dia só era alcançável segurando um bloco~~ — pílula "Editar"
  no cabeçalho, como no Treino. A dica do gesto só aparecia no cabeçalho de
  hoje, justamente não nos dias futuros que a tela convida a ajustar
- ~~Não havia volta atrás depois de editar um dia~~ — "Voltar ao padrão da
  semana" descarta as edições daquele dia e o devolve à semana-modelo,
  preservando as marcações
- ~~Alças espremidas em blocos de 10 min~~ — em edição o cartão tem 40 px no
  mínimo, o que também mantém o horário visível enquanto se edita

**Da rodada da régua:**

- ~~A visão do dia não mostrava os buracos~~ — a aba Dia virou uma régua com
  as horas à esquerda e cada bloco na altura da sua duração, como a versão
  antiga. O tempo livre aparece desenhado, com o total logo abaixo
- ~~O dia começava com "Dormindo"~~ — a régua começa na primeira coisa depois
  de acordar; o sono da madrugada vira uma linha compacta acima dela
- ~~Editar não parecia kanban~~ — arrastar um cartão reorganiza o dia ao vivo:
  o que está embaixo sobe e os horários se alteram enquanto o dedo está na tela
- ~~A alça de duração dava saltos e ficava fora do cartão~~ — ela vive na
  borda de baixo do cartão e o gesto usa a mesma escala do desenho, então a
  borda segue o dedo pixel a pixel
- ~~Rolar o dia em modo de edição era quase impossível~~ — o corpo do cartão
  não arrasta mais nada; só a alça da esquerda e a borda de baixo seguram o
  dedo, e cada gesto passou a ter uma área própria
- ~~Não dava para editar treinos nem mexer nos exercícios~~ — a pílula
  "Editar" ficou visível no cabeçalho do Treino, e um treino sem exercício
  nenhum agora oferece "Montar o treino" em vez de virar beco sem saída
- ~~Blocos no mesmo horário se escondiam~~ — aparecem lado a lado, em colunas

**Da segunda rodada:**

- ~~Treino não registrava o que foi feito~~ — sessões com séries, carga,
  duração e observação, separadas da estrutura do treino
- ~~Adicionar exercício era limitado~~ — nome e alvo em campos livres
- ~~Faltavam gráficos e estatísticas~~ — resumo da semana no Início e tela
  cheia de Estatísticas, aberta pelo resumo ou pelo Perfil
- ~~Voltar ao app jogava você para hoje~~ — só troca de dia se a data virou
  de verdade enquanto o app esteve em segundo plano

**Da revisão de uso:**

- ~~Botões "Editar" espalhados~~ — segurar qualquer item entra na edição, e só
  o "Concluir" fica visível
- ~~Rolar a lista abria a edição~~ — o gesto não redesenha mais a tela, que era
  o que cancelava a rolagem
- ~~Faltava o alternador Agenda/Lista no Dia~~ — voltou, e a agenda dá a cada
  bloco a altura da sua duração
- ~~Não dava para editar o horário de um bloco~~ — tocar em edição abre o
  editor com campos de hora nativos (resolve também o passo de 15 min)
- ~~Arraste não respondia~~ — o cartão segue o dedo e o horário atualiza ao vivo
- ~~Desfazer atrapalhava~~ — removido; as ações destrutivas confirmam antes
- ~~A alça dos popups era enfeite~~ — puxar para baixo fecha
- ~~Comida não refletia horário alterado no Dia~~ — o dia manda sobre o modelo
- ~~Caixa: ciclar chip por chip~~ — formulário numa folha
- ~~Não estava claro o que define o estoque~~ — editável no formulário e
  explicado na tela
- ~~Treino pedia horário e duração~~ — só duração; o horário vem do bloco no Dia
- ~~Chip de horário solto no Treino~~ — removido

**Anteriores:**

- ~~Backup dos dados~~ — Perfil → Seus dados
- ~~Renomear só ciclava listas fixas~~ — agora é campo de texto livre
- ~~Não dava para voltar à tela de escolha da rotina~~ — Perfil → Recomeçar
- ~~Rotina de exemplo trazia o nome "Anderson"~~ — nome saiu do modelo
- ~~Metas de kcal/proteína não eram editáveis~~ — Perfil → Metas do dia
- ~~App dependia do Google Fonts~~ — fontes embutidas, offline de verdade
- ~~Água~~ — removida a pedido
