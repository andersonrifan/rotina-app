/* ===========================================================================
   ESTADO — a única cópia dos dados e a gravação

   Duas coisas moram aqui:

   `Dados` — o que o usuário construiu. É persistido.
   `Tela`  — onde ele está agora (aba aberta, dia escolhido, modo de edição).
             Some ao fechar o app, fora as exceções marcadas caso a caso.

   Toda mudança em `Dados` passa por agir(), que grava e confirma na tela.
   =========================================================================== */

import { MODELO } from '../dados/modelo.js';
import { armazem, clonar, migrar, CHAVE, VERSAO_ESQUEMA } from './armazem.js';
import { redesenhar } from './render.js';

const SEGUNDOS_DO_AVISO = 4.2;

/* `export let` cria uma ligação viva: quem importa `Dados` enxerga o valor
   atual, inclusive depois de restaurar um backup trocar o objeto inteiro. */
export let Dados = null;

/** Monta os dados iniciais a partir de uma rotina-modelo. */
export function dadosIniciais(modelo){
  return {
    versao: VERSAO_ESQUEMA,
    /* Enquanto for false, a tela de Primeiro uso cobre o app. */
    aceitouModelo: false,

    /* Estrutura — vale pra semana inteira, não pra uma data. */
    perfil:   clonar(modelo.perfil),
    fixos:    clonar(modelo.fixos),
    slots:    clonar(modelo.slots),
    treinos:  clonar(modelo.treinos),
    remedios: clonar(modelo.remedios),
    cardapio: clonar(modelo.cardapio),

    /* Exceções por data: quando o usuário edita um dia específico, os blocos
       daquele dia são materializados aqui e passam a ignorar a geração. */
    blocos: {},

    /* Marcações — sempre por data (chave 'AAAA-MM-DD'). */
    status:          {},   // 'data:idDoBloco'      → '' | feito | atrasei | pulei
    tomados:         {},   // 'data:idDoRemedio'    → true/false
    refeicoesFeitas: {},   // 'data:idDoSlot'       → true/false
    exercFeitos:     {},   // 'data:treino:volta:i' → true/false
    reabertos:       {},   // 'data'                → true (dia passado liberado)

    /* Sessões de treino: o que foi FEITO, não o que estava planejado.
       Chave 'data:idDoTreino'. Ver `sessaoDe` em sessoes.js. */
    sessoes: {},

    /* Lista de compras materializada. null = ainda não gerada. */
    compras: null
  };
}

/**
 * Carrega do armazenamento, migrando o esquema se preciso.
 * `modelo` permite que os testes injetem uma rotina controlada.
 */
export function carregar(modelo){
  const cru = armazem.ler(CHAVE);
  if(cru){
    try{
      const salvo = JSON.parse(cru);
      if(salvo && typeof salvo === 'object' && salvo.slots){
        const migrado = migrar(salvo);
        if(migrado){ Dados = migrado; return Dados; }
      }
    }catch(err){
      console.warn('Dados salvos ilegíveis — recomeçando do modelo.', err);
    }
  }
  Dados = dadosIniciais(modelo || MODELO);
  return Dados;
}

export function salvarDados(){
  armazem.gravar(CHAVE, JSON.stringify(Dados));
}

/** Troca os dados inteiros. Usado ao restaurar backup e ao recomeçar. */
export function substituirDados(novos){
  Dados = novos;
  salvarDados();
}

/**
 * Roda `fn` sobre uma CÓPIA dos dados e devolve o resultado, sem gravar nada
 * e sem deixar rastro no estado real.
 *
 * Serve para responder "e se?" — é assim que a tela de replanejar calcula o
 * impacto de um plano na semana antes de o usuário aceitá-lo.
 *
 * Precisa morar aqui porque só este módulo pode reatribuir `Dados`: quem
 * importa a ligação enxerga o valor, mas não pode trocá-lo. O `finally`
 * garante que os dados reais voltem mesmo se `fn` lançar.
 */
export function simular(fn){
  const real = Dados;
  Dados = clonar(real);
  try{ return fn(Dados); }
  finally{ Dados = real; }
}


/* --- O estado da tela -----------------------------------------------------
   Só a aba e a visão do Dia sobrevivem ao recarregamento. */
export const Tela = {
  aba: armazem.ler('rotina_aba_v4') || 'inicio',
  data: null,          // data ISO selecionada — preenchida no início
  abaComida: 'hoje',   // hoje | semana | compras
  /* Visão da aba Dia: 'agenda' (altura proporcional à duração) ou 'lista'.
     Persistida porque é preferência de leitura, não estado passageiro. */
  visaoDia: armazem.ler('rotina_visao_dia') || 'agenda',
  editando: {dia:false, treino:false, comida:false, caixa:false},
  volta: 1,            // volta de circuito selecionada no treino
  folha: null,         // folha aberta (null quando não há)
  segurando: null,     // id do bloco sob toque longo
  arrastando: null,    // {id, modo} durante o arraste
  /* Tela de escolha reaberta de propósito. Fica só aqui, e não nos dados,
     porque reabrir não pode ser algo que sobrevive a fechar o app: enquanto
     a pessoa não escolhe, nada aconteceu. */
  primeiroUso: false,
  /* Tela de perfil aberta por cima do app. */
  perfil: false,
  /* Tela de estatísticas, aberta a partir do Perfil ou do Início. */
  estatisticas: false
};

export function definirTela(patch){
  Object.assign(Tela, patch);
  if(patch.aba) armazem.gravar('rotina_aba_v4', patch.aba);
  if(patch.visaoDia) armazem.gravar('rotina_visao_dia', patch.visaoDia);
  redesenhar();
}


/* --- Mudanças e avisos ----------------------------------------------------
   Não há desfazer.

   Havia: cada `agir` clonava o estado inteiro antes de mexer, e o aviso trazia
   um botão "Desfazer". Na prática o aviso ficava no caminho o tempo todo — ele
   aparece a cada toque, e num app em que quase tudo é um toque isso é constante.

   O que ficou no lugar: as ações destrutivas de verdade (restaurar backup,
   recomeçar, excluir treino) pedem confirmação ANTES, que é onde a proteção
   realmente pertence. O aviso virou só uma confirmação passageira do que
   aconteceu, e o clone por toque deixou de existir. */

export let avisoAtual = null;      // string com a mensagem, ou null
let timerAviso = null;

/**
 * Aplica uma mudança nos dados e confirma na tela.
 *
 *   agir('Café marcado', d => { d.refeicoesFeitas[chave] = true; });
 */
export function agir(mensagem, mutacao){
  mutacao(Dados);
  salvarDados();
  avisar(mensagem);
}

/** Mudança silenciosa — para ajustes contínuos, como mexer num stepper. */
export function agirSemAviso(mutacao){
  mutacao(Dados);
  salvarDados();
  redesenhar();
}

/** Mostra um aviso passageiro. Serve tanto para confirmar quanto para recusar. */
export function avisar(mensagem){
  avisoAtual = mensagem;
  clearTimeout(timerAviso);
  timerAviso = setTimeout(() => { avisoAtual = null; redesenhar(); }, SEGUNDOS_DO_AVISO * 1000);
  redesenhar();
}

export function fecharAviso(){
  avisoAtual = null;
  clearTimeout(timerAviso);
  redesenhar();
}
