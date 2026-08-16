/* ===========================================================================
   AGENDA — a régua do dia

   A aba Dia mostra o dia como ele é: cada bloco ocupa a altura da sua
   duração, e o vazio entre dois blocos é vazio na tela. É o que faz um buraco
   de uma hora PARECER um buraco de uma hora, em vez de virar mais uma linha
   de lista igual às outras.

   Três regras nascem daqui, e as três são sobre não mentir:

   A JANELA COMEÇA QUANDO A PESSOA ACORDA. Um dia que abre com 6 h 30 de sono
   gastaria um terço da rolagem mostrando sono — e a pergunta que se faz ao
   abrir o app nunca é "a que horas eu dormi". O sono da madrugada não some:
   sai da régua e vira uma linha compacta acima dela.

   REORDENAR MANTÉM A FORMA DO DIA. O dia continua começando no mesmo horário
   e os intervalos continuam onde estavam: o que troca de lugar é o conteúdo.
   Sem isso, arrastar um bloco criaria sobreposição e o resto do dia passaria
   a mentir sobre os próprios horários.

   MUDAR A DURAÇÃO EMPURRA O RESTO. Esticar o almoço em 10 min atrasa o que
   vem depois em 10 min — que é o que acontece na vida. A alternativa era
   deixar o almoço invadir o bloco seguinte e fingir que os dois acontecem ao
   mesmo tempo.

   Sem DOM: tudo aqui é conta sobre uma lista de blocos, e por isso é testável
   inteiro fora do navegador (ver testes/agenda.test.js).

   PRÉ-CONDIÇÃO de todas as funções: `blocos` vem ordenado por horário, que é
   o que `blocosDoDia()` já devolve.
   =========================================================================== */

import { paraMinutos, paraHora } from './tempo.js';

/** O arraste encaixa de 5 em 5 minutos, e nenhum bloco fica menor que isso. */
export const PASSO_MINUTOS = 5;

/** Abaixo disso o buraco não vale ser mostrado — é respiro, não tempo livre. */
export const LACUNA_MINIMA = 10;

const MINUTOS_DO_DIA = 1440;


/* ===========================================================================
   A JANELA
   =========================================================================== */

/**
 * De que horas a que horas a régua vai.
 *
 * Começa depois do sono da madrugada — os blocos de sono que abrem o dia são
 * pulados, um a um, até aparecer a primeira coisa que a pessoa faz acordada.
 * Termina no fim do último bloco.
 *
 * A segunda regra existe porque as duas camadas do dia podem discordar: no
 * sábado a pessoa dorme até as 8 h e o café da manhã continua marcado para
 * 06:30. Ganha o mais cedo dos dois — o dia não pode começar depois da
 * primeira coisa que ele tem para mostrar.
 */
export function janelaDoDia(blocos){
  if(!blocos.length) return {inicio: 6 * 60, fim: 24 * 60};

  let inicio = paraMinutos(blocos[0].hora);
  let i = 0;
  while(i < blocos.length && blocos[i].cat === 'sono' &&
        paraMinutos(blocos[i].hora) <= inicio){
    inicio = Math.max(inicio, paraMinutos(blocos[i].hora) + blocos[i].dur);
    i++;
  }
  /* Dia inteiro de sono: não existe "depois de acordar", então mostra tudo. */
  if(i >= blocos.length) inicio = paraMinutos(blocos[0].hora);
  else inicio = Math.min(inicio, paraMinutos(blocos[i].hora));

  let fim = inicio + 60;
  blocos.forEach(b => {
    const ini = paraMinutos(b.hora);
    if(ini >= inicio) fim = Math.max(fim, ini + b.dur);
  });

  return {inicio: inicio, fim: Math.min(fim, inicio + MINUTOS_DO_DIA)};
}

export function blocosNaJanela(blocos, janela){
  return blocos.filter(b => paraMinutos(b.hora) >= janela.inicio);
}

/** O que ficou antes de acordar. Vira a faixa compacta acima da régua. */
export function blocosAntesDaJanela(blocos, janela){
  return blocos.filter(b => paraMinutos(b.hora) < janela.inicio);
}

/** As horas cheias dentro da janela, em minutos desde a meia-noite. */
export function horasDaJanela(janela){
  const marcas = [];
  for(let m = Math.ceil(janela.inicio / 60) * 60; m <= janela.fim; m += 60){
    marcas.push(m);
  }
  return marcas;
}

/** 390 → '06h'. Passar da meia-noite dá a volta, como em paraHora(). */
export function rotuloDaHora(minutos){
  const h = Math.floor(minutos / 60) % 24;
  return (h < 10 ? '0' : '') + h + 'h';
}

/**
 * Os buracos entre um bloco e o seguinte.
 *
 * É o que a visão de régua existe para mostrar: onde sobra tempo. Um buraco
 * curto demais não conta — dois minutos entre blocos é arredondamento, não
 * tempo livre.
 */
export function lacunas(blocos, janela){
  const saida = [];
  let cursor = janela.inicio;
  blocosNaJanela(blocos, janela).forEach(b => {
    const ini = paraMinutos(b.hora);
    if(ini - cursor >= LACUNA_MINIMA) saida.push({inicio: cursor, dur: ini - cursor});
    cursor = Math.max(cursor, ini + b.dur);
  });
  return saida;
}

/** Quanto tempo do dia não está ocupado por bloco nenhum. */
export function minutosLivres(blocos, janela){
  return lacunas(blocos, janela).reduce((soma, l) => soma + l.dur, 0);
}

/**
 * Blocos que acontecem ao mesmo tempo, lado a lado.
 *
 * Duas camadas do dia podem cair no mesmo horário — o lanche das 09:30 no meio
 * de um bloco de estudo que vai das 08:30 às 10:30. Empilhados, um esconderia
 * o outro e a régua estaria mentindo por omissão. Divididos em colunas, os
 * dois aparecem e fica evidente que se chocam.
 *
 * Devolve `{idDoBloco: {coluna, colunas}}`: em que faixa o bloco entra e em
 * quantas o espaço foi dividido ali.
 */
export function colunasDaJanela(blocos, janela){
  const saida = {};
  let grupo = [];
  let fimDoGrupo = -1;

  /* Um grupo é um trecho do dia sem nenhum respiro: só quando um bloco começa
     depois do fim de TODOS os anteriores é que a largura pode voltar a ser
     inteira. */
  const fecharGrupo = () => {
    const ocupadas = [];
    grupo.forEach(b => {
      const ini = paraMinutos(b.hora);
      let c = 0;
      while(c < ocupadas.length && ocupadas[c] > ini) c++;
      ocupadas[c] = ini + b.dur;
      saida[b.id] = {coluna: c, colunas: 1};
    });
    grupo.forEach(b => { saida[b.id].colunas = ocupadas.length; });
    grupo = [];
    fimDoGrupo = -1;
  };

  blocosNaJanela(blocos, janela).forEach(b => {
    const ini = paraMinutos(b.hora);
    if(grupo.length && ini >= fimDoGrupo) fecharGrupo();
    grupo.push(b);
    fimDoGrupo = Math.max(fimDoGrupo, ini + b.dur);
  });
  if(grupo.length) fecharGrupo();

  return saida;
}


/* ===========================================================================
   REORDENAR E REDIMENSIONAR

   As duas operações do modo de edição. Ambas devolvem uma lista NOVA — nada
   aqui muda o que recebeu, para a prévia do arraste poder ser recalculada a
   cada quadro sem sujar os dados.
   =========================================================================== */

function indiceDe(blocos, id){
  for(let i = 0; i < blocos.length; i++) if(blocos[i].id === id) return i;
  return -1;
}

/**
 * Leva um bloco para um horário qualquer.
 *
 * O cartão vai para onde o dedo está — inclusive para um buraco no meio do
 * dia, sem que nada mais se mexa. O dia tem tempo livre de verdade, e uma
 * régua que só sabe trocar cartões de lugar não deixa usá-lo: para mover a
 * leitura das 21:40 para as 19:00 seria preciso reordenar o dia inteiro.
 *
 * O vizinho só entra na história quando é ULTRAPASSADO — quando o centro do
 * cartão arrastado passa do centro dele. Aí os dois trocam: o ultrapassado
 * assume a casa que o arrastado deixou vazia. Passar por vários faz a cadeia
 * andar, cada um herdando a casa de quem estava à frente.
 *
 * O critério é o centro, e não a borda, porque encostar não é ultrapassar:
 * com a borda, dois cartões colados ficariam trocando de lugar a cada pixel.
 */
export function arrastarPara(blocos, id, novoInicio){
  const i = indiceDe(blocos, id);
  if(i < 0) return blocos.slice();

  const inicios = blocos.map(b => paraMinutos(b.hora));
  const centro = k => inicios[k] + blocos[k].dur / 2;
  const centroArrastado = novoInicio + blocos[i].dur / 2;
  const descendo = centroArrastado > centro(i);

  let passados = 0;
  if(descendo){
    for(let j = i + 1; j < blocos.length && centroArrastado >= centro(j); j++) passados++;
  } else {
    for(let j = i - 1; j >= 0 && centroArrastado <= centro(j); j--) passados++;
  }

  return blocos.map((b, k) => {
    if(k === i) return Object.assign({}, b, {hora: paraHora(novoInicio)});
    if(descendo && k > i && k <= i + passados){
      return Object.assign({}, b, {hora: paraHora(inicios[k - 1])});
    }
    if(!descendo && k < i && k >= i - passados){
      return Object.assign({}, b, {hora: paraHora(inicios[k + 1])});
    }
    return b;
  });
}

/**
 * Onde o cartão pode parar: dentro da régua, e sem escorregar para fora dela
 * pela borda de baixo.
 */
export function limitarInicio(janela, dur, minutos){
  const maximo = Math.max(janela.inicio, janela.fim - dur);
  return Math.max(janela.inicio, Math.min(minutos, maximo));
}

/**
 * Até onde a duração pode crescer: até a meia-noite, e nada além.
 *
 * Passar disso faria o horário dar a volta e o bloco reaparecer no começo do
 * dia, embaralhando a ordem de que todo o resto depende.
 */
export function limitarDuracao(blocos, id, novaDur){
  const i = indiceDe(blocos, id);
  const pedida = Math.max(PASSO_MINUTOS, novaDur);
  if(i < 0) return pedida;
  return Math.min(pedida, MINUTOS_DO_DIA - paraMinutos(blocos[i].hora));
}

/**
 * Muda a duração de um bloco, e só dele.
 *
 * Nenhum vizinho é empurrado, e isso é uma decisão, não uma economia. Neste
 * app blocos SE SOBREPÕEM de propósito: o lanche das 09:30 acontece dentro do
 * bloco de estudo das 08:30 às 10:30, e é assim que a rotina realmente é.
 * Num dia com sobreposições legítimas não existe regra de empurrão que acerte
 * — qualquer uma delas iria mexer em coisa que a pessoa não tocou. Então a
 * borda de baixo faz uma coisa só, e as colunas lado a lado mostram o choque
 * quando ele aparece.
 *
 * Reorganizar o dia é trabalho do ARRASTE, onde a pessoa escolhe o que anda.
 */
export function redimensionar(blocos, id, novaDur){
  const i = indiceDe(blocos, id);
  if(i < 0) return blocos.slice();
  const dur = limitarDuracao(blocos, id, novaDur);
  return blocos.map((b, k) => k === i ? Object.assign({}, b, {dur: dur}) : b);
}


/** Arredonda minutos no passo do arraste. */
export function noPasso(minutos){
  return Math.round(minutos / PASSO_MINUTOS) * PASSO_MINUTOS;
}
