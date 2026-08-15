/* ===========================================================================
   TELA — ESTATÍSTICAS

   Aberta pelo Perfil. Responde a uma pergunta só, em quatro recortes:
   "como foi a minha semana?".

   Duas regras que atravessam a tela:

   1. DIA FUTURO NÃO CONTA. Incluir o resto da semana faria toda segunda-feira
      parecer 14% de aderência — o painel viraria uma máquina de desânimo.

   2. NENHUM GRÁFICO SEM DADO. Cada figura que não tem o que mostrar diz o que
      falta fazer para ela existir, em vez de desenhar um eixo vazio.

   Sobre cor: os gráficos usam UMA hue, e o rótulo carrega a identidade. As
   cores das categorias do calendário reprovaram no validador de paletas (ver
   o cabeçalho de ui/graficos.js), então elas aparecem só como o pontinho ao
   lado do nome — ligação visual, nunca codificação.
   =========================================================================== */

import { CATEGORIAS } from '../dados/modelo.js';
import { Dados, Tela, definirTela } from '../nucleo/estado.js';
import { hojeISO, dataCurta, rotuloDuracao, diaDaSemana, ehHoje } from '../nucleo/tempo.js';
import { corDaCategoria } from '../nucleo/modelo.js';
import { sessoesRegistradas, volumeDaSessao, totalDeSeries,
         semanasSeguidasComTreino } from '../nucleo/sessoes.js';
import {
  aderenciaDaSemana, aderenciaMediaDaSemana, tempoPorAreaResumido,
  sessoesRecentes, treinosPorSemana, kcalDaSemana, kcalMediaDaSemana,
  cardapioPreenchido, adesaoAosRemedios, refeicoesDaSemana
} from '../nucleo/estatisticas.js';
import { h, cabecalhoTela, pilula, rotuloSecao } from '../ui/index.js';
import { figura, colunas, barrasHorizontais, fileiraDeDestaques,
         medidor, figuraVazia } from '../ui/graficos.js';

export function abrirEstatisticas(){ definirTela({estatisticas: true, perfil: false}); }
export function fecharEstatisticas(){ definirTela({estatisticas: false, perfil: true}); }

export function telaEstatisticas(){
  const iso = Tela.data || hojeISO();

  return h('div', {class:'tela tela-estatisticas'},
    cabecalhoTela(null, 'Estatísticas', 'Semana de ' + dataCurta(iso),
      [pilula('Voltar', fecharEstatisticas)]),

    destaquesDaSemana(iso),
    cartaoAderencia(iso),
    cartaoTempoPorArea(iso),
    cartaoTreino(iso),
    cartaoComida(iso),
    cartaoRemedios(iso)
  );
}

/* --- Números-herói --------------------------------------------------------
   Um valor isolado não é gráfico: é um número. O guia manda tratá-lo como
   tal, em vez de desenhar uma barra sozinha. */
function destaquesDaSemana(iso){
  const media = aderenciaMediaDaSemana(iso);
  const treinos = sessoesRecentes(iso, 7).length;
  const sequencia = semanasSeguidasComTreino(iso);

  return h('section', {class:'cartao'},
    fileiraDeDestaques([
      {
        valor: media ? Math.round(media.fracao * 100) : '—',
        unidade: media ? '%' : null,
        rotulo: 'Aderência',
        apoio: media ? media.dias + (media.dias > 1 ? ' dias' : ' dia') : 'sem dados'
      },
      {
        valor: treinos, rotulo: 'Treinos',
        apoio: 'nesta semana'
      },
      {
        valor: sequencia, rotulo: 'Sequência',
        apoio: sequencia === 1 ? 'semana' : 'semanas'
      }
    ])
  );
}

/* --- Aderência dia a dia --------------------------------------------------- */
function cartaoAderencia(iso){
  const dias = aderenciaDaSemana(iso);
  const temAlgum = dias.some(d => d.aderencia);

  const pontos = dias.map(d => ({
    rotulo: d.letra,
    valor: d.aderencia ? Math.round(d.aderencia.fracao * 100) : null,
    destaque: ehHoje(d.data)
  }));

  const descricao = dias
    .filter(d => d.aderencia)
    .map(d => d.dia.full + ': ' + Math.round(d.aderencia.fracao * 100) + '%')
    .join(', ');

  return h('section', {class:'cartao'},
    figura(
      'Blocos cumpridos por dia',
      'Dias que ainda não chegaram aparecem só como trilho.',
      temAlgum
        ? colunas(pontos, {
            maximo: 100,
            descricao: 'Percentual de blocos cumpridos por dia — ' + descricao,
            rotularDestaque: p => p.valor + '%'
          })
        : figuraVazia('Marque os blocos na aba Dia para acompanhar aqui.')
    )
  );
}

/* --- Tempo por área -------------------------------------------------------- */
function cartaoTempoPorArea(iso){
  const areas = tempoPorAreaResumido(iso, 6);
  if(!areas.length){
    return h('section', {class:'cartao'},
      figura('Para onde vai a semana', null,
        figuraVazia('Sem blocos na semana.')));
  }

  const total = areas.reduce((s, a) => s + a.minutos, 0);

  return h('section', {class:'cartao'},
    figura(
      'Para onde vai a semana',
      'Somando os sete dias. ' + rotuloDuracao(total) + ' de ' +
      areas.length + ' áreas.',
      barrasHorizontais(areas.map(a => ({
        rotulo: a.rotulo || (CATEGORIAS[a.cat] ? CATEGORIAS[a.cat].rotulo : a.cat),
        valor: a.minutos,
        texto: rotuloDuracao(a.minutos),
        cor: a.cat === 'outros' ? null : corDaCategoria(a.cat)
      })))
    )
  );
}

/* --- Treino ---------------------------------------------------------------- */
function cartaoTreino(iso){
  const porSemana = treinosPorSemana(iso, 6);
  const registradas = sessoesRegistradas();
  const algum = porSemana.some(s => s.treinos > 0);

  return h('section', {class:'cartao'},
    figura(
      'Treinos por semana',
      'As últimas seis semanas. Só conta sessão com séries registradas.',
      algum
        ? colunas(porSemana.map((s, i) => ({
            rotulo: i === porSemana.length - 1 ? 'agora' : String(porSemana.length - 1 - i) + 'sem',
            valor: s.treinos,
            destaque: i === porSemana.length - 1
          })), {
            descricao: 'Treinos por semana: ' + porSemana.map(s => s.treinos).join(', '),
            rotularDestaque: p => String(p.valor)
          })
        : figuraVazia('Registre as séries de um treino para começar o histórico.')
    ),

    registradas.length
      ? h('div', {class:'historico'},
          rotuloSecao('Últimas sessões'),
          registradas.slice(0, 5).map(s => {
            const treino = Dados.treinos.filter(t => t.id === s.treinoId)[0];
            const volume = volumeDaSessao(s);
            return h('div', {class:'historico-linha'},
              h('span', {class:'historico-data'}, dataCurta(s.data)),
              h('span', {class:'historico-nome'}, treino ? treino.nome : 'treino removido'),
              h('span', {class:'historico-meta'},
                totalDeSeries(s) + ' séries' + (volume ? ' · ' + volume.toLocaleString('pt-BR') + ' kg' : ''))
            );
          })
        )
      : null
  );
}

/* --- Comida ---------------------------------------------------------------- */
function cartaoComida(iso){
  const dias = kcalDaSemana(iso);
  const media = kcalMediaDaSemana(iso);
  const meta = Dados.perfil.metas.kcal;
  const cardapio = cardapioPreenchido();
  const refeicoes = refeicoesDaSemana(iso);
  const temAlgum = dias.some(d => d.kcal);

  return h('section', {class:'cartao'},
    figura(
      'Calorias por dia',
      media
        ? 'Média de ' + media.toLocaleString('pt-BR') + ' kcal nos dias com ' +
          'refeição marcada. Sua meta é ' + meta.toLocaleString('pt-BR') + '.'
        : 'Conta só refeição marcada como consumida e com prato definido.',
      temAlgum
        ? colunas(dias.map(d => ({
            rotulo: d.letra,
            valor: d.kcal || (d.kcal === 0 ? 0 : null),
            destaque: ehHoje(d.data)
          })), {
            maximo: Math.max(meta, ...dias.map(d => d.kcal || 0)),
            descricao: 'Calorias por dia da semana',
            rotularDestaque: p => p.valor ? p.valor.toLocaleString('pt-BR') : '0'
          })
        : figuraVazia('Marque as refeições na aba Comida para acompanhar aqui.')
    ),
    h('div', {class:'medidores'},
      refeicoes
        ? medidor(refeicoes.fracao, 'Refeições marcadas',
            refeicoes.feitas + ' de ' + refeicoes.previstas)
        : null,
      medidor(cardapio.fracao, 'Cardápio preenchido',
        cardapio.definidas + ' de ' + cardapio.total)
    )
  );
}

/* --- Remédios -------------------------------------------------------------- */
function cartaoRemedios(iso){
  const adesao = adesaoAosRemedios(iso);
  if(!adesao) return null;

  const acabando = Dados.remedios
    .filter(m => m.diasRestantes !== undefined)
    .sort((a, b) => a.diasRestantes - b.diasRestantes);

  return h('section', {class:'cartao'},
    rotuloSecao('Remédios'),
    h('div', {class:'medidores'},
      medidor(adesao.fracao, 'Doses tomadas na semana',
        adesao.tomadas + ' de ' + adesao.previstas)
    ),
    acabando.length
      ? h('div', {class:'historico'},
          acabando.map(m => h('div', {class:'historico-linha'},
            h('span', {class:'historico-nome'}, m.nome),
            h('span', {class:'historico-meta' + (m.diasRestantes <= 7 ? ' alerta' : '')},
              m.diasRestantes + (m.diasRestantes === 1 ? ' dia' : ' dias'))
          )))
      : null
  );
}

/* ===========================================================================
   RESUMO COMPACTO PARA A TELA INÍCIO

   A mesma aderência da semana, em miniatura. Toca e vai para a tela cheia.
   Reaproveita as MESMAS funções de cálculo — se um dia os dois números
   divergirem, é bug, não arredondamento.
   =========================================================================== */
export function resumoDaSemana(iso){
  const dias = aderenciaDaSemana(iso);
  const media = aderenciaMediaDaSemana(iso);
  if(!media) return null;

  return h('button', {class:'cartao cartao-resumo', type:'button',
      'aria-label':'Ver estatísticas da semana',
      onTap: abrirEstatisticas},
    h('div', {class:'cartao-topo'},
      rotuloSecao('Sua semana'),
      h('span', {class:'resumo-pct'}, Math.round(media.fracao * 100) + '%')
    ),
    colunas(dias.map(d => ({
      rotulo: d.letra,
      valor: d.aderencia ? Math.round(d.aderencia.fracao * 100) : null,
      destaque: ehHoje(d.data)
    })), {
      altura: 70,
      maximo: 100,
      descricao: 'Blocos cumpridos por dia: ' + dias.filter(d => d.aderencia)
        .map(d => d.dia.full + ' ' + Math.round(d.aderencia.fracao * 100) + '%').join(', ')
    })
  );
}
