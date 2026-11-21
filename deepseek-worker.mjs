import { createInterface } from 'node:readline';
import { pathToFileURL } from 'node:url';

const providers = {
  deepseek: {
    label: 'DeepSeek',
    endpoint: 'https://api.deepseek.com/chat/completions',
    keyVariable: 'DEEPSEEK_API_KEY',
    model: 'deepseek-flash',
    options: { thinking: { type: 'disabled' } },
  },
  qwen: {
    label: 'Qwen',
    endpoint: 'https://ws-rb0o4zbbn704wylh.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/chat/completions',
    keyVariable: 'DASHSCOPE_API_KEY',
    model: 'qwen-plus',
    options: {},
  },
};

const tool = {
  name: 'delegate_task',
  inputSchema: {
    type: 'object',
    properties: {
      task: { type: 'string', description: 'Goal and expected output.' },
      context: { type: 'string', description: 'Optional relevant excerpts or constraints.' },
    },
    required: ['task'],
    additionalProperties: false,
  },
};

export async function delegate(args, request = fetch, key, providerName = 'deepseek') {
  if (!Object.hasOwn(providers, providerName)) throw new Error('Unknown provider.');
  const provider = providers[providerName];
  key ??= process.env[provider.keyVariable];
  const task = typeof args?.task === 'string' ? args.task.trim() : '';
  const context = args?.context;
  if (!task || (context !== undefined && typeof context !== 'string')) {
    throw new Error('Provide a non-empty task and optional text context.');
  }
  if (!key?.trim()) throw new Error(`Set ${provider.keyVariable} in the Codex environment.`);
  const response = await request(provider.endpoint, {
    method: 'POST',
    redirect: 'error',
    headers: { Authorization: 'Bearer ' + key.trim(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: provider.model,
      ...provider.options,
      max_tokens: 4000,
      messages: [
        { role: 'system', content: 'Complete the delegated task using the given context. Return the result, assumptions and anything Codex should verify. Do not claim to have accessed files or run commands.' },
        { role: 'user', content: context ? task + '\n\nContext:\n' + context : task },
      ],
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error(`${provider.label} returned HTTP ${response.status}.`);
  const choice = (await response.json()).choices?.[0];
  if (!choice?.message?.content?.trim()) throw new Error(`${provider.label} returned no text.`);
  return choice.finish_reason === 'length'
    ? choice.message.content + '\n\n[Response reached the output limit.]'
    : choice.message.content;
}

async function handle(message, reply, providerName) {
  const { label } = providers[providerName];
  if (message?.jsonrpc !== '2.0' || typeof message.method !== 'string') {
    reply({ id: message?.id ?? null, error: { code: -32600, message: 'Invalid request' } });
    return;
  }
  if (!Object.hasOwn(message, 'id')) return;
  const { id, method, params } = message;
  switch (method) {
    case 'initialize':
      reply({ id, result: {
        protocolVersion: ['2024-11-05', '2025-03-26', '2025-06-18', '2025-11-25'].includes(params?.protocolVersion)
          ? params.protocolVersion : '2025-11-25',
        serverInfo: { name: `${providerName}-worker`, version: '1.1.0' },
        capabilities: { tools: {} },
        instructions: `Use delegate_task for requested delegation. ${label} receives the submitted task and context and returns text for Codex to review.`,
      } });
      break;
    case 'ping':
      reply({ id, result: {} });
      break;
    case 'tools/list':
      reply({ id, result: { tools: [{
        ...tool,
        description: `Ask ${label} to analyze a self-contained task. Submit relevant text and review the result before applying it.`,
      }] } });
      break;
    case 'tools/call':
      if (params?.name !== tool.name) {
        reply({ id, error: { code: -32602, message: 'Unknown tool' } });
        break;
      }
      try {
        const result = await delegate(params.arguments, fetch, undefined, providerName);
        reply({ id, result: { content: [{ type: 'text', text: result }] } });
      } catch (error) {
        const summary = error instanceof SyntaxError ? `${label} returned invalid JSON.` : error.message;
        reply({ id, result: { isError: true, content: [{ type: 'text', text: summary }] } });
      }
      break;
    default:
      reply({ id, error: { code: -32601, message: 'Method not found' } });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const providerName = process.argv[2] ?? 'deepseek';
  if (!Object.hasOwn(providers, providerName)) {
    console.error('Usage: node deepseek-worker.mjs [deepseek|qwen]');
    process.exit(1);
  }
  const input = createInterface({ input: process.stdin, crlfDelay: Infinity });
  const reply = (message) => process.stdout.write(JSON.stringify({ jsonrpc: '2.0', ...message }) + '\n');
  input.on('line', (line) => {
    if (!line.trim()) return;
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      reply({ id: null, error: { code: -32700, message: 'Parse error' } });
      return;
    }
    void handle(message, reply, providerName);
  });
}
