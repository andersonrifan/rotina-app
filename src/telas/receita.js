import { ALIMENTOS } from '../dados/receitas.js';
import { Dados, Tela, agir, agirSemAviso, avisar, definirTela } from '../nucleo/estado.js';
import { redesenhar } from '../nucleo/render.js';
import { clonar } from '../nucleo/armazem.js';
import { DIAS } from '../dados/modelo.js';
import { receitaDe, nutriDaReceita, ehLote, porcoesDaSemana, porcoesCozidas,
         ingredientesPara, formatarQuantidade } from '../nucleo/modelo.js';
import { h, icone, cabecalhoTela, pilula, pilulaConcluir, rotuloSecao, numeroBR,
         abrirFolha, fecharFolha, abrirFolhaTexto, confirmarRemocao } from '../ui/index.js';

/* ===========================================================================
   TELA 9 — A RECEITA

   O banco de receitas sempre teve modo de preparo, tempo, rendimento e uma
   dica de conservação escrita à mão para cada prato. Nada disso aparecia em
   lugar nenhum do app: o cardápio mostrava o NOME e as calorias, e a receita
   em si só existia no arquivo-fonte. Era o maior desperdício de conteúdo do
   projeto — dezenas de passos escritos para ninguém ler.

   Esta tela mostra tudo, e é onde a preparação em lote se decide.

   O QUE A CHAVE DE LOTE MUDA. Uma receita em lote é cozida de uma vez para a
   semana: o molho sai numa panela só, não em três noites. Isso muda a COMPRA,
   porque não existe cozinhar três quartos de uma panela.

     desligada  a ficha mostra a receita como ela é escrita, para UMA porção,
                e a lista compra exatamente o que as porções da semana pedem;
     ligada     a ficha mostra a panela inteira que a semana vai exigir, e a
                lista compra por panela — o que sobra é a marmita de amanhã.

   Os dois números aparecem lado a lado enquanto a chave está ligada, porque a
   diferença entre eles é a pergunta que a pessoa está fazendo.
   =========================================================================== */

export function abrirReceita(id){ definirTela({receita: id, folha: null}); }
export function fecharReceita(){ definirTela({receita: null, editandoReceita: false}); }

export function telaReceita(){
  const r = receitaDe(Tela.receita);
  if(!r){ return h('div', {class:'tela tela-receita'},
    cabecalhoTela(null, 'Receita', null, [pilula('Voltar', fecharReceita)]),
    h('p', {class:'nota'}, 'Esta receita não existe mais.')); }

  const editando = Tela.editandoReceita;
  const nutri = nutriDaReceita(r);

  return h('div', {class:'tela tela-receita'},
    cabecalhoTela(
      CATEGORIA_ROTULO[r.cat] || 'Receita',
      r.nome,
      null,
      editando
        ? [pilulaConcluir(() => definirTela({editandoReceita: false}))]
        : [pilula('Voltar', fecharReceita), pilula('Editar', () => definirTela({editandoReceita: true}))]
    ),

    h('div', {class:'chips-receita'},
      h('span', {class:'chip-receita'}, r.tempo + ' min'),
      h('span', {class:'chip-receita'}, rotuloPorcoes(r.porcoes)),
      h('span', {class:'chip-receita'}, numeroBR(nutri.kcal) + ' kcal por porção'),
      h('span', {class:'chip-receita'}, Math.round(nutri.prot) + ' g de proteína')
    ),

    cartaoDeLote(r),
    cartaoDeIngredientes(r, editando),
    cartaoDePreparo(r, editando),
    editando ? cartaoDeEdicaoGeral(r) : null,
    ondeAparece(r)
  );
}

const CATEGORIA_ROTULO = {
  cafe: 'Café da manhã', lanche: 'Lanche', principal: 'Prato principal', base: 'Base'
};

function rotuloPorcoes(n){
  return n + (n > 1 ? ' porções' : ' porção');
}


/* ===========================================================================
   LOTE
   =========================================================================== */

function cartaoDeLote(r){
  const emLote = ehLote(r);
  const pedidas = porcoesDaSemana()[r.id] || 0;
  const cozidas = porcoesCozidas(r, pedidas);

  return h('section', {class:'cartao'},
    h('label', {class:'interruptor-linha'},
      h('span', null, 'Preparar em lote'),
      h('button', {
        class:'interruptor' + (emLote ? ' ligado' : ''),
        type:'button', role:'switch', 'aria-checked': String(emLote),
        onTap: () => agirSemAviso(d => {
          const alvo = d.receitas.filter(x => x.id === r.id)[0];
          if(alvo) alvo.emLote = !ehLote(alvo);
        })
      }, h('span', {class:'interruptor-bola'}))
    ),

    h('p', {class:'nota'},
      emLote
        ? 'Cozinha de uma vez para a semana. A lista de compras arredonda para ' +
          'panelas inteiras — não dá para fazer meia panela.'
        : 'Cozinha na hora, uma porção de cada vez. A lista compra exatamente ' +
          'o que a semana pede.'),

    pedidas
      ? h('div', {class:'linha-lote'},
          h('div', {class:'lote-numero'},
            h('div', {class:'lote-valor'}, pedidas),
            h('div', {class:'lote-rotulo'}, pedidas > 1 ? 'porções na semana' : 'porção na semana')),
          h('span', {class:'lote-seta'}, icone('seta', 16)),
          h('div', {class:'lote-numero'},
            h('div', {class:'lote-valor'}, cozidas),
            h('div', {class:'lote-rotulo'}, 'vão ser cozidas')),
          cozidas > pedidas
            ? h('span', {class:'lote-sobra'}, '+' + (cozidas - pedidas) + ' de sobra')
            : null
        )
      : h('p', {class:'nota'}, 'Esta receita não está no cardápio desta semana.'),

    /* A dica escrita à mão para cada receita — "congela bem", "dura 3 dias na
       geladeira". Existia no arquivo desde sempre e nunca tinha sido mostrada. */
    r.lote ? h('p', {class:'nota destaque'}, r.lote) : null
  );
}


/* ===========================================================================
   INGREDIENTES

   As quantidades acompanham a chave de lote: desligada, a receita como está
   escrita; ligada, o que a semana inteira vai exigir.
   =========================================================================== */

/**
 * As quantidades mudam de escala com a chave de lote, e é essa troca que
 * responde à pergunta de quem está olhando:
 *
 *   sem lote  UMA porção — quanto vai na panela hoje, para uma refeição.
 *   com lote  a panela inteira que a semana vai exigir — quanto comprar e
 *             quanto cabe na travessa.
 *
 * Mostrar o rendimento nominal nos dois casos, que era o que acontecia,
 * fazia a chave parecer não fazer nada.
 */
function cartaoDeIngredientes(r, editando){
  const pedidas = porcoesDaSemana()[r.id] || 0;
  const emLote = ehLote(r);
  /* Editando, sempre a receita como ela é escrita: é esse número que os
     botões mudam. Mostrar uma escala e mexer noutra faria o + andar sozinho. */
  const porcoes = editando ? r.porcoes
    : (emLote ? (pedidas ? porcoesCozidas(r, pedidas) : r.porcoes) : 1);
  const lista = ingredientesPara(r, porcoes);

  return h('section', {class:'cartao'},
    rotuloSecao('Ingredientes'),
    h('p', {class:'nota'},
      editando
        ? 'Para a receita como ela é escrita: ' + rotuloPorcoes(r.porcoes) + '.'
        : emLote
          ? (pedidas
              ? 'Para as ' + porcoes + ' porções que a semana vai cozinhar de uma vez.'
              : 'Para a panela inteira: ' + rotuloPorcoes(r.porcoes) + '.')
          : 'Para uma porção. A receita inteira rende ' + rotuloPorcoes(r.porcoes) + '.'),

    h('div', {class:'lista-ingredientes'},
      lista.map((ing, i) => h('div', {class:'ingrediente'},
        h('span', {class:'ingrediente-nome'}, ing.alimento.nome),
        h('span', {class:'ingrediente-qtd'}, formatarQuantidade(ing.qtd, ing.alimento)),
        editando
          ? h('div', {class:'ingrediente-acoes'},
              h('button', {class:'btn-mini', type:'button',
                'aria-label':'Menos ' + ing.alimento.nome,
                onTap: () => mudarQuantidade(r, i, -1)}, icone('menos', 14)),
              h('button', {class:'btn-mini', type:'button',
                'aria-label':'Mais ' + ing.alimento.nome,
                onTap: () => mudarQuantidade(r, i, 1)}, icone('mais', 14)),
              h('button', {class:'btn-mini perigo', type:'button',
                'aria-label':'Tirar ' + ing.alimento.nome,
                onTap: () => tirarIngrediente(r, i)}, icone('fechar', 14))
            )
          : null
      )),
      lista.length ? null : h('p', {class:'nota'}, 'Nenhum ingrediente ainda.')
    ),

    editando
      ? h('button', {class:'adicionar-tracejado', type:'button',
          onTap: () => abrirEscolhaDeAlimento(r)}, icone('mais', 15), 'Adicionar ingrediente')
      : null
  );
}

/* O passo do stepper acompanha a ordem de grandeza: 5 g num tempero e 50 g
   num quilo de arroz. Um passo fixo faria um dos dois ser inútil. */
function passoDe(qtd){
  if(qtd >= 500) return 50;
  if(qtd >= 100) return 10;
  if(qtd >= 20) return 5;
  return 1;
}

function mudarQuantidade(r, indice, direcao){
  agirSemAviso(d => {
    const alvo = d.receitas.filter(x => x.id === r.id)[0];
    if(!alvo) return;
    const par = alvo.ingr[indice];
    par[1] = Math.max(1, par[1] + direcao * passoDe(par[1]));
  });
}

function tirarIngrediente(r, indice){
  agirSemAviso(d => {
    const alvo = d.receitas.filter(x => x.id === r.id)[0];
    if(alvo) alvo.ingr.splice(indice, 1);
  });
}

let buscaDeAlimento = '';

function abrirEscolhaDeAlimento(r){
  buscaDeAlimento = '';
  abrirFolha({
    titulo: 'Adicionar ingrediente',
    acoes: false,
    corpo: () => h('div', {class:'folha-corpo'},
      h('input', {
        class:'campo-entrada', type:'search', value: buscaDeAlimento,
        placeholder:'Buscar alimento...',
        onInput: ev => {
          buscaDeAlimento = ev.target.value;
          const alvo = document.querySelector('.lista-alimentos');
          if(alvo) alvo.replaceWith(listaDeAlimentos(r));
        }
      }),
      listaDeAlimentos(r),
      h('button', {class:'btn btn-suave largura-cheia', type:'button', onTap: fecharFolha}, 'Fechar')
    )
  });
}

function listaDeAlimentos(r){
  const termo = buscaDeAlimento.trim().toLowerCase();
  const jaTem = r.ingr.map(([id]) => id);
  const ids = Object.keys(ALIMENTOS)
    .filter(id => jaTem.indexOf(id) < 0)
    .filter(id => !termo || ALIMENTOS[id].nome.toLowerCase().indexOf(termo) >= 0);

  if(!ids.length){
    return h('div', {class:'lista-alimentos'},
      h('p', {class:'nota'}, 'Nenhum alimento com esse nome.'));
  }

  return h('div', {class:'lista-alimentos'},
    ids.map(id => h('button', {class:'item-prato', type:'button',
        onTap: () => {
          agir(ALIMENTOS[id].nome + ' entrou na receita', d => {
            const alvo = d.receitas.filter(x => x.id === r.id)[0];
            /* Uma quantidade de partida em vez de zero: o stepper serve para
               ajustar, e ajustar a partir de nada são muitos toques. */
            if(alvo) alvo.ingr.push([id, ALIMENTOS[id].un === 'un' ? 1 : 50]);
          });
          fecharFolha();
        }},
      h('span', {class:'item-prato-nome'}, ALIMENTOS[id].nome),
      h('span', {class:'item-prato-meta'},
        ALIMENTOS[id].kcal + ' kcal · ' + ALIMENTOS[id].prot + ' g prot / 100 ' +
        (ALIMENTOS[id].un === 'un' ? 'g' : ALIMENTOS[id].un))
    ))
  );
}


/* ===========================================================================
   PREPARO
   =========================================================================== */

function cartaoDePreparo(r, editando){
  const passos = r.preparo || [];
  return h('section', {class:'cartao'},
    rotuloSecao('Modo de preparo'),
    passos.length
      ? h('ol', {class:'lista-preparo'},
          passos.map((passo, i) => h('li', {class:'passo-preparo'},
            editando
              ? h('div', {class:'passo-editavel'},
                  h('button', {class:'passo-texto tocavel', type:'button',
                    onTap: () => editarPasso(r, i)}, passo),
                  h('button', {class:'btn-mini perigo', type:'button',
                    'aria-label':'Remover passo ' + (i + 1),
                    onTap: () => removerPasso(r, i)}, icone('fechar', 14))
                )
              : passo
          )))
      : h('p', {class:'nota'}, 'Sem modo de preparo escrito.'),
    editando
      ? h('button', {class:'adicionar-tracejado', type:'button',
          onTap: () => editarPasso(r, null)}, icone('mais', 15), 'Adicionar passo')
      : null
  );
}

function editarPasso(r, indice){
  const novo = indice === null;
  abrirFolhaTexto({
    titulo: novo ? 'Novo passo' : 'Passo ' + (indice + 1),
    valor: novo ? '' : r.preparo[indice],
    exemplo: 'Ex.: Doure a cebola no azeite por 3 min.',
    limite: 240,
    aoConfirmar: texto => agir(novo ? 'Passo adicionado' : 'Passo salvo', d => {
      const alvo = d.receitas.filter(x => x.id === r.id)[0];
      if(!alvo) return;
      if(!alvo.preparo) alvo.preparo = [];
      if(novo) alvo.preparo.push(texto);
      else alvo.preparo[indice] = texto;
    })
  });
}

function removerPasso(r, indice){
  agirSemAviso(d => {
    const alvo = d.receitas.filter(x => x.id === r.id)[0];
    if(alvo) alvo.preparo.splice(indice, 1);
  });
}


/* ===========================================================================
   EDIÇÃO DO CABEÇALHO E EXCLUSÃO
   =========================================================================== */

function cartaoDeEdicaoGeral(r){
  return h('section', {class:'cartao'},
    rotuloSecao('A receita'),
    h('div', {class:'linha-slot-topo'},
      h('span', {class:'slot-nome'}, r.nome),
      h('button', {class:'btn-renomear', type:'button',
        onTap: () => abrirFolhaTexto({
          titulo: 'Nome da receita', valor: r.nome, limite: 60,
          exemplo: 'Ex.: Frango com batata-doce',
          aoConfirmar: nome => agir('Receita renomeada', d => {
            const alvo = d.receitas.filter(x => x.id === r.id)[0];
            if(alvo) alvo.nome = nome;
          })
        })}, icone('lapis', 13), 'Renomear')
    ),

    h('div', {class:'campo'},
      h('span', {class:'campo-rotulo'}, 'Categoria'),
      h('div', {class:'chips-categoria'},
        Object.keys(CATEGORIA_ROTULO).map(cat =>
          h('button', {
            class:'chip-cat' + (r.cat === cat ? ' ativo' : ''),
            type:'button', style:'--cor-cat:var(--salvia)',
            onTap: () => agirSemAviso(d => {
              const alvo = d.receitas.filter(x => x.id === r.id)[0];
              if(alvo) alvo.cat = cat;
            })
          }, CATEGORIA_ROTULO[cat]))
      )
    ),

    h('div', {class:'campo-duplo'},
      h('label', {class:'campo'},
        h('span', {class:'campo-rotulo'}, 'Rende (porções)'),
        h('input', {class:'campo-entrada campo-numero', type:'number',
          inputmode:'numeric', min:'1', max:'30', value: String(r.porcoes),
          onInput: ev => agirSemAviso(d => {
            const alvo = d.receitas.filter(x => x.id === r.id)[0];
            if(alvo) alvo.porcoes = Math.max(1, parseInt(ev.target.value, 10) || 1);
          })})
      ),
      h('label', {class:'campo'},
        h('span', {class:'campo-rotulo'}, 'Tempo (min)'),
        h('input', {class:'campo-entrada campo-numero', type:'number',
          inputmode:'numeric', min:'1', max:'600', value: String(r.tempo),
          onInput: ev => agirSemAviso(d => {
            const alvo = d.receitas.filter(x => x.id === r.id)[0];
            if(alvo) alvo.tempo = Math.max(1, parseInt(ev.target.value, 10) || 1);
          })})
      )
    ),

    h('div', {class:'campo'},
      h('span', {class:'campo-rotulo'}, 'Dica de conservação'),
      h('button', {class:'btn btn-suave largura-cheia', type:'button',
        onTap: () => abrirFolhaTexto({
          titulo: 'Dica de conservação', valor: r.lote || '', limite: 200,
          exemplo: 'Ex.: congela bem em porções, dura 3 meses',
          aoConfirmar: texto => agir('Dica salva', d => {
            const alvo = d.receitas.filter(x => x.id === r.id)[0];
            if(alvo) alvo.lote = texto;
          })
        })}, r.lote ? 'Editar' : 'Escrever')
    ),

    h('button', {class:'btn btn-contorno-perigo largura-cheia', type:'button',
      onTap: () => excluirReceita(r)}, 'Excluir esta receita')
  );
}

function excluirReceita(r){
  const dias = DIAS.filter(d => {
    const dia = Dados.cardapio[d.k] || {};
    return Object.keys(dia).some(slotId => {
      const escolha = dia[slotId];
      const ids = Array.isArray(escolha) ? escolha : (escolha ? [escolha] : []);
      return ids.indexOf(r.id) >= 0;
    });
  }).length;

  confirmarRemocao({
    titulo: 'Excluir ' + r.nome + '?',
    texto: 'A receita sai do banco, com os ingredientes e o modo de preparo.',
    detalhe: dias
      ? 'Ela está no cardápio em ' + dias + (dias > 1 ? ' dias' : ' dia') +
        ' — essas refeições voltam para "a definir", e a lista de compras deixa ' +
        'de pedir o que era dela.'
      : 'Ela não está no cardápio de nenhum dia.',
    rotulo: 'Excluir',
    aoConfirmar: () => {
      agir(r.nome + ' excluída', d => {
        d.receitas = d.receitas.filter(x => x.id !== r.id);
        /* Tira do cardápio junto: uma refeição apontando para receita que não
           existe mais é dado órfão, e some da tela sem explicação. */
        DIAS.forEach(dia => {
          const doDia = d.cardapio[dia.k];
          if(!doDia) return;
          Object.keys(doDia).forEach(slotId => {
            const escolha = doDia[slotId];
            const ids = Array.isArray(escolha) ? escolha : (escolha ? [escolha] : []);
            const restam = ids.filter(id => id !== r.id);
            if(restam.length) doDia[slotId] = restam;
            else delete doDia[slotId];
          });
        });
      });
      fecharReceita();
    }
  });
}


/* --- Onde esta receita aparece na semana ---------------------------------- */
function ondeAparece(r){
  const onde = [];
  DIAS.forEach(dia => {
    const doDia = Dados.cardapio[dia.k] || {};
    Object.keys(doDia).forEach(slotId => {
      const escolha = doDia[slotId];
      const ids = Array.isArray(escolha) ? escolha : (escolha ? [escolha] : []);
      if(ids.indexOf(r.id) < 0) return;
      const slot = Dados.slots.filter(s => s.id === slotId)[0];
      onde.push(dia.curto + ' · ' + (slot ? slot.nome : slotId));
    });
  });

  return h('section', {class:'cartao'},
    rotuloSecao('Na sua semana'),
    onde.length
      ? h('div', {class:'chips-formato'}, onde.map(t => h('span', {class:'chip-formato'}, t)))
      : h('p', {class:'nota'},
          'Ainda não está em nenhuma refeição. Escolha na aba Comida, na grade da semana.')
  );
}


/* ===========================================================================
   NOVA RECEITA
   =========================================================================== */

export function criarReceita(){
  const id = 'r' + Date.now().toString(36);
  agirSemAviso(d => {
    d.receitas.push({
      id: id, nome: 'Receita nova', cat: 'principal',
      porcoes: 1, tempo: 20, ingr: [], preparo: [], lote: ''
    });
  });
  /* Abre já em edição: uma receita chamada "Receita nova" e sem ingrediente
     nenhum não serve para nada até ser preenchida. */
  definirTela({receita: id, editandoReceita: true, folha: null});
}

/** Copia uma receita inteira, para ajustar sem perder a original. */
export function duplicarReceita(r){
  const copia = clonar(r);
  copia.id = 'r' + Date.now().toString(36);
  copia.nome = r.nome + ' (cópia)';
  agir(copia.nome + ' criada', d => { d.receitas.push(copia); });
  definirTela({receita: copia.id, editandoReceita: true, folha: null});
}

export function podeEditarReceitas(){
  return Array.isArray(Dados.receitas);
}

export function avisarSemReceitas(){
  avisar('Recarregue o app para editar receitas.');
  redesenhar();
}
