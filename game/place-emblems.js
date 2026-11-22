// Each row is a row of pixels on the title plaque.
const patterns = {
  book: [
    '................', '..kkkk....kkkk..', '.kglllkkkklllpgk', '.kgppllkklppppgk',
    '.kgpllpkklplppgk', '.kgppplkklppppgk', '.kgpllpkklpllpgk', '.kgppplkklppppgk',
    '.kgpllpkklpllpgk', '.kgppplkklppppgk', '.kglllpkklppplgk', '.kkkkllkkllkkkkk',
    '..kkgkkkkkkgkk..', '.....kk..kk.....',
  ],
  hall: [
    '.......kk.......','.....kkppkk.....','...kklyyyylkk...','.kklyyyyyyyylkk.',
    'kppppppppppppppk','.kkkkkkkkkkkkkk.','..klpkklpkklpk..','..klpkklpkklpk..',
    '..klpkklpkklpk..','..klpkklpkklpk..','.kkllkkllkkllkk.','kppppppppppppppk',
    'kllllllllllllllk','.kkkkkkkkkkkkkk.',
  ],
  garden: [
    '.......kkk......','.....kkgggkk....','....kggpggggk...','...kgggppgppgk..',
    '...kpgppppppgk..','...kggppyyppgk..','....kgppyyppk...','.....kgpppgk....',
    '..kkk..kggk.....','..kggkk.kk......','...kpggkgk.kkk..','....kkgggkkggk..',
    '......kkggggk...','........kkk.....',
  ],
  water: [
    '......kkk.......','.....kpppk......','.....kbpbk......','...kk.bpb.kk....',
    '..kbbkbbbkbbk...','..kpbbkbkbbpk...','...kk.bbb.kk....','.....kbbbk......',
    '.kkkkkbbbkkkkk..','kpppppppppppppk.','.kbbbbbbbbbbbk..','..kklllllllkk...',
    '.....klplk......','...kklllllkk....',
  ],
  sport: [
    '......kkk.......','....kkpppkk.....','...kpppkpppk....','..kpyyykyyppk...',
    '..kyyykyyyykk...','.kpppkyyyykyyk..','.kkkkkkkkkkkkk..','.kyyyyykpkyyyk..',
    '..kyyykppkyyk...','..kyykpppkyyk...','...kkpppyykk....','....kkpppkk.....',
    '......kkk.......','................',
  ],
  bus: [
    '...kkkkkkkkkk...','..kgggllllgggk..','.kggppppppppggk.','.kgkppbkkppbkgk.',
    '.kgkbbpkkbbpkgk.','.kgkbbbkkbbbkgk.','.kggkkkkkkkkggk.','.kggggggggggggk.',
    '.kyyggggggggyyk.','.kppggkllkggppk.','.kkkkkkkkkkkkkk.','..kllk....kllk..',
    '..kkkk....kkkk..','................',
  ],
  food: [
    '....k...k..k....','...kp..kp..kp...','....k...k..k....','................',
    '....kkkkkkkk....','..kkppppppppkk..','.kppyyyyyyyyppk.','kppppppppppppppk',
    '.kggggggggggggk.','.klgggggggggglk.','..klgggggggglk..','...kkllllllkk...',
    '.....kkkkkk.....','....kllllllk....',
  ],
  art: [
    '.....kkkkkk.....','...kkppppppkk...','..kpppyyppbbpk..','.kpppyyyppbbppk.',
    '.kprrpppppppppk.','kpprrppggppppppk','kppppppggppkkppk','kppbbpppppkk.kpk',
    '.kpbbpppppk...k.','.kpppppyyppk....','..kpppyyyppk....','...kkpppppk.....',
    '.....kkkkk......','................',
  ],
  home: [
    '.......kk.......','.....kkrrkk.....','...kkrrrrrrkk...','.kkrrrrrrrrrrkk.',
    'krrrrrrrrrrrrrrk','.kkkkkkkkkkkkkk.','..kppppppppppk..','..kpbbppppbbpk..',
    '..kpbbpkkpbbpk..','..kppppklppppk..','..kppppklppppk..','..kllllklllllk..',
    '.kkkkkkkkkkkkkk.','................',
  ],
};
const colors = {k:'#463726',p:'#fff2c6',l:'#bb935c',y:'#efb743',g:'#72974b',b:'#7bbdc1',r:'#cd7250'};
const landmarks = {
  pond:'water', plaza:'water', field:'sport', gym:'sport', art:'art', library:'book',
  humanities:'book', student:'art', 'tz-learning':'book', 'tz-market':'home',
};
const kinds = {garden:'garden',transit:'bus',dining:'food',residence:'home',court:'home',library:'book'};

export function emblemForPlace(id,kind) {
  return landmarks[id] || kinds[kind] || 'hall';
}

export function pixelEmblem(theme) {
  const canvas = document.createElement('canvas');
  canvas.width = 16; canvas.height = 16;
  canvas.setAttribute('aria-hidden','true');
  const pen = canvas.getContext('2d');
  patterns[theme].forEach((row,y) => {
    Array.from(row).forEach((color,x) => {
      if (colors[color]) {
        pen.fillStyle = colors[color];
        pen.fillRect(x,y+1,1,1);
      }
    });
  });
  return canvas;
}
