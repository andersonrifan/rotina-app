/* Armazenamento e migração de esquema.

   Migração é o que separa "app que atualiza" de "app que perde os dados de
   quem já usava". Estes testes existem para que ninguém suba uma versão nova
   sem responder o que acontece com os dados da anterior. */

import { describe, it, expect } from 'vitest';
import { migrar, clonar, VERSAO_ESQUEMA, armazem } from '../src/nucleo/armazem.js';

describe('migração de esquema', () => {
  it('leva dados da v4 até a versão atual', () => {
    const v4 = {versao: 4, slots: [], perfil: {metas: {kcal: 2000, copos: 8}}, agua: {'2026-08-15': 5}};
    const migrado = migrar(v4);
    expect(migrado.versao).toBe(VERSAO_ESQUEMA);
  });

  it('a v5 remove a água, que saiu do app', () => {
    const v4 = {versao: 4, slots: [], perfil: {metas: {kcal: 2000, copos: 8}}, agua: {'2026-08-15': 5}};
    const migrado = migrar(v4);
    expect(migrado.agua).toBeUndefined();
    expect(migrado.perfil.metas.copos).toBeUndefined();
    expect(migrado.perfil.metas.kcal).toBe(2000);   // o resto fica intacto
  });

  it('dados já na versão atual passam sem alteração', () => {
    const atual = {versao: VERSAO_ESQUEMA, slots: [{id: 'cafe'}]};
    expect(migrar(clonar(atual))).toEqual(atual);
  });

  it('recusa dados de uma versão MAIS NOVA em vez de corromper', () => {
    // Cenário real: a pessoa usou uma versão mais recente noutro aparelho e
    // voltou para esta. Melhor recomeçar do modelo do que adivinhar o formato.
    expect(migrar({versao: VERSAO_ESQUEMA + 1, slots: []})).toBe(null);
  });

  it('trata dados antigos sem campo de versão', () => {
    const migrado = migrar({slots: []});
    expect(migrado.versao).toBe(VERSAO_ESQUEMA);
  });
});

describe('armazém à prova de falha', () => {
  it('devolve null em vez de lançar quando não há localStorage', () => {
    // No Node não existe localStorage: é exatamente o caso de aba anônima
    // ou cookies bloqueados que derrubaria o app se não fosse tratado.
    expect(() => armazem.ler('qualquer')).not.toThrow();
    expect(armazem.ler('qualquer')).toBe(null);
  });

  it('gravar falha em silêncio e informa pelo retorno', () => {
    expect(() => armazem.gravar('x', 'y')).not.toThrow();
    expect(armazem.gravar('x', 'y')).toBe(false);
  });
});

describe('clonar', () => {
  it('faz cópia profunda de verdade', () => {
    const original = {a: {b: [1, 2, {c: 3}]}};
    const copia = clonar(original);
    copia.a.b[2].c = 99;
    expect(original.a.b[2].c).toBe(3);
  });
});
