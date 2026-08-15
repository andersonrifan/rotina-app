/* Geração do dia — a regra central do app: um dia é a soma de três camadas,
   e mexer numa delas tem que aparecer no calendário sem ninguém sincronizar
   nada à mão. */

import { describe, it, expect, beforeEach } from 'vitest';
import { carregar, Dados } from '../src/nucleo/estado.js';
import {
  gerarDia, blocosDoDia, materializar, ordenarPorHora, treinoDoDia
} from '../src/nucleo/modelo.js';
import { paraMinutos } from '../src/nucleo/tempo.js';
import { rotinaDeTeste } from './ajuda.js';

const SEGUNDA = '2026-08-17';
const QUARTA  = '2026-08-19';
const DOMINGO = '2026-08-23';

beforeEach(() => { carregar(rotinaDeTeste()); });

describe('as três camadas', () => {
  it('junta blocos fixos, refeições e treino', () => {
    const blocos = gerarDia(QUARTA);
    const origens = blocos.map(b => b.id.split(':')[0]);
    expect(origens).toContain('fixo');
    expect(origens).toContain('slot');
    expect(origens).toContain('treino');
  });

  it('gera uma refeição por slot configurado, todo dia', () => {
    const noDomingo = gerarDia(DOMINGO).filter(b => b.id.startsWith('slot:'));
    expect(noDomingo).toHaveLength(Dados.slots.length);
  });

  it('só põe o treino no dia dele', () => {
    expect(gerarDia(QUARTA).some(b => b.id === 'treino:t1')).toBe(true);
    expect(gerarDia(SEGUNDA).some(b => b.id === 'treino:t1')).toBe(false);
  });

  it('devolve a lista ordenada por horário', () => {
    const blocos = gerarDia(QUARTA);
    const horas = blocos.map(b => paraMinutos(b.hora));
    expect(horas).toEqual([...horas].sort((a, b) => a - b));
  });
});

describe('identidade dos blocos', () => {
  it('dá ids estáveis, derivados da origem', () => {
    expect(gerarDia(QUARTA).map(b => b.id)).toEqual(gerarDia(QUARTA).map(b => b.id));
    expect(gerarDia(QUARTA).some(b => b.id === 'slot:almoco')).toBe(true);
  });

  it('o id não muda quando o horário muda', () => {
    // Se o id dependesse da posição na lista, mover um bloco embaralharia
    // todas as marcações já feitas.
    const antes = gerarDia(QUARTA).filter(b => b.id === 'slot:almoco')[0];
    Dados.slots.filter(s => s.id === 'almoco')[0].hora = '14:00';
    const depois = gerarDia(QUARTA).filter(b => b.id === 'slot:almoco')[0];
    expect(depois.id).toBe(antes.id);
    expect(depois.hora).not.toBe(antes.hora);
  });
});

describe('derivação entre telas', () => {
  it('mudar o horário da refeição move o bloco do calendário', () => {
    expect(gerarDia(SEGUNDA).filter(b => b.id === 'slot:almoco')[0].hora).toBe('12:00');
    Dados.slots.filter(s => s.id === 'almoco')[0].hora = '13:30';
    expect(gerarDia(SEGUNDA).filter(b => b.id === 'slot:almoco')[0].hora).toBe('13:30');
  });

  it('remover a refeição tira o bloco', () => {
    Dados.slots = Dados.slots.filter(s => s.id !== 'almoco');
    expect(gerarDia(SEGUNDA).some(b => b.id === 'slot:almoco')).toBe(false);
  });

  it('excluir o treino tira o bloco de exercício', () => {
    expect(gerarDia(QUARTA).some(b => b.cat === 'exercicio')).toBe(true);
    Dados.treinos = Dados.treinos.filter(t => t.id !== 't1');
    expect(gerarDia(QUARTA).some(b => b.cat === 'exercicio')).toBe(false);
    expect(treinoDoDia('Qua')).toBe(null);
  });

  it('o prato do cardápio vira o subtítulo do bloco', () => {
    const bloco = gerarDia(SEGUNDA).filter(b => b.id === 'slot:almoco')[0];
    expect(bloco.sub).toBe('Macarrão à bolonhesa (lote)');
  });
});

describe('materializar', () => {
  it('congela o dia numa cópia editável', () => {
    expect(Dados.blocos[SEGUNDA]).toBeUndefined();
    materializar(Dados, SEGUNDA);
    expect(Dados.blocos[SEGUNDA]).toBeDefined();
    expect(Dados.blocos[SEGUNDA].length).toBe(gerarDia(SEGUNDA).length);
  });

  it('depois de materializado, o dia ignora a semana-modelo', () => {
    materializar(Dados, SEGUNDA);
    Dados.slots.filter(s => s.id === 'almoco')[0].hora = '15:00';
    // a segunda já foi congelada: não acompanha
    expect(blocosDoDia(SEGUNDA).filter(b => b.id === 'slot:almoco')[0].hora).toBe('12:00');
    // a terça, que não foi, acompanha
    expect(gerarDia('2026-08-18').filter(b => b.id === 'slot:almoco')[0].hora).toBe('15:00');
  });

  it('não materializa duas vezes o mesmo dia', () => {
    const primeira = materializar(Dados, SEGUNDA);
    primeira[0].titulo = 'editado à mão';
    const segunda = materializar(Dados, SEGUNDA);
    expect(segunda[0].titulo).toBe('editado à mão');
  });
});

describe('ordenarPorHora', () => {
  it('não altera o array recebido', () => {
    const original = [{hora:'10:00'}, {hora:'08:00'}];
    const ordenado = ordenarPorHora(original);
    expect(original[0].hora).toBe('10:00');
    expect(ordenado[0].hora).toBe('08:00');
  });
});
