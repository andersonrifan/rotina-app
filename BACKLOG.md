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

### Da primeira rodada — ainda em aberto

Só sobraram estes dois. O resto foi feito e está listado em "Já resolvido".

- [ ] **Aba Treino: registrar o que foi feito.** Marcar quantidades, carga e
      duração da sessão, como o app antigo fazia. Hoje só há o círculo de
      "fiz o exercício". Precisa de uma entidade nova (sessão de treino) e de
      uma tela de histórico — é o maior item em aberto.
- [ ] **Adicionar exercício é limitado.** Só dá para escolher da lista de
      sugestões; não dá para escrever um exercício próprio nem definir o alvo
      ("3 × 8–12"). Deveria abrir um formulário, como o de remédio agora abre.
- [ ] **Gráficos e estatísticas.** No Início, uma visão geral; no Perfil, uma
      aba de Estatísticas. Depende do item de registro acima para ter o que
      mostrar sobre treino — sem sessões gravadas, não há série temporal.


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
- [ ] **Horários andam de 15 em 15 minutos.** Partindo de 06:40 dá para chegar
      em 06:55, não em 06:45. O handoff pedia trocar os steppers por seletor de
      hora nativo na implementação real.
- [ ] **Sem histórico de treinos.** O app antigo registrava sessões feitas (com
      data, carga, observação). O novo só marca o exercício do dia. Há 2 sessões
      registradas no backup antigo.
- [ ] **Célula do cardápio não é tocável.** Os 30 px de altura vêm do handoff e
      não chegam ao alvo mínimo, então a edição é pela lista abaixo da grade.
      Funciona, mas alguém pode tentar tocar a célula primeiro.
- [ ] **Seletor de dia do cardápio tem 33 px de largura.** Consequência da
      coluna de rótulos de 64 px + 7 dias em 390 px. Acima do mínimo do WCAG AA
      (24 px), abaixo do ideal (44 px).

### Não testado — precisa de celular de verdade

Nada disso pôde ser verificado aqui; só com dedo e aparelho.

- [ ] Toque e segure 480 ms entra em edição sem disparar ao rolar a lista
- [ ] Arrastar bloco e alça de duração funciona com o dedo
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

undefined

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
