// Re-encode selected images so campus photos load quickly and contain only pixels.
export async function fitPhoto(file) {
  if (file.type && !file.type.startsWith('image/')) throw Error('type');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(1,800 / Math.max(image.width,image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1,Math.round(image.width*scale));
    canvas.height = Math.max(1,Math.round(image.height*scale));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff9e9';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(image,0,0,canvas.width,canvas.height);
    return canvas.toDataURL('image/jpeg',0.78);
  } finally { URL.revokeObjectURL(url); }
}
