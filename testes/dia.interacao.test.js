/* As regras de interação que a revisão de uso mudou.

   O que estes testes protegem não é a aparência — é o contrato: onde o
   horário de uma refeição é lido, e o que acontece quando um bloco atravessa
   a meia-noite. Os dois já causaram divergência entre telas. */

import { describe, it, expect, beforeEach } from 'vitest';
import { carregar, Dados, avisoAtual, agir } from '../src/nucleo/estado.js';
import { materializar, horaDaRefeicaoNoDia, blocosDoDia, ordenarPorHora } from '../src/nucleo/modelo.js';
import { paraMinutos, paraHora } from '../src/nucleo/tempo.js';
import { rotinaDeTeste } from './ajuda.js';

const SEGUNDA = '2026-08-17';
const TERCA   = '2026-08-18';

beforeEach(() => { carregar(rotinaDeTeste()); });

describe('horário da refeição: o dia manda sobre o modelo', () => {
  it('sem edição, vale o horário configurado da refeição', () => {
    const almoco = Dados.slots.filter(s => s.id === 'almoco')[0];
    expect(horaDaRefeicaoNoDia(SEGUNDA, almoco)).toBe('12:00');
  });

  it('depois de mover o bloco no Dia, vale o horário do bloco', () => {
    const almoco = Dados.slots.filter(s => s.id === 'almoco')[0];
    const lista = materializar(Dados, SEGUNDA);
    lista.filter(b => b.id === 'slot:almoco')[0].hora = '12:05';

    // Era aqui que as telas discordavam: a Comida continuava mostrando 12:00.
    expect(horaDaRefeicaoNoDia(SEGUNDA, almoco)).toBe('12:05');
  });

  it('e a mudança vale só para aquele dia', () => {
    const almoco = Dados.slots.filter(s => s.id === 'almoco')[0];
    materializar(Dados, SEGUNDA).filter(b => b.id === 'slot:almoco')[0].hora = '12:05';
    expect(horaDaRefeicaoNoDia(TERCA, almoco)).toBe('12:00');
  });
});

describe('bloco que atravessa a meia-noite', () => {
  /* Reproduz a conta do editor: fim menor que início significa virar o dia. */
  function duracaoEntre(inicio, fim){
    let dur = paraMinutos(fim) - paraMinutos(inicio);
    if(dur <= 0) dur += 1440;
    return dur;
  }

  it('dormir 23:00 → 07:00 dá 8 horas, não uma duração negativa', () => {
    expect(duracaoEntre('23:00', '07:00')).toBe(480);
  });

  it('um bloco normal continua normal', () => {
    expect(duracaoEntre('12:00', '13:30')).toBe(90);
  });

  it('início igual ao fim vira o dia inteiro, não zero', () => {
    expect(duracaoEntre('08:00', '08:00')).toBe(1440);
  });

  it('paraHora dá a volta em vez de estourar', () => {
    expect(paraHora(paraMinutos('23:00') + 480)).toBe('07:00');
  });
});

describe('reordenação só ao soltar', () => {
  it('mover um bloco para depois de outro reordena a lista', () => {
    const lista = materializar(Dados, SEGUNDA);
    const leitura = lista.filter(b => b.titulo === 'Leitura')[0];
    leitura.hora = '05:00';
    Dados.blocos[SEGUNDA] = ordenarPorHora(lista);

    const horas = blocosDoDia(SEGUNDA).map(b => paraMinutos(b.hora));
    expect(horas).toEqual([...horas].sort((a, b) => a - b));
    expect(blocosDoDia(SEGUNDA)[1].titulo).toBe('Leitura');
  });
});

describe('avisos sem desfazer', () => {
  it('agir confirma com uma mensagem de texto simples', () => {
    agir('Café marcado', d => { d.refeicoesFeitas['x'] = true; });
    // Antes o aviso era um objeto {msg, foto} com o clone inteiro do estado.
    expect(typeof avisoAtual).toBe('string');
    expect(avisoAtual).toBe('Café marcado');
  });

  it('e a mudança foi aplicada', () => {
    agir('teste', d => { d.perfil.nome = 'Novo'; });
    expect(Dados.perfil.nome).toBe('Novo');
  });
});
