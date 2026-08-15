# Backlog

Lugar para juntar ideias, incômodos e feedback sem interromper o que está em
andamento. Depois é só me mandar o arquivo inteiro (ou dizer "olha o backlog")
que eu leio tudo de uma vez.

**Escreva do jeito que vier.** Não precisa formatar, priorizar nem explicar
direito — "o botão X tá estranho" já é suficiente. Eu organizo depois.

---

## Suas anotações

<!-- Escreva aqui. Uma linha por ideia, ou parágrafos, tanto faz. -->

- Gostaria de remover os botões de editar no geral. A ideia é que se for para editar clique e segure. Aí pode aparecer o concluir quando finalizar.
-  A aba Dia (que é a mais importante do APP) não é nada boa para o usuário. toques para rolar a tela está abrindo a edição. O modo editar que precisa de muito mais atenção (fazer baseado Microsoft teams, volte o toogle de visualização de agenda (duração do bloco consome mais espaço no dia) e a lista (como é atualmente). No modo edição ao clicar no item deve ser possível editar a hora inicial até a final. Deve ser bem interativo, os cartões se moverem quando arrastados etc. Pode consumir bastante aqui para ficar o melhor possível, tome referência dos apps de agenda das big techs.
- Melhorar aba treino para ser ter as funcionalidades que tinha no antigo de marcar as quantidades feitas, duração etc. Essa aba também deve ser bem melhorada, adicionar exercício é bem limitado, ao editar não precisa colocar quando começa só a duração, se for adicionar o exercício no Dia já resolve quando começa. onde diz o tempo (ao lado de Séries, bi-sets...) está mal diagramado não centralizado.
- Adiciona no início gráficos e visualizações do que der no geral e sobre os exercícios. no perfil adicione aba de Estatísticas.
- Em Caixa não está claro o que define o estoque. onde isso é colocado?
- Em Comida as horas não atualizam se eu alterar em Dia, por exemplo, se eu alterar o Almoço para 12:05 em Comida fica aparecendo que é 12:00
- Em Caixa > Editar. clicar 1 em um para alterar é muito ruim. Ao adicionar remédio o ideal é que abra um popup para configurar o remédio.
- Remover o desfazer, ele atrapalha muito
- Em todas as telas a barra (quando abre algum popup, por exemplo) é de enfeite, não funciona arrastar a barra para sair do popup


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

- ~~Backup dos dados~~ — Perfil → Seus dados
- ~~Renomear só ciclava listas fixas~~ — agora é campo de texto livre
- ~~Não dava para voltar à tela de escolha da rotina~~ — Perfil → Recomeçar
- ~~Rotina de exemplo trazia o nome "Anderson"~~ — nome saiu do modelo
- ~~Metas de kcal/proteína não eram editáveis~~ — Perfil → Metas do dia
- ~~App dependia do Google Fonts~~ — fontes embutidas, offline de verdade
- ~~Água~~ — removida a pedido
