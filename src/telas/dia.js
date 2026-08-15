import { DIAS, CATEGORIAS, TITULOS_SUGERIDOS, MESES } from '../dados/modelo.js';
import { Dados, Tela, agir, agirSemAviso, avisar, definirTela, mostrarAviso, salvarDados } from '../nucleo/estado.js';
import { clonar } from '../nucleo/armazem.js';
import { redesenhar } from '../nucleo/render.js';
import { hojeISO, deISO, diaDaSemana, semanaDe, dataCurta, ehHoje, ehPassado,
         paraMinutos, paraHora, rotuloDuracao } from '../nucleo/tempo.js';
import { blocosDoDia, blocoAtual, ordenarPorHora, materializar, statusDoBloco, proximoStatus,
         ehSomenteLeitura, treinoDoDia, corDaCategoria } from '../nucleo/modelo.js';
import { h, icone, cabecalhoTela, pilula, estadoVazio, stepper, ajustarHora, abrirFolha, fecharFolha } from '../ui/index.js';
import { avisoDeAtraso } from './extras.js';

/* ===========================================================================
   TELA 2 — DIA

   Dois modos sobre a mesma lista de blocos:

   LEITURA  toque cicla a marcação (sem marca → feito → atrasei → pulei);
            toque e segure 480 ms entra em edição.
   EDIÇÃO   cada bloco vira um cartão que se arrasta para mover e tem uma alça
            embaixo para mudar a duração.

   Um dia passado é só leitura até ser reaberto. Um dia futuro é editável
   normalmente — é assim que dá pra ajustar amanhã antes de amanhã chegar.
   =========================================================================== */

export const MS_TOQUE_LONGO = 480;
export const PX_QUE_CANCELA_TOQUE_LONGO = 8;
export const PX_POR_MINUTO = 1.1;      // sensibilidade do arraste
export const PASSO_MINUTOS = 5;        // o arraste encaixa de 5 em 5

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
        pilula(editando ? 'Concluir' : 'Editar',
               () => definirTela({editando: Object.assign({}, Tela.editando, {dia: !editando})}),
               {ativa: editando})
      ]
    ),
    faixaDaSemana(iso),
    cabecalhoDoDia(iso),
    ehHoje(iso) && !editando ? avisoDeAtraso(iso) : null,
    editando ? h('p', {class:'dica-edicao'}, 'Arraste o bloco para mover · a alça de baixo para durar') : null,
    editando ? listaEmEdicao(iso, soLeitura) : listaEmLeitura(iso, soLeitura),
    !editando ? botaoFlutuante(iso) : null
  );
}

/* --- Faixa da semana ------------------------------------------------------ */
export function faixaDaSemana(iso){
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
export function cabecalhoDoDia(iso){
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
    rotulo = 'toque para marcar';
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
   MODO LEITURA
   =========================================================================== */

export function listaEmLeitura(iso, soLeitura){
  const blocos = blocosDoDia(iso);
  const atual = blocoAtual(iso);

  if(!blocos.length){
    return estadoVazio('Dia vazio', 'Nenhum bloco previsto. Toque no + para começar a montar este dia.');
  }

  return h('div', {class:'lista-blocos'},
    blocos.map(bloco => linhaDeBloco(iso, bloco, atual, soLeitura))
  );
}

export function linhaDeBloco(iso, bloco, atual, soLeitura){
  const status = statusDoBloco(iso, bloco);
  const emAndamento = atual && atual.id === bloco.id;

  const linha = h('div', {
      class: 'bloco' +
        (emAndamento ? ' em-andamento' : '') +
        (status ? ' marcado' : '') +
        (status === 'pulei' ? ' pulado' : '') +
        (Tela.segurando === bloco.id ? ' segurando' : ''),
      onTap: () => {
        if(seguranciaDisparou){ seguranciaDisparou = false; return; }
        if(soLeitura){ avisar('Dia encerrado — toque em Reabrir'); return; }
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
    status ? h('span', {class:'etiqueta etiqueta-' + status}, status.toUpperCase()) : null,
    h('div', {class:'bloco-horario'},
      h('div', {class:'bloco-hora'}, bloco.hora),
      h('div', {class:'bloco-dur'}, rotuloDuracao(bloco.dur))
    )
  );

  if(!soLeitura) ligarToqueLongo(linha, bloco);
  return linha;
}

/* --- Toque e segure -------------------------------------------------------
   480 ms parado abre o modo de edição. Sair mais de 8 px cancela — assim
   rolar a lista não vira edição por acidente. */
let temporizadorSegurar = null;
let yInicialSegurar = null;
let seguranciaDisparou = false;   // impede que o clique do fim do toque cicle o status

export function ligarToqueLongo(el, bloco){
  el.addEventListener('pointerdown', ev => {
    if(Tela.editando.dia) return;
    yInicialSegurar = ev.clientY;
    seguranciaDisparou = false;
    definirTela({segurando: bloco.id});
    clearTimeout(temporizadorSegurar);
    temporizadorSegurar = setTimeout(() => {
      seguranciaDisparou = true;
      const fotoAntes = clonar(Dados);
      definirTela({segurando: null, editando: Object.assign({}, Tela.editando, {dia: true})});
      mostrarAviso('Modo de edição — arraste os blocos', fotoAntes);
      redesenhar();
    }, MS_TOQUE_LONGO);
  });
  el.addEventListener('pointermove', ev => {
    if(yInicialSegurar !== null && Math.abs(ev.clientY - yInicialSegurar) > PX_QUE_CANCELA_TOQUE_LONGO){
      cancelarToqueLongo();
    }
  });
  el.addEventListener('pointerup', cancelarToqueLongo);
  el.addEventListener('pointercancel', cancelarToqueLongo);
}

export function cancelarToqueLongo(){
  clearTimeout(temporizadorSegurar);
  yInicialSegurar = null;
  if(Tela.segurando) definirTela({segurando: null});
}

/* ===========================================================================
   MODO EDIÇÃO
   =========================================================================== */

export function listaEmEdicao(iso, soLeitura){
  const blocos = blocosDoDia(iso);
  return h('div', {class:'lista-edicao'},
    blocos.map(bloco => cartaoEditavel(iso, bloco, soLeitura)),
    h('button', {class:'adicionar-tracejado', type:'button', onTap:()=> abrirFolhaNovoBloco(iso)},
      icone('mais', 15), 'Adicionar bloco')
  );
}

export function cartaoEditavel(iso, bloco, soLeitura){
  const arrastando = Tela.arrastando && Tela.arrastando.id === bloco.id;
  const modoAtual = arrastando ? Tela.arrastando.modo : null;
  const fim = paraHora(paraMinutos(bloco.hora) + bloco.dur);

  /* A altura do cartão cresce com a duração, pra lista lembrar a proporção
     real do dia sem virar uma timeline de escala fixa. */
  const espacador = Math.max(0, Math.min(90, Math.round((bloco.dur - 15) * 0.28)));

  return h('div', {class:'cartao-edicao' + (arrastando ? ' arrastando' : '')},
    h('div', {class:'cartao-edicao-topo'},
      h('span', {
        class:'alca-arraste',
        'aria-label':'Arrastar ' + bloco.titulo,
        onPointerDown: ev => iniciarArraste(ev, iso, bloco, 'mover', soLeitura)
      }, icone('alca', 18)),
      h('span', {class:'bloco-barra', style:'background:' + corDaCategoria(bloco.cat)}),
      h('div', {class:'cartao-edicao-texto'},
        h('div', {class:'bloco-titulo'}, bloco.titulo),
        h('div', {class:'cartao-edicao-faixa'}, bloco.hora + ' – ' + fim + ' · ' + rotuloDuracao(bloco.dur))
      ),
      h('button', {class:'btn-remover', type:'button', 'aria-label':'Remover ' + bloco.titulo,
        onTap: () => removerBloco(iso, bloco, soLeitura)}, icone('fechar', 15))
    ),
    espacador ? h('div', {style:'height:' + espacador + 'px'}) : null,
    h('div', {
      class:'alca-duracao' + (modoAtual === 'duracao' ? ' ativa' : ''),
      'aria-label':'Mudar a duração de ' + bloco.titulo,
      onPointerDown: ev => iniciarArraste(ev, iso, bloco, 'duracao', soLeitura)
    }, h('span', {class:'pega'}))
  );
}

export function removerBloco(iso, bloco, soLeitura){
  if(soLeitura){ avisar('Reabra o dia para editar'); return; }
  agir(bloco.titulo + ' removido do dia', d => {
    const lista = materializar(d, iso);
    d.blocos[iso] = lista.filter(b => b.id !== bloco.id);
  });
}

/* --- Arraste --------------------------------------------------------------
   Move ou redimensiona conforme o `modo`. A fotografia para desfazer é tirada
   uma vez, no começo do gesto: desfazer volta pro estado de antes de encostar
   no bloco, não pro quadro anterior do movimento. */
let arrasto = null;

export function iniciarArraste(ev, iso, bloco, modo, soLeitura){
  ev.preventDefault();
  ev.stopPropagation();
  if(soLeitura){ avisar('Reabra o dia para editar'); return; }

  agirSemAviso(d => { materializar(d, iso); });

  const atual = blocosDoDia(iso).filter(b => b.id === bloco.id)[0];
  if(!atual) return;

  arrasto = {
    iso: iso, id: bloco.id, modo: modo,
    yInicial: ev.clientY,
    minutoInicial: paraMinutos(atual.hora),
    duracaoInicial: atual.dur,
    titulo: atual.titulo,
    foto: clonar(Dados),
    moveu: false
  };

  document.addEventListener('pointermove', durante);
  document.addEventListener('pointerup', terminar);
  document.addEventListener('pointercancel', terminar);
  definirTela({arrastando: {id: bloco.id, modo: modo}});
}

export function durante(ev){
  if(!arrasto) return;
  const dy = ev.clientY - arrasto.yInicial;
  if(Math.abs(dy) > 3) arrasto.moveu = true;

  const deltaMinutos = dy / PX_POR_MINUTO;
  const alvo = (Dados.blocos[arrasto.iso] || []).filter(b => b.id === arrasto.id)[0];
  if(!alvo) return;

  if(arrasto.modo === 'mover'){
    alvo.hora = paraHora(arredondarNoPasso(arrasto.minutoInicial + deltaMinutos));
  } else {
    alvo.dur = Math.max(PASSO_MINUTOS, arredondarNoPasso(arrasto.duracaoInicial + deltaMinutos));
  }
  redesenhar();
}

export function arredondarNoPasso(minutos){
  return Math.round(minutos / PASSO_MINUTOS) * PASSO_MINUTOS;
}

export function terminar(){
  document.removeEventListener('pointermove', durante);
  document.removeEventListener('pointerup', terminar);
  document.removeEventListener('pointercancel', terminar);
  if(!arrasto) return;

  const g = arrasto;
  arrasto = null;

  /* A lista só reordena ao soltar: reordenar durante o gesto faria o cartão
     pular de posição embaixo do dedo. */
  Dados.blocos[g.iso] = ordenarPorHora(Dados.blocos[g.iso] || []);
  salvarDados();

  definirTela({arrastando: null});
  if(g.moveu){
    mostrarAviso(g.titulo + (g.modo === 'mover' ? ' movido' : ' com nova duração'), g.foto);
  }
  redesenhar();
}

/* ===========================================================================
   BOTÃO FLUTUANTE E FOLHA DE NOVO BLOCO
   =========================================================================== */

export function botaoFlutuante(iso){
  return h('button', {class:'flutuante', type:'button', 'aria-label':'Novo bloco',
    onTap: () => abrirFolhaNovoBloco(iso)}, icone('mais', 24));
}

/* Rascunho do bloco sendo criado. Vive fora do estado persistido porque some
   quando a folha fecha. */
let rascunho = null;

export function abrirFolhaNovoBloco(iso){
  if(ehSomenteLeitura(iso)){ avisar('Reabra o dia para editar'); return; }
  rascunho = {
    tituloIdx: 0,
    titulo: TITULOS_SUGERIDOS[0],
    cat: 'hobby',
    hora: '21:30',
    dur: 45,
    repetir: false
  };
  abrirFolha({
    titulo: 'Novo bloco',
    rotuloConfirmar: 'Adicionar ao dia',
    corpo: () => corpoFolhaNovoBloco(iso),
    confirmar: () => criarBloco(iso)
  });
}

export function corpoFolhaNovoBloco(iso){
  const dia = diaDaSemana(iso);
  return h('div', {class:'folha-corpo'},

    h('label', {class:'campo'},
      h('span', {class:'campo-rotulo'}, 'Título'),
      h('input', {
        class:'campo-entrada', type:'text', value: rascunho.titulo, maxlength:'60',
        placeholder: 'Toque para escrever',
        onInput: ev => { rascunho.titulo = ev.target.value; }
      })
    ),
    h('div', {class:'sugestoes'},
      TITULOS_SUGERIDOS.map(t =>
        h('button', {class:'sugestao', type:'button', onTap: () => {
          rascunho.titulo = t;
          redesenhar();
        }}, t))
    ),

    h('div', {class:'campo'},
      h('span', {class:'campo-rotulo'}, 'Categoria'),
      h('div', {class:'chips-categoria'},
        Object.keys(CATEGORIAS).map(id =>
          h('button', {
              class:'chip-cat' + (rascunho.cat === id ? ' ativo' : ''),
              type:'button',
              style:'--cor-cat:' + CATEGORIAS[id].cor,
              onTap: () => { rascunho.cat = id; redesenhar(); }
            }, CATEGORIAS[id].rotulo))
      )
    ),

    h('div', {class:'campo-duplo'},
      h('div', {class:'campo'},
        h('span', {class:'campo-rotulo'}, 'Início'),
        stepper(rascunho.hora, passos => {
          rascunho.hora = ajustarHora(rascunho.hora, passos, 15);
          redesenhar();
        })
      ),
      h('div', {class:'campo'},
        h('span', {class:'campo-rotulo'}, 'Duração'),
        stepper(rotuloDuracao(rascunho.dur), passos => {
          rascunho.dur = Math.max(5, rascunho.dur + passos * 15);
          redesenhar();
        })
      )
    ),

    h('label', {class:'interruptor-linha'},
      h('span', null, 'Repetir toda ' + dia.full),
      h('button', {
        class:'interruptor' + (rascunho.repetir ? ' ligado' : ''),
        type:'button', role:'switch', 'aria-checked': String(rascunho.repetir),
        onTap: () => { rascunho.repetir = !rascunho.repetir; redesenhar(); }
      }, h('span', {class:'interruptor-bola'}))
    )
  );
}

export function criarBloco(iso){
  const r = rascunho;
  const titulo = (r.titulo || '').trim() || 'Novo bloco';
  const dia = diaDaSemana(iso);

  agir(titulo + ' adicionado', d => {
    if(r.repetir){
      /* Repetir entra na semana-modelo: passa a existir em todas as
         quintas, e não só nesta. Os dias já materializados recebem uma
         cópia, senão a mudança não apareceria neles. */
      d.fixos[dia.k].push([r.hora, r.dur, titulo, r.cat]);
      const lista = d.blocos[iso];
      if(lista) lista.push({id:'fixo:' + dia.k + ':' + (d.fixos[dia.k].length - 1),
                            hora:r.hora, dur:r.dur, titulo:titulo, cat:r.cat, sub:''});
    } else {
      const lista = materializar(d, iso);
      lista.push({id:'novo:' + Date.now().toString(36), hora:r.hora, dur:r.dur,
                  titulo:titulo, cat:r.cat, sub:''});
    }
  });
  fecharFolha();
}
