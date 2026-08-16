import { DIAS, NOMES_TREINO, FORMATOS, EXERCICIOS_SUGERIDOS } from '../dados/modelo.js';
import { Dados, Tela, agir, agirSemAviso, avisar, definirTela } from '../nucleo/estado.js';
import { clonar } from '../nucleo/armazem.js';
import { redesenhar } from '../nucleo/render.js';
import { diaDaSemana, semanaDe, dataCurta, rotuloDuracao } from '../nucleo/tempo.js';
import { treinoDoDia, voltasDoTreino, progressoDoTreino, exercicioFeito } from '../nucleo/modelo.js';
import { sessaoDe, garantirSessao, seriesDe, ultimaSerieAnterior,
         resumirSeries, volumeDaSessao, totalDeSeries,
         sessoesDoTreino } from '../nucleo/sessoes.js';
import { evolucaoDeVolume } from '../nucleo/estatisticas.js';
import { h, icone, cabecalhoTela, barraProgresso, estadoVazio, stepper,
         rotuloSecao, abrirFolha, fecharFolha, abrirFolhaTexto,
         pilula, pilulaConcluir, ligarToqueLongo, consumirToqueLongo } from '../ui/index.js';
import { figura, linha, figuraVazia } from '../ui/graficos.js';

/* ===========================================================================
   TELA 3 — TREINO

   Três coisas diferentes convivem aqui, e confundi-las é o que deixava a aba
   pobre:

   O TREINO é estrutura — "Força A tem 8 exercícios, o terceiro é barra fixa".
   Vale para todas as quartas.

   A SESSÃO é fato — "na quarta dia 19 fiz 5, 4, 4, 3 e 3 repetições em 40 min".
   Vale para aquela data.

   A MARCAÇÃO é o círculo de feito, por volta. É o registro mais leve possível,
   para quem não quer anotar número nenhum.

   Quem só quer marcar continua marcando num toque. Quem quer anotar carga
   toca no nome e anota — sem que um atrapalhe o outro.
   =========================================================================== */

export function telaTreino(){
  const iso = Tela.data;
  const dia = diaDaSemana(iso);
  const treino = treinoDoDia(dia.k);
  const editando = Tela.editando.treino;

  return h('div', {class:'tela tela-treino'},
    cabecalhoTela(
      dataCurta(iso) + ' · ' + dia.full,
      'Treino',
      null,
      editando
        ? [pilulaConcluir(() => definirEdicao(false))]
        /* A pílula é a única porta VISÍVEL para montar o treino. Segurar um
           exercício também entra na edição, mas isso não ajuda quem tem um
           treino sem exercício nenhum — não há o que segurar — nem quem
           simplesmente não descobriu o gesto. */
        : (treino ? [pilula('Editar', () => definirEdicao(true))] : null)
    ),
    chipsDosTreinos(iso),
    treino
      ? (editando ? treinoEmEdicao(iso, treino) : treinoEmLeitura(iso, treino))
      : diaDeDescanso(iso, dia)
  );
}

function definirEdicao(ligado){
  definirTela({editando: Object.assign({}, Tela.editando, {treino: ligado})});
}

/* --- Chips dos treinos da semana ------------------------------------------ */
function chipsDosTreinos(iso){
  if(!Dados.treinos.length) return null;
  const diaAtual = diaDaSemana(iso).k;
  const ordenados = Dados.treinos.slice().sort(
    (a, b) => indiceDoDia(a.dia) - indiceDoDia(b.dia));

  return h('div', {class:'chips-treino'},
    ordenados.map(t => h('button', {
        class:'chip-treino' + (t.dia === diaAtual ? ' ativo' : ''),
        type:'button',
        onTap: () => definirTela({data: dataDaSemanaPara(iso, t.dia), volta: 1})
      }, t.dia + ' · ' + t.nome))
  );
}

function indiceDoDia(k){
  for(let i = 0; i < DIAS.length; i++) if(DIAS[i].k === k) return i;
  return 99;
}

function dataDaSemanaPara(iso, diaK){
  return semanaDe(iso)[indiceDoDia(diaK)];
}

/* ===========================================================================
   MODO LEITURA
   =========================================================================== */
function treinoEmLeitura(iso, treino){
  const progresso = progressoDoTreino(iso, treino);
  const voltas = voltasDoTreino(treino);
  const sessao = sessaoDe(iso, treino.id);

  return h('div', null,
    h('section', {class:'cartao-treino'},
      h('h2', {class:'treino-nome'}, treino.nome),
      h('div', {class:'chips-formato'},
        h('span', {class:'chip-formato'}, treino.formato),
        h('span', {class:'chip-formato'}, rotuloDuracao(treino.dur))
      ),
      h('div', {class:'treino-progresso'},
        barraProgresso(progresso.total ? progresso.feitos / progresso.total : 0, 'barra-salvia'),
        h('span', {class:'treino-contagem'}, progresso.feitos + ' de ' + progresso.total)
      ),
      treino.circuito ? seletorDeVolta(voltas) : null
    ),

    treino.exercicios.length
      ? h('div', {class:'lista-exercicios'},
          treino.exercicios.map((ex, i) => linhaDeExercicio(iso, treino, i, ex)))
      : estadoVazio('Treino sem exercícios',
          'Este treino ainda não tem nenhum exercício. Monte a lista para poder marcar e registrar séries.',
          [h('button', {class:'btn btn-salvia', type:'button',
             onTap: () => definirEdicao(true)}, 'Montar o treino')]),

    cartaoDaSessao(iso, treino, sessao),
    cartaoDeEvolucao(treino)
  );
}

function seletorDeVolta(voltas){
  return h('div', {class:'seletor-volta'},
    voltas.map(v => h('button', {
        class:'volta' + (Tela.volta === v ? ' ativa' : ''),
        type:'button',
        onTap: () => definirTela({volta: v})
      }, 'Volta ' + v))
  );
}

function linhaDeExercicio(iso, treino, indice, ex){
  const feito = exercicioFeito(iso, treino.id, Tela.volta, indice);
  const series = seriesDe(iso, treino.id, indice);
  const anterior = ultimaSerieAnterior(iso, treino.id, indice);

  const linhaEl = h('div', {class:'exercicio' + (feito ? ' feito' : '')},
    /* Marcar continua sendo um toque no círculo: é o caminho rápido, e quem
       não quer anotar número nenhum nunca precisa sair dele. */
    h('button', {
        class:'exercicio-circulo', type:'button',
        'aria-label': (feito ? 'Desmarcar ' : 'Marcar ') + ex.n,
        'aria-pressed': String(feito),
        onTap: () => {
          if(consumirToqueLongo()) return;
          agir(ex.n + (feito ? ' desmarcado' : ' feito'), d => {
            d.exercFeitos[iso + ':' + treino.id + ':' + Tela.volta + ':' + indice] = !feito;
          });
        }
      }, feito ? icone('check', 14) : null),

    h('div', {class:'exercicio-texto tocavel',
        'aria-label': 'Registrar séries de ' + ex.n,
        onTap: () => {
          if(consumirToqueLongo()) return;
          abrirRegistroDeSerie(iso, treino, indice, ex);
        }},
      h('span', {class:'exercicio-nome'}, ex.n),
      h('span', {class:'exercicio-alvo'}, ex.a),
      series.length
        ? h('span', {class:'exercicio-registro'}, resumirSeries(series))
        : (anterior
            ? h('span', {class:'exercicio-anterior'}, 'da última vez: ' + resumirSeries(anterior.series))
            : null)
    ),

    h('span', {class:'exercicio-seta'}, icone('seta', 15))
  );

  ligarToqueLongo(linhaEl, () => definirEdicao(true));
  return linhaEl;
}

/* ===========================================================================
   REGISTRO DE SÉRIES

   Uma folha por exercício. Mostra o que foi feito da última vez, porque é o
   número que se quer bater e ninguém lembra de cabeça.
   =========================================================================== */

let rascunhoSeries = null;

function abrirRegistroDeSerie(iso, treino, indice, ex){
  const existentes = seriesDe(iso, treino.id, indice);
  const anterior = ultimaSerieAnterior(iso, treino.id, indice);

  rascunhoSeries = existentes.length
    ? clonar(existentes)
    /* Começa espelhando a última vez: quase sempre é o ponto de partida, e
       corrigir um número é mais rápido que digitar do zero. */
    : (anterior ? clonar(anterior.series) : [{reps: 10, carga: 0}]);

  abrirFolha({
    titulo: ex.n,
    rotuloConfirmar: 'Salvar',
    corpo: () => corpoDoRegistro(ex, anterior),
    confirmar: () => salvarSeries(iso, treino, indice, ex)
  });
}

function corpoDoRegistro(ex, anterior){
  return h('div', {class:'folha-corpo'},
    h('p', {class:'nota'},
      anterior
        ? 'Alvo: ' + ex.a + ' · da última vez (' + dataCurta(anterior.data) + '): ' +
          resumirSeries(anterior.series)
        : 'Alvo: ' + ex.a + ' · primeira vez que você registra este exercício.'),

    h('div', {class:'lista-series'},
      rascunhoSeries.map((s, i) => h('div', {class:'serie'},
        h('span', {class:'serie-numero'}, (i + 1) + 'ª'),
        h('label', {class:'serie-campo'},
          h('span', {class:'campo-rotulo'}, 'Reps'),
          h('input', {class:'campo-entrada campo-numero', type:'number',
            inputmode:'numeric', min:'0', max:'999', value: String(s.reps),
            onInput: ev => { s.reps = Math.max(0, parseInt(ev.target.value, 10) || 0); }})
        ),
        h('label', {class:'serie-campo'},
          h('span', {class:'campo-rotulo'}, 'Carga (kg)'),
          h('input', {class:'campo-entrada campo-numero', type:'number',
            inputmode:'decimal', min:'0', max:'999', step:'0.5', value: String(s.carga),
            onInput: ev => { s.carga = Math.max(0, parseFloat(ev.target.value) || 0); }})
        ),
        h('button', {class:'btn-mini perigo', type:'button', 'aria-label':'Remover série ' + (i + 1),
          onTap: () => { rascunhoSeries.splice(i, 1); redesenhar(); }}, icone('fechar', 14))
      ))
    ),

    h('button', {class:'adicionar-tracejado', type:'button', onTap: () => {
        /* A série nova nasce igual à anterior — é o que quase sempre se quer. */
        const ultima = rascunhoSeries[rascunhoSeries.length - 1] || {reps: 10, carga: 0};
        rascunhoSeries.push({reps: ultima.reps, carga: ultima.carga});
        redesenhar();
      }}, icone('mais', 15), 'Mais uma série'),

    h('p', {class:'nota'}, 'Deixe a carga em 0 se o exercício é com o peso do corpo.')
  );
}

function salvarSeries(iso, treino, indice, ex){
  const validas = rascunhoSeries.filter(s => s.reps > 0);
  agir(validas.length ? ex.n + ' registrado' : ex.n + ' sem registro', d => {
    const sessao = garantirSessao(d, iso, treino.id, treino.dur);
    if(validas.length) sessao.series[indice] = validas;
    else delete sessao.series[indice];

    /* Registrar é marcar: anotar as séries e o círculo continuar vazio seria
       o app discordando de si mesmo. */
    if(validas.length){
      d.exercFeitos[iso + ':' + treino.id + ':' + Tela.volta + ':' + indice] = true;
    }
  });
  fecharFolha();
}

/* --- Cartão da sessão: duração e observação ------------------------------- */
function cartaoDaSessao(iso, treino, sessao){
  const series = totalDeSeries(sessao);
  const volume = volumeDaSessao(sessao);

  return h('section', {class:'cartao'},
    rotuloSecao('Esta sessão'),
    series
      ? h('div', {class:'sessao-resumo'},
          h('span', null, series + (series > 1 ? ' séries' : ' série')),
          volume ? h('span', null, 'volume ' + volume.toLocaleString('pt-BR') + ' kg') : null
        )
      : h('p', {class:'nota'},
          'Toque num exercício para anotar as séries. Só marcar o círculo também vale.'),

    h('div', {class:'campo-duplo'},
      h('div', {class:'campo'},
        h('span', {class:'campo-rotulo'}, 'Duração'),
        stepper(rotuloDuracao((sessao && sessao.duracao) || treino.dur), passos => agirSemAviso(d => {
          const s = garantirSessao(d, iso, treino.id, treino.dur);
          s.duracao = Math.max(5, s.duracao + passos * 5);
        }))
      ),
      h('div', {class:'campo'},
        h('span', {class:'campo-rotulo'}, 'Observação'),
        h('button', {class:'btn btn-suave largura-cheia', type:'button',
          onTap: () => abrirFolhaTexto({
            titulo: 'Observação da sessão',
            valor: (sessao && sessao.nota) || '',
            exemplo: 'Ex.: ombro incomodou na terceira série',
            limite: 200,
            aoConfirmar: nota => agir('Observação salva', d => {
              garantirSessao(d, iso, treino.id, treino.dur).nota = nota;
            })
          })},
          (sessao && sessao.nota) ? 'Editar' : 'Escrever')
      )
    ),
    sessao && sessao.nota ? h('p', {class:'sessao-nota'}, sessao.nota) : null
  );
}

/* --- Evolução: a série temporal que as sessões produzem ------------------- */
function cartaoDeEvolucao(treino){
  const sessoes = sessoesDoTreino(treino.id);
  const pontos = evolucaoDeVolume(sessoes);

  return h('section', {class:'cartao'},
    figura(
      'Volume por sessão',
      'Volume = repetições × carga, somando o treino inteiro. É o número que ' +
      'cresce quando você progride.',
      pontos.length >= 2
        ? linha(pontos.map(p => ({valor: p.volume})), {
            descricao: 'Volume das últimas ' + pontos.length + ' sessões de ' + treino.nome +
                       ', de ' + pontos[0].volume + ' a ' + pontos[pontos.length - 1].volume + ' kg',
            rotuloFinal: pontos[pontos.length - 1].volume.toLocaleString('pt-BR'),
            rotuloInicio: dataCurta(pontos[0].data),
            rotuloFim: dataCurta(pontos[pontos.length - 1].data)
          })
        : figuraVazia(pontos.length === 1
            ? 'Uma sessão registrada. A partir da segunda aparece a evolução.'
            : 'Registre as séries de pelo menos duas sessões para ver a evolução.')
    )
  );
}

/* --- Dia de descanso ------------------------------------------------------ */
function diaDeDescanso(iso, dia){
  return estadoVazio(
    'Dia de descanso',
    'Nenhum treino marcado para ' + dia.full + '. Copie um treino que você já tem ou monte um novo.',
    [
      Dados.treinos.map(t => h('button', {class:'chip-acao', type:'button',
        onTap: () => copiarTreino(iso, t)}, 'Copiar ' + t.nome)),
      h('button', {class:'btn btn-salvia', type:'button',
        onTap: () => novoTreino(iso)}, 'Novo treino')
    ]
  );
}

function copiarTreino(iso, original){
  const dia = diaDaSemana(iso);
  agir(original.nome + ' copiado para ' + dia.full, d => {
    d.treinos.push({
      id: 'tr' + Date.now().toString(36),
      dia: dia.k, nome: original.nome,
      formato: original.formato, circuito: original.circuito,
      hora: original.hora, dur: original.dur,
      exercicios: clonar(original.exercicios)
    });
  });
}

function novoTreino(iso){
  const dia = diaDaSemana(iso);
  agir('Treino criado em ' + dia.full, d => {
    d.treinos.push({
      id: 'tr' + Date.now().toString(36),
      dia: dia.k, nome: 'Treino novo',
      formato: 'Séries', circuito: false,
      hora: '17:10', dur: 40,
      exercicios: []
    });
  });
  definirEdicao(true);
}

/* ===========================================================================
   MODO EDIÇÃO
   =========================================================================== */
function treinoEmEdicao(iso, treino){
  return h('div', null,
    h('section', {class:'cartao-treino'},
      h('div', {class:'linha-renomear'},
        h('h2', {class:'treino-nome'}, treino.nome),
        h('button', {class:'btn-renomear', type:'button', onTap: () => renomearTreino(treino)},
          icone('lapis', 14), 'Renomear')
      ),
      h('div', {class:'chips-formato'},
        h('button', {class:'chip-formato acionavel', type:'button',
          onTap: () => trocarFormato(treino)}, treino.formato),
        h('span', {class:'chip-formato'}, rotuloDuracao(treino.dur))
      ),
      /* Só a duração. O horário de início vem do bloco de exercício no Dia —
         perguntar duas vezes a mesma coisa era pedir para elas divergirem. */
      h('div', {class:'campo'},
        h('span', {class:'campo-rotulo'}, 'Duração prevista'),
        stepper(rotuloDuracao(treino.dur), passos => agirSemAviso(d => {
          const t = acharTreino(d, treino.id);
          t.dur = Math.max(5, t.dur + passos * 5);
        }))
      )
    ),

    h('div', {class:'lista-exercicios'},
      treino.exercicios.map((ex, i) => h('div', {class:'exercicio exercicio-edicao'},
        h('div', {class:'exercicio-texto tocavel', 'aria-label':'Editar ' + ex.n,
            onTap: () => abrirEditorDeExercicio(treino, i, ex)},
          h('span', {class:'exercicio-nome'}, ex.n),
          h('span', {class:'exercicio-alvo'}, ex.a)
        ),
        h('div', {class:'exercicio-acoes'},
          h('button', {class:'btn-mini', type:'button', 'aria-label':'Subir ' + ex.n,
            onTap: () => moverExercicio(treino, i, -1)}, icone('cima', 14)),
          h('button', {class:'btn-mini', type:'button', 'aria-label':'Descer ' + ex.n,
            onTap: () => moverExercicio(treino, i, 1)}, icone('baixo', 14)),
          h('button', {class:'btn-mini perigo', type:'button', 'aria-label':'Remover ' + ex.n,
            onTap: () => removerExercicio(treino, i, ex)}, icone('fechar', 14))
        )
      )),
      treino.exercicios.length ? null : h('p', {class:'nota'}, 'Nenhum exercício ainda.')
    ),

    h('button', {class:'adicionar-tracejado', type:'button',
      onTap: () => abrirEditorDeExercicio(treino, null, null)},
      icone('mais', 15), 'Adicionar exercício'),

    h('button', {class:'btn btn-contorno-perigo largura-cheia', type:'button',
      onTap: () => excluirTreino(treino)}, 'Excluir este treino')
  );
}

function acharTreino(dados, id){ return dados.treinos.filter(t => t.id === id)[0]; }

/* --- Editor de exercício ---------------------------------------------------
   Nome e alvo em campos livres. Antes só dava para escolher da lista de
   sugestões, o que deixava de fora qualquer exercício fora dela — e o alvo
   não era editável de jeito nenhum. */

let rascunhoExercicio = null;
const ALVOS_SUGERIDOS = ['3 × 8–12', '3 × 10', '4 × 6', '5 × 5', '3 × 30s', '45s/lado', '2 × máx.'];

function abrirEditorDeExercicio(treino, indice, ex){
  const novo = indice === null;
  rascunhoExercicio = {n: ex ? ex.n : '', a: ex ? ex.a : '3 × 10'};

  abrirFolha({
    titulo: novo ? 'Novo exercício' : 'Editar exercício',
    rotuloConfirmar: novo ? 'Adicionar' : 'Salvar',
    corpo: () => h('div', {class:'folha-corpo'},
      h('label', {class:'campo'},
        h('span', {class:'campo-rotulo'}, 'Exercício'),
        h('input', {class:'campo-entrada', type:'text', maxlength:'60',
          value: rascunhoExercicio.n, placeholder:'Ex.: Remada curvada',
          onInput: ev => { rascunhoExercicio.n = ev.target.value; }})
      ),
      h('div', {class:'sugestoes'},
        EXERCICIOS_SUGERIDOS.map(s => h('button', {class:'sugestao', type:'button',
          onTap: () => { rascunhoExercicio.n = s.n; rascunhoExercicio.a = s.a; redesenhar(); }}, s.n))
      ),
      h('label', {class:'campo'},
        h('span', {class:'campo-rotulo'}, 'Alvo'),
        h('input', {class:'campo-entrada', type:'text', maxlength:'40',
          value: rascunhoExercicio.a, placeholder:'Ex.: 3 × 8–12, ou 45s/lado',
          onInput: ev => { rascunhoExercicio.a = ev.target.value; }})
      ),
      h('div', {class:'sugestoes'},
        ALVOS_SUGERIDOS.map(a => h('button', {class:'sugestao', type:'button',
          onTap: () => { rascunhoExercicio.a = a; redesenhar(); }}, a))
      )
    ),
    confirmar: () => {
      const nome = (rascunhoExercicio.n || '').trim();
      if(!nome){ avisar('Escreva o nome do exercício'); return; }
      const alvo = (rascunhoExercicio.a || '').trim() || '—';
      agir(novo ? nome + ' adicionado' : nome + ' salvo', d => {
        const t = acharTreino(d, treino.id);
        if(novo) t.exercicios.push({n: nome, a: alvo});
        else { t.exercicios[indice].n = nome; t.exercicios[indice].a = alvo; }
      });
      fecharFolha();
    }
  });
}

function renomearTreino(treino){
  abrirFolhaTexto({
    titulo: 'Nome do treino',
    valor: treino.nome,
    exemplo: 'Ex.: Peito e tríceps',
    sugestoes: NOMES_TREINO,
    aoConfirmar: nome => agir('Treino renomeado', d => {
      acharTreino(d, treino.id).nome = nome;
    })
  });
}

function trocarFormato(treino){
  agir('Formato alterado', d => {
    const t = acharTreino(d, treino.id);
    t.formato = FORMATOS[t.formato] || 'Séries';
    /* "Circuito" é o único formato que liga as voltas. */
    t.circuito = t.formato === 'Circuito';
  });
  definirTela({volta: 1});
}

function moverExercicio(treino, indice, direcao){
  const destino = indice + direcao;
  if(destino < 0 || destino >= treino.exercicios.length) return;
  agir('Ordem alterada', d => {
    const t = acharTreino(d, treino.id);
    const [ex] = t.exercicios.splice(indice, 1);
    t.exercicios.splice(destino, 0, ex);
  });
}

function removerExercicio(treino, indice, ex){
  agir(ex.n + ' removido', d => {
    acharTreino(d, treino.id).exercicios.splice(indice, 1);
  });
}

function excluirTreino(treino){
  const quantas = sessoesDoTreino(treino.id).length;
  abrirFolha({
    titulo: 'Excluir ' + treino.nome + '?',
    rotuloConfirmar: 'Excluir',
    corpo: () => h('div', {class:'folha-corpo'},
      h('p', {class:'nota destaque'},
        quantas
          ? 'O treino sai da semana. As ' + quantas + ' sessões já registradas ' +
            'continuam no histórico das Estatísticas.'
          : 'O treino sai da semana. Não há sessões registradas para perder.')
    ),
    confirmar: () => {
      agir(treino.nome + ' excluído', d => {
        d.treinos = d.treinos.filter(t => t.id !== treino.id);
      });
      fecharFolha();
      definirEdicao(false);
    }
  });
}
