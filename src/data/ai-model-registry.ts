/**
 * Smart FCRA AI model registry — task-specific routing across Workers AI + Hugging Face.
 * Deterministic engines own eligibility math; models explain, recommend, and coach.
 */

export type AiTaskId =
  | 'tutor_chat'
  | 'mentor_chat'
  | 'document_analysis'
  | 'credit_recommendation'
  | 'score_explanation'
  | 'letter_rewrite'
  | 'compliance_draft'
  | 'embedding';

export type AiModelBinding = {
  provider: 'cloudflare-workers-ai' | 'huggingface' | 'groq' | 'gemini' | 'openai';
  model: string;
  label: string;
  /** Lower = tried first within provider tier */
  priority: number;
  free: boolean;
  notes?: string;
};

export type AiTaskDefinition = {
  id: AiTaskId;
  label: string;
  description: string;
  /** Primary models for this task (platform defaults) */
  models: AiModelBinding[];
  /** Requires consumer AI_ASSISTED_ANALYSIS consent when client-facing */
  requiresAiConsent?: boolean;
};

/** Platform default model routing — org overrides in org_ai_task_models */
export const AI_TASK_REGISTRY: AiTaskDefinition[] = [
  {
    id: 'tutor_chat',
    label: 'Personal finance tutor',
    description: 'Grows with client journey; reads financial uploads and persistent memory.',
    requiresAiConsent: true,
    models: [
      { provider: 'cloudflare-workers-ai', model: '@cf/meta/llama-3.1-8b-instruct', label: 'Workers AI Llama 3.1 8B', priority: 1, free: true },
      { provider: 'huggingface', model: 'meta-llama/Meta-Llama-3.1-8B-Instruct', label: 'HF Llama 3.1 8B', priority: 2, free: true },
      { provider: 'groq', model: 'llama-3.3-70b-versatile', label: 'Groq Llama 3.3 70B', priority: 3, free: true },
    ],
  },
  {
    id: 'mentor_chat',
    label: 'Staff/client mentors',
    description: 'RAG-constrained FCRA, dispute, and litigation mentors.',
    models: [
      { provider: 'cloudflare-workers-ai', model: '@cf/meta/llama-3.1-8b-instruct', label: 'Workers AI Llama 3.1 8B', priority: 1, free: true },
      { provider: 'huggingface', model: 'mistralai/Mistral-7B-Instruct-v0.3', label: 'HF Mistral 7B', priority: 2, free: true },
    ],
  },
  {
    id: 'document_analysis',
    label: 'Bank / paystub / tax analysis',
    description: 'Extracts cash flow, DTI signals, and coaching notes from uploaded documents.',
    requiresAiConsent: true,
    models: [
      { provider: 'cloudflare-workers-ai', model: '@cf/meta/llama-3.1-8b-instruct', label: 'Workers AI Llama 3.1 8B', priority: 1, free: true },
      { provider: 'huggingface', model: 'google/gemma-2-2b-it', label: 'HF Gemma 2 2B', priority: 2, free: true },
    ],
  },
  {
    id: 'credit_recommendation',
    label: 'Product & readiness recommendations',
    description: 'Suggests next actions, lender readiness, and educational paths — never guarantees outcomes.',
    requiresAiConsent: true,
    models: [
      { provider: 'cloudflare-workers-ai', model: '@cf/qwen/qwen1.5-7b-chat-awq', label: 'Workers AI Qwen 1.5 7B', priority: 1, free: true },
      { provider: 'huggingface', model: 'meta-llama/Meta-Llama-3.1-8B-Instruct', label: 'HF Llama 3.1 8B', priority: 2, free: true },
    ],
  },
  {
    id: 'score_explanation',
    label: 'Score model explanations',
    description: 'Explains FICO/Vantage factors using parsed report data — deterministic scores, AI narration.',
    requiresAiConsent: true,
    models: [
      { provider: 'cloudflare-workers-ai', model: '@cf/meta/llama-3.2-3b-instruct', label: 'Workers AI Llama 3.2 3B', priority: 1, free: true },
    ],
  },
  {
    id: 'letter_rewrite',
    label: 'Dispute letter assist',
    description: 'Semantic rewrite preserving account facts and statutes.',
    models: [
      { provider: 'cloudflare-workers-ai', model: '@cf/meta/llama-3.1-8b-instruct', label: 'Workers AI Llama 3.1 8B', priority: 1, free: true },
    ],
  },
  {
    id: 'compliance_draft',
    label: 'Compliance OS comms draft',
    description: 'Drafts SMS/email workflow copy from templates — human review required.',
    models: [
      { provider: 'cloudflare-workers-ai', model: '@cf/meta/llama-3.1-8b-instruct', label: 'Workers AI Llama 3.1 8B', priority: 1, free: true },
    ],
  },
  {
    id: 'embedding',
    label: 'Semantic embeddings',
    description: 'Powers RAG for legal corpus and client learned memory.',
    models: [
      { provider: 'cloudflare-workers-ai', model: '@cf/baai/bge-base-en-v1.5', label: 'Workers AI BGE base EN', priority: 1, free: true },
    ],
  },
];

export function getAiTask(taskId: AiTaskId): AiTaskDefinition | undefined {
  return AI_TASK_REGISTRY.find((t) => t.id === taskId);
}

export function listAiTasks(): AiTaskDefinition[] {
  return AI_TASK_REGISTRY;
}

/** Marketing-safe stack description for "Real AI" positioning */
export function describeRealAiStack(configured: { workersAi: boolean; huggingface: boolean; groq: boolean; gemini: boolean }): {
  headline: string;
  pillars: string[];
  differentiators: string[];
} {
  const providers = [
    configured.workersAi && 'Cloudflare Workers AI (edge-native)',
    configured.huggingface && 'Hugging Face Inference (open models)',
    configured.groq && 'Groq (fast inference)',
    configured.gemini && 'Google Gemini',
  ].filter(Boolean);

  return {
    headline: 'Real AI on your Cloudflare stack — not scripted chatbots',
    pillars: [
      'Persistent client memory with semantic retrieval (D1 + embeddings)',
      'Task-specific model routing (tutor, documents, recommendations, mentors)',
      'Deterministic engines own scores & eligibility; AI explains and coaches',
      'Hallucination firewall + consumer attestations on every dispute path',
      'All data in Cloudflare D1/R2 with PII encryption and retention policies',
    ],
    differentiators: [
      `Multi-provider cascade: ${providers.join(' · ') || 'Workers AI included'}`,
      'Kaggle datasets feed offline benchmarks; Hugging Face serves fine-tuned credit/finance models at runtime',
      'Learned intelligence grows per client — goals, uploads, disputes, education, tutor sessions',
      'CROA signature packet + consent ledger — advisory, not lockouts',
    ],
  };
}
