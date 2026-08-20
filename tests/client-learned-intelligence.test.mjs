/**
 * Run: npx tsx tests/client-learned-intelligence.test.mjs
 */
import assert from 'node:assert/strict';
import {
  buildLearnedMemoryContext,
  storeClientMemoryChunk,
  retrieveClientMemory,
  recordTutorTurnMemory,
} from '../src/lib/client-learned-intelligence.ts';
import { describeRealAiStack, listAiTasks, getAiTask } from '../src/data/ai-model-registry.ts';
import { kaggleIntegrationGuide, KAGGLE_CREDIT_DATASETS } from '../src/data/kaggle-credit-datasets.ts';

const mockDb = () => {
  const rows = [];
  return {
    rows,
    prepare(sql) {
      return {
        bind(...binds) {
          return {
            async run() {
              if (/INSERT INTO client_memory_chunks/i.test(sql)) {
                rows.push({
                  id: binds[0],
                  org_id: binds[1],
                  client_id: binds[2],
                  source: binds[3],
                  category: binds[4],
                  content: binds[5],
                  embedding_json: binds[6],
                  metadata_json: binds[7],
                  importance: binds[8],
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                });
              }
              return { success: true };
            },
            async all() {
              const filtered = rows.filter((r) => r.org_id === binds[0] && r.client_id === binds[1]);
              return { results: filtered.slice(0, binds[2] || 100) };
            },
          };
        },
      };
    },
  };
};

const env = { DB: mockDb(), AI: null };

const chunk = await storeClientMemoryChunk(env, {
  orgId: 'org1',
  clientId: 'cli1',
  source: 'tutor_chat',
  category: 'goal',
  content: 'I want to buy a house in 2026 and need my score above 680.',
  importance: 0.9,
  embed: false,
});
assert.ok(chunk?.id, 'stores memory chunk');

await recordTutorTurnMemory(env, {
  orgId: 'org1',
  clientId: 'cli1',
  userMessage: 'My goal is to pay off my credit cards this year',
  assistantReply: 'Great goal — let us map a weekly payment plan.',
  growthLevel: 3,
  rank: 'explorer',
});

const retrieved = await retrieveClientMemory(env, 'org1', 'cli1', 'house score');
assert.ok(retrieved.length >= 1, 'retrieves stored memory');

const ctx = buildLearnedMemoryContext(retrieved);
assert.match(ctx, /Persistent learned intelligence/, 'builds context block');

const stack = describeRealAiStack({ workersAi: true, huggingface: true, groq: false, gemini: false });
assert.match(stack.headline, /Real AI/, 'real AI headline');
assert.ok(stack.pillars.length >= 4, 'stack pillars');

assert.ok(listAiTasks().length >= 6, 'task registry populated');
assert.ok(getAiTask('tutor_chat')?.requiresAiConsent, 'tutor requires consent flag');

assert.ok(KAGGLE_CREDIT_DATASETS.length >= 3, 'kaggle catalog');
assert.match(kaggleIntegrationGuide().runtimeNote, /Hugging Face/, 'kaggle is offline not runtime');

console.log('client-learned-intelligence tests passed');
