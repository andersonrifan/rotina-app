import { DIAS, NOMES_TREINO, FORMATOS, EXERCICIOS_SUGERIDOS } from '../dados/modelo.js';
import { Dados, Tela, agir, agirSemAviso, definirTela } from '../nucleo/estado.js';
import { clonar } from '../nucleo/armazem.js';
import { diaDaSemana, semanaDe, dataCurta, rotuloDuracao } from '../nucleo/tempo.js';
import { treinoDoDia, voltasDoTreino, progressoDoTreino, exercicioFeito } from '../nucleo/modelo.js';
import { h, icone, cabecalhoTela, pilula, barraProgresso, estadoVazio, stepper,
         ajustarHora, rotuloSecao, abrirFolhaTexto } from '../ui/index.js';

/* ===========================================================================
   TELA 3 — TREINO

   Um treino por dia da semana. O dia selecionado manda: se ele não tem
   treino, a tela oferece copiar um existente ou criar do zero.

   O treino é estrutura, não marcação: editar o "Força A" muda todas as
   quartas. Já os círculos de exercício feito são por data — cada sessão tem
   as suas marcas.
   =========================================================================== */

export function telaTreino(){
  const iso = Tela.data;
  const dia = diaDaSemana(iso);
  const treino = treinoDoDia(dia.k);
  const editando = Tela.editando.treino;

  return h('div', {class:'tela tela-treino'},
    cabecalhoTela(
      dataCurta(iso) + ' · ' + dia.full,
      'Treino',
      null,
      treino ? [pilula(editando ? 'Concluir' : 'Editar',
                       () => definirTela({editando: Object.assign({}, Tela.editando, {treino: !editando})}),
                       {ativa: editando})] : null
    ),
    chipsDosTreinos(iso),
    treino
      ? (editando ? treinoEmEdicao(iso, treino) : treinoEmLeitura(iso, treino))
      : diaDeDescanso(iso, dia)
  );
}

/* --- Chips dos treinos da semana ------------------------------------------ */
export function chipsDosTreinos(iso){
  if(!Dados.treinos.length) return null;
  const diaAtual = diaDaSemana(iso).k;
  /* Ordena pelos dias da semana, não pela ordem de criação. */
  const ordenados = Dados.treinos.slice().sort(
    (a, b) => indiceDoDia(a.dia) - indiceDoDia(b.dia));

  return h('div', {class:'chips-treino'},
    ordenados.map(t => h('button', {
        class:'chip-treino' + (t.dia === diaAtual ? ' ativo' : ''),
        type:'button',
        onTap: () => definirTela({data: dataDaSemanaPara(iso, t.dia), volta: 1})
      }, t.dia + ' · ' + t.nome))
  );
}

export function indiceDoDia(k){
  for(let i = 0; i < DIAS.length; i++) if(DIAS[i].k === k) return i;
  return 99;
}

/** A data da semana atual que cai no dia da semana pedido. */
export function dataDaSemanaPara(iso, diaK){
  return semanaDe(iso)[indiceDoDia(diaK)];
}

/* --- Modo leitura --------------------------------------------------------- */
export function treinoEmLeitura(iso, treino){
  const progresso = progressoDoTreino(iso, treino);
  const voltas = voltasDoTreino(treino);

  return h('div', null,
    h('section', {class:'cartao-treino'},
      h('h2', {class:'treino-nome'}, treino.nome),
      h('div', {class:'chips-formato'},
        h('span', {class:'chip-formato'}, treino.formato),
        h('span', {class:'chip-formato'}, rotuloDuracao(treino.dur)),
        h('span', {class:'chip-formato'}, treino.hora)
      ),
      h('div', {class:'treino-progresso'},
        barraProgresso(progresso.total ? progresso.feitos / progresso.total : 0, 'barra-salvia'),
        h('span', {class:'treino-contagem'}, progresso.feitos + ' de ' + progresso.total)
      ),
      treino.circuito ? seletorDeVolta(voltas) : null
    ),
    h('div', {class:'lista-exercicios'},
      treino.exercicios.map((ex, i) => linhaDeExercicio(iso, treino, i, ex))
    )
  );
}

export function seletorDeVolta(voltas){
  return h('div', {class:'seletor-volta'},
    voltas.map(v => h('button', {
        class:'volta' + (Tela.volta === v ? ' ativa' : ''),
        type:'button',
        onTap: () => definirTela({volta: v})
      }, 'Volta ' + v))
  );
}

export function linhaDeExercicio(iso, treino, indice, ex){
  const feito = exercicioFeito(iso, treino.id, Tela.volta, indice);
  return h('div', {
      class:'exercicio' + (feito ? ' feito' : ''),
      onTap: () => {
        agir(ex.n + (feito ? ' desmarcado' : ' feito'), d => {
          d.exercFeitos[iso + ':' + treino.id + ':' + Tela.volta + ':' + indice] = !feito;
        });
      }
    },
    h('span', {class:'exercicio-circulo'}, feito ? icone('check', 14) : null),
    h('span', {class:'exercicio-nome'}, ex.n),
    h('span', {class:'exercicio-alvo'}, ex.a)
  );
}

/* --- Dia de descanso ------------------------------------------------------ */
export function diaDeDescanso(iso, dia){
  return estadoVazio(
    'Dia de descanso',
    'Nenhum treino marcado para ' + dia.full + '. Copie um treino que você já tem ou monte um novo.',
    [
      Dados.treinos.map(t => h('button', {class:'chip-acao', type:'button',
        onTap: () => copiarTreino(iso, t)}, 'Copiar ' + t.nome)),
      h('button', {class:'btn btn-salvia', type:'button',
        onTap: () => novoTreino(iso)}, 'Novo treino')
    ]
  );
}

export function copiarTreino(iso, original){
  const dia = diaDaSemana(iso);
  agir(original.nome + ' copiado para ' + dia.full, d => {
    d.treinos.push({
      id: 'tr' + Date.now().toString(36),
      dia: dia.k,
      nome: original.nome,
      formato: original.formato,
      circuito: original.circuito,
      hora: original.hora,
      dur: original.dur,
      exercicios: clonar(original.exercicios)
    });
  });
}

export function novoTreino(iso){
  const dia = diaDaSemana(iso);
  agir('Treino criado em ' + dia.full, d => {
    d.treinos.push({
      id: 'tr' + Date.now().toString(36),
      dia: dia.k, nome: 'Treino novo',
      formato: 'Séries', circuito: false,
      hora: '17:10', dur: 40,
      exercicios: []
    });
  });
  /* Cria e já abre a edição: um treino vazio não serve pra nada fechado. */
  definirTela({editando: Object.assign({}, Tela.editando, {treino: true})});
}

/* --- Modo edição ---------------------------------------------------------- */
export function treinoEmEdicao(iso, treino){
  return h('div', null,
    h('section', {class:'cartao-treino'},
      h('div', {class:'linha-renomear'},
        h('h2', {class:'treino-nome'}, treino.nome),
        h('button', {class:'btn-renomear', type:'button', onTap: () => renomearTreino(treino)},
          icone('lapis', 14), 'Renomear')
      ),
      h('div', {class:'chips-formato'},
        h('button', {class:'chip-formato acionavel', type:'button',
          onTap: () => trocarFormato(treino)}, treino.formato),
        h('span', {class:'chip-formato'}, rotuloDuracao(treino.dur)),
        h('span', {class:'chip-formato'}, treino.hora)
      ),
      h('div', {class:'campo-duplo'},
        h('div', {class:'campo'},
          h('span', {class:'campo-rotulo'}, 'Começa'),
          stepper(treino.hora, passos => agirSemAviso(d => {
            const t = acharTreino(d, treino.id);
            t.hora = ajustarHora(t.hora, passos, 15);
          }))
        ),
        h('div', {class:'campo'},
          h('span', {class:'campo-rotulo'}, 'Duração'),
          stepper(rotuloDuracao(treino.dur), passos => agirSemAviso(d => {
            const t = acharTreino(d, treino.id);
            t.dur = Math.max(5, t.dur + passos * 5);
          }))
        )
      )
    ),

    h('div', {class:'lista-exercicios'},
      treino.exercicios.map((ex, i) => h('div', {class:'exercicio exercicio-edicao'},
        h('div', {class:'exercicio-texto'},
          h('span', {class:'exercicio-nome'}, ex.n),
          h('span', {class:'exercicio-alvo'}, ex.a)
        ),
        h('div', {class:'exercicio-acoes'},
          h('button', {class:'btn-mini', type:'button', 'aria-label':'Subir ' + ex.n,
            onTap: () => moverExercicio(treino, i, -1)}, icone('cima', 14)),
          h('button', {class:'btn-mini', type:'button', 'aria-label':'Descer ' + ex.n,
            onTap: () => moverExercicio(treino, i, 1)}, icone('baixo', 14)),
          h('button', {class:'btn-mini perigo', type:'button', 'aria-label':'Remover ' + ex.n,
            onTap: () => removerExercicio(treino, i, ex)}, icone('fechar', 14))
        )
      )),
      treino.exercicios.length ? null : h('p', {class:'nota'}, 'Nenhum exercício ainda — escolha abaixo.')
    ),

    h('section', {class:'cartao'},
      rotuloSecao('Adicionar exercício'),
      h('div', {class:'sugestoes'},
        EXERCICIOS_SUGERIDOS.map(ex => h('button', {class:'sugestao', type:'button',
          onTap: () => adicionarExercicio(treino, ex)}, ex.n))
      )
    ),

    h('button', {class:'btn btn-contorno-perigo', type:'button',
      onTap: () => excluirTreino(treino)}, 'Excluir este treino')
  );
}

export function acharTreino(dados, id){ return dados.treinos.filter(t => t.id === id)[0]; }

export function renomearTreino(treino){
  abrirFolhaTexto({
    titulo: 'Nome do treino',
    valor: treino.nome,
    exemplo: 'Ex.: Peito e tríceps',
    sugestoes: NOMES_TREINO,
    aoConfirmar: nome => agir('Treino renomeado', d => {
      acharTreino(d, treino.id).nome = nome;
    })
  });
}

export function trocarFormato(treino){
  agir('Formato alterado', d => {
    const t = acharTreino(d, treino.id);
    t.formato = FORMATOS[t.formato] || 'Séries';
    /* "Circuito" é o único formato que liga as voltas. */
    t.circuito = t.formato === 'Circuito';
  });
  definirTela({volta: 1});
}

export function moverExercicio(treino, indice, direcao){
  const destino = indice + direcao;
  if(destino < 0 || destino >= treino.exercicios.length) return;
  agir('Ordem alterada', d => {
    const t = acharTreino(d, treino.id);
    const [ex] = t.exercicios.splice(indice, 1);
    t.exercicios.splice(destino, 0, ex);
  });
}

export function removerExercicio(treino, indice, ex){
  agir(ex.n + ' removido', d => {
    acharTreino(d, treino.id).exercicios.splice(indice, 1);
  });
}

export function adicionarExercicio(treino, ex){
  agir(ex.n + ' adicionado', d => {
    acharTreino(d, treino.id).exercicios.push({n: ex.n, a: ex.a});
  });
}

export function excluirTreino(treino){
  agir(treino.nome + ' excluído', d => {
    d.treinos = d.treinos.filter(t => t.id !== treino.id);
  });
  definirTela({editando: Object.assign({}, Tela.editando, {treino: false})});
}
