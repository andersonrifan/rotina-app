/* ===========================================================================
   MODELO — as regras derivadas do domínio

   Nenhuma tela calcula nada por conta própria: todas perguntam aqui. É o que
   faz mudar o horário do almoço em Comida mover o bloco no calendário do Dia,
   e apagar um treino sumir com o bloco de exercício — sem nenhuma tela saber
   da outra.

   Este módulo não toca no DOM. Depende só dos dados e de tempo.js, e por isso
   é testável inteiro sem navegador (ver testes/).
   =========================================================================== */

import { DIAS, CATEGORIAS, COMPARTIMENTOS } from '../dados/modelo.js';
import { ALIMENTOS, RECEITAS } from '../dados/receitas.js';
import { Dados } from './estado.js';
import { clonar } from './armazem.js';
import {
  paraMinutos, diaDaSemana, hojeISO,
  agoraEmMinutos, ehHoje, ehPassado, ehFuturo
} from './tempo.js';

/** A cor de uma categoria de bloco. Cai num neutro se a categoria sumir. */
export function corDaCategoria(cat){
  return (CATEGORIAS[cat] || CATEGORIAS.livre).cor;
}

/**
 * A mesma cor, fraca o bastante para servir de FUNDO de cartão.
 *
 * A régua do dia precisa que a categoria se leia de relance, sem etiqueta —
 * mas as cores cheias do design system são fortes demais atrás de texto (o
 * sono é quase preto).
 *
 * 22 % é o ponto em que as dez categorias ainda se distinguem entre si sobre
 * o creme. A 13 %, que era o valor anterior, metade delas virava o mesmo
 * bege. Mesmo na mais escura o texto fica em torno de 9:1, bem acima dos
 * 4,5:1 exigidos.
 */
export function corSuaveDaCategoria(cat){
  const n = parseInt(corDaCategoria(cat).slice(1), 16);
  return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',.22)';
}

/**
 * Um dia passado é só leitura até ser reaberto.
 *
 * Fica aqui, e não em tempo.js, porque não é uma pergunta sobre o calendário
 * e sim sobre os dados: depende de o usuário ter reaberto aquele dia.
 */
export function ehSomenteLeitura(iso){
  return ehPassado(iso) && !Dados.reabertos[iso];
}


/* ===========================================================================
   GERAÇÃO DO DIA

   Um dia é montado de três fontes, nesta ordem:
     1. os blocos fixos daquele dia da semana (trabalho, aula, sono...)
     2. uma refeição por slot configurado
     3. o treino daquele dia, se houver

   O resultado é ordenado por horário. Se o usuário já editou este dia
   específico, a lista salva em Dados.blocos[data] substitui tudo isso.

   Cada bloco carrega um `id` estável e previsível, derivado da origem
   ('fixo:Qui:3', 'slot:almoco', 'treino:forcaA'). É esse id que as marcações
   usam como chave — por isso reordenar ou editar um dia não embaralha o que
   já estava marcado, ao contrário de usar a posição na lista.
   =========================================================================== */

/**
 * O dia que um DIA DA SEMANA produz, sem data nenhuma.
 *
 * É a semana-modelo materializada em blocos — o molde de que toda segunda
 * nasce. `gerarDia` é isto aplicado a uma data, e a tela de Semana modelo é
 * isto mostrado direto, sem passar por um dia.
 */
export function gerarDaSemana(diaK){
  const blocos = [];

  /* A POSIÇÃO no array é a identidade do bloco ('fixo:Seg:3'), e é ela que as
     marcações usam como chave. Por isso remover da semana deixa um buraco
     (`null`) em vez de encurtar a lista: encurtar renumeraria todos os blocos
     seguintes, e cada marcação passaria a apontar para o bloco errado. */
  (Dados.fixos[diaK] || []).forEach((f, i) => {
    if(!f) return;
    blocos.push({
      id: 'fixo:' + diaK + ':' + i,
      hora: f[0], dur: f[1], titulo: f[2], cat: f[3], sub: ''
    });
  });

  Dados.slots.forEach(slot => {
    const prato = pratoDe(diaK, slot.id);
    blocos.push({
      id: 'slot:' + slot.id,
      hora: slot.hora, dur: slot.dur,
      titulo: slot.nome, cat: 'refeicao',
      sub: prato ? prato.nome : ''
    });
  });

  const treino = treinoDoDia(diaK);
  if(treino){
    blocos.push({
      id: 'treino:' + treino.id,
      hora: treino.hora, dur: treino.dur,
      titulo: treino.nome, cat: 'exercicio', sub: ''
    });
  }

  return ordenarPorHora(blocos);
}

export function gerarDia(iso){
  return gerarDaSemana(diaDaSemana(iso).k);
}

export function ordenarPorHora(blocos){
  return blocos.slice().sort((a, b) => paraMinutos(a.hora) - paraMinutos(b.hora));
}

/** Os blocos de um dia: a versão editada, se existir; senão, a gerada. */
export function blocosDoDia(iso){
  if(!Dados.blocos[iso]) return gerarDia(iso);
  return ordenarPorHora(Dados.blocos[iso].map(b => comTextoAtual(iso, b)));
}

/**
 * Devolve o bloco com o TEXTO que ele tem hoje.
 *
 * Materializar um dia congela a lista inteira, e isso estava congelando
 * demais: um bloco de refeição guarda o nome do prato, e trocar o prato na
 * aba Comida não aparecia mais no dia — as duas telas passavam a discordar
 * sobre o mesmo almoço. O mesmo valia para renomear uma refeição ou um
 * treino.
 *
 * A divisão é esta: HORÁRIO e DURAÇÃO pertencem ao dia (foi você que
 * arrastou), TÍTULO e PRATO pertencem ao modelo (vêm da aba que os define).
 * A exceção é o título que a pessoa escreveu à mão no editor do dia — ele
 * ganha `tituloProprio` e nada o sobrescreve.
 */
function comTextoAtual(iso, bloco){
  const diaK = diaDaSemana(iso).k;

  if(bloco.id.indexOf('slot:') === 0){
    const slot = Dados.slots.filter(s => 'slot:' + s.id === bloco.id)[0];
    if(!slot) return bloco;
    const prato = pratoDe(diaK, slot.id);
    return Object.assign({}, bloco, {
      titulo: bloco.tituloProprio ? bloco.titulo : slot.nome,
      sub: prato ? prato.nome : ''
    });
  }

  if(bloco.id.indexOf('treino:') === 0 && !bloco.tituloProprio){
    const treino = Dados.treinos.filter(t => 'treino:' + t.id === bloco.id)[0];
    if(treino) return Object.assign({}, bloco, {titulo: treino.nome});
  }

  return bloco;
}

/**
 * Congela o dia gerado numa cópia editável.
 *
 * Antes da primeira edição, um dia é só o resultado de uma conta — mexer nele
 * exigiria mexer na semana-modelo, o que mudaria todos os outros dias juntos.
 * Materializar transforma aquele dia numa lista própria, que passa a ignorar
 * a geração. É o que permite "hoje a aula atrasou" sem reescrever as quintas.
 */
export function materializar(dados, iso){
  if(!dados.blocos[iso]) dados.blocos[iso] = clonar(gerarDia(iso));
  return dados.blocos[iso];
}

/* ===========================================================================
   MUDAR A SEMANA-MODELO SEM DESFAZER O PASSADO

   Mexer no molde é mexer em TODOS os dias que nascem dele — inclusive nos que
   já foram vividos. Mudar o café da manhã de 06:30 para 08:00 reescreveria
   silenciosamente meses de manhãs que aconteceram às 06:30, e com elas a
   aderência que as estatísticas mostram.

   A regra do app é: mudança no molde vale de HOJE EM DIANTE. E a forma de
   garantir isso é simples — antes de tocar no molde, os dias já vividos são
   materializados, isto é, ganham uma cópia própria do que eram. Depois disso
   a geração pode mudar à vontade: eles não dependem mais dela.

   Só os dias com REGISTRO são congelados. Um dia passado em que nada foi
   marcado não é história de ninguém, e guardar 365 cópias por ano de dias que
   ninguém viveu só engorda o backup.
   =========================================================================== */

/** As datas que têm alguma marcação ou sessão gravada. */
export function diasComRegistro(dados){
  const datas = {};
  const juntar = mapa => Object.keys(mapa || {}).forEach(chave => {
    const data = chave.slice(0, 10);
    if(/^\d{4}-\d{2}-\d{2}$/.test(data)) datas[data] = true;
  });
  juntar(dados.status);
  juntar(dados.tomados);
  juntar(dados.refeicoesFeitas);
  juntar(dados.exercFeitos);
  juntar(dados.sessoes);
  return Object.keys(datas).sort();
}

/**
 * Congela os dias já vividos. Chame ANTES de qualquer mudança no molde.
 * Devolve quantos dias foram congelados — a tela usa isso para contar o que
 * aconteceu em vez de fazer em silêncio.
 */
export function congelarPassado(dados){
  const hoje = hojeISO();
  let quantos = 0;
  diasComRegistro(dados).forEach(iso => {
    if(iso >= hoje || dados.blocos[iso]) return;
    materializar(dados, iso);
    quantos++;
  });
  return quantos;
}

/**
 * Leva uma mudança de bloco para os dias JÁ MATERIALIZADOS de hoje em diante.
 *
 * Sem isto, "valer em todas as segundas" não alcançaria as segundas futuras
 * que a pessoa já tinha aberto e ajustado — elas têm cópia própria e não
 * escutam mais o molde.
 */
export function propagarParaFuturo(dados, idDoBloco, diaK, mudanca){
  const hoje = hojeISO();
  Object.keys(dados.blocos).forEach(iso => {
    if(iso < hoje) return;
    /* `diaK` nulo = vale para todo dia da semana (é o caso das refeições). */
    if(diaK && diaDaSemana(iso).k !== diaK) return;
    const alvo = dados.blocos[iso].filter(b => b.id === idDoBloco)[0];
    if(alvo) Object.assign(alvo, mudanca);
  });
}

/** O bloco acontecendo agora (só faz sentido hoje). */
export function blocoAtual(iso){
  if(!ehHoje(iso)) return null;
  const agora = agoraEmMinutos();
  return blocosDoDia(iso).filter(b => {
    const ini = paraMinutos(b.hora);
    return agora >= ini && agora < ini + b.dur;
  })[0] || null;
}

export function proximoBloco(iso){
  const agora = agoraEmMinutos();
  return blocosDoDia(iso).filter(b => paraMinutos(b.hora) > agora)[0] || null;
}


/* ===========================================================================
   MARCAÇÕES

   Regra dos padrões, quando o usuário ainda não marcou nada:
     - dia passado  → aparece cumprido (você viveu o dia, não vai marcar tudo)
     - hoje         → o que já passou do horário aparece cumprido
     - dia futuro   → em branco
   =========================================================================== */

export const CICLO_STATUS = ['', 'feito', 'atrasei', 'pulei'];

export function statusDoBloco(iso, bloco){
  const chave = iso + ':' + bloco.id;
  if(Dados.status[chave] !== undefined) return Dados.status[chave];
  if(ehPassado(iso)) return 'feito';
  if(ehHoje(iso) && paraMinutos(bloco.hora) + bloco.dur <= agoraEmMinutos()) return 'feito';
  return '';
}

export function proximoStatus(atual){
  return CICLO_STATUS[(CICLO_STATUS.indexOf(atual) + 1) % CICLO_STATUS.length];
}

export function remedioTomado(iso, med){
  const chave = iso + ':' + med.id;
  if(Dados.tomados[chave] !== undefined) return Dados.tomados[chave];
  if(ehPassado(iso)) return true;
  if(ehHoje(iso)) return paraMinutos(med.hora) <= agoraEmMinutos();
  return false;
}

export function refeicaoFeita(iso, slot){
  const chave = iso + ':' + slot.id;
  if(Dados.refeicoesFeitas[chave] !== undefined) return Dados.refeicoesFeitas[chave];
  if(ehPassado(iso)) return true;
  if(ehHoje(iso)) return paraMinutos(slot.hora) <= agoraEmMinutos();
  return false;
}

export function exercicioFeito(iso, treinoId, volta, exId){
  return !!Dados.exercFeitos[iso + ':' + treinoId + ':' + volta + ':' + exId];
}


/* ===========================================================================
   COMIDA
   =========================================================================== */

/* ---------------------------------------------------------------------------
   UMA REFEIÇÃO PODE TER MAIS DE UM PRATO

   O app aceitava um só, e isso não era detalhe de tela: era um número errado.
   Um almoço de "frango com batata-doce" mais "arroz do lote" só cabia como
   frango — e a lista de compras passava a pedir menos arroz do que a semana
   consome de verdade. Quem seguisse a lista chegava em casa sem arroz.

   O cardápio guarda uma LISTA de receitas por refeição. `pratosDe` devolve a
   lista; `pratoDe` continua existindo e devolve o conjunto somado, com os
   nomes juntos — é o que as telas mostram numa linha só.
   --------------------------------------------------------------------------- */

/**
 * O banco de receitas.
 *
 * Vive nos DADOS, não no código: dá para criar, ajustar quantidade e excluir.
 * O fallback para o arquivo importado cobre dados antigos que ainda não
 * passaram pela migração — e os testes que montam `Dados` na mão.
 */
export function receitas(){
  return (Dados && Array.isArray(Dados.receitas)) ? Dados.receitas : RECEITAS;
}

export function receitaDe(id){
  return receitas().filter(r => r.id === id)[0] || null;
}

/** As receitas escolhidas para um dia da semana + refeição. Sempre um array. */
export function pratosDe(diaK, slotId){
  const escolha = (Dados.cardapio[diaK] || {})[slotId];
  if(!escolha) return [];
  const ids = Array.isArray(escolha) ? escolha : [escolha];
  return ids.map(receitaDe).filter(Boolean);
}

/* ---------------------------------------------------------------------------
   PREPARAÇÃO EM LOTE

   Uma receita marcada como lote é cozida de uma vez para a semana inteira: o
   molho de bolonhesa sai numa panela só, não em três noites. Isso muda a
   COMPRA, porque não existe cozinhar três quartos de uma panela — ou se faz a
   panela inteira, ou não se faz.

   Sem lote, a lista compra exatamente o que as porções da semana pedem, e a
   ficha mostra a receita como ela é escrita: para uma porção.

   Com lote, a lista agrupa as refeições da semana e arredonda para panelas
   inteiras — o que sobra vira a marmita do dia seguinte, que é justamente o
   motivo de cozinhar em lote.
   --------------------------------------------------------------------------- */

/**
 * Esta receita é cozida em lote?
 *
 * `emLote` é a escolha da pessoa. Sem escolha, vale o que a receita já diz de
 * si mesma: uma que rende 5 porções JÁ é uma panela — ninguém faz um quinto
 * de arroz carreteiro. Receita de uma porção começa desligada.
 *
 * Não confundir com `receita.lote`, que é o TEXTO da dica ("congela bem",
 * "dura 3 dias na geladeira"). Um é conselho, o outro é conta.
 */
export function ehLote(receita){
  if(!receita) return false;
  if(receita.emLote !== undefined) return !!receita.emLote;
  return (receita.porcoes || 1) > 1;
}

/** Quantas porções a semana pede de cada receita. */
export function porcoesDaSemana(){
  const contagem = {};
  DIAS.forEach(d => {
    Object.keys(Dados.cardapio[d.k] || {}).forEach(slotId => {
      pratosDe(d.k, slotId).forEach(r => {
        contagem[r.id] = (contagem[r.id] || 0) + 1;
      });
    });
  });
  return contagem;
}

/**
 * Quantas porções realmente serão COZIDAS de uma receita nesta semana.
 *
 * Em lote, sobe para o próximo múltiplo do rendimento: 3 porções de uma
 * receita que rende 4 significam uma panela de 4, e uma porção sobrando.
 */
export function porcoesCozidas(receita, porcoesPedidas){
  if(!porcoesPedidas) return 0;
  const rende = Math.max(1, receita.porcoes || 1);
  if(!ehLote(receita)) return porcoesPedidas;
  return Math.ceil(porcoesPedidas / rende) * rende;
}

/** As quantidades de ingrediente para um número de porções. */
export function ingredientesPara(receita, porcoes){
  const fator = porcoes / Math.max(1, receita.porcoes || 1);
  return receita.ingr
    .filter(([id]) => ALIMENTOS[id])
    .map(([id, q]) => ({id: id, alimento: ALIMENTOS[id], qtd: q * fator}));
}

/**
 * O conjunto da refeição, somado: nome composto, kcal e proteína do total.
 * Devolve `null` quando não há prato nenhum — é o que as telas testam.
 */
export function pratoDe(diaK, slotId){
  const receitas = pratosDe(diaK, slotId);
  if(!receitas.length) return null;

  let kcal = 0, prot = 0;
  receitas.forEach(r => {
    const n = nutriDaReceita(r);
    kcal += n.kcal;
    prot += n.prot;
  });

  return {
    id: receitas[0].id,
    ids: receitas.map(r => r.id),
    nome: receitas.map(r => r.nome).join(' + '),
    kcal: Math.round(kcal),
    prot: Math.round(prot)
  };
}

/**
 * O horário em que a refeição acontece NAQUELE dia.
 *
 * Normalmente é o horário configurado do slot. Mas se o dia foi editado —
 * você arrastou o almoço para 12:05 na aba Dia — quem manda é o bloco, não o
 * modelo da semana. Sem isto as duas telas discordam sobre o mesmo dia, que
 * era exatamente o que acontecia.
 */
export function horaDaRefeicaoNoDia(iso, slot){
  const doDia = (Dados.blocos[iso] || []).filter(b => b.id === 'slot:' + slot.id)[0];
  return doDia ? doDia.hora : slot.hora;
}

/** Converte a quantidade de um ingrediente para gramas (ml conta como g). */
export function emGramas(idAlimento, qtd){
  const a = ALIMENTOS[idAlimento];
  if(!a) return 0;
  return a.un === 'un' ? qtd * (a.gUn || 0) : qtd;
}

/** kcal e proteína de UMA porção da receita. */
export function nutriDaReceita(receita){
  let kcal = 0, prot = 0;
  receita.ingr.forEach(([id, q]) => {
    const a = ALIMENTOS[id];
    if(!a) return;
    const g = emGramas(id, q);
    kcal += a.kcal * g / 100;
    prot += a.prot * g / 100;
  });
  return {kcal: kcal / receita.porcoes, prot: prot / receita.porcoes};
}

/**
 * Totais do dia. Contam só as refeições MARCADAS como consumidas e que têm
 * prato definido — o número mostra o que você comeu, não o que planejou.
 */
export function totaisDoDia(iso){
  const diaK = diaDaSemana(iso).k;
  let kcal = 0, prot = 0;
  Dados.slots.forEach(slot => {
    if(!refeicaoFeita(iso, slot)) return;
    const prato = pratoDe(diaK, slot.id);
    if(!prato) return;
    kcal += prato.kcal;
    prot += prato.prot;
  });
  return {kcal: kcal, prot: prot};
}

/* --- Lista de compras -----------------------------------------------------
   Soma os ingredientes de todos os pratos do cardápio da semana, escalados
   pelo número de porções que a semana pede, e agrupa nas três seções do
   design. A farmácia não vem do cardápio: vem dos remédios acabando. */

/* As seções do banco de alimentos são mais detalhadas que as três da tela.
   Este mapa é o único lugar que faz a ponte entre os dois vocabulários. */
export const SECAO_DA_DESPENSA = {
  Hortifruti:'Feira', 'Açougue':'Mercado', Ovos:'Mercado',
  'Laticínios':'Mercado', Padaria:'Mercado', Mercearia:'Mercado'
};
export const SECOES_COMPRA = ['Feira', 'Mercado', 'Farmácia'];
export const DIAS_PARA_REPOR = 7;   // abaixo disso o remédio entra na lista

export function gerarCompras(){
  /* Quantas porções de cada receita a semana pede. Uma refeição pode ter mais
     de um prato, e cada um conta a sua porção — é aqui que a lista deixava de
     pedir o arroz que acompanha o frango. */
  const porcoes = porcoesDaSemana();

  /* Soma os ingredientes. O que entra na conta é o que vai ser COZIDO: em
     lote, a panela inteira, mesmo que a semana peça menos que ela. */
  const total = {};
  Object.keys(porcoes).forEach(idReceita => {
    const r = receitaDe(idReceita);
    if(!r) return;
    ingredientesPara(r, porcoesCozidas(r, porcoes[idReceita])).forEach(ing => {
      total[ing.id] = (total[ing.id] || 0) + ing.qtd;
    });
  });

  const itens = Object.keys(total).map(id => {
    const a = ALIMENTOS[id];
    return {
      id: 'c:' + id,
      nome: a.nome,
      qtd: formatarQuantidade(total[id], a),
      /* No mercado ninguém compra 760 g de arroz: compra pacote. O banco de
         alimentos sempre soube o tamanho da embalagem e a lista nunca disse. */
      embalagem: embalagemPara(total[id], a),
      secao: SECAO_DA_DESPENSA[a.sec] || 'Mercado',
      feito: false
    };
  });

  /* Remédios acabando entram na Farmácia */
  Dados.remedios.forEach(m => {
    if(m.diasRestantes !== undefined && m.diasRestantes <= DIAS_PARA_REPOR){
      itens.push({
        id: 'c:med:' + m.id,
        nome: m.nome,
        qtd: 'acaba em ' + m.diasRestantes + (m.diasRestantes === 1 ? ' dia' : ' dias'),
        secao: 'Farmácia',
        feito: false
      });
    }
  });

  itens.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  return itens;
}

/**
 * Quantas embalagens fechadas dão conta da quantidade.
 *
 * Devolve '' para alimento sem embalagem conhecida (carne, hortifruti — que
 * se compram a peso mesmo) e para o que já é contado em unidade.
 */
export function embalagemPara(qtd, alimento){
  if(!alimento || !alimento.emb || alimento.un === 'un') return '';
  const n = Math.ceil(qtd / alimento.emb - 0.001);
  if(n < 1) return '';
  const desc = alimento.embDesc || (alimento.emb + ' ' + alimento.un);
  return n === 1 ? '1 ' + desc : n + ' × ' + desc;
}

/** Arredonda pra cima, pra não faltar na hora de cozinhar. */
export function formatarQuantidade(qtd, alimento){
  if(alimento.un === 'un'){
    const n = Math.ceil(qtd - 0.001);
    return n + ' un.';
  }
  if(alimento.un === 'ml'){
    if(qtd >= 1000) return limparZeros(Math.ceil(qtd / 50) * 50 / 1000) + ' L';
    return Math.ceil(qtd / 10) * 10 + ' ml';
  }
  if(qtd >= 1000) return limparZeros(Math.ceil(qtd / 50) * 50 / 1000) + ' kg';
  return Math.ceil(qtd / 10) * 10 + ' g';
}

export function limparZeros(n){
  return String(n.toFixed(2)).replace(/\.?0+$/, '').replace('.', ',');
}

export function comprasAtuais(){
  return Dados.compras || null;
}

export function comprasFaltando(){
  const lista = comprasAtuais();
  return lista ? lista.filter(i => !i.feito).length : 0;
}


/* ===========================================================================
   TREINO
   =========================================================================== */

export function treinoDoDia(diaK){
  return Dados.treinos.filter(t => t.dia === diaK)[0] || null;
}

export function voltasDoTreino(treino){
  return treino && treino.circuito ? [1, 2, 3] : [1];
}

/** Quantos exercícios já foram marcados, somando todas as voltas. */
export function progressoDoTreino(iso, treino){
  if(!treino) return {feitos: 0, total: 0};
  const voltas = voltasDoTreino(treino);
  let feitos = 0;
  voltas.forEach(v => {
    treino.exercicios.forEach(ex => {
      if(ex && exercicioFeito(iso, treino.id, v, ex.id)) feitos++;
    });
  });
  return {feitos: feitos, total: voltas.length * treino.exercicios.length};
}


/* ===========================================================================
   CAIXA DE REMÉDIOS
   =========================================================================== */

/**
 * As colunas da caixa são só os compartimentos EM USO.
 * Ninguém toma nada à noite → a coluna Noite não existe. É o que faz a grade
 * parecer a caixinha física da pessoa, e não um formulário genérico.
 */
export function compartimentosEmUso(){
  return COMPARTIMENTOS.filter(c => Dados.remedios.some(m => m.compartimento === c));
}

export function remediosDoCompartimento(comp){
  return Dados.remedios.filter(m => m.compartimento === comp);
}

/** Estado de uma célula da grade: quem manda no visual e no toque. */
export function estadoDaCelula(iso, comp){
  const meds = remediosDoCompartimento(comp);
  if(!meds.length) return 'vazio';
  if(ehFuturo(iso)) return 'futuro';
  const todosTomados = meds.every(m => remedioTomado(iso, m));
  if(todosTomados) return 'tomado';
  return ehHoje(iso) ? 'a-tomar' : 'nao-tomado';
}

export function remediosPendentesHoje(iso){
  return Dados.remedios.filter(m => !remedioTomado(iso, m));
}
