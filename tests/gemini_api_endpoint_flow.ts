import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { POST as analyzeHandler } from '../src/app/api/ai/analyze/route';
import { POST as createSnippetHandler, GET as getSnippetsHandler } from '../src/app/api/snippets/route';
import { createUser, deleteSnippet } from '../src/lib/db';
import { hashPassword } from '../src/lib/auth';
import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

async function testApiEndpointFlow() {
  console.log('>>> TESTING NEXT.JS API ROUTES WITH GEMINI AI INTEGRATION <<<\n');

  // Step 1: Direct POST to /api/ai/analyze
  console.log('1. Testing POST /api/ai/analyze route handler...');
  const analyzeReq = new NextRequest('http://localhost:3000/api/ai/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Debounce Utility Hook',
      language: 'typescript',
      code: `
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}
      `.trim(),
    }),
  });

  const analyzeRes = await analyzeHandler(analyzeReq);
  const analyzeJson = await analyzeRes.json();

  console.log('   Status code:', analyzeRes.status);
  console.log('   AI tags:', analyzeJson.tags);
  console.log('   AI summary:', analyzeJson.summary);
  console.log('   AI source:', analyzeJson.source);

  if (
    analyzeRes.status !== 200 ||
    !Array.isArray(analyzeJson.tags) ||
    analyzeJson.tags.length < 3 ||
    !analyzeJson.summary
  ) {
    throw new Error('POST /api/ai/analyze failed assertions');
  }
  console.log('✓ POST /api/ai/analyze route succeeded!\n');

  // Step 2: Create a real test user and sign JWT session cookie
  console.log('2. Preparing authenticated user for snippet creation...');
  const passwordHash = await hashPassword('SecurePassword123!');
  const testUser = await createUser({
    email: `gemini_tester_${Date.now()}@example.com`,
    passwordHash,
    name: 'Gemini Tester',
  });
  const userId = testUser._id ? testUser._id.toString() : (testUser as any).id;

  const secret = process.env.JWT_SECRET || 'dev-secret-developer-snippet-vault-secure-jwt-2026';
  const token = jwt.sign(
    { userId, email: testUser.email, name: testUser.name },
    secret,
    { expiresIn: '1h' }
  );

  // Step 3: POST /api/snippets WITHOUT tags or summary to trigger server-side Gemini auto-generation
  console.log('3. Testing POST /api/snippets with automatic server-side Gemini generation...');
  const createReq = new NextRequest('http://localhost:3000/api/snippets', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: `snippet_vault_token=${token}`,
    },
    body: JSON.stringify({
      title: 'LRU Cache Implementation',
      language: 'typescript',
      code: `
export class LRUCache<K, V> {
  private capacity: number;
  private cache: Map<K, V> = new Map();

  constructor(capacity: number) {
    this.capacity = capacity;
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) return undefined;
    const val = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, val);
    return val;
  }

  put(key: K, value: V): void {
    if (this.cache.has(key)) this.cache.delete(key);
    else if (this.cache.size >= this.capacity) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) this.cache.delete(oldestKey);
    }
    this.cache.set(key, value);
  }
}
      `.trim(),
      isPublic: true,
    }),
  });

  const createRes = await createSnippetHandler(createReq);
  const createJson = await createRes.json();

  console.log('   Create status code:', createRes.status);
  console.log('   Saved snippet ID:', createJson.snippet?.id);
  console.log('   Auto-generated tags:', createJson.snippet?.tags);
  console.log('   Auto-generated summary:', createJson.snippet?.summary);

  if (
    createRes.status !== 201 ||
    !createJson.snippet ||
    !Array.isArray(createJson.snippet.tags) ||
    createJson.snippet.tags.length < 3 ||
    !createJson.snippet.summary
  ) {
    throw new Error('POST /api/snippets failed auto-generation assertion');
  }
  console.log('✓ Snippet saved in MongoDB Atlas with Gemini tags and summary!\n');

  // Step 4: Verify retrieval via GET /api/snippets
  console.log('4. Verifying GET /api/snippets returns the persisted AI tags and summary...');
  const getReq = new NextRequest('http://localhost:3000/api/snippets?view=my', {
    method: 'GET',
    headers: {
      cookie: `snippet_vault_token=${token}`,
    },
  });

  const getRes = await getSnippetsHandler(getReq);
  const getJson = await getRes.json();
  const found = getJson.snippets?.find((s: any) => s.id === createJson.snippet.id);

  if (!found || !found.tags || !found.summary) {
    throw new Error('Snippet was not retrieved with AI metadata from MongoDB');
  }
  console.log('   Verified snippet found in user vault:');
  console.log('   - ID:', found.id);
  console.log('   - Tags in DB:', found.tags);
  console.log('   - Summary in DB:', found.summary);
  console.log('✓ Retrieved snippet successfully with intact metadata!\n');

  // Step 5: Clean up created snippet
  console.log('5. Cleaning up test snippet...');
  await deleteSnippet(createJson.snippet.id, userId);
  console.log('✓ Cleaned up test document from MongoDB Atlas.\n');

  console.log('>>> ALL API ENDPOINT & GEMINI CRUD TESTS PASSED 100%! <<<\n');
  process.exit(0);
}

testApiEndpointFlow().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
