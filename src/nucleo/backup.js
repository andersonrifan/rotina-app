/* ===========================================================================
   BACKUP — levar os dados para fora e trazer de volta

   O app não tem servidor: os dados existem em UM aparelho, num armazenamento
   que o navegador pode apagar sozinho (limpar dados do site, falta de espaço,
   modo anônimo). Sem uma saída, "perdi o celular" e "limpei o navegador"
   significam começar do zero.

   O arquivo é JSON legível de propósito. Você consegue abrir num editor e ver
   o que tem lá dentro — e, se um dia o app deixar de existir, seus dados não
   ficam presos num formato que ninguém lê.
   =========================================================================== */

import { Dados, substituirDados } from './estado.js';
import { clonar, migrar, VERSAO_ESQUEMA } from './armazem.js';

/** Monta o objeto do backup, com o cabeçalho que a importação confere. */
export function montarBackup(){
  return {
    app: 'rotina',
    versaoEsquema: VERSAO_ESQUEMA,
    exportadoEm: new Date().toISOString(),
    dados: clonar(Dados)
  };
}

export function nomeDoArquivo(agora){
  const d = agora || new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `rotina-backup-${d.getFullYear()}-${mm}-${dd}.json`;
}

/**
 * Baixa o backup como arquivo.
 *
 * Devolve o nome do arquivo. Só funciona no navegador — dentro do app Android
 * empacotado o WebView bloqueia downloads iniciados pela página, e aí o
 * caminho é compartilhar o texto (ver `textoDoBackup`).
 */
export function baixarBackup(){
  const nome = nomeDoArquivo();
  const blob = new Blob([textoDoBackup()], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  /* Revogar na hora cancelaria o download em alguns navegadores. */
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return nome;
}

export function textoDoBackup(){
  return JSON.stringify(montarBackup(), null, 2);
}

/**
 * Lê um backup e devolve os dados prontos para uso, ou lança com uma
 * mensagem que faz sentido para quem está lendo a tela.
 *
 * Fica separado de `restaurar` para poder ser testado sem tocar no estado.
 */
export function interpretarBackup(texto){
  let pacote;
  try{
    pacote = JSON.parse(texto);
  }catch{
    throw new Error('Esse arquivo não é um backup — não consegui ler o conteúdo.');
  }

  if(!pacote || typeof pacote !== 'object'){
    throw new Error('Esse arquivo não é um backup do Rotina.');
  }

  /* Backups antigos do app anterior não têm o cabeçalho `app`. Recusamos com
     uma explicação, em vez de importar pela metade e deixar tudo estranho. */
  if(pacote.app !== 'rotina'){
    throw new Error('Esse arquivo não é um backup do Rotina (ou é de uma versão antiga demais).');
  }

  const dados = pacote.dados;
  if(!dados || !Array.isArray(dados.slots)){
    throw new Error('O backup está incompleto: não encontrei as refeições.');
  }

  const migrado = migrar(clonar(dados));
  if(!migrado){
    throw new Error('Esse backup foi feito numa versão mais nova do app. Atualize o app antes de restaurar.');
  }

  return migrado;
}

/** Substitui TUDO pelos dados do backup. Não tem meio-termo, de propósito. */
export function restaurar(texto){
  const dados = interpretarBackup(texto);
  substituirDados(dados);
  return dados;
}

/** Resumo em uma linha, para a tela confirmar o que vai ser restaurado. */
export function resumirBackup(dados){
  const diasEditados = Object.keys(dados.blocos || {}).length;
  const partes = [
    (dados.slots || []).length + ' refeições',
    (dados.treinos || []).length + ' treinos',
    (dados.remedios || []).length + ' remédios'
  ];
  if(diasEditados) partes.push(diasEditados + ' dias editados');
  return partes.join(' · ');
}
