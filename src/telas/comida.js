import { DIAS, NOMES_REFEICAO, REFEICOES_SUGERIDAS } from '../dados/modelo.js';
import { ALIMENTOS } from '../dados/receitas.js';
import { Dados, Tela, agir, agirSemAviso, definirTela } from '../nucleo/estado.js';
import { diaDaSemana, semanaDe, dataCurta, paraMinutos } from '../nucleo/tempo.js';
import { pratoDe, pratosDe, nutriDaReceita, totaisDoDia, refeicaoFeita, gerarCompras,
         comprasAtuais, SECOES_COMPRA, horaDaRefeicaoNoDia,
         receitas, ehLote } from '../nucleo/modelo.js';
import { h, icone, cabecalhoTela, rotuloSecao, barraProgresso, estadoVazio,
         numeroBR, abrirFolha, fecharFolha, abrirFolhaTexto, confirmarRemocao,
         botaoFlutuante, pilulaConcluir, ligarToqueLongo,
         consumirToqueLongo } from '../ui/index.js';
import { abrirReceita, criarReceita } from './receita.js';

/* ===========================================================================
   TELA 4 — COMIDA

   Três abas sobre os mesmos dados:
     HOJE     o que comer agora, marcado por refeição.
     SEMANA   a grade do cardápio e a escolha de prato por refeição.
     COMPRAS  a lista derivada do cardápio, agrupada por onde se compra.
     RECEITAS o banco de pratos: o que tem dentro, como se faz, e quais são
              cozidos em lote. Era conteúdo escrito e nunca mostrado.

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
      : Tela.abaComida === 'hoje'     ? comidaHoje(iso)
      : Tela.abaComida === 'semana'   ? comidaSemana(iso)
      : Tela.abaComida === 'receitas' ? comidaReceitas()
      :                                 comidaCompras(),
    !editando && Tela.abaComida === 'receitas'
      ? botaoFlutuante('Nova receita', criarReceita, {classe: 'salvia'})
      : null
  );
}

export function segmentado(){
  const abas = [['hoje','Hoje'], ['semana','Semana'],
                ['receitas','Receitas'], ['compras','Compras']];
  return h('div', {class:'segmentado segmentado-comida'},
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
    ),
    /* O caminho até o modo de preparo. Esta é a tela em que se lê "o que eu
       vou comer agora", e era daqui que faltava chegar em "como se faz" — o
       jeito antigo passava pela aba Semana e por dois toques a mais.

       Botão separado porque o toque na LINHA marca a refeição como feita, e
       dois significados no mesmo alvo é como se erra os dois. */
    h('button', {class:'refeicao-receita', type:'button',
      'aria-label': 'Ver a receita de ' + prato.nome,
      onTap: ev => { ev.stopPropagation(); abrirReceita(prato.ids ? prato.ids[0] : prato.id); }},
      icone('seta', 15))
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

        /* Uma linha por refeição. A célula É o controle: tocar leva ao dia e
           abre a escolha do prato daquela refeição. Ela já parecia tocável e
           não era — a edição ficava escondida na lista abaixo, e quem tentava
           o caminho óbvio não conseguia nada. */
        Dados.slots.map(slot => [
          h('div', {class:'grade-rotulo'}, slot.nome),
          DIAS.map((d, i) => {
            const prato = pratoDe(d.k, slot.id);
            return h('button', {
                class:'celula-cardapio' + (prato ? ' definido' : ' a-definir') +
                      (datas[i] === iso ? ' selecionado' : ''),
                type:'button',
                'aria-label': d.full + ', ' + slot.nome + ': ' +
                              (prato ? prato.nome : 'a definir') + '. Toque para escolher.',
                onTap: () => {
                  definirTela({data: datas[i]});
                  abrirEscolhaDePrato(d.k, slot);
                }
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

/* A escolha é MÚLTIPLA: um almoço é frango com batata-doce E arroz do lote.
   Aceitar um prato só não era simplificação de tela — era a lista de compras
   pedindo menos arroz do que a semana consome. A folha não fecha a cada
   toque, porque montar um prato composto são vários toques seguidos. */
export function corpoEscolhaDePrato(diaK, slot){
  return h('div', {class:'folha-corpo'},
    h('input', {
      class:'campo-entrada', type:'search', value: buscaDePrato,
      placeholder:'Buscar por nome ou ingrediente...',
      onInput: ev => {
        buscaDePrato = ev.target.value;
        /* Redesenha só a lista pra não perder o foco do campo enquanto digita */
        const alvo = document.querySelector('.lista-pratos');
        if(alvo) alvo.replaceWith(listaDePratos(diaK, slot));
      }
    }),
    resumoDaEscolha(diaK, slot),
    listaDePratos(diaK, slot),
    /* A folha não fecha sozinha ao escolher, então precisa de uma saída
       explícita — puxar a alça também fecha, mas nem todo mundo descobre. */
    h('button', {class:'btn btn-forte largura-cheia', type:'button',
      onTap: fecharFolha}, 'Pronto')
  );
}

function resumoDaEscolha(diaK, slot){
  const escolhidos = pratosDe(diaK, slot.id);
  if(!escolhidos.length){
    return h('p', {class:'nota'}, 'Nada escolhido ainda. Toque em quantos pratos a refeição tiver.');
  }
  const prato = pratoDe(diaK, slot.id);
  return h('div', null,
    h('p', {class:'nota destaque'},
      escolhidos.map(r => r.nome).join(' + ') + ' · ' +
      numeroBR(prato.kcal) + ' kcal · ' + prato.prot + ' g prot'),
    /* Atalho para a ficha de cada prato escolhido: é de dentro dela que se
       vê o preparo e se liga a preparação em lote. */
    h('div', {class:'sugestoes'},
      escolhidos.map(r => h('button', {class:'sugestao', type:'button',
        onTap: () => { fecharFolha(); abrirReceita(r.id); }}, 'Ver ' + r.nome))
    ),
    h('button', {class:'btn btn-suave largura-cheia', type:'button',
      onTap: () => limparPratos(diaK, slot)}, 'Deixar a definir')
  );
}

/**
 * A categoria que uma refeição provavelmente quer.
 *
 * Escolher o café da manhã numa lista que abre com onze pratos principais é
 * procurar antes de escolher. O slot não guarda categoria — e criar um campo
 * para isso obrigaria a preenchê-lo — então o NOME responde, que é o que a
 * pessoa escreveu ali justamente para dizer o que aquela refeição é.
 *
 * Errar aqui não custa nada: a lista continua inteira, só muda a ordem.
 */
function categoriaProvavel(slot){
  const nome = (slot.nome || '').toLowerCase();
  if(/caf[ée]|desjejum|manh[ãa]/.test(nome)) return 'cafe';
  if(/lanche|merenda|ceia|p[óo]s|pr[ée]/.test(nome)) return 'lanche';
  if(/almo|jantar|janta|marmita/.test(nome)) return 'principal';
  return null;
}

export function listaDePratos(diaK, slot){
  const termo = buscaDePrato.trim().toLowerCase();
  const escolhidos = pratosDe(diaK, slot.id).map(r => r.id);
  const preferida = categoriaProvavel(slot);

  const lista = receitas().filter(r => !termo ||
    r.nome.toLowerCase().indexOf(termo) >= 0 ||
    (r.ingr || []).some(([id]) => ALIMENTOS[id] &&
      ALIMENTOS[id].nome.toLowerCase().indexOf(termo) >= 0));

  /* Ordem: o que já está escolhido, depois a categoria da refeição, depois o
     resto. Sem reordenar durante a busca — quem digitou já disse o que quer. */
  const peso = r => {
    if(escolhidos.indexOf(r.id) >= 0) return 0;
    if(!termo && preferida && (r.cat || 'principal') === preferida) return 1;
    return 2;
  };
  const ordenada = lista.slice().sort((a, b) => peso(a) - peso(b));

  if(!ordenada.length){
    return h('div', {class:'lista-pratos'},
      h('p', {class:'nota'}, 'Nenhuma receita com esse nome ou ingrediente.'));
  }

  return h('div', {class:'lista-pratos'},
    ordenada.map((r, i) => {
      const n = nutriDaReceita(r);
      const dentro = escolhidos.indexOf(r.id) >= 0;
      /* Uma linha separando o que combina com a refeição do resto, para a
         ordem não parecer arbitrária. */
      const primeiroDoResto = !termo && preferida && peso(r) === 2 &&
                              i > 0 && peso(ordenada[i - 1]) < 2;
      return [
        primeiroDoResto ? h('div', {class:'divisor-pratos'}, 'Outras receitas') : null,
        h('button', {
            class:'item-prato' + (dentro ? ' atual' : ''),
            type:'button',
            'aria-pressed': String(dentro),
            onTap: () => alternarPrato(diaK, slot, r.id)
          },
          h('span', {class:'item-prato-nome'}, r.nome),
          h('span', {class:'item-prato-meta'},
            numeroBR(n.kcal) + ' kcal · ' + Math.round(n.prot) + ' g prot'),
          dentro ? h('span', {class:'item-prato-marca'}, icone('check', 14)) : null
        )
      ];
    })
  );
}

/** Põe ou tira uma receita da refeição, sem fechar a folha. */
export function alternarPrato(diaK, slot, receitaId){
  const dentro = pratosDe(diaK, slot.id).some(r => r.id === receitaId);
  agirSemAviso(d => {
    if(!d.cardapio[diaK]) d.cardapio[diaK] = {};
    const atual = d.cardapio[diaK][slot.id];
    const ids = Array.isArray(atual) ? atual.slice() : (atual ? [atual] : []);
    const i = ids.indexOf(receitaId);
    if(i >= 0) ids.splice(i, 1);
    else ids.push(receitaId);
    if(ids.length) d.cardapio[diaK][slot.id] = ids;
    else delete d.cardapio[diaK][slot.id];
  });
  return dentro;
}

export function limparPratos(diaK, slot){
  agirSemAviso(d => {
    if(d.cardapio[diaK]) delete d.cardapio[diaK][slot.id];
  });
}

/* ===========================================================================
   RECEITAS

   O banco de pratos, que até aqui só existia no arquivo-fonte. Cada receita
   tinha modo de preparo, tempo, rendimento e uma dica de conservação escrita
   à mão — e o app mostrava o nome e as calorias.

   A lista é agrupada por categoria porque é assim que se procura: ninguém
   pensa "quero a receita nº 14", pensa "o que eu faço de café da manhã".
   =========================================================================== */

const ORDEM_CATEGORIA = [
  ['cafe', 'Café da manhã'], ['lanche', 'Lanches'],
  ['principal', 'Pratos principais'], ['base', 'Bases']
];

/* Busca da aba Receitas. Fora do estado persistido: some ao sair. */
let buscaDeReceita = '';

export function comidaReceitas(){
  const todas = receitas();
  const emUso = {};
  DIAS.forEach(d => Object.keys(Dados.cardapio[d.k] || {}).forEach(slotId => {
    pratosDe(d.k, slotId).forEach(r => { emUso[r.id] = (emUso[r.id] || 0) + 1; });
  }));

  if(!todas.length){
    return estadoVazio('Sem receitas', 'Toque no + para escrever a primeira.');
  }

  const termo = buscaDeReceita.trim().toLowerCase();
  const combina = r => !termo ||
    r.nome.toLowerCase().indexOf(termo) >= 0 ||
    /* Procurar por ingrediente é metade do uso real: "o que eu faço com o
       frango que está na geladeira?" não é uma pergunta sobre o NOME. */
    (r.ingr || []).some(([id]) => ALIMENTOS[id] &&
      ALIMENTOS[id].nome.toLowerCase().indexOf(termo) >= 0);

  const filtradas = todas.filter(combina);

  return h('div', null,
    h('input', {
      class:'campo-entrada', type:'search', value: buscaDeReceita,
      placeholder:'Buscar por nome ou ingrediente...',
      'aria-label':'Buscar receita',
      onInput: ev => {
        buscaDeReceita = ev.target.value;
        /* Só a lista é refeita: redesenhar a tela inteira tiraria o foco do
           campo a cada letra digitada. */
        const alvo = document.querySelector('.lista-de-receitas');
        if(alvo) alvo.replaceWith(gruposDeReceitas(filtrarAgora(), emUso));
      }
    }),

    termo
      ? h('p', {class:'nota'},
          filtradas.length
            ? filtradas.length + (filtradas.length > 1 ? ' receitas' : ' receita') + ' com "' + buscaDeReceita.trim() + '"'
            : 'Nenhuma receita com "' + buscaDeReceita.trim() + '".')
      : h('p', {class:'nota'},
          'Toque numa receita para ver os ingredientes, o modo de preparo e ' +
          'ligar a preparação em lote.'),

    gruposDeReceitas(filtradas, emUso)
  );
}

/* Refaz o filtro na hora do redesenho parcial, sem depender do fechamento. */
function filtrarAgora(){
  const termo = buscaDeReceita.trim().toLowerCase();
  return receitas().filter(r => !termo ||
    r.nome.toLowerCase().indexOf(termo) >= 0 ||
    (r.ingr || []).some(([id]) => ALIMENTOS[id] &&
      ALIMENTOS[id].nome.toLowerCase().indexOf(termo) >= 0));
}

function gruposDeReceitas(lista, emUso){
  const conhecidas = ORDEM_CATEGORIA.map(([c]) => c);
  const sobra = lista.filter(r => conhecidas.indexOf(r.cat || 'principal') < 0);

  return h('div', {class:'lista-de-receitas'},
    ORDEM_CATEGORIA.map(([cat, titulo]) => {
      const doGrupo = lista.filter(r => (r.cat || 'principal') === cat);
      if(!doGrupo.length) return null;
      return h('section', {class:'cartao'},
        rotuloSecao(titulo),
        h('div', {class:'lista-receitas'},
          doGrupo.map(r => linhaDeReceita(r, emUso[r.id] || 0)))
      );
    }),
    /* Categoria fora da lista acima não pode sumir da tela. */
    sobra.length
      ? h('section', {class:'cartao'},
          rotuloSecao('Outras'),
          h('div', {class:'lista-receitas'}, sobra.map(r => linhaDeReceita(r, emUso[r.id] || 0))))
      : null
  );
}

function linhaDeReceita(r, vezes){
  const n = nutriDaReceita(r);
  return h('button', {class:'linha-receita', type:'button',
      'aria-label':'Abrir ' + r.nome, onTap: () => abrirReceita(r.id)},
    h('div', {class:'linha-receita-texto'},
      h('div', {class:'linha-receita-nome'}, r.nome),
      h('div', {class:'linha-receita-meta'},
        r.tempo + ' min · ' + numeroBR(n.kcal) + ' kcal · ' +
        Math.round(n.prot) + ' g prot' +
        (r.porcoes > 1 ? ' · rende ' + r.porcoes : ''))
    ),
    h('div', {class:'linha-receita-marcas'},
      ehLote(r) ? h('span', {class:'chip-lote'}, 'lote') : null,
      vezes ? h('span', {class:'chip-uso'}, vezes + '×') : null
    ),
    icone('seta', 15)
  );
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
    h('div', {class:'compra-texto'},
      h('span', {class:'compra-nome'}, item.nome),
      /* O que se pega na prateleira, quando o banco de alimentos sabe. */
      item.embalagem ? h('span', {class:'compra-embalagem'}, item.embalagem) : null
    ),
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
        /* Seletor nativo do aparelho, como no bloco do Dia e no remédio. O
           stepper que estava aqui andava de 15 em 15 minutos, então um café
           das 06:45 simplesmente não existia — e era o último lugar do app
           preso a esse passo. */
        h('label', {class:'linha-slot-controles'},
          h('span', {class:'campo-rotulo'}, 'Horário'),
          h('input', {
            class:'campo-entrada campo-hora campo-hora-slot', type:'time', step:'300',
            value: slot.hora,
            'aria-label': 'Horário de ' + slot.nome,
            onChange: ev => {
              const valor = ev.target.value;
              if(!valor) return;
              agirSemAviso(d => {
                d.slots.filter(x => x.id === slot.id)[0].hora = valor;
                d.slots.sort((a, b) => paraMinutos(a.hora) - paraMinutos(b.hora));
              });
            }
          })
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
  const comPrato = DIAS.filter(dia => (Dados.cardapio[dia.k] || {})[slot.id]).length;
  confirmarRemocao({
    titulo: 'Remover ' + slot.nome + '?',
    texto: 'A refeição sai da semana inteira e some do calendário todos os dias.',
    detalhe: comPrato
      ? 'Os pratos escolhidos para ela em ' + comPrato +
        (comPrato > 1 ? ' dias' : ' dia') + ' saem junto, e com eles o que pediam na lista de compras.'
      : 'Nenhum prato está escolhido para ela.',
    aoConfirmar: () => agir(slot.nome + ' removido', d => {
      d.slots = d.slots.filter(x => x.id !== slot.id);
      /* Tira também o prato do cardápio: sem a refeição, ele não tem onde
         aparecer e viraria dado órfão na lista de compras. */
      DIAS.forEach(dia => { if(d.cardapio[dia.k]) delete d.cardapio[dia.k][slot.id]; });
    })
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
