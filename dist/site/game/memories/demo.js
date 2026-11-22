// Negative IDs are reserved for packaged stories. Personal entries keep their IndexedDB keys.
function story(id, campus, place, x, y, nickname, avatarId, date, text, photo, alt, authorCampus) {
  const photoPath = photo ? 'assets/memories/demo/' + photo + '.jpg' : null;
  return Object.freeze({id, campus, place, x, y, nickname, avatarId, text, demo:true, authorCampus,
    createdAt:Date.parse(date + '+08:00'), hasPhoto:!!photoPath, photoPath, alt});
}

export const demoEntries = Object.freeze([
  story(-1,'中关村校区','求是广场西侧',1388,350,'阿禾','jacket','2026-10-28T16:42:00',
    '下课绕了五分钟的远路，正好碰上这束光。\n\n去年和我一起踩落叶的人去了另一个校区。我把今天的金黄色留在这里，也想给路过的你看看。',
    'ginkgo','银杏枝叶下的校园小路和停靠的自行车','中关村校区'),
  story(-2,'中关村校区','一勺池畔',207,242,'小满','daisy','2026-04-16T10:08:00',
    '早八之前多走了一站，在桥边听了两分钟的水声。那天的春天从这里开始。','bridge','柳树和白墙倒映在小桥下的河水里'),
  story(-3,'中关村校区','田径场',425,502,'晚风','jacket','2026-03-21T17:51:00',
    '第一次跑完五公里。终点没有掌声，只有被夕阳拉得很长的影子。','track','夕阳照在红色跑道和绿茵场上','中关村校区'),
  story(-4,'通州校区','远见学习中心',2696,221,'林间','daisy','2026-03-10T15:26:00',
    '这一页从下午三点读到四点。对面的空位一直留着阳光。','reading-room','图书馆木桌上的书和落在书页上的阳光'),
  story(-5,'中关村校区','求是广场西侧',1391,352,'南枝','daisy','2026-10-26T18:07:00',
    '第一次来报到时在喷泉旁迷了路。今天在同一个地方，给另一位新同学指了路。'),
  story(-6,'中关村校区','求是广场西侧',1385,349,'小迟','jacket','2026-09-03T09:10:00',
    '录不下喷泉的声音，就把那天等朋友的十分钟写在这里。')
]);
