import { MODELO_VAZIO } from '../dados/modelo.js';
import { Dados, Tela, agir, agirSemAviso, definirTela, dadosIniciais, substituirDados, simular } from '../nucleo/estado.js';
import { clonar } from '../nucleo/armazem.js';
import { deISO, diaDaSemana, paraMinutos, paraHora, rotuloDuracao } from '../nucleo/tempo.js';
import { blocosDoDia, materializar, detectarAtraso, proporPlano, aplicarPlano,
         totaisDaSemana, corDaCategoria } from '../nucleo/modelo.js';
import { h, icone, cabecalhoTela, pilula, rotuloSecao } from '../ui/index.js';

/* ===========================================================================
   TELAS 6 e 7 — PRIMEIRO USO e REPLANEJAR

   Duas telas que cobrem o app inteiro em vez de morar numa aba, porque as
   duas pedem uma decisão antes de continuar.
   =========================================================================== */

/* ===========================================================================
   6. PRIMEIRO USO

   Só aparece enquanto a rotina-modelo não foi aceita nem recusada. É a porta
   por onde outra pessoa entra no app: "Começar do zero" apaga tudo que é
   pessoal e deixa a estrutura vazia pra ela montar a própria semana.
   =========================================================================== */
export function telaPrimeiroUso(){
  const passos = [
    ['1', 'Trabalho e faculdade', 'Os horários fixos da semana já posicionados, de segunda a sexta.'],
    ['2', 'Refeições e treinos',  'Cinco refeições com cardápio e três treinos de força e mobilidade.'],
    ['3', 'Remédios',             'Três suplementos distribuídos nos compartimentos da caixa.']
  ];

  return h('div', {class:'primeiro-uso'},
    h('div', {class:'primeiro-uso-conteudo'},
      h('div', {class:'rotulo-secao'}, 'Primeiro uso'),
      h('h1', {class:'titulo-tela grande'}, 'Sua semana modelo'),
      h('p', {class:'primeiro-uso-texto'},
        'O app já vem com uma semana montada, pra você ver como tudo se encaixa antes de mexer. ' +
        'Nada aqui é definitivo: cada bloco, refeição e treino pode ser mudado depois.'),

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
          'Usar a rotina-modelo'),
        h('button', {class:'btn btn-transparente', type:'button', onTap: comecarDoZero},
          'Começar do zero')
      )
    )
  );
}

export function aceitarModelo(){
  agirSemAviso(d => { d.aceitouModelo = true; });
}

export function comecarDoZero(){
  agirSemAviso(d => {
    const vazio = dadosIniciais(MODELO_VAZIO);
    Object.keys(vazio).forEach(k => { d[k] = vazio[k]; });
    d.aceitouModelo = true;
  });
  definirTela({aba: 'dia'});
}


/* ===========================================================================
   7. REPLANEJAR O DIA

   Quando um bloco estoura o horário previsto, o resto do dia deixa de caber.
   Em vez de empurrar tudo em silêncio, o app mostra o que pretende fazer e
   deixa aplicar ou recusar.

   A tela é oferecida, nunca imposta: ela só aparece quando o usuário toca no
   aviso de atraso na aba Dia.
   =========================================================================== */
export function telaReplanejar(){
  const plano = Tela.replanejar;
  const iso = plano.iso;
  const dia = diaDaSemana(iso);
  const atraso = plano.atraso;

  return h('div', {class:'tela tela-replanejar'},
    cabecalhoTela(
      dia.full.replace('-feira', '').replace(/^./, c => c.toUpperCase()) + ' ' +
        deISO(iso).getDate() + ' · ' + atraso.atraso + ' min de atraso',
      'Replanejar o resto do dia',
      null,
      [pilula('Fechar', () => definirTela({replanejar: null}))]
    ),

    h('section', {class:'cartao-mudou'},
      h('div', {class:'rotulo-claro'}, 'O que mudou'),
      h('p', {class:'mudou-texto'}, textoDoQueMudou(plano))
    ),

    h('section', null,
      rotuloSecao('Plano sugerido'),
      h('div', {class:'lista-ajustes'},
        plano.ajustes.map(aj => h('div', {class:'ajuste ajuste-' + aj.acao},
          h('span', {class:'bloco-barra', style:'background:' + corDaCategoria(aj.bloco.cat)}),
          h('div', {class:'ajuste-texto'},
            h('div', {class:'ajuste-titulo'}, aj.bloco.titulo),
            h('div', {class:'ajuste-detalhe'}, aj.detalhe)
          ),
          h('span', {class:'ajuste-acao'}, aj.acao)
        ))
      )
    ),

    h('section', null,
      rotuloSecao('Trocar por'),
      h('div', {class:'chips-alternativa'},
        alternativasDoPlano(plano).map(alt =>
          h('button', {class:'chip-alternativa', type:'button',
            onTap: () => aplicarAlternativa(plano, alt)}, alt.rotulo))
      )
    ),

    cartaoDeImpacto(plano),

    h('div', {class:'acoes-replanejar'},
      h('button', {class:'btn btn-suave', type:'button',
        onTap: () => definirTela({replanejar: null})}, 'Deixar como está'),
      h('button', {class:'btn btn-forte cresce', type:'button',
        onTap: () => confirmarPlano(plano)}, 'Aplicar plano')
    )
  );
}

export function textoDoQueMudou(plano){
  const a = plano.atraso;
  const encurtados = plano.ajustes.filter(x => x.acao === 'encurtar').length;
  const movidos = plano.ajustes.filter(x => x.acao === 'mover').length;
  const partes = [];
  partes.push(a.bloco.titulo + ' terminou ' + paraHora(a.fimReal) + ', não ' +
              paraHora(paraMinutos(a.previsto.hora) + a.previsto.dur) + '.');
  if(encurtados) partes.push(encurtados + (encurtados > 1 ? ' blocos encurtam' : ' bloco encurta'));
  if(movidos) partes.push(movidos + (movidos > 1 ? ' saem do dia' : ' sai do dia'));
  if(plano.sobra) partes.push('ainda sobram ' + rotuloDuracao(plano.sobra) + ' sem lugar');
  return partes.join(' · ');
}

/** Alternativas ao plano automático — cada uma é uma troca explícita. */
export function alternativasDoPlano(plano){
  const alternativas = [];
  const sono = plano.ajustes.filter(a => a.bloco.cat === 'sono')[0];
  if(sono){
    alternativas.push({
      rotulo: 'Dormir ' + plano.atraso.atraso + ' min depois',
      tipo: 'adiar-sono'
    });
  }
  const primeiroEncurtado = plano.ajustes.filter(a => a.acao === 'encurtar')[0];
  if(primeiroEncurtado){
    alternativas.push({
      rotulo: 'Cortar ' + primeiroEncurtado.bloco.titulo.toLowerCase() + ' hoje',
      tipo: 'cortar',
      alvo: primeiroEncurtado.bloco.id
    });
  }
  alternativas.push({rotulo: 'Não mexer em nada', tipo: 'nada'});
  return alternativas;
}

export function aplicarAlternativa(plano, alt){
  if(alt.tipo === 'nada'){ definirTela({replanejar: null}); return; }

  if(alt.tipo === 'adiar-sono'){
    agir('Sono adiado ' + plano.atraso.atraso + ' min', d => {
      const lista = materializar(d, plano.iso);
      lista.forEach(b => {
        if(b.cat === 'sono' && paraMinutos(b.hora) > 720){
          b.hora = paraHora(paraMinutos(b.hora) + plano.atraso.atraso);
          b.dur = Math.max(5, b.dur - plano.atraso.atraso);
        }
      });
    });
    definirTela({replanejar: null});
    return;
  }

  if(alt.tipo === 'cortar'){
    agir('Bloco cortado do dia', d => {
      const lista = materializar(d, plano.iso);
      d.blocos[plano.iso] = lista.filter(b => b.id !== alt.alvo);
    });
    definirTela({replanejar: null});
  }
}

export function cartaoDeImpacto(plano){
  const CATS = ['sono', 'livre', 'estudo'];
  const ROTULOS = {sono:'Sono', livre:'Livre', estudo:'Estudo'};

  /* Compara a semana como está com a semana depois do plano. O cálculo roda
     numa cópia descartável: mostrar um número não pode mexer nos dados. */
  const antes = totaisDaSemana(plano.iso, CATS);
  const depois = simular(dados => {
    aplicarPlano(dados, plano);
    return totaisDaSemana(plano.iso, CATS);
  });

  return h('section', {class:'cartao'},
    rotuloSecao('Impacto na semana'),
    h('div', {class:'grade-impacto'},
      CATS.map(c => {
        const delta = depois[c] - antes[c];
        return h('div', {class:'impacto'},
          h('div', {class:'impacto-rotulo'}, ROTULOS[c]),
          h('div', {class:'impacto-valor'}, rotuloDuracao(depois[c])),
          h('div', {class:'impacto-delta' + (delta < 0 ? ' negativo' : delta > 0 ? ' positivo' : '')},
            delta === 0 ? 'sem mudança' : (delta > 0 ? '+' : '−') + rotuloDuracao(Math.abs(delta)))
        );
      })
    )
  );
}

export function confirmarPlano(plano){
  agir('Plano aplicado', d => { aplicarPlano(d, plano); });
  definirTela({replanejar: null});
}

/** Faixa de aviso na aba Dia quando há atraso detectado. */
export function avisoDeAtraso(iso){
  const atraso = detectarAtraso(iso);
  if(!atraso) return null;
  return h('button', {class:'faixa-atraso', type:'button',
      onTap: () => definirTela({replanejar: proporPlano(iso, atraso)})},
    h('div', null,
      h('div', {class:'faixa-atraso-titulo'},
        atraso.bloco.titulo + ' passou ' + atraso.atraso + ' min do previsto'),
      h('div', {class:'faixa-atraso-sub'}, 'Ver como reencaixar o resto do dia')
    ),
    icone('seta', 18)
  );
}
