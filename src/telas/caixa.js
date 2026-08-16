import { DIAS, COMPARTIMENTOS, DOSES, NOMES_REMEDIO_SUGERIDOS } from '../dados/modelo.js';
import { Dados, Tela, agir, agirSemAviso, avisar, definirTela } from '../nucleo/estado.js';
import { redesenhar } from '../nucleo/render.js';
import { hojeISO, diaDaSemana, semanaDe, ehFuturo } from '../nucleo/tempo.js';
import { compartimentosEmUso, remediosDoCompartimento, estadoDaCelula, DIAS_PARA_REPOR } from '../nucleo/modelo.js';
import { h, icone, cabecalhoTela, rotuloSecao, barraProgresso, estadoVazio,
         stepper, pilulaConcluir, ligarToqueLongo, consumirToqueLongo,
         abrirFolha, fecharFolha } from '../ui/index.js';

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
      editando ? [pilulaConcluir(() => definirTela({editando: Object.assign({}, Tela.editando, {caixa: false})}))] : null),
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

  const celula = h('button', {
      class:'celula-caixa ' + estado,
      type:'button',
      'aria-label': rotulo,
      'aria-pressed': String(estado === 'tomado'),
      onTap: () => {
        if(consumirToqueLongo()) return;
        alternarCompartimento(iso, comp, meds, estado);
      }
    }, estado === 'tomado' ? icone('check', 16) : null);
  ligarToqueLongo(celula, () => definirTela({
    editando: Object.assign({}, Tela.editando, {caixa: true})
  }));
  return celula;
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


/* ===========================================================================
   MODO EDIÇÃO

   Um formulário por remédio, aberto numa folha. A versão anterior ciclava
   valor por valor no próprio cartão — tocar cinco vezes no chip para chegar
   em "Noite", mais o stepper de 15 em 15 para o horário. Para uma coisa que
   se configura uma vez e quase não se mexe, o formulário é o formato certo.
   =========================================================================== */

export function caixaEmEdicao(){
  return h('div', null,
    h('p', {class:'nota'},
      'Toque num remédio para configurar compartimento, horário, dose e estoque. ' +
      'A coluna só aparece na grade quando algum remédio está usando ela.'),

    h('div', {class:'lista-edicao-remedios'},
      Dados.remedios.map(med => h('div', {class:'cartao linha-remedio tocavel',
          'aria-label': 'Configurar ' + med.nome,
          onTap: () => abrirFormularioDeRemedio(med)},
        h('div', {class:'linha-slot-topo'},
          h('span', {class:'slot-nome'}, med.nome),
          icone('seta', 16)
        ),
        h('div', {class:'linha-remedio-resumo'},
          h('span', {class:'chip-comp'}, med.compartimento),
          h('span', {class:'remedio-meta'}, med.hora + ' · ' + med.dose),
          med.diasRestantes !== undefined
            ? h('span', {class:'remedio-meta'}, 'estoque ' + med.diasRestantes + ' d')
            : null
        )
      ))
    ),

    h('button', {class:'adicionar-tracejado', type:'button', onTap: adicionarRemedio},
      icone('mais', 15), 'Adicionar remédio'),

    Dados.remedios.length
      ? h('p', {class:'nota'},
          'O estoque é quantos dias ainda dá para tomar. Ele não é descontado ' +
          'sozinho: atualize ao comprar uma caixa nova. Abaixo de ' +
          DIAS_PARA_REPOR + ' dias, o remédio entra na lista de compras.')
      : null
  );
}

export function acharRemedio(dados, id){
  return dados.remedios.filter(m => m.id === id)[0];
}

/* Rascunho do remédio em edição. Fora do estado: some ao fechar a folha. */
let rascunhoRemedio = null;

function abrirFormularioDeRemedio(med){
  rascunhoRemedio = {
    id: med.id,
    nome: med.nome,
    compartimento: med.compartimento,
    hora: med.hora,
    dose: med.dose,
    diasRestantes: med.diasRestantes === undefined ? 30 : med.diasRestantes
  };
  abrirFolha({
    titulo: 'Remédio',
    rotuloConfirmar: 'Salvar',
    corpo: corpoDoFormulario,
    confirmar: salvarRemedio
  });
}

function corpoDoFormulario(){
  const r = rascunhoRemedio;
  return h('div', {class:'folha-corpo'},
    h('label', {class:'campo'},
      h('span', {class:'campo-rotulo'}, 'Nome'),
      h('input', {class:'campo-entrada', type:'text', value: r.nome, maxlength:'40',
        placeholder:'Ex.: Losartana 50 mg',
        onInput: ev => { r.nome = ev.target.value; }})
    ),
    h('div', {class:'sugestoes'},
      NOMES_REMEDIO_SUGERIDOS.map(n => h('button', {class:'sugestao', type:'button',
        onTap: () => { r.nome = n; redesenhar(); }}, n))
    ),

    h('div', {class:'campo'},
      h('span', {class:'campo-rotulo'}, 'Compartimento'),
      h('div', {class:'chips-categoria'},
        COMPARTIMENTOS.map(c => h('button', {
          class:'chip-cat' + (r.compartimento === c ? ' ativo' : ''),
          type:'button',
          onTap: () => { r.compartimento = c; redesenhar(); }
        }, c)))
    ),

    h('div', {class:'campo-duplo'},
      h('label', {class:'campo'},
        h('span', {class:'campo-rotulo'}, 'Horário'),
        h('input', {class:'campo-entrada campo-hora', type:'time', step:'300', value: r.hora,
          onInput: ev => { r.hora = ev.target.value; }})
      ),
      h('div', {class:'campo'},
        h('span', {class:'campo-rotulo'}, 'Estoque (dias)'),
        stepper(String(r.diasRestantes), passos => {
          r.diasRestantes = Math.max(0, r.diasRestantes + passos * 5);
          redesenhar();
        })
      )
    ),

    h('div', {class:'campo'},
      h('span', {class:'campo-rotulo'}, 'Dose'),
      h('div', {class:'chips-categoria'},
        DOSES.map(d => h('button', {
          class:'chip-cat' + (r.dose === d ? ' ativo' : ''),
          type:'button',
          onTap: () => { r.dose = d; redesenhar(); }
        }, d)))
    ),

    h('button', {class:'btn btn-contorno-perigo largura-cheia', type:'button',
      onTap: () => removerRemedio(r)}, 'Remover este remédio')
  );
}

function salvarRemedio(){
  const r = rascunhoRemedio;
  const nome = (r.nome || '').trim();
  if(!nome){ avisar('O nome não pode ficar vazio'); return; }
  agir(nome + ' salvo', d => {
    const m = acharRemedio(d, r.id);
    if(!m) return;
    m.nome = nome;
    m.compartimento = r.compartimento;
    m.hora = r.hora;
    m.dose = r.dose;
    m.diasRestantes = r.diasRestantes;
  });
  fecharFolha();
}

function removerRemedio(med){
  agir(med.nome + ' removido', d => {
    d.remedios = d.remedios.filter(m => m.id !== med.id);
  });
  fecharFolha();
}

function adicionarRemedio(){
  const id = 'm' + Date.now().toString(36);
  agirSemAviso(d => {
    d.remedios.push({
      id: id, nome: 'Novo remédio', compartimento: 'Manhã',
      hora: '07:00', dose: DOSES[0], diasRestantes: 30
    });
  });
  /* Abre o formulário já preenchido: um remédio chamado "Novo remédio" na
     lista não serve pra nada até ser configurado. */
  abrirFormularioDeRemedio(Dados.remedios[Dados.remedios.length - 1]);
}
