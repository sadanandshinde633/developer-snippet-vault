import { NextRequest, NextResponse } from 'next/server';
import { findOrCreateOAuthUser } from '@/lib/db';
import { signToken, COOKIE_NAME, getBaseUrl } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { provider: string } }
) {
  const { provider } = params;
  const baseUrl = getBaseUrl(req);
  const code = req.nextUrl.searchParams.get('code');
  const errorParam = req.nextUrl.searchParams.get('error');

  // Handle user cancelling the OAuth authorization flow on GitHub/Google
  if (errorParam || !code) {
    if (errorParam === 'access_denied') {
      return NextResponse.redirect(`${baseUrl}/login?notice=oauth_cancelled`);
    }
    console.error(`OAuth error parameter from ${provider}:`, errorParam || 'Missing code');
    return NextResponse.redirect(`${baseUrl}/login?error=oauth_failed`);
  }

  try {
    let email = '';
    let name = '';
    let image: string | null = null;
    let providerAccountId = '';

    // ===================================
    // 1. GITHUB OAUTH CALLBACK
    // ===================================
    if (provider === 'github') {
      const clientId = process.env.GITHUB_CLIENT_ID?.trim();
      const clientSecret = process.env.GITHUB_CLIENT_SECRET?.trim();

      if (!clientId || !clientSecret) {
        return NextResponse.redirect(`${baseUrl}/login?oauth_notice=github_unconfigured`);
      }

      // Exchange authorization code for access token
      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
        }),
      });

      const tokenData = await tokenRes.json();
      if (!tokenData.access_token) {
        console.error('GitHub token exchange response error:', tokenData);
        return NextResponse.redirect(`${baseUrl}/login?error=token_exchange_failed`);
      }

      // Fetch user profile from GitHub API
      const userRes = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          'User-Agent': 'SnippetVault-App',
        },
      });
      const userData = await userRes.json();
      name = userData.name || userData.login || 'GitHub Developer';
      email = userData.email;
      image = userData.avatar_url || null;
      providerAccountId = String(userData.id);

      // If user has a private email on GitHub, query their email addresses
      if (!email) {
        const emailsRes = await fetch('https://api.github.com/user/emails', {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            'User-Agent': 'SnippetVault-App',
          },
        });
        const emailsData = await emailsRes.json();
        if (Array.isArray(emailsData)) {
          const primary = emailsData.find((e: any) => e.primary && e.verified) || emailsData[0];
          if (primary) email = primary.email;
        }
      }

      if (!email) {
        return NextResponse.redirect(`${baseUrl}/login?error=email_not_accessible`);
      }
    }

    // ===================================
    // 2. GOOGLE OAUTH CALLBACK
    // ===================================
    else if (provider === 'google') {
      const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

      if (!clientId || !clientSecret) {
        return NextResponse.redirect(`${baseUrl}/login?oauth_notice=google_unconfigured`);
      }

      const redirectUri = `${baseUrl}/api/auth/oauth/google/callback`;

      // Exchange authorization code for access token
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      const tokenData = await tokenRes.json();
      if (!tokenData.access_token) {
        console.error('Google token exchange response error:', tokenData);
        return NextResponse.redirect(`${baseUrl}/login?error=token_exchange_failed`);
      }

      // Fetch user info from Google OAuth API
      const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const userInfo = await userInfoRes.json();
      email = userInfo.email;
      name = userInfo.name || 'Google Developer';
      image = userInfo.picture || null;
      providerAccountId = String(userInfo.id);

      if (!email) {
        return NextResponse.redirect(`${baseUrl}/login?error=email_not_accessible`);
      }
    } else {
      return NextResponse.redirect(`${baseUrl}/login?error=invalid_provider`);
    }

    // ===================================
    // 3. SAFE ACCOUNT LINKING & PERSISTENCE
    // ===================================
    const user = await findOrCreateOAuthUser({
      email,
      name,
      image,
      provider: provider as 'github' | 'google',
      providerAccountId,
    });

    // ===================================
    // 4. SIGN SESSION TOKEN AND SET COOKIE
    // ===================================
    const sessionUser = { id: user._id, email: user.email, name: user.name };
    const token = signToken(sessionUser);

    const response = NextResponse.redirect(`${baseUrl}/`);
    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error: any) {
    console.error(`OAuth callback handler error for ${provider}:`, error);
    const isDbError =
      error?.message?.includes('auth') ||
      error?.message?.includes('Mongo') ||
      error?.name?.includes('Mongo');
    if (isDbError) {
      const cleanMsg = encodeURIComponent(
        error?.message?.includes('bad auth')
          ? 'MongoDB authentication failed. Please verify database username and password in MONGODB_URI.'
          : error?.message || 'Database connection error'
      );
      return NextResponse.redirect(`${baseUrl}/login?error=db_error&details=${cleanMsg}`);
    }
    return NextResponse.redirect(`${baseUrl}/login?error=oauth_internal_error`);
  }
}
