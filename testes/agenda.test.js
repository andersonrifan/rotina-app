/* A régua do dia.

   O que estes testes protegem são as três promessas da visão de agenda:
   a janela começa quando a pessoa acorda, reordenar não deforma o dia, e
   esticar um bloco empurra o que vem depois em vez de invadi-lo. As três
   são invisíveis no código da tela — lá só se vê `top` e `height`. */

import { describe, it, expect } from 'vitest';
import {
  janelaDoDia, blocosNaJanela, blocosAntesDaJanela, horasDaJanela, rotuloDaHora,
  lacunas, minutosLivres, colunasDaJanela, arrastarPara, limitarInicio,
  redimensionar, limitarDuracao, noPasso, trocarComVizinho, podeTrocar,
  LACUNA_MINIMA
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

describe('arrastar: livre no tempo, troca só ao ultrapassar', () => {
  /* 09:00–12:00 é buraco: é ali que o arraste livre precisa poder parar. */
  const dia = () => [b('a', '08:00', 60), b('b', '12:00', 60), b('c', '14:00', 60)];

  it('o bloco vai exatamente para o horário pedido', () => {
    expect(arrastarPara(dia(), 'a', paraMin('10:00'))[0].hora).toBe('10:00');
  });

  it('parar num espaço livre não mexe em mais ninguém', () => {
    const depois = arrastarPara(dia(), 'a', paraMin('10:00'));
    expect(depois.map(x => x.hora)).toEqual(['10:00', '12:00', '14:00']);
  });

  it('encostar no vizinho ainda não é ultrapassá-lo', () => {
    // 'a' vai para 11:00–12:00, colado em 'b', mas sem passar do centro dele.
    const depois = arrastarPara(dia(), 'a', paraMin('11:00'));
    expect(depois.map(x => x.hora)).toEqual(['11:00', '12:00', '14:00']);
  });

  it('passar do centro do vizinho troca os dois de lugar', () => {
    // 'a' vai para 13:00; 'b' assume a casa que 'a' deixou vazia.
    const depois = arrastarPara(dia(), 'a', paraMin('13:00'));
    expect(depois.map(x => [x.id, x.hora])).toEqual([
      ['a', '13:00'], ['b', '08:00'], ['c', '14:00']
    ]);
  });

  it('passar por vários faz a cadeia andar uma casa', () => {
    const depois = arrastarPara(dia(), 'a', paraMin('15:00'));
    expect(depois.map(x => [x.id, x.hora])).toEqual([
      ['a', '15:00'], ['b', '08:00'], ['c', '12:00']
    ]);
  });

  it('vale igual subindo', () => {
    const depois = arrastarPara(dia(), 'c', paraMin('09:00'));
    expect(depois.map(x => [x.id, x.hora])).toEqual([
      ['a', '08:00'], ['b', '14:00'], ['c', '09:00']
    ]);
  });

  it('ficar onde está não move nada', () => {
    const depois = arrastarPara(dia(), 'b', paraMin('12:00'));
    expect(depois.map(x => x.hora)).toEqual(['08:00', '12:00', '14:00']);
  });

  it('não altera a lista recebida', () => {
    const antes = dia();
    arrastarPara(antes, 'a', paraMin('15:00'));
    expect(antes.map(x => x.hora)).toEqual(['08:00', '12:00', '14:00']);
  });

  it('o sono da madrugada está fora do alcance do arraste', () => {
    const antes = diaComum();
    const j = janelaDoDia(antes);
    // O limite não deixa o cartão subir além do começo da régua, então o
    // bloco de sono das 00:00 nunca é ultrapassado.
    const alvo = limitarInicio(j, 60, paraMin('02:00'));
    const depois = arrastarPara(antes, 'almoco', alvo);
    expect(depois[0].id).toBe('sono1');
    expect(depois[0].hora).toBe('00:00');
  });
});

describe('até onde o cartão pode ir', () => {
  const janela = {inicio: paraMin('08:00'), fim: paraMin('15:00')};

  it('não sobe acima do começo da régua', () => {
    expect(limitarInicio(janela, 60, paraMin('06:00'))).toBe(paraMin('08:00'));
  });

  it('não escorrega para fora pela borda de baixo', () => {
    expect(limitarInicio(janela, 60, paraMin('16:00'))).toBe(paraMin('14:00'));
  });

  it('no meio, passa direto', () => {
    expect(limitarInicio(janela, 60, paraMin('10:35'))).toBe(paraMin('10:35'));
  });

  it('um bloco maior que a régua encosta no começo dela', () => {
    expect(limitarInicio(janela, 900, paraMin('12:00'))).toBe(paraMin('08:00'));
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

describe('trocar de lugar sem arrastar', () => {
  /* Durações diferentes de propósito: é aí que "trocar de horário" e "trocar
     de casa" divergem, e só a segunda não cria sobreposição. */
  const dia = () => [b('cafe', '06:30', 30), b('trab', '07:00', 150), b('fim', '12:00', 60)];

  it('o segundo assume o começo do primeiro', () => {
    const depois = trocarComVizinho(dia(), 'cafe', 1);
    expect(depois.map(x => [x.id, x.hora])).toEqual([
      ['trab', '06:30'], ['cafe', '09:00'], ['fim', '12:00']
    ]);
  });

  it('e NÃO cria sobreposição, que era o erro de trocar só o horário', () => {
    const depois = trocarComVizinho(dia(), 'cafe', 1);
    for(let i = 0; i < depois.length - 1; i++){
      const fim = paraMin(depois[i].hora) + depois[i].dur;
      expect(paraMin(depois[i + 1].hora)).toBeGreaterThanOrEqual(fim);
    }
  });

  it('o par termina onde terminava — ninguém depois precisa se mexer', () => {
    const antes = dia();
    const fimDoPar = l => Math.max(paraMin(l[0].hora) + l[0].dur,
                                   paraMin(l[1].hora) + l[1].dur);
    expect(fimDoPar(trocarComVizinho(antes, 'cafe', 1))).toBe(fimDoPar(antes));
  });

  it('subir é o inverso exato de descer', () => {
    const uma = trocarComVizinho(dia(), 'trab', -1);
    const volta = trocarComVizinho(uma, 'trab', 1);
    expect(volta.map(x => [x.id, x.hora])).toEqual(dia().map(x => [x.id, x.hora]));
  });

  it('a duração de cada um vai junto com ele', () => {
    const depois = trocarComVizinho(dia(), 'cafe', 1);
    expect(depois.filter(x => x.id === 'cafe')[0].dur).toBe(30);
    expect(depois.filter(x => x.id === 'trab')[0].dur).toBe(150);
  });

  it('ninguém além dos dois se mexe', () => {
    expect(trocarComVizinho(dia(), 'cafe', 1).filter(x => x.id === 'fim')[0].hora)
      .toBe('12:00');
  });

  it('o intervalo entre os dois é mantido', () => {
    const comVao = [b('a', '08:00', 60), b('b', '10:00', 30)];   // 60 min de vão
    const depois = trocarComVizinho(comVao, 'a', 1);
    const vao = paraMin(depois[1].hora) - (paraMin(depois[0].hora) + depois[0].dur);
    expect(vao).toBe(60);
  });

  it('nas pontas não há com quem trocar', () => {
    expect(podeTrocar(dia(), 'cafe', -1)).toBe(false);
    expect(podeTrocar(dia(), 'fim', 1)).toBe(false);
    expect(podeTrocar(dia(), 'cafe', 1)).toBe(true);
    expect(podeTrocar(dia(), 'fim', -1)).toBe(true);
  });

  it('e pedir a troca ali não muda nada', () => {
    expect(trocarComVizinho(dia(), 'cafe', -1).map(x => [x.id, x.hora]))
      .toEqual(dia().map(x => [x.id, x.hora]));
  });

  it('bloco que não existe não quebra', () => {
    expect(trocarComVizinho(dia(), 'fantasma', 1).length).toBe(3);
    expect(podeTrocar(dia(), 'fantasma', 1)).toBe(false);
  });

  it('não altera a lista recebida', () => {
    const antes = dia();
    trocarComVizinho(antes, 'cafe', 1);
    expect(antes[0].hora).toBe('06:30');
  });
});

describe('trocar com blocos que já se sobrepunham', () => {
  /* O lanche das 09:30 dentro do estudo das 08:30 é a rotina real, não um
     erro. Trocar os dois não pode jogar ninguém para antes do dia. */
  const comChoque = () => [b('estudo', '08:30', 120), b('lanche', '09:30', 10)];

  it('o par não começa antes de onde começava', () => {
    const depois = trocarComVizinho(comChoque(), 'estudo', 1);
    depois.forEach(x => expect(paraMin(x.hora)).toBeGreaterThanOrEqual(paraMin('08:30')));
  });

  it('os dois encostam no começo, que é o mais perto do que se pediu', () => {
    /* Sobrepostos quase inteiros, a troca não tem para onde deslocar sem sair
       do dia. Empatar no início preserva a sobreposição que já existia. */
    const depois = trocarComVizinho(comChoque(), 'estudo', 1);
    expect(depois.map(x => x.hora)).toEqual(['08:30', '08:30']);
  });
});
