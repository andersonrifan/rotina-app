import { MODELO, MODELO_VAZIO } from '../dados/modelo.js';
import { Dados, Tela, avisar, definirTela, dadosIniciais, substituirDados } from '../nucleo/estado.js';
import { salvarBackup } from '../nucleo/backup.js';
import { clonar } from '../nucleo/armazem.js';
import { hojeISO } from '../nucleo/tempo.js';
import { h } from '../ui/index.js';

/* ===========================================================================
   TELA 6 — PRIMEIRO USO

   Cobre o app inteiro em vez de morar numa aba, porque pede uma decisão antes
   de continuar.

   Aparece sozinha na primeira vez, e pode ser chamada de novo pelo botão
   "Recomeçar" em Início → Seus dados.

   Os dois casos usam a mesma tela, mas não são a mesma coisa:

     PRIMEIRA VEZ   não há nada a perder. Escolher é só escolher.
     RECOMEÇANDO    já existe uma rotina montada, e qualquer das duas opções
                    vai apagá-la. Por isso, nesse caso, a tela ganha um aviso,
                    um atalho para baixar o backup antes, e uma saída.

   A reabertura NÃO é gravada: se a pessoa fechar o app aqui, nada aconteceu.
   Os dados só são tocados quando ela escolhe uma das duas opções.
   =========================================================================== */
export function telaPrimeiroUso(){
  /* `Tela.primeiroUso` só é verdadeiro quando a tela foi reaberta de
     propósito — é o que distingue os dois casos acima. */
  const recomecando = Tela.primeiroUso;

  const passos = [
    ['1', 'Trabalho e faculdade', 'Os horários fixos da semana já posicionados, de segunda a sexta.'],
    ['2', 'Refeições e treinos',  'Cinco refeições com cardápio e três treinos de força e mobilidade.'],
    ['3', 'Remédios',             'Três suplementos distribuídos nos compartimentos da caixa.']
  ];

  return h('div', {class:'primeiro-uso'},
    h('div', {class:'primeiro-uso-conteudo'},
      h('div', {class:'rotulo-secao'}, recomecando ? 'Recomeçar' : 'Primeiro uso'),
      h('h1', {class:'titulo-tela grande'}, 'Sua semana modelo'),
      h('p', {class:'primeiro-uso-texto'},
        'O app já vem com uma semana montada, pra você ver como tudo se encaixa antes de mexer. ' +
        'Nada aqui é definitivo: cada bloco, refeição e treino pode ser mudado depois.'),

      recomecando ? avisoDeQuePerdeTudo() : null,

      h('div', {class:'passos'},
        passos.map(([n, titulo, texto]) => h('div', {class:'passo'},
          h('span', {class:'passo-numero'}, n),
          h('div', null,
            h('div', {class:'passo-titulo'}, titulo),
            h('div', {class:'passo-texto'}, texto)
          )
        ))
      ),

      h('div', {class:'primeiro-uso-acoes'},
        h('button', {class:'btn btn-forte alto', type:'button', onTap: aceitarModelo},
          recomecando ? 'Recomeçar com o exemplo' : 'Usar a rotina-modelo'),
        h('button', {class:'btn btn-transparente', type:'button', onTap: comecarDoZero},
          'Começar do zero'),
        recomecando
          ? h('button', {class:'btn btn-transparente', type:'button',
              onTap: () => definirTela({primeiroUso: false})}, 'Voltar sem mudar nada')
          : null
      )
    )
  );
}

/* Só aparece quando há uma rotina montada para perder. */
function avisoDeQuePerdeTudo(){
  return h('div', {class:'nota destaque'},
    h('div', null,
      'As duas opções abaixo apagam a rotina que está neste aparelho: ' +
      'blocos, treinos, cardápio, remédios e todas as marcações.'),
    h('button', {class:'btn btn-suave largura-cheia', type:'button',
      onTap: baixarAntesDeRecomecar}, 'Baixar backup antes')
  );
}

function baixarAntesDeRecomecar(){
  salvarBackup().then(saida => {
    if(saida) avisar('Backup ' + saida.via + ': ' + saida.nome);
  }).catch(err => {
    console.error('Falha ao exportar antes de recomeçar:', err);
    avisar('Não consegui salvar o arquivo. Use Perfil → Copiar como texto.');
  });
}

/**
 * Troca a rotina inteira, preservando quem você é.
 *
 * Nome e metas NÃO vêm do modelo: trocar de rotina não te transforma em outra
 * pessoa, e a rotina-modelo não carrega o nome de ninguém (ver
 * `MODELO.perfil.nome`, vazio de propósito).
 */
function trocarRotina(modelo){
  const perfil = clonar(Dados.perfil);
  substituirDados(Object.assign(dadosIniciais(modelo), {
    aceitouModelo: true,
    perfil: perfil
  }));
}

/** Recarrega a rotina-modelo do zero, descartando o que existia. */
export function aceitarModelo(){
  /* Recarregar o MODELO importa quando a tela foi REABERTA: sem isso,
     "recomeçar com o exemplo" manteria as edições da pessoa e não recomeçaria
     nada. Na primeira vez os dados já são o MODELO, então é inofensivo. */
  trocarRotina(MODELO);
  definirTela({primeiroUso: false, aba: 'inicio', data: hojeISO()});
}

/** Estrutura vazia, para a pessoa montar a própria semana. */
export function comecarDoZero(){
  trocarRotina(MODELO_VAZIO);
  definirTela({primeiroUso: false, aba: 'dia', data: hojeISO()});
}

/** Reabre a tela de escolha. Não grava nada — só muda o que está na tela. */
export function reabrirPrimeiroUso(){
  definirTela({primeiroUso: true, folha: null});
}
