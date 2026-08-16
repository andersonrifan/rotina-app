/* Sessões de treino e estatísticas.

   A distinção que estes testes protegem: TREINO é estrutura (vale para todas
   as quartas), SESSÃO é fato (vale para uma data). Misturar os dois faria
   editar o treino reescrever o passado. */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { carregar, Dados } from '../src/nucleo/estado.js';
import {
  sessaoDe, garantirSessao, seriesDe, ultimaSerieAnterior, resumirSeries,
  volumeDaSessao, totalDeSeries, sessoesRegistradas, sessoesDoTreino,
  semanasSeguidasComTreino, tipoDoExercicio, ehPorTempo
} from '../src/nucleo/sessoes.js';
import {
  aderenciaDoDia, aderenciaMediaDaSemana, tempoPorAreaResumido,
  evolucaoDeVolume, treinosPorSemana, adesaoAosRemedios, cardapioPreenchido
} from '../src/nucleo/estatisticas.js';
import { rotinaDeTeste } from './ajuda.js';

const QUARTA_1 = '2026-08-12';
const QUARTA_2 = '2026-08-19';
const QUARTA_3 = '2026-08-26';

beforeEach(() => { carregar(rotinaDeTeste()); });
afterEach(() => { vi.useRealTimers(); });

/* Grava uma sessão direto, como a tela faria. */
function registrar(iso, treinoId, series, duracao){
  const s = garantirSessao(Dados, iso, treinoId, duracao || 40);
  Object.keys(series).forEach(i => { s.series[i] = series[i]; });
  return s;
}

describe('sessão é fato, treino é estrutura', () => {
  it('não existe sessão antes de registrar', () => {
    expect(sessaoDe(QUARTA_1, 't1')).toBe(null);
    expect(seriesDe(QUARTA_1, 't1', 0)).toEqual([]);
  });

  it('registrar numa data não afeta outra', () => {
    registrar(QUARTA_1, 't1', {0: [{reps: 10, carga: 20}]});
    expect(seriesDe(QUARTA_1, 't1', 0)).toHaveLength(1);
    expect(seriesDe(QUARTA_2, 't1', 0)).toEqual([]);
  });

  it('editar o treino não apaga o que já foi registrado', () => {
    registrar(QUARTA_1, 't1', {0: [{reps: 10, carga: 20}]});
    Dados.treinos[0].nome = 'Outro nome';
    Dados.treinos[0].exercicios.push({n: 'Ex C', a: '3 × 10'});
    expect(seriesDe(QUARTA_1, 't1', 0)).toHaveLength(1);
  });

  it('excluir o treino não apaga o histórico', () => {
    registrar(QUARTA_1, 't1', {0: [{reps: 10, carga: 20}]});
    Dados.treinos = [];
    expect(sessoesRegistradas()).toHaveLength(1);
  });
});

describe('a última vez', () => {
  it('devolve a sessão anterior mais recente', () => {
    registrar(QUARTA_1, 't1', {0: [{reps: 8, carga: 20}]});
    registrar(QUARTA_2, 't1', {0: [{reps: 9, carga: 20}]});
    const anterior = ultimaSerieAnterior(QUARTA_3, 't1', 0);
    expect(anterior.data).toBe(QUARTA_2);
    expect(anterior.series[0].reps).toBe(9);
  });

  it('ignora a própria data — é a ÚLTIMA, não a de hoje', () => {
    registrar(QUARTA_1, 't1', {0: [{reps: 8, carga: 20}]});
    registrar(QUARTA_2, 't1', {0: [{reps: 9, carga: 20}]});
    expect(ultimaSerieAnterior(QUARTA_2, 't1', 0).data).toBe(QUARTA_1);
  });

  it('devolve null quando é a primeira vez', () => {
    expect(ultimaSerieAnterior(QUARTA_1, 't1', 0)).toBe(null);
  });

  it('não confunde exercícios diferentes', () => {
    registrar(QUARTA_1, 't1', {0: [{reps: 8, carga: 20}]});
    expect(ultimaSerieAnterior(QUARTA_2, 't1', 1)).toBe(null);
  });
});

describe('resumo das séries', () => {
  it('junta quando reps e carga se repetem', () => {
    expect(resumirSeries([{reps:8,carga:20},{reps:8,carga:20},{reps:8,carga:20}]))
      .toBe('3 × 8 · 20 kg');
  });

  it('lista quando as repetições variam', () => {
    expect(resumirSeries([{reps:8,carga:20},{reps:7,carga:20},{reps:5,carga:20}]))
      .toBe('8, 7, 5 · 20 kg');
  });

  it('omite a carga no peso do corpo', () => {
    expect(resumirSeries([{reps:12,carga:0},{reps:12,carga:0}])).toBe('2 × 12');
  });

  it('mostra a carga máxima quando ela sobe entre séries', () => {
    expect(resumirSeries([{reps:8,carga:20},{reps:8,carga:25}]))
      .toBe('2 × 8 · até 25 kg');
  });

  it('sem séries, sem texto', () => {
    expect(resumirSeries([])).toBe('');
  });
});

describe('volume', () => {
  it('soma repetições × carga do treino inteiro', () => {
    const s = registrar(QUARTA_1, 't1', {
      0: [{reps: 10, carga: 20}, {reps: 10, carga: 20}],   // 400
      1: [{reps: 8, carga: 30}]                            // 240
    });
    expect(volumeDaSessao(s)).toBe(640);
    expect(totalDeSeries(s)).toBe(3);
  });

  it('peso do corpo não gera volume, mas gera série', () => {
    const s = registrar(QUARTA_1, 't1', {0: [{reps: 12, carga: 0}]});
    expect(volumeDaSessao(s)).toBe(0);
    expect(totalDeSeries(s)).toBe(1);
  });
});

describe('evolução', () => {
  it('devolve os pontos em ordem cronológica', () => {
    registrar(QUARTA_1, 't1', {0: [{reps: 8, carga: 20}]});    // 160
    registrar(QUARTA_2, 't1', {0: [{reps: 10, carga: 20}]});   // 200
    const pontos = evolucaoDeVolume(sessoesDoTreino('t1'));
    expect(pontos.map(p => p.volume)).toEqual([160, 200]);
    expect(pontos[0].data).toBe(QUARTA_1);
  });

  it('sessão sem carga fica fora do gráfico de volume', () => {
    registrar(QUARTA_1, 't1', {0: [{reps: 12, carga: 0}]});
    expect(evolucaoDeVolume(sessoesDoTreino('t1'))).toHaveLength(0);
  });
});

describe('aderência: dia futuro não conta', () => {
  it('devolve null para dia que ainda não chegou', () => {
    vi.setSystemTime(new Date('2026-08-17T12:00:00'));
    expect(aderenciaDoDia('2026-08-20')).toBe(null);
  });

  it('a média ignora os dias futuros', () => {
    vi.setSystemTime(new Date('2026-08-17T23:00:00'));   // segunda à noite
    const media = aderenciaMediaDaSemana('2026-08-17');
    // Só a segunda já passou: a média é sobre 1 dia, não sobre 7
    expect(media.dias).toBe(1);
  });

  it('sem isso, toda segunda pareceria 14%', () => {
    vi.setSystemTime(new Date('2026-08-17T23:00:00'));
    const media = aderenciaMediaDaSemana('2026-08-17');
    expect(media.fracao).toBeGreaterThan(0.5);
  });
});

describe('tempo por área', () => {
  it('ordena do maior para o menor', () => {
    const areas = tempoPorAreaResumido('2026-08-17');
    const minutos = areas.map(a => a.minutos);
    expect(minutos).toEqual([...minutos].sort((a, b) => b - a));
  });

  it('dobra a cauda em "Outros" em vez de inventar mais cores', () => {
    const areas = tempoPorAreaResumido('2026-08-17', 2);
    expect(areas).toHaveLength(3);
    expect(areas[2].rotulo).toBe('Outros');
  });

  it('e "Outros" carrega a soma da cauda, não some com ela', () => {
    const todas = tempoPorAreaResumido('2026-08-17', 99);
    const resumidas = tempoPorAreaResumido('2026-08-17', 2);
    const somaTodas = todas.reduce((s, a) => s + a.minutos, 0);
    const somaResumidas = resumidas.reduce((s, a) => s + a.minutos, 0);
    expect(somaResumidas).toBe(somaTodas);
  });
});

describe('treinos por semana', () => {
  it('conta só sessão com séries registradas', () => {
    vi.setSystemTime(new Date('2026-08-19T12:00:00'));
    garantirSessao(Dados, QUARTA_2, 't1', 40);          // sessão vazia
    expect(treinosPorSemana(QUARTA_2, 2).pop().treinos).toBe(0);

    registrar(QUARTA_2, 't1', {0: [{reps: 8, carga: 20}]});
    expect(treinosPorSemana(QUARTA_2, 2).pop().treinos).toBe(1);
  });

  it('devolve uma entrada por semana pedida', () => {
    expect(treinosPorSemana(QUARTA_2, 6)).toHaveLength(6);
  });
});

describe('sequência de semanas', () => {
  it('conta semanas seguidas com treino', () => {
    registrar(QUARTA_2, 't1', {0: [{reps: 8, carga: 20}]});
    registrar(QUARTA_1, 't1', {0: [{reps: 8, carga: 20}]});
    expect(semanasSeguidasComTreino(QUARTA_2)).toBe(2);
  });

  it('para na primeira semana vazia', () => {
    registrar(QUARTA_3, 't1', {0: [{reps: 8, carga: 20}]});
    registrar(QUARTA_1, 't1', {0: [{reps: 8, carga: 20}]});
    // a semana do meio ficou sem treino
    expect(semanasSeguidasComTreino(QUARTA_3)).toBe(1);
  });

  it('zero quando nunca houve treino', () => {
    expect(semanasSeguidasComTreino(QUARTA_2)).toBe(0);
  });
});

describe('outras medidas', () => {
  it('adesão aos remédios ignora dias futuros', () => {
    vi.setSystemTime(new Date('2026-08-17T12:00:00'));
    const a = adesaoAosRemedios('2026-08-17');
    // 2 remédios × 1 dia já vivido
    expect(a.previstas).toBe(2);
  });

  it('cardápio preenchido conta as células definidas', () => {
    const c = cardapioPreenchido();
    // a rotina de teste define almoço em Seg e Ter
    expect(c.definidas).toBe(2);
    expect(c.total).toBe(7 * Dados.slots.length);
  });
});

/* ===========================================================================
   EXERCÍCIO POR TEMPO

   Prancha e alongamento não têm repetição — têm segundos. Anotar "30" num
   campo chamado "Reps" era escrever um número que queria dizer outra coisa,
   e somá-lo ao volume fazia o gráfico subir sem ninguém ter ficado mais forte.
   =========================================================================== */

describe('exercícios por tempo', () => {
  it('o tipo declarado no exercício manda', () => {
    expect(tipoDoExercicio({n:'Prancha', a:'3 × 10', tipo:'tempo'})).toBe('tempo');
    expect(tipoDoExercicio({n:'Barra', a:'3 × 30s', tipo:'reps'})).toBe('reps');
  });

  it('sem declaração, o alvo em segundos responde sozinho', () => {
    // Vale para tudo que já estava montado antes de o tipo existir.
    expect(ehPorTempo({n:'Prancha frontal', a:'3 × 30s'})).toBe(true);
    expect(ehPorTempo({n:'Alongamento',     a:'45s/lado'})).toBe(true);
    expect(ehPorTempo({n:'Remada',          a:'3 × 8–12'})).toBe(false);
    expect(ehPorTempo({n:'Afundo',          a:'3 × 10/perna'})).toBe(false);
  });

  it('exercício que não existe mais não quebra a conta', () => {
    expect(tipoDoExercicio(null)).toBe('reps');
  });

  it('o resumo diz segundos, não repetições', () => {
    const series = [{reps:30, carga:0}, {reps:30, carga:0}, {reps:30, carga:0}];
    expect(resumirSeries(series, {a:'3 × 30s'})).toBe('3 × 30s');
    expect(resumirSeries(series, {a:'3 × 10'})).toBe('3 × 30');
  });

  it('séries desiguais por tempo também levam a unidade', () => {
    const series = [{reps:40, carga:0}, {reps:30, carga:0}];
    expect(resumirSeries(series, {a:'30s'})).toBe('40s, 30s');
  });

  it('a carga continua aparecendo quando existe', () => {
    const series = [{reps:30, carga:10}, {reps:30, carga:10}];
    expect(resumirSeries(series, {a:'30s'})).toBe('2 × 30s · 10 kg');
  });

  it('segundos não entram no volume', () => {
    // O treino de teste tem dois exercícios; o segundo passa a ser por tempo.
    Dados.treinos[0].exercicios[1] = {n:'Prancha', a:'3 × 30s', tipo:'tempo'};
    registrar(QUARTA_1, 't1', {
      0: [{reps:10, carga:20}],          // 200 de volume
      1: [{reps:60, carga:10}]           // por tempo: fora da conta
    });
    expect(volumeDaSessao(sessaoDe(QUARTA_1, 't1'))).toBe(200);
  });

  it('mas continuam contando como séries feitas', () => {
    Dados.treinos[0].exercicios[1] = {n:'Prancha', a:'3 × 30s', tipo:'tempo'};
    registrar(QUARTA_1, 't1', {0: [{reps:10, carga:20}], 1: [{reps:60, carga:0}]});
    expect(totalDeSeries(sessaoDe(QUARTA_1, 't1'))).toBe(2);
  });
});
