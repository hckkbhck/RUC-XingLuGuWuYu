export function node(tag, className = '', text = '') {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

const paths = {
 external:'M14 3h7v7m0-7L10 14M10 5H4v15h15v-6',
 map:'M3 5l6-2 6 2 6-2v16l-6 2-6-2-6 2z M9 3v16m6-14v16',
 book:'M4 4h6c1 0 2 1 2 2 0-1 1-2 2-2h6v15h-6c-1 0-2 1-2 2 0-1-1-2-2-2H4z M12 6v15',
 pin:'M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1114 0z M14 10a2 2 0 11-4 0 2 2 0 014 0z',
 target:'M4 11l16-7-7 16-2-7z', close:'M6 6l12 12M18 6L6 18', back:'M14 5l-7 7 7 7', right:'M9 5l7 7-7 7',
 expand:'M3 9V3h6m6 0h6v6m0 6v6h-6m-6 0H3v-6', shrink:'M9 3v6H3m12-6v6h6m0 6h-6v6m-6 0v-6H3',
 sound:'M3 9h4l5-4v14l-5-4H3z M15 8c3 2 3 6 0 8m3-11c5 4 5 10 0 14', mute:'M3 9h4l5-4v14l-5-4H3z M16 9l5 6m0-6l-5 6',
 settings:'M4 7h9m4 0h3M4 17h3m4 0h9 M17 7a2 2 0 11-4 0 2 2 0 014 0z M11 17a2 2 0 11-4 0 2 2 0 014 0z',
 help:'M21 12a9 9 0 11-18 0 9 9 0 0118 0z M9 9c0-4 7-4 6 0 0 2-3 2-3 5m0 3v.1',
 sun:'M16 12a4 4 0 11-8 0 4 4 0 018 0z M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5',
 foot:'M9 4c-1-1-4 0-4 4l.5 4 4-.5 1-4C11 6 10 4 9 4z M6 15l4-.5.3 2.5c-1 2-4 2-4-.5z M16 7c2-1 4 1 4 4l-.5 4-4-.5-1-4c0-2 .5-3 1.5-3.5z M15.5 17.5l4 .5-.3 2c-.5 2-3.7 1.8-4-.5z',
 compass:'M21 12a9 9 0 11-18 0 9 9 0 0118 0z M15.8 8.2l-2.2 5.4-5.4 2.2 2.2-5.4z',
 camera:'M3 7h4l2-3h6l2 3h4v13H3z M16 13a4 4 0 11-8 0 4 4 0 018 0z',
 check:'M4 12l5 5L20 6', music:'M9 17V5l11-2v12 M9 17c0 4-6 5-6 2 0-2 3-4 6-2z M20 15c0 4-6 5-6 2 0-2 3-4 6-2z',
 leaf:'M4 18C0 8 9 3 21 4c1 11-7 17-15 14M3 21l13-12', seat:'M5 10V6h14v4M3 12h18v4H3z M5 16v4m14-4v4',
 clock:'M21 12a9 9 0 11-18 0 9 9 0 0118 0z M12 6v6l4 2', flag:'M5 21V4m0 1c5-5 9 4 15 0v9c-6 4-10-5-15 0',
 food:'M5 3v6c0 3 5 3 5 0V3M7.5 3v18M18 3c-3 2-4 7-3 10h3m0-10v18', grid:'M3 4h8v7H3z M14 4h7v7h-7z M3 14h8v7H3z M14 14h7v7h-7z',
 cat:'M4 12V4l6 4h4l6-4v8c1 9-17 10-16 0z M8 13h1m6 0h1m-5 3h2', mark:'M6 3h12v18l-6-4-6 4z',
 keys:'M2 5h20v14H2z M5 9h1m3 0h1m3 0h1m3 0h1M6 14h12', minus:'M5 12h14', plus:'M5 12h14m-7-7v14'
};
export function icon(key) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns,'svg');
  for (const [name,value] of Object.entries({viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.65','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true'})) svg.setAttribute(name,value);
  const path = document.createElementNS(ns,'path');
  path.setAttribute('d',paths[key] || paths.pin); svg.append(path); return svg;
}
export function button(label, press, className = '', symbol) {
  const control = node('button', className);
  control.type = 'button';
  if (symbol) control.append(icon(symbol));
  control.append(node('span','',label));
  control.addEventListener('click',press);
  return control;
}
