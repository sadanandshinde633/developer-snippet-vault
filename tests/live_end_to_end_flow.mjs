import http from 'http';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
import { MongoClient, ObjectId } from 'mongodb';

const PORT = 3000;
const HOST = 'localhost';

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const { method = 'GET', headers = {}, body = null } = options;
    const reqHeaders = { ...headers };
    let payload = null;

    if (body) {
      payload = typeof body === 'string' ? body : JSON.stringify(body);
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(
      {
        hostname: HOST,
        port: PORT,
        path,
        method,
        headers: reqHeaders,
      },
      (res) => {
        let resBody = '';
        res.on('data', (chunk) => (resBody += chunk));
        res.on('end', () => {
          let parsed = null;
          try {
            parsed = JSON.parse(resBody);
          } catch {
            parsed = resBody;
          }
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: parsed,
          });
        });
      }
    );

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function extractCookie(headers) {
  const setCookie = headers['set-cookie'];
  if (!setCookie) return '';
  const first = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  return first.split(';')[0];
}

async function run() {
  console.log('====================================================');
  console.log('STARTING COMPLETE 19-STEP END-TO-END FLOW VERIFICATION');
  console.log('====================================================\n');

  const timestamp = Date.now();
  const testEmail = `e2e_user_${timestamp}@example.com`;
  const testPassword = 'Password123!';
  const testName = 'E2E Test Developer';

  const mongoClient = new MongoClient(process.env.MONGODB_URI);
  await mongoClient.connect();
  const db = mongoClient.db('snippet_vault');

  let sessionCookie = '';
  let userId = '';
  let snippetId = '';
  const jsCode = `
// Asynchronous retry with exponential backoff
async function retryWithBackoff(fn, retries = 3, delay = 500) {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    await new Promise((resolve) => setTimeout(resolve, delay));
    return retryWithBackoff(fn, retries - 1, delay * 2);
  }
}
`;

  // Step 1: Open application
  console.log('Step 1: Open application (GET /)...');
  const step1 = await request('/');
  if (step1.statusCode !== 200) throw new Error(`Step 1 Failed: Status ${step1.statusCode}`);
  console.log('   ✓ Status 200 OK. Application root loaded.');

  // Step 2: Create account or login
  console.log('\nStep 2: Create account (POST /api/auth/register)...');
  const step2 = await request('/api/auth/register', {
    method: 'POST',
    body: { email: testEmail, password: testPassword, name: testName },
  });
  if (step2.statusCode !== 201) throw new Error(`Step 2 Failed: Status ${step2.statusCode}: ${JSON.stringify(step2.body)}`);
  sessionCookie = extractCookie(step2.headers);
  userId = step2.body.user.id;
  console.log(`   ✓ Account created: ${testEmail} (ID: ${userId})`);
  console.log(`   ✓ Session cookie established: ${sessionCookie.substring(0, 30)}...`);

  // Step 3: Open dashboard (verify session)
  console.log('\nStep 3: Open dashboard / Verify session (GET /api/auth/me)...');
  const step3 = await request('/api/auth/me', {
    headers: { Cookie: sessionCookie },
  });
  if (step3.statusCode !== 200 || step3.body.user.id !== userId) {
    throw new Error(`Step 3 Failed: ${JSON.stringify(step3.body)}`);
  }
  console.log(`   ✓ Dashboard session confirmed for: ${step3.body.user.name}`);

  // Step 4: Generate Gemini tags & summary
  console.log('\nStep 4: AI Analysis for JavaScript snippet (POST /api/ai/analyze)...');
  const step4 = await request('/api/ai/analyze', {
    method: 'POST',
    body: { code: jsCode, language: 'javascript' },
  });
  if (step4.statusCode !== 200) throw new Error(`Step 4 Failed: ${JSON.stringify(step4.body)}`);
  const { tags: aiTags, summary: aiSummary } = step4.body;
  console.log(`   ✓ AI tags generated (${aiTags.length}):`, aiTags);
  console.log(`   ✓ AI summary generated: "${aiSummary}"`);

  // Step 5: Save snippet
  console.log('\nStep 5: Save snippet (POST /api/snippets)...');
  const snippetPayload = {
    title: 'Async Retry with Exponential Backoff',
    code: jsCode,
    language: 'javascript',
    tags: aiTags,
    summary: aiSummary,
    description: 'Utility for handling network flakiness gracefully.',
    isPublic: false,
  };
  const step5 = await request('/api/snippets', {
    method: 'POST',
    headers: { Cookie: sessionCookie },
    body: snippetPayload,
  });
  if (step5.statusCode !== 201) throw new Error(`Step 5 Failed: Status ${step5.statusCode}: ${JSON.stringify(step5.body)}`);
  snippetId = step5.body.snippet.id;
  console.log(`   ✓ Snippet saved with ID: ${snippetId}`);

  // Step 6: Verify MongoDB Atlas
  console.log('\nStep 6: Verify MongoDB Atlas contains snippet...');
  const mongoSnippet = await db.collection('snippets').findOne({ _id: new ObjectId(snippetId) });
  if (!mongoSnippet) throw new Error('Step 6 Failed: Snippet not found in MongoDB Atlas!');
  if (mongoSnippet.userId !== userId) throw new Error(`Step 6 Failed: Owner mismatch! Expected ${userId}, got ${mongoSnippet.userId}`);
  console.log('   ✓ Verified in MongoDB Atlas: document found and owned by userId.');

  // Step 7: Verify Gemini tags
  console.log('\nStep 7: Verify Gemini tags in saved snippet...');
  if (!Array.isArray(mongoSnippet.tags) || mongoSnippet.tags.length < 3) {
    throw new Error(`Step 7 Failed: Tags array invalid: ${JSON.stringify(mongoSnippet.tags)}`);
  }
  console.log(`   ✓ Verified: ${mongoSnippet.tags.length} tags stored:`, mongoSnippet.tags);

  // Step 8: Verify Gemini summary
  console.log('\nStep 8: Verify Gemini summary in saved snippet...');
  if (typeof mongoSnippet.summary !== 'string' || !mongoSnippet.summary.trim()) {
    throw new Error('Step 8 Failed: Summary is missing or empty!');
  }
  console.log(`   ✓ Verified summary: "${mongoSnippet.summary}"`);

  // Step 9: Refresh browser (fetch user vault snippets)
  console.log('\nStep 9: Refresh browser / Fetch vault (GET /api/snippets?view=my)...');
  const step9 = await request('/api/snippets?view=my', {
    headers: { Cookie: sessionCookie },
  });
  if (step9.statusCode !== 200) throw new Error(`Step 9 Failed: Status ${step9.statusCode}`);
  console.log(`   ✓ Status 200 OK. Fetched ${step9.body.snippets.length} snippet(s).`);

  // Step 10: Verify snippet still exists in list
  console.log('\nStep 10: Verify snippet exists in vault...');
  const foundInList = step9.body.snippets.find((s) => s.id === snippetId);
  if (!foundInList) throw new Error('Step 10 Failed: Saved snippet not present in vault list!');
  console.log(`   ✓ Verified: Found snippet "${foundInList.title}" in vault.`);

  // Step 11: Edit snippet
  console.log('\nStep 11: Edit snippet (PUT /api/snippets/:id)...');
  const updatedTitle = 'Async Retry with Exponential Backoff (v2 Production)';
  const updatedCode = jsCode + '\n// Updated with jitter support\n';
  const step11 = await request(`/api/snippets/${snippetId}`, {
    method: 'PUT',
    headers: { Cookie: sessionCookie },
    body: {
      title: updatedTitle,
      code: updatedCode,
      language: 'javascript',
      tags: [...aiTags, '#production'],
      summary: aiSummary,
      description: 'Updated with jitter support.',
      isPublic: false,
    },
  });
  if (step11.statusCode !== 200) throw new Error(`Step 11 Failed: Status ${step11.statusCode}`);
  console.log('   ✓ Update request succeeded.');

  // Step 12: Refresh again
  console.log('\nStep 12: Refresh again (GET /api/snippets/:id)...');
  const step12 = await request(`/api/snippets/${snippetId}`, {
    headers: { Cookie: sessionCookie },
  });
  if (step12.statusCode !== 200) throw new Error(`Step 12 Failed: Status ${step12.statusCode}`);
  console.log('   ✓ Single snippet read succeeded.');

  // Step 13: Verify updated data
  console.log('\nStep 13: Verify updated data in response and in MongoDB Atlas...');
  if (step12.body.snippet.title !== updatedTitle) {
    throw new Error(`Step 13 Failed: Expected title "${updatedTitle}", got "${step12.body.snippet.title}"`);
  }
  const mongoUpdated = await db.collection('snippets').findOne({ _id: new ObjectId(snippetId) });
  if (mongoUpdated.title !== updatedTitle) {
    throw new Error('Step 13 Failed: MongoDB Atlas title does not match updated title!');
  }
  console.log('   ✓ Verified updated title in API and MongoDB Atlas.');

  // Step 14: Copy code verification
  console.log('\nStep 14: Verify code payload for copy action...');
  if (step12.body.snippet.code !== updatedCode.trim()) {
    throw new Error('Step 14 Failed: Code payload does not match expected updated code!');
  }
  console.log(`   ✓ Verified exact code payload (${step12.body.snippet.code.length} chars) matches clipboard target.`);

  // Step 15: Delete snippet
  console.log('\nStep 15: Delete snippet (DELETE /api/snippets/:id)...');
  const step15 = await request(`/api/snippets/${snippetId}`, {
    method: 'DELETE',
    headers: { Cookie: sessionCookie },
  });
  if (step15.statusCode !== 200) throw new Error(`Step 15 Failed: Status ${step15.statusCode}`);
  console.log('   ✓ Delete endpoint responded 200 OK.');

  // Step 16: Confirm deletion in MongoDB Atlas
  console.log('\nStep 16: Confirm deletion directly in MongoDB Atlas...');
  const mongoAfterDelete = await db.collection('snippets').findOne({ _id: new ObjectId(snippetId) });
  if (mongoAfterDelete !== null) {
    throw new Error('Step 16 Failed: Snippet document still exists in MongoDB Atlas!');
  }
  console.log('   ✓ Verified: Document completely removed from MongoDB Atlas.');

  // Step 17: Refresh
  console.log('\nStep 17: Refresh vault (GET /api/snippets?view=my)...');
  const step17 = await request('/api/snippets?view=my', {
    headers: { Cookie: sessionCookie },
  });
  if (step17.statusCode !== 200) throw new Error(`Step 17 Failed: Status ${step17.statusCode}`);
  console.log('   ✓ Status 200 OK after refresh.');

  // Step 18: Verify snippet is gone
  console.log('\nStep 18: Verify snippet is gone from vault list...');
  const stillInList = step17.body.snippets.find((s) => s.id === snippetId);
  if (stillInList) throw new Error('Step 18 Failed: Snippet still appears in vault list!');
  console.log('   ✓ Verified: Snippet does not appear in vault list.');

  // Step 19: Logout
  console.log('\nStep 19: Logout (POST /api/auth/logout)...');
  const step19 = await request('/api/auth/logout', {
    method: 'POST',
    headers: { Cookie: sessionCookie },
  });
  if (step19.statusCode !== 200) throw new Error(`Step 19 Failed: Status ${step19.statusCode}`);
  const loggedOutCookie = extractCookie(step19.headers);
  console.log('   ✓ Logout endpoint returned 200 OK with clearing cookie:', loggedOutCookie);

  // Check /api/auth/me is now unauthorized
  const postLogout = await request('/api/auth/me', {
    headers: { Cookie: loggedOutCookie || 'auth_token=' },
  });
  if (postLogout.statusCode !== 401) {
    throw new Error(`Step 19 Failed: Expected 401 Unauthorized after logout, got ${postLogout.statusCode}`);
  }
  console.log('   ✓ Verified: /api/auth/me returns 401 Unauthorized after logout.');

  // Cleanup test user from MongoDB Atlas
  await db.collection('users').deleteOne({ _id: new ObjectId(userId) });
  console.log('\n[Cleanup] Test user removed from MongoDB Atlas.');
  await mongoClient.close();

  console.log('\n====================================================');
  console.log('>>> COMPLETE 19-STEP USER FLOW PASSED 100%! <<<');
  console.log('====================================================\n');
}

run().catch((err) => {
  console.error('\nE2E VERIFICATION FAILED:', err);
  process.exit(1);
});
