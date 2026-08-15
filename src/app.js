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
import { hojeISO, ehPassado } from './nucleo/tempo.js';
import { h, icone, desenharFolha, desenharAviso } from './ui/index.js';
import { telaInicio } from './telas/inicio.js';
import { telaDia } from './telas/dia.js';
import { telaTreino } from './telas/treino.js';
import { telaComida } from './telas/comida.js';
import { telaCaixa } from './telas/caixa.js';
import { telaPrimeiroUso, telaReplanejar } from './telas/extras.js';

const ABAS = [
  {id:'inicio', rotulo:'Início', icone:'casa',       desenhar: telaInicio},
  {id:'dia',    rotulo:'Dia',    icone:'calendario', desenhar: telaDia},
  {id:'treino', rotulo:'Treino', icone:'halteres',   desenhar: telaTreino},
  {id:'comida', rotulo:'Comida', icone:'talheres',   desenhar: telaComida},
  {id:'caixa',  rotulo:'Caixa',  icone:'cartela',    desenhar: telaCaixa}
];

function abaAtual(){
  return ABAS.filter(a => a.id === Tela.aba)[0] || ABAS[0];
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

  try{
    conteudo.textContent = '';
    conteudo.appendChild(abaAtual().desenhar());

    camadas.textContent = '';
    /* Ordem importa: a última anexada fica por cima. */
    if(Tela.replanejar) camadas.appendChild(telaReplanejar());
    if(!Dados.aceitouModelo) camadas.appendChild(telaPrimeiroUso());
    const folha = desenharFolha();
    if(folha) camadas.appendChild(folha);
    const aviso = desenharAviso();
    if(aviso) camadas.appendChild(aviso);

    desenharAbas();
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
        catch(e){ /* campo sem seleção posicionável (type=search em alguns navegadores) */ }
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

/* --- Início --------------------------------------------------------------- */
export function iniciar(){
  registrarDesenho(desenharTudo);

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

  /* Voltar ao app depois de um tempo: se o dia virou, a tela acompanha. */
  document.addEventListener('visibilitychange', () => {
    if(document.visibilityState !== 'visible') return;
    if(Tela.data && ehPassado(Tela.data) && !Dados.blocos[Tela.data]) Tela.data = hojeISO();
    desenharTudo();
  });
}
