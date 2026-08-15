/* ===========================================================================
   GRÁFICOS — SVG desenhado à mão, sem biblioteca

   DECISÕES DE COR, e por que elas são estas
   -----------------------------------------
   As cores de categoria do app (as dos blocos do calendário) NÃO servem como
   paleta de gráfico. Rodadas no validador de paletas, elas reprovam em três
   checagens — banda de luminosidade, piso de croma e, o pior, piso de visão
   normal: `#c0b6a5` e `#ccdbb2` ficam a ΔE 9,9, abaixo de 15, indistinguíveis
   mesmo para quem enxerga todas as cores. E duas categorias (estudo e pessoal)
   são literalmente a mesma cor.

   Então, aqui: UMA HUE, e o RÓTULO carrega a identidade. Isso não é só um
   contorno do problema — é o que o guia recomenda quando o trabalho do dado é
   comparar magnitude, e não distinguir séries. O ponto colorido ao lado do
   rótulo mantém a ligação com o calendário sem pedir que a cor codifique nada.

   `--acao` (#8c491a) dá 5,09:1 sobre o cartão e `--salvia` (#56633f) dá 4,82:1
   — as duas com folga sobre os 3:1 exigidos de uma marca.

   ESPECIFICAÇÕES DE MARCA (fixas, do guia)
   ----------------------------------------
   barra ≤ 24 px de espessura · ponta arredondada em 4 px, quadrada na base ·
   linha de 2 px · marcador ≥ 8 px com anel de 2 px na cor da superfície ·
   grade em fio de 1 px, discreta · rótulo direto só no que importa, nunca um
   número em cada ponto.
   =========================================================================== */

const NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs){
  const el = document.createElementNS(NS, tag);
  Object.keys(attrs || {}).forEach(k => {
    if(attrs[k] !== null && attrs[k] !== undefined) el.setAttribute(k, attrs[k]);
  });
  return el;
}

/** Envelope de figura: título, o desenho, e uma nota opcional embaixo. */
export function figura(titulo, nota, ...conteudo){
  const fig = document.createElement('figure');
  fig.className = 'figura';
  if(titulo){
    const cap = document.createElement('figcaption');
    cap.className = 'figura-titulo';
    cap.textContent = titulo;
    fig.appendChild(cap);
  }
  conteudo.forEach(c => { if(c) fig.appendChild(c); });
  if(nota){
    const p = document.createElement('p');
    p.className = 'figura-nota';
    p.textContent = nota;
    fig.appendChild(p);
  }
  return fig;
}

/**
 * Número-herói com rótulo. Um valor sozinho não é gráfico — é um número, e
 * o guia manda tratá-lo como tal em vez de desenhar uma barra só.
 */
export function numeroDestaque(valor, unidade, rotulo, apoio){
  const div = document.createElement('div');
  div.className = 'destaque';
  const n = document.createElement('div');
  n.className = 'destaque-numero';
  n.textContent = valor;
  if(unidade){
    const u = document.createElement('span');
    u.className = 'destaque-unidade';
    u.textContent = unidade;
    n.appendChild(u);
  }
  const r = document.createElement('div');
  r.className = 'destaque-rotulo';
  r.textContent = rotulo;
  div.appendChild(n);
  div.appendChild(r);
  if(apoio){
    const a = document.createElement('div');
    a.className = 'destaque-apoio';
    a.textContent = apoio;
    div.appendChild(a);
  }
  return div;
}

/** Linha de números-herói, lado a lado. */
export function fileiraDeDestaques(itens){
  const div = document.createElement('div');
  div.className = 'fileira-destaques';
  itens.forEach(i => {
    if(i) div.appendChild(numeroDestaque(i.valor, i.unidade, i.rotulo, i.apoio));
  });
  return div;
}

/* ===========================================================================
   COLUNAS — comparação ao longo de uma semana

   `pontos`: [{rotulo, valor, nulo?, destaque?}]
   Valor nulo = dia que ainda não chegou: desenha o trilho, não a coluna.
   =========================================================================== */
export function colunas(pontos, opcoes){
  const o = opcoes || {};
  const alturaTotal = o.altura || 96;
  const larguraBarra = 24;      // o teto do guia; a barra nunca engorda além disto
  const gap = 26;               // o ar fica no vão, não na barra
  const larguraColuna = larguraBarra;
  const alturaEixo = 16;
  const largura = pontos.length * larguraColuna + (pontos.length - 1) * gap;
  const alturaPlot = alturaTotal - alturaEixo;
  const maximo = o.maximo || Math.max(1, ...pontos.map(p => p.valor || 0));

  const svg = svgEl('svg', {
    viewBox: '0 0 ' + largura + ' ' + alturaTotal,
    class: 'gd gd-colunas',
    role: 'img',
    'aria-label': o.descricao || '',
    /* Trava a largura no tamanho natural: sem isto o SVG estica para preencher
       o cartão e a barra chega renderizada a 28 px, acima do teto de 24. Em
       tela estreita ele encolhe normalmente — o limite é só para cima. */
    style: 'max-width:' + largura + 'px'
  });

  pontos.forEach((p, i) => {
    const x = i * (larguraColuna + gap) + (larguraColuna - larguraBarra) / 2;

    /* Trilho: mostra o espaço possível, para o vazio ser legível como vazio. */
    svg.appendChild(svgEl('rect', {
      x: x, y: 0, width: larguraBarra, height: alturaPlot,
      rx: 4, class: 'gd-trilho'
    }));

    if(p.valor !== null && p.valor !== undefined){
      const h = Math.max(3, (p.valor / maximo) * alturaPlot);
      /* Ponta arredondada em cima, quadrada na base: a base é a linha zero e
         arredondá-la faria a coluna parecer flutuar. */
      svg.appendChild(svgEl('path', {
        d: cantoArredondadoEmCima(x, alturaPlot - h, larguraBarra, h, 4),
        class: 'gd-coluna' + (p.destaque ? ' destacada' : '')
      }));
    }

    const t = svgEl('text', {
      x: x + larguraBarra / 2, y: alturaTotal - 4,
      class: 'gd-rotulo-eixo' + (p.destaque ? ' destacado' : ''),
      'text-anchor': 'middle'
    });
    t.textContent = p.rotulo;
    svg.appendChild(t);

    /* Rótulo direto SÓ no ponto em destaque — um número em cada coluna é
       ruído que ninguém lê. O resto está no aria-label e no texto ao lado. */
    if(p.destaque && p.valor !== null && p.valor !== undefined && o.rotularDestaque){
      const v = svgEl('text', {
        x: x + larguraBarra / 2,
        y: Math.max(9, alturaPlot - (p.valor / maximo) * alturaPlot - 4),
        class: 'gd-valor', 'text-anchor': 'middle'
      });
      v.textContent = o.rotularDestaque(p);
      svg.appendChild(v);
    }
  });

  return svg;
}

/* Retângulo com os dois cantos de cima arredondados. */
function cantoArredondadoEmCima(x, y, w, h, r){
  const raio = Math.min(r, h, w / 2);
  return 'M' + x + ',' + (y + h) +
         'L' + x + ',' + (y + raio) +
         'Q' + x + ',' + y + ' ' + (x + raio) + ',' + y +
         'L' + (x + w - raio) + ',' + y +
         'Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + raio) +
         'L' + (x + w) + ',' + (y + h) + 'Z';
}

/* ===========================================================================
   BARRAS HORIZONTAIS — magnitude com nomes longos

   Nome longo pede barra deitada. Aqui o rótulo é o canal de identidade, então
   o valor vai na ponta de cada barra: com sete linhas isso informa, não polui.

   `itens`: [{rotulo, valor, texto, cor?}]  — `cor` é só o pontinho de ligação
   com o calendário; a barra em si é sempre a mesma hue.
   =========================================================================== */
export function barrasHorizontais(itens){
  const div = document.createElement('div');
  div.className = 'gd-barras';
  const maximo = Math.max(1, ...itens.map(i => i.valor));

  itens.forEach(item => {
    const linha = document.createElement('div');
    linha.className = 'gd-barra-linha';

    const rot = document.createElement('span');
    rot.className = 'gd-barra-rotulo';
    if(item.cor){
      const ponto = document.createElement('i');
      ponto.className = 'gd-ponto';
      ponto.style.background = item.cor;
      rot.appendChild(ponto);
    }
    rot.appendChild(document.createTextNode(item.rotulo));

    const trilho = document.createElement('div');
    trilho.className = 'gd-barra-trilho';
    const preenche = document.createElement('div');
    preenche.className = 'gd-barra-preenche';
    preenche.style.width = ((item.valor / maximo) * 100).toFixed(1) + '%';
    trilho.appendChild(preenche);

    const val = document.createElement('span');
    val.className = 'gd-barra-valor';
    val.textContent = item.texto;

    linha.appendChild(rot);
    linha.appendChild(trilho);
    linha.appendChild(val);
    linha.setAttribute('role', 'listitem');
    linha.setAttribute('aria-label', item.rotulo + ': ' + item.texto);
    div.appendChild(linha);
  });

  div.setAttribute('role', 'list');
  return div;
}

/* ===========================================================================
   LINHA — evolução ao longo das sessões

   Série única: sem legenda, porque só há uma coisa desenhada e o título já
   diz qual é. Rótulo direto só na ponta.
   =========================================================================== */
export function linha(pontos, opcoes){
  const o = opcoes || {};
  const largura = 300, altura = o.altura || 110;
  const margem = {topo: 14, base: 20, esq: 6, dir: 34};
  const plotL = largura - margem.esq - margem.dir;
  const plotA = altura - margem.topo - margem.base;

  const valores = pontos.map(p => p.valor);
  const max = Math.max(...valores), min = Math.min(...valores);
  const faixa = max - min || max || 1;
  /* Uma folga de 10% impede que o maior e o menor ponto encostem na moldura. */
  const topo = max + faixa * 0.1, base = Math.max(0, min - faixa * 0.1);

  const x = i => margem.esq + (pontos.length === 1 ? plotL / 2 : (i / (pontos.length - 1)) * plotL);
  const y = v => margem.topo + plotA - ((v - base) / (topo - base || 1)) * plotA;

  const svg = svgEl('svg', {
    viewBox: '0 0 ' + largura + ' ' + altura,
    class: 'gd gd-linha', role: 'img',
    'aria-label': o.descricao || ''
  });

  /* Uma linha de base discreta em vez de grade cheia: com poucos pontos, a
     grade pesaria mais que o dado. */
  svg.appendChild(svgEl('line', {
    x1: margem.esq, y1: margem.topo + plotA, x2: margem.esq + plotL, y2: margem.topo + plotA,
    class: 'gd-eixo'
  }));

  if(pontos.length > 1){
    svg.appendChild(svgEl('path', {
      d: pontos.map((p, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ',' + y(p.valor).toFixed(1)).join(' '),
      class: 'gd-traco'
    }));
  }

  pontos.forEach((p, i) => {
    /* Anel na cor da superfície: o marcador continua legível onde cruza a
       linha ou encosta no vizinho. */
    svg.appendChild(svgEl('circle', {
      cx: x(i), cy: y(p.valor), r: 5, class: 'gd-anel'
    }));
    svg.appendChild(svgEl('circle', {
      cx: x(i), cy: y(p.valor), r: 3.2, class: 'gd-ponto-linha'
    }));
  });

  const ultimo = pontos[pontos.length - 1];
  const rot = svgEl('text', {
    x: x(pontos.length - 1) + 9, y: y(ultimo.valor) + 4, class: 'gd-valor'
  });
  rot.textContent = o.rotuloFinal || String(ultimo.valor);
  svg.appendChild(rot);

  if(o.rotuloInicio && pontos.length > 1){
    const ri = svgEl('text', {
      x: margem.esq, y: altura - 5, class: 'gd-rotulo-eixo'
    });
    ri.textContent = o.rotuloInicio;
    svg.appendChild(ri);
  }
  if(o.rotuloFim && pontos.length > 1){
    const rf = svgEl('text', {
      x: margem.esq + plotL, y: altura - 5, class: 'gd-rotulo-eixo', 'text-anchor': 'end'
    });
    rf.textContent = o.rotuloFim;
    svg.appendChild(rf);
  }

  return svg;
}

/** Medidor: uma razão contra um limite. Não é gráfico de pizza de duas fatias. */
export function medidor(fracao, rotulo, texto){
  const div = document.createElement('div');
  div.className = 'gd-medidor';
  const topo = document.createElement('div');
  topo.className = 'gd-medidor-topo';
  const r = document.createElement('span');
  r.className = 'gd-medidor-rotulo';
  r.textContent = rotulo;
  const t = document.createElement('span');
  t.className = 'gd-medidor-valor';
  t.textContent = texto;
  topo.appendChild(r); topo.appendChild(t);

  const trilho = document.createElement('div');
  trilho.className = 'gd-barra-trilho';
  const preenche = document.createElement('div');
  preenche.className = 'gd-barra-preenche';
  preenche.style.width = (Math.max(0, Math.min(1, fracao)) * 100).toFixed(1) + '%';
  trilho.appendChild(preenche);

  div.appendChild(topo);
  div.appendChild(trilho);
  div.setAttribute('aria-label', rotulo + ': ' + texto);
  return div;
}

/** Estado vazio de uma figura: diz o que falta fazer para o gráfico existir. */
export function figuraVazia(texto){
  const p = document.createElement('p');
  p.className = 'figura-vazia';
  p.textContent = texto;
  return p;
}
