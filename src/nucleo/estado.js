/* ===========================================================================
   ESTADO — a única cópia dos dados, gravação e desfazer

   Duas coisas moram aqui:

   `Dados` — o que o usuário construiu. É persistido e pode ser desfeito.
   `Tela`  — onde ele está agora (aba aberta, dia escolhido, modo de edição).
             Não é desfazível: desfazer um toque de aba seria confuso.

   Toda mudança em `Dados` passa por agir(), que tira uma fotografia antes de
   mexer. É essa fotografia que o botão "Desfazer" restaura — inteira, de uma
   vez. Por isso desfazer um arraste volta pro estado de antes do gesto
   começar, e não pro quadro anterior do movimento.
   =========================================================================== */

import { MODELO } from '../dados/modelo.js';
import { armazem, clonar, migrar, CHAVE, VERSAO_ESQUEMA } from './armazem.js';
import { redesenhar } from './render.js';

const SEGUNDOS_DO_AVISO = 4.2;

/* `export let` cria uma ligação viva: quem importa `Dados` enxerga o valor
   atual, inclusive depois de desfazer trocar o objeto inteiro. */
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

/** Troca os dados inteiros. Usado pelo desfazer e por "Começar do zero". */
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
   Nada aqui é desfazível e só a aba sobrevive ao recarregamento. */
export const Tela = {
  aba: armazem.ler('rotina_aba_v4') || 'inicio',
  data: null,          // data ISO selecionada — preenchida no início
  abaComida: 'hoje',   // hoje | semana | compras
  editando: {dia:false, treino:false, comida:false, caixa:false},
  volta: 1,            // volta de circuito selecionada no treino
  folha: null,         // folha aberta (null quando não há)
  segurando: null,     // id do bloco sob toque longo
  arrastando: null,    // {id, modo} durante o arraste
  replanejar: null,    // proposta de replanejamento aberta
  /* Tela de escolha reaberta de propósito. Fica só aqui, e não nos dados,
     porque reabrir não pode ser algo que sobrevive a fechar o app: enquanto
     a pessoa não escolhe, nada aconteceu. */
  primeiroUso: false
};

export function definirTela(patch){
  Object.assign(Tela, patch);
  if(patch.aba) armazem.gravar('rotina_aba_v4', patch.aba);
  redesenhar();
}


/* --- Mudanças com desfazer ------------------------------------------------ */
export let avisoAtual = null;      // {msg, foto} ou null
let timerAviso = null;

/**
 * Aplica uma mudança nos dados e oferece desfazer.
 *
 *   agir('Café marcado', d => { d.refeicoesFeitas[chave] = true; });
 *
 * A fotografia é tirada ANTES, então desfazer volta tudo de uma vez.
 */
export function agir(mensagem, mutacao){
  const foto = clonar(Dados);
  mutacao(Dados);
  salvarDados();
  mostrarAviso(mensagem, foto);
  redesenhar();
}

/** Mudança sem desfazer — para ajustes que não valem um aviso. */
export function agirSemAviso(mutacao){
  mutacao(Dados);
  salvarDados();
  redesenhar();
}

export function mostrarAviso(mensagem, foto){
  avisoAtual = {msg: mensagem, foto: foto || null};
  clearTimeout(timerAviso);
  timerAviso = setTimeout(() => { avisoAtual = null; redesenhar(); }, SEGUNDOS_DO_AVISO * 1000);
  redesenhar();
}

/** Aviso sem desfazer — para recusas ("Dia futuro — marque no dia"). */
export function avisar(mensagem){
  mostrarAviso(mensagem, null);
}

export function desfazer(){
  if(!avisoAtual || !avisoAtual.foto) return;
  const foto = avisoAtual.foto;
  avisoAtual = null;
  clearTimeout(timerAviso);
  substituirDados(foto);
  redesenhar();
}

export function fecharAviso(){
  avisoAtual = null;
  clearTimeout(timerAviso);
  redesenhar();
}
