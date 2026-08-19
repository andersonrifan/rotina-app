/* Sessões de treino e estatísticas.

   A distinção que estes testes protegem: TREINO é estrutura (vale para todas
   as quartas), SESSÃO é fato (vale para uma data). Misturar os dois faria
   editar o treino reescrever o passado. */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { carregar, Dados } from '../src/nucleo/estado.js';
import { migrar, VERSAO_ESQUEMA } from '../src/nucleo/armazem.js';
import { exercicioFeito } from '../src/nucleo/modelo.js';
import {
  sessaoDe, garantirSessao, seriesDe, ultimaSerieAnterior, resumirSeries,
  volumeDaSessao, totalDeSeries, sessoesRegistradas, sessoesDoTreino,
  semanasSeguidasComTreino, tipoDoExercicio, ehPorTempo
} from '../src/nucleo/sessoes.js';
import {
  aderenciaDoDia, aderenciaMediaDaSemana, tempoPorAreaResumido,
  evolucaoDeVolume, treinosPorSemana, adesaoAosRemedios, cardapioPreenchido,
  volumePorSemana, resumoDoTreino, recordes, evolucaoDoExercicio
} from '../src/nucleo/estatisticas.js';
import { rotinaDeTeste } from './ajuda.js';

const QUARTA_1 = '2026-08-12';
const QUARTA_2 = '2026-08-19';
const QUARTA_3 = '2026-08-26';

beforeEach(() => { carregar(rotinaDeTeste()); });
afterEach(() => { vi.useRealTimers(); });

/* Grava uma sessão direto, como a tela faria. */
/* Os testes falam em ÍNDICE porque é assim que se lê o treino ("o primeiro
   exercício"); os dados guardam por ID. A tradução mora aqui, num lugar só. */
function idDoExercicio(treinoId, indice){
  const t = Dados.treinos.filter(x => x.id === treinoId)[0];
  return t.exercicios[indice].id;
}

function registrar(iso, treinoId, series, duracao){
  const s = garantirSessao(Dados, iso, treinoId, duracao || 40);
  Object.keys(series).forEach(i => { s.series[idDoExercicio(treinoId, i)] = series[i]; });
  return s;
}

describe('sessão é fato, treino é estrutura', () => {
  it('não existe sessão antes de registrar', () => {
    expect(sessaoDe(QUARTA_1, 't1')).toBe(null);
    expect(seriesDe(QUARTA_1, 't1', idDoExercicio('t1', 0))).toEqual([]);
  });

  it('registrar numa data não afeta outra', () => {
    registrar(QUARTA_1, 't1', {0: [{reps: 10, carga: 20}]});
    expect(seriesDe(QUARTA_1, 't1', idDoExercicio('t1', 0))).toHaveLength(1);
    expect(seriesDe(QUARTA_2, 't1', idDoExercicio('t1', 0))).toEqual([]);
  });

  it('editar o treino não apaga o que já foi registrado', () => {
    registrar(QUARTA_1, 't1', {0: [{reps: 10, carga: 20}]});
    Dados.treinos[0].nome = 'Outro nome';
    Dados.treinos[0].exercicios.push({n: 'Ex C', a: '3 × 10'});
    expect(seriesDe(QUARTA_1, 't1', idDoExercicio('t1', 0))).toHaveLength(1);
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
    const anterior = ultimaSerieAnterior(QUARTA_3, 't1', idDoExercicio('t1', 0));
    expect(anterior.data).toBe(QUARTA_2);
    expect(anterior.series[0].reps).toBe(9);
  });

  it('ignora a própria data — é a ÚLTIMA, não a de hoje', () => {
    registrar(QUARTA_1, 't1', {0: [{reps: 8, carga: 20}]});
    registrar(QUARTA_2, 't1', {0: [{reps: 9, carga: 20}]});
    expect(ultimaSerieAnterior(QUARTA_2, 't1', idDoExercicio('t1', 0)).data).toBe(QUARTA_1);
  });

  it('devolve null quando é a primeira vez', () => {
    expect(ultimaSerieAnterior(QUARTA_1, 't1', idDoExercicio('t1', 0))).toBe(null);
  });

  it('não confunde exercícios diferentes', () => {
    registrar(QUARTA_1, 't1', {0: [{reps: 8, carga: 20}]});
    expect(ultimaSerieAnterior(QUARTA_2, 't1', idDoExercicio('t1', 1))).toBe(null);
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
    Object.assign(Dados.treinos[0].exercicios[1], {n:'Prancha', a:'3 × 30s', tipo:'tempo'});
    registrar(QUARTA_1, 't1', {
      0: [{reps:10, carga:20}],          // 200 de volume
      1: [{reps:60, carga:10}]           // por tempo: fora da conta
    });
    expect(volumeDaSessao(sessaoDe(QUARTA_1, 't1'))).toBe(200);
  });

  it('mas continuam contando como séries feitas', () => {
    Object.assign(Dados.treinos[0].exercicios[1], {n:'Prancha', a:'3 × 30s', tipo:'tempo'});
    registrar(QUARTA_1, 't1', {0: [{reps:10, carga:20}], 1: [{reps:60, carga:0}]});
    expect(totalDeSeries(sessaoDe(QUARTA_1, 't1'))).toBe(2);
  });
});

/* ===========================================================================
   EVOLUÇÃO DO TREINO

   "Apareci?" é a pergunta do primeiro mês e já tinha resposta. "Estou ficando
   mais forte?" exige carga e volume ao longo do tempo — o app registrava os
   dois e mostrava nenhum.
   =========================================================================== */

describe('evolução do treino', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date(QUARTA_3 + 'T20:00:00'));
  });

  it('sem sessão nenhuma, os totais são zero e nada quebra', () => {
    const r = resumoDoTreino(QUARTA_3, 30);
    expect(r).toEqual({sessoes: 0, series: 0, volume: 0, minutos: 0});
    expect(recordes()).toEqual([]);
    expect(evolucaoDoExercicio('Ex A')).toEqual([]);
  });

  it('o resumo soma sessões, séries, volume e minutos do período', () => {
    registrar(QUARTA_2, 't1', {0: [{reps:10, carga:20}, {reps:8, carga:20}]}, 45);
    registrar(QUARTA_3, 't1', {0: [{reps:10, carga:25}]}, 50);
    const r = resumoDoTreino(QUARTA_3, 30);
    expect(r.sessoes).toBe(2);
    expect(r.series).toBe(3);
    expect(r.volume).toBe(10*20 + 8*20 + 10*25);
    expect(r.minutos).toBe(95);
  });

  it('e ignora o que ficou fora da janela', () => {
    registrar('2026-01-07', 't1', {0: [{reps:10, carga:100}]});
    expect(resumoDoTreino(QUARTA_3, 30).sessoes).toBe(0);
  });

  it('o volume por semana devolve uma casa por semana, na ordem', () => {
    registrar(QUARTA_3, 't1', {0: [{reps:10, carga:30}]});
    const v = volumePorSemana(QUARTA_3, 4);
    expect(v.length).toBe(4);
    expect(v[3].volume).toBe(300);
    expect(v[0].volume).toBe(0);
  });

  it('o recorde é a maior carga já registrada', () => {
    registrar(QUARTA_1, 't1', {0: [{reps:10, carga:20}]});
    registrar(QUARTA_2, 't1', {0: [{reps:8,  carga:30}]});
    registrar(QUARTA_3, 't1', {0: [{reps:12, carga:25}]});
    const r = recordes().filter(x => x.nome === 'Ex A')[0];
    expect(r.carga).toBe(30);
    expect(r.reps).toBe(8);
    expect(r.data).toBe(QUARTA_2);
    expect(r.sessoes).toBe(3);
  });

  it('empatou na carga, mais repetições é o recorde', () => {
    registrar(QUARTA_1, 't1', {0: [{reps:8,  carga:30}]});
    registrar(QUARTA_2, 't1', {0: [{reps:12, carga:30}]});
    const r = recordes().filter(x => x.nome === 'Ex A')[0];
    expect(r.reps).toBe(12);
    expect(r.data).toBe(QUARTA_2);
  });

  it('exercício sem carga entra pela melhor marca de repetições', () => {
    registrar(QUARTA_1, 't1', {1: [{reps:30, carga:0}]});
    registrar(QUARTA_2, 't1', {1: [{reps:45, carga:0}]});
    const r = recordes().filter(x => x.nome === 'Ex B')[0];
    expect(r.carga).toBe(0);
    expect(r.reps).toBe(45);
  });

  it('a lista vem do mais pesado para o mais leve', () => {
    registrar(QUARTA_1, 't1', {0: [{reps:5, carga:50}], 1: [{reps:20, carga:5}]});
    expect(recordes()[0].nome).toBe('Ex A');
  });

  it('exercício que sumiu do treino não aparece nem quebra', () => {
    registrar(QUARTA_1, 't1', {0: [{reps:5, carga:50}]});
    Dados.treinos[0].exercicios = [];
    expect(recordes()).toEqual([]);
  });

  it('a evolução de um exercício vem da mais antiga para a mais nova', () => {
    registrar(QUARTA_1, 't1', {0: [{reps:10, carga:20}]});
    registrar(QUARTA_3, 't1', {0: [{reps:10, carga:30}, {reps:8, carga:30}]});
    const p = evolucaoDoExercicio('Ex A');
    expect(p.map(x => x.data)).toEqual([QUARTA_1, QUARTA_3]);
    expect(p[1].carga).toBe(30);
    expect(p[1].series).toBe(2);
    expect(p[1].volume).toBe(10*30 + 8*30);
  });
});

/* ===========================================================================
   O EXERCÍCIO TEM ID

   A posição na lista era uma identidade traiçoeira: remover o segundo
   exercício, ou só mover um para cima, deslocava o histórico de todos os
   seguintes — o recorde da barra fixa virava recorde da remada, em silêncio.
   =========================================================================== */

describe('identidade do exercício', () => {
  it('todo exercício da rotina-modelo nasce com id', () => {
    Dados.treinos.forEach(t => t.exercicios.forEach(ex => {
      expect(typeof ex.id).toBe('string');
      expect(ex.id.length).toBeGreaterThan(2);
    }));
  });

  it('os ids não se repetem dentro do treino', () => {
    const ids = Dados.treinos[0].exercicios.map(ex => ex.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('REMOVER um exercício não desloca o histórico dos outros', () => {
    const idB = idDoExercicio('t1', 1);
    registrar(QUARTA_1, 't1', {0: [{reps:5, carga:50}], 1: [{reps:20, carga:5}]});

    Dados.treinos[0].exercicios.splice(0, 1);          // sai o primeiro

    // O que era do segundo continua sendo dele, e não herdou o do primeiro.
    expect(seriesDe(QUARTA_1, 't1', idB)).toEqual([{reps:20, carga:5}]);
    expect(recordes().filter(r => r.nome === 'Ex B')[0].carga).toBe(5);
  });

  it('MOVER um exercício também não embaralha nada', () => {
    registrar(QUARTA_1, 't1', {0: [{reps:5, carga:50}], 1: [{reps:20, carga:5}]});
    const ex = Dados.treinos[0].exercicios;
    ex.push(ex.shift());                                // troca a ordem

    expect(recordes().filter(r => r.nome === 'Ex A')[0].carga).toBe(50);
    expect(recordes().filter(r => r.nome === 'Ex B')[0].carga).toBe(5);
  });

  it('a marcação de feito também segue o id', () => {
    const idA = idDoExercicio('t1', 0);
    Dados.exercFeitos[QUARTA_1 + ':t1:1:' + idA] = true;
    Dados.treinos[0].exercicios.splice(1, 1);          // sai o SEGUNDO
    expect(exercicioFeito(QUARTA_1, 't1', 1, idA)).toBe(true);
  });
});

describe('migração v9 → v10: séries por índice viram séries por id', () => {
  function dadosAntigos(){
    return {
      versao: 9, slots: [],
      treinos: [{id:'t1', dia:'Qua', nome:'T', exercicios:[
        {n:'Primeiro', a:'3 × 10'}, {n:'Segundo', a:'3 × 10'}
      ]}],
      sessoes: {'2026-08-12:t1': {data:'2026-08-12', treinoId:'t1',
        series: {0: [{reps:10, carga:20}], 1: [{reps:8, carga:30}]}}},
      exercFeitos: {'2026-08-12:t1:1:0': true}
    };
  }

  it('cada exercício ganha um id', () => {
    const d = migrar(dadosAntigos());
    d.treinos[0].exercicios.forEach(ex => expect(typeof ex.id).toBe('string'));
  });

  it('as séries passam a ser guardadas pelo id, sem perder nenhuma', () => {
    const d = migrar(dadosAntigos());
    const ids = d.treinos[0].exercicios.map(e => e.id);
    const series = d.sessoes['2026-08-12:t1'].series;
    expect(Object.keys(series).sort()).toEqual(ids.slice().sort());
    expect(series[ids[0]]).toEqual([{reps:10, carga:20}]);
    expect(series[ids[1]]).toEqual([{reps:8, carga:30}]);
  });

  it('e a marcação de feito acompanha', () => {
    const d = migrar(dadosAntigos());
    const id = d.treinos[0].exercicios[0].id;
    expect(d.exercFeitos['2026-08-12:t1:1:' + id]).toBe(true);
  });

  it('série de exercício que já não existe é descartada, não remanejada', () => {
    const antigo = dadosAntigos();
    antigo.sessoes['2026-08-12:t1'].series[5] = [{reps:1, carga:1}];
    const d = migrar(antigo);
    expect(Object.keys(d.sessoes['2026-08-12:t1'].series).length).toBe(2);
  });

  it('dados sem treino nem sessão passam inteiros', () => {
    expect(migrar({versao: 9, slots: []}).versao).toBe(VERSAO_ESQUEMA);
  });
});
