import { DIAS, CATEGORIAS, TITULOS_SUGERIDOS, MESES } from '../dados/modelo.js';
import { Dados, Tela, agir, agirSemAviso, avisar, definirTela, salvarDados } from '../nucleo/estado.js';
import { redesenhar } from '../nucleo/render.js';
import { hojeISO, deISO, diaDaSemana, semanaDe, dataCurta, ehHoje, ehPassado,
         paraMinutos, paraHora, rotuloDuracao } from '../nucleo/tempo.js';
import { blocosDoDia, blocoAtual, ordenarPorHora, materializar, statusDoBloco, proximoStatus,
         ehSomenteLeitura, treinoDoDia, corDaCategoria } from '../nucleo/modelo.js';
import { h, icone, cabecalhoTela, pilula, pilulaConcluir, estadoVazio,
         abrirFolha, fecharFolha, ligarToqueLongo, consumirToqueLongo } from '../ui/index.js';
import { avisoDeAtraso } from './extras.js';

/* ===========================================================================
   TELA 2 — DIA

   Duas visões e dois modos, sobre a mesma lista de blocos.

   VISÕES   AGENDA  a altura de cada bloco é proporcional à duração, então o
                    dia tem a forma que ele realmente tem: 8 h de sono ocupam
                    8 h de tela. É a visão para enxergar o dia.
            LISTA   tudo com a mesma altura, mais denso. É a visão para marcar.

   MODOS    LEITURA toque cicla a marcação (sem marca → feito → atrasei → pulei)
            EDIÇÃO  arrastar move, a alça de baixo muda a duração, e tocar
                    abre o editor com horário de início e fim.

   Não há botão "Editar": segurar qualquer bloco entra no modo de edição, e só
   então aparece o "Concluir".
   =========================================================================== */

const PX_POR_MINUTO_ARRASTE = 1.1;   // sensibilidade do arraste
const PASSO_MINUTOS = 5;             // o arraste encaixa de 5 em 5

/* Escala da visão agenda. Um minuto vale menos de um pixel, senão um dia
   inteiro daria 1440 px de rolagem só de sono. */
const PX_POR_MINUTO_AGENDA = 0.42;
const ALTURA_MINIMA_AGENDA = 46;

export function telaDia(){
  const iso = Tela.data;
  const editando = Tela.editando.dia;
  const soLeitura = ehSomenteLeitura(iso);

  return h('div', {class:'tela tela-dia'},
    cabecalhoTela(
      null,
      MESES[deISO(iso).getMonth()].replace(/^./, c => c.toUpperCase()),
      null,
      [
        !ehHoje(iso) ? pilula('Hoje', () => definirTela({data: hojeISO()})) : null,
        editando ? pilulaConcluir(() => sairDaEdicao()) : null
      ]
    ),
    faixaDaSemana(iso),
    cabecalhoDoDia(iso),
    ehHoje(iso) && !editando ? avisoDeAtraso(iso) : null,
    seletorDeVisao(editando),
    editando
      ? h('p', {class:'dica-edicao'}, 'Arraste para mover · a alça de baixo para durar · toque para os horários')
      : null,
    listaDeBlocos(iso, editando, soLeitura),
    !editando ? botaoFlutuante(iso) : null
  );
}

function sairDaEdicao(){
  definirTela({editando: Object.assign({}, Tela.editando, {dia: false})});
}

function entrarNaEdicao(soLeitura){
  if(soLeitura){ avisar('Reabra o dia para editar'); return; }
  definirTela({editando: Object.assign({}, Tela.editando, {dia: true})});
}

/* --- Alternador de visão --------------------------------------------------
   Some no modo de edição: lá a altura já é o controle de duração, e ter duas
   escalas ao mesmo tempo confundiria o gesto. */
function seletorDeVisao(editando){
  if(editando) return null;
  const opcoes = [['agenda', 'Agenda'], ['lista', 'Lista']];
  return h('div', {class:'segmentado segmentado-visao'},
    opcoes.map(([id, rotulo]) => h('button', {
        class:'segmento' + (Tela.visaoDia === id ? ' ativo' : ''),
        type:'button',
        'aria-pressed': String(Tela.visaoDia === id),
        onTap: () => definirTela({visaoDia: id})
      }, rotulo))
  );
}

/* --- Faixa da semana ------------------------------------------------------ */
function faixaDaSemana(iso){
  const hoje = hojeISO();
  return h('div', {class:'faixa-semana'},
    semanaDe(iso).map((d, i) => {
      const dia = DIAS[i];
      const selecionado = d === iso;
      const temTreino = !!treinoDoDia(dia.k);
      const fimDeSemana = dia.k === 'Sáb' || dia.k === 'Dom';
      const corPonto = temTreino ? 'ponto-treino' : (fimDeSemana ? 'ponto-fds' : 'ponto-util');
      return h('button', {
          class: 'dia-faixa' + (selecionado ? ' selecionado' : '') + (d === hoje ? ' hoje' : ''),
          type: 'button',
          'aria-pressed': String(selecionado),
          'aria-label': dia.full + ', ' + dataCurta(d),
          onTap: () => definirTela({data: d})
        },
        h('span', {class:'dia-letra'}, dia.letra),
        h('span', {class:'dia-numero'}, deISO(d).getDate()),
        h('span', {class:'dia-ponto ' + corPonto})
      );
    })
  );
}

/* --- Cabeçalho do dia ----------------------------------------------------- */
function cabecalhoDoDia(iso){
  const dia = diaDaSemana(iso);
  const soLeitura = ehSomenteLeitura(iso);
  const reaberto = !!Dados.reabertos[iso];

  let rotulo, nota = null, acao = null;
  if(soLeitura){
    rotulo = 'Reabrir';
    nota = 'Dia encerrado — só leitura. Toque em Reabrir para corrigir marcações.';
    acao = () => agir('Dia reaberto', d => { d.reabertos[iso] = true; });
  } else if(ehPassado(iso) && reaberto){
    rotulo = 'Reaberto';
  } else if(ehHoje(iso)){
    rotulo = 'toque para marcar · segure para editar';
  } else {
    rotulo = 'Previsto';
    nota = 'Previsto. Ajuste agora e o dia chega pronto.';
  }

  return h('div', {class:'cabecalho-dia'},
    h('div', {class:'cabecalho-dia-linha'},
      h('div', null,
        h('span', {class:'dia-data'}, dataCurta(iso)),
        h('span', {class:'dia-nome'}, dia.full)
      ),
      acao
        ? h('button', {class:'rotulo-estado acionavel', type:'button', onTap: acao}, rotulo)
        : h('span', {class:'rotulo-estado'}, rotulo)
    ),
    nota ? h('p', {class:'nota'}, nota) : null
  );
}

/* ===========================================================================
   A LISTA

   Uma função só desenha as duas visões e os dois modos. O que muda é a altura
   do bloco e o que o toque faz — a estrutura é a mesma, e é por isso que os
   dois modos parecem o mesmo lugar em vez de duas telas diferentes.
   =========================================================================== */

function listaDeBlocos(iso, editando, soLeitura){
  const blocos = blocosDoDia(iso);
  const atual = blocoAtual(iso);
  const agenda = Tela.visaoDia === 'agenda' || editando;

  if(!blocos.length){
    return estadoVazio('Dia vazio',
      'Nenhum bloco previsto. Toque no + para começar a montar este dia.');
  }

  const lista = h('div', {class:'lista-blocos' + (agenda ? ' visao-agenda' : '') +
                                 (editando ? ' em-edicao' : '')},
    blocos.map(bloco => desenharBloco(iso, bloco, {
      atual: atual, editando: editando, soLeitura: soLeitura, agenda: agenda
    })),
    editando
      ? h('button', {class:'adicionar-tracejado', type:'button', onTap: () => abrirFolhaNovoBloco(iso)},
          icone('mais', 15), 'Adicionar bloco')
      : null
  );
  return lista;
}

function alturaDoBloco(bloco, agenda){
  if(!agenda) return null;
  return Math.max(ALTURA_MINIMA_AGENDA, Math.round(bloco.dur * PX_POR_MINUTO_AGENDA));
}

function desenharBloco(iso, bloco, ctx){
  const status = statusDoBloco(iso, bloco);
  const emAndamento = ctx.atual && ctx.atual.id === bloco.id;
  const fim = paraHora(paraMinutos(bloco.hora) + bloco.dur);
  const altura = alturaDoBloco(bloco, ctx.agenda);

  const el = h('div', {
      class: 'bloco' +
        (emAndamento ? ' em-andamento' : '') +
        (status ? ' marcado' : '') +
        (status === 'pulei' ? ' pulado' : ''),
      style: altura ? 'min-height:' + altura + 'px' : null,
      'data-id': bloco.id,
      onTap: () => {
        /* Se o gesto virou "segurar", o clique que vem junto não vale. */
        if(consumirToqueLongo()) return;
        if(ctx.editando){ abrirEditorDeBloco(iso, bloco, ctx.soLeitura); return; }
        if(ctx.soLeitura){ avisar('Dia encerrado — toque em Reabrir'); return; }
        const novo = proximoStatus(status);
        agir(bloco.titulo + ' · ' + (novo || 'sem marca'), d => {
          d.status[iso + ':' + bloco.id] = novo;
        });
      }
    },
    h('span', {class:'bloco-barra', style:'background:' + corDaCategoria(bloco.cat)}),
    h('div', {class:'bloco-texto'},
      h('div', {class:'bloco-titulo'}, bloco.titulo),
      bloco.sub ? h('div', {class:'bloco-sub'}, bloco.sub) : null
    ),
    status && !ctx.editando
      ? h('span', {class:'etiqueta etiqueta-' + status}, status.toUpperCase())
      : null,
    h('div', {class:'bloco-horario'},
      h('div', {class:'bloco-hora'}, ctx.editando ? bloco.hora + '–' + fim : bloco.hora),
      h('div', {class:'bloco-dur'}, rotuloDuracao(bloco.dur))
    ),
    ctx.editando
      ? h('button', {class:'btn-remover', type:'button', 'aria-label':'Remover ' + bloco.titulo,
          onTap: () => removerBloco(iso, bloco, ctx.soLeitura)}, icone('fechar', 15))
      : null,
    /* A alça de duração só existe em edição, e vive na base do cartão. */
    ctx.editando
      ? h('div', {class:'alca-duracao', 'aria-label':'Mudar a duração de ' + bloco.titulo,
          onPointerDown: ev => iniciarArraste(ev, iso, bloco, 'duracao', ctx.soLeitura, el)},
          h('span', {class:'pega'}))
      : null
  );

  if(ctx.editando){
    /* Em edição o cartão inteiro arrasta — não há alça separada de mover,
       que era um alvo pequeno demais para o polegar. */
    el.addEventListener('pointerdown', ev => {
      if(ev.target.closest('.alca-duracao, .btn-remover')) return;
      iniciarArraste(ev, iso, bloco, 'mover', ctx.soLeitura, el);
    });
  } else if(!ctx.soLeitura){
    ligarToqueLongo(el, () => entrarNaEdicao(ctx.soLeitura));
  }

  return el;
}

/* ===========================================================================
   EDITOR DE BLOCO

   Aberto ao tocar um bloco em modo de edição. Usa <input type="time">, que
   abre o seletor de horário nativo do aparelho — o handoff pedia exatamente
   isso, e resolve de uma vez a limitação dos steppers de 15 em 15 minutos.
   =========================================================================== */

let rascunhoBloco = null;

function abrirEditorDeBloco(iso, bloco, soLeitura){
  if(soLeitura){ avisar('Reabra o dia para editar'); return; }
  const fim = paraHora(paraMinutos(bloco.hora) + bloco.dur);
  rascunhoBloco = {titulo: bloco.titulo, cat: bloco.cat, inicio: bloco.hora, fim: fim};

  abrirFolha({
    titulo: 'Editar bloco',
    rotuloConfirmar: 'Salvar',
    corpo: () => corpoEditorDeBloco(),
    confirmar: () => salvarEdicaoDeBloco(iso, bloco)
  });
}

function corpoEditorDeBloco(){
  return h('div', {class:'folha-corpo'},
    h('label', {class:'campo'},
      h('span', {class:'campo-rotulo'}, 'Título'),
      h('input', {
        class:'campo-entrada', type:'text', value: rascunhoBloco.titulo, maxlength:'60',
        onInput: ev => { rascunhoBloco.titulo = ev.target.value; }
      })
    ),
    h('div', {class:'campo-duplo'},
      h('label', {class:'campo'},
        h('span', {class:'campo-rotulo'}, 'Começa'),
        h('input', {
          class:'campo-entrada campo-hora', type:'time', value: rascunhoBloco.inicio, step:'300',
          onInput: ev => { rascunhoBloco.inicio = ev.target.value; }
        })
      ),
      h('label', {class:'campo'},
        h('span', {class:'campo-rotulo'}, 'Termina'),
        h('input', {
          class:'campo-entrada campo-hora', type:'time', value: rascunhoBloco.fim, step:'300',
          onInput: ev => { rascunhoBloco.fim = ev.target.value; }
        })
      )
    ),
    h('div', {class:'campo'},
      h('span', {class:'campo-rotulo'}, 'Categoria'),
      chipsDeCategoria(() => rascunhoBloco.cat, cat => { rascunhoBloco.cat = cat; })
    )
  );
}

function chipsDeCategoria(lerAtual, definir){
  return h('div', {class:'chips-categoria'},
    Object.keys(CATEGORIAS).map(id =>
      h('button', {
          class:'chip-cat' + (lerAtual() === id ? ' ativo' : ''),
          type:'button',
          style:'--cor-cat:' + CATEGORIAS[id].cor,
          onTap: () => { definir(id); redesenhar(); }
        }, CATEGORIAS[id].rotulo))
  );
}

function salvarEdicaoDeBloco(iso, bloco){
  const r = rascunhoBloco;
  const inicio = paraMinutos(r.inicio);
  let dur = paraMinutos(r.fim) - inicio;
  /* Fim antes do início = o bloco atravessa a meia-noite. É legítimo (dormir),
     e a conta com o dia inteiro resolve sem precisar avisar nada. */
  if(dur <= 0) dur += 1440;

  agir('Bloco atualizado', d => {
    const lista = materializar(d, iso);
    const alvo = lista.filter(b => b.id === bloco.id)[0];
    if(!alvo) return;
    alvo.titulo = (r.titulo || '').trim() || 'Sem título';
    alvo.cat = r.cat;
    alvo.hora = r.inicio;
    alvo.dur = dur;
    d.blocos[iso] = ordenarPorHora(lista);
  });
  fecharFolha();
}

function removerBloco(iso, bloco, soLeitura){
  if(soLeitura){ avisar('Reabra o dia para editar'); return; }
  agir(bloco.titulo + ' removido do dia', d => {
    const lista = materializar(d, iso);
    d.blocos[iso] = lista.filter(b => b.id !== bloco.id);
  });
}

/* ===========================================================================
   ARRASTE

   O cartão segue o dedo pelo `transform`, e só o rótulo do horário é
   reescrito durante o movimento. A versão anterior redesenhava a lista
   inteira a cada quadro, o que engasgava e fazia o cartão "pular" embaixo
   do dedo. A lista só é reordenada ao soltar.
   =========================================================================== */

let arrasto = null;

function iniciarArraste(ev, iso, bloco, modo, soLeitura, elemento){
  if(soLeitura){ avisar('Reabra o dia para editar'); return; }
  if(ev.button !== undefined && ev.button !== 0) return;
  ev.preventDefault();
  if(modo === 'duracao') ev.stopPropagation();

  agirSemAviso(d => { materializar(d, iso); });
  const atual = blocosDoDia(iso).filter(b => b.id === bloco.id)[0];
  if(!atual) return;

  arrasto = {
    iso, id: bloco.id, modo, elemento,
    yInicial: ev.clientY,
    minutoInicial: paraMinutos(atual.hora),
    duracaoInicial: atual.dur,
    titulo: atual.titulo,
    moveu: false,
    delta: 0
  };

  document.addEventListener('pointermove', durante);
  document.addEventListener('pointerup', terminar);
  document.addEventListener('pointercancel', terminar);
}

function durante(ev){
  if(!arrasto) return;
  const dy = ev.clientY - arrasto.yInicial;
  if(Math.abs(dy) > 4) arrasto.moveu = true;
  if(!arrasto.moveu) return;

  arrasto.elemento.classList.add('arrastando');
  const minutos = arredondarNoPasso(dy / PX_POR_MINUTO_ARRASTE);
  arrasto.delta = minutos;

  const rotulo = arrasto.elemento.querySelector('.bloco-hora');
  const duracao = arrasto.elemento.querySelector('.bloco-dur');

  if(arrasto.modo === 'mover'){
    /* O cartão acompanha o dedo, encaixado nos passos de 5 min. */
    arrasto.elemento.style.transform = 'translateY(' + (minutos * PX_POR_MINUTO_ARRASTE) + 'px)';
    const ini = arrasto.minutoInicial + minutos;
    if(rotulo) rotulo.textContent = paraHora(ini) + '–' + paraHora(ini + arrasto.duracaoInicial);
  } else {
    const nova = Math.max(PASSO_MINUTOS, arrasto.duracaoInicial + minutos);
    arrasto.elemento.style.minHeight =
      Math.max(ALTURA_MINIMA_AGENDA, Math.round(nova * PX_POR_MINUTO_AGENDA)) + 'px';
    if(rotulo) rotulo.textContent =
      paraHora(arrasto.minutoInicial) + '–' + paraHora(arrasto.minutoInicial + nova);
    if(duracao) duracao.textContent = rotuloDuracao(nova);
  }
}

function arredondarNoPasso(minutos){
  return Math.round(minutos / PASSO_MINUTOS) * PASSO_MINUTOS;
}

function terminar(){
  document.removeEventListener('pointermove', durante);
  document.removeEventListener('pointerup', terminar);
  document.removeEventListener('pointercancel', terminar);
  if(!arrasto) return;

  const g = arrasto;
  arrasto = null;
  g.elemento.classList.remove('arrastando');
  g.elemento.style.transform = '';

  if(!g.moveu){ redesenhar(); return; }

  const alvo = (Dados.blocos[g.iso] || []).filter(b => b.id === g.id)[0];
  if(alvo){
    if(g.modo === 'mover'){
      alvo.hora = paraHora(g.minutoInicial + g.delta);
    } else {
      alvo.dur = Math.max(PASSO_MINUTOS, g.duracaoInicial + g.delta);
    }
  }
  /* A lista só reordena agora: reordenar durante o gesto faria o cartão
     saltar de posição embaixo do dedo. */
  Dados.blocos[g.iso] = ordenarPorHora(Dados.blocos[g.iso] || []);
  salvarDados();
  avisar(g.titulo + (g.modo === 'mover' ? ' movido' : ' com nova duração'));
}

/* ===========================================================================
   BOTÃO FLUTUANTE E FOLHA DE NOVO BLOCO
   =========================================================================== */

function botaoFlutuante(iso){
  return h('button', {class:'flutuante', type:'button', 'aria-label':'Novo bloco',
    onTap: () => abrirFolhaNovoBloco(iso)}, icone('mais', 24));
}

let rascunhoNovo = null;

export function abrirFolhaNovoBloco(iso){
  if(ehSomenteLeitura(iso)){ avisar('Reabra o dia para editar'); return; }
  rascunhoNovo = {
    titulo: '', cat: 'hobby', inicio: '21:30', fim: '22:15', repetir: false
  };
  abrirFolha({
    titulo: 'Novo bloco',
    rotuloConfirmar: 'Adicionar ao dia',
    corpo: () => corpoFolhaNovoBloco(iso),
    confirmar: () => criarBloco(iso)
  });
}

function corpoFolhaNovoBloco(iso){
  const dia = diaDaSemana(iso);
  return h('div', {class:'folha-corpo'},
    h('label', {class:'campo'},
      h('span', {class:'campo-rotulo'}, 'Título'),
      h('input', {
        class:'campo-entrada', type:'text', value: rascunhoNovo.titulo, maxlength:'60',
        placeholder: 'Ex.: Consulta médica',
        onInput: ev => { rascunhoNovo.titulo = ev.target.value; }
      })
    ),
    h('div', {class:'sugestoes'},
      TITULOS_SUGERIDOS.map(t =>
        h('button', {class:'sugestao', type:'button', onTap: () => {
          rascunhoNovo.titulo = t;
          redesenhar();
        }}, t))
    ),
    h('div', {class:'campo-duplo'},
      h('label', {class:'campo'},
        h('span', {class:'campo-rotulo'}, 'Começa'),
        h('input', {class:'campo-entrada campo-hora', type:'time', step:'300',
          value: rascunhoNovo.inicio,
          onInput: ev => { rascunhoNovo.inicio = ev.target.value; }})
      ),
      h('label', {class:'campo'},
        h('span', {class:'campo-rotulo'}, 'Termina'),
        h('input', {class:'campo-entrada campo-hora', type:'time', step:'300',
          value: rascunhoNovo.fim,
          onInput: ev => { rascunhoNovo.fim = ev.target.value; }})
      )
    ),
    h('div', {class:'campo'},
      h('span', {class:'campo-rotulo'}, 'Categoria'),
      chipsDeCategoria(() => rascunhoNovo.cat, cat => { rascunhoNovo.cat = cat; })
    ),
    h('label', {class:'interruptor-linha'},
      h('span', null, 'Repetir toda ' + dia.full),
      h('button', {
        class:'interruptor' + (rascunhoNovo.repetir ? ' ligado' : ''),
        type:'button', role:'switch', 'aria-checked': String(rascunhoNovo.repetir),
        onTap: () => { rascunhoNovo.repetir = !rascunhoNovo.repetir; redesenhar(); }
      }, h('span', {class:'interruptor-bola'}))
    )
  );
}

function criarBloco(iso){
  const r = rascunhoNovo;
  const titulo = (r.titulo || '').trim() || 'Novo bloco';
  const dia = diaDaSemana(iso);
  let dur = paraMinutos(r.fim) - paraMinutos(r.inicio);
  if(dur <= 0) dur += 1440;

  agir(titulo + ' adicionado', d => {
    if(r.repetir){
      /* Repetir entra na semana-modelo: passa a existir em todas as quintas,
         e não só nesta. Os dias já materializados recebem uma cópia, senão a
         mudança não apareceria neles. */
      d.fixos[dia.k].push([r.inicio, dur, titulo, r.cat]);
      const lista = d.blocos[iso];
      if(lista) lista.push({id:'fixo:' + dia.k + ':' + (d.fixos[dia.k].length - 1),
                            hora:r.inicio, dur:dur, titulo:titulo, cat:r.cat, sub:''});
    } else {
      const lista = materializar(d, iso);
      lista.push({id:'novo:' + Date.now().toString(36), hora:r.inicio, dur:dur,
                  titulo:titulo, cat:r.cat, sub:''});
    }
  });
  fecharFolha();
}
