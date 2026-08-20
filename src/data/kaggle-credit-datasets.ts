/**
 * Kaggle dataset catalog — offline training & benchmark references.
 * Kaggle is not a runtime inference API; datasets here feed model development
 * that deploys to Hugging Face or Workers AI fine-tunes.
 */

export type KaggleDatasetRef = {
  id: string;
  slug: string;
  title: string;
  useCase: string;
  smartFcraFeature: AiFeatureLink;
  notes: string;
};

type AiFeatureLink =
  | 'fundability_scoring'
  | 'default_risk_narration'
  | 'utilization_coaching'
  | 'income_verification'
  | 'dispute_outcome_benchmark'
  | 'product_recommendation';

/** Curated references — verify slugs before automated Kaggle API pulls */
export const KAGGLE_CREDIT_DATASETS: KaggleDatasetRef[] = [
  {
    id: 'give-me-some-credit',
    slug: 'cheng-lifeng/give-me-some-credit',
    title: 'Give Me Some Credit (Kaggle classic)',
    useCase: 'Default probability benchmarks; DTI + utilization feature engineering',
    smartFcraFeature: 'fundability_scoring',
    notes: 'Use for offline validation of fundability heuristics — never ship raw Kaggle scores as FICO.',
  },
  {
    id: 'credit-card-approval',
    slug: 'samuelot/alien-credit-card-approval-prediction',
    title: 'Credit Card Approval Prediction',
    useCase: 'Approval-readiness classification features',
    smartFcraFeature: 'product_recommendation',
    notes: 'Train recommendation narratives; platform still uses deterministic eligibility gates.',
  },
  {
    id: 'lending-club',
    slug: 'wordsforthewise/lending-club',
    title: 'Lending Club Loan Data',
    useCase: 'Payment behavior and grade narratives',
    smartFcraFeature: 'default_risk_narration',
    notes: 'Coach language for DTI and payment history — not lending decisions inside Smart FCRA.',
  },
  {
    id: 'credit-score-classification',
    slug: 'architsharma01/credit-score-classification',
    title: 'Credit Score Classification',
    useCase: 'Score band explanation templates',
    smartFcraFeature: 'utilization_coaching',
    notes: 'Benchmark tutor explanations against labeled bands.',
  },
];

export function listKaggleDatasetsForFeature(feature: AiFeatureLink): KaggleDatasetRef[] {
  return KAGGLE_CREDIT_DATASETS.filter((d) => d.smartFcraFeature === feature);
}

export function kaggleIntegrationGuide(): {
  phase1: string[];
  phase2: string[];
  phase3: string[];
  runtimeNote: string;
} {
  return {
    runtimeNote: 'Kaggle provides datasets and notebooks for offline training. Runtime inference uses Hugging Face Inference API or Cloudflare Workers AI — not Kaggle directly.',
    phase1: [
      'Export anonymized Smart FCRA feature vectors (utilization, DTI, dispute outcomes) to R2 staging',
      'Join with public Kaggle benchmarks for model validation notebooks (outside Worker)',
      'Publish validated weights to Hugging Face model hub under rjbusinesssolutions org',
    ],
    phase2: [
      'Add org_ai_task_models rows to pin HF fine-tunes per task (tutor, recommendations)',
      'Wire generateTaskAiText() to prefer org model before platform cascade',
      'Log model_id + provider on every org_ai_usage row for audit',
    ],
    phase3: [
      'Optional Cloudflare Vectorize index for client_memory_chunks (replace D1 cosine scan)',
      'Feedback loop: staff thumbs-up/down on AI outputs → ai_output_reviews → retrain queue',
      'Consumer-facing "Real AI" badge when Workers AI + persistent memory + consent on file',
    ],
  };
}
