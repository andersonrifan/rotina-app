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
  paraMinutos, diaDaSemana,
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

export function gerarDia(iso){
  const dia = diaDaSemana(iso);
  const blocos = [];

  (Dados.fixos[dia.k] || []).forEach((f, i) => {
    blocos.push({
      id: 'fixo:' + dia.k + ':' + i,
      hora: f[0], dur: f[1], titulo: f[2], cat: f[3], sub: ''
    });
  });

  Dados.slots.forEach(slot => {
    const prato = pratoDe(dia.k, slot.id);
    blocos.push({
      id: 'slot:' + slot.id,
      hora: slot.hora, dur: slot.dur,
      titulo: slot.nome, cat: 'refeicao',
      sub: prato ? prato.nome : ''
    });
  });

  const treino = treinoDoDia(dia.k);
  if(treino){
    blocos.push({
      id: 'treino:' + treino.id,
      hora: treino.hora, dur: treino.dur,
      titulo: treino.nome, cat: 'exercicio', sub: ''
    });
  }

  return ordenarPorHora(blocos);
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

export function exercicioFeito(iso, treinoId, volta, indice){
  return !!Dados.exercFeitos[iso + ':' + treinoId + ':' + volta + ':' + indice];
}


/* ===========================================================================
   COMIDA
   =========================================================================== */

/** O prato do cardápio para um dia da semana + refeição, com kcal e proteína. */
export function pratoDe(diaK, slotId){
  const id = (Dados.cardapio[diaK] || {})[slotId];
  if(!id) return null;
  const receita = RECEITAS.filter(r => r.id === id)[0];
  if(!receita) return null;
  const n = nutriDaReceita(receita);
  return {id: receita.id, nome: receita.nome, kcal: Math.round(n.kcal), prot: Math.round(n.prot)};
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
  /* Quantas porções de cada receita a semana pede */
  const porcoes = {};
  DIAS.forEach(d => {
    Object.keys(Dados.cardapio[d.k] || {}).forEach(slotId => {
      const id = Dados.cardapio[d.k][slotId];
      if(id) porcoes[id] = (porcoes[id] || 0) + 1;
    });
  });

  /* Soma os ingredientes, escalando cada receita pela fração usada */
  const total = {};
  Object.keys(porcoes).forEach(idReceita => {
    const r = RECEITAS.filter(x => x.id === idReceita)[0];
    if(!r) return;
    const fator = porcoes[idReceita] / r.porcoes;
    r.ingr.forEach(([idAlim, q]) => {
      if(!ALIMENTOS[idAlim]) return;
      total[idAlim] = (total[idAlim] || 0) + q * fator;
    });
  });

  const itens = Object.keys(total).map(id => {
    const a = ALIMENTOS[id];
    return {
      id: 'c:' + id,
      nome: a.nome,
      qtd: formatarQuantidade(total[id], a),
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
    treino.exercicios.forEach((ex, i) => { if(exercicioFeito(iso, treino.id, v, i)) feitos++; });
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
