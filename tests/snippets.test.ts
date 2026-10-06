import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createUser,
  createSnippet,
  findSnippetById,
  findSnippets,
  updateSnippet,
  deleteSnippet,
  resetMemoryDb,
} from '../src/lib/db';
import { hashPassword } from '../src/lib/auth';

describe('MongoDB Snippet CRUD & Strict User Ownership Isolation', () => {
  let userAId: string;
  let userBId: string;
  let snippetAId: string;

  beforeAll(async () => {
    resetMemoryDb();

    // Create User A
    const userA = await createUser({
      email: 'alice@vault.dev',
      name: 'Alice Dev',
      passwordHash: await hashPassword('password123'),
    });
    userAId = userA._id;

    // Create User B
    const userB = await createUser({
      email: 'bob@vault.dev',
      name: 'Bob Dev',
      passwordHash: await hashPassword('password456'),
    });
    userBId = userB._id;
  });

  afterAll(async () => {
    resetMemoryDb();
  });

  it('should create a snippet for User A with AI tags and summary', async () => {
    const snippet = await createSnippet({
      userId: userAId,
      title: 'React Custom Hook for LocalStorage',
      code: 'function useLocalStorage(key, initial) { /* hook */ }',
      language: 'typescript',
      tags: ['#react', '#hooks', '#typescript'],
      summary: 'A custom React hook that synchronizes state with browser localStorage.',
      isPublic: false,
    });

    snippetAId = snippet.id;
    expect(snippet.id).toBeDefined();
    expect(snippet.userId).toBe(userAId);
    expect(snippet.tags).toContain('#react');
    expect(snippet.summary).toBeDefined();
  });

  it('should allow User A to retrieve their own snippet by id', async () => {
    const snippet = await findSnippetById(snippetAId, userAId);
    expect(snippet).not.toBeNull();
    expect(snippet?.id).toBe(snippetAId);
    expect(snippet?.userId).toBe(userAId);
  });

  it('should PREVENT User B from retrieving User A private snippet by id (IDOR Protection)', async () => {
    // User B attempts to access User A's private snippet
    const snippet = await findSnippetById(snippetAId, userBId);
    expect(snippet).toBeNull();
  });

  it('should isolate dashboard lists: User B vault query must NOT return User A snippets', async () => {
    // User B requests their vault
    const userBSnippets = await findSnippets({ userId: userBId });
    const containsUserASnippet = userBSnippets.some((s) => s.id === snippetAId);
    expect(containsUserASnippet).toBe(false);
  });

  it('should PREVENT User B from updating User A snippet (IDOR Protection)', async () => {
    // User B attempts to update User A's snippet
    const updated = await updateSnippet(snippetAId, userBId, {
      title: 'Hacked by User B',
    });

    expect(updated).toBeNull();

    // Verify original title is untouched
    const original = await findSnippetById(snippetAId, userAId);
    expect(original?.title).toBe('React Custom Hook for LocalStorage');
  });

  it('should PREVENT User B from deleting User A snippet (IDOR Protection)', async () => {
    // User B attempts to delete User A's snippet
    const deleted = await deleteSnippet(snippetAId, userBId);
    expect(deleted).toBe(false);

    // Verify snippet still exists for User A
    const original = await findSnippetById(snippetAId, userAId);
    expect(original).not.toBeNull();
  });

  it('should allow User A to update their own snippet', async () => {
    const updated = await updateSnippet(snippetAId, userAId, {
      title: 'Updated React Hook Title',
      summary: 'Updated summary explanation.',
    });

    expect(updated).not.toBeNull();
    expect(updated?.title).toBe('Updated React Hook Title');
    expect(updated?.summary).toBe('Updated summary explanation.');
  });

  it('should allow User A to delete their own snippet', async () => {
    const deleted = await deleteSnippet(snippetAId, userAId);
    expect(deleted).toBe(true);

    const check = await findSnippetById(snippetAId, userAId);
    expect(check).toBeNull();
  });
});
