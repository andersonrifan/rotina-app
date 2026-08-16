/* A caixa de remédios: quais colunas existem e o que cada célula quer dizer. */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { carregar, Dados } from '../src/nucleo/estado.js';
import { compartimentosEmUso, estadoDaCelula, remedioTomado } from '../src/nucleo/modelo.js';
import { rotinaDeTeste } from './ajuda.js';

const SEGUNDA = '2026-08-17';

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
