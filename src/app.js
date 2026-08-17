/* ===========================================================================
   APP — roteamento, barra de abas e o ciclo de desenho

   O app redesenha a tela inteira a cada mudança, em vez de remendar pedaços.
   Com o tamanho de tela de um celular isso é barato e elimina uma classe
   inteira de bug: a interface nunca fica dessincronizada dos dados, porque é
   sempre construída a partir deles do zero.

   Duas concessões ao redesenho total, ambas tratadas em desenharTudo():
   preservar a rolagem e devolver o foco do teclado.
   =========================================================================== */

import { MODELO } from './dados/modelo.js';
import { Tela, Dados, carregar, definirTela, dadosIniciais, substituirDados } from './nucleo/estado.js';
import { registrarDesenho } from './nucleo/render.js';
import { hojeISO } from './nucleo/tempo.js';
import { h, icone, desenharFolha, desenharAviso, fecharFolha } from './ui/index.js';
import { telaInicio } from './telas/inicio.js';
import { telaDia } from './telas/dia.js';
import { telaTreino } from './telas/treino.js';
import { telaComida } from './telas/comida.js';
import { telaCaixa } from './telas/caixa.js';
import { telaPrimeiroUso } from './telas/extras.js';
import { telaBoasVindas, telaPerfil, precisaDeNome } from './telas/perfil.js';
import { telaEstatisticas } from './telas/estatisticas.js';
import { telaSemana } from './telas/semana.js';
import { telaReceita, fecharReceita } from './telas/receita.js';

/* O id da aba do calendário continua 'dia' — ele é chave de armazenamento e
   de estado, e renomear id gravado só criaria migração para trocar uma
   palavra na tela. O rótulo é "Rotina" porque é isso que a aba mostra: a
   semana que se repete, não uma data solta. */
const ABAS = [
  {id:'inicio', rotulo:'Início', icone:'casa',       desenhar: telaInicio},
  {id:'dia',    rotulo:'Rotina', icone:'calendario', desenhar: telaDia},
  {id:'treino', rotulo:'Treino', icone:'halteres',   desenhar: telaTreino},
  {id:'comida', rotulo:'Comida', icone:'talheres',   desenhar: telaComida},
  {id:'caixa',  rotulo:'Caixa',  icone:'cartela',    desenhar: telaCaixa}
];

function abaAtual(){
  return ABAS.filter(a => a.id === Tela.aba)[0] || ABAS[0];
}

/**
 * Aplica o tema escolhido.
 *
 * 'auto' não escreve atributo nenhum: sem ele, quem manda é o
 * `prefers-color-scheme` do aparelho, e o tema já vale desde a primeira
 * pintura — antes de o JavaScript rodar. Escolher claro ou escuro é que
 * escreve `data-tema`, e aí a escolha vence o sistema nos dois sentidos.
 */
function aplicarTema(){
  const tema = (Dados && Dados.perfil && Dados.perfil.tema) || 'auto';
  const raiz = document.documentElement;
  if(tema === 'auto') raiz.removeAttribute('data-tema');
  else raiz.setAttribute('data-tema', tema);
}

/* --- O ciclo de desenho --------------------------------------------------- */
function desenharTudo(){
  const conteudo = document.getElementById('conteudo');
  const camadas = document.getElementById('camadas');
  if(!conteudo || !Dados) return;

  /* Guarda o que se perderia ao trocar o DOM inteiro. */
  const rolagem = conteudo.scrollTop;
  const focado = document.activeElement;
  const seletorFocado = focado && focado.classList && focado.classList.contains('campo-entrada')
    ? '.' + Array.prototype.join.call(focado.classList, '.') : null;
  const posicaoCursor = seletorFocado ? focado.selectionStart : null;

  aplicarTema();

  try{
    conteudo.textContent = '';
    conteudo.appendChild(abaAtual().desenhar());

    camadas.textContent = '';
    /* Ordem importa: a última anexada fica por cima. */
    let temModal = false;
    if(Tela.perfil){ camadas.appendChild(telaPerfil()); temModal = true; }
    if(Tela.semana){ camadas.appendChild(telaSemana()); temModal = true; }
    if(Tela.estatisticas){ camadas.appendChild(telaEstatisticas()); temModal = true; }
    if(Tela.receita){ camadas.appendChild(telaReceita()); temModal = true; }
    /* A abertura tem uma ORDEM: primeiro o nome, depois a rotina.
       O `else if` importa — empilhar as duas deixaria a de baixo invisível
       mas ainda alcançável por Tab e lida por leitor de tela. */
    if(precisaDeNome()){
      camadas.appendChild(telaBoasVindas());
      temModal = true;
    } else if(!Dados.aceitouModelo || Tela.primeiroUso){
      camadas.appendChild(telaPrimeiroUso());
      temModal = true;
    }
    const folha = desenharFolha();
    if(folha){ camadas.appendChild(folha); temModal = true; }
    /* O aviso NÃO conta como modal: ele é passageiro e não cobre nada. */
    const aviso = desenharAviso();
    if(aviso) camadas.appendChild(aviso);

    desenharAbas();

    /* O que está coberto para de existir para o teclado e para o leitor de
       tela. É o que faz `aria-modal` deixar de ser uma promessa vazia: sem
       isto o Tab continuava passeando pela tela de trás. */
    conteudo.inert = temModal;
    document.getElementById('abas').inert = temModal;
  }catch(err){
    console.error('Falha ao desenhar a tela:', err);
    mostrarErroDeInicio('Não consegui desenhar a tela "' + Tela.aba + '".');
    return;
  }

  conteudo.scrollTop = rolagem;
  if(seletorFocado){
    const novo = conteudo.querySelector(seletorFocado) || camadas.querySelector(seletorFocado);
    if(novo){
      novo.focus();
      if(posicaoCursor !== null && novo.setSelectionRange){
        try{ novo.setSelectionRange(posicaoCursor, posicaoCursor); }
        catch(_e){ /* campo sem seleção posicionável (type=search em alguns navegadores) */ }
      }
    }
  }
}

function desenharAbas(){
  const nav = document.getElementById('abas');
  nav.textContent = '';
  ABAS.forEach(aba => {
    const ativa = aba.id === Tela.aba;
    nav.appendChild(h('button', {
        class: 'aba' + (ativa ? ' ativa' : ''),
        type: 'button',
        'aria-current': ativa ? 'page' : null,
        onTap: () => definirTela({aba: aba.id, folha: null})
      },
      icone(aba.icone, 20),
      h('span', {class:'aba-rotulo'}, aba.rotulo)
    ));
  });
}

function mostrarErroDeInicio(mensagem){
  const el = document.getElementById('erro-inicio');
  if(!el){ alert(mensagem); return; }
  el.textContent = '⚠ ' + mensagem + ' Recarregue o app; se persistir, restaure um backup.';
  el.classList.add('visivel');
}

/* ===========================================================================
   O BOTÃO VOLTAR DO ANDROID

   Sem isto, Voltar com uma folha aberta fecha o app inteiro — e a folha é
   onde a pessoa está digitando. Num app instalado, Voltar é o gesto de sair
   de uma camada, não de sair de tudo.

   A ordem é a da pilha visual: fecha primeiro o que está mais por cima, e o
   app só termina quando não há mais nada de onde voltar. `exitApp` fica por
   último e é a única saída que encerra de verdade.

   O plugin do Capacitor não existe no navegador comum: lá o evento nunca
   dispara e o `catch` cobre o import ausente. Nada disso muda o build web.
   =========================================================================== */
/**
 * Sobe uma camada. Devolve false quando não havia de onde voltar — e aí só
 * sobra sair do app.
 */
function voltarUmaCamada(){
  if(Tela.folha){ fecharFolha(); return true; }
  if(Tela.receita){ fecharReceita(); return true; }
  /* As duas telas de dentro devolvem para o Perfil, de onde vieram — o mesmo
     que os botões "Voltar" delas fazem. */
  if(Tela.estatisticas){ definirTela({estatisticas: false, perfil: true}); return true; }
  if(Tela.semana){ definirTela({semana: false, perfil: true}); return true; }
  if(Tela.perfil){ definirTela({perfil: false}); return true; }
  if(Tela.primeiroUso){ definirTela({primeiroUso: false}); return true; }

  const emEdicao = Object.keys(Tela.editando).filter(k => Tela.editando[k])[0];
  if(emEdicao){
    definirTela({editando: Object.assign({}, Tela.editando, {[emEdicao]: false})});
    return true;
  }
  /* Fora do Início, Voltar leva ao Início — a raiz do app. */
  if(Tela.aba !== 'inicio'){ definirTela({aba: 'inicio'}); return true; }
  return false;
}

async function ligarBotaoVoltar(){
  try{
    const { App } = await import('@capacitor/app');
    App.addListener('backButton', () => {
      if(!voltarUmaCamada()) App.exitApp();
    });
  }catch(_err){
    /* Navegador comum: não existe botão Voltar de sistema para ouvir, e isso
       não é uma falha — é o caso normal fora do app empacotado. */
  }
}

/* Esc é o Voltar de quem está no teclado. Mesma pilha, mesma ordem — só não
   fecha o app, porque nenhuma tecla deveria fazer isso. */
function ligarEscape(){
  document.addEventListener('keydown', ev => {
    if(ev.key !== 'Escape') return;
    if(voltarUmaCamada()) ev.preventDefault();
  });
}

/**
 * Pede ao navegador que NÃO apague estes dados sozinho.
 *
 * Sem isto o armazenamento é "melhor esforço": sob pressão de espaço o Android
 * despeja o localStorage dos sites, e a rotina inteira some sem aviso. É um
 * pedido, não uma garantia — o navegador decide —, mas custa uma linha e é a
 * diferença entre pedir e não pedir.
 */
function pedirArmazenamentoPersistente(){
  try{
    if(navigator.storage && navigator.storage.persist) navigator.storage.persist();
  }catch(_err){
    /* Navegador sem a API: os dados continuam onde sempre estiveram. */
  }
}

/* --- Início --------------------------------------------------------------- */
export function iniciar(){
  registrarDesenho(desenharTudo);
  ligarBotaoVoltar();
  ligarEscape();
  pedirArmazenamentoPersistente();

  try{
    carregar(MODELO);
  }catch(err){
    console.error('Falha ao carregar os dados:', err);
    substituirDados(dadosIniciais(MODELO));
  }

  /* A data selecionada começa sempre em hoje: é o que a pessoa quer ver ao
     abrir o app. Não é persistida de propósito — abrir amanhã no dia de
     ontem seria desorientador. */
  Tela.data = hojeISO();

  desenharTudo();

  /* O cartão "acontecendo agora" e as marcações automáticas dependem do
     relógio. Um redesenho por minuto mantém tudo honesto sem custo real. */
  setInterval(() => {
    if(Tela.aba === 'inicio' || Tela.aba === 'dia') desenharTudo();
  }, 60000);

  /* Voltar ao app depois de um tempo: se A DATA VIROU enquanto ele estava em
     segundo plano, a tela acompanha.

     A condição é essa e não "o dia selecionado está no passado". Rever a
     quarta passada é uso normal — trocar de app e voltar não pode jogar você
     para hoje e fazer perder o lugar. */
  let dataDoUltimoDesenho = hojeISO();
  document.addEventListener('visibilitychange', () => {
    if(document.visibilityState !== 'visible') return;
    const agora = hojeISO();
    if(agora !== dataDoUltimoDesenho){
      dataDoUltimoDesenho = agora;
      Tela.data = agora;
    }
    desenharTudo();
  });
}
