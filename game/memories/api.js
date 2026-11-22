// endpoint 是完整的发布地址。同一次投稿重试时，调用方复用 requestKey。
export async function publishMemory(entry, { endpoint, accessToken, requestKey, signal } = {}) {
  if (!endpoint) throw new Error('尚未配置拾光服务器地址');
  if (!accessToken) throw new Error('发布拾光需要已登录的共享账号');
  if (!requestKey) throw new Error('缺少本次投稿的请求标识');

  const url = new URL(endpoint, globalThis.location?.href);
  const localHttp = url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !localHttp) throw new Error('拾光服务器需要 HTTPS 地址');

  const { mapVersion, x, y, body, mediaId } = entry;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + accessToken,
      'Idempotency-Key': requestKey,
    },
    body: JSON.stringify({ mapVersion, x, y, body, mediaId }),
    signal,
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    const error = new Error(detail?.message || '拾光服务器请求失败（' + response.status + '）');
    error.status = response.status;
    error.code = detail?.code;
    throw error;
  }
  return response.json();
}
