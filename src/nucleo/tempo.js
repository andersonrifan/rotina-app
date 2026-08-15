/* ===========================================================================
   TEMPO — datas e horários

   Funções puras: entram números e strings, saem números e strings. Nenhuma
   toca no estado do app nem no DOM, e é por isso que são as mais fáceis de
   testar — e as que mais precisam de teste, porque data é onde todo app
   erra.

   Convenções do projeto:
     - um HORÁRIO é 'HH:MM' em 24 h, ou minutos desde a meia-noite;
     - um DIA é 'AAAA-MM-DD'. Essa string é comparável com < e >, serve de
       chave de objeto e não sofre com fuso horário — ao contrário de Date.
   =========================================================================== */

import { DIAS, MESES } from '../dados/modelo.js';

/** '07:30' → 450 */
export function paraMinutos(hhmm){
  const p = String(hhmm).split(':');
  return (+p[0]) * 60 + (+p[1]);
}

/** 450 → '07:30'. Passa da meia-noite dá a volta, nunca estoura. */
export function paraHora(min){
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60), r = m % 60;
  return (h < 10 ? '0' : '') + h + ':' + (r < 10 ? '0' : '') + r;
}

/** 95 → '1 h 35'; 45 → '45 min' */
export function rotuloDuracao(min){
  if(min < 60) return min + ' min';
  const h = Math.floor(min / 60), m = min % 60;
  return m ? h + ' h ' + (m < 10 ? '0' : '') + m : h + ' h';
}

/* --- Datas ---------------------------------------------------------------- */

export function paraISO(data){
  const m = data.getMonth() + 1, d = data.getDate();
  return data.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (d < 10 ? '0' : '') + d;
}

export function hojeISO(){ return paraISO(new Date()); }

/* Constrói a data no fuso LOCAL. `new Date('2026-08-15')` seria interpretado
   como UTC e, a oeste de Greenwich, cairia no dia 14. */
export function deISO(iso){
  const p = iso.split('-');
  return new Date(+p[0], +p[1] - 1, +p[2]);
}

/** 'AAAA-MM-DD' → o objeto de DIAS correspondente. */
export function diaDaSemana(iso){
  const js = deISO(iso).getDay();
  return DIAS.filter(d => d.js === js)[0];
}

export function somarDias(iso, n){
  const d = deISO(iso);
  d.setDate(d.getDate() + n);
  return paraISO(d);
}

/** As 7 datas da semana que contém `iso`, de segunda a domingo. */
export function semanaDe(iso){
  const js = deISO(iso).getDay();
  const recuo = js === 0 ? 6 : js - 1;      // domingo fecha a semana, não abre
  const segunda = somarDias(iso, -recuo);
  return DIAS.map((d, i) => somarDias(segunda, i));
}

/** Minutos desde a meia-noite, agora. */
export function agoraEmMinutos(){
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

export function ehHoje(iso){ return iso === hojeISO(); }
export function ehPassado(iso){ return iso < hojeISO(); }
export function ehFuturo(iso){ return iso > hojeISO(); }

/** '13 de ago.' */
export function dataCurta(iso){
  const d = deISO(iso);
  return d.getDate() + ' de ' + MESES[d.getMonth()].slice(0, 3) + '.';
}

/** '13 AGO · SEM. 33' */
export function dataCabecalho(iso){
  const d = deISO(iso);
  return d.getDate() + ' ' + MESES[d.getMonth()].slice(0, 3).toUpperCase() +
         ' · SEM. ' + numeroDaSemana(iso);
}

/**
 * Número da semana no padrão ISO-8601: a semana 1 é a que contém a primeira
 * quinta-feira do ano, e toda semana começa na segunda.
 */
export function numeroDaSemana(iso){
  const d = deISO(iso);
  // Anda até a quinta-feira da mesma semana — é ela que decide o ano ISO.
  const quinta = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diaISO = (d.getDay() + 6) % 7;              // 0 = segunda
  quinta.setDate(quinta.getDate() - diaISO + 3);
  const primeiraQuinta = new Date(quinta.getFullYear(), 0, 4);
  const diaISOJan4 = (primeiraQuinta.getDay() + 6) % 7;
  primeiraQuinta.setDate(primeiraQuinta.getDate() - diaISOJan4 + 3);
  return 1 + Math.round((quinta - primeiraQuinta) / (7 * 86400000));
}

/** 'Bom dia' / 'Boa tarde' / 'Boa noite', pelo relógio. */
export function saudacao(agora){
  const h = agora === undefined ? new Date().getHours() : agora;
  if(h < 12) return 'Bom dia';
  if(h < 18) return 'Boa tarde';
  return 'Boa noite';
}
