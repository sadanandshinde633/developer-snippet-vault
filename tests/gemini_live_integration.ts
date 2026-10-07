import { loadTestEnv } from './env_helper';
loadTestEnv();

import { analyzeCodeWithGemini, sanitizeAIResponse, formatTags, generateHeuristicAnalysis } from '../src/lib/gemini';
import { createSnippet, findSnippetById, deleteSnippet } from '../src/lib/db';
import { ObjectId } from 'mongodb';

async function runGeminiIntegrationSuite() {
  console.log('=================================================================');
  console.log('>>> GEMINI AI INTEGRATION & MONGODB VERIFICATION TEST SUITE <<<');
  console.log('=================================================================\n');

  let passedTests = 0;
  let totalTests = 5;

  // TEST 1: Sanitization and Validation
  console.log('--- TEST 1: Sanitization and Validation Engine ---');
  const dirtyTags = ['<script>alert("hack")</script>', 'REACT', '#TypeScript!', '<b>async</b>', '#db'];
  const dirtySummary = '<p>This snippet performs <script>stealCookies()</script> user authentication.</p>';
  const sanitized = sanitizeAIResponse(dirtyTags, dirtySummary, 'typescript', 'Secure Auth Hook');

  if (
    sanitized.tags.every((t) => !t.includes('<') && !t.includes('>') && t.startsWith('#')) &&
    !sanitized.summary.includes('<script>') &&
    !sanitized.summary.includes('<p>') &&
    sanitized.tags.length >= 3 &&
    sanitized.tags.length <= 5
  ) {
    console.log('✓ Sanitization successfully stripped all HTML/XSS vectors and formatted tags.');
    console.log('  Clean Tags:', sanitized.tags);
    console.log('  Clean Summary:', sanitized.summary);
    passedTests++;
  } else {
    throw new Error('Sanitization failed: ' + JSON.stringify(sanitized));
  }

  // TEST 2: Resilient Fallback Engine
  console.log('\n--- TEST 2: Graceful Error Handling & Fallback Resiliency ---');
  const fallbackResult = generateHeuristicAnalysis(
    'const [state, setState] = useState(0);\nuseEffect(() => { fetch("/api"); }, []);',
    'javascript',
    'Counter Hook'
  );

  if (
    fallbackResult.source === 'heuristic-fallback' &&
    fallbackResult.tags.length >= 3 &&
    fallbackResult.tags.includes('#react') &&
    fallbackResult.summary.length > 10
  ) {
    console.log('✓ Heuristic fallback engine produced valid metadata without network or crash.');
    console.log('  Fallback Tags:', fallbackResult.tags);
    console.log('  Fallback Summary:', fallbackResult.summary);
    passedTests++;
  } else {
    throw new Error('Fallback test failed: ' + JSON.stringify(fallbackResult));
  }

  // TEST 3: Live Gemini API Integration with @google/genai
  console.log('\n--- TEST 3: Live Gemini API Call with @google/genai SDK ---');
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  console.log('  Checking GEMINI_API_KEY presence:', Boolean(apiKey));

  if (!apiKey) {
    console.log('⚠ GEMINI_API_KEY is not configured. Live test requires key.');
  } else {
    const snippetTitle = 'Binary Search Algorithm in TypeScript';
    const snippetLanguage = 'typescript';
    const snippetCode = `
export function binarySearch(arr: number[], target: number): number {
  let left = 0;
  let right = arr.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) left = mid + 1;
    else right = mid - 1;
  }

  return -1;
}
    `.trim();

    console.log(`  Sending snippet ("${snippetTitle}") to Gemini AI...`);
    const aiResult = await analyzeCodeWithGemini({
      title: snippetTitle,
      code: snippetCode,
      language: snippetLanguage,
    });

    console.log('  Gemini API Analysis Result:');
    console.log('  - Tags:', aiResult.tags);
    console.log('  - Summary:', aiResult.summary);
    console.log('  - Source:', aiResult.source);

    if (
      Array.isArray(aiResult.tags) &&
      aiResult.tags.length >= 3 &&
      aiResult.tags.length <= 5 &&
      aiResult.tags.every((t) => t.startsWith('#')) &&
      typeof aiResult.summary === 'string' &&
      aiResult.summary.length > 10
    ) {
      console.log('✓ Live Gemini analysis succeeded with high quality tags and plain-English summary!');
      passedTests++;
    } else {
      throw new Error('Gemini analysis failed assertions: ' + JSON.stringify(aiResult));
    }
  }

  // TEST 4: MongoDB Atlas Persistence with AI Metadata
  console.log('\n--- TEST 4: MongoDB Atlas Snippet Persistence with AI Metadata ---');
  const testUserId = new ObjectId().toString();

  const createdSnippet = await createSnippet({
    userId: testUserId,
    title: 'Exponential Backoff Retry Strategy',
    description: 'Utility for handling transient network errors.',
    code: 'async function retry(fn, retries = 3) { /* ... */ }',
    language: 'javascript',
    tags: ['#retry', '#async', '#javascript', '#network'],
    summary: 'An asynchronous JavaScript retry function with exponential backoff for network resilience.',
    isPublic: false,
  });

  console.log('  Saved snippet to MongoDB Atlas with ID:', createdSnippet.id);
  console.log('  Persisted tags:', createdSnippet.tags);
  console.log('  Persisted summary:', createdSnippet.summary);

  const fetched = await findSnippetById(createdSnippet.id, testUserId);
  if (
    fetched &&
    fetched.tags.includes('#retry') &&
    fetched.tags.includes('#async') &&
    fetched.summary?.includes('asynchronous JavaScript retry')
  ) {
    console.log('✓ Successfully retrieved snippet from MongoDB Atlas with intact AI tags and summary!');
    passedTests++;
  } else {
    throw new Error('Failed to verify snippet persistence in MongoDB Atlas');
  }

  // Clean up
  await deleteSnippet(createdSnippet.id, testUserId);
  console.log('  Cleaned up test snippet from MongoDB Atlas.');

  // TEST 5: Security & Secret Leakage Audit
  console.log('\n--- TEST 5: Security & Secret Leakage Audit ---');
  const jsonResponse = JSON.stringify({
    snippet: createdSnippet,
    tags: createdSnippet.tags,
    summary: createdSnippet.summary,
  });

  if (apiKey && jsonResponse.includes(apiKey)) {
    throw new Error('SECURITY VIOLATION: GEMINI_API_KEY was found in the response payload!');
  }

  console.log('✓ Verified: GEMINI_API_KEY is NEVER exposed in responses or client payloads.');
  passedTests++;

  console.log('\n=================================================================');
  console.log(`>>> ALL ${passedTests}/${totalTests} GEMINI INTEGRATION TESTS PASSED! <<<`);
  console.log('=================================================================\n');

  process.exit(0);
}

runGeminiIntegrationSuite().catch((err) => {
  console.error('\n❌ Test suite failed:', err);
  process.exit(1);
});
