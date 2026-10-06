async function testServer() {
  try {
    const res = await fetch('http://localhost:3000');
    console.log('GET / status:', res.status);

    // 1. Register User A
    const regRes = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'http_test_a@dev.io', password: 'password123', name: 'User HTTP A' }),
    });
    console.log('POST /api/auth/register status:', regRes.status);
    const regData = await regRes.json();
    const tokenA = regData.token;
    console.log('User A registered, token received:', !!tokenA);

    // 2. Create Snippet as User A
    const snippetRes = await fetch('http://localhost:3000/api/snippets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + tokenA,
      },
      body: JSON.stringify({
        title: 'HTTP Integration Test Snippet',
        code: 'async function getData() { return await fetch("/api"); }',
        language: 'javascript',
      }),
    });
    console.log('POST /api/snippets status:', snippetRes.status);
    const snippetData = await snippetRes.json();
    console.log('Created Snippet tags:', snippetData.snippet?.tags);
    console.log('Created Snippet summary:', snippetData.snippet?.summary);
    const snippetId = snippetData.snippet?.id;

    // 3. Register User B
    const regBRes = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'http_test_b@dev.io', password: 'password456', name: 'User HTTP B' }),
    });
    const regBData = await regBRes.json();
    const tokenB = regBData.token;

    // 4. User B attempts to access User A's private snippet
    const accessRes = await fetch('http://localhost:3000/api/snippets/' + snippetId, {
      headers: { Authorization: 'Bearer ' + tokenB },
    });
    console.log('User B unauthorized access status (expected 404):', accessRes.status);

    // 5. User B attempts to delete User A's snippet
    const delRes = await fetch('http://localhost:3000/api/snippets/' + snippetId, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer ' + tokenB },
    });
    console.log('User B unauthorized delete status (expected 403):', delRes.status);

    // 6. User A deletes their own snippet
    const delARes = await fetch('http://localhost:3000/api/snippets/' + snippetId, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer ' + tokenA },
    });
    const delAData = await delARes.json();
    console.log('User A authorized delete status (expected 200):', delARes.status, delAData);

    console.log('--- ALL LIVE HTTP TESTS COMPLETED SUCCESSFULLY ---');
  } catch (err) {
    console.error('Test server error:', err.message);
  }
}

testServer();
