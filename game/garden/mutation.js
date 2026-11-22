import {flowerName, validPlot} from './plots.js';

export function gardenError(status, message) {
  return Object.assign(new Error(message), {status});
}

export function validateChange(draft) {
  const {action='plant',plot,flower,nickname,revision} = draft ?? {};
  if (!validPlot(plot) || !['plant','replace','remove'].includes(action) ||
      (action !== 'remove' && !flowerName(flower))) throw gardenError(400,'请重新选择花位和花种。');
  if (action === 'plant' && (typeof nickname !== 'string' || !nickname.trim() || nickname.length > 256))
    throw gardenError(400,'请先登记玩家昵称。');
  if (action !== 'plant' && (typeof revision !== 'string' || revision.length > 64))
    throw gardenError(400,'请重新读取这朵花。');
  return action;
}

export const changedFlower = () => gardenError(409,'这朵花已有变化，请重新选择。');
export const otherFlower = () => gardenError(403,'只有种花人可以更改这朵花。');
