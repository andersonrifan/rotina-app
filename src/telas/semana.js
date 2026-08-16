import { DIAS, CATEGORIAS, TITULOS_SUGERIDOS } from '../dados/modelo.js';
import { Tela, agir, avisar, definirTela } from '../nucleo/estado.js';
import { redesenhar } from '../nucleo/render.js';
import { paraMinutos, paraHora, rotuloDuracao, diaDaSemana, hojeISO } from '../nucleo/tempo.js';
import { gerarDaSemana, corDaCategoria, corSuaveDaCategoria,
         congelarPassado, propagarParaFuturo } from '../nucleo/modelo.js';
import { h, icone, cabecalhoTela, pilula, rotuloSecao, abrirFolha, fecharFolha } from '../ui/index.js';

/* ===========================================================================
   TELA 8 — SEMANA MODELO

   O molde de que todo dia nasce. Até aqui ele só era editável de lado: dava
   para dizer "repetir toda segunda" ao CRIAR um bloco, mas nunca ao mexer num
   que já existia — quem quisesse mudar o café da manhã de vez tinha que
   apagar e recriar, ou aceitar mudar um dia de cada vez para sempre.

   Por que não é mais uma aba: a barra é do dia a dia — abrir o app, ver o que
   vem agora, marcar. Redesenhar a semana é coisa que se faz de vez em quando,
   sentado, e isso é configuração. Fica no Perfil, ao lado das metas e do
   backup.

   A REGRA QUE DÁ SEGURANÇA PARA MEXER: mudança aqui vale de HOJE EM DIANTE.
   Antes de tocar no molde, os dias já vividos são congelados (ver
   `congelarPassado`), então nenhuma manhã que aconteceu às 06:30 vira uma
   manhã das 08:00 — e a aderência que as estatísticas mostram continua sendo
   sobre o dia que existiu.
   =========================================================================== */

/* Abre por cima do Perfil e devolve para lá ao fechar — mesma convenção das
   Estatísticas. Sair da Semana modelo caindo direto no app faria perder o
   lugar de onde se veio. */
export function abrirSemana(){ definirTela({semana: true, perfil: false, folha: null}); }
export function fecharSemana(){ definirTela({semana: false, perfil: true}); }

export function telaSemana(){
  const diaK = Tela.diaDaSemana || diaDaSemana(hojeISO()).k;
  const blocos = gerarDaSemana(diaK);

  return h('div', {class:'tela tela-semana'},
    cabecalhoTela(null, 'Semana modelo', null, [pilula('Voltar', fecharSemana)]),

    h('p', {class:'nota destaque'},
      'É o molde de que todo dia nasce. O que você mudar aqui vale de hoje em ' +
      'diante — os dias que já passaram ficam exatamente como foram vividos.'),

    seletorDeDia(diaK),

    h('section', null,
      rotuloSecao(nomeCompleto(diaK)),
      blocos.length
        ? h('div', {class:'lista-modelo'}, blocos.map(b => linhaDoModelo(diaK, b)))
        : h('p', {class:'nota'}, 'Nenhum bloco neste dia. Toque abaixo para começar a montar.')
    ),

    h('button', {class:'adicionar-tracejado', type:'button',
      onTap: () => abrirEditor(diaK, null)}, icone('mais', 15), 'Adicionar bloco à ' + nomeCompleto(diaK)),

    h('p', {class:'nota'},
      'Refeições e treinos aparecem aqui para você ver o dia inteiro, mas são ' +
      'definidos nas abas Comida e Treino — toque para ir até lá.')
  );
}

function nomeCompleto(diaK){
  return DIAS.filter(d => d.k === diaK)[0].full;
}

function seletorDeDia(diaK){
  return h('div', {class:'faixa-semana faixa-modelo'},
    DIAS.map(d => h('button', {
        class:'dia-faixa' + (d.k === diaK ? ' selecionado' : ''),
        type:'button',
        'aria-pressed': String(d.k === diaK),
        'aria-label': d.full,
        onTap: () => definirTela({diaDaSemana: d.k})
      },
      /* Só a abreviação: aqui não há data, e "S" sozinho não distingue
         segunda de sexta nem de sábado. */
      h('span', {class:'dia-modelo-nome'}, d.curto)
    ))
  );
}

/* --- Uma linha do molde ----------------------------------------------------
   Blocos fixos se editam aqui. Refeição e treino não: eles já têm dono, e um
   terceiro lugar para mudar o mesmo horário é onde as telas começam a
   discordar. A linha diz de onde vem e leva até lá. */
function linhaDoModelo(diaK, bloco){
  const origem = origemDoBloco(bloco);
  const fim = paraHora(paraMinutos(bloco.hora) + bloco.dur);

  return h('div', {
      class:'linha-modelo' + (origem ? ' emprestada' : ''),
      style:'--cor-cat:' + corDaCategoria(bloco.cat) +
            ';--cor-cat-suave:' + corSuaveDaCategoria(bloco.cat),
      onTap: () => origem ? irPara(origem) : abrirEditor(diaK, bloco)
    },
    h('div', {class:'linha-modelo-texto'},
      h('div', {class:'linha-modelo-titulo'}, bloco.titulo),
      h('div', {class:'linha-modelo-hora'},
        bloco.hora + '–' + fim + ' · ' + rotuloDuracao(bloco.dur))
    ),
    origem
      ? h('span', {class:'chip-origem'}, origem.rotulo)
      : h('button', {class:'btn-mini perigo', type:'button',
          'aria-label':'Remover ' + bloco.titulo + ' de toda ' + nomeCompleto(diaK),
          onTap: () => removerDoModelo(diaK, bloco)}, icone('fechar', 14))
  );
}

function origemDoBloco(bloco){
  if(bloco.id.indexOf('slot:') === 0) return {aba: 'comida', rotulo: 'Comida'};
  if(bloco.id.indexOf('treino:') === 0) return {aba: 'treino', rotulo: 'Treino'};
  return null;
}

/* Ir para a aba que manda naquele bloco fecha TUDO: quem toca em "Comida"
   quer chegar na Comida, não voltar para o Perfil por cima dela. */
function irPara(origem){
  definirTela({semana: false, perfil: false, aba: origem.aba});
}


/* ===========================================================================
   EDITOR DO MOLDE

   O mesmo formulário do bloco do dia, com uma diferença que muda tudo: aqui
   não existe "só hoje". Toda edição desta tela é sobre a semana.
   =========================================================================== */

let rascunho = null;

function abrirEditor(diaK, bloco){
  const novo = !bloco;
  const fim = novo ? '22:15' : paraHora(paraMinutos(bloco.hora) + bloco.dur);
  rascunho = {
    titulo: novo ? '' : bloco.titulo,
    cat: novo ? 'hobby' : bloco.cat,
    inicio: novo ? '21:30' : bloco.hora,
    fim: fim
  };

  abrirFolha({
    titulo: novo ? 'Novo bloco em toda ' + nomeCompleto(diaK) : 'Editar em toda ' + nomeCompleto(diaK),
    rotuloConfirmar: novo ? 'Adicionar à semana' : 'Salvar na semana',
    corpo: () => corpoDoEditor(novo),
    confirmar: () => salvar(diaK, bloco)
  });
}

function corpoDoEditor(novo){
  return h('div', {class:'folha-corpo'},
    h('label', {class:'campo'},
      h('span', {class:'campo-rotulo'}, 'Título'),
      h('input', {class:'campo-entrada', type:'text', maxlength:'60',
        value: rascunho.titulo, placeholder:'Ex.: Academia',
        onInput: ev => { rascunho.titulo = ev.target.value; }})
    ),
    novo
      ? h('div', {class:'sugestoes'},
          TITULOS_SUGERIDOS.map(t => h('button', {class:'sugestao', type:'button',
            onTap: () => { rascunho.titulo = t; redesenhar(); }}, t)))
      : null,
    h('div', {class:'campo-duplo'},
      h('label', {class:'campo'},
        h('span', {class:'campo-rotulo'}, 'Começa'),
        h('input', {class:'campo-entrada campo-hora', type:'time', step:'300',
          value: rascunho.inicio,
          onInput: ev => { rascunho.inicio = ev.target.value; }})
      ),
      h('label', {class:'campo'},
        h('span', {class:'campo-rotulo'}, 'Termina'),
        h('input', {class:'campo-entrada campo-hora', type:'time', step:'300',
          value: rascunho.fim,
          onInput: ev => { rascunho.fim = ev.target.value; }})
      )
    ),
    h('div', {class:'campo'},
      h('span', {class:'campo-rotulo'}, 'Categoria'),
      h('div', {class:'chips-categoria'},
        Object.keys(CATEGORIAS).map(id =>
          h('button', {
            class:'chip-cat' + (rascunho.cat === id ? ' ativo' : ''),
            type:'button', style:'--cor-cat:' + CATEGORIAS[id].cor,
            onTap: () => { rascunho.cat = id; redesenhar(); }
          }, CATEGORIAS[id].rotulo))
      )
    ),
    h('p', {class:'nota'},
      'Vale de hoje em diante, em todas as ' + '' +
      'semanas. Os dias já vividos ficam como estão.')
  );
}

function duracaoDoRascunho(){
  let dur = paraMinutos(rascunho.fim) - paraMinutos(rascunho.inicio);
  if(dur <= 0) dur += 1440;   // atravessa a meia-noite, como dormir
  return dur;
}

function salvar(diaK, bloco){
  const titulo = (rascunho.titulo || '').trim();
  if(!titulo){ avisar('Escreva o título do bloco'); return; }
  const dur = duracaoDoRascunho();
  const hora = rascunho.inicio;
  const cat = rascunho.cat;
  const novo = !bloco;

  agir(titulo + (novo ? ' entra em toda ' : ' salvo em toda ') + nomeCompleto(diaK), d => {
    congelarPassado(d);

    if(novo){
      d.fixos[diaK].push([hora, dur, titulo, cat]);
      const id = 'fixo:' + diaK + ':' + (d.fixos[diaK].length - 1);
      /* Dias futuros já materializados não escutam mais o molde: o bloco novo
         precisa ser entregue em mãos, senão ele "não apareceu" justamente nos
         dias que a pessoa já tinha aberto. */
      Object.keys(d.blocos).forEach(iso => {
        if(iso < hojeISO() || diaDaSemana(iso).k !== diaK) return;
        d.blocos[iso].push({id: id, hora: hora, dur: dur, titulo: titulo, cat: cat, sub: ''});
      });
      return;
    }

    const i = Number(bloco.id.split(':')[2]);
    if(d.fixos[diaK] && d.fixos[diaK][i]) d.fixos[diaK][i] = [hora, dur, titulo, cat];
    propagarParaFuturo(d, bloco.id, diaK, {titulo: titulo, cat: cat, hora: hora, dur: dur});
  });
  fecharFolha();
}

function removerDoModelo(diaK, bloco){
  abrirFolha({
    titulo: 'Tirar de toda ' + nomeCompleto(diaK) + '?',
    rotuloConfirmar: 'Tirar da semana',
    corpo: () => h('div', {class:'folha-corpo'},
      h('p', {class:'nota destaque'},
        '"' + bloco.titulo + '" deixa de existir em todas as ' +
        nomeCompleto(diaK).replace('-feira', 's') + ', de hoje em diante.'),
      h('p', {class:'nota'},
        'Os dias que já passaram continuam com ele — e com as marcações que ' +
        'você fez neles.')
    ),
    confirmar: () => {
      const i = Number(bloco.id.split(':')[2]);
      agir(bloco.titulo + ' saiu da semana', d => {
        congelarPassado(d);
        /* Os dias futuros já materializados também perdem o bloco: eles têm
           cópia própria e não escutariam a remoção. */
        const hoje = hojeISO();
        Object.keys(d.blocos).forEach(iso => {
          if(iso < hoje || diaDaSemana(iso).k !== diaK) return;
          d.blocos[iso] = d.blocos[iso].filter(b => b.id !== bloco.id);
        });
        /* Buraco, não `splice`: renumerar os blocos seguintes desalinharia as
           marcações já gravadas. Ver o comentário em `gerarDaSemana`. */
        if(d.fixos[diaK]) d.fixos[diaK][i] = null;
      });
      fecharFolha();
    }
  });
}
