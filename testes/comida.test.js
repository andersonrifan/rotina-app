/* Comida — cardápio, totais do dia e a lista de compras derivada dele. */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { carregar, Dados } from '../src/nucleo/estado.js';
import {
  pratoDe, nutriDaReceita, totaisDoDia, refeicaoFeita,
  gerarCompras, formatarQuantidade, SECOES_COMPRA
} from '../src/nucleo/modelo.js';
import { RECEITAS } from '../src/dados/receitas.js';
import { rotinaDeTeste } from './ajuda.js';

const SEGUNDA = '2026-08-17';

beforeEach(() => { carregar(rotinaDeTeste()); });
afterEach(() => { vi.useRealTimers(); });

describe('cardápio', () => {
  it('resolve o prato de um dia e refeição', () => {
    const prato = pratoDe('Seg', 'almoco');
    expect(prato.nome).toBe('Macarrão à bolonhesa (lote)');
    expect(prato.kcal).toBeGreaterThan(0);
    expect(prato.prot).toBeGreaterThan(0);
  });

  it('devolve null quando a refeição está a definir', () => {
    expect(pratoDe('Qua', 'almoco')).toBe(null);
    expect(pratoDe('Seg', 'cafe')).toBe(null);
  });

  it('calcula kcal por PORÇÃO, não da receita inteira', () => {
    const receita = RECEITAS.filter(r => r.id === 'bolonhesa')[0];
    const porPorcao = nutriDaReceita(receita);
    expect(receita.porcoes).toBeGreaterThan(1);
    expect(porPorcao.kcal).toBeLessThan(3000);
    expect(porPorcao.kcal).toBeGreaterThan(200);
  });
});

describe('totais do dia', () => {
  it('conta só refeição marcada E com prato definido', () => {
    vi.setSystemTime(new Date('2026-08-17T23:00:00'));
    // às 23h as duas refeições já passaram e contam como feitas
    expect(refeicaoFeita(SEGUNDA, Dados.slots[0])).toBe(true);
    expect(refeicaoFeita(SEGUNDA, Dados.slots[1])).toBe(true);

    // mas o café não tem prato no cardápio: só o almoço soma
    const almoco = pratoDe('Seg', 'almoco');
    expect(totaisDoDia(SEGUNDA).kcal).toBe(almoco.kcal);
  });

  it('desmarcar a refeição zera a contribuição dela', () => {
    vi.setSystemTime(new Date('2026-08-17T23:00:00'));
    Dados.refeicoesFeitas[SEGUNDA + ':almoco'] = false;
    expect(totaisDoDia(SEGUNDA).kcal).toBe(0);
  });

  it('dia futuro começa zerado', () => {
    vi.setSystemTime(new Date('2026-08-17T12:00:00'));
    expect(totaisDoDia('2026-08-20').kcal).toBe(0);
  });
});

describe('lista de compras', () => {
  it('soma os ingredientes do cardápio da semana', () => {
    const lista = gerarCompras();
    expect(lista.length).toBeGreaterThan(0);
    expect(lista.some(i => /carne moída/i.test(i.nome))).toBe(true);
  });

  it('escala pela quantidade de porções que a semana pede', () => {
    const umDia = gerarCompras().filter(i => /macarrão/i.test(i.nome))[0];
    // o mesmo prato em mais um dia tem que pedir mais ingrediente
    Dados.cardapio.Qua.almoco = 'bolonhesa';
    const doisDias = gerarCompras().filter(i => /macarrão/i.test(i.nome))[0];
    expect(parseFloat(doisDias.qtd)).toBeGreaterThan(parseFloat(umDia.qtd));
  });

  it('agrupa só nas três seções do design', () => {
    gerarCompras().forEach(i => expect(SECOES_COMPRA).toContain(i.secao));
  });

  it('põe na Farmácia o remédio que está acabando, e só ele', () => {
    const farmacia = gerarCompras().filter(i => i.secao === 'Farmácia');
    expect(farmacia.map(i => i.nome)).toEqual(['Ômega']);   // 3 dias restantes
    expect(farmacia[0].qtd).toBe('acaba em 3 dias');
  });

  it('cardápio vazio não gera lista de comida', () => {
    Dados.cardapio = {Seg:{}, Ter:{}, Qua:{}, Qui:{}, Sex:{}, 'Sáb':{}, Dom:{}};
    expect(gerarCompras().every(i => i.secao === 'Farmácia')).toBe(true);
  });
});

describe('formatação de quantidade', () => {
  it('arredonda pra cima, pra não faltar na hora de cozinhar', () => {
    expect(formatarQuantidade(101, {un:'g'})).toBe('110 g');
    expect(formatarQuantidade(2.1, {un:'un'})).toBe('3 un.');
  });

  it('sobe de unidade quando passa de mil', () => {
    expect(formatarQuantidade(1200, {un:'g'})).toBe('1,2 kg');
    expect(formatarQuantidade(1210, {un:'g'})).toBe('1,25 kg');   // arredonda pra cima, de 50 em 50
    expect(formatarQuantidade(1500, {un:'ml'})).toBe('1,5 L');
  });

  it('usa vírgula decimal, como se escreve em português', () => {
    expect(formatarQuantidade(1250, {un:'g'})).toContain(',');
    expect(formatarQuantidade(1250, {un:'g'})).not.toContain('.');
  });
});
