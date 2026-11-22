// Rectangles are x, y, width, height in the supplied 1597 × 985 menu artwork.
export const dishGroups = [
  {name:'主食', plaque:[233,203,387,82], dishes:[
    {id:'pork-noodles', name:'皮蛋肉酱拌面', plate:[74,286,371,197], label:[451,335,326,105],
      description:'把皮蛋和肉酱拌进面条，让每一筷子都带上一点酱香。'},
    {id:'pepper-chicken', name:'播椒炒鸡饭', plate:[76,497,279,185], label:[372,539,382,108],
      description:'鸡肉和青椒一起下锅翻炒，拌着米饭吃，既有椒香，也有脆嫩的口感。'},
    {id:'luosifen', name:'干拌螺蛳粉', plate:[71,697,285,214], label:[372,744,383,108],
      description:'米粉拌上酸笋和酱汁，再撒上酥脆的配料。趁脆拌开，酸辣味更均匀。'}
  ]},
  {name:'甜点', plaque:[984,203,382,82], dishes:[
    {id:'chocolate-skewers', name:'脆皮巧克力糖葫芦', plate:[822,286,312,216], label:[1140,336,397,107],
      description:'糖葫芦外面裹了一层巧克力脆壳。轻轻咬开，里面的果子酸甜多汁。'},
    {id:'cinnamon-roll', name:'肉桂卷', plate:[821,543,323,236], label:[1176,603,330,112],
      description:'松软的面包卷裹着肉桂馅。', price:'3.5元/个', counter:'早餐在展示柜，午晚餐在7号档口。',
      reviews:[
        {nickname:'小禾', portrait:[184,523,101,78], text:'喜欢从最外圈撕着吃。'},
        {nickname:'阿栗', portrait:[184,612,104,77], text:'肉桂味很浓，配牛奶刚好。'}
      ]}
  ]}
];
