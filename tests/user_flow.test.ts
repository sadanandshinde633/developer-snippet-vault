import { describe, it, expect, beforeEach } from 'vitest';
import {
  createUser,
  findUserByEmail,
  createSnippet,
  findSnippetById,
  findSnippets,
  updateSnippet,
  deleteSnippet,
  resetMemoryDb,
} from '../src/lib/db';
import { hashPassword, verifyPassword, signToken, verifyToken } from '../src/lib/auth';
import { analyzeCodeWithGemini } from '../src/lib/gemini';

describe('Complete Real User Flow & Security Verification (Section 19)', () => {
  beforeEach(() => {
    resetMemoryDb();
  });

  it('Test 1 — New User Full Lifecycle Flow', async () => {
    // 1. Sign Up
    const email = 'newuser@developer.io';
    const rawPass = 'SecretPass123!';
    const passwordHash = await hashPassword(rawPass);
    const user = await createUser({
      email,
      name: 'Sarah Connor',
      passwordHash,
    });
    expect(user._id).toBeDefined();
    expect(user.email).toBe(email);

    // 2. Login
    const foundUser = await findUserByEmail(email);
    expect(foundUser).not.toBeNull();
    expect(foundUser!.passwordHash).toBeDefined();
    const isPasswordValid = await verifyPassword(rawPass, foundUser!.passwordHash!);
    expect(isPasswordValid).toBe(true);

    const token = signToken({ id: foundUser!._id, email: foundUser!.email, name: foundUser!.name });
    const session = verifyToken(token);
    expect(session?.id).toBe(foundUser!._id);

    // 3. Dashboard: initially empty
    const initialSnippets = await findSnippets({ userId: foundUser!._id });
    expect(initialSnippets.length).toBe(0);

    // 4. Create JavaScript snippet with Gemini AI analysis
    const sampleJs = `
      async function fetchProfile(userId) {
        const response = await fetch('/api/users/' + userId);
        return await response.json();
      }
    `;
    const ai = await analyzeCodeWithGemini(sampleJs, 'javascript');
    expect(ai.tags.length).toBeGreaterThanOrEqual(3);
    expect(ai.summary.length).toBeGreaterThan(10);

    const snippet = await createSnippet({
      userId: foundUser!._id,
      title: 'Fetch User Profile Async',
      code: sampleJs,
      language: 'javascript',
      tags: ai.tags,
      summary: ai.summary,
      isPublic: false,
    });

    // 5. Verify Document Stored
    expect(snippet.id).toBeDefined();
    expect(snippet.userId).toBe(foundUser!._id);
    expect(snippet.tags).toEqual(ai.tags);
    expect(snippet.summary).toEqual(ai.summary);

    // 6. Refresh simulation: fetch by ID and fetch list
    const refreshedDoc = await findSnippetById(snippet.id, foundUser!._id);
    expect(refreshedDoc).not.toBeNull();
    expect(refreshedDoc?.title).toBe('Fetch User Profile Async');

    const vaultList = await findSnippets({ userId: foundUser!._id });
    expect(vaultList.length).toBe(1);

    // 7. Edit Snippet
    const updated = await updateSnippet(snippet.id, foundUser!._id, {
      title: 'Fetch User Profile Async (V2 with Error Handling)',
      summary: 'Enhanced async routine fetching profile details with robust error handling.',
    });
    expect(updated).not.toBeNull();
    expect(updated?.title).toBe('Fetch User Profile Async (V2 with Error Handling)');

    // 8. Refresh verify update
    const verifyUpdated = await findSnippetById(snippet.id, foundUser!._id);
    expect(verifyUpdated?.title).toBe('Fetch User Profile Async (V2 with Error Handling)');

    // 9. Delete snippet
    const deleted = await deleteSnippet(snippet.id, foundUser!._id);
    expect(deleted).toBe(true);

    // 10. Refresh verify it is gone
    const verifyGone = await findSnippetById(snippet.id, foundUser!._id);
    expect(verifyGone).toBeNull();
    const emptyList = await findSnippets({ userId: foundUser!._id });
    expect(emptyList.length).toBe(0);
  });

  it('Test 2 — Two Users Isolation & IDOR Attack Prevention', async () => {
    // Create User A
    const userA = await createUser({
      email: 'usera@company.internal',
      name: 'User A',
      passwordHash: await hashPassword('passA123'),
    });

    // Create User B
    const userB = await createUser({
      email: 'userb@company.internal',
      name: 'User B',
      passwordHash: await hashPassword('passB123'),
    });

    // User A creates private snippet
    const snippetA = await createSnippet({
      userId: userA._id,
      title: 'Internal Confidential API Key Rotation',
      code: 'const SECRET_KEY = "company_confidential_key";',
      language: 'javascript',
      tags: ['#security', '#secrets'],
      summary: 'Confidential API rotation helper.',
      isPublic: false,
    });

    // Login as User B
    // Verify User B cannot see User A snippet in dashboard list
    const userBVault = await findSnippets({ userId: userB._id });
    expect(userBVault.some((s) => s.id === snippetA.id)).toBe(false);

    // Attempt direct URL/ID access as User B
    const directAccess = await findSnippetById(snippetA.id, userB._id);
    expect(directAccess).toBeNull();

    // Attempt direct update as User B (IDOR)
    const attackUpdate = await updateSnippet(snippetA.id, userB._id, {
      title: 'Compromised by User B',
    });
    expect(attackUpdate).toBeNull();

    // Attempt direct delete as User B (IDOR)
    const attackDelete = await deleteSnippet(snippetA.id, userB._id);
    expect(attackDelete).toBe(false);

    // Verify User A snippet is completely untouched
    const intact = await findSnippetById(snippetA.id, userA._id);
    expect(intact).not.toBeNull();
    expect(intact?.title).toBe('Internal Confidential API Key Rotation');
  });

  it('Test 3 — Gemini Failure & Resilient Fallback', async () => {
    // Test with missing/empty API key
    const oldKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    try {
      const code = 'SELECT * FROM users WHERE active = 1;';
      const result = await analyzeCodeWithGemini(code, 'sql');

      expect(result).toBeDefined();
      expect(result.tags.length).toBeGreaterThanOrEqual(3);
      expect(result.tags).toContain('#sql');
      expect(result.summary).toBeTruthy();
      expect(result.source).toBe('heuristic-fallback');

      // Database is not corrupted and snippet can be saved cleanly
      const snippet = await createSnippet({
        userId: 'fallback_test_user',
        title: 'SQL Fallback Test',
        code,
        language: 'sql',
        tags: result.tags,
        summary: result.summary,
      });

      expect(snippet.id).toBeDefined();
      expect(snippet.tags).toContain('#sql');
    } finally {
      if (oldKey) process.env.GEMINI_API_KEY = oldKey;
    }
  });

  it('Test 4 — Mobile Viewport Data Contract & Validation', async () => {
    // Long snippet text that must not break mobile formatting
    const longTitle = 'A'.repeat(150);
    const multilineCode = 'line\n'.repeat(50);

    const user = await createUser({
      email: 'mobile@dev.io',
      passwordHash: await hashPassword('mobile123'),
    });

    const snippet = await createSnippet({
      userId: user._id,
      title: longTitle,
      code: multilineCode,
      language: 'javascript',
      tags: ['#mobile', '#responsive', '#test'],
      summary: 'Long format snippet tested for small viewports.',
    });

    const fetched = await findSnippetById(snippet.id, user._id);
    expect(fetched).not.toBeNull();
    expect(fetched?.title.length).toBe(150);
    expect(fetched?.code.split('\n').length).toBe(50);
  });
});
