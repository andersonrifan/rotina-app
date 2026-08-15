/* ===========================================================================
   ROTINA-MODELO — os dados com que o app começa

   ESTE É O ÚNICO ARQUIVO PESSOAL DO PROJETO.

   Tudo aqui é conteúdo de partida, não regra de funcionamento: horários de
   trabalho, aulas, refeições, treinos e suplementos de uma pessoa específica.
   O resto do código não conhece nenhum desses valores — ele só sabe ler as
   estruturas definidas aqui.

   Para o app servir a outra pessoa, troque este arquivo (ou deixe que ela
   monte a própria rotina pela tela de Primeiro uso, que parte do zero).
   Nenhum outro arquivo precisa ser tocado.
   =========================================================================== */

/* --- Dias da semana -------------------------------------------------------
   A ordem aqui define a ordem em toda a interface. `js` é o índice que o
   JavaScript usa em Date.getDay() (0 = domingo), necessário pra converter
   uma data real no dia da semana correspondente. */
export const DIAS = [
  {k:'Seg', letra:'S', full:'segunda-feira', curto:'seg', js:1},
  {k:'Ter', letra:'T', full:'terça-feira',   curto:'ter', js:2},
  {k:'Qua', letra:'Q', full:'quarta-feira',  curto:'qua', js:3},
  {k:'Qui', letra:'Q', full:'quinta-feira',  curto:'qui', js:4},
  {k:'Sex', letra:'S', full:'sexta-feira',   curto:'sex', js:5},
  {k:'Sáb', letra:'S', full:'sábado',        curto:'sáb', js:6},
  {k:'Dom', letra:'D', full:'domingo',       curto:'dom', js:0}
];

export const MESES = ['janeiro','fevereiro','março','abril','maio','junho',
               'julho','agosto','setembro','outubro','novembro','dezembro'];

/* --- Categorias de bloco --------------------------------------------------
   Fonte única das cores do calendário. Criar uma categoria nova é acrescentar
   uma linha: o calendário, a folha de novo bloco e a legenda passam a
   conhecê-la sozinhos. As cores vêm do design system do handoff. */
export const CATEGORIAS = {
  trabalho:  {cor:'#b2622d', rotulo:'Trabalho'},
  refeicao:  {cor:'#f6a06b', rotulo:'Refeição'},
  faculdade: {cor:'#56633f', rotulo:'Faculdade'},
  exercicio: {cor:'#8fa073', rotulo:'Exercício'},
  estudo:    {cor:'#ccdbb2', rotulo:'Estudo'},
  pessoal:   {cor:'#ccdbb2', rotulo:'Pessoal'},
  transicao: {cor:'#c0b6a5', rotulo:'Deslocamento'},
  livre:     {cor:'#dcd3c4', rotulo:'Livre'},
  sono:      {cor:'#474238', rotulo:'Sono'},
  hobby:     {cor:'#c67139', rotulo:'Hobby'}
};

/* --- Vocabulários de edição ----------------------------------------------
   Listas que os botões "Renomear" e os chips de ciclo percorrem. São
   sugestões: o app deixa digitar qualquer coisa, isto é só o atalho. */
export const COMPARTIMENTOS = ['Manhã', 'Almoço', 'Tarde', 'Noite'];
export const DOSES = ['1 cáps.', '2 cáps.', '3 cáps.', '1/2 cáps.', '5 g', '10 ml'];
export const NOMES_REFEICAO = ['Café da manhã', 'Café', 'Desjejum', 'Lanche', 'Almoço',
                        'Merenda', 'Jantar', 'Janta', 'Ceia', 'Pré-treino', 'Pós-treino'];
export const NOMES_TREINO = ['Treino novo', 'Full body leve', 'Cardio + core',
                      'Costas e bíceps', 'Pernas', 'Mobilidade curta'];
/* Ciclo dos chips de formato do treino. "Circuito" é o único que liga as voltas. */
export const FORMATOS = {'Séries':'Circuito', 'Circuito':'Bi-sets', 'Bi-sets':'Séries'};

/* Refeições sugeridas pelo botão "Adicionar refeição", na ordem em que ele
   as oferece. */
export const REFEICOES_SUGERIDAS = [
  {nome:'Ceia',       hora:'21:30', dur:20, kcal:180, prot:12},
  {nome:'Pré-treino', hora:'16:45', dur:15, kcal:150, prot:8},
  {nome:'Pós-treino', hora:'17:50', dur:15, kcal:220, prot:28}
];

/* Banco de exercícios que a seção "Adicionar exercício" oferece. */
export const EXERCICIOS_SUGERIDOS = [
  {n:'Cat-camel',                 a:'×10'},
  {n:'Glúteo médio na parede',    a:'3 × 15'},
  {n:'Mobilidade de tornozelo',   a:'×12/lado'},
  {n:'Face pull com toalha',      a:'3 × 12'},
  {n:'Prancha frontal',           a:'3 × 30s'},
  {n:'Afundo caminhando',         a:'3 × 10/perna'},
  {n:'Remada na mesa',            a:'3 × 8–12'},
  {n:'Ponte de glúteo',           a:'3 × 12–15'}
];

/* Títulos que a folha de novo bloco oferece ao tocar no campo de título. */
export const TITULOS_SUGERIDOS = ['Aula de violão', 'Consulta médica', 'Corrida no parque',
                           'Estudo de inglês', 'Igreja', 'Terapia'];


/* ===========================================================================
   A ROTINA-MODELO

   Três camadas montam o dia (ver gerarDia() em modelo.js):

     1. `fixos`   — o que é próprio de cada dia da semana: trabalho, aulas,
                    sono, deslocamentos. Escrito à mão, por dia.
     2. `slots`   — as refeições. Valem pra semana inteira e viram blocos
                    automaticamente, todo dia, no horário de cada uma.
     3. `treinos` — um treino por dia da semana. Vira o bloco de exercício
                    daquele dia; apagar o treino tira o bloco.

   Por isso mudar um horário de refeição em Comida reposiciona o bloco no
   calendário, e apagar um treino some com o bloco de exercício: não há
   duplicação de dados entre as telas.
   =========================================================================== */
export const MODELO = {

  perfil: {
    nome: 'Anderson',
    /* Metas diárias. */
    metas: {kcal: 1500, prot: 80}
  },

  /* --- 1. Blocos fixos por dia da semana ---------------------------------
     [horário de início, duração em minutos, título, categoria]
     Refeições e treinos NÃO entram aqui — são gerados. */
  fixos: {
    Seg: [
      ['00:00', 390, 'Dormindo',            'sono'],
      ['07:00', 150, 'Trabalho',            'trabalho'],
      ['09:40', 140, 'Trabalho',            'trabalho'],
      ['13:12', 138, 'Trabalho',            'trabalho'],
      ['15:40',  80, 'Trabalho',            'trabalho'],
      ['17:00',  20, 'Desloc. → faculdade', 'transicao'],
      ['17:20', 210, 'Faculdade',           'faculdade'],
      ['21:20',  10, 'Desloc. → casa',      'transicao'],
      ['21:30',  10, 'Preparar p/ dormir',  'transicao'],
      ['21:40',  50, 'Leitura + oração',    'pessoal'],
      ['22:30',  89, 'Dormindo',            'sono']
    ],
    Ter: [
      ['00:00', 390, 'Dormindo',            'sono'],
      ['07:00', 150, 'Trabalho',            'trabalho'],
      ['09:40', 140, 'Trabalho',            'trabalho'],
      ['13:12', 138, 'Trabalho',            'trabalho'],
      ['15:40',  80, 'Trabalho',            'trabalho'],
      ['17:00',  20, 'Desloc. → faculdade', 'transicao'],
      ['17:20', 210, 'Faculdade',           'faculdade'],
      ['21:20',  10, 'Desloc. → casa',      'transicao'],
      ['21:30',  10, 'Preparar p/ dormir',  'transicao'],
      ['21:40',  50, 'Leitura + oração',    'pessoal'],
      ['22:30',  89, 'Dormindo',            'sono']
    ],
    Qua: [
      ['00:00', 390, 'Dormindo',              'sono'],
      ['07:00', 150, 'Trabalho',              'trabalho'],
      ['09:40', 140, 'Trabalho',              'trabalho'],
      ['13:12', 138, 'Trabalho',              'trabalho'],
      ['15:40',  80, 'Trabalho',              'trabalho'],
      ['17:50',  45, 'Pós-treino / descanso', 'livre'],
      ['18:35',  20, 'Banho',                 'transicao'],
      ['19:10', 100, 'TCC',                   'estudo'],
      ['21:20',  20, 'Preparar p/ dormir',    'transicao'],
      ['21:40',  50, 'Leitura + oração',      'pessoal'],
      ['22:30',  89, 'Dormindo',              'sono']
    ],
    Qui: [
      ['00:00', 390, 'Dormindo',              'sono'],
      ['07:00', 150, 'Trabalho',              'trabalho'],
      ['09:40', 140, 'Trabalho',              'trabalho'],
      ['13:12', 138, 'Trabalho',              'trabalho'],
      ['15:40',  80, 'Trabalho',              'trabalho'],
      ['17:50',  45, 'Pós-treino / descanso', 'livre'],
      ['18:35',  25, 'Banho',                 'transicao'],
      ['19:00',  10, 'Desloc. → faculdade',   'transicao'],
      ['19:10', 100, 'Faculdade',             'faculdade'],
      ['21:20',  10, 'Desloc. → casa',        'transicao'],
      ['21:30',  10, 'Preparar p/ dormir',    'transicao'],
      ['21:40',  50, 'Leitura + oração',      'pessoal'],
      ['22:30',  89, 'Dormindo',              'sono']
    ],
    Sex: [
      ['00:00', 390, 'Dormindo',              'sono'],
      ['07:00', 150, 'Trabalho',              'trabalho'],
      ['09:40', 140, 'Trabalho',              'trabalho'],
      ['13:12', 138, 'Trabalho',              'trabalho'],
      ['15:40',  80, 'Trabalho',              'trabalho'],
      ['17:50',  45, 'Pós-treino / descanso', 'livre'],
      ['18:35',  25, 'Banho',                 'transicao'],
      ['19:00',  10, 'Desloc. → faculdade',   'transicao'],
      ['19:10', 100, 'Faculdade',             'faculdade'],
      ['21:20',  80, 'Faculdade',             'faculdade'],
      ['22:40',  10, 'Desloc. → casa',        'transicao'],
      ['22:50',  10, 'Preparar p/ dormir',    'transicao'],
      ['23:00',  30, 'Oração',                'pessoal'],
      ['23:30',  29, 'Dormindo',              'sono']
    ],
    'Sáb': [
      ['00:00', 480, 'Dormindo (recuperando)',       'sono'],
      ['08:30', 120, 'Rochedos de Hipona',           'estudo'],
      ['10:30',  90, 'Exercício',                    'exercicio'],
      ['13:00', 150, 'TCC',                          'estudo'],
      ['15:30', 150, 'Mercado / preparo de refeições','livre'],
      ['18:00', 165, 'Tempo livre',                  'livre'],
      ['21:40',  50, 'Leitura + oração',             'pessoal'],
      ['22:30',  89, 'Dormindo',                     'sono']
    ],
    Dom: [
      ['00:00', 480, 'Dormindo',           'sono'],
      ['10:30',  90, 'Touch grass',        'livre'],
      ['13:00', 180, 'Descanso / lazer',   'livre'],
      ['16:00',  90, 'Preparar a semana',  'livre'],
      ['17:30',  30, 'Desloc. → missa',    'transicao'],
      ['18:00',  90, 'Missa',              'pessoal'],
      ['19:30',  30, 'Desloc. → casa',     'transicao'],
      ['21:40',  50, 'Leitura + oração',   'pessoal'],
      ['22:30',  89, 'Dormindo',           'sono']
    ]
  },

  /* --- 2. Refeições -------------------------------------------------------
     Cada uma vira um bloco no calendário, todos os dias, no seu horário.
     kcal/prot são a estimativa da refeição quando o cardápio não define
     prato; com prato definido, valem os números do prato.
     Mexer nesta lista (em Comida → Editar) reflete no calendário, na grade
     da semana e na tela de hoje. */
  slots: [
    {id:'cafe',    nome:'Café da manhã', hora:'06:30', dur:30, kcal:300, prot:16},
    {id:'lancheM', nome:'Lanche manhã',  hora:'09:30', dur:10, kcal:180, prot:8},
    {id:'almoco',  nome:'Almoço',        hora:'12:00', dur:60, kcal:480, prot:30},
    {id:'lancheT', nome:'Lanche tarde',  hora:'15:30', dur:10, kcal:180, prot:9},
    {id:'janta',   nome:'Jantar',        hora:'20:50', dur:30, kcal:360, prot:17}
  ],

  /* --- 3. Treinos ---------------------------------------------------------
     Um por dia da semana, no máximo. `circuito: true` liga o seletor de
     voltas. `alvo` é texto livre: "3 × 8–12", "45s/lado", o que fizer
     sentido pro exercício. */
  treinos: [
    {
      id:'forcaA', dia:'Qua', nome:'Força A — puxada',
      formato:'Séries', circuito:false, hora:'17:10', dur:40,
      exercicios:[
        {n:'Dead hang',              a:'2 × 20–30s'},
        {n:'Scapular pull-up',       a:'2 × 5'},
        {n:'Barra fixa',             a:'5 × 2'},
        {n:'Negativa de barra',      a:'2 × 3'},
        {n:'Remada na mesa',         a:'3 × 8–12'},
        {n:'Flexão com descida 3s',  a:'3 × 6–10'},
        {n:'Ponte de glúteo',        a:'3 × 12–15'},
        {n:'Dead bug',               a:'3 × 8/lado'}
      ]
    },
    {
      id:'mobilidade', dia:'Qui', nome:'Mobilidade + Prehab',
      formato:'Circuito', circuito:true, hora:'17:10', dur:40,
      exercicios:[
        {n:'Dead hang',                a:'20–30s'},
        {n:'Wall slides',              a:'×10'},
        {n:'Extensão torácica',        a:'×10 lentas'},
        {n:'Deslocamento de ombro',    a:'×10'},
        {n:'90/90 de quadril',         a:'45s/lado'},
        {n:'Agachamento profundo',     a:'30–45s'},
        {n:'Bird-dog',                 a:'×8/lado'},
        {n:'Prancha lateral',          a:'20–30s/lado'},
        {n:'Panturrilha no degrau',    a:'×12–15'},
        {n:'Tibial anterior',          a:'×15'},
        {n:'Wall sit',                 a:'30–45s'}
      ]
    },
    {
      id:'forcaB', dia:'Sex', nome:'Força B — empurrar',
      formato:'Bi-sets', circuito:false, hora:'17:10', dur:40,
      exercicios:[
        {n:'Flexão declinada',        a:'3 × 6–10'},
        {n:'Split squat',             a:'3 × 8–10/perna'},
        {n:'RDL unilateral',          a:'3 × 8–10/perna'},
        {n:'Panturrilha unilateral',  a:'3 × 10–15'},
        {n:'Prancha lateral',         a:'3 × 20–30s/lado'}
      ]
    }
  ],

  /* --- 4. Caixa de remédios -----------------------------------------------
     `compartimento` decide em qual coluna da caixa o remédio aparece. As
     colunas da grade são só os compartimentos EM USO — se ninguém toma nada
     à noite, a coluna Noite não existe.
     `diasRestantes` alimenta o cartão de estoque e o aviso de reposição. */
  remedios: [
    {id:'m1', nome:'Vitamina D',      compartimento:'Manhã',  hora:'06:40', dose:'1 cáps.', diasRestantes:24},
    {id:'m2', nome:'Ômega 3',         compartimento:'Almoço', hora:'12:00', dose:'2 cáps.', diasRestantes:12},
    {id:'m3', nome:'Multivitamínico', compartimento:'Tarde',  hora:'15:30', dose:'1 cáps.', diasRestantes:5}
  ],

  /* --- 5. Cardápio da semana ----------------------------------------------
     dia → { slotId: id da receita } (as receitas vivem em data-receitas.js).
     Slot ausente = "A definir", que o app mostra com borda tracejada e
     manda pra tela de escolher prato. */
  cardapio: {
    Seg:   {lancheM:'iogurte-aveia',   almoco:'frango-cremoso',  lancheT:'sanduiche-frango'},
    Ter:   {lancheM:'vitamina-simples',almoco:'carne-moida',     lancheT:'sanduiche-frango'},
    Qua:   {lancheM:'iogurte-aveia',   almoco:'frango-assado',   lancheT:'pao-amendoim', janta:'bolonhesa'},
    Qui:   {lancheM:'pao-amendoim',    almoco:'bolonhesa',       lancheT:'vitamina-banana'},
    Sex:   {almoco:'bolonhesa',        lancheT:'pao-amendoim'},
    'Sáb': {cafe:'mingau-aveia',       lancheM:'iogurte-aveia',  almoco:'bolonhesa', lancheT:'vitamina-simples'},
    Dom:   {cafe:'tapioca-ovo',        lancheM:'pao-amendoim'}
  }
};

/* Rotina vazia — o que a tela de Primeiro uso entrega a quem escolhe
   "Começar do zero". Mesma forma do MODELO, sem conteúdo pessoal. */
export const MODELO_VAZIO = {
  perfil: {nome:'', metas:{kcal:2000, prot:100}},
  fixos:  {Seg:[], Ter:[], Qua:[], Qui:[], Sex:[], 'Sáb':[], Dom:[]},
  slots: [
    {id:'cafe',   nome:'Café da manhã', hora:'07:00', dur:30, kcal:400, prot:20},
    {id:'almoco', nome:'Almoço',        hora:'12:00', dur:60, kcal:700, prot:40},
    {id:'janta',  nome:'Jantar',        hora:'19:00', dur:40, kcal:600, prot:30}
  ],
  treinos: [],
  remedios: [],
  cardapio: {Seg:{}, Ter:{}, Qua:{}, Qui:{}, Sex:{}, 'Sáb':{}, Dom:{}}
};
