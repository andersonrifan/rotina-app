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

- [ ] **Um prato por refeição.** O app antigo aceitava vários. Ao migrar seu
      cardápio, os almoços de seg/ter/qua perderam o `arroz-lote` e ficaram só
      com o prato principal. Consequência real: **a lista de compras pede menos
      arroz do que você usa.** É decisão de produto vinda do handoff, não
      restrição técnica.
- [ ] **Horário da refeição ainda anda de 15 em 15 minutos.** O bloco do Dia e
      o remédio já usam o seletor nativo do aparelho; falta trocar o stepper do
      horário da refeição, em Comida → Editar.
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
- [ ] Botão Voltar do Android com folha aberta (deve fechar a folha, não o app)
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
