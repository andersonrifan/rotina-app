/* Backup — a única saída dos dados.

   Estes testes existem porque o modo de falha é silencioso e definitivo: um
   backup que não importa de volta só se descobre no dia em que a pessoa
   precisa dele, e aí não há o que fazer. */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { carregar, Dados } from '../src/nucleo/estado.js';
import {
  montarBackup, textoDoBackup, interpretarBackup, restaurar,
  resumirBackup, nomeDoArquivo, diasDesdeOBackup, podeCompartilhar
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

/* ===========================================================================
   AS SAÍDAS DO BACKUP

   `baixarBackup` sozinho era uma porta pintada na parede: dentro do WebView
   do app empacotado o download é engolido, e o único caminho de saída dos
   dados não fazia nada — sem erro, sem arquivo.
   =========================================================================== */

describe('há quanto tempo foi o último backup', () => {
  const EM = new Date('2026-08-16T12:00:00');

  it('nunca ter feito não é "zero dias"', () => {
    expect(diasDesdeOBackup({nome:'x'}, EM)).toBe(null);
    expect(diasDesdeOBackup(null, EM)).toBe(null);
  });

  it('feito hoje dá zero', () => {
    expect(diasDesdeOBackup({ultimoBackup:'2026-08-16'}, EM)).toBe(0);
  });

  it('conta os dias corridos', () => {
    expect(diasDesdeOBackup({ultimoBackup:'2026-08-09'}, EM)).toBe(7);
    expect(diasDesdeOBackup({ultimoBackup:'2026-06-16'}, EM)).toBe(61);
  });

  it('data no futuro não vira número negativo', () => {
    expect(diasDesdeOBackup({ultimoBackup:'2026-09-01'}, EM)).toBe(0);
  });
});

describe('escolher o caminho de saída', () => {
  afterEach(() => {
    delete globalThis.navigator.canShare;
    delete globalThis.File;
  });

  it('sem suporte a compartilhar arquivo, sobra o download', () => {
    expect(podeCompartilhar()).toBe(false);
  });

  it('o teste é sobre ESTE arquivo, não sobre a API existir', () => {
    globalThis.File = class { constructor(){ /* suficiente para o teste */ } };
    globalThis.navigator.canShare = () => false;
    expect(podeCompartilhar()).toBe(false);

    globalThis.navigator.canShare = () => true;
    expect(podeCompartilhar()).toBe(true);
  });

  it('uma API que explode não derruba a tela', () => {
    globalThis.File = class { constructor(){ /* suficiente para o teste */ } };
    globalThis.navigator.canShare = () => { throw new Error('sem permissão'); };
    expect(podeCompartilhar()).toBe(false);
  });
});
