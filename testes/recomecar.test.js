/* Voltar à tela de escolha.

   O ponto delicado: a tela reaberta apaga a rotina de quem escolher qualquer
   uma das duas opções. Estes testes fixam que ela NÃO apaga nada só por ser
   aberta — e que, quando apaga, apaga de verdade. */

import { describe, it, expect, beforeEach } from 'vitest';
import { carregar, Dados, Tela } from '../src/nucleo/estado.js';
import { aceitarModelo, comecarDoZero, reabrirPrimeiroUso } from '../src/telas/extras.js';
import { gerarDia } from '../src/nucleo/modelo.js';
import { MODELO } from '../src/dados/modelo.js';
import { rotinaDeTeste } from './ajuda.js';

beforeEach(() => {
  carregar(rotinaDeTeste());
  Dados.aceitouModelo = true;
  Tela.primeiroUso = false;
});

describe('reabrir a tela de escolha', () => {
  it('só muda a tela, sem tocar nos dados', () => {
    const antes = JSON.parse(JSON.stringify(Dados));
    reabrirPrimeiroUso();
    expect(Tela.primeiroUso).toBe(true);
    expect(Dados).toEqual(antes);
  });

  it('fecha qualquer folha aberta, para não sobrepor duas camadas', () => {
    Tela.folha = {titulo: 'alguma coisa'};
    reabrirPrimeiroUso();
    expect(Tela.folha).toBe(null);
  });

  it('não fica gravado: reabrir e fechar o app não deixa rastro', () => {
    reabrirPrimeiroUso();
    // `aceitouModelo` é o que persiste, e continua verdadeiro
    expect(Dados.aceitouModelo).toBe(true);
  });
});

describe('recomeçar com o exemplo', () => {
  it('descarta as edições e recarrega a rotina-modelo', () => {
    Dados.slots = [];
    Dados.treinos = [];
    reabrirPrimeiroUso();

    aceitarModelo();

    expect(Dados.slots).toHaveLength(MODELO.slots.length);
    expect(Dados.treinos).toHaveLength(MODELO.treinos.length);
    expect(Dados.perfil.nome).toBe(MODELO.perfil.nome);
  });

  it('limpa as marcações antigas junto', () => {
    Dados.status['2026-08-17:slot:cafe'] = 'feito';
    Dados.blocos['2026-08-17'] = [];
    reabrirPrimeiroUso();

    aceitarModelo();

    expect(Dados.status).toEqual({});
    expect(Dados.blocos).toEqual({});
  });

  it('sai da tela de escolha e não pede de novo', () => {
    reabrirPrimeiroUso();
    aceitarModelo();
    expect(Tela.primeiroUso).toBe(false);
    expect(Dados.aceitouModelo).toBe(true);
  });
});

describe('começar do zero', () => {
  it('deixa a estrutura vazia, sem conteúdo pessoal', () => {
    reabrirPrimeiroUso();
    comecarDoZero();
    expect(Dados.treinos).toEqual([]);
    expect(Dados.remedios).toEqual([]);
    expect(Dados.perfil.nome).toBe('');
  });

  it('mantém refeições genéricas, para o dia não nascer vazio', () => {
    reabrirPrimeiroUso();
    comecarDoZero();
    expect(Dados.slots.length).toBeGreaterThan(0);
    expect(gerarDia('2026-08-17')).toHaveLength(Dados.slots.length);
  });

  it('leva direto para a aba Dia, que é onde se monta a semana', () => {
    reabrirPrimeiroUso();
    comecarDoZero();
    expect(Tela.aba).toBe('dia');
    expect(Tela.primeiroUso).toBe(false);
  });
});
