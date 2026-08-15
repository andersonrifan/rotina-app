/* Backup — a única saída dos dados.

   Estes testes existem porque o modo de falha é silencioso e definitivo: um
   backup que não importa de volta só se descobre no dia em que a pessoa
   precisa dele, e aí não há o que fazer. */

import { describe, it, expect, beforeEach } from 'vitest';
import { carregar, Dados } from '../src/nucleo/estado.js';
import {
  montarBackup, textoDoBackup, interpretarBackup, restaurar,
  resumirBackup, nomeDoArquivo
} from '../src/nucleo/backup.js';
import { VERSAO_ESQUEMA } from '../src/nucleo/armazem.js';
import { materializar } from '../src/nucleo/modelo.js';
import { rotinaDeTeste } from './ajuda.js';

beforeEach(() => { carregar(rotinaDeTeste()); });

describe('exportar', () => {
  it('carrega o cabeçalho que a importação confere', () => {
    const b = montarBackup();
    expect(b.app).toBe('rotina');
    expect(b.versaoEsquema).toBe(VERSAO_ESQUEMA);
    expect(b.exportadoEm).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('leva os dados inteiros, não um resumo', () => {
    const b = montarBackup();
    expect(b.dados.slots).toHaveLength(2);
    expect(b.dados.treinos).toHaveLength(1);
    expect(b.dados.remedios).toHaveLength(2);
    expect(b.dados.cardapio.Seg.almoco).toBe('bolonhesa');
  });

  it('é uma cópia: mexer nos dados depois não muda o backup', () => {
    const b = montarBackup();
    Dados.slots = [];
    expect(b.dados.slots).toHaveLength(2);
  });

  it('nomeia o arquivo pela data', () => {
    expect(nomeDoArquivo(new Date(2026, 7, 15))).toBe('rotina-backup-2026-08-15.json');
    expect(nomeDoArquivo(new Date(2026, 0, 3))).toBe('rotina-backup-2026-01-03.json');
  });
});

describe('ida e volta', () => {
  it('exportar e importar devolve exatamente os mesmos dados', () => {
    Dados.status['2026-08-17:slot:cafe'] = 'feito';
    Dados.tomados['2026-08-17:m1'] = false;
    materializar(Dados, '2026-08-17');

    const texto = textoDoBackup();
    const antes = JSON.parse(JSON.stringify(Dados));

    carregar(rotinaDeTeste());               // simula outro aparelho, do zero
    expect(Dados.status['2026-08-17:slot:cafe']).toBeUndefined();

    restaurar(texto);
    expect(Dados).toEqual(antes);
  });

  it('o arquivo é JSON legível por gente', () => {
    const texto = textoDoBackup();
    expect(texto).toContain('\n');            // indentado, não numa linha só
    expect(texto).toContain('"app": "rotina"');
  });
});

describe('recusa arquivo inválido com mensagem útil', () => {
  it('arquivo que não é JSON', () => {
    expect(() => interpretarBackup('isto não é json'))
      .toThrow(/não consegui ler/i);
  });

  it('JSON de outro app', () => {
    expect(() => interpretarBackup('{"app":"outro","dados":{}}'))
      .toThrow(/não é um backup do Rotina/i);
  });

  it('backup do app antigo, sem cabeçalho', () => {
    // o formato anterior era {version:3, blocks:[...]}
    expect(() => interpretarBackup('{"version":3,"blocks":[]}'))
      .toThrow(/não é um backup do Rotina/i);
  });

  it('backup truncado, sem as refeições', () => {
    expect(() => interpretarBackup('{"app":"rotina","dados":{"treinos":[]}}'))
      .toThrow(/incompleto/i);
  });

  it('backup de uma versão mais nova que esta build', () => {
    const futuro = JSON.stringify({
      app: 'rotina',
      dados: {versao: VERSAO_ESQUEMA + 1, slots: []}
    });
    expect(() => interpretarBackup(futuro)).toThrow(/versão mais nova/i);
  });

  it('não deixa os dados atuais num meio-termo quando recusa', () => {
    const antes = JSON.parse(JSON.stringify(Dados));
    expect(() => restaurar('lixo')).toThrow();
    expect(Dados).toEqual(antes);
  });
});

describe('migração no restauro', () => {
  it('backup antigo é migrado ao ser importado', () => {
    const v4 = JSON.stringify({
      app: 'rotina',
      dados: {
        versao: 4,
        slots: [{id:'cafe', nome:'Café', hora:'07:00', dur:30}],
        perfil: {nome:'X', metas:{kcal:2000, copos:8}},
        agua: {'2026-08-15': 5}
      }
    });
    const dados = interpretarBackup(v4);
    expect(dados.versao).toBe(VERSAO_ESQUEMA);
    expect(dados.agua).toBeUndefined();
    expect(dados.slots).toHaveLength(1);
  });
});

describe('resumo para a tela de confirmação', () => {
  it('conta o que vai ser restaurado', () => {
    expect(resumirBackup(Dados)).toBe('2 refeições · 1 treinos · 2 remédios');
  });

  it('menciona os dias editados quando existem', () => {
    materializar(Dados, '2026-08-17');
    expect(resumirBackup(Dados)).toContain('1 dias editados');
  });
});
