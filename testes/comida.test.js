/* Comida — cardápio, totais do dia e a lista de compras derivada dele. */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { carregar, Dados } from '../src/nucleo/estado.js';
import {
  pratoDe, pratosDe, nutriDaReceita, totaisDoDia, refeicaoFeita,
  gerarCompras, formatarQuantidade, SECOES_COMPRA,
  ehLote, porcoesCozidas, ingredientesPara
} from '../src/nucleo/modelo.js';
import { migrar, VERSAO_ESQUEMA } from '../src/nucleo/armazem.js';
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

  it('fora do lote, escala pela quantidade de porções que a semana pede', () => {
    Dados.receitas.filter(r => r.id === 'bolonhesa')[0].emLote = false;
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

/* ===========================================================================
   VÁRIOS PRATOS NUMA REFEIÇÃO

   O app aceitava um só, e isso não era limite de tela: era número errado. Um
   almoço de frango com batata-doce MAIS arroz do lote só cabia como frango, e
   a lista de compras passava a pedir menos arroz do que a semana consome.
   Quem seguisse a lista chegava em casa sem arroz.
   =========================================================================== */

describe('mais de um prato por refeição', () => {
  it('um id solto continua valendo — é como o modelo vem escrito', () => {
    expect(pratosDe('Seg', 'almoco').map(r => r.id)).toEqual(['bolonhesa']);
  });

  it('a lista soma os dois pratos num conjunto só', () => {
    Dados.cardapio.Seg.almoco = ['bolonhesa', 'cuscuz-ovo'];
    const prato = pratoDe('Seg', 'almoco');
    expect(prato.ids).toEqual(['bolonhesa', 'cuscuz-ovo']);
    expect(prato.nome).toContain(' + ');
  });

  it('kcal e proteína são a soma, não o primeiro prato', () => {
    const so = pratoDe('Seg', 'almoco');
    Dados.cardapio.Seg.almoco = ['bolonhesa', 'cuscuz-ovo'];
    const dois = pratoDe('Seg', 'almoco');
    expect(dois.kcal).toBeGreaterThan(so.kcal);
    expect(dois.prot).toBeGreaterThan(so.prot);
  });

  it('sem prato nenhum continua sendo null', () => {
    Dados.cardapio.Seg.almoco = [];
    expect(pratoDe('Seg', 'almoco')).toBe(null);
    expect(pratosDe('Seg', 'almoco')).toEqual([]);
  });

  it('receita que não existe mais é ignorada, não quebra a tela', () => {
    Dados.cardapio.Seg.almoco = ['bolonhesa', 'receita-que-sumiu'];
    expect(pratosDe('Seg', 'almoco').map(r => r.id)).toEqual(['bolonhesa']);
  });

  it('A LISTA DE COMPRAS pede os ingredientes dos DOIS pratos', () => {
    const soUm = gerarCompras().map(i => i.id);
    Dados.cardapio.Seg.almoco = ['bolonhesa', 'cuscuz-ovo'];
    const comDois = gerarCompras().map(i => i.id);
    // Nada do primeiro prato se perdeu, e entrou coisa do segundo.
    soUm.forEach(id => expect(comDois).toContain(id));
    expect(comDois.length).toBeGreaterThan(soUm.length);
  });

  it('e a quantidade cresce quando o mesmo prato aparece duas vezes', () => {
    /* Em gramas de verdade: a lista arredonda e troca de unidade (1200 g vira
       "1,2 kg"), então comparar o numero cru diria que a quantidade caiu. */
    const emGramas = () => {
      const mapa = {};
      gerarCompras().forEach(i => {
        /* Fora: contagem em unidades, e os remédios da farmácia, cuja "qtd"
           é uma frase ("acaba em 3 dias") e não um peso. */
        if(/un\./.test(i.qtd) || !/^\d/.test(i.qtd)) return;
        const n = parseFloat(String(i.qtd).replace(',', '.'));
        mapa[i.nome] = /kg| L$/.test(i.qtd) ? n * 1000 : n;
      });
      return mapa;
    };
    Dados.receitas.filter(r => r.id === 'bolonhesa')[0].emLote = false;
    const antes = emGramas();
    Dados.cardapio.Qua.almoco = ['bolonhesa'];   // mais uma porção na semana
    const depois = emGramas();

    Object.keys(antes).forEach(nome => {
      expect(depois[nome]).toBeGreaterThanOrEqual(antes[nome]);
    });
    expect(Object.keys(antes).filter(n => depois[n] > antes[n]).length).toBeGreaterThan(0);
  });

  it('os totais do dia contam o conjunto inteiro', () => {
    Dados.refeicoesFeitas[SEGUNDA + ':almoco'] = true;
    const so = totaisDoDia(SEGUNDA).kcal;
    Dados.cardapio.Seg.almoco = ['bolonhesa', 'cuscuz-ovo'];
    expect(totaisDoDia(SEGUNDA).kcal).toBeGreaterThan(so);
  });
});

describe('migração v6 → v7: o cardápio vira lista', () => {
  it('cada id solto vira uma lista de um', () => {
    const antigo = {versao: 6, slots: [], cardapio: {Seg: {almoco: 'bolonhesa'}}};
    expect(migrar(antigo).cardapio.Seg.almoco).toEqual(['bolonhesa']);
  });

  it('quem já era lista fica como está', () => {
    const antigo = {versao: 6, slots: [], cardapio: {Seg: {almoco: ['a', 'b']}}};
    expect(migrar(antigo).cardapio.Seg.almoco).toEqual(['a', 'b']);
  });

  it('escolha vazia é apagada em vez de virar lista de nada', () => {
    const antigo = {versao: 6, slots: [], cardapio: {Seg: {almoco: null, jantar: ''}}};
    expect(migrar(antigo).cardapio.Seg).toEqual({});
  });

  it('cardápio ausente não quebra a migração', () => {
    /* As migrações são aplicadas em sequência, então isto sai na versão
       atual do esquema, não na 7. */
    expect(migrar({versao: 6, slots: []}).versao).toBe(VERSAO_ESQUEMA);
  });
});

/* ===========================================================================
   PREPARAÇÃO EM LOTE

   Uma receita em lote é cozida de uma vez para a semana inteira. Isso muda a
   COMPRA, porque não existe cozinhar três quartos de uma panela: ou se faz a
   panela inteira, ou não se faz.
   =========================================================================== */

describe('preparação em lote', () => {
  const bolonhesa = () => Dados.receitas.filter(r => r.id === 'bolonhesa')[0];

  it('quem rende várias porções já nasce em lote', () => {
    expect(bolonhesa().porcoes).toBeGreaterThan(1);
    expect(ehLote(bolonhesa())).toBe(true);
  });

  it('receita de uma porção nasce fora do lote', () => {
    expect(ehLote({porcoes: 1})).toBe(false);
  });

  it('a escolha da pessoa vence o padrão, nos dois sentidos', () => {
    expect(ehLote({porcoes: 6, emLote: false})).toBe(false);
    expect(ehLote({porcoes: 1, emLote: true})).toBe(true);
  });

  it('em lote, a semana cozinha panelas inteiras', () => {
    const r = bolonhesa();               // rende 6
    expect(porcoesCozidas(r, 1)).toBe(6);
    expect(porcoesCozidas(r, 6)).toBe(6);
    expect(porcoesCozidas(r, 7)).toBe(12);
  });

  it('fora do lote, cozinha exatamente o que a semana pede', () => {
    const r = Object.assign({}, bolonhesa(), {emLote: false});
    expect(porcoesCozidas(r, 1)).toBe(1);
    expect(porcoesCozidas(r, 7)).toBe(7);
  });

  it('sem nenhuma porção pedida, não se cozinha nada', () => {
    expect(porcoesCozidas(bolonhesa(), 0)).toBe(0);
  });

  it('a lista de compras compra a panela inteira', () => {
    const macarrao = () => gerarCompras().filter(i => /macarrão/i.test(i.nome))[0];
    // O modelo de teste usa bolonhesa em 2 almoços; a receita rende 6.
    const emLote = parseFloat(macarrao().qtd);
    bolonhesa().emLote = false;
    const semLote = parseFloat(macarrao().qtd);
    expect(emLote).toBeGreaterThan(semLote);
  });

  it('e a conta de ingredientes escala com as porções', () => {
    const r = bolonhesa();
    const uma = ingredientesPara(r, 1).filter(i => i.id === 'macarrao')[0];
    const seis = ingredientesPara(r, 6).filter(i => i.id === 'macarrao')[0];
    expect(seis.qtd).toBeCloseTo(uma.qtd * 6, 5);
    expect(seis.qtd).toBe(500);           // a receita inteira, como escrita
  });

  it('ingrediente que sumiu do banco de alimentos é ignorado', () => {
    const r = {porcoes: 1, ingr: [['macarrao', 100], ['alimento-fantasma', 50]]};
    expect(ingredientesPara(r, 1).length).toBe(1);
  });
});

describe('as receitas viraram dado', () => {
  it('o app lê do que está gravado, não do arquivo', () => {
    Dados.receitas.filter(r => r.id === 'bolonhesa')[0].nome = 'Meu macarrão';
    expect(pratoDe('Seg', 'almoco').nome).toBe('Meu macarrão');
  });

  it('receita nova aparece no cardápio como qualquer outra', () => {
    Dados.receitas.push({id:'minha', nome:'Minha receita', cat:'principal',
                         porcoes:1, tempo:5, ingr:[['ovo',2]], preparo:[], lote:''});
    Dados.cardapio.Seg.almoco = ['minha'];
    expect(pratoDe('Seg', 'almoco').nome).toBe('Minha receita');
  });

  it('migração v7 → v8 entrega o banco de receitas a quem não tinha', () => {
    const antigo = {versao: 7, slots: [], cardapio: {}};
    const novo = migrar(antigo);
    expect(Array.isArray(novo.receitas)).toBe(true);
    expect(novo.receitas.length).toBeGreaterThan(20);
  });

  it('e não mexe em quem ja tem as suas', () => {
    const antigo = {versao: 7, slots: [], cardapio: {}, receitas: [{id:'x'}]};
    expect(migrar(antigo).receitas).toEqual([{id:'x'}]);
  });
});
