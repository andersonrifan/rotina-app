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
import { h, icone, desenharFolha, desenharAviso } from './ui/index.js';
import { telaInicio } from './telas/inicio.js';
import { telaDia } from './telas/dia.js';
import { telaTreino } from './telas/treino.js';
import { telaComida } from './telas/comida.js';
import { telaCaixa } from './telas/caixa.js';
import { telaPrimeiroUso } from './telas/extras.js';
import { telaBoasVindas, telaPerfil, precisaDeNome } from './telas/perfil.js';
import { telaEstatisticas } from './telas/estatisticas.js';

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
    if(Tela.perfil) camadas.appendChild(telaPerfil());
    if(Tela.estatisticas) camadas.appendChild(telaEstatisticas());
    /* A abertura tem uma ORDEM: primeiro o nome, depois a rotina.
       O `else if` importa — empilhar as duas deixaria a de baixo invisível
       mas ainda alcançável por Tab e lida por leitor de tela. */
    if(precisaDeNome()){
      camadas.appendChild(telaBoasVindas());
    } else if(!Dados.aceitouModelo || Tela.primeiroUso){
      camadas.appendChild(telaPrimeiroUso());
    }
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
async function ligarBotaoVoltar(){
  try{
    const { App } = await import('@capacitor/app');
    App.addListener('backButton', () => {
      if(Tela.folha){ definirTela({folha: null}); return; }
      if(Tela.estatisticas){ definirTela({estatisticas: false}); return; }
      if(Tela.perfil){ definirTela({perfil: false}); return; }
      if(Tela.primeiroUso){ definirTela({primeiroUso: false}); return; }

      const emEdicao = Object.keys(Tela.editando).filter(k => Tela.editando[k])[0];
      if(emEdicao){
        definirTela({editando: Object.assign({}, Tela.editando, {[emEdicao]: false})});
        return;
      }
      /* Fora do Início, Voltar leva ao Início — a raiz do app. */
      if(Tela.aba !== 'inicio'){ definirTela({aba: 'inicio'}); return; }
      App.exitApp();
    });
  }catch(_err){
    /* Navegador comum: não existe botão Voltar de sistema para ouvir, e isso
       não é uma falha — é o caso normal fora do app empacotado. */
  }
}

/* --- Início --------------------------------------------------------------- */
export function iniciar(){
  registrarDesenho(desenharTudo);
  ligarBotaoVoltar();

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
