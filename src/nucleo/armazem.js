/* ===========================================================================
   ARMAZÉM — gravação local e migração de esquema

   Duas responsabilidades, ambas chatas e ambas críticas:

   1. NUNCA LANÇAR. O navegador pode recusar o localStorage (aba anônima,
      cookies bloqueados, cota cheia) e, quando recusa, ele não devolve null:
      ele lança. Uma leitura desprotegida no carregamento derruba o app.

   2. MIGRAR. Um app que atualiza encontra dados gravados por versões
      anteriores. Sem migração, atualizar o app quebra os dados de quem já
      usava. As migrações são numeradas e aplicadas em ordem.
   =========================================================================== */

import { RECEITAS } from '../dados/receitas.js';

export const CHAVE = 'rotina_v4';

/** A versão do esquema que ESTA build entende. Suba ao mudar o formato. */
export const VERSAO_ESQUEMA = 9;

/** Cópia profunda. Usada ao semear dados e ao simular hipóteses. */
export function clonar(valor){
  return JSON.parse(JSON.stringify(valor));
}

export const armazem = {
  ler(chave){
    try{ return localStorage.getItem(chave); }
    catch(err){ console.warn('Armazenamento local indisponível para leitura.', err); return null; }
  },
  gravar(chave, valor){
    try{ localStorage.setItem(chave, valor); return true; }
    catch(err){ console.warn('Armazenamento local indisponível para gravação.', err); return false; }
  },
  apagar(chave){
    try{ localStorage.removeItem(chave); return true; }
    catch(_err){ return false; }
  }
};

/* ---------------------------------------------------------------------------
   MIGRAÇÕES

   Cada entrada leva os dados de uma versão para a SEGUINTE, e elas são
   aplicadas em sequência: dados da v4 passam por 4→5, 5→6 e assim por diante,
   sozinhos. Por isso a chave é a versão de ORIGEM, e a ordem aqui é crescente
   — ler de cima para baixo é ler a história do formato.

   Regra: uma migração nunca é editada depois de publicada. Se ela estava
   errada, escreva a próxima corrigindo — há gente com dados que já passaram
   pela versão antiga.
   --------------------------------------------------------------------------- */
const MIGRACOES = {
  /* v4 → v5: a água saiu do app. Os copos bebidos deixam de ser lidos;
     removemos o campo para não carregar dado morto pra sempre. */
  4: (dados) => {
    delete dados.agua;
    if(dados.perfil && dados.perfil.metas) delete dados.perfil.metas.copos;
    return dados;
  },

  /* v5 → v6: o treino passa a registrar o que foi feito (séries, carga,
     duração), não só quais exercícios foram marcados. Quem já usava não tem
     sessões antigas para converter — o histórico começa agora. */
  5: (dados) => {
    if(!dados.sessoes) dados.sessoes = {};
    return dados;
  },

  /* v6 → v7: uma refeição pode ter mais de um prato. O cardápio guardava um
     id solto por refeição; passa a guardar uma lista. Um prato vira lista de
     um, e nada se perde. */
  6: (dados) => {
    const cardapio = dados.cardapio || {};
    Object.keys(cardapio).forEach(diaK => {
      const dia = cardapio[diaK] || {};
      Object.keys(dia).forEach(slotId => {
        const escolha = dia[slotId];
        if(!escolha) delete dia[slotId];
        else if(!Array.isArray(escolha)) dia[slotId] = [escolha];
      });
    });
    return dados;
  },

  /* v7 → v8: as receitas saem do código e viram dado do usuário. Quem já
     usava recebe o banco atual como ponto de partida; a partir daqui, o que
     ele editar é dele. */
  7: (dados) => {
    if(!Array.isArray(dados.receitas)) dados.receitas = clonar(RECEITAS);
    return dados;
  },

  /* v8 → v9: a preparação em lote deixou de ser adivinhada pelo rendimento e
     passou a ser escrita receita por receita — o feijão rende 12 e congela,
     a sardinha com batata rende 2 e é prato de emergência.

     Quem já tinha o banco copiado recebe as marcas sem perder o que editou:
     só preenche onde o campo não existe, e só em receita que ainda casa por
     id com a que veio no código. */
  8: (dados) => {
    if(!Array.isArray(dados.receitas)) return dados;
    dados.receitas.forEach(r => {
      if(r.emLote !== undefined) return;
      const original = RECEITAS.filter(x => x.id === r.id)[0];
      if(original && original.emLote !== undefined) r.emLote = original.emLote;
    });
    return dados;
  }
};

/**
 * Aplica as migrações pendentes. Devolve `null` se os dados forem de uma
 * versão mais NOVA que esta build entende — nesse caso o app prefere começar
 * do modelo a corromper o que não conhece.
 */
export function migrar(dados){
  let versao = dados.versao || 1;
  if(versao > VERSAO_ESQUEMA){
    console.warn('Dados de uma versão mais nova (' + versao + ') que esta build (' +
                 VERSAO_ESQUEMA + '). Ignorando para não corromper.');
    return null;
  }
  while(versao < VERSAO_ESQUEMA){
    const passo = MIGRACOES[versao];
    if(passo) dados = passo(dados);
    versao++;
    dados.versao = versao;
  }
  return dados;
}
