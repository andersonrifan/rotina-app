/* Caixa de remédios e replanejamento do dia. */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { carregar, Dados, simular } from '../src/nucleo/estado.js';
import {
  compartimentosEmUso, estadoDaCelula, remedioTomado,
  materializar, detectarAtraso, proporPlano, aplicarPlano, blocosDoDia,
  totaisDaSemana, CATEGORIAS_INTOCAVEIS
} from '../src/nucleo/modelo.js';
import { rotinaDeTeste } from './ajuda.js';

const SEGUNDA = '2026-08-17';
const QUARTA  = '2026-08-19';

beforeEach(() => { carregar(rotinaDeTeste()); });
afterEach(() => { vi.useRealTimers(); });

describe('caixa de remédios', () => {
  it('as colunas são só os compartimentos em uso', () => {
    expect(compartimentosEmUso()).toEqual(['Manhã', 'Almoço']);
  });

  it('a coluna Noite aparece só quando alguém usa a noite', () => {
    expect(compartimentosEmUso()).not.toContain('Noite');
    Dados.remedios[0].compartimento = 'Noite';
    expect(compartimentosEmUso()).toContain('Noite');
    expect(compartimentosEmUso()).not.toContain('Manhã');
  });

  it('sem remédios, não há grade nenhuma', () => {
    Dados.remedios = [];
    expect(compartimentosEmUso()).toEqual([]);
  });

  it('classifica o estado de cada célula', () => {
    vi.setSystemTime(new Date('2026-08-17T09:00:00'));
    expect(estadoDaCelula('2026-08-14', 'Manhã')).toBe('tomado');   // passado
    expect(estadoDaCelula('2026-08-20', 'Manhã')).toBe('futuro');   // futuro
    expect(estadoDaCelula(SEGUNDA, 'Noite')).toBe('vazio');         // sem remédio
  });

  it('hoje, o que já passou do horário conta como tomado', () => {
    vi.setSystemTime(new Date('2026-08-17T09:00:00'));   // depois das 07:00
    expect(remedioTomado(SEGUNDA, Dados.remedios[0])).toBe(true);
    expect(remedioTomado(SEGUNDA, Dados.remedios[1])).toBe(false);  // 12:00 ainda não
  });

  it('a marcação manual vence o padrão', () => {
    vi.setSystemTime(new Date('2026-08-17T09:00:00'));
    Dados.tomados[SEGUNDA + ':m1'] = false;
    expect(remedioTomado(SEGUNDA, Dados.remedios[0])).toBe(false);
  });
});

describe('detecção de atraso', () => {
  it('não acusa nada num dia que nunca foi editado', () => {
    expect(detectarAtraso(SEGUNDA)).toBe(null);
  });

  it('ignora atraso pequeno — não vale uma tela', () => {
    const lista = materializar(Dados, QUARTA);
    lista.filter(b => b.cat === 'estudo')[0].dur += 10;
    expect(detectarAtraso(QUARTA)).toBe(null);
  });

  it('acusa a partir de 15 minutos', () => {
    const lista = materializar(Dados, QUARTA);
    lista.filter(b => b.cat === 'estudo')[0].dur += 30;
    const atraso = detectarAtraso(QUARTA);
    expect(atraso).not.toBe(null);
    expect(atraso.atraso).toBe(30);
    expect(atraso.bloco.titulo).toBe('Estudo');
  });

  it('escolhe o pior atraso quando há mais de um', () => {
    const lista = materializar(Dados, QUARTA);
    lista.filter(b => b.cat === 'estudo')[0].dur += 20;
    lista.filter(b => b.cat === 'trabalho')[0].dur += 45;
    expect(detectarAtraso(QUARTA).atraso).toBe(45);
  });
});

describe('plano de reencaixe', () => {
  function planoDeTeste(){
    const lista = materializar(Dados, QUARTA);
    lista.filter(b => b.cat === 'estudo')[0].dur += 30;
    return proporPlano(QUARTA, detectarAtraso(QUARTA));
  }

  it('nunca mexe em sono, trabalho ou faculdade', () => {
    planoDeTeste().ajustes
      .filter(a => CATEGORIAS_INTOCAVEIS.includes(a.bloco.cat))
      .forEach(a => expect(a.acao).toBe('intacto'));
  });

  it('tira o tempo livre do dia antes de encurtar outra coisa', () => {
    const plano = planoDeTeste();
    const livre = plano.ajustes.filter(a => a.bloco.cat === 'livre')[0];
    expect(livre.acao).toBe('mover');
  });

  it('classifica todo bloco posterior em encurtar, mover ou intacto', () => {
    planoDeTeste().ajustes.forEach(a => {
      expect(['encurtar', 'mover', 'intacto']).toContain(a.acao);
    });
  });

  it('avisa quando não conseguiu reencaixar tudo', () => {
    const lista = materializar(Dados, QUARTA);
    lista.filter(b => b.cat === 'estudo')[0].dur += 600;   // 10 h de atraso
    const plano = proporPlano(QUARTA, detectarAtraso(QUARTA));
    expect(plano.sobra).toBeGreaterThan(0);
  });

  it('aplicar encurta o que prometeu e tira o que moveu', () => {
    const plano = planoDeTeste();
    const antes = blocosDoDia(QUARTA).length;
    const movidos = plano.ajustes.filter(a => a.acao === 'mover');

    aplicarPlano(Dados, plano);

    expect(blocosDoDia(QUARTA)).toHaveLength(antes - movidos.length);
    movidos.forEach(a => {
      expect(blocosDoDia(QUARTA).some(b => b.id === a.bloco.id)).toBe(false);
    });
    plano.ajustes.filter(a => a.acao === 'encurtar').forEach(a => {
      const b = blocosDoDia(QUARTA).filter(x => x.id === a.bloco.id)[0];
      expect(b.dur).toBe(a.novaDur);
    });
  });

  it('nunca encurta um bloco abaixo do mínimo', () => {
    const lista = materializar(Dados, QUARTA);
    lista.filter(b => b.cat === 'estudo')[0].dur += 600;
    const plano = proporPlano(QUARTA, detectarAtraso(QUARTA));
    plano.ajustes.filter(a => a.acao === 'encurtar')
      .forEach(a => expect(a.novaDur).toBeGreaterThanOrEqual(10));
  });
});

describe('simular', () => {
  it('não deixa rastro nos dados reais', () => {
    const antes = blocosDoDia(SEGUNDA).length;
    const resultado = simular(dados => {
      materializar(dados, SEGUNDA);
      dados.blocos[SEGUNDA] = [];
      return 'calculado';
    });
    expect(resultado).toBe('calculado');
    expect(blocosDoDia(SEGUNDA)).toHaveLength(antes);
    expect(Dados.blocos[SEGUNDA]).toBeUndefined();
  });

  it('devolve os dados reais mesmo se a função lançar', () => {
    expect(() => simular(() => { throw new Error('erro proposital'); })).toThrow();
    expect(Dados).toBeDefined();
    expect(Dados.slots).toHaveLength(2);
  });
});

describe('totais da semana', () => {
  it('soma por categoria os sete dias', () => {
    const t = totaisDaSemana(SEGUNDA, ['sono', 'trabalho']);
    // Seg e Qua têm 420 + 119 de sono; os outros dias não têm bloco de sono
    expect(t.sono).toBe((420 + 119) * 2);
    // Seg, Ter e Qua têm 240 min de trabalho
    expect(t.trabalho).toBe(240 * 3);
  });

  it('ignora categoria que não foi pedida', () => {
    expect(totaisDaSemana(SEGUNDA, ['sono'])).not.toHaveProperty('livre');
  });
});
