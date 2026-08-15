/* Rotina mínima para os testes.

   Os testes NÃO usam a rotina-modelo de verdade: se usassem, mudar o horário
   pessoal de alguém quebraria a suíte, e ninguém saberia se o erro era do
   código ou do dado. Aqui a rotina é pequena, fixa e escrita para deixar
   óbvio o que cada teste está exercitando. */

export function rotinaDeTeste(){
  return {
    perfil: {nome:'Teste', metas:{kcal:2000, prot:100}},

    fixos: {
      Seg: [
        ['00:00', 420, 'Dormindo',  'sono'],
        ['08:00', 240, 'Trabalho',  'trabalho'],
        ['19:00',  60, 'Tempo livre', 'livre'],
        ['20:00',  60, 'Leitura',   'pessoal'],
        ['22:00', 119, 'Dormindo',  'sono']
      ],
      Ter: [['08:00', 240, 'Trabalho', 'trabalho']],
      Qua: [
        ['00:00', 420, 'Dormindo',  'sono'],
        ['08:00', 240, 'Trabalho',  'trabalho'],
        ['19:00',  90, 'Estudo',    'estudo'],
        ['21:00',  60, 'Tempo livre', 'livre'],
        ['22:00', 119, 'Dormindo',  'sono']
      ],
      Qui: [],
      Sex: [],
      'Sáb': [],
      Dom: []
    },

    slots: [
      {id:'cafe',   nome:'Café',   hora:'07:00', dur:30, kcal:300, prot:15},
      {id:'almoco', nome:'Almoço', hora:'12:00', dur:60, kcal:600, prot:35}
    ],

    treinos: [
      {
        id:'t1', dia:'Qua', nome:'Treino de teste',
        formato:'Circuito', circuito:true, hora:'17:00', dur:40,
        exercicios:[{n:'Ex A', a:'3 × 10'}, {n:'Ex B', a:'3 × 10'}]
      }
    ],

    remedios: [
      {id:'m1', nome:'Vitamina', compartimento:'Manhã',  hora:'07:00', dose:'1 cáps.', diasRestantes:30},
      {id:'m2', nome:'Ômega',    compartimento:'Almoço', hora:'12:00', dose:'2 cáps.', diasRestantes:3}
    ],

    /* 'bolonhesa' existe no banco de receitas de verdade — é o que amarra o
       teste ao dado real de kcal e ingredientes. */
    cardapio: {
      Seg:   {almoco:'bolonhesa'},
      Ter:   {almoco:'bolonhesa'},
      Qua:   {},
      Qui:   {},
      Sex:   {},
      'Sáb': {},
      Dom:   {}
    }
  };
}
