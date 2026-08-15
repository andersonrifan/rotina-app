/* ===========================================================================
   PRINCIPAL — o ponto de entrada

   Único arquivo que o index.html carrega. Junta estilo e código e liga o app.
   Tudo o mais é importado a partir daqui, e o Vite monta o pacote seguindo
   esse grafo — nada entra no build sem estar ligado a esta raiz.
   =========================================================================== */

import './estilo.css';
import { iniciar } from './app.js';

/* O app é iniciado assim que o módulo roda. Como <script type="module"> é
   adiado por padrão, o DOM já existe neste ponto — não é preciso esperar
   DOMContentLoaded. */
iniciar();
