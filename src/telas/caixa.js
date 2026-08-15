import { DIAS, COMPARTIMENTOS, DOSES } from '../dados/modelo.js';
import { Dados, Tela, agir, agirSemAviso, avisar, definirTela } from '../nucleo/estado.js';
import { hojeISO, diaDaSemana, semanaDe, ehFuturo } from '../nucleo/tempo.js';
import { compartimentosEmUso, remediosDoCompartimento, estadoDaCelula, DIAS_PARA_REPOR } from '../nucleo/modelo.js';
import { h, icone, cabecalhoTela, pilula, rotuloSecao, barraProgresso, estadoVazio,
         stepper, ajustarHora, proximoDaLista } from '../ui/index.js';

/* ===========================================================================
   TELA 5 — CAIXA DE REMÉDIOS

   A grade imita a caixinha física: linhas são os dias da semana, colunas são
   os compartimentos. Cada quadrado é uma dose.

   Detalhe que faz a tela parecer a caixa DA PESSOA e não um formulário: as
   colunas são só os compartimentos em uso. Ninguém toma nada à noite, a
   coluna Noite não existe. Ela aparece sozinha no instante em que um remédio
   é movido pra lá.
   =========================================================================== */

export function telaCaixa(){
  const editando = Tela.editando.caixa;
  return h('div', {class:'tela tela-caixa'},
    cabecalhoTela(null, 'Caixa', null,
      [pilula(editando ? 'Concluir' : 'Editar',
              () => definirTela({editando: Object.assign({}, Tela.editando, {caixa: !editando})}),
              {ativa: editando})]),
    editando ? caixaEmEdicao() : caixaEmLeitura()
  );
}

/* --- Modo leitura --------------------------------------------------------- */
export function caixaEmLeitura(){
  const comps = compartimentosEmUso();

  if(!comps.length){
    return estadoVazio('Caixa vazia',
      'Nenhum remédio ou suplemento cadastrado. Toque em Editar para montar a sua caixa.',
      [h('button', {class:'btn btn-forte', type:'button',
        onTap: () => definirTela({editando: Object.assign({}, Tela.editando, {caixa: true})})},
        'Montar a caixa')]);
  }

  return h('div', null,
    h('p', {class:'nota'},
      'Cada quadrado é uma dose. Toque para marcar que tomou; toque de novo para desmarcar.'),
    gradeDaCaixa(comps),
    legendaDaCaixa(),
    h('section', {class:'cartao'},
      rotuloSecao('O que vai em cada compartimento'),
      h('div', {class:'lista-remedios'},
        Dados.remedios.map(m => h('div', {class:'remedio remedio-info'},
          h('span', {class:'remedio-comp'}, m.compartimento),
          h('span', {class:'remedio-nome'}, m.nome),
          h('span', {class:'remedio-meta'}, m.dose)
        ))
      )
    ),
    cartaoDeEstoque()
  );
}

export function gradeDaCaixa(comps){
  const semana = semanaDe(Tela.data);
  const hoje = hojeISO();

  return h('div', {class:'grade-caixa', style:'--colunas:' + comps.length},
    h('div', {class:'grade-canto'}),
    comps.map(c => h('div', {class:'grade-cabecalho'}, c)),

    DIAS.map((dia, i) => {
      const iso = semana[i];
      return [
        h('div', {class:'caixa-dia' + (iso === hoje ? ' hoje' : '')}, dia.k),
        comps.map(comp => celulaDaCaixa(iso, comp))
      ];
    })
  );
}

export function celulaDaCaixa(iso, comp){
  const estado = estadoDaCelula(iso, comp);
  const meds = remediosDoCompartimento(comp);
  const rotulo = diaDaSemana(iso).full + ', ' + comp + ': ' + meds.map(m => m.nome).join(', ');

  /* Compartimento vazio e dia futuro não são tocáveis: um não tem o que
     marcar, o outro não aconteceu. */
  if(estado === 'vazio' || estado === 'futuro'){
    return h('div', {class:'celula-caixa ' + estado, 'aria-hidden':'true'});
  }

  return h('button', {
      class:'celula-caixa ' + estado,
      type:'button',
      'aria-label': rotulo,
      'aria-pressed': String(estado === 'tomado'),
      onTap: () => alternarCompartimento(iso, comp, meds, estado)
    }, estado === 'tomado' ? icone('check', 16) : null);
}

export function alternarCompartimento(iso, comp, meds, estado){
  if(ehFuturo(iso)){ avisar('Dia futuro — marque no dia'); return; }
  const marcando = estado !== 'tomado';
  agir(comp + (marcando ? ' tomado' : ' desmarcado'), d => {
    meds.forEach(m => { d.tomados[iso + ':' + m.id] = marcando; });
  });
}

export function legendaDaCaixa(){
  const itens = [
    ['tomado', 'tomado'],
    ['a-tomar', 'a tomar hoje'],
    ['nao-tomado', 'não tomado'],
    ['futuro', 'ainda vem']
  ];
  return h('div', {class:'legenda-caixa'},
    itens.map(([classe, rotulo]) =>
      h('span', null, h('i', {class:'amostra-caixa ' + classe}), rotulo))
  );
}

export function cartaoDeEstoque(){
  const comEstoque = Dados.remedios.filter(m => m.diasRestantes !== undefined);
  if(!comEstoque.length) return null;

  /* A barra mostra quanto resta de um mês cheio — dá pra comparar os frascos
     entre si de relance. */
  const HORIZONTE = 30;

  return h('section', {class:'cartao'},
    rotuloSecao('Estoque'),
    h('div', {class:'lista-estoque'},
      comEstoque.map(m => {
        const acabando = m.diasRestantes <= DIAS_PARA_REPOR;
        return h('div', {class:'estoque' + (acabando ? ' acabando' : '')},
          h('div', {class:'estoque-topo'},
            h('span', {class:'estoque-nome'}, m.nome),
            h('span', {class:'estoque-dias'},
              m.diasRestantes + (m.diasRestantes === 1 ? ' dia' : ' dias'))
          ),
          barraProgresso(m.diasRestantes / HORIZONTE, acabando ? 'barra-alerta' : 'barra-salvia'),
          acabando ? h('div', {class:'estoque-aviso'}, 'Repor esta semana') : null
        );
      })
    )
  );
}

/* --- Modo edição ---------------------------------------------------------- */
export function caixaEmEdicao(){
  return h('div', null,
    h('p', {class:'nota'},
      'Toque no compartimento para mover o remédio entre manhã, almoço, tarde e noite. A coluna só aparece na grade quando alguém está usando ela.'),

    h('div', {class:'lista-edicao-remedios'},
      Dados.remedios.map(med => h('div', {class:'cartao linha-remedio'},
        h('div', {class:'linha-slot-topo'},
          h('span', {class:'slot-nome'}, med.nome),
          h('div', {class:'linha-slot-acoes'},
            h('button', {class:'btn-renomear', type:'button', onTap: () => renomearRemedio(med)},
              icone('lapis', 13), 'Renomear'),
            h('button', {class:'btn-mini perigo', type:'button', 'aria-label':'Remover ' + med.nome,
              onTap: () => removerRemedio(med)}, icone('fechar', 14))
          )
        ),
        h('div', {class:'linha-remedio-controles'},
          h('button', {class:'chip-comp', type:'button',
            onTap: () => ciclarCompartimento(med)}, med.compartimento),
          stepper(med.hora, passos => agirSemAviso(d => {
            const m = acharRemedio(d, med.id);
            m.hora = ajustarHora(m.hora, passos, 15);
          })),
          h('button', {class:'chip-dose', type:'button',
            onTap: () => ciclarDose(med)}, med.dose)
        )
      ))
    ),

    h('button', {class:'adicionar-tracejado', type:'button', onTap: adicionarRemedio},
      icone('mais', 15), 'Adicionar remédio')
  );
}

export function acharRemedio(dados, id){ return dados.remedios.filter(m => m.id === id)[0]; }

export function renomearRemedio(med){
  const NOMES = ['Vitamina D', 'Ômega 3', 'Multivitamínico', 'Magnésio', 'Creatina',
                 'Vitamina B12', 'Vitamina C', 'Zinco', 'Colágeno'];
  agir('Remédio renomeado', d => {
    const m = acharRemedio(d, med.id);
    m.nome = proximoDaLista(NOMES, m.nome);
  });
}

export function ciclarCompartimento(med){
  agir(med.nome + ' movido', d => {
    const m = acharRemedio(d, med.id);
    m.compartimento = proximoDaLista(COMPARTIMENTOS, m.compartimento);
  });
}

export function ciclarDose(med){
  agir('Dose alterada', d => {
    const m = acharRemedio(d, med.id);
    m.dose = proximoDaLista(DOSES, m.dose);
  });
}

export function removerRemedio(med){
  agir(med.nome + ' removido', d => {
    d.remedios = d.remedios.filter(m => m.id !== med.id);
  });
}

export function adicionarRemedio(){
  agir('Remédio adicionado', d => {
    d.remedios.push({
      id: 'm' + Date.now().toString(36),
      nome: 'Novo remédio',
      compartimento: 'Manhã',
      hora: '07:00',
      dose: '1 cáps.',
      diasRestantes: 30
    });
  });
}
