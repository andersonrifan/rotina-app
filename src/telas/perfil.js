/* ===========================================================================
   TELAS DE IDENTIDADE — BOAS-VINDAS e PERFIL

   Duas telas sobre a mesma ideia: quem está usando o app.

   BOAS-VINDAS  abre uma vez, antes de tudo, e só pergunta o nome. Não é um
                login de verdade: não há conta, senha nem servidor. É só como
                o app aprende a te chamar.

   PERFIL       a mesma informação depois, mais as coisas que mexem no app
                inteiro: metas, backup e recomeçar. Fica fora das cinco abas
                de propósito — a barra é do dia a dia; isto é configuração.

   O nome NÃO faz parte da rotina. Ele sobrevive a "recomeçar com o exemplo" e
   a "começar do zero", porque trocar de rotina não te transforma em outra
   pessoa.
   =========================================================================== */

import { Dados, agir, agirSemAviso, avisar, definirTela } from '../nucleo/estado.js';
import { salvarBackup, copiarBackup, textoDoBackup, diasDesdeOBackup,
         interpretarBackup, restaurar, resumirBackup } from '../nucleo/backup.js';
import { hojeISO } from '../nucleo/tempo.js';
import { h, icone, cabecalhoTela, pilula, rotuloSecao, stepper, abrirFolha,
         fecharFolha, abrirFolhaTexto } from '../ui/index.js';
import { reabrirPrimeiroUso } from './extras.js';
import { abrirEstatisticas } from './estatisticas.js';
import { abrirSemana } from './semana.js';

/* Injetada no build a partir do package.json. Fora do build (testes), cai
   em 'dev' — útil pra saber de qual versão veio um relato de erro. */
export const VERSAO = typeof __VERSAO__ !== 'undefined' ? __VERSAO__ : 'dev';

const LIMITE_NOME = 40;


/* ===========================================================================
   BOAS-VINDAS
   =========================================================================== */

/* Rascunho do nome sendo digitado. Fora do estado: só existe enquanto a tela
   está aberta. */
let nomeDigitado = '';

export function precisaDeNome(){
  return !Dados.perfil.nome;
}

export function telaBoasVindas(){
  return h('div', {class:'primeiro-uso boas-vindas'},
    h('div', {class:'primeiro-uso-conteudo'},
      h('div', {class:'rotulo-secao'}, 'Bem-vindo'),
      h('h1', {class:'titulo-tela grande'}, 'Como podemos te chamar?'),
      h('p', {class:'primeiro-uso-texto'},
        'Só isso. O app não tem cadastro, não pede senha e não envia nada para ' +
        'lugar nenhum — tudo o que você escrever fica neste aparelho.'),

      h('form', {class:'form-nome', onSubmit: ev => { ev.preventDefault(); entrar(); }},
        h('input', {
          class:'campo-entrada campo-nome', type:'text',
          value: nomeDigitado,
          maxlength: String(LIMITE_NOME),
          placeholder: 'Seu nome ou apelido',
          autocomplete: 'given-name',
          'aria-label': 'Seu nome',
          onInput: ev => { nomeDigitado = ev.target.value; }
        }),
        h('button', {class:'btn btn-forte alto largura-cheia', type:'submit'}, 'Entrar')
      ),

      h('p', {class:'nota'}, 'Dá para mudar depois, no seu perfil.')
    )
  );
}

function entrar(){
  const nome = nomeDigitado.trim();
  if(!nome){ avisar('Escreva um nome para continuar'); return; }
  agirSemAviso(d => { d.perfil.nome = nome; });
  nomeDigitado = '';
}


/* ===========================================================================
   PERFIL
   =========================================================================== */

export function abrirPerfil(){ definirTela({perfil: true, folha: null}); }
export function fecharPerfil(){ definirTela({perfil: false}); }

/** A inicial do nome, para o botão redondo no cabeçalho do Início. */
export function inicialDoNome(){
  const nome = (Dados.perfil.nome || '').trim();
  return nome ? nome[0].toUpperCase() : '?';
}

/** Botão de acesso ao perfil, no cabeçalho da tela Início. */
export function botaoDePerfil(){
  return h('button', {
    class:'avatar', type:'button',
    'aria-label':'Seu perfil',
    onTap: abrirPerfil
  }, inicialDoNome());
}

export function telaPerfil(){
  const perfil = Dados.perfil;

  return h('div', {class:'tela tela-perfil'},
    cabecalhoTela(null, 'Perfil', null, [pilula('Fechar', fecharPerfil)]),

    /* --- Nome --- */
    h('section', {class:'cartao'},
      rotuloSecao('Seu nome'),
      h('div', {class:'linha-slot-topo'},
        h('span', {class:'perfil-nome'}, perfil.nome || 'sem nome'),
        h('button', {class:'btn-renomear', type:'button', onTap: renomearPessoa},
          icone('lapis', 13), 'Mudar')
      )
    ),

    /* --- Aparência --- */
    h('section', {class:'cartao'},
      rotuloSecao('Aparência'),
      h('p', {class:'nota'},
        'No automático o app segue o tema do aparelho. Escolher um dos dois ' +
        'vale sempre, independente do sistema.'),
      h('div', {class:'segmentado segmentado-tema'},
        [['auto', 'Automático'], ['claro', 'Claro'], ['escuro', 'Escuro']].map(([id, rotulo]) =>
          h('button', {
            class:'segmento' + (temaAtual() === id ? ' ativo' : ''),
            type:'button', 'aria-pressed': String(temaAtual() === id),
            onTap: () => agirSemAviso(d => { d.perfil.tema = id; })
          }, rotulo))
      )
    ),

    /* --- Semana modelo ---
       Fica acima das Estatísticas porque é a única coisa do Perfil que muda o
       app em vez de só olhar para ele. */
    h('button', {class:'linha-atalho', type:'button', onTap: abrirSemana},
      h('div', null,
        rotuloSecao('Semana modelo'),
        h('div', {class:'atalho-apoio'}, 'O molde de que todo dia nasce — vale de hoje em diante')
      ),
      icone('seta', 18)
    ),

    /* --- Estatísticas --- */
    h('button', {class:'linha-atalho', type:'button', onTap: abrirEstatisticas},
      h('div', null,
        rotuloSecao('Estatísticas'),
        h('div', {class:'atalho-apoio'}, 'Aderência, tempo por área, treinos e comida')
      ),
      icone('seta', 18)
    ),

    /* --- Metas --- */
    h('section', {class:'cartao'},
      rotuloSecao('Metas do dia'),
      h('p', {class:'nota'},
        'São elas que a aba Comida usa para comparar o que você comeu.'),
      h('div', {class:'campo-duplo'},
        h('div', {class:'campo'},
          h('span', {class:'campo-rotulo'}, 'Calorias'),
          stepper(perfil.metas.kcal + ' kcal', passos => agirSemAviso(d => {
            d.perfil.metas.kcal = Math.max(500, d.perfil.metas.kcal + passos * 50);
          }))
        ),
        h('div', {class:'campo'},
          h('span', {class:'campo-rotulo'}, 'Proteína'),
          stepper(perfil.metas.prot + ' g', passos => agirSemAviso(d => {
            d.perfil.metas.prot = Math.max(20, d.perfil.metas.prot + passos * 5);
          }))
        )
      )
    ),

    /* --- Backup --- */
    h('section', {class:'cartao'},
      rotuloSecao('Seus dados'),
      h('p', {class:'nota'},
        'Tudo fica só neste aparelho. Guarde um backup de vez em quando — é o que ' +
        'permite trocar de celular ou voltar atrás se algo der errado.'),
      avisoDeBackup(),
      h('div', {class:'linha-botoes'},
        h('button', {class:'btn btn-forte', type:'button', onTap: exportar}, 'Salvar backup'),
        h('button', {class:'btn btn-suave', type:'button', onTap: escolherArquivo}, 'Restaurar')
      ),
      h('button', {class:'btn btn-transparente largura-cheia', type:'button', onTap: copiar},
        'Copiar como texto')
    ),

    /* --- Recomeçar --- */
    h('section', {class:'cartao'},
      rotuloSecao('Recomeçar'),
      h('p', {class:'nota'},
        'Volta para a tela de escolha entre a rotina de exemplo e começar do zero. ' +
        'Seu nome e suas metas continuam.'),
      h('button', {class:'btn btn-contorno-perigo largura-cheia', type:'button',
        onTap: () => { fecharPerfil(); reabrirPrimeiroUso(); }}, 'Recomeçar do início')
    ),

    h('p', {class:'versao'}, 'Rotina · versão ' + VERSAO)
  );
}

/* Sem escolha gravada, o tema é o do aparelho. */
function temaAtual(){ return Dados.perfil.tema || 'auto'; }

function renomearPessoa(){
  abrirFolhaTexto({
    titulo: 'Seu nome',
    valor: Dados.perfil.nome,
    exemplo: 'Seu nome ou apelido',
    limite: LIMITE_NOME,
    aoConfirmar: nome => agir('Nome atualizado', d => { d.perfil.nome = nome; })
  });
}


/* --- Backup ---------------------------------------------------------------
   Os dados vivem em um aparelho só, num armazenamento que o navegador pode
   apagar sozinho. Esta é a única porta de saída — e a única forma de levar a
   rotina para um celular novo. */

function exportar(){
  salvarBackup().then(saida => {
    if(!saida) return;                       // a pessoa fechou o compartilhamento
    agirSemAviso(d => { d.perfil.ultimoBackup = hojeISO(); });
    avisar('Backup ' + saida.via + ': ' + saida.nome);
  }).catch(err => {
    console.error('Falha ao exportar:', err);
    avisar('Não consegui salvar o arquivo. Tente "Copiar".');
  });
}

/* O último recurso quando nem compartilhar nem baixar funcionam: o JSON na
   área de transferência, para colar num e-mail para si mesmo. Se nem isso o
   navegador permitir, o texto aparece na tela para copiar à mão — o backup
   precisa ter uma saída que não dependa de permissão nenhuma. */
function copiar(){
  copiarBackup().then(deu => {
    if(deu){
      agirSemAviso(d => { d.perfil.ultimoBackup = hojeISO(); });
      avisar('Backup copiado. Cole num e-mail para você mesmo.');
      return;
    }
    abrirFolha({
      titulo: 'Copie o backup',
      rotuloConfirmar: 'Pronto',
      corpo: () => h('div', {class:'folha-corpo'},
        h('p', {class:'nota'},
          'Selecione tudo e copie. É este texto que a opção "Restaurar" espera de volta.'),
        h('textarea', {class:'campo-entrada campo-backup', readonly:'true',
          rows:'8', 'aria-label':'Texto do backup', value: textoDoBackup()})
      ),
      confirmar: () => {
        agirSemAviso(d => { d.perfil.ultimoBackup = hojeISO(); });
        fecharFolha();
      }
    });
  });
}

/* Um backup de seis meses atrás protege a rotina de seis meses atrás. O aviso
   só aparece quando já passou do prazo — lembrete que aparece sempre vira
   parte do cenário e ninguém mais lê. */
const DIAS_ATE_LEMBRAR = 30;

function avisoDeBackup(){
  const dias = diasDesdeOBackup(Dados.perfil);
  if(dias === null){
    return h('p', {class:'nota destaque'},
      'Você ainda não guardou nenhum backup. Se este aparelho sumir ou o ' +
      'navegador limpar os dados, a rotina vai junto.');
  }
  if(dias < DIAS_ATE_LEMBRAR){
    return h('p', {class:'nota'},
      dias === 0 ? 'Último backup: hoje.' :
      dias === 1 ? 'Último backup: ontem.' : 'Último backup: há ' + dias + ' dias.');
  }
  return h('p', {class:'nota destaque'},
    'Faz ' + dias + ' dias desde o último backup. Vale guardar um novo.');
}

/* Um <input type=file> descartável: criar na hora evita deixar no DOM um
   elemento invisível que só serve uma vez a cada muitos meses. */
function escolherArquivo(){
  const entrada = document.createElement('input');
  entrada.type = 'file';
  entrada.accept = 'application/json,.json';
  entrada.addEventListener('change', () => {
    const arquivo = entrada.files && entrada.files[0];
    if(arquivo) lerArquivo(arquivo);
  });
  entrada.click();
}

function lerArquivo(arquivo){
  const leitor = new FileReader();
  leitor.onerror = () => avisar('Não consegui ler esse arquivo.');
  leitor.onload = () => {
    let dados;
    try{
      dados = interpretarBackup(String(leitor.result));
    }catch(err){
      avisar(err.message);
      return;
    }
    confirmarRestauracao(String(leitor.result), dados);
  };
  leitor.readAsText(arquivo);
}

/* Restaurar apaga tudo o que está no aparelho. Isso pede uma confirmação que
   diga o que vai entrar — e não um "tem certeza?" genérico. */
function confirmarRestauracao(texto, dados){
  abrirFolha({
    titulo: 'Restaurar backup',
    rotuloConfirmar: 'Substituir tudo',
    corpo: () => h('div', {class:'folha-corpo'},
      h('p', {class:'nota'}, 'O backup traz: ' + resumirBackup(dados) + '.'),
      h('p', {class:'nota destaque'},
        'Isto substitui TODOS os dados que estão neste aparelho agora, inclusive ' +
        'o nome. Não dá para desfazer depois de fechar o app.')
    ),
    confirmar: () => {
      try{
        restaurar(texto);
        fecharFolha();
        definirTela({perfil: false, aba: 'inicio'});
        avisar('Backup restaurado.');
      }catch(err){
        avisar(err.message);
      }
    }
  });
}
