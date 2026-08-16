/* A promessa que dá nome à aba: isto é uma ROTINA.

   Duas perguntas que o app precisa responder sempre igual:

   "Quando a semana vira, reseta tudo?" — não. A estrutura é por dia da
   semana, então toda segunda nasce igual; o que não atravessa são as
   marcações, que são de uma data e só dela.

   "E se eu mudar o prato do almoço, o dia acompanha?" — sim. Editar um dia
   congela os horários dele, e por um tempo isso congelava também o nome do
   prato: a aba Comida mostrava uma coisa e a Rotina, outra. */

import { describe, it, expect, beforeEach } from 'vitest';
import { carregar, Dados } from '../src/nucleo/estado.js';
import { blocosDoDia, gerarDia, materializar } from '../src/nucleo/modelo.js';
import { rotinaDeTeste } from './ajuda.js';

const SEGUNDA         = '2026-08-17';
const SEGUNDA_SEGUINTE = '2026-08-24';
const TERCA           = '2026-08-18';

beforeEach(() => { carregar(rotinaDeTeste()); });

/* Só o que define o bloco — id, horário, duração e título. */
function forma(blocos){
  return blocos.map(b => [b.id, b.hora, b.dur, b.titulo].join(' '));
}

describe('a semana se repete', () => {
  it('a segunda que vem nasce igual a esta', () => {
    expect(forma(blocosDoDia(SEGUNDA_SEGUINTE))).toEqual(forma(blocosDoDia(SEGUNDA)));
  });

  it('e continua igual meses depois — nada acumula nem decai', () => {
    expect(forma(blocosDoDia('2026-12-21'))).toEqual(forma(blocosDoDia(SEGUNDA)));
  });

  it('cada dia da semana tem a sua própria rotina', () => {
    expect(forma(blocosDoDia(TERCA))).not.toEqual(forma(blocosDoDia(SEGUNDA)));
  });

  it('editar UM dia não reescreve as outras segundas', () => {
    const lista = materializar(Dados, SEGUNDA);
    lista.filter(b => b.id === 'slot:almoco')[0].hora = '13:30';

    expect(blocosDoDia(SEGUNDA).filter(b => b.id === 'slot:almoco')[0].hora).toBe('13:30');
    expect(blocosDoDia(SEGUNDA_SEGUINTE).filter(b => b.id === 'slot:almoco')[0].hora).toBe('12:00');
  });

  it('mudar a semana-modelo vale para todas as segundas ainda não editadas', () => {
    Dados.fixos.Seg[1][0] = '09:00';   // trabalho passa a começar às 09:00
    expect(blocosDoDia(SEGUNDA).filter(b => b.titulo === 'Trabalho')[0].hora).toBe('09:00');
    expect(blocosDoDia(SEGUNDA_SEGUINTE).filter(b => b.titulo === 'Trabalho')[0].hora).toBe('09:00');
  });

  it('as marcações são de uma data, e não vazam para a semana seguinte', () => {
    Dados.status[SEGUNDA + ':slot:almoco'] = 'pulei';
    expect(Dados.status[SEGUNDA_SEGUINTE + ':slot:almoco']).toBeUndefined();
  });
});

describe('o dia editado continua ouvindo as outras abas', () => {
  function almocoDe(iso){
    return blocosDoDia(iso).filter(b => b.id === 'slot:almoco')[0];
  }

  it('sem edição nenhuma, o prato do cardápio aparece no bloco', () => {
    expect(almocoDe(SEGUNDA).sub).toBe('Macarrão à bolonhesa (lote)');
  });

  it('trocar o prato aparece no dia mesmo depois de ele ser editado', () => {
    materializar(Dados, SEGUNDA);                       // congela o dia
    Dados.cardapio.Seg.almoco = 'cuscuz-ovo';           // troca na aba Comida
    expect(almocoDe(SEGUNDA).sub).toBe('Cuscuz com ovo e queijo');
  });

  it('tirar o prato do cardápio esvazia a linha de baixo do bloco', () => {
    materializar(Dados, SEGUNDA);
    Dados.cardapio.Seg.almoco = null;
    expect(almocoDe(SEGUNDA).sub).toBe('');
  });

  it('renomear a refeição renomeia o bloco', () => {
    materializar(Dados, SEGUNDA);
    Dados.slots.filter(s => s.id === 'almoco')[0].nome = 'Marmita';
    expect(almocoDe(SEGUNDA).titulo).toBe('Marmita');
  });

  it('renomear o treino renomeia o bloco de exercício', () => {
    const QUARTA = '2026-08-19';
    materializar(Dados, QUARTA);
    Dados.treinos[0].nome = 'Força B';
    expect(blocosDoDia(QUARTA).filter(b => b.id.indexOf('treino:') === 0)[0].titulo)
      .toBe('Força B');
  });

  it('mas o horário arrastado no dia continua sendo o do dia', () => {
    materializar(Dados, SEGUNDA).filter(b => b.id === 'slot:almoco')[0].hora = '12:40';
    Dados.slots.filter(s => s.id === 'almoco')[0].hora = '11:00';
    expect(almocoDe(SEGUNDA).hora).toBe('12:40');
  });

  it('e o título escrito à mão não é sobrescrito pelo modelo', () => {
    const bloco = materializar(Dados, SEGUNDA).filter(b => b.id === 'slot:almoco')[0];
    bloco.titulo = 'Almoço na casa da vó';
    bloco.tituloProprio = true;
    Dados.slots.filter(s => s.id === 'almoco')[0].nome = 'Marmita';
    expect(almocoDe(SEGUNDA).titulo).toBe('Almoço na casa da vó');
  });

  it('o dia gerado e o materializado dizem a mesma coisa sobre o prato', () => {
    Dados.cardapio.Seg.almoco = 'cuscuz-ovo';
    const gerado = gerarDia(SEGUNDA).filter(b => b.id === 'slot:almoco')[0];
    materializar(Dados, SEGUNDA);
    expect(almocoDe(SEGUNDA).sub).toBe(gerado.sub);
  });
});
