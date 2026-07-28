/**
 * Multi-provider AI router — prefers free/fast tiers, cascades on failure.
 * Used for dispute letter rewrite, education chat, and light media generation.
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
};

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export type AiResult = {
  text: string;
  provider: string;
  model: string;
};

const FREE_OPENROUTER_MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemma-2-9b-it:free',
  'mistralai/mistral-7b-instruct:free',
  'qwen/qwen-2.5-7b-instruct:free',
];

const GROQ_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'gemma2-9b-it',
];

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

/** Cascade: Groq → OpenRouter free → Gemini → Together → DeepSeek → Workers AI → OpenAI */
export async function generateAiText(env: AiEnv, messages: ChatMessage[]): Promise<AiResult> {
  const errors: string[] = [];

  if (env.GROQ_API_KEY) {
    for (const model of GROQ_MODELS) {
      try {
        const text = await chatOpenAICompat('https://api.groq.com/openai/v1/chat/completions', env.GROQ_API_KEY, model, messages);
        return { text, provider: 'groq', model };
      } catch (e: any) {
        errors.push(`groq/${model}: ${e.message}`);
      }
    }
  }

  if (env.OPENROUTER_API_KEY) {
    for (const model of FREE_OPENROUTER_MODELS) {
      try {
        const text = await chatOpenAICompat(
          'https://openrouter.ai/api/v1/chat/completions',
          env.OPENROUTER_API_KEY,
          model,
          messages,
          { 'HTTP-Referer': 'https://rjbusinesssolutions.org', 'X-Title': 'Smart FCRA Supreme' }
        );
        return { text, provider: 'openrouter', model };
      } catch (e: any) {
        errors.push(`openrouter/${model}: ${e.message}`);
      }
    }
  }

  const geminiKey = env.GEMINI_API_KEY || env.GOOGLE_API_KEY;
  if (geminiKey) {
    try {
      const text = await chatGemini(geminiKey, messages);
      return { text, provider: 'gemini', model: 'gemini-2.0-flash' };
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

  if (env.DEEPSEEK_API_KEY) {
    try {
      const model = 'deepseek-chat';
      const text = await chatOpenAICompat('https://api.deepseek.com/chat/completions', env.DEEPSEEK_API_KEY, model, messages);
      return { text, provider: 'deepseek', model };
    } catch (e: any) {
      errors.push(`deepseek: ${e.message}`);
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

  if (env.OPENAI_API_KEY) {
    try {
      const model = 'gpt-4o-mini';
      const text = await chatOpenAICompat('https://api.openai.com/v1/chat/completions', env.OPENAI_API_KEY, model, messages);
      return { text, provider: 'openai', model };
    } catch (e: any) {
      errors.push(`openai: ${e.message}`);
    }
  }

  throw new Error(`All AI providers failed. ${errors.slice(0, 4).join(' | ')}`);
}

export function listConfiguredProviders(env: AiEnv): Array<{ id: string; configured: boolean; tier: string }> {
  return [
    { id: 'groq', configured: !!env.GROQ_API_KEY, tier: 'free/fast' },
    { id: 'openrouter-free', configured: !!env.OPENROUTER_API_KEY, tier: 'free' },
    { id: 'gemini', configured: !!(env.GEMINI_API_KEY || env.GOOGLE_API_KEY), tier: 'free tier' },
    { id: 'together', configured: !!env.TOGETHER_AI_API_KEY, tier: 'credits' },
    { id: 'deepseek', configured: !!env.DEEPSEEK_API_KEY, tier: 'low-cost' },
    { id: 'cloudflare-workers-ai', configured: !!env.AI, tier: 'included' },
    { id: 'openai', configured: !!env.OPENAI_API_KEY, tier: 'paid fallback' },
    { id: 'huggingface', configured: !!env.HUGGINGFACE_TOKEN, tier: 'free inference' },
    { id: 'replicate', configured: !!env.REPLICATE_API_TOKEN, tier: 'media' },
  ];
}

/** Free/open image generation via Hugging Face Inference (SDXL Lightning / Flux-lite class). */
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
        /* try next */
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
