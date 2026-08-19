/* ===========================================================
   BASE DE ALIMENTOS
   kcal e proteína por 100 g (ou 100 ml para líquidos).
   un = unidade usada na lista de compras
   gUn = peso médio de 1 unidade (só para itens contados em 'un')
   =========================================================== */
export const ALIMENTOS = {
  // --- Ovos ---
  ovo:            {nome:'Ovo',                       kcal:143, prot:12.6, sec:'Ovos',       un:'un', gUn:50},

  // --- Laticínios e frios ---
  leite:          {nome:'Leite integral',            kcal:61,  prot:3.2,  sec:'Laticínios', un:'ml', emb:1000, embDesc:'caixa 1 L'},
  leitePo:        {nome:'Leite em pó integral',      kcal:496, prot:26,   sec:'Laticínios', un:'g',  emb:400,  embDesc:'lata 400 g'},
  mucarela:       {nome:'Queijo muçarela',           kcal:300, prot:22,   sec:'Laticínios', un:'g'},
  requeijao:      {nome:'Requeijão cremoso',         kcal:257, prot:10,   sec:'Laticínios', un:'g',  emb:200, embDesc:'copo 200 g'},
  iogurte:        {nome:'Iogurte natural integral',  kcal:61,  prot:3.5,  sec:'Laticínios', un:'g'},
  cremeLeite:     {nome:'Creme de leite',            kcal:200, prot:2.5,  sec:'Laticínios', un:'g',  emb:200, embDesc:'caixinha 200 g'},
  manteiga:       {nome:'Manteiga',                  kcal:717, prot:0.9,  sec:'Laticínios', un:'g',  emb:200, embDesc:'pote 200 g'},
  presunto:       {nome:'Presunto',                  kcal:150, prot:17,   sec:'Laticínios', un:'g'},

  // --- Carnes ---
  sobrecoxa:      {nome:'Sobrecoxa de frango s/ pele',kcal:140,prot:18,   sec:'Açougue',    un:'g'},
  peitoFrango:    {nome:'Peito de frango',           kcal:110, prot:23,   sec:'Açougue',    un:'g'},
  carneMoida:     {nome:'Carne moída (acém)',        kcal:215, prot:18,   sec:'Açougue',    un:'g'},
  calabresa:      {nome:'Linguiça calabresa',        kcal:300, prot:15,   sec:'Açougue',    un:'g'},
  sardinha:       {nome:'Sardinha em lata (óleo)',   kcal:208, prot:24,   sec:'Mercearia',  un:'un', gUn:85, embDesc:'lata 125 g (≈85 g drenada)'},

  // --- Mercearia: grãos e massas ---
  arroz:          {nome:'Arroz branco (cru)',        kcal:358, prot:7,    sec:'Mercearia',  un:'g',  emb:5000, embDesc:'pacote 5 kg'},
  feijao:         {nome:'Feijão carioca (cru)',      kcal:329, prot:20,   sec:'Mercearia',  un:'g',  emb:1000, embDesc:'pacote 1 kg'},
  lentilha:       {nome:'Lentilha (crua)',           kcal:353, prot:25,   sec:'Mercearia',  un:'g',  emb:500,  embDesc:'pacote 500 g'},
  macarrao:       {nome:'Macarrão (cru)',            kcal:371, prot:13,   sec:'Mercearia',  un:'g',  emb:500,  embDesc:'pacote 500 g'},
  aveia:          {nome:'Aveia em flocos',           kcal:389, prot:16.9, sec:'Mercearia',  un:'g',  emb:500,  embDesc:'pacote 500 g'},
  flocao:         {nome:'Flocão de milho (cuscuz)',  kcal:360, prot:7,    sec:'Mercearia',  un:'g',  emb:500,  embDesc:'pacote 500 g'},
  tapioca:        {nome:'Goma de tapioca',           kcal:240, prot:0,    sec:'Mercearia',  un:'g',  emb:500,  embDesc:'pacote 500 g'},
  farinhaTrigo:   {nome:'Farinha de trigo',          kcal:364, prot:10,   sec:'Mercearia',  un:'g',  emb:1000, embDesc:'pacote 1 kg'},
  granola:        {nome:'Granola',                   kcal:450, prot:10,   sec:'Mercearia',  un:'g'},

  // --- Mercearia: gorduras, açúcares, extras ---
  oleo:           {nome:'Óleo de soja',              kcal:884, prot:0,    sec:'Mercearia',  un:'ml', emb:900,  embDesc:'garrafa 900 ml'},
  azeite:         {nome:'Azeite',                    kcal:884, prot:0,    sec:'Mercearia',  un:'ml'},
  pastaAmendoim:  {nome:'Pasta de amendoim',         kcal:588, prot:25,   sec:'Mercearia',  un:'g',  emb:500, embDesc:'pote 500 g'},
  amendoim:       {nome:'Amendoim torrado',          kcal:567, prot:26,   sec:'Mercearia',  un:'g'},
  pacoca:         {nome:'Paçoca',                    kcal:500, prot:15,   sec:'Mercearia',  un:'un', gUn:20},
  achocolatado:   {nome:'Achocolatado em pó',        kcal:380, prot:4,    sec:'Mercearia',  un:'g',  emb:400, embDesc:'pote 400 g'},
  acucar:         {nome:'Açúcar',                    kcal:387, prot:0,    sec:'Mercearia',  un:'g',  emb:1000, embDesc:'pacote 1 kg'},
  mel:            {nome:'Mel',                       kcal:304, prot:0,    sec:'Mercearia',  un:'g'},
  molhoTomate:    {nome:'Molho de tomate',           kcal:32,  prot:1.3,  sec:'Mercearia',  un:'g',  emb:340, embDesc:'sachê 340 g'},
  milho:          {nome:'Milho em conserva',         kcal:80,  prot:2.7,  sec:'Mercearia',  un:'g',  emb:170, embDesc:'lata 170 g'},
  sal:            {nome:'Sal',                       kcal:0,   prot:0,    sec:'Mercearia',  un:'g'},
  tempero:        {nome:'Temperos (colorau, cominho, pimenta)', kcal:0, prot:0, sec:'Mercearia', un:'g'},

  // --- Hortifruti ---
  banana:         {nome:'Banana',                    kcal:89,  prot:1.1,  sec:'Hortifruti', un:'un', gUn:100},
  abacate:        {nome:'Abacate',                   kcal:160, prot:2,    sec:'Hortifruti', un:'g'},
  batata:         {nome:'Batata inglesa',            kcal:77,  prot:2,    sec:'Hortifruti', un:'g'},
  batataDoce:     {nome:'Batata-doce',               kcal:86,  prot:1.6,  sec:'Hortifruti', un:'g'},
  cebola:         {nome:'Cebola',                    kcal:40,  prot:1.1,  sec:'Hortifruti', un:'g'},
  alho:           {nome:'Alho',                      kcal:149, prot:6.4,  sec:'Hortifruti', un:'g'},
  cenoura:        {nome:'Cenoura',                   kcal:41,  prot:0.9,  sec:'Hortifruti', un:'g'},
  tomate:         {nome:'Tomate',                    kcal:18,  prot:0.9,  sec:'Hortifruti', un:'g'},

  // --- Padaria ---
  paoFrances:     {nome:'Pão francês',               kcal:300, prot:8,    sec:'Padaria',    un:'un', gUn:50},
  paoForma:       {nome:'Pão de forma (fatia)',      kcal:270, prot:9,    sec:'Padaria',    un:'un', gUn:25},
};

/* ===========================================================
   RECEITAS
   ingr: [idAlimento, quantidade]  — quantidade em g/ml, ou em unidades p/ itens 'un'

   emLote: cozinha-se de uma vez para a semana?

   Marcado à mão, receita por receita, porque "rende várias porções" não é a
   mesma pergunta. O feijão rende 12 e congela: é lote. A sardinha com batata
   rende 2 e e prato de emergencia, feito na hora: nao e. Onde o campo nao
   aparece, vale o padrão — rende mais de uma porção, é lote (ver `ehLote` em
   nucleo/modelo.js). O campo só muda alguma coisa em receita que rende mais
   de uma porção: para as de porção única, cozinhar N é sempre N.
   =========================================================== */
export const RECEITAS = [
  /* ---------------- CAFÉ DA MANHÃ ---------------- */
  {
    id:'cuscuz-ovo', nome:'Cuscuz com ovo e queijo', cat:'cafe', porcoes:1, tempo:10,
    ingr:[['flocao',80],['ovo',2],['mucarela',30],['manteiga',10],['sal',1]],
    preparo:[
      'Misture o flocão com 60 ml de água morna e uma pitada de sal. Deixe hidratar 5 min.',
      'Coloque na cuscuzeira (ou numa peneira sobre panela com água fervendo) e cozinhe 8 min no vapor.',
      'Enquanto isso, frite os ovos na manteiga.',
      'Sirva o cuscuz com o queijo por cima (derrete no calor) e os ovos.'
    ],
    lote:'O cuscuz cozido dura 3 dias na geladeira. Faça 4 porções de uma vez e reaqueça no micro-ondas com um fio de água por cima.'
  },
  {
    id:'tapioca-ovo', nome:'Tapioca com ovo e queijo', cat:'cafe', porcoes:1, tempo:10,
    ingr:[['tapioca',60],['ovo',2],['mucarela',40],['manteiga',5]],
    preparo:[
      'Espalhe a goma numa frigideira quente sem óleo, até formar o disco (2 min).',
      'Mexa os ovos na manteiga em outra frigideira.',
      'Recheie a tapioca com o ovo e o queijo, dobre e sirva.'
    ],
    lote:''
  },
  {
    id:'mingau-aveia', nome:'Mingau de aveia reforçado', cat:'cafe', porcoes:1, tempo:8,
    ingr:[['leite',300],['aveia',60],['leitePo',20],['banana',1],['pastaAmendoim',20],['acucar',10]],
    preparo:[
      'Leve o leite ao fogo baixo com a aveia, mexendo até engrossar (5 min).',
      'Desligue e misture o leite em pó, o açúcar e a pasta de amendoim.',
      'Sirva com a banana fatiada por cima.'
    ],
    lote:'Pode ser feito na noite anterior e guardado na geladeira (fica tipo "overnight oats", come frio ou reaquece).'
  },
  {
    id:'pao-ovo', nome:'Pão com ovo e requeijão', cat:'cafe', porcoes:1, tempo:7,
    ingr:[['paoFrances',2],['ovo',2],['requeijao',30],['manteiga',5]],
    preparo:[
      'Frite ou mexa os ovos na manteiga.',
      'Passe requeijão nos pães e monte com o ovo dentro.'
    ],
    lote:''
  },

  /* ---------------- SHAKES / LANCHES LÍQUIDOS ---------------- */
  {
    id:'shake-hiper', nome:'Shake hipercalórico econômico', cat:'lanche', porcoes:1, tempo:5,
    ingr:[['leite',400],['aveia',60],['banana',1],['pastaAmendoim',30],['leitePo',30],['achocolatado',15]],
    preparo:[
      'Bata tudo no liquidificador por 1 minuto.',
      'Se ficar grosso demais, adicione mais 50 ml de leite.'
    ],
    lote:'Deixe os secos (aveia + leite em pó + achocolatado) já pesados em potinhos: na hora é só jogar no liquidificador com leite e banana.'
  },
  {
    id:'vitamina-abacate', nome:'Vitamina de abacate', cat:'lanche', porcoes:1, tempo:5,
    ingr:[['abacate',150],['leite',300],['aveia',30],['leitePo',20],['acucar',15]],
    preparo:['Bata tudo no liquidificador até ficar cremoso.'],
    lote:'Congele o abacate já em cubos quando estiver barato — dura meses e vai direto do freezer pro liquidificador.'
  },
  {
    id:'vitamina-banana', nome:'Vitamina de banana rápida', cat:'lanche', porcoes:1, tempo:4,
    ingr:[['leite',300],['banana',2],['aveia',40],['pastaAmendoim',20]],
    preparo:['Bata tudo no liquidificador.'],
    lote:'Congele bananas maduras descascadas em pedaços — deixa a vitamina cremosa e evita desperdício.'
  },
  {
    id:'iogurte-granola', nome:'Iogurte com granola, paçoca e banana', cat:'lanche', porcoes:1, tempo:3,
    ingr:[['iogurte',170],['granola',40],['pacoca',1],['banana',1],['mel',15]],
    preparo:['Monte em camadas no pote: iogurte, granola, banana fatiada, paçoca esfarelada e mel.'],
    lote:'Monte 3 potes de uma vez (sem a granola) e adicione a granola só na hora, pra não murchar.'
  },
  {
    id:'sanduiche-frango', nome:'Sanduíche de frango desfiado', cat:'lanche', porcoes:1, tempo:5,
    ingr:[['paoFrances',2],['sobrecoxa',100],['requeijao',20],['mucarela',30]],
    preparo:[
      'Use o frango desfiado que já está pronto na geladeira (receita do lote).',
      'Passe requeijão no pão, recheie com o frango e o queijo.',
      'Opcional: aqueça na frigideira tampada por 2 min pra derreter o queijo.'
    ],
    lote:''
  },

  /* ---------------- LANCHES LEVES (pra fechar a conta sem estourar) ---------------- */
  {
    id:'pao-amendoim', nome:'Pão com pasta de amendoim e banana', cat:'lanche', porcoes:1, tempo:3,
    ingr:[['paoFrances',1],['pastaAmendoim',20],['banana',1]],
    preparo:['Passe a pasta de amendoim no pão e cubra com a banana em rodelas.'],
    lote:'Lanche de 3 minutos pros dias em que você não tem tempo nenhum.'
  },
  {
    id:'ovo-banana', nome:'Ovos cozidos com banana', cat:'lanche', porcoes:1, tempo:12,
    ingr:[['ovo',2],['banana',1],['pacoca',1]],
    preparo:[
      'Cozinhe os ovos por 10 min em água fervente.',
      'Coma com a banana e a paçoca.'
    ],
    lote:'Cozinhe 8 ovos de uma vez no domingo — duram uma semana na geladeira com casca.'
  },
  {
    id:'iogurte-aveia', nome:'Iogurte com aveia e mel', cat:'lanche', porcoes:1, tempo:2,
    ingr:[['iogurte',170],['aveia',30],['mel',15]],
    preparo:['Misture tudo no pote e coma.'],
    lote:''
  },
  {
    id:'vitamina-simples', nome:'Vitamina simples de banana', cat:'lanche', porcoes:1, tempo:3,
    ingr:[['leite',250],['banana',1],['aveia',20]],
    preparo:['Bata no liquidificador. Versão leve, pros dias em que o almoço foi pesado.'],
    lote:''
  },
  {
    id:'tapioca-simples', nome:'Tapioca com queijo', cat:'cafe', porcoes:1, tempo:6,
    ingr:[['tapioca',50],['mucarela',40]],
    preparo:['Espalhe a goma na frigideira quente, coloque o queijo, dobre quando derreter.'],
    lote:''
  },

  /* ---------------- BASES DE LOTE ---------------- */
  {
    id:'arroz-lote', emLote:true, nome:'Arroz branco (lote da semana)', cat:'base', porcoes:10, tempo:30,
    ingr:[['arroz',500],['oleo',20],['alho',15],['cebola',50],['sal',8]],
    preparo:[
      'Refogue o alho e a cebola no óleo até dourar.',
      'Junte o arroz lavado e escorrido, refogue 1 min.',
      'Adicione 1 litro de água fervente e o sal.',
      'Cozinhe em fogo baixo tampado por ~15 min, até secar. Desligue e deixe descansar 5 min.'
    ],
    lote:'Rende 10 porções. Guarde em potes individuais na geladeira (4 dias) ou congele (3 meses). Reaqueça com um fio de água.'
  },
  {
    id:'feijao-lote', emLote:true, nome:'Feijão carioca com calabresa (lote)', cat:'base', porcoes:12, tempo:60,
    ingr:[['feijao',500],['calabresa',100],['oleo',20],['alho',15],['cebola',80],['sal',8],['tempero',5]],
    preparo:[
      'Deixe o feijão de molho na véspera (ou 4 h). Descarte a água.',
      'Cozinhe na pressão com água 3 dedos acima do feijão por 25 min após pegar pressão.',
      'À parte, refogue alho, cebola e a calabresa em cubos no óleo.',
      'Junte 2 conchas do feijão ao refogado, amasse e devolva tudo à panela. Cozinhe mais 10 min sem tampa.'
    ],
    lote:'Rende 12 porções. Congela muito bem em potes de 1 porção — é o item que mais economiza tempo na semana.'
  },

  /* ---------------- ALMOÇO / JANTA ---------------- */
  {
    id:'frango-cremoso', emLote:true, nome:'Frango desfiado cremoso (lote)', cat:'principal', porcoes:8, tempo:50,
    ingr:[['sobrecoxa',1000],['requeijao',150],['molhoTomate',300],['cebola',100],['alho',15],['azeite',20],['sal',8],['tempero',5]],
    preparo:[
      'Cozinhe as sobrecoxas na pressão com pouca água e sal por 20 min. Reserve o caldo.',
      'Desfie o frango com dois garfos (sai fácil ainda morno).',
      'Refogue cebola e alho no azeite, junte o molho e o frango desfiado.',
      'Adicione um pouco do caldo reservado e cozinhe 10 min.',
      'Desligue e misture o requeijão fora do fogo, pra não talhar.'
    ],
    lote:'Rende 8 porções. Congela bem. Serve pra tudo: com arroz, no pão, na tapioca, no macarrão.'
  },
  {
    id:'carne-moida', emLote:true, nome:'Carne moída refogada (lote)', cat:'principal', porcoes:8, tempo:40,
    ingr:[['carneMoida',1000],['molhoTomate',500],['cebola',150],['alho',15],['cenoura',200],['oleo',20],['sal',8],['tempero',5]],
    preparo:[
      'Doure a cebola e o alho no óleo.',
      'Junte a carne moída e mexa até perder a cor rosada e soltar (e secar) a água.',
      'Adicione a cenoura ralada e o molho de tomate.',
      'Cozinhe em fogo baixo por 20 min, ajustando o sal.'
    ],
    lote:'Rende 8 porções. A cenoura ralada rende volume e some no molho. Congela perfeitamente.'
  },
  {
    id:'strogonoff', emLote:true, nome:'Strogonoff de frango econômico', cat:'principal', porcoes:6, tempo:35,
    ingr:[['peitoFrango',800],['cremeLeite',400],['molhoTomate',200],['milho',170],['cebola',100],['alho',10],['oleo',20],['sal',6]],
    preparo:[
      'Corte o frango em cubos e doure no óleo com cebola e alho.',
      'Junte o molho de tomate e cozinhe 10 min.',
      'Adicione o milho escorrido.',
      'Desligue o fogo e só então misture o creme de leite.'
    ],
    lote:'Rende 6 porções. Congela razoavelmente (o creme pode separar um pouco — mexa bem ao reaquecer).'
  },
  {
    id:'bolonhesa', emLote:true, nome:'Macarrão à bolonhesa (lote)', cat:'principal', porcoes:6, tempo:35,
    ingr:[['macarrao',500],['carneMoida',500],['molhoTomate',500],['cebola',100],['alho',15],['azeite',25],['sal',8],['mucarela',100]],
    preparo:[
      'Faça o molho: doure cebola e alho no azeite, junte a carne moída, depois o molho de tomate. Cozinhe 20 min.',
      'Cozinhe o macarrão em água salgada até ficar al dente.',
      'Misture tudo e finalize com o queijo ralado por cima.'
    ],
    lote:'Congele o molho separado do macarrão — o macarrão congelado fica mole. Molho dura 3 meses no freezer.'
  },
  {
    id:'escondidinho', emLote:true, nome:'Escondidinho de carne com batata', cat:'principal', porcoes:6, tempo:60,
    ingr:[['batata',1200],['carneMoida',600],['leite',150],['manteiga',40],['mucarela',150],['cebola',100],['alho',10],['oleo',15],['sal',10]],
    preparo:[
      'Cozinhe as batatas até ficarem macias, amasse com o leite, a manteiga e sal — faça um purê firme.',
      'Refogue a carne moída com cebola e alho até secar.',
      'Num refratário: metade do purê, a carne, o resto do purê e o queijo por cima.',
      'Leve ao forno a 200 °C por 20 min, até gratinar.'
    ],
    lote:'Rende 6 porções. Monte em potes individuais antes de assar e congele crus — asse direto do freezer quando quiser.'
  },
  {
    id:'frango-assado', emLote:true, nome:'Frango e batata-doce assados na travessa', cat:'principal', porcoes:6, tempo:60,
    ingr:[['sobrecoxa',1000],['batataDoce',1000],['azeite',30],['alho',20],['sal',10],['tempero',8]],
    preparo:[
      'Tempere o frango com alho amassado, sal e temperos. Se der, deixe 30 min pegando gosto.',
      'Corte a batata-doce em pedaços grandes e misture com azeite e sal.',
      'Espalhe tudo numa travessa grande e asse a 200 °C por 40-45 min, virando na metade.'
    ],
    lote:'Rende 6 porções e usa uma travessa só — quase não suja louça. Guarde em potes; dura 4 dias na geladeira.'
  },
  {
    id:'lentilha-calabresa', emLote:true, nome:'Lentilha com calabresa', cat:'principal', porcoes:6, tempo:40,
    ingr:[['lentilha',400],['calabresa',200],['cebola',100],['alho',15],['cenoura',150],['oleo',20],['sal',8],['tempero',5]],
    preparo:[
      'Cozinhe a lentilha em água (não precisa de molho longo) por ~20 min, até macia mas inteira.',
      'Refogue calabresa em cubos, cebola, alho e cenoura no óleo.',
      'Junte a lentilha escorrida ao refogado e cozinhe mais 5 min.'
    ],
    lote:'Rende 6 porções. Barata, proteica e congela bem. Boa alternativa ao feijão pra não enjoar.'
  },
  {
    id:'panqueca-carne', emLote:true, nome:'Panqueca de carne (lote/congela)', cat:'principal', porcoes:6, tempo:70,
    ingr:[['farinhaTrigo',200],['ovo',2],['leite',400],['carneMoida',500],['molhoTomate',400],['mucarela',100],['cebola',80],['alho',10],['oleo',30],['sal',8]],
    preparo:[
      'Massa: bata farinha, ovos, leite, sal e 15 ml de óleo no liquidificador. Deixe descansar 15 min.',
      'Faça os discos numa frigideira antiaderente untada (rende ~12 discos).',
      'Recheio: refogue a carne moída com cebola e alho até secar.',
      'Recheie os discos, enrole e disponha num refratário. Cubra com molho e queijo.',
      'Leve ao forno a 200 °C por 20 min.'
    ],
    lote:'Rende 6 porções (2 panquecas cada). Congele enroladas e sem molho, separadas por plástico; monte com molho na hora de assar.'
  },
  {
    id:'sardinha-batata', emLote:false, nome:'Sardinha com batata e ovo', cat:'principal', porcoes:2, tempo:30,
    ingr:[['sardinha',2],['batata',500],['ovo',2],['cebola',80],['azeite',20],['sal',5]],
    preparo:[
      'Cozinhe as batatas em cubos e os ovos (10 min) na mesma panela.',
      'Refogue a cebola no azeite, junte a sardinha escorrida e amasse levemente.',
      'Misture as batatas e finalize com os ovos em rodelas.'
    ],
    lote:'Prato de emergência: sardinha em lata é uma das proteínas mais baratas do mercado e não estraga no armário.'
  },
  {
    id:'omelete', nome:'Omelete recheado grande', cat:'principal', porcoes:1, tempo:12,
    ingr:[['ovo',4],['mucarela',50],['presunto',40],['oleo',10],['sal',2]],
    preparo:[
      'Bata os ovos com sal.',
      'Despeje na frigideira quente com óleo, em fogo baixo.',
      'Quando começar a firmar, coloque o recheio de um lado e dobre.'
    ],
    lote:'Janta de 12 minutos pros dias em que você chega tarde da faculdade.'
  },
  {
    id:'arroz-carreteiro', emLote:true, nome:'Arroz carreteiro (prato único)', cat:'principal', porcoes:5, tempo:40,
    ingr:[['arroz',400],['carneMoida',500],['calabresa',150],['cebola',120],['alho',15],['tomate',150],['oleo',25],['sal',8],['tempero',5]],
    preparo:[
      'Doure a calabresa e a carne moída no óleo, até secar bem.',
      'Junte cebola, alho e tomate picado; refogue mais 5 min.',
      'Adicione o arroz lavado e refogue 1 min.',
      'Coloque 800 ml de água fervente e sal. Cozinhe tampado em fogo baixo ~18 min.'
    ],
    lote:'Prato único: mata almoço e janta sem precisar de acompanhamento. Rende 5 porções e congela bem.'
  },
];
