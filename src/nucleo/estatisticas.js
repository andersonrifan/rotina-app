/* ===========================================================================
   ESTATÍSTICAS — os números que as telas mostram

   Só contas. Nenhuma decisão de desenho mora aqui, e nenhuma tela faz conta
   por conta própria: assim o número do Início e o do Perfil não podem
   divergir, que é o modo clássico de um painel perder a confiança.

   Uma regra atravessa o arquivo: DIA FUTURO NÃO CONTA. Incluir o resto da
   semana faria toda segunda-feira parecer um fracasso de 14% de aderência.
   =========================================================================== */

import { Dados } from './estado.js';
import { hojeISO, semanaDe, ehFuturo, diaDaSemana, somarDias } from './tempo.js';
import { blocosDoDia, statusDoBloco, refeicaoFeita, pratoDe, totaisDoDia } from './modelo.js';
import { sessoesRegistradas, volumeDaSessao, totalDeSeries,
         tipoDoExercicio, exercicioDaSessao } from './sessoes.js';

/* --- Aderência ------------------------------------------------------------
   A fração dos blocos do dia marcados como feitos. Só conta bloco que já
   passou: cobrar às 9h da manhã o jantar das 21h não mede nada. */

export function aderenciaDoDia(iso){
  if(ehFuturo(iso)) return null;
  const blocos = blocosDoDia(iso);
  if(!blocos.length) return null;
  const feitos = blocos.filter(b => statusDoBloco(iso, b) === 'feito').length;
  return {feitos: feitos, total: blocos.length, fracao: feitos / blocos.length};
}

/** Aderência dia a dia da semana. Dias futuros entram como null. */
export function aderenciaDaSemana(iso){
  return semanaDe(iso).map((d, i) => ({
    data: d,
    dia: diaDaSemana(d),
    letra: ['S','T','Q','Q','S','S','D'][i],
    aderencia: aderenciaDoDia(d)
  }));
}

/** Média da semana, ignorando os dias que ainda não chegaram. */
export function aderenciaMediaDaSemana(iso){
  const dias = aderenciaDaSemana(iso).filter(d => d.aderencia);
  if(!dias.length) return null;
  const soma = dias.reduce((s, d) => s + d.aderencia.fracao, 0);
  return {fracao: soma / dias.length, dias: dias.length};
}

/* --- Tempo por área -------------------------------------------------------
   Quantos minutos a semana dedica a cada categoria. Devolve ordenado do
   maior pro menor, já que a pergunta é sempre "onde vai meu tempo". */

export function tempoPorArea(iso){
  const soma = {};
  semanaDe(iso).forEach(d => {
    blocosDoDia(d).forEach(b => {
      soma[b.cat] = (soma[b.cat] || 0) + b.dur;
    });
  });
  return Object.keys(soma)
    .map(cat => ({cat: cat, minutos: soma[cat]}))
    .sort((a, b) => b.minutos - a.minutos);
}

/**
 * Dobra a cauda em "Outros".
 *
 * Mais de sete fatias vira lista de compras, não gráfico — e o próprio guia
 * de visualização manda dobrar a cauda em vez de inventar mais cores.
 */
export function tempoPorAreaResumido(iso, quantas){
  const todas = tempoPorArea(iso);
  const limite = quantas || 6;
  if(todas.length <= limite + 1) return todas;
  const cabeca = todas.slice(0, limite);
  const cauda = todas.slice(limite).reduce((s, a) => s + a.minutos, 0);
  return cabeca.concat([{cat: 'outros', minutos: cauda, rotulo: 'Outros'}]);
}

/* --- Treino --------------------------------------------------------------- */

/** Sessões registradas nos últimos `dias` dias. */
export function sessoesRecentes(iso, dias){
  const limite = somarDias(iso || hojeISO(), -(dias || 30));
  return sessoesRegistradas().filter(s => s.data >= limite);
}

/** Volume por sessão de um treino — a série temporal do gráfico de evolução. */
export function evolucaoDeVolume(sessoes){
  return sessoes
    .map(s => ({data: s.data, volume: volumeDaSessao(s), series: totalDeSeries(s)}))
    .filter(p => p.volume > 0);
}

/** Quantos treinos por semana, nas últimas `semanas` semanas. */
export function treinosPorSemana(iso, semanas){
  const base = iso || hojeISO();
  const n = semanas || 6;
  const saida = [];
  for(let i = n - 1; i >= 0; i--){
    const dataDaSemana = somarDias(base, -7 * i);
    const dias = semanaDe(dataDaSemana);
    const feitos = sessoesRegistradas().filter(s => dias.indexOf(s.data) >= 0).length;
    saida.push({semana: dias[0], treinos: feitos});
  }
  return saida;
}

/* --- Comida --------------------------------------------------------------- */

/** kcal consumidas por dia na semana. Dias futuros entram como null. */
export function kcalDaSemana(iso){
  return semanaDe(iso).map((d, i) => ({
    data: d,
    letra: ['S','T','Q','Q','S','S','D'][i],
    kcal: ehFuturo(d) ? null : totaisDoDia(d).kcal
  }));
}

/** Média de kcal dos dias que já passaram e tiveram alguma refeição marcada. */
export function kcalMediaDaSemana(iso){
  const comValor = kcalDaSemana(iso).filter(d => d.kcal !== null && d.kcal > 0);
  if(!comValor.length) return null;
  return Math.round(comValor.reduce((s, d) => s + d.kcal, 0) / comValor.length);
}

/** Quantas refeições da semana já têm prato definido no cardápio. */
export function cardapioPreenchido(){
  let definidas = 0, total = 0;
  Object.keys(Dados.cardapio).forEach(diaK => {
    Dados.slots.forEach(slot => {
      total++;
      if(pratoDe(diaK, slot.id)) definidas++;
    });
  });
  return {definidas: definidas, total: total, fracao: total ? definidas / total : 0};
}

/* --- Remédios ------------------------------------------------------------- */

/** Fração das doses da semana já tomadas, ignorando dias futuros. */
export function adesaoAosRemedios(iso){
  if(!Dados.remedios.length) return null;
  let tomadas = 0, previstas = 0;
  semanaDe(iso).forEach(d => {
    if(ehFuturo(d)) return;
    Dados.remedios.forEach(m => {
      previstas++;
      const chave = d + ':' + m.id;
      const marcado = Dados.tomados[chave];
      if(marcado === undefined ? d < hojeISO() : marcado) tomadas++;
    });
  });
  return previstas ? {tomadas: tomadas, previstas: previstas, fracao: tomadas / previstas} : null;
}

/** Remédios que vão acabar antes de `dias`. */
export function remediosAcabando(dias){
  const limite = dias || 7;
  return Dados.remedios
    .filter(m => m.diasRestantes !== undefined && m.diasRestantes <= limite)
    .sort((a, b) => a.diasRestantes - b.diasRestantes);
}

/* --- Refeições marcadas --------------------------------------------------- */

export function refeicoesDaSemana(iso){
  let feitas = 0, previstas = 0;
  semanaDe(iso).forEach(d => {
    if(ehFuturo(d)) return;
    Dados.slots.forEach(slot => {
      previstas++;
      if(refeicaoFeita(d, slot)) feitas++;
    });
  });
  return previstas ? {feitas: feitas, previstas: previstas, fracao: feitas / previstas} : null;
}


/* ===========================================================================
   EVOLUÇÃO DO TREINO

   O app registrava séries desde a rodada das sessões, e as estatísticas
   mostravam uma coisa só: quantos treinos por semana. Isso responde
   "apareci?", que é a pergunta do primeiro mês. Depois dela vem "estou
   ficando mais forte?", e essa exige olhar CARGA e VOLUME ao longo do tempo.

   O nome do exercício vem da estrutura do treino, e a série vem do índice
   dentro dela. Se um exercício foi removido do meio da lista, os índices
   antigos passam a apontar para o vizinho — é a mesma limitação que os
   blocos fixos têm, e a razão de remover exercício avisar antes.
   =========================================================================== */

/** Volume total (kg) por semana, nas últimas `semanas` semanas. */
export function volumePorSemana(iso, semanas){
  const base = iso || hojeISO();
  const n = semanas || 8;
  const saida = [];
  for(let i = n - 1; i >= 0; i--){
    const dias = semanaDe(somarDias(base, -7 * i));
    const daSemana = sessoesRegistradas().filter(s => dias.indexOf(s.data) >= 0);
    saida.push({
      semana: dias[0],
      volume: daSemana.reduce((t, s) => t + volumeDaSessao(s), 0),
      series: daSemana.reduce((t, s) => t + totalDeSeries(s), 0),
      minutos: daSemana.reduce((t, s) => t + (s.duracao || 0), 0)
    });
  }
  return saida;
}

/** Totais do período: o retrato de quanto trabalho foi feito. */
export function resumoDoTreino(iso, dias){
  const sessoes = sessoesRecentes(iso, dias || 30);
  return {
    sessoes: sessoes.length,
    series: sessoes.reduce((t, s) => t + totalDeSeries(s), 0),
    volume: sessoes.reduce((t, s) => t + volumeDaSessao(s), 0),
    minutos: sessoes.reduce((t, s) => t + (s.duracao || 0), 0)
  };
}

/**
 * O recorde de cada exercício: a maior carga já registrada, e quantas
 * repetições foram feitas com ela.
 *
 * É o número que se persegue, e o app tinha todos os dados para calcular sem
 * nunca ter mostrado. Exercício sem carga (peso do corpo, prancha) entra pela
 * melhor marca de repetições ou segundos.
 */
export function recordes(){
  const porNome = {};
  sessoesRegistradas().forEach(sessao => {
    Object.keys(sessao.series).forEach(exId => {
      const ex = exercicioDaSessao(sessao, exId);
      if(!ex) return;
      const atual = porNome[ex.n] || {
        nome: ex.n, tipo: tipoDoExercicio(ex),
        carga: 0, reps: 0, data: sessao.data, sessoes: 0
      };
      atual.sessoes++;
      sessao.series[exId].forEach(serie => {
        const carga = serie.carga || 0;
        const reps = serie.reps || 0;
        /* Carga maior manda. Empatou na carga, mais repetições manda —
           é assim que se lê progresso quando o peso não muda. */
        if(carga > atual.carga || (carga === atual.carga && reps > atual.reps)){
          atual.carga = carga;
          atual.reps = reps;
          atual.data = sessao.data;
        }
      });
      porNome[ex.n] = atual;
    });
  });

  return Object.keys(porNome).map(n => porNome[n])
    .sort((a, b) => (b.carga - a.carga) || (b.reps - a.reps));
}

/**
 * A série temporal de UM exercício: a melhor carga de cada sessão, e o
 * volume dele naquele dia.
 */
export function evolucaoDoExercicio(nome){
  const pontos = [];
  sessoesRegistradas().slice().reverse().forEach(sessao => {
    Object.keys(sessao.series).forEach(exId => {
      const ex = exercicioDaSessao(sessao, exId);
      if(!ex || ex.n !== nome) return;
      const series = sessao.series[exId];
      const melhor = series.reduce((m, s) => Math.max(m, s.carga || 0), 0);
      const repsMax = series.reduce((m, s) => Math.max(m, s.reps || 0), 0);
      pontos.push({
        data: sessao.data,
        carga: melhor,
        reps: repsMax,
        volume: series.reduce((t, s) => t + (s.reps || 0) * (s.carga || 0), 0),
        series: series.length
      });
    });
  });
  return pontos;
}
