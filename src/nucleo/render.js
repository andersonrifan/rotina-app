/* ===========================================================================
   RENDER — o gancho de redesenho

   Este módulo existe por um motivo só: quebrar um ciclo.

   O estado precisa avisar que mudou; quem sabe desenhar é o app; e o app
   importa as telas, que por sua vez mudam o estado. Se o estado importasse o
   app direto, o grafo de dependências fecharia num círculo.

   Aqui o estado depende de uma FUNÇÃO, não do app. O app se registra no
   início e ninguém precisa conhecer ninguém.

   Efeito colateral bem-vindo: nos testes, `redesenhar()` não faz nada,
   porque nada se registrou. A lógica roda sem DOM nenhum.
   =========================================================================== */

let desenhar = null;

/** O app chama isto uma vez, no início, entregando seu desenhador. */
export function registrarDesenho(fn){
  desenhar = fn;
}

/** Pede um redesenho. Silencioso se ninguém se registrou (testes). */
export function redesenhar(){
  if(desenhar) desenhar();
}
