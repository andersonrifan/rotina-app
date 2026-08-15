/* Identidade: o nome de quem usa o app.

   A regra que estes testes protegem: NOME NÃO É ROTINA. Trocar de rotina não
   pode te transformar em outra pessoa, e a rotina de exemplo não pode carregar
   o nome de quem a escreveu. */

import { describe, it, expect, beforeEach } from 'vitest';
import { carregar, Dados, Tela } from '../src/nucleo/estado.js';
import { precisaDeNome, inicialDoNome } from '../src/telas/perfil.js';
import { aceitarModelo, comecarDoZero, reabrirPrimeiroUso } from '../src/telas/extras.js';
import { MODELO, MODELO_VAZIO } from '../src/dados/modelo.js';
import { montarBackup, interpretarBackup } from '../src/nucleo/backup.js';
import { rotinaDeTeste } from './ajuda.js';

beforeEach(() => {
  carregar(rotinaDeTeste());
  Dados.aceitouModelo = true;
  Tela.primeiroUso = false;
  Tela.perfil = false;
});

describe('a rotina-modelo não carrega identidade', () => {
  it('o MODELO vem sem nome', () => {
    // Se tivesse um nome, quem escolhesse "usar o exemplo" seria saudado
    // com o nome de outra pessoa.
    expect(MODELO.perfil.nome).toBe('');
    expect(MODELO_VAZIO.perfil.nome).toBe('');
  });

  it('mas traz a rotina inteira', () => {
    expect(MODELO.treinos.length).toBeGreaterThan(0);
    expect(MODELO.remedios.length).toBeGreaterThan(0);
    expect(Object.keys(MODELO.fixos)).toHaveLength(7);
  });
});

describe('o nome sobrevive a trocar de rotina', () => {
  it('recomeçar com o exemplo mantém o nome', () => {
    Dados.perfil.nome = 'Maria';
    reabrirPrimeiroUso();
    aceitarModelo();
    expect(Dados.perfil.nome).toBe('Maria');
    // e a rotina realmente virou a do modelo
    expect(Dados.treinos).toHaveLength(MODELO.treinos.length);
  });

  it('começar do zero mantém o nome', () => {
    Dados.perfil.nome = 'João';
    reabrirPrimeiroUso();
    comecarDoZero();
    expect(Dados.perfil.nome).toBe('João');
    expect(Dados.treinos).toEqual([]);
  });

  it('as metas também sobrevivem', () => {
    Dados.perfil.nome = 'Ana';
    Dados.perfil.metas = {kcal: 2800, prot: 150};
    reabrirPrimeiroUso();
    aceitarModelo();
    expect(Dados.perfil.metas).toEqual({kcal: 2800, prot: 150});
  });
});

describe('a tela de boas-vindas', () => {
  it('aparece enquanto não há nome', () => {
    Dados.perfil.nome = '';
    expect(precisaDeNome()).toBe(true);
  });

  it('some assim que o nome existe', () => {
    Dados.perfil.nome = 'Pedro';
    expect(precisaDeNome()).toBe(false);
  });

  it('vem antes da escolha da rotina, num app novo', () => {
    // Estado de instalação limpa: sem nome E sem rotina escolhida
    carregar(MODELO);
    expect(precisaDeNome()).toBe(true);
    expect(Dados.aceitouModelo).toBe(false);
  });
});

describe('inicial para o botão de perfil', () => {
  it('usa a primeira letra, em maiúscula', () => {
    Dados.perfil.nome = 'anderson';
    expect(inicialDoNome()).toBe('A');
  });

  it('ignora espaço no começo', () => {
    Dados.perfil.nome = '  maria';
    expect(inicialDoNome()).toBe('M');
  });

  it('não quebra sem nome', () => {
    Dados.perfil.nome = '';
    expect(inicialDoNome()).toBe('?');
  });
});

describe('o backup leva o nome junto', () => {
  it('exporta e restaura a identidade', () => {
    Dados.perfil.nome = 'Carla';
    Dados.perfil.metas = {kcal: 1800, prot: 90};
    const texto = JSON.stringify(montarBackup());

    const restaurado = interpretarBackup(texto);
    expect(restaurado.perfil.nome).toBe('Carla');
    expect(restaurado.perfil.metas.kcal).toBe(1800);
  });
});
