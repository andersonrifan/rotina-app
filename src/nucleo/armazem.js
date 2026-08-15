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

export const CHAVE = 'rotina_v4';

/** A versão do esquema que ESTA build entende. Suba ao mudar o formato. */
export const VERSAO_ESQUEMA = 5;

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
    catch(err){ return false; }
  }
};

/* ---------------------------------------------------------------------------
   MIGRAÇÕES

   Cada entrada leva os dados de uma versão para a seguinte. São aplicadas em
   sequência, então dados da v3 passam por 3→4 e depois 4→5 sozinhos.

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
