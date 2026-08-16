import { DIAS, NOMES_REFEICAO, REFEICOES_SUGERIDAS } from '../dados/modelo.js';
import { Dados, Tela, agir, agirSemAviso, definirTela } from '../nucleo/estado.js';
import { diaDaSemana, semanaDe, dataCurta, paraMinutos } from '../nucleo/tempo.js';
import { pratoDe, nutriDaReceita, totaisDoDia, refeicaoFeita, gerarCompras,
         comprasAtuais, SECOES_COMPRA, horaDaRefeicaoNoDia } from '../nucleo/modelo.js';
import { RECEITAS } from '../dados/receitas.js';
import { h, icone, cabecalhoTela, rotuloSecao, barraProgresso, estadoVazio,
         stepper, ajustarHora, numeroBR, abrirFolha, fecharFolha, abrirFolhaTexto,
         pilulaConcluir, ligarToqueLongo, consumirToqueLongo } from '../ui/index.js';

/* ===========================================================================
   TELA 4 — COMIDA

   Três abas sobre os mesmos dados:
     HOJE     o que comer agora, marcado por refeição.
     SEMANA   a grade do cardápio e a escolha de prato por refeição.
     COMPRAS  a lista derivada do cardápio, agrupada por onde se compra.

   O modo de edição desta tela é o que generaliza o app: a lista de refeições
   não é fixa. Quem só faz café, almoço, janta e ceia chega nisso removendo e
   renomeando linhas — e o calendário do Dia acompanha, porque os blocos de
   refeição são gerados a partir daqui.
   =========================================================================== */

export function telaComida(){
  const iso = Tela.data;
  const editando = Tela.editando.comida;

  return h('div', {class:'tela tela-comida'},
    cabecalhoTela(
      dataCurta(iso) + ' · ' + diaDaSemana(iso).full,
      'Comida',
      null,
      editando ? [pilulaConcluir(() => definirTela({editando: Object.assign({}, Tela.editando, {comida: false})}))] : null
    ),
    segmentado(),
    editando ? edicaoDasRefeicoes()
      : Tela.abaComida === 'hoje'   ? comidaHoje(iso)
      : Tela.abaComida === 'semana' ? comidaSemana(iso)
      :                               comidaCompras()
  );
}

export function segmentado(){
  const abas = [['hoje','Hoje'], ['semana','Semana'], ['compras','Compras']];
  return h('div', {class:'segmentado'},
    abas.map(([id, rotulo]) => h('button', {
        class:'segmento' + (Tela.abaComida === id ? ' ativo' : ''),
        type:'button',
        'aria-pressed': String(Tela.abaComida === id),
        onTap: () => definirTela({abaComida: id})
      }, rotulo))
  );
}

/* ===========================================================================
   HOJE
   =========================================================================== */
export function comidaHoje(iso){
  const diaK = diaDaSemana(iso).k;
  const totais = totaisDoDia(iso);
  const metas = Dados.perfil.metas;

  return h('div', null,
    h('section', {class:'cartao-kcal'},
      h('div', {class:'rotulo-claro'}, 'Consumido hoje'),
      h('div', {class:'kcal-numero'}, numeroBR(totais.kcal), h('span', {class:'kcal-un'}, 'kcal')),
      h('div', {class:'kcal-meta'}, 'meta ' + numeroBR(metas.kcal) + ' kcal · ' +
        totais.prot + ' de ' + metas.prot + ' g de proteína'),
      barraProgresso(metas.kcal ? totais.kcal / metas.kcal : 0, 'barra-clara')
    ),

    h('div', {class:'lista-refeicoes'},
      Dados.slots.map(slot => linhaDeRefeicao(iso, diaK, slot))
    )
  );
}

export function linhaDeRefeicao(iso, diaK, slot){
  const prato = pratoDe(diaK, slot.id);
  const feita = refeicaoFeita(iso, slot);

  /* Sem prato definido, a linha vira um convite: leva pra aba Semana, que é
     onde se escolhe o prato. Marcar uma refeição vazia não faria sentido. */
  if(!prato){
    return h('div', {class:'refeicao a-definir', onTap: () => definirTela({abaComida:'semana'})},
      h('div', {class:'refeicao-texto'},
        h('div', {class:'refeicao-rotulo'}, slot.nome + ' · ' + horaDaRefeicaoNoDia(iso, slot)),
        h('div', {class:'refeicao-prato'}, 'A definir')
      ),
      icone('seta', 16)
    );
  }

  const linha = h('div', {
      class:'refeicao' + (feita ? ' feita' : ''),
      onTap: () => {
        if(consumirToqueLongo()) return;
        agir(slot.nome + (feita ? ' desmarcado' : ' marcado'), d => {
          d.refeicoesFeitas[iso + ':' + slot.id] = !feita;
        });
      }
    },
    h('span', {class:'refeicao-circulo'}, feita ? icone('check', 14) : null),
    h('div', {class:'refeicao-texto'},
      h('div', {class:'refeicao-rotulo'}, slot.nome + ' · ' + horaDaRefeicaoNoDia(iso, slot)),
      h('div', {class:'refeicao-prato'}, prato.nome)
    ),
    h('div', {class:'refeicao-nums'},
      h('div', {class:'refeicao-kcal'}, numeroBR(prato.kcal) + ' kcal'),
      h('div', {class:'refeicao-prot'}, prato.prot + ' g')
    )
  );
  /* Segurar qualquer refeição abre a edição da lista — o mesmo gesto da
     aba Dia, para não haver duas gramáticas no mesmo app. */
  ligarToqueLongo(linha, () => definirTela({
    editando: Object.assign({}, Tela.editando, {comida: true})
  }));
  return linha;
}

/* ===========================================================================
   SEMANA — grade do cardápio
   =========================================================================== */
export function comidaSemana(iso){
  const datas = semanaDe(iso);

  return h('div', null,
    h('section', {class:'cartao'},
      rotuloSecao('Cardápio da semana'),
      h('div', {class:'grade-cardapio'},
        /* Cabeçalho: canto vazio + as iniciais dos dias. Tocar numa inicial
           troca o dia da lista abaixo — é o alvo de toque da grade. */
        h('div', {class:'grade-canto'}),
        DIAS.map((d, i) => h('button', {
            class:'grade-cabecalho dia-selecionavel' + (datas[i] === iso ? ' ativo' : ''),
            type:'button',
            'aria-label': 'Ver ' + d.full,
            'aria-pressed': String(datas[i] === iso),
            onTap: () => definirTela({data: datas[i]})
          }, d.letra)),

        /* Uma linha por refeição. As células são resumo, não controle. */
        Dados.slots.map(slot => [
          h('div', {class:'grade-rotulo'}, slot.nome),
          DIAS.map((d, i) => {
            const prato = pratoDe(d.k, slot.id);
            return h('div', {
                class:'celula-cardapio' + (prato ? ' definido' : ' a-definir') +
                      (datas[i] === iso ? ' selecionado' : ''),
                role:'img',
                'aria-label': d.full + ', ' + slot.nome + ': ' + (prato ? prato.nome : 'a definir')
              });
          })
        ])
      ),
      h('div', {class:'legenda-cardapio'},
        h('span', null, h('i', {class:'amostra definido'}), 'prato definido'),
        h('span', null, h('i', {class:'amostra a-definir'}), 'a definir')
      )
    ),

    h('section', {class:'cartao'},
      rotuloSecao(diaDaSemana(iso).full),
      h('div', {class:'lista-refeicoes'},
        Dados.slots.map(slot => {
          const prato = pratoDe(diaDaSemana(iso).k, slot.id);
          return h('div', {class:'refeicao', onTap: () => abrirEscolhaDePrato(diaDaSemana(iso).k, slot)},
            h('div', {class:'refeicao-texto'},
              h('div', {class:'refeicao-rotulo'}, slot.nome + ' · ' + horaDaRefeicaoNoDia(iso, slot)),
              h('div', {class:'refeicao-prato'}, prato ? prato.nome : 'A definir')
            ),
            icone('seta', 16)
          );
        })
      )
    )
  );
}

/* Busca do seletor de prato. Fora do estado persistido: some ao fechar. */
let buscaDePrato = '';

export function abrirEscolhaDePrato(diaK, slot){
  buscaDePrato = '';
  abrirFolha({
    titulo: slot.nome + ' de ' + nomeCompletoDoDia(diaK),
    acoes: false,
    corpo: () => corpoEscolhaDePrato(diaK, slot)
  });
}

export function nomeCompletoDoDia(k){
  return DIAS.filter(d => d.k === k)[0].full;
}

export function corpoEscolhaDePrato(diaK, slot){
  const atual = (Dados.cardapio[diaK] || {})[slot.id];

  return h('div', {class:'folha-corpo'},
    h('input', {
      class:'campo-entrada', type:'search', value: buscaDePrato,
      placeholder:'Buscar receita...',
      onInput: ev => {
        buscaDePrato = ev.target.value;
        /* Redesenha só a lista pra não perder o foco do campo enquanto digita */
        const alvo = document.querySelector('.lista-pratos');
        if(alvo) alvo.replaceWith(listaDePratos(diaK, slot, atual));
      }
    }),
    atual ? h('button', {class:'btn btn-suave largura-cheia', type:'button',
      onTap: () => escolherPrato(diaK, slot, null)}, 'Deixar a definir') : null,
    listaDePratos(diaK, slot, atual)
  );
}

export function listaDePratos(diaK, slot, atual){
  const termo = buscaDePrato.trim().toLowerCase();
  const lista = RECEITAS.filter(r => !termo || r.nome.toLowerCase().indexOf(termo) >= 0);

  if(!lista.length){
    return h('div', {class:'lista-pratos'}, h('p', {class:'nota'}, 'Nenhuma receita com esse nome.'));
  }

  return h('div', {class:'lista-pratos'},
    lista.map(r => {
      const n = nutriDaReceita(r);
      return h('button', {
          class:'item-prato' + (r.id === atual ? ' atual' : ''),
          type:'button',
          onTap: () => escolherPrato(diaK, slot, r.id)
        },
        h('span', {class:'item-prato-nome'}, r.nome),
        h('span', {class:'item-prato-meta'},
          numeroBR(n.kcal) + ' kcal · ' + Math.round(n.prot) + ' g prot')
      );
    })
  );
}

export function escolherPrato(diaK, slot, receitaId){
  agir(receitaId ? 'Cardápio atualizado' : 'Prato removido do cardápio', d => {
    if(!d.cardapio[diaK]) d.cardapio[diaK] = {};
    if(receitaId) d.cardapio[diaK][slot.id] = receitaId;
    else delete d.cardapio[diaK][slot.id];
  });
  fecharFolha();
}

/* ===========================================================================
   COMPRAS
   =========================================================================== */
export function comidaCompras(){
  const lista = comprasAtuais();

  if(!lista || !lista.length){
    return estadoVazio('Lista vazia',
      'A lista sai do cardápio da semana: ela soma os ingredientes de cada prato marcado e junta o que está acabando na caixa de remédios.',
      [h('button', {class:'btn btn-forte', type:'button', onTap: gerarListaDeCompras}, 'Gerar do cardápio')]);
  }

  return h('div', null,
    h('p', {class:'nota'}, 'Some os ingredientes do cardápio da semana. Toque para riscar dentro do mercado.'),
    SECOES_COMPRA.map(secao => {
      const itens = lista.filter(i => i.secao === secao);
      if(!itens.length) return null;
      return h('section', {class:'cartao'},
        rotuloSecao(secao),
        h('div', {class:'lista-compras'}, itens.map(item => linhaDeCompra(item)))
      );
    }),
    h('button', {class:'btn btn-suave largura-cheia', type:'button', onTap: gerarListaDeCompras},
      'Refazer a lista do cardápio')
  );
}

export function linhaDeCompra(item){
  return h('div', {
      class:'compra' + (item.feito ? ' feito' : ''),
      onTap: () => agir(item.nome + (item.feito ? ' de volta na lista' : ' comprado'), d => {
        const alvo = d.compras.filter(i => i.id === item.id)[0];
        if(alvo) alvo.feito = !alvo.feito;
      })
    },
    h('span', {class:'compra-circulo'}, item.feito ? icone('check', 13) : null),
    h('span', {class:'compra-nome'}, item.nome),
    h('span', {class:'compra-qtd'}, item.qtd)
  );
}

export function gerarListaDeCompras(){
  agir('Lista gerada do cardápio', d => {
    const nova = gerarCompras();
    /* Preserva o que já estava riscado, pra não perder o progresso de quem
       está no meio do mercado quando refaz a lista. */
    const antes = {};
    (d.compras || []).forEach(i => { antes[i.id] = i.feito; });
    nova.forEach(i => { if(antes[i.id]) i.feito = true; });
    d.compras = nova;
  });
}

/* ===========================================================================
   EDIÇÃO DAS REFEIÇÕES

   É aqui que o app deixa de ser "o app do Anderson". A lista de refeições é
   dado, não código: mudá-la reposiciona os blocos do calendário, redesenha as
   linhas da grade da semana e muda a tela de hoje.
   =========================================================================== */
export function edicaoDasRefeicoes(){
  const proxima = proximaRefeicaoSugerida();

  return h('div', null,
    h('p', {class:'nota'},
      'Estas refeições valem para a semana inteira. Mudar aqui reposiciona os blocos no calendário do Dia e as linhas da grade da semana.'),

    h('div', {class:'lista-edicao-refeicoes'},
      Dados.slots.map((slot, i) => h('div', {class:'cartao linha-slot'},
        h('div', {class:'linha-slot-topo'},
          h('span', {class:'slot-nome'}, slot.nome),
          h('div', {class:'linha-slot-acoes'},
            h('button', {class:'btn-renomear', type:'button', onTap: () => renomearSlot(slot)},
              icone('lapis', 13), 'Renomear'),
            h('button', {class:'btn-mini', type:'button', 'aria-label':'Subir ' + slot.nome,
              onTap: () => moverSlot(i, -1)}, icone('cima', 14)),
            h('button', {class:'btn-mini perigo', type:'button', 'aria-label':'Remover ' + slot.nome,
              onTap: () => removerSlot(slot)}, icone('fechar', 14))
          )
        ),
        h('div', {class:'linha-slot-controles'},
          h('span', {class:'campo-rotulo'}, 'Horário'),
          stepper(slot.hora, passos => agirSemAviso(d => {
            const s = d.slots.filter(x => x.id === slot.id)[0];
            s.hora = ajustarHora(s.hora, passos, 15);
            d.slots.sort((a, b) => paraMinutos(a.hora) - paraMinutos(b.hora));
          }))
        )
      ))
    ),

    h('button', {class:'adicionar-tracejado', type:'button', onTap: adicionarSlot},
      icone('mais', 15), 'Adicionar ' + proxima.nome + ' (' + proxima.hora + ')')
  );
}

export function renomearSlot(slot){
  abrirFolhaTexto({
    titulo: 'Nome da refeição',
    valor: slot.nome,
    exemplo: 'Ex.: Café reforçado',
    sugestoes: NOMES_REFEICAO,
    aoConfirmar: nome => agir('Refeição renomeada', d => {
      d.slots.filter(x => x.id === slot.id)[0].nome = nome;
    })
  });
}

export function moverSlot(indice, direcao){
  const destino = indice + direcao;
  if(destino < 0 || destino >= Dados.slots.length) return;
  agir('Ordem alterada', d => {
    const [s] = d.slots.splice(indice, 1);
    d.slots.splice(destino, 0, s);
  });
}

export function removerSlot(slot){
  agir(slot.nome + ' removido', d => {
    d.slots = d.slots.filter(x => x.id !== slot.id);
    /* Tira também o prato do cardápio: sem a refeição, ele não tem onde
       aparecer e viraria dado órfão na lista de compras. */
    DIAS.forEach(dia => { if(d.cardapio[dia.k]) delete d.cardapio[dia.k][slot.id]; });
  });
}

/** A primeira das refeições sugeridas que ainda não existe. */
export function proximaRefeicaoSugerida(){
  const usados = Dados.slots.map(s => s.nome);
  return REFEICOES_SUGERIDAS.filter(r => usados.indexOf(r.nome) < 0)[0] || REFEICOES_SUGERIDAS[0];
}

export function adicionarSlot(){
  const nova = proximaRefeicaoSugerida();
  agir(nova.nome + ' adicionada', d => {
    d.slots.push({
      id: 'slot' + Date.now().toString(36),
      nome: nova.nome, hora: nova.hora, dur: nova.dur,
      kcal: nova.kcal, prot: nova.prot
    });
    d.slots.sort((a, b) => paraMinutos(a.hora) - paraMinutos(b.hora));
  });
}
