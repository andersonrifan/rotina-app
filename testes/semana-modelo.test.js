/* Mexer no molde sem desfazer o passado.

   Mudar o café da manhã de 06:30 para 08:00 é mudar TODOS os dias que nascem
   do molde — inclusive os meses de manhãs que já aconteceram às 06:30, e com
   eles a aderência que as estatísticas mostram.

   A regra do app é: mudança no molde vale de hoje em diante. Estes testes são
   o contrato dessa frase. */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { carregar, Dados } from '../src/nucleo/estado.js';
import {
  blocosDoDia, gerarDaSemana, materializar,
  diasComRegistro, congelarPassado, propagarParaFuturo
} from '../src/nucleo/modelo.js';
import { rotinaDeTeste } from './ajuda.js';

/* Hoje é uma quarta-feira. As segundas em volta: */
const HOJE            = '2026-08-19';
const SEGUNDA_PASSADA = '2026-08-17';
const SEGUNDA_ANTIGA  = '2026-08-10';
const SEGUNDA_FUTURA  = '2026-08-24';

beforeEach(() => {
  carregar(rotinaDeTeste());
  vi.setSystemTime(new Date(HOJE + 'T10:00:00'));
});
afterEach(() => { vi.useRealTimers(); });

function horaDoTrabalho(iso){
  return blocosDoDia(iso).filter(b => b.titulo === 'Trabalho')[0].hora;
}

describe('quais dias contam como vividos', () => {
  it('um dia sem marcação nenhuma não é história de ninguém', () => {
    expect(diasComRegistro(Dados)).toEqual([]);
  });

  it('qualquer marcação já torna o dia um registro', () => {
    Dados.status[SEGUNDA_PASSADA + ':fixo:Seg:1'] = 'feito';
    Dados.tomados[SEGUNDA_ANTIGA + ':m1'] = true;
    expect(diasComRegistro(Dados)).toEqual([SEGUNDA_ANTIGA, SEGUNDA_PASSADA]);
  });

  it('sessões de treino também contam', () => {
    Dados.sessoes[SEGUNDA_ANTIGA + ':t1'] = {data: SEGUNDA_ANTIGA, treinoId:'t1', series:{}};
    expect(diasComRegistro(Dados)).toContain(SEGUNDA_ANTIGA);
  });
});

describe('congelar o passado', () => {
  beforeEach(() => {
    Dados.status[SEGUNDA_PASSADA + ':fixo:Seg:1'] = 'feito';
    Dados.status[SEGUNDA_ANTIGA + ':fixo:Seg:1'] = 'feito';
    Dados.status[SEGUNDA_FUTURA + ':fixo:Seg:1'] = 'feito';
  });

  it('guarda uma cópia de cada dia vivido', () => {
    expect(congelarPassado(Dados)).toBe(2);
    expect(Dados.blocos[SEGUNDA_PASSADA]).toBeTruthy();
    expect(Dados.blocos[SEGUNDA_ANTIGA]).toBeTruthy();
  });

  it('não congela hoje nem o futuro — a mudança é para eles', () => {
    congelarPassado(Dados);
    expect(Dados.blocos[HOJE]).toBeUndefined();
    expect(Dados.blocos[SEGUNDA_FUTURA]).toBeUndefined();
  });

  it('não mexe em quem já tinha cópia própria', () => {
    materializar(Dados, SEGUNDA_PASSADA)
      .filter(b => b.titulo === 'Trabalho')[0].hora = '07:30';
    congelarPassado(Dados);
    expect(horaDoTrabalho(SEGUNDA_PASSADA)).toBe('07:30');
  });

  it('e é o que faz a mudança no molde parar no passado', () => {
    congelarPassado(Dados);
    Dados.fixos.Seg[1][0] = '10:00';           // molde muda

    expect(horaDoTrabalho(SEGUNDA_ANTIGA)).toBe('08:00');    // vivido: intacto
    expect(horaDoTrabalho(SEGUNDA_PASSADA)).toBe('08:00');   // vivido: intacto
    expect(horaDoTrabalho(SEGUNDA_FUTURA)).toBe('10:00');    // futuro: acompanha
  });

  it('sem congelar, o passado seria reescrito — é isto que se evita', () => {
    Dados.fixos.Seg[1][0] = '10:00';
    expect(horaDoTrabalho(SEGUNDA_ANTIGA)).toBe('10:00');
  });
});

describe('propagar para os dias futuros já abertos', () => {
  it('alcança o futuro que tem cópia própria', () => {
    materializar(Dados, SEGUNDA_FUTURA);
    propagarParaFuturo(Dados, 'fixo:Seg:1', 'Seg', {hora: '10:00'});
    expect(horaDoTrabalho(SEGUNDA_FUTURA)).toBe('10:00');
  });

  it('não alcança o passado, nem por engano', () => {
    materializar(Dados, SEGUNDA_PASSADA);
    propagarParaFuturo(Dados, 'fixo:Seg:1', 'Seg', {hora: '10:00'});
    expect(horaDoTrabalho(SEGUNDA_PASSADA)).toBe('08:00');
  });

  it('respeita o dia da semana', () => {
    const QUARTA_FUTURA = '2026-08-26';
    materializar(Dados, QUARTA_FUTURA);
    propagarParaFuturo(Dados, 'fixo:Qua:1', 'Seg', {hora: '10:00'});
    expect(horaDoTrabalho(QUARTA_FUTURA)).toBe('08:00');
  });

  it('sem dia da semana, vale para todos — é o caso das refeições', () => {
    materializar(Dados, SEGUNDA_FUTURA);
    materializar(Dados, '2026-08-26');
    propagarParaFuturo(Dados, 'slot:almoco', null, {hora: '13:00'});
    [SEGUNDA_FUTURA, '2026-08-26'].forEach(iso => {
      expect(blocosDoDia(iso).filter(b => b.id === 'slot:almoco')[0].hora).toBe('13:00');
    });
  });
});

describe('tirar um bloco da semana não renumera os outros', () => {
  /* A posição no array É a identidade ('fixo:Seg:3'), e as marcações usam
     essa chave. Encurtar a lista faria cada marcação apontar para o bloco
     seguinte — silenciosamente. */
  it('o buraco preserva os ids de quem veio depois', () => {
    const antes = gerarDaSemana('Seg').map(b => b.id);
    Dados.fixos.Seg[1] = null;                 // tira o Trabalho
    const depois = gerarDaSemana('Seg').map(b => b.id);

    expect(depois).not.toContain('fixo:Seg:1');
    /* Todos os outros continuam com o id que tinham. */
    antes.filter(id => id !== 'fixo:Seg:1').forEach(id => {
      expect(depois).toContain(id);
    });
  });

  it('e o bloco some mesmo', () => {
    Dados.fixos.Seg[1] = null;
    expect(gerarDaSemana('Seg').filter(b => b.titulo === 'Trabalho')).toEqual([]);
  });

  it('um bloco novo depois do buraco ganha índice próprio', () => {
    Dados.fixos.Seg[1] = null;
    Dados.fixos.Seg.push(['15:00', 60, 'Academia', 'exercicio']);
    const novo = gerarDaSemana('Seg').filter(b => b.titulo === 'Academia')[0];
    expect(novo.id).toBe('fixo:Seg:' + (Dados.fixos.Seg.length - 1));
  });
});
