import { NextRequest } from 'next/server';
import { GET as handleOAuthInit } from '../src/app/api/auth/oauth/[provider]/route';
import { GET as handleOAuthCallback } from '../src/app/api/auth/oauth/[provider]/callback/route';

async function testRoutes() {
  console.log('>>> Testing OAuth Route Handlers & URL Construction <<<\n');

  // Test 1: Unconfigured GitHub redirects to login with notice
  const prevGithubId = process.env.GITHUB_CLIENT_ID;
  delete process.env.GITHUB_CLIENT_ID;

  const req1 = new NextRequest('http://localhost:3000/api/auth/oauth/github');
  const res1 = await handleOAuthInit(req1, { params: { provider: 'github' } });
  const loc1 = res1.headers.get('location');
  console.log('1. Unconfigured GitHub redirect:', loc1);
  if (!loc1?.includes('oauth_notice=github_unconfigured')) {
    throw new Error('Expected redirect to login?oauth_notice=github_unconfigured');
  }

  // Test 2: Configured GitHub constructs official GitHub authorization URL
  process.env.GITHUB_CLIENT_ID = 'test-github-client-id-12345';
  const req2 = new NextRequest('http://localhost:3000/api/auth/oauth/github');
  const res2 = await handleOAuthInit(req2, { params: { provider: 'github' } });
  const loc2 = res2.headers.get('location');
  console.log('2. Configured GitHub authorization URL:', loc2);
  if (
    !loc2?.startsWith('https://github.com/login/oauth/authorize') ||
    !loc2?.includes('client_id=test-github-client-id-12345') ||
    !loc2?.includes('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Fauth%2Foauth%2Fgithub%2Fcallback')
  ) {
    throw new Error('GitHub authorization URL malformed!');
  }

  // Test 3: Unconfigured Google redirects to login with notice
  const prevGoogleId = process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_ID;

  const req3 = new NextRequest('http://localhost:3000/api/auth/oauth/google');
  const res3 = await handleOAuthInit(req3, { params: { provider: 'google' } });
  const loc3 = res3.headers.get('location');
  console.log('3. Unconfigured Google redirect:', loc3);
  if (!loc3?.includes('oauth_notice=google_unconfigured')) {
    throw new Error('Expected redirect to login?oauth_notice=google_unconfigured');
  }

  // Test 4: Configured Google constructs official Google OAuth URL
  process.env.GOOGLE_CLIENT_ID = 'test-google-client-id-67890.apps.googleusercontent.com';
  const req4 = new NextRequest('http://localhost:3000/api/auth/oauth/google');
  const res4 = await handleOAuthInit(req4, { params: { provider: 'google' } });
  const loc4 = res4.headers.get('location');
  console.log('4. Configured Google authorization URL:', loc4);
  if (
    !loc4?.startsWith('https://accounts.google.com/o/oauth2/v2/auth') ||
    !loc4?.includes('client_id=test-google-client-id-67890.apps.googleusercontent.com') ||
    !loc4?.includes('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Fauth%2Foauth%2Fgoogle%2Fcallback') ||
    !loc4?.includes('response_type=code')
  ) {
    throw new Error('Google authorization URL malformed!');
  }

  // Test 5: Cancellation on provider redirects back cleanly
  const req5 = new NextRequest('http://localhost:3000/api/auth/oauth/github/callback?error=access_denied');
  const res5 = await handleOAuthCallback(req5, { params: { provider: 'github' } });
  const loc5 = res5.headers.get('location');
  console.log('5. User cancellation redirect:', loc5);
  if (!loc5?.includes('notice=oauth_cancelled')) {
    throw new Error('Expected cancellation to redirect to notice=oauth_cancelled');
  }

  // Test 6: Production Vercel request with x-forwarded-host derives canonical alias even when VERCEL_URL is set
  process.env.VERCEL_URL = 'developer-snippet-vault-2hugvcyub-sadanand.vercel.app';
  const req6 = new NextRequest('https://developer-snippet-vault-gold.vercel.app/api/auth/oauth/google', {
    headers: {
      'x-forwarded-host': 'developer-snippet-vault-gold.vercel.app',
      'x-forwarded-proto': 'https',
    },
  });
  const res6 = await handleOAuthInit(req6, { params: { provider: 'google' } });
  const loc6 = res6.headers.get('location');
  console.log('6. Vercel production redirect URI:', loc6);
  if (
    !loc6?.includes(
      'redirect_uri=https%3A%2F%2Fdeveloper-snippet-vault-gold.vercel.app%2Fapi%2Fauth%2Foauth%2Fgoogle%2Fcallback'
    )
  ) {
    throw new Error('Vercel production redirect URI did not match custom alias!');
  }
  delete process.env.VERCEL_URL;

  // Restore env
  if (prevGithubId) process.env.GITHUB_CLIENT_ID = prevGithubId;
  else delete process.env.GITHUB_CLIENT_ID;
  if (prevGoogleId) process.env.GOOGLE_CLIENT_ID = prevGoogleId;
  else delete process.env.GOOGLE_CLIENT_ID;

  console.log('\n>>> ALL OAUTH ROUTE TESTS PASSED 100%! <<<\n');
}

testRoutes().catch((err) => {
  console.error('OAUTH ROUTE TEST FAILED:', err);
  process.exit(1);
});
