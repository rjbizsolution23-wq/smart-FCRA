/**
 * Multi-provider AI — FREE MODELS ONLY.
 * Cascade: NVIDIA NIM → Groq → OpenRouter :free → Gemini free → Together free-tier →
 * Cloudflare Workers AI → Hugging Face. Paid OpenAI is never used when FREE_AI_ONLY=true.
 */

export type AiEnv = {
  AI?: any;
  GROQ_API_KEY?: string;
  OPENROUTER_API_KEY?: string;
  TOGETHER_AI_API_KEY?: string;
  GEMINI_API_KEY?: string;
  GOOGLE_API_KEY?: string;
  OPENAI_API_KEY?: string;
  DEEPSEEK_API_KEY?: string;
  HUGGINGFACE_TOKEN?: string;
  REPLICATE_API_TOKEN?: string;
  MOONSHOT_KIMI_API_KEY?: string;
  NVIDIA_API_KEY?: string;
  FREE_AI_ONLY?: string;
  AI_DEFAULT_PROVIDER?: string;
};

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export type AiResult = {
  text: string;
  provider: string;
  model: string;
};

/** NVIDIA NIM / integrate.api.nvidia.com — free/community instruct models */
const NVIDIA_FREE_MODELS = [
  'meta/llama-3.3-70b-instruct',
  'meta/llama-3.1-70b-instruct',
  'meta/llama-3.1-8b-instruct',
  'google/gemma-2-9b-it',
  'mistralai/mistral-nemo-12b-instruct',
  'microsoft/phi-3-mini-4k-instruct',
  'nvidia/llama-3.1-nemotron-70b-instruct',
];

const GROQ_FREE_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'gemma2-9b-it',
];

const OPENROUTER_FREE_MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemma-2-9b-it:free',
  'mistralai/mistral-7b-instruct:free',
  'qwen/qwen-2.5-7b-instruct:free',
  'nvidia/llama-3.1-nemotron-70b-instruct:free',
];

function freeOnly(env: AiEnv): boolean {
  return String(env.FREE_AI_ONLY || 'true').toLowerCase() !== 'false';
}

async function chatOpenAICompat(
  url: string,
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  extraHeaders: Record<string, string> = {}
): Promise<string> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.35,
      max_tokens: 2048,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status}: ${body.slice(0, 240)}`);
  }
  const data = await res.json() as any;
  const text = data.choices?.[0]?.message?.content || data.choices?.[0]?.text || '';
  if (!text) throw new Error('Empty model response');
  return String(text);
}

async function chatGemini(apiKey: string, messages: ChatMessage[]): Promise<string> {
  const system = messages.filter(m => m.role === 'system').map(m => m.content).join('\n');
  const userParts = messages.filter(m => m.role !== 'system').map(m => `${m.role}: ${m.content}`).join('\n\n');
  const prompt = system ? `${system}\n\n${userParts}` : userParts;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 240)}`);
  const data = await res.json() as any;
  const text = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') || '';
  if (!text) throw new Error('Empty Gemini response');
  return text;
}

async function chatWorkersAi(ai: any, messages: ChatMessage[]): Promise<string> {
  const models = [
    '@cf/meta/llama-3.1-8b-instruct',
    '@cf/meta/llama-3.2-3b-instruct',
    '@cf/qwen/qwen1.5-7b-chat-awq',
  ];
  let lastErr: any;
  for (const model of models) {
    try {
      const out = await ai.run(model, { messages });
      const text = typeof out === 'string' ? out : (out.response || out.result || '');
      if (text) return String(text);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('Workers AI failed');
}

async function chatHuggingFace(token: string, messages: ChatMessage[]): Promise<string> {
  const models = [
    'meta-llama/Meta-Llama-3.1-8B-Instruct',
    'google/gemma-2-2b-it',
    'mistralai/Mistral-7B-Instruct-v0.3',
  ];
  const prompt = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n') + '\nASSISTANT:';
  let lastErr: any;
  for (const model of models) {
    try {
      const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: { max_new_tokens: 1024, return_full_text: false },
          options: { wait_for_model: true },
        }),
      });
      if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 160)}`);
      const data = await res.json() as any;
      const text = Array.isArray(data) ? (data[0]?.generated_text || '') : (data.generated_text || data[0]?.generated_text || '');
      if (text) return String(text).replace(prompt, '').trim() || String(text);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('Hugging Face inference failed');
}

/** Free-only cascade with NVIDIA first. */
export async function generateAiText(env: AiEnv, messages: ChatMessage[]): Promise<AiResult> {
  const errors: string[] = [];
  const onlyFree = freeOnly(env);

  if (env.NVIDIA_API_KEY) {
    for (const model of NVIDIA_FREE_MODELS) {
      try {
        const text = await chatOpenAICompat(
          'https://integrate.api.nvidia.com/v1/chat/completions',
          env.NVIDIA_API_KEY,
          model,
          messages
        );
        return { text, provider: 'nvidia', model };
      } catch (e: any) {
        errors.push(`nvidia/${model}: ${e.message}`);
      }
    }
  }

  if (env.GROQ_API_KEY) {
    for (const model of GROQ_FREE_MODELS) {
      try {
        const text = await chatOpenAICompat('https://api.groq.com/openai/v1/chat/completions', env.GROQ_API_KEY, model, messages);
        return { text, provider: 'groq', model };
      } catch (e: any) {
        errors.push(`groq/${model}: ${e.message}`);
      }
    }
  }

  if (env.OPENROUTER_API_KEY) {
    for (const model of OPENROUTER_FREE_MODELS) {
      try {
        const text = await chatOpenAICompat(
          'https://openrouter.ai/api/v1/chat/completions',
          env.OPENROUTER_API_KEY,
          model,
          messages,
          { 'HTTP-Referer': 'https://rjbusinesssolutions.org', 'X-Title': 'Smart FCRA Supreme' }
        );
        return { text, provider: 'openrouter-free', model };
      } catch (e: any) {
        errors.push(`openrouter/${model}: ${e.message}`);
      }
    }
  }

  const geminiKey = env.GEMINI_API_KEY || env.GOOGLE_API_KEY;
  if (geminiKey) {
    try {
      const text = await chatGemini(geminiKey, messages);
      return { text, provider: 'gemini-free', model: 'gemini-2.0-flash' };
    } catch (e: any) {
      errors.push(`gemini: ${e.message}`);
    }
  }

  if (env.TOGETHER_AI_API_KEY) {
    try {
      const model = 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo';
      const text = await chatOpenAICompat('https://api.together.xyz/v1/chat/completions', env.TOGETHER_AI_API_KEY, model, messages);
      return { text, provider: 'together', model };
    } catch (e: any) {
      errors.push(`together: ${e.message}`);
    }
  }

  if (env.AI) {
    try {
      const text = await chatWorkersAi(env.AI, messages);
      return { text, provider: 'cloudflare-workers-ai', model: 'llama-3.1-8b' };
    } catch (e: any) {
      errors.push(`workers-ai: ${e.message}`);
    }
  }

  if (env.HUGGINGFACE_TOKEN) {
    try {
      const text = await chatHuggingFace(env.HUGGINGFACE_TOKEN, messages);
      return { text, provider: 'huggingface', model: 'llama-3.1-8b-instruct' };
    } catch (e: any) {
      errors.push(`huggingface: ${e.message}`);
    }
  }

  // DeepSeek / OpenAI only if free-only disabled
  if (!onlyFree && env.DEEPSEEK_API_KEY) {
    try {
      const text = await chatOpenAICompat('https://api.deepseek.com/chat/completions', env.DEEPSEEK_API_KEY, 'deepseek-chat', messages);
      return { text, provider: 'deepseek', model: 'deepseek-chat' };
    } catch (e: any) {
      errors.push(`deepseek: ${e.message}`);
    }
  }

  if (!onlyFree && env.OPENAI_API_KEY) {
    try {
      const text = await chatOpenAICompat('https://api.openai.com/v1/chat/completions', env.OPENAI_API_KEY, 'gpt-4o-mini', messages);
      return { text, provider: 'openai', model: 'gpt-4o-mini' };
    } catch (e: any) {
      errors.push(`openai: ${e.message}`);
    }
  }

  throw new Error(`All free AI providers failed. ${errors.slice(0, 5).join(' | ')}`);
}

export function listConfiguredProviders(env: AiEnv): Array<{ id: string; configured: boolean; tier: string; free: boolean }> {
  return [
    { id: 'nvidia-nim', configured: !!env.NVIDIA_API_KEY, tier: 'free NIM instruct', free: true },
    { id: 'groq', configured: !!env.GROQ_API_KEY, tier: 'free/fast', free: true },
    { id: 'openrouter-free', configured: !!env.OPENROUTER_API_KEY, tier: 'free :free models', free: true },
    { id: 'gemini-free', configured: !!(env.GEMINI_API_KEY || env.GOOGLE_API_KEY), tier: 'free tier', free: true },
    { id: 'together', configured: !!env.TOGETHER_AI_API_KEY, tier: 'free/credits', free: true },
    { id: 'cloudflare-workers-ai', configured: !!env.AI, tier: 'included', free: true },
    { id: 'huggingface', configured: !!env.HUGGINGFACE_TOKEN, tier: 'free inference', free: true },
    { id: 'replicate-media', configured: !!env.REPLICATE_API_TOKEN, tier: 'media', free: true },
    { id: 'deepseek', configured: !!env.DEEPSEEK_API_KEY, tier: 'low-cost (disabled in free-only)', free: false },
    { id: 'openai', configured: !!env.OPENAI_API_KEY, tier: 'paid (disabled in free-only)', free: false },
  ];
}

export async function generateFreeImage(env: AiEnv, prompt: string): Promise<{ url?: string; b64?: string; provider: string; model: string }> {
  if (env.HUGGINGFACE_TOKEN) {
    const models = [
      'black-forest-labs/FLUX.1-schnell',
      'ByteDance/SDXL-Lightning',
      'stabilityai/stable-diffusion-xl-base-1.0',
    ];
    for (const model of models) {
      try {
        const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.HUGGINGFACE_TOKEN}`,
            'Content-Type': 'application/json',
            Accept: 'image/png',
          },
          body: JSON.stringify({ inputs: prompt, options: { wait_for_model: true } }),
        });
        if (!res.ok) continue;
        const ctype = res.headers.get('content-type') || '';
        if (ctype.includes('application/json')) {
          const data = await res.json() as any;
          if (data.error) continue;
        }
        const buf = await res.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        const b64 = btoa(binary);
        return { b64: `data:image/png;base64,${b64}`, provider: 'huggingface', model };
      } catch {
        /* next */
      }
    }
  }

  if (env.REPLICATE_API_TOKEN) {
    const res = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Token ${env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
        Prefer: 'wait',
      },
      body: JSON.stringify({
        version: 'black-forest-labs/flux-schnell',
        input: { prompt, num_outputs: 1 },
      }),
    });
    if (res.ok) {
      const data = await res.json() as any;
      const out = Array.isArray(data.output) ? data.output[0] : data.output;
      if (out) return { url: String(out), provider: 'replicate', model: 'flux-schnell' };
    }
  }

  throw new Error('No free media image provider succeeded (need HUGGINGFACE_TOKEN or REPLICATE_API_TOKEN)');
}
