/* ===========================================================================
   SESSÕES DE TREINO — o que foi feito, não o que estava planejado

   O treino é ESTRUTURA: "Força A tem 8 exercícios, o terceiro é barra fixa,
   alvo 5 × 2". Isso vale para todas as quartas.

   A sessão é FATO: "na quarta dia 19 eu fiz 5, 4, 4, 3 e 3 repetições, com
   40 min de duração". Isso vale para aquela data e para mais nenhuma.

   Separar os dois é o que permite mudar o treino sem reescrever o passado, e
   é o que dá série temporal para as estatísticas — sem sessões gravadas não
   há o que colocar num gráfico.
   =========================================================================== */

import { Dados } from './estado.js';
import { hojeISO, diaDaSemana } from './tempo.js';

/** Chave de uma sessão: uma data, um treino. */
export function chaveDaSessao(iso, treinoId){
  return iso + ':' + treinoId;
}

/** A sessão daquela data, ou null se ainda não houve. */
export function sessaoDe(iso, treinoId){
  return Dados.sessoes[chaveDaSessao(iso, treinoId)] || null;
}

/** A sessão daquela data, criando-a vazia se preciso. Só use dentro de agir(). */
export function garantirSessao(dados, iso, treinoId, duracaoPadrao){
  const chave = chaveDaSessao(iso, treinoId);
  if(!dados.sessoes[chave]){
    dados.sessoes[chave] = {
      data: iso,
      treinoId: treinoId,
      series: {},          // índice do exercício → [{reps, carga}]
      duracao: duracaoPadrao || 0,
      nota: ''
    };
  }
  return dados.sessoes[chave];
}

/** As séries registradas para um exercício naquela data. */
export function seriesDe(iso, treinoId, indice){
  const s = sessaoDe(iso, treinoId);
  return (s && s.series[indice]) || [];
}

/**
 * A última sessão ANTERIOR a `iso` que tenha registro daquele exercício.
 *
 * É o número que mais importa na hora de treinar: "da última vez foram 3 × 8
 * com 20 kg". Sem isso a pessoa precisa lembrar, e não lembra.
 */
export function ultimaSerieAnterior(iso, treinoId, indice){
  const anteriores = Object.keys(Dados.sessoes)
    .map(k => Dados.sessoes[k])
    .filter(s => s.treinoId === treinoId && s.data < iso &&
                 s.series[indice] && s.series[indice].length)
    .sort((a, b) => (a.data < b.data ? 1 : -1));
  return anteriores.length
    ? {data: anteriores[0].data, series: anteriores[0].series[indice]}
    : null;
}

/* ===========================================================================
   EXERCÍCIO POR TEMPO

   Prancha, isometria e alongamento não têm repetição: têm segundos. O
   registro só oferecia "Reps", e anotar "30" numa prancha de 30 segundos era
   escrever um número que queria dizer outra coisa.

   O tipo mora no exercício (estrutura), não na série (fato), porque prancha é
   por tempo em toda quarta-feira — não só naquela.

   Para os exercícios que já existem, o ALVO responde sozinho: "3 × 30s" e
   "45s/lado" dizem segundos com todas as letras. Assim ninguém precisa voltar
   e reclassificar o que já montou.
   =========================================================================== */

const ALVO_EM_SEGUNDOS = /\d+\s*s(eg)?\b/i;

export function tipoDoExercicio(ex){
  if(!ex) return 'reps';
  if(ex.tipo) return ex.tipo;
  return ALVO_EM_SEGUNDOS.test(ex.a || '') ? 'tempo' : 'reps';
}

export function ehPorTempo(ex){ return tipoDoExercicio(ex) === 'tempo'; }

/** O exercício de índice `i` do treino de uma sessão, se ainda existir. */
function exercicioDaSessao(sessao, indice){
  const treino = Dados.treinos.filter(t => t.id === sessao.treinoId)[0];
  return treino ? treino.exercicios[indice] : null;
}

/** Resumo curto: "3 × 8 · 20 kg", "8, 7, 6" ou "3 × 30s". */
export function resumirSeries(series, ex){
  if(!series || !series.length) return '';
  const tempo = ehPorTempo(ex);
  const unidade = tempo ? 's' : '';
  const valores = series.map(s => s.reps);
  const cargas = series.map(s => s.carga).filter(c => c > 0);
  const iguais = valores.every(r => r === valores[0]);
  const mesmaCarga = cargas.length === series.length && cargas.every(c => c === cargas[0]);

  const parte = iguais
    ? series.length + ' × ' + valores[0] + unidade
    : valores.map(v => v + unidade).join(', ');
  if(!cargas.length) return parte;
  if(mesmaCarga) return parte + ' · ' + cargas[0] + ' kg';
  return parte + ' · até ' + Math.max(...cargas) + ' kg';
}

/**
 * Volume da sessão: soma de repetições × carga. É o número que cresce.
 *
 * Séries por tempo ficam de fora: 30 segundos × 10 kg não é 300 de nada, e
 * somar isso ao volume das repetições faria o gráfico subir por um exercício
 * que nem ficou mais pesado.
 */
export function volumeDaSessao(sessao){
  if(!sessao) return 0;
  let total = 0;
  Object.keys(sessao.series).forEach(i => {
    if(ehPorTempo(exercicioDaSessao(sessao, i))) return;
    sessao.series[i].forEach(s => { total += (s.reps || 0) * (s.carga || 0); });
  });
  return total;
}

/** Quantas séries a sessão tem no total. */
export function totalDeSeries(sessao){
  if(!sessao) return 0;
  return Object.keys(sessao.series)
    .reduce((n, i) => n + sessao.series[i].length, 0);
}

/** Toda sessão gravada, da mais recente para a mais antiga. */
export function sessoesRegistradas(){
  return Object.keys(Dados.sessoes)
    .map(k => Dados.sessoes[k])
    .filter(s => totalDeSeries(s) > 0)
    .sort((a, b) => (a.data < b.data ? 1 : -1));
}

/** Sessões de um treino específico, da mais antiga para a mais recente. */
export function sessoesDoTreino(treinoId){
  return sessoesRegistradas()
    .filter(s => s.treinoId === treinoId)
    .reverse();
}

/**
 * A sequência de treinos: quantas semanas seguidas, contando de trás pra
 * frente, tiveram ao menos uma sessão registrada.
 */
export function semanasSeguidasComTreino(iso){
  const base = iso || hojeISO();
  const porSemana = {};
  sessoesRegistradas().forEach(s => { porSemana[semanaChave(s.data)] = true; });

  let n = 0;
  let cursor = base;
  /* Um limite de 52 evita laço infinito se algo inesperado voltar do futuro. */
  for(let i = 0; i < 52; i++){
    if(!porSemana[semanaChave(cursor)]) break;
    n++;
    cursor = recuarUmaSemana(cursor);
  }
  return n;
}

function semanaChave(iso){
  const d = new Date(iso + 'T12:00:00');
  const diaISO = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - diaISO);
  return d.toISOString().slice(0, 10);
}

function recuarUmaSemana(iso){
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
}

/** O treino previsto para uma data, pelo dia da semana. */
export function treinoPrevistoEm(iso){
  const k = diaDaSemana(iso).k;
  return Dados.treinos.filter(t => t.dia === k)[0] || null;
}
