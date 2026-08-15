import { Tela, avisoAtual, desfazer, definirTela, avisar } from '../nucleo/estado.js';
import { redesenhar } from '../nucleo/render.js';
import { paraMinutos, paraHora } from '../nucleo/tempo.js';

/* ===========================================================================
   UI — as peças de interface que todas as telas reaproveitam

   O app não usa innerHTML em lugar nenhum: tudo é construído com h(), que
   monta elementos de verdade. Assim nome de prato, título de bloco ou nome de
   remédio digitado pelo usuário nunca é interpretado como HTML, e os eventos
   ficam grudados no elemento em vez de depender de re-varrer o documento.
   =========================================================================== */

/**
 * Cria um elemento.
 *
 *   h('div', {class:'cartao'}, 'texto', h('b', null, 'forte'))
 *
 * Em `props`:
 *   class / style        — string
 *   onTap                — clique E toque, já com prevenção de duplo disparo
 *   qualquer outra chave — vira atributo (aria-label, role, type...)
 * Filhos podem ser string, número, elemento, array, ou null (ignorado).
 */
export function h(tag, props){
  const el = document.createElement(tag);
  if(props){
    Object.keys(props).forEach(chave => {
      const valor = props[chave];
      if(valor === null || valor === undefined || valor === false) return;
      if(chave === 'onTap'){ aoTocar(el, valor); return; }
      if(chave === 'onPointerDown'){ el.addEventListener('pointerdown', valor); return; }
      if(chave === 'onPointerMove'){ el.addEventListener('pointermove', valor); return; }
      if(chave === 'onPointerUp'){ el.addEventListener('pointerup', valor); return; }
      if(chave === 'onInput'){ el.addEventListener('input', valor); return; }
      if(chave === 'onChange'){ el.addEventListener('change', valor); return; }
      if(chave === 'onSubmit'){ el.addEventListener('submit', valor); return; }
      if(chave === 'value'){ el.value = valor; return; }
      if(chave === 'checked'){ el.checked = !!valor; return; }
      el.setAttribute(chave, valor);
    });
  }
  for(let i = 2; i < arguments.length; i++) anexar(el, arguments[i]);
  return el;
}

export function anexar(pai, filho){
  if(filho === null || filho === undefined || filho === false) return;
  if(Array.isArray(filho)){ filho.forEach(f => anexar(pai, f)); return; }
  pai.appendChild(filho.nodeType ? filho : document.createTextNode(String(filho)));
}

/**
 * Liga um toque a um elemento.
 *
 * Usa 'click' — que o navegador já dispara tanto pra mouse quanto pra toque —
 * e marca o elemento como interativo para o CSS garantir os 44 px de alvo.
 */
export function aoTocar(el, fn){
  el.classList.add('tocavel');
  if(!el.hasAttribute('role') && el.tagName !== 'BUTTON') el.setAttribute('role', 'button');
  if(!el.hasAttribute('tabindex') && el.tagName !== 'BUTTON') el.setAttribute('tabindex', '0');
  el.addEventListener('click', ev => { ev.stopPropagation(); fn(ev); });
  el.addEventListener('keydown', ev => {
    if(ev.key === 'Enter' || ev.key === ' '){ ev.preventDefault(); fn(ev); }
  });
}


/* ===========================================================================
   ÍCONES (Lucide, desenhados inline)

   Um traço de 2.75 como manda o handoff. Desenhar inline evita qualquer
   arquivo externo — o app continua funcionando aberto direto do disco.
   =========================================================================== */

export const CAMINHOS_ICONE = {
  casa:       ['M3 10.5 12 3l9 7.5', 'M5.5 9.5V20h13V9.5'],
  calendario: ['M8 2v4', 'M16 2v4', 'M3.5 9.5h17', 'M5 4.5h14a1.5 1.5 0 0 1 1.5 1.5v13A1.5 1.5 0 0 1 19 20.5H5A1.5 1.5 0 0 1 3.5 19V6A1.5 1.5 0 0 1 5 4.5z'],
  halteres:   ['M4 9v6', 'M8 6.5v11', 'M16 6.5v11', 'M20 9v6', 'M8 12h8'],
  talheres:   ['M6 2.5v5.5a2 2 0 0 0 4 0V2.5', 'M8 8.5V21.5', 'M17.5 21.5V2.5', 'M17.5 2.5c2.2 1.8 2.2 8.2 0 10'],
  cartela:    ['M4.5 3.5h15a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1z', 'M9 8.5h.01', 'M15 8.5h.01', 'M9 15.5h.01', 'M15 15.5h.01'],
  mais:       ['M12 5v14', 'M5 12h14'],
  menos:      ['M5 12h14'],
  seta:       ['m9 18 6-6-6-6'],
  alca:       ['M4 9.5h16', 'M4 14.5h16'],
  check:      ['m4.5 12.5 5 5 10-11'],
  fechar:     ['M6 6l12 12', 'M18 6 6 18'],
  lapis:      ['M12.5 20.5H21', 'M16.5 3.5a2.1 2.1 0 0 1 3 3L7.5 18.5l-4 1 1-4z'],
  cima:       ['M12 19.5V4.5', 'm5.5 11 6.5-6.5 6.5 6.5'],
  baixo:      ['M12 4.5v15', 'm5.5 13 6.5 6.5 6.5-6.5'],
  lixeira:    ['M3.5 6.5h17', 'M8.5 6.5V4h7v2.5', 'M6 6.5v13a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-13'],
  copo:       ['M6 4h12l-1.2 16.2a1 1 0 0 1-1 .8H8.2a1 1 0 0 1-1-.8z'],
  relogio:    ['M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17z', 'M12 7.5V12l3 2']
};

/** Devolve um <svg> com o ícone pedido. */
export function icone(nome, tamanho){
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  const t = tamanho || 20;
  svg.setAttribute('width', t);
  svg.setAttribute('height', t);
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2.75');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  (CAMINHOS_ICONE[nome] || []).forEach(d => {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d);
    svg.appendChild(p);
  });
  return svg;
}


/* ===========================================================================
   PEÇAS REPETIDAS
   =========================================================================== */

/** Rótulo em caixa alta que abre uma seção. */
export function rotuloSecao(texto){
  return h('div', {class:'rotulo-secao'}, texto);
}

/** Cabeçalho de tela: linha pequena em cima, título grande embaixo. */
export function cabecalhoTela(acima, titulo, abaixo, acoes){
  return h('header', {class:'cabecalho'},
    h('div', {class:'cabecalho-texto'},
      acima ? h('div', {class:'cabecalho-acima'}, acima) : null,
      h('h1', {class:'titulo-tela'}, titulo),
      abaixo ? h('div', {class:'cabecalho-abaixo'}, abaixo) : null
    ),
    acoes ? h('div', {class:'cabecalho-acoes'}, acoes) : null
  );
}

/** Pílula de ação (Hoje, Editar, Concluir...). */
export function pilula(texto, aoClicar, opcoes){
  const o = opcoes || {};
  return h('button', {
    class: 'pilula' + (o.ativa ? ' ativa' : '') + (o.classe ? ' ' + o.classe : ''),
    type: 'button',
    onTap: aoClicar
  }, texto);
}

/** Barra de progresso. `fracao` vai de 0 a 1. */
export function barraProgresso(fracao, classe){
  const pct = Math.max(0, Math.min(1, fracao || 0)) * 100;
  return h('div', {class:'barra' + (classe ? ' ' + classe : '')},
    h('div', {class:'barra-preenche', style:'width:' + pct.toFixed(1) + '%'})
  );
}

/**
 * Stepper de 44 px: menos, valor, mais.
 * Usado para horários (passos de 15 min) e quantidades.
 */
export function stepper(valor, aoMudar, opcoes){
  const o = opcoes || {};
  return h('div', {class:'stepper'},
    h('button', {class:'stepper-btn', type:'button', 'aria-label':'Diminuir', onTap:()=> aoMudar(-1)}, icone('menos', 15)),
    h('span', {class:'stepper-valor'}, valor),
    h('button', {class:'stepper-btn', type:'button', 'aria-label':'Aumentar', onTap:()=> aoMudar(1)}, icone('mais', 15))
  );
}

/** Avança um horário 'HH:MM' em passos, sem passar do dia. */
export function ajustarHora(hhmm, passos, minutosPorPasso){
  const passo = minutosPorPasso || 15;
  return paraHora(paraMinutos(hhmm) + passos * passo);
}

/** Percorre uma lista circularmente. Usado pelos botões "Renomear". */
export function proximoDaLista(lista, atual){
  const i = lista.indexOf(atual);
  return lista[(i + 1) % lista.length];
}

/** Estado vazio centralizado. */
export function estadoVazio(titulo, explicacao, acoes){
  return h('div', {class:'vazio'},
    h('div', {class:'vazio-titulo'}, titulo),
    explicacao ? h('div', {class:'vazio-texto'}, explicacao) : null,
    acoes ? h('div', {class:'vazio-acoes'}, acoes) : null
  );
}

/** Número com separador brasileiro: 2540 → '2.540' */
export function numeroBR(n){
  return Math.round(n).toLocaleString('pt-BR');
}


/* ===========================================================================
   AVISO DE DESFAZER

   Fica 180 px acima da base pra não cobrir o botão flutuante da aba Dia,
   como pede o handoff.
   =========================================================================== */
export function desenharAviso(){
  if(!avisoAtual) return null;
  return h('div', {class:'aviso', role:'status'},
    h('span', {class:'aviso-msg'}, avisoAtual.msg),
    avisoAtual.foto
      ? h('button', {class:'aviso-desfazer', type:'button', onTap: desfazer}, 'Desfazer')
      : null
  );
}


/* ===========================================================================
   FOLHA (bottom sheet)

   Sobe de baixo, escurece o fundo. Fechar tocando fora ou no Cancelar.
   =========================================================================== */
export function desenharFolha(){
  if(!Tela.folha) return null;
  const folha = Tela.folha;
  return h('div', {class:'folha-fundo', onTap: fecharFolha},
    h('div', {
        class:'folha',
        role:'dialog',
        'aria-modal':'true',
        onTap: ev => ev.stopPropagation()   // clique dentro não fecha
      },
      h('div', {class:'folha-alca'}),
      h('h2', {class:'folha-titulo'}, folha.titulo),
      folha.corpo(),
      /* `acoes: false` é para folhas em que escolher um item já conclui a
         tarefa — um par Cancelar/Confirmar ali seria um passo a mais à toa. */
      folha.acoes === false ? null : h('div', {class:'folha-acoes'},
        h('button', {class:'btn btn-suave', type:'button', onTap: fecharFolha}, 'Cancelar'),
        h('button', {class:'btn btn-forte', type:'button', onTap: folha.confirmar}, folha.rotuloConfirmar)
      )
    )
  );
}

export function abrirFolha(config){ definirTela({folha: config}); }
export function fecharFolha(){ definirTela({folha: null}); }

/* ===========================================================================
   FOLHA DE TEXTO

   Renomear qualquer coisa no app passa por aqui: um campo de texto de
   verdade, com as sugestões logo abaixo para quem quiser ir rápido.

   O protótipo do handoff ciclava listas prontas porque não tinha teclado —
   e o próprio handoff pedia campos reais na implementação. Sem isto, alguém
   que chama a refeição de "Café reforçado" simplesmente não consegue.
   =========================================================================== */

/* Rascunho do texto em edição. Vive fora do estado porque some ao fechar. */
let textoEmEdicao = '';

/**
 * abrirFolhaTexto({
 *   titulo:    'Renomear refeição',
 *   valor:     'Café da manhã',
 *   sugestoes: ['Café', 'Desjejum', ...],   // opcional
 *   aoConfirmar: novoNome => { ... }
 * })
 */
export function abrirFolhaTexto(config){
  textoEmEdicao = config.valor || '';
  abrirFolha({
    titulo: config.titulo,
    rotuloConfirmar: config.rotuloConfirmar || 'Salvar',
    corpo: () => h('div', {class:'folha-corpo'},
      h('input', {
        class:'campo-entrada', type:'text', value: textoEmEdicao,
        maxlength: String(config.limite || 60),
        placeholder: config.exemplo || 'Escreva aqui',
        'aria-label': config.titulo,
        onInput: ev => { textoEmEdicao = ev.target.value; }
      }),
      config.sugestoes && config.sugestoes.length
        ? h('div', null,
            h('span', {class:'campo-rotulo'}, 'Sugestões'),
            h('div', {class:'sugestoes'},
              config.sugestoes.map(s => h('button', {
                class:'sugestao', type:'button',
                onTap: () => { textoEmEdicao = s; redesenhar(); }
              }, s)))
          )
        : null
    ),
    confirmar: () => {
      const limpo = textoEmEdicao.trim();
      /* Nome vazio não salva: some da lista e a pessoa não entende por quê. */
      if(!limpo){ avisar('O nome não pode ficar vazio'); return; }
      config.aoConfirmar(limpo);
      fecharFolha();
    }
  });
}
