import { describe, it, expect } from 'vitest';
import { marked } from 'marked';
import { sanitizeHtml } from '../src/lib/sanitize';
import { createSnippet, findSnippetById, updateSnippet, deleteSnippet, resetMemoryDb } from '../src/lib/db';

describe('Security, XSS Sanitization & IDOR Audit Suite', () => {
  it('should strip malicious script tags, onerror vectors, and javascript: links from markdown HTML', () => {
    const maliciousPayload =
      '# Developer Notes\n' +
      '<script>alert("XSS-ATTACK");</script>\n' +
      '<img src="invalid.jpg" onerror="alert(\'IMAGE-XSS\')" />\n' +
      '<a href="javascript:alert(\'LINK-XSS\')">Click for prize</a>\n' +
      'Normal documentation text.';

    const rawHtml = marked.parse(maliciousPayload, { async: false }) as string;
    const sanitized = sanitizeHtml(rawHtml);

    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('onerror');
    expect(sanitized).not.toContain('javascript:alert');
    expect(sanitized).toContain('Developer Notes');
    expect(sanitized).toContain('Normal documentation text');
  });

  it('should safely store and retrieve code containing SQL injection without executing or corrupting data', async () => {
    resetMemoryDb();
    const maliciousSql = "SELECT * FROM users WHERE email = 'admin' OR 1=1; DROP TABLE users; --";

    const snippet = await createSnippet({
      userId: 'test_user_sql',
      title: 'SQL Injection Defense Example',
      code: maliciousSql,
      language: 'sql',
      tags: ['#sql', '#security', '#injection-defense'],
      summary: 'Demonstration of raw SQL injection payload.',
      isPublic: false,
    });

    expect(snippet.code).toBe(maliciousSql);

    const fetched = await findSnippetById(snippet.id, 'test_user_sql');
    expect(fetched?.code).toBe(maliciousSql);
  });

  it('should prevent IDOR: user cannot edit or delete another user snippet even if ID is known', async () => {
    resetMemoryDb();

    // Owner creates snippet
    const snippet = await createSnippet({
      userId: 'victim_user_123',
      title: 'Victim Secret Snippet',
      code: 'const token = "sensitive_data";',
      language: 'javascript',
      tags: ['#secrets'],
      isPublic: false,
    });

    // Attacker tries to read
    const readAttempt = await findSnippetById(snippet.id, 'attacker_user_456');
    expect(readAttempt).toBeNull();

    // Attacker tries to update
    const updateAttempt = await updateSnippet(snippet.id, 'attacker_user_456', {
      title: 'Attacker Tampered This',
    });
    expect(updateAttempt).toBeNull();

    // Attacker tries to delete
    const deleteAttempt = await deleteSnippet(snippet.id, 'attacker_user_456');
    expect(deleteAttempt).toBe(false);

    // Verify original snippet remains intact for victim
    const intact = await findSnippetById(snippet.id, 'victim_user_123');
    expect(intact).not.toBeNull();
    expect(intact?.title).toBe('Victim Secret Snippet');
  });
});
