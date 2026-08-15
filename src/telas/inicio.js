import { Dados, agir, definirTela } from '../nucleo/estado.js';
import { hojeISO, diaDaSemana, dataCabecalho, saudacao, agoraEmMinutos,
         paraMinutos, paraHora, rotuloDuracao } from '../nucleo/tempo.js';
import { blocoAtual, proximoBloco, remedioTomado, remediosPendentesHoje, treinoDoDia,
         progressoDoTreino, totaisDoDia, comprasAtuais, comprasFaltando } from '../nucleo/modelo.js';
import { h, icone, cabecalhoTela, rotuloSecao, barraProgresso, numeroBR } from '../ui/index.js';

/* ===========================================================================
   TELA 1 — INÍCIO

   O agora: em que bloco você está, o que falta tomar, o treino e a comida de
   hoje, e um atalho pras compras. É a única tela que responde "e agora?".
   =========================================================================== */

export function telaInicio(){
  const iso = hojeISO();
  const dia = diaDaSemana(iso);
  const nome = Dados.perfil.nome;

  return h('div', {class:'tela tela-inicio'},
    cabecalhoTela(
      saudacao() + (nome ? ', ' + nome : ''),
      dia.full.replace('-feira', '').replace(/^./, c => c.toUpperCase()),
      dataCabecalho(iso)
    ),
    cartaoAgora(iso),
    cartaoRemedios(iso),
    h('div', {class:'grade-dupla'}, cartaoTreino(iso), cartaoComida(iso)),
    linhaCompras()
  );
}

/* --- Acontecendo agora ---------------------------------------------------- */
export function cartaoAgora(iso){
  const atual = blocoAtual(iso);
  const proximo = proximoBloco(iso);

  if(!atual){
    return h('section', {class:'cartao-agora'},
      h('div', {class:'rotulo-claro'}, 'Agora'),
      h('div', {class:'agora-titulo'}, 'Nada marcado'),
      proximo
        ? h('div', {class:'agora-faixa'},
            h('span', {class:'agora-faixa-rotulo'}, 'A seguir'),
            h('span', {class:'agora-faixa-titulo'}, proximo.titulo),
            h('span', {class:'agora-faixa-hora'}, proximo.hora))
        : h('div', {class:'agora-sub'}, 'O dia acabou. Bom descanso.')
    );
  }

  const inicio = paraMinutos(atual.hora);
  const fim = inicio + atual.dur;
  const agora = agoraEmMinutos();
  const decorrido = (agora - inicio) / atual.dur;
  const faltam = fim - agora;

  return h('section', {class:'cartao-agora'},
    h('div', {class:'agora-topo'},
      h('div', {class:'rotulo-claro'}, 'Acontecendo agora'),
      h('div', {class:'agora-ate'}, 'até ' + paraHora(fim))
    ),
    h('div', {class:'agora-titulo'}, atual.titulo),
    atual.sub ? h('div', {class:'agora-sub'}, atual.sub) : null,
    h('div', {class:'agora-progresso'},
      barraProgresso(decorrido, 'barra-clara'),
      h('span', {class:'agora-faltam'}, rotuloDuracao(Math.max(0, faltam)))
    ),
    proximo
      ? h('div', {class:'agora-faixa'},
          h('span', {class:'agora-faixa-rotulo'}, 'A seguir'),
          h('span', {class:'agora-faixa-titulo'}, proximo.titulo),
          h('span', {class:'agora-faixa-hora'}, proximo.hora))
      : null
  );
}

/* --- Remédios de hoje ----------------------------------------------------- */
export function cartaoRemedios(iso){
  if(!Dados.remedios.length){
    return h('section', {class:'cartao'},
      h('div', {class:'cartao-topo'}, rotuloSecao('Remédios de hoje')),
      h('p', {class:'nota'}, 'Nenhum remédio cadastrado. Monte a sua caixa na aba Caixa.')
    );
  }

  const pendentes = remediosPendentesHoje().length;

  return h('section', {class:'cartao'},
    h('div', {class:'cartao-topo'},
      rotuloSecao('Remédios de hoje'),
      h('span', {class:'contador-pendente'},
        pendentes ? pendentes + ' pendente' + (pendentes > 1 ? 's' : '') : 'tudo tomado')
    ),
    h('div', {class:'lista-remedios'},
      Dados.remedios.map(med => pilulaRemedio(iso, med))
    )
  );
}

export function pilulaRemedio(iso, med){
  const tomado = remedioTomado(iso, med);
  return h('div', {
      class: 'remedio' + (tomado ? ' tomado' : ' pendente'),
      onTap: () => alternarRemedio(iso, med)
    },
    h('span', {class:'remedio-circulo'}, tomado ? icone('check', 15) : null),
    h('span', {class:'remedio-nome'}, med.nome),
    h('span', {class:'remedio-meta'}, med.compartimento + ' · ' + med.hora)
  );
}

export function alternarRemedio(iso, med){
  const tomado = remedioTomado(iso, med);
  agir(med.nome + (tomado ? ' desmarcado' : ' tomado'), d => {
    d.tomados[iso + ':' + med.id] = !tomado;
  });
}

/* --- Treino e Comida ------------------------------------------------------ */
export function cartaoTreino(iso){
  const treino = treinoDoDia(diaDaSemana(iso).k);
  const progresso = progressoDoTreino(iso, treino);
  return h('button', {class:'cartao cartao-atalho', type:'button', onTap:()=> definirTela({aba:'treino', data:iso})},
    rotuloSecao('Treino'),
    h('div', {class:'atalho-valor'}, treino ? treino.nome : 'Descanso'),
    h('div', {class:'atalho-apoio'},
      treino ? progresso.feitos + ' de ' + progresso.total + ' exercícios' : 'Sem treino hoje')
  );
}

export function cartaoComida(iso){
  const totais = totaisDoDia(iso);
  const meta = Dados.perfil.metas.kcal;
  return h('button', {class:'cartao cartao-atalho', type:'button', onTap:()=> definirTela({aba:'comida', abaComida:'hoje', data:iso})},
    rotuloSecao('Comida'),
    h('div', {class:'atalho-valor'}, numeroBR(totais.kcal) + ' kcal'),
    h('div', {class:'atalho-apoio'}, 'meta ' + numeroBR(meta) + ' · ' + totais.prot + ' g prot')
  );
}

/* --- Compras -------------------------------------------------------------- */
export function linhaCompras(){
  const lista = comprasAtuais();
  const faltando = comprasFaltando();
  const texto = !lista ? 'Gerar do cardápio da semana'
    : faltando ? faltando + ' item' + (faltando > 1 ? 's' : '') + ' em falta'
    : 'Tudo comprado';

  return h('button', {class:'linha-atalho', type:'button', onTap:()=> definirTela({aba:'comida', abaComida:'compras'})},
    h('div', null,
      rotuloSecao('Compras'),
      h('div', {class:'atalho-apoio'}, texto)
    ),
    icone('seta', 18)
  );
}
