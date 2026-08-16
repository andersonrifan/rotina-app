/* A régua do dia.

   O que estes testes protegem são as três promessas da visão de agenda:
   a janela começa quando a pessoa acorda, reordenar não deforma o dia, e
   esticar um bloco empurra o que vem depois em vez de invadi-lo. As três
   são invisíveis no código da tela — lá só se vê `top` e `height`. */

import { describe, it, expect } from 'vitest';
import {
  janelaDoDia, blocosNaJanela, blocosAntesDaJanela, horasDaJanela, rotuloDaHora,
  lacunas, minutosLivres, colunasDaJanela, reencadear, redimensionar,
  limitarDuracao, posicaoPara, noPasso, LACUNA_MINIMA
} from '../src/nucleo/agenda.js';

function b(id, hora, dur, cat){
  return {id: id, hora: hora, dur: dur, titulo: id, cat: cat || 'livre', sub: ''};
}

/* Um dia parecido com o de verdade: dorme, acorda, trabalha, almoça, dorme. */
function diaComum(){
  return [
    b('sono1',  '00:00', 390, 'sono'),
    b('cafe',   '06:30',  30, 'refeicao'),
    b('trab',   '07:00', 150, 'trabalho'),
    b('almoco', '12:00',  60, 'refeicao'),
    b('sono2',  '22:30',  89, 'sono')
  ];
}

describe('a janela começa quando a pessoa acorda', () => {
  it('pula o sono da madrugada', () => {
    expect(janelaDoDia(diaComum()).inicio).toBe(6 * 60 + 30);
  });

  it('termina no fim do último bloco', () => {
    expect(janelaDoDia(diaComum()).fim).toBe(22 * 60 + 30 + 89);
  });

  it('pula sonos encadeados, não só o primeiro', () => {
    const dia = [b('s1', '00:00', 240, 'sono'), b('s2', '04:00', 120, 'sono'),
                 b('cafe', '06:00', 30, 'refeicao')];
    expect(janelaDoDia(dia).inicio).toBe(6 * 60);
  });

  it('um dia que já começa acordado não perde nada', () => {
    const dia = [b('trab', '08:00', 240, 'trabalho')];
    expect(janelaDoDia(dia).inicio).toBe(8 * 60);
  });

  it('um dia só de sono mostra o sono — senão a régua ficaria vazia', () => {
    const dia = [b('s1', '00:00', 480, 'sono')];
    expect(janelaDoDia(dia).inicio).toBe(0);
  });

  it('dia sem bloco nenhum não quebra', () => {
    const j = janelaDoDia([]);
    expect(j.fim).toBeGreaterThan(j.inicio);
  });

  it('o sono da madrugada sai da régua, mas não some do dia', () => {
    const dia = diaComum();
    const j = janelaDoDia(dia);
    expect(blocosAntesDaJanela(dia, j).map(x => x.id)).toEqual(['sono1']);
    expect(blocosNaJanela(dia, j).map(x => x.id)).toEqual(['cafe', 'trab', 'almoco', 'sono2']);
  });
});

describe('as marcas de hora', () => {
  it('são as horas cheias dentro da janela', () => {
    const marcas = horasDaJanela({inicio: 6 * 60 + 30, fim: 9 * 60 + 10});
    expect(marcas).toEqual([7 * 60, 8 * 60, 9 * 60]);
  });

  it('passar da meia-noite dá a volta no rótulo', () => {
    expect(rotuloDaHora(7 * 60)).toBe('07h');
    expect(rotuloDaHora(23 * 60)).toBe('23h');
    expect(rotuloDaHora(24 * 60)).toBe('00h');
  });
});

describe('os buracos do dia', () => {
  it('aparecem entre um bloco e o seguinte', () => {
    const dia = diaComum();
    const vazios = lacunas(dia, janelaDoDia(dia));
    // 09:30→12:00 e 13:00→22:30
    expect(vazios.map(l => l.dur)).toEqual([150, 570]);
  });

  it('ignoram o que é arredondamento, não tempo livre', () => {
    const dia = [b('a', '08:00', 60), b('b', '09:05', 60)];
    expect(lacunas(dia, janelaDoDia(dia))).toEqual([]);
    expect(LACUNA_MINIMA).toBeGreaterThan(5);
  });

  it('somam o tempo sem nada marcado', () => {
    const dia = diaComum();
    expect(minutosLivres(dia, janelaDoDia(dia))).toBe(720);
  });

  it('blocos sobrepostos não geram buraco negativo', () => {
    const dia = [b('a', '08:00', 120), b('b', '09:00', 60)];
    expect(lacunas(dia, janelaDoDia(dia))).toEqual([]);
  });
});

describe('reordenar mantém a forma do dia', () => {
  const dia = () => [b('a', '08:00', 60), b('b', '09:30', 30), b('c', '11:00', 90)];

  it('sem mudar a ordem, nada muda', () => {
    const antes = dia();
    const depois = reencadear(antes, ['a', 'b', 'c']);
    expect(depois.map(x => x.hora)).toEqual(['08:00', '09:30', '11:00']);
  });

  it('o dia continua começando na mesma hora', () => {
    const depois = reencadear(dia(), ['c', 'a', 'b']);
    expect(depois[0].hora).toBe('08:00');
  });

  it('o que estava embaixo sobe, e o horário sobe junto', () => {
    // 'c' (90 min) vai para a frente: 'a' passa a começar depois dele.
    const depois = reencadear(dia(), ['c', 'a', 'b']);
    expect(depois.map(x => [x.id, x.hora])).toEqual([
      ['c', '08:00'],   // 08:00 + 90 = 09:30, mais o vão de 30 min da 1ª casa
      ['a', '10:00'],   // 10:00 + 60 = 11:00, mais o vão de 60 min da 2ª casa
      ['b', '12:00']
    ]);
  });

  it('os intervalos ficam presos à posição, não ao bloco', () => {
    const antes = dia();
    const depois = reencadear(antes, ['b', 'c', 'a']);
    const vao = (lista, i) => paraMin(lista[i + 1].hora) - (paraMin(lista[i].hora) + lista[i].dur);
    expect(vao(depois, 0)).toBe(vao(antes, 0));
    expect(vao(depois, 1)).toBe(vao(antes, 1));
  });

  it('o dia termina exatamente onde terminava', () => {
    const antes = dia();
    const depois = reencadear(antes, ['b', 'c', 'a']);
    const fim = l => paraMin(l[l.length - 1].hora) + l[l.length - 1].dur;
    expect(fim(depois)).toBe(fim(antes));
  });

  it('não altera a lista recebida', () => {
    const antes = dia();
    reencadear(antes, ['c', 'b', 'a']);
    expect(antes.map(x => x.hora)).toEqual(['08:00', '09:30', '11:00']);
  });

  it('o sono da madrugada continua na frente e no horário', () => {
    const antes = diaComum();
    const depois = reencadear(antes, ['sono1', 'trab', 'cafe', 'almoco', 'sono2']);
    expect(depois[0].id).toBe('sono1');
    expect(depois[0].hora).toBe('00:00');
  });
});

describe('mudar a duração mexe num bloco só', () => {
  const dia = () => [b('a', '08:00', 60), b('b', '09:30', 30), b('c', '11:00', 90)];

  it('cresce sem levar ninguém junto', () => {
    const depois = redimensionar(dia(), 'a', 90);
    expect(depois[0].dur).toBe(90);
    expect(depois.map(x => x.hora)).toEqual(['08:00', '09:30', '11:00']);
  });

  it('encurtar também não puxa o dia para cima', () => {
    const depois = redimensionar(dia(), 'b', 10);
    expect(depois[1].dur).toBe(10);
    expect(depois.map(x => x.hora)).toEqual(['08:00', '09:30', '11:00']);
  });

  it('sobreposição legítima não é "consertada" por conta própria', () => {
    // O lanche acontece DENTRO do bloco de estudo. Esticar o estudo não pode
    // expulsar o lanche do horário em que ele acontece de verdade.
    const comChoque = [b('estudo', '08:30', 120), b('lanche', '09:30', 10)];
    const depois = redimensionar(comChoque, 'estudo', 180);
    expect(depois[1].hora).toBe('09:30');
  });

  it('não altera a lista recebida', () => {
    const antes = dia();
    redimensionar(antes, 'a', 200);
    expect(antes[0].dur).toBe(60);
  });

  it('nenhum bloco passa da meia-noite', () => {
    const dia2 = [b('a', '08:00', 60), b('z', '23:00', 59)];
    expect(limitarDuracao(dia2, 'z', 600)).toBe(60);
    expect(redimensionar(dia2, 'z', 600)[1].dur).toBe(60);
  });

  it('nenhuma duração fica abaixo do passo', () => {
    expect(limitarDuracao(dia(), 'a', 0)).toBe(5);
    expect(limitarDuracao(dia(), 'a', -100)).toBe(5);
  });
});

describe('colunas: dois blocos no mesmo horário aparecem lado a lado', () => {
  const janela = {inicio: 0, fim: 1440};

  it('sozinho, o bloco ocupa a largura inteira', () => {
    const c = colunasDaJanela([b('a', '08:00', 60), b('b', '10:00', 60)], janela);
    expect(c.a).toEqual({coluna: 0, colunas: 1});
    expect(c.b).toEqual({coluna: 0, colunas: 1});
  });

  it('dois que se chocam dividem o espaço', () => {
    const c = colunasDaJanela([b('a', '08:00', 120), b('b', '09:00', 10)], janela);
    expect(c.a).toEqual({coluna: 0, colunas: 2});
    expect(c.b).toEqual({coluna: 1, colunas: 2});
  });

  it('o choque não estreita o resto do dia', () => {
    const c = colunasDaJanela(
      [b('a', '08:00', 120), b('b', '09:00', 10), b('c', '11:00', 60)], janela);
    expect(c.c.colunas).toBe(1);
  });

  it('encostar não é chocar', () => {
    const c = colunasDaJanela([b('a', '08:00', 60), b('b', '09:00', 60)], janela);
    expect(c.a.colunas).toBe(1);
    expect(c.b.colunas).toBe(1);
  });

  it('três ao mesmo tempo dividem em três', () => {
    const c = colunasDaJanela(
      [b('a', '08:00', 90), b('b', '08:10', 60), b('c', '08:20', 30)], janela);
    expect(c.c).toEqual({coluna: 2, colunas: 3});
  });

  it('a coluna é reaproveitada quando o horário libera', () => {
    const c = colunasDaJanela(
      [b('a', '08:00', 180), b('b', '08:10', 30), b('c', '09:00', 30)], janela);
    expect(c.b.coluna).toBe(1);
    expect(c.c.coluna).toBe(1);       // 'b' já acabou: 'c' herda a faixa
    expect(c.a.colunas).toBe(2);
  });
});

describe('onde o bloco arrastado cai', () => {
  const dia = () => [b('a', '08:00', 60), b('b', '09:30', 30), b('c', '11:00', 90)];
  const janela = {inicio: 8 * 60, fim: 13 * 60};
  const PX = 1;   // 1 px por minuto deixa a conta legível no teste

  it('solto onde estava, a ordem não muda', () => {
    expect(posicaoPara(dia(), 'b', 90, janela, PX, 0)).toEqual(['a', 'b', 'c']);
  });

  it('arrastado para o topo, assume a primeira casa', () => {
    expect(posicaoPara(dia(), 'c', -40, janela, PX, 0)).toEqual(['c', 'a', 'b']);
  });

  it('arrastado para o fim, assume a última', () => {
    expect(posicaoPara(dia(), 'a', 400, janela, PX, 0)).toEqual(['b', 'c', 'a']);
  });

  it('não ultrapassa as casas travadas antes da janela', () => {
    const antes = diaComum();
    const j = janelaDoDia(antes);
    // 'almoco' puxado para muito acima não pode passar na frente do sono.
    const ordem = posicaoPara(antes, 'almoco', -900, j, PX, 1);
    expect(ordem[0]).toBe('sono1');
    expect(ordem[1]).toBe('almoco');
  });
});

describe('o passo do arraste', () => {
  it('encaixa de 5 em 5 minutos', () => {
    expect(noPasso(63)).toBe(65);
    expect(noPasso(62)).toBe(60);
    expect(noPasso(-3)).toBe(-5);
  });
});

function paraMin(hhmm){
  const p = hhmm.split(':');
  return (+p[0]) * 60 + (+p[1]);
}
