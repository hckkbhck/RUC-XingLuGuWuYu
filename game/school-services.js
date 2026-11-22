import {icon, node} from './dom.js';

const services = {
  portal: ['数智人大', 'https://my.ruc.edu.cn/#/?toLink=all', 'compass'],
  canteen: ['餐区热力图', 'https://cardview.ruc.edu.cn/zgrd/canteenHeatAnalysis?isFullPage=true', 'grid'],
  classrooms: ['寻找空闲教室', 'https://jw.ruc.edu.cn/Njw2017/index.html#/', 'grid'],
  gym: ['查看健身房人流量', 'https://cgyy.ruc.edu.cn/venue/monitor-echart/22', 'foot'],
};

export function schoolServiceLink(service, className = 'option-row') {
  const [label, url, symbol] = services[service];
  const link = node('a', className + ' school-service');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.title = label + '（在新标签页打开校方网页）';
  link.append(icon(symbol), node('span', '', label));
  if (className === 'option-row') link.append(icon('external'));
  return link;
}
