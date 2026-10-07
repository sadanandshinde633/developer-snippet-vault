import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
import { getDb } from '../src/lib/mongodb';
import { findOrCreateOAuthUser, createSnippet, findSnippets, deleteSnippet } from '../src/lib/db';
import { ObjectId } from 'mongodb';

async function run() {
  console.log('>>> Testing Production OAuth Account Linking & MongoDB Persistence <<<');
  const timestamp = Date.now();
  const email = `oauth_developer_${timestamp}@example.com`;

  // Step 1: User logs in with Google first
  console.log('1. User logging in with Google OAuth for the first time...');
  const googleUser = await findOrCreateOAuthUser({
    email,
    name: 'Sadanand (Google)',
    image: 'https://lh3.googleusercontent.com/test-avatar',
    provider: 'google',
    providerAccountId: 'google-oauth-uid-1001',
  });
  console.log('   ✓ Google user created with ID:', googleUser._id);
  console.log('   ✓ Accounts:', googleUser.accounts);

  if (!googleUser.accounts?.some((a) => a.provider === 'google')) {
    throw new Error('Google provider not recorded in accounts array!');
  }

  // Step 2: User creates a snippet while logged in via Google
  console.log('2. User creates snippet under Google login...');
  const snippet = await createSnippet({
    userId: googleUser._id,
    title: 'Google OAuth Created Snippet',
    code: 'console.log("created via Google login");',
    language: 'javascript',
    tags: ['#oauth', '#google'],
    summary: 'Snippet created while logged in with Google account',
    isPublic: false,
  });
  console.log('   ✓ Snippet created with ID:', snippet.id, 'owned by:', snippet.userId);

  // Step 3: User later clicks "Continue with GitHub" using the SAME email
  console.log('3. User later signs in with GitHub using the SAME email address...');
  const githubUser = await findOrCreateOAuthUser({
    email,
    name: 'Sadanand (GitHub)',
    image: 'https://avatars.githubusercontent.com/test-avatar',
    provider: 'github',
    providerAccountId: 'github-oauth-uid-2002',
  });
  console.log('   ✓ GitHub sign-in resolved user ID:', githubUser._id);

  // Verify Safe Account Linking: ID must match!
  if (githubUser._id !== googleUser._id) {
    throw new Error(`ACCOUNT LINKING FAILED: User ID changed! Expected ${googleUser._id}, got ${githubUser._id}`);
  }
  console.log('   ✓ Confirmed: Account linked to same user ID:', githubUser._id);

  // Step 4: Verify MongoDB document contains BOTH providers
  const db = await getDb();
  const dbUser = await db.collection('users').findOne({ _id: new ObjectId(googleUser._id) });
  if (!dbUser) throw new Error('User not found in MongoDB!');
  const providers = (dbUser.accounts || []).map((a: any) => a.provider);
  console.log('   ✓ Verified MongoDB Atlas accounts:', providers);
  if (!providers.includes('google') || !providers.includes('github')) {
    throw new Error(`Missing linked provider! Found: ${JSON.stringify(providers)}`);
  }

  // Step 5: Verify the snippet created under Google is still fully accessible under GitHub
  console.log('5. Verifying user can access snippets when logged in with linked GitHub account...');
  const userSnippets = await findSnippets({ userId: githubUser._id });
  const hasSnippet = userSnippets.some((s) => s.id === snippet.id);
  if (!hasSnippet) {
    throw new Error('User lost access to snippet after logging in with second OAuth provider!');
  }
  console.log('   ✓ Verified: All saved snippets preserved under linked account.');

  // Clean up
  await deleteSnippet(snippet.id, googleUser._id);
  await db.collection('users').deleteOne({ _id: new ObjectId(googleUser._id) });
  console.log('   ✓ Cleaned up test document from MongoDB Atlas.');

  console.log('\n>>> SAFE ACCOUNT LINKING & OAUTH PERSISTENCE PASSED 100%! <<<\n');
}

run().catch((err) => {
  console.error('OAUTH ACCOUNT LINKING TEST FAILED:', err);
  process.exit(1);
});
