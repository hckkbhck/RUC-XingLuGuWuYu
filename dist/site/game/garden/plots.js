// The rectangular lawn is bounded by the two north–south streets and the road to Chongde Hall.
export const gardenLawn = {x:1079, y:0, width:219, height:272};
export const bed = {x:1088, y:15, columns:10, rows:8, width:20, height:28};
export const capacity = bed.columns * bed.rows;
export const flowers = [
  {id:'daisy', name:'雏菊'}, {id:'tulip', name:'郁金香'},
  {id:'sunflower', name:'向日葵'}, {id:'bluebell', name:'风铃草'}
];
export const flowerName = id => flowers.find(flower => flower.id === id)?.name;
export const validPlot = plot => Number.isInteger(plot) && plot >= 0 && plot < capacity;
export const plotLabel = plot => String.fromCharCode(65 + Math.floor(plot / bed.columns)) + (plot % bed.columns + 1);
export const plotCorner = plot => ({
  x:bed.x + (plot % bed.columns) * bed.width,
  y:bed.y + Math.floor(plot / bed.columns) * bed.height
});
export function plotAt(x, y) {
  const col = Math.floor((x - bed.x) / bed.width), row = Math.floor((y - bed.y) / bed.height);
  return col >= 0 && col < bed.columns && row >= 0 && row < bed.rows ? row * bed.columns + col : null;
}
