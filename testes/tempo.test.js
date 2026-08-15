/* Datas e horários — as funções puras, onde todo app erra silenciosamente. */

import { describe, it, expect } from 'vitest';
import {
  paraMinutos, paraHora, rotuloDuracao,
  paraISO, deISO, diaDaSemana, somarDias, semanaDe, numeroDaSemana, saudacao
} from '../src/nucleo/tempo.js';

describe('conversão de horário', () => {
  it('converte HH:MM para minutos e de volta', () => {
    expect(paraMinutos('00:00')).toBe(0);
    expect(paraMinutos('07:30')).toBe(450);
    expect(paraMinutos('23:59')).toBe(1439);
    expect(paraHora(450)).toBe('07:30');
    expect(paraHora(0)).toBe('00:00');
  });

  it('sempre devolve dois dígitos', () => {
    expect(paraHora(5)).toBe('00:05');
    expect(paraHora(65)).toBe('01:05');
  });

  it('dá a volta ao passar da meia-noite, em vez de estourar', () => {
    expect(paraHora(1440)).toBe('00:00');
    expect(paraHora(1500)).toBe('01:00');
    expect(paraHora(-30)).toBe('23:30');   // arrastar um bloco pra cima do zero
  });

  it('formata duração em português', () => {
    expect(rotuloDuracao(45)).toBe('45 min');
    expect(rotuloDuracao(60)).toBe('1 h');
    expect(rotuloDuracao(95)).toBe('1 h 35');
    expect(rotuloDuracao(125)).toBe('2 h 05');
  });
});

describe('datas', () => {
  it('não desloca o dia por causa de fuso horário', () => {
    // new Date('2026-08-15') seria UTC e cairia no dia 14 no Brasil
    const d = deISO('2026-08-15');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(7);          // agosto
    expect(d.getDate()).toBe(15);
    expect(paraISO(d)).toBe('2026-08-15');
  });

  it('identifica o dia da semana', () => {
    expect(diaDaSemana('2026-08-15').k).toBe('Sáb');
    expect(diaDaSemana('2026-08-16').k).toBe('Dom');
    expect(diaDaSemana('2026-08-17').k).toBe('Seg');
  });

  it('soma e subtrai dias atravessando o mês', () => {
    expect(somarDias('2026-08-31', 1)).toBe('2026-09-01');
    expect(somarDias('2026-09-01', -1)).toBe('2026-08-31');
    expect(somarDias('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('a semana vai de segunda a domingo', () => {
    const semana = semanaDe('2026-08-15');   // um sábado
    expect(semana).toHaveLength(7);
    expect(semana[0]).toBe('2026-08-10');    // segunda
    expect(semana[6]).toBe('2026-08-16');    // domingo
  });

  it('domingo fecha a semana, não abre', () => {
    // O erro clássico: getDay() devolve 0 no domingo e a semana pula pra frente.
    expect(semanaDe('2026-08-16')[0]).toBe('2026-08-10');
    expect(semanaDe('2026-08-16')).toEqual(semanaDe('2026-08-15'));
  });

  it('numera a semana pelo padrão ISO-8601', () => {
    expect(numeroDaSemana('2026-01-01')).toBe(1);
    expect(numeroDaSemana('2026-08-15')).toBe(33);
    // 1º de janeiro de 2027 é sexta: pertence à semana 53 de 2026
    expect(numeroDaSemana('2027-01-01')).toBe(53);
  });
});

describe('saudação', () => {
  it('muda com a hora do dia', () => {
    expect(saudacao(6)).toBe('Bom dia');
    expect(saudacao(11)).toBe('Bom dia');
    expect(saudacao(12)).toBe('Boa tarde');
    expect(saudacao(17)).toBe('Boa tarde');
    expect(saudacao(18)).toBe('Boa noite');
    expect(saudacao(23)).toBe('Boa noite');
  });
});
