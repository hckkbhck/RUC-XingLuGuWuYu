// Entries are ordered as they appear on each location's board.
export const wallLocations = {
  plaza: {
    name: '校园喷泉',
    photos: {'fountain-square':'喷泉与广场', 'fountain-water':'池边水花'},
    entries: [
      {nickname:'阿禾', photo:'fountain-water', text:'在池边等室友，连着拍了三次，终于拍到水柱最高的那一下。', time:'2026-10-28T16:42:00+08:00'},
      {nickname:'小满', photo:'fountain-square', text:'开学第一天，我们就约在这儿碰头。现在只要说一句“老地方”，大家都懂。', time:'2026-09-08T09:10:00+08:00'}
    ]
  },
  canteen: {
    name: '中区食堂',
    photos: {'canteen-door':'食堂门前', 'cinnamon-roll':'窗口的肉桂卷'},
    entries: [
      {nickname:'一颗栗子', photo:'cinnamon-roll', text:'午饭后分了一个肉桂卷。对面的同学把最中间那一圈留给了我。', time:'2026-10-23T12:18:00+08:00'},
      {nickname:'折耳', photo:'canteen-door', text:'以前总赶着进门，今天等朋友，才有空看看食堂门前的树。', time:'2026-10-12T11:46:00+08:00'}
    ]
  },
  lide: {
    name: '立德楼',
    photos: {'lide-building':'立德楼全景', 'lide-path':'南门石板路'},
    entries: [
      {nickname:'南枝', photo:'lide-path', text:'最后一节课下课，我们沿南门的石板路慢慢走完了没聊完的话题。', time:'2026-10-25T17:36:00+08:00'},
      {nickname:'墨点', photo:'lide-building', text:'第一次来立德楼上课，给自己留一张认路的照片。', time:'2026-09-10T07:54:00+08:00'}
    ]
  }
};

export const wallPhotoPath = key => 'assets/memories/wall/' + key + '.png';
