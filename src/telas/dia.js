import { DIAS, CATEGORIAS, TITULOS_SUGERIDOS, MESES } from '../dados/modelo.js';
import { Dados, Tela, agir, avisar, definirTela } from '../nucleo/estado.js';
import { redesenhar } from '../nucleo/render.js';
import { hojeISO, deISO, diaDaSemana, semanaDe, dataCurta, ehHoje, ehPassado,
         paraMinutos, paraHora, rotuloDuracao, agoraEmMinutos } from '../nucleo/tempo.js';
import { blocosDoDia, blocoAtual, ordenarPorHora, materializar, statusDoBloco, proximoStatus,
         ehSomenteLeitura, treinoDoDia, corDaCategoria, corSuaveDaCategoria } from '../nucleo/modelo.js';
import { janelaDoDia, horasDaJanela, rotuloDaHora, lacunas, minutosLivres,
         blocosNaJanela, blocosAntesDaJanela, colunasDaJanela, arrastarPara,
         redimensionar, limitarInicio, noPasso, PASSO_MINUTOS } from '../nucleo/agenda.js';
import { h, icone, cabecalhoTela, pilula, pilulaConcluir, estadoVazio, rotuloSecao,
         abrirFolha, fecharFolha, ligarToqueLongo, consumirToqueLongo } from '../ui/index.js';
import { avisoDeAtraso } from './extras.js';

/* ===========================================================================
   TELA 2 — DIA

   Duas visões e dois modos, sobre a mesma lista de blocos.

   VISÕES   AGENDA  uma régua com as horas à esquerda e cada bloco ocupando a
                    altura da sua duração. O vazio entre dois blocos aparece
                    como vazio — é a visão para enxergar onde sobra tempo.
            LISTA   tudo com a mesma altura, mais denso. É a visão para marcar.

   MODOS    LEITURA toque cicla a marcação (sem marca → feito → atrasei → pulei)
            EDIÇÃO  a alça da esquerda arrasta o cartão e o resto do dia se
                    reorganiza junto; a borda de baixo estica a duração
                    daquele bloco; tocar abre os horários exatos.

   Não há botão "Editar": segurar qualquer bloco entra no modo de edição, e só
   então aparece o "Concluir".

   A REGRA QUE ORGANIZA O MODO DE EDIÇÃO: cada gesto tem UM trabalho, e cada
   um mora numa área própria do cartão. O corpo do cartão não arrasta nada —
   é o que devolve a rolagem, que antes era impossível porque qualquer toque
   já era o começo de um arraste.
   =========================================================================== */

/* Escala da régua. 0,95 px por minuto dá 57 px por hora: um bloco de meia
   hora tem 28 px (lê-se o título e o horário) e um dia acordado de 17 h cabe
   em pouco mais de duas telas de rolagem. */
const PX_POR_MINUTO = 0.95;

/* Piso de altura, só para um bloco de 10 min não virar um risco. Blocos
   assim curtos passam a se sobrepor de uns poucos pixels ao seguinte — o
   contorno e o empilhamento fazem isso parecer o que é. */
const ALTURA_MINIMA = 15;

/* Em edição o piso sobe: as duas alças e o × precisam caber, e um alvo de
   15 px não se acerta com o polegar. Fica acima do limiar do cartão "curto"
   de propósito — editando, o horário é a informação que mais importa, e é
   justamente ela que some quando o cartão encolhe. A leitura perde um pouco
   de fidelidade nos blocos de 10 min, mas em edição a régua é ferramenta,
   não retrato. */
const ALTURA_MINIMA_EDICAO = 40;

/* Abaixo disso só cabe o título. */
const ALTURA_SO_TITULO = 38;

function alturaMinima(editando){
  return editando ? ALTURA_MINIMA_EDICAO : ALTURA_MINIMA;
}

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
        editando
          ? pilulaConcluir(() => sairDaEdicao())
          /* A pílula é a porta VISÍVEL para a edição. Segurar um bloco também
             entra, mas o gesto só era anunciado no cabeçalho de hoje — logo
             não nos dias futuros, que são justamente os que a tela convida a
             ajustar ("Previsto. Ajuste agora e o dia chega pronto"). */
          : (!soLeitura ? pilula('Editar', () => entrarNaEdicao(soLeitura)) : null)
      ]
    ),
    faixaDaSemana(iso),
    cabecalhoDoDia(iso),
    ehHoje(iso) && !editando ? avisoDeAtraso(iso) : null,
    seletorDeVisao(editando),
    editando
      ? h('p', {class:'dica-edicao'},
          'Arraste pela alça ≡ para o horário que quiser · puxe a borda de baixo para durar · toque para os horários exatos')
      : null,
    corpoDoDia(iso, editando, soLeitura),
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
   Some no modo de edição: lá a régua é o próprio controle — a altura é a
   duração e a posição é o horário —, então não há segunda escala possível. */
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
   O CORPO DO DIA
   =========================================================================== */

function corpoDoDia(iso, editando, soLeitura){
  const blocos = blocosDoDia(iso);
  const ctx = {
    atual: blocoAtual(iso),
    editando: editando,
    soLeitura: soLeitura
  };

  if(!blocos.length){
    registrarAgenda(null);
    return estadoVazio('Dia vazio',
      'Nenhum bloco previsto. Toque no + para começar a montar este dia.');
  }

  /* A régua vale para a visão agenda E para a edição: editar na mesma
     representação em que se lê é o que faz os dois parecerem o mesmo lugar. */
  if(editando || Tela.visaoDia === 'agenda') return regua(iso, blocos, ctx);

  registrarAgenda(null);
  return h('div', {class:'lista-blocos'},
    blocos.map(b => linhaDeBloco(iso, b, ctx))
  );
}


/* ===========================================================================
   A RÉGUA

   Horas fixas à esquerda, cartões posicionados pelo horário à direita. Nada
   de lista: a distância entre dois cartões É o tempo entre eles.
   =========================================================================== */

/* O que o arraste precisa saber sobre o último desenho. Como a tela inteira é
   redesenhada a cada mudança, isto é sempre o estado atual da régua. */
let agendaAtual = null;
function registrarAgenda(valor){ agendaAtual = valor; }

function regua(iso, blocos, ctx){
  const janela = janelaDoDia(blocos);
  const antes = blocosAntesDaJanela(blocos, janela);
  const dentro = blocosNaJanela(blocos, janela);
  const altura = Math.max(160, (janela.fim - janela.inicio) * PX_POR_MINUTO);

  const colunas = colunasDaJanela(blocos, janela);
  const cartoes = {};
  const pista = h('div', {class:'agenda-pista'});

  lacunas(blocos, janela).forEach(l => pista.appendChild(vaoLivre(iso, l, janela, ctx)));

  dentro.forEach((bloco, i) => {
    const el = cartaoDoBloco(iso, bloco, janela, ctx, i, colunas[bloco.id]);
    cartoes[bloco.id] = el;
    pista.appendChild(el);
  });

  const agora = agoraEmMinutos();
  if(ehHoje(iso) && agora >= janela.inicio && agora <= janela.fim && !ctx.editando){
    pista.appendChild(h('div', {class:'agenda-agora',
      style:'top:' + ((agora - janela.inicio) * PX_POR_MINUTO) + 'px'}));
  }

  registrarAgenda({
    iso: iso, blocos: blocos, janela: janela, cartoes: cartoes,
    editando: ctx.editando, soLeitura: ctx.soLeitura
  });
  if(!ctx.editando) talvezMostrarAgora(iso, janela);

  return h('div', {class:'agenda' + (ctx.editando ? ' em-edicao' : '')},
    antes.length ? faixaAntesDeAcordar(iso, antes, ctx) : null,
    h('div', {class:'agenda-regua', style:'height:' + Math.round(altura) + 'px'},
      horasDaJanela(janela).map(m => h('div', {
          class:'agenda-hora',
          style:'top:' + ((m - janela.inicio) * PX_POR_MINUTO) + 'px'
        },
        h('span', {class:'agenda-hora-rotulo'}, rotuloDaHora(m)),
        h('span', {class:'agenda-hora-linha'})
      )),
      pista
    ),
    rodapeDaRegua(blocos, janela, ctx),
    ctx.editando
      ? h('button', {class:'adicionar-tracejado', type:'button',
          onTap: () => abrirFolhaNovoBloco(iso)}, icone('mais', 15), 'Adicionar bloco')
      : null,
    ctx.editando ? botaoDeRestaurar(iso) : null
  );
}

/* --- A volta atrás ---------------------------------------------------------
   Não há desfazer no app, e as remoções e arrastes deste dia não pedem
   confirmação — pedir a cada toque num app em que quase tudo é um toque foi
   justamente o que se decidiu não fazer. A saída é do tamanho certo: um dia
   editado pode voltar inteiro ao padrão da semana. É o inverso exato da
   materialização, e cobre qualquer estrago feito aqui sem encher a tela de
   "tem certeza?". */
function botaoDeRestaurar(iso){
  if(!Dados.blocos[iso]) return null;
  return h('button', {class:'btn btn-suave largura-cheia', type:'button',
    onTap: () => confirmarRestauracao(iso)}, 'Voltar ao padrão da semana');
}

function confirmarRestauracao(iso){
  const dia = diaDaSemana(iso);
  abrirFolha({
    titulo: 'Voltar ao padrão da semana?',
    rotuloConfirmar: 'Voltar ao padrão',
    corpo: () => h('div', {class:'folha-corpo'},
      h('p', {class:'nota destaque'},
        'Este dia foi editado. Voltar descarta as mudanças feitas nele — ' +
        'horários, durações e blocos removidos — e ele passa a seguir de novo ' +
        'a ' + dia.full + ' da sua semana.'),
      h('p', {class:'nota'}, 'As marcações do dia (feito, atrasei, pulei) não se perdem.')
    ),
    confirmar: () => {
      agir('Dia de volta ao padrão da semana', d => { delete d.blocos[iso]; });
      fecharFolha();
    }
  });
}

/* --- Abrir o dia já onde a pessoa está ------------------------------------
   A régua de um dia acordado tem quase três telas. Abrir às 20:00 e cair no
   café da manhã obriga a rolar até "agora" toda vez — e "agora" é o motivo
   de abrir o app. Só acontece ao TROCAR de dia: se você rolou e saiu da aba,
   o ciclo de desenho devolve a rolagem onde estava, que é o certo. */
let diaJaCentralizado = null;

function talvezMostrarAgora(iso, janela){
  if(diaJaCentralizado === iso) return;
  diaJaCentralizado = iso;
  if(!ehHoje(iso)) return;
  const agora = agoraEmMinutos();
  if(agora < janela.inicio || agora > janela.fim) return;

  /* setTimeout, e não requestAnimationFrame: o desenho ainda não terminou de
     ser anexado quando esta função roda, e rAF não dispara em página que o
     navegador não está compondo (app em segundo plano, aba oculta). O ajuste
     precisa acontecer mesmo assim, senão a pessoa volta ao app e encontra o
     dia rolado no café da manhã. */
  setTimeout(() => {
    const container = containerDeRolagem();
    const linha = document.querySelector('.agenda-agora');
    if(!container || !linha) return;
    const alvo = linha.getBoundingClientRect().top - container.getBoundingClientRect().top;
    container.scrollTop += alvo - container.clientHeight / 3;
  }, 0);
}

/* O sono da madrugada não ocupa um terço da rolagem: sai da régua e vira uma
   linha, que continua marcável e editável como qualquer outra. */
function faixaAntesDeAcordar(iso, blocos, ctx){
  return h('div', {class:'antes-de-acordar'},
    rotuloSecao('Antes de acordar'),
    h('div', {class:'lista-blocos'}, blocos.map(b => linhaDeBloco(iso, b, ctx)))
  );
}

/* O total de tempo livre, dito em números embaixo do que a régua já mostra
   em espaço vazio. */
function rodapeDaRegua(blocos, janela, ctx){
  if(ctx.editando) return null;
  const livres = minutosLivres(blocos, janela);
  if(livres < 15) return null;
  return h('p', {class:'agenda-resumo'},
    rotuloDuracao(livres) + ' sem nada marcado, das ' +
    paraHora(janela.inicio) + ' às ' + paraHora(janela.fim) + '.');
}

function faixaHoraria(bloco, comDuracao){
  const fim = paraHora(paraMinutos(bloco.hora) + bloco.dur);
  return bloco.hora + '–' + fim + (comDuracao ? ' · ' + rotuloDuracao(bloco.dur) : '');
}

/* Onde o cartão fica na largura da pista: sozinho ocupa tudo, disputando o
   horário com outro divide o espaço com ele. */
function estiloDaColuna(coluna){
  const c = coluna || {coluna: 0, colunas: 1};
  if(c.colunas <= 1) return 'left:0;width:100%';
  const largura = 100 / c.colunas;
  return 'left:' + (c.coluna * largura).toFixed(3) + '%' +
         ';width:calc(' + largura.toFixed(3) + '% - 3px)';
}

function cartaoDoBloco(iso, bloco, janela, ctx, indice, coluna){
  const status = statusDoBloco(iso, bloco);
  const emAndamento = ctx.atual && ctx.atual.id === bloco.id;
  const topo = (paraMinutos(bloco.hora) - janela.inicio) * PX_POR_MINUTO;
  const altura = Math.max(alturaMinima(ctx.editando), bloco.dur * PX_POR_MINUTO);

  const el = h('div', {
      class: 'cartao-agenda' +
        (emAndamento ? ' em-andamento' : '') +
        (status ? ' marcado' : '') +
        (status === 'pulei' ? ' pulado' : '') +
        (altura < ALTURA_SO_TITULO ? ' curto' : ''),
      style: 'top:' + Math.round(topo) + 'px' +
             ';height:' + Math.round(altura) + 'px' +
             ';z-index:' + (indice + 1) +
             ';' + estiloDaColuna(coluna) +
             ';--cor-cat:' + corDaCategoria(bloco.cat) +
             ';--cor-cat-suave:' + corSuaveDaCategoria(bloco.cat),
      'data-id': bloco.id,
      'aria-label': bloco.titulo + ', ' + faixaHoraria(bloco, true),
      onTap: ev => tocarNoBloco(ev, iso, bloco, status, ctx)
    },
    h('div', {class:'cartao-agenda-texto'},
      h('div', {class:'cartao-agenda-titulo'}, bloco.titulo),
      h('div', {class:'cartao-agenda-hora'}, faixaHoraria(bloco, ctx.editando)),
      bloco.sub ? h('div', {class:'cartao-agenda-sub'}, bloco.sub) : null
    ),
    status && !ctx.editando
      ? h('span', {class:'etiqueta etiqueta-' + status}, status.toUpperCase())
      : null,
    ctx.editando ? pegaDeMover(bloco) : null,
    ctx.editando
      ? h('button', {class:'btn-remover', type:'button', 'aria-label':'Remover ' + bloco.titulo,
          onTap: () => removerBloco(iso, bloco, ctx.soLeitura)}, icone('fechar', 15))
      : null,
    ctx.editando ? pegaDeDuracao(bloco) : null
  );

  if(!ctx.editando && !ctx.soLeitura) ligarToqueLongo(el, () => entrarNaEdicao(ctx.soLeitura));
  return el;
}

function tocarNoBloco(ev, iso, bloco, status, ctx){
  /* Se o gesto virou "arrastar" ou "segurar", o clique que vem junto não vale.
     O arraste é consumido ANTES de qualquer outra saída: com mouse o clique
     nasce na alça, e se a saída pela alça viesse primeiro a marca ficaria
     pendurada e engoliria o próximo toque de verdade. */
  if(consumirArraste()) return;
  if(consumirToqueLongo()) return;
  /* As alças têm dono. Um clique que nasceu nelas não é um toque no cartão. */
  if(ev && ev.target && ev.target.closest &&
     ev.target.closest('.pega-mover, .pega-duracao, .btn-remover')) return;

  if(ctx.editando){ abrirEditorDeBloco(iso, bloco, ctx.soLeitura); return; }
  if(ctx.soLeitura){ avisar('Dia encerrado — toque em Reabrir'); return; }

  const novo = proximoStatus(status);
  agir(bloco.titulo + ' · ' + (novo || 'sem marca'), d => {
    d.status[iso + ':' + bloco.id] = novo;
  });
}

/* --- Vão livre -------------------------------------------------------------
   O buraco entre dois blocos, com o tamanho que ele tem. Quando é grande o
   bastante para ser um alvo de toque honesto, também é o atalho para
   preencher exatamente aquela janela. */
function vaoLivre(iso, vao, janela, ctx){
  const altura = vao.dur * PX_POR_MINUTO;
  const estilo = 'top:' + Math.round((vao.inicio - janela.inicio) * PX_POR_MINUTO) + 'px' +
                 ';height:' + Math.round(altura) + 'px';
  const rotulo = h('span', {class:'vao-rotulo'}, rotuloDuracao(vao.dur) + ' livre');

  if(altura < 44 || ctx.soLeitura){
    return h('div', {class:'agenda-vao', style:estilo}, altura >= 22 ? rotulo : null);
  }
  return h('button', {
    class:'agenda-vao acionavel', type:'button', style:estilo,
    'aria-label':'Preencher ' + rotuloDuracao(vao.dur) + ' livres a partir das ' + paraHora(vao.inicio),
    onTap: () => abrirFolhaNovoBloco(iso, paraHora(vao.inicio), paraHora(vao.inicio + vao.dur))
  }, rotulo);
}


/* ===========================================================================
   A LISTA

   A visão densa, e também a forma dos blocos que ficaram fora da régua.
   =========================================================================== */

function linhaDeBloco(iso, bloco, ctx){
  const status = statusDoBloco(iso, bloco);
  const emAndamento = ctx.atual && ctx.atual.id === bloco.id;

  const el = h('div', {
      class: 'bloco' +
        (emAndamento ? ' em-andamento' : '') +
        (status ? ' marcado' : '') +
        (status === 'pulei' ? ' pulado' : ''),
      'data-id': bloco.id,
      onTap: ev => tocarNoBloco(ev, iso, bloco, status, ctx)
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
      h('div', {class:'bloco-hora'}, ctx.editando ? faixaHoraria(bloco, false) : bloco.hora),
      h('div', {class:'bloco-dur'}, rotuloDuracao(bloco.dur))
    ),
    ctx.editando
      ? h('button', {class:'btn-remover', type:'button', 'aria-label':'Remover ' + bloco.titulo,
          onTap: () => removerBloco(iso, bloco, ctx.soLeitura)}, icone('fechar', 15))
      : null
  );

  if(!ctx.editando && !ctx.soLeitura) ligarToqueLongo(el, () => entrarNaEdicao(ctx.soLeitura));
  return el;
}


/* ===========================================================================
   OS DOIS ARRASTES

   Mover e mudar a duração são gestos diferentes, com áreas diferentes do
   cartão, e nenhum dos dois começa no corpo do cartão — é isso que devolve a
   rolagem da lista. Só as duas alças declaram `touch-action:none`; em
   qualquer outro ponto o dedo rola a tela como esperado.

   MOVER É LIVRE. O cartão vai para o horário onde o dedo está, encaixado de 5
   em 5 minutos, inclusive para dentro de um buraco no meio do dia sem que
   nada mais se mexa. Trocar de lugar com o vizinho só acontece quando ele é
   de fato ultrapassado. A primeira versão só sabia reordenar, e num dia com
   duas horas livres às 19:00 isso significava não conseguir usá-las.

   Durante o gesto NADA é redesenhado. A prévia mexe direto no `top`, no
   `height` e no rótulo de cada cartão, e os dados só são tocados ao soltar.
   Redesenhar a cada quadro era o que fazia o cartão saltar embaixo do dedo.
   =========================================================================== */

let arrasto = null;
let arrastouAgora = false;

function consumirArraste(){
  if(!arrastouAgora) return false;
  arrastouAgora = false;
  return true;
}

function pegaDeMover(bloco){
  return h('div', {
      class:'pega-mover', 'aria-hidden':'true',
      onPointerDown: ev => iniciarArraste(ev, bloco, 'mover')
    }, icone('alca', 15));
}

function pegaDeDuracao(bloco){
  return h('div', {
      class:'pega-duracao', 'aria-hidden':'true',
      onPointerDown: ev => iniciarArraste(ev, bloco, 'duracao')
    }, h('span', {class:'pega'}));
}

function containerDeRolagem(){ return document.getElementById('conteudo'); }

/* Nada é gravado ao começar o gesto — nem materializar o dia. Um arraste que
   volta ao ponto de partida não deve deixar rastro, e quem grava é o soltar,
   que já escreve a lista inteira. */
function iniciarArraste(ev, bloco, tipo){
  const ctx = agendaAtual;
  if(!ctx) return;
  if(ctx.soLeitura){ avisar('Reabra o dia para editar'); return; }
  if(ev.button !== undefined && ev.button !== 0) return;

  ev.preventDefault();
  ev.stopPropagation();

  const el = ctx.cartoes[bloco.id];
  if(!el) return;
  const container = containerDeRolagem();

  arrasto = {
    tipo: tipo, ctx: ctx, id: bloco.id, el: el, titulo: bloco.titulo,
    yInicial: ev.clientY,
    ultimoY: ev.clientY,
    rolagemInicial: container ? container.scrollTop : 0,
    inicioInicial: paraMinutos(bloco.hora),
    duracaoInicial: bloco.dur,
    assinatura: assinaturaDosOutros(ctx.blocos, bloco.id),
    velocidade: 0,
    lista: null,
    moveu: false
  };

  el.classList.add('arrastando');
  /* Os vãos desenhados param de valer no instante em que os blocos começam a
     se mexer. Somem durante o gesto em vez de mostrar buracos no lugar errado. */
  const agenda = el.closest('.agenda');
  if(agenda) agenda.classList.add('em-arraste');
  arrasto.agenda = agenda;

  document.addEventListener('pointermove', durante);
  document.addEventListener('pointerup', terminar);
  document.addEventListener('pointercancel', terminar);
  requestAnimationFrame(pulsarRolagem);
}

/* Só os OUTROS blocos: é a mudança deles que merece a vibração de "trocou". */
function assinaturaDosOutros(lista, id){
  return lista.filter(b => b.id !== id).map(b => b.id + '@' + b.hora).join('|');
}

function durante(ev){
  if(!arrasto) return;
  arrasto.ultimoY = ev.clientY;
  medirAutoRolagem(ev.clientY);
  atualizarArraste();
}

function atualizarArraste(){
  const g = arrasto;
  if(!g) return;
  const container = containerDeRolagem();
  const rolou = container ? container.scrollTop - g.rolagemInicial : 0;
  /* A rolagem entra na conta: sem isso, rolar durante o arraste faria o
     cartão descolar do dedo na mesma medida. */
  const dy = (g.ultimoY - g.yInicial) + rolou;
  if(!g.moveu && Math.abs(dy) < 3) return;
  g.moveu = true;

  if(g.tipo === 'mover'){
    const bruto = g.inicioInicial + dy / PX_POR_MINUTO;
    const alvo = limitarInicio(g.ctx.janela, g.duracaoInicial, noPasso(bruto));
    g.lista = arrastarPara(g.ctx.blocos, g.id, alvo);
    const nova = assinaturaDosOutros(g.lista, g.id);
    if(nova !== g.assinatura){
      g.assinatura = nova;
      /* Trocou de lugar com alguém: confirma sem precisar olhar. */
      if(navigator.vibrate) navigator.vibrate(8);
    }
  } else {
    /* Um pixel de dedo é um pixel de cartão: a mesma escala do desenho, senão
       a borda descola do dedo e o gesto parece emperrado. */
    const nova = noPasso(g.duracaoInicial + dy / PX_POR_MINUTO);
    g.lista = redimensionar(g.ctx.blocos, g.id, Math.max(PASSO_MINUTOS, nova));
  }
  aplicarPrevia(g.lista);
}

/* --- Rolagem automática nas bordas ------------------------------------------
   A régua de um dia acordado tem quase três telas de altura. Sem isto, levar
   um bloco das 07:00 para as 20:00 seria impossível num gesto só — e soltar
   no meio do caminho para rolar significa recomeçar. */
const MARGEM_AUTO = 72;
const VELOCIDADE_MAXIMA = 16;

function medirAutoRolagem(clientY){
  const container = containerDeRolagem();
  if(!container){ arrasto.velocidade = 0; return; }
  const r = container.getBoundingClientRect();
  let v = 0;
  if(clientY < r.top + MARGEM_AUTO) v = -(MARGEM_AUTO - (clientY - r.top));
  else if(clientY > r.bottom - MARGEM_AUTO) v = MARGEM_AUTO - (r.bottom - clientY);
  arrasto.velocidade = Math.max(-VELOCIDADE_MAXIMA,
                                Math.min(VELOCIDADE_MAXIMA, v * 0.3));
}

function pulsarRolagem(){
  if(!arrasto) return;
  if(arrasto.velocidade){
    const container = containerDeRolagem();
    const antes = container.scrollTop;
    container.scrollTop = antes + arrasto.velocidade;
    if(container.scrollTop !== antes) atualizarArraste();
  }
  requestAnimationFrame(pulsarRolagem);
}

/** Move e redimensiona os cartões da prévia, sem tocar nos dados. */
function aplicarPrevia(lista){
  const ctx = arrasto.ctx;
  /* O cartão na mão fica de fora do cálculo de colunas: ele flutua por cima,
     inteiro, e os outros se organizam entre si. Recalcular com ele dentro
     faria o cartão arrastado afinar e engordar a cada passagem. */
  const colunas = colunasDaJanela(lista.filter(b => b.id !== arrasto.id), ctx.janela);
  lista.forEach(b => {
    const el = ctx.cartoes[b.id];
    if(!el) return;
    const altura = Math.max(alturaMinima(ctx.editando), b.dur * PX_POR_MINUTO);
    el.style.top = Math.round((paraMinutos(b.hora) - ctx.janela.inicio) * PX_POR_MINUTO) + 'px';
    el.style.height = Math.round(altura) + 'px';
    const c = b.id === arrasto.id
      ? {coluna: 0, colunas: 1}
      : (colunas[b.id] || {coluna: 0, colunas: 1});
    el.style.left = c.colunas <= 1 ? '0px' : (c.coluna * 100 / c.colunas).toFixed(3) + '%';
    el.style.width = c.colunas <= 1
      ? '100%'
      : 'calc(' + (100 / c.colunas).toFixed(3) + '% - 3px)';
    el.classList.toggle('curto', altura < ALTURA_SO_TITULO);
    const rotulo = el.querySelector('.cartao-agenda-hora');
    if(rotulo) rotulo.textContent = faixaHoraria(b, true);
  });
}

function terminar(){
  document.removeEventListener('pointermove', durante);
  document.removeEventListener('pointerup', terminar);
  document.removeEventListener('pointercancel', terminar);
  if(!arrasto) return;

  const g = arrasto;
  arrasto = null;
  g.el.classList.remove('arrastando');
  g.el.style.transform = '';
  if(g.agenda) g.agenda.classList.remove('em-arraste');

  if(!g.moveu || !g.lista){ redesenhar(); return; }
  arrastouAgora = true;

  const nova = ordenarPorHora(g.lista);
  const alvo = nova.filter(b => b.id === g.id)[0];
  const mensagem = g.tipo === 'mover'
    ? g.titulo + ' às ' + (alvo ? alvo.hora : '')
    : g.titulo + ' · ' + rotuloDuracao(alvo ? alvo.dur : g.duracaoInicial);

  agir(mensagem, d => { d.blocos[g.ctx.iso] = nova; });
}


/* ===========================================================================
   EDITOR DE BLOCO

   Aberto ao tocar um bloco em modo de edição, e é o único caminho que muda um
   horário sem mexer em mais ninguém: horário digitado é intenção explícita,
   e não faz sentido o app "consertar" o resto do dia por conta própria. O
   arraste é que reorganiza; aqui se acerta um horário e pronto.
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
   BOTÃO FLUTUANTE E FOLHA DE NOVO BLOCO
   =========================================================================== */

function botaoFlutuante(iso){
  return h('button', {class:'flutuante', type:'button', 'aria-label':'Novo bloco',
    onTap: () => abrirFolhaNovoBloco(iso)}, icone('mais', 24));
}

let rascunhoNovo = null;

/** `inicio` e `fim` chegam preenchidos quando o toque veio de um vão livre. */
export function abrirFolhaNovoBloco(iso, inicio, fim){
  if(ehSomenteLeitura(iso)){ avisar('Reabra o dia para editar'); return; }
  rascunhoNovo = {
    titulo: '', cat: 'hobby',
    inicio: inicio || '21:30', fim: fim || '22:15',
    repetir: false
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
