import { NextRequest, NextResponse } from 'next/server';
import { findUserByEmail, createUser } from '@/lib/db';
import { hashPassword, signToken, COOKIE_NAME } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { provider: string } }
) {
  const { provider } = params;
  const baseUrl = req.nextUrl.origin;
  const code = req.nextUrl.searchParams.get('code');
  const errorParam = req.nextUrl.searchParams.get('error');

  if (errorParam || !code) {
    console.error(`OAuth error from ${provider}:`, errorParam || 'No code provided');
    return NextResponse.redirect(`${baseUrl}/login?error=oauth_denied`);
  }

  try {
    let email = '';
    let name = '';

    // ===================================
    // 1. GITHUB OAUTH CALLBACK
    // ===================================
    if (provider === 'github') {
      const clientId = process.env.GITHUB_CLIENT_ID;
      const clientSecret = process.env.GITHUB_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        return NextResponse.redirect(`${baseUrl}/login?oauth_notice=github_unconfigured`);
      }

      // Exchange code for access token
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
        console.error('GitHub token exchange error:', tokenData);
        return NextResponse.redirect(`${baseUrl}/login?error=token_exchange_failed`);
      }

      // Fetch user profile
      const userRes = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          'User-Agent': 'SnippetVault-App',
        },
      });
      const userData = await userRes.json();
      name = userData.name || userData.login || 'GitHub Developer';
      email = userData.email;

      // If email is private on GitHub, fetch user emails
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
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        return NextResponse.redirect(`${baseUrl}/login?oauth_notice=google_unconfigured`);
      }

      const redirectUri = `${baseUrl}/api/auth/oauth/google/callback`;

      // Exchange code for access token
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
        console.error('Google token exchange error:', tokenData);
        return NextResponse.redirect(`${baseUrl}/login?error=token_exchange_failed`);
      }

      // Fetch user info
      const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const userInfo = await userInfoRes.json();
      email = userInfo.email;
      name = userInfo.name || 'Google Developer';

      if (!email) {
        return NextResponse.redirect(`${baseUrl}/login?error=email_not_accessible`);
      }
    } else {
      return NextResponse.redirect(`${baseUrl}/login?error=invalid_provider`);
    }

    // ===================================
    // 3. PERSIST OR FIND USER IN MONGODB
    // ===================================
    let user = await findUserByEmail(email);

    if (!user) {
      // Create user with a generated password hash
      const randomPassword = `oauth_${Math.random().toString(36).slice(2)}_${Date.now()}`;
      const passwordHash = await hashPassword(randomPassword);

      user = await createUser({
        email,
        name,
        passwordHash,
      });
    }

    // ===================================
    // 4. SIGN SESSION JWT AND SET COOKIE
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
  } catch (error) {
    console.error(`OAuth callback handler error for ${provider}:`, error);
    return NextResponse.redirect(`${baseUrl}/login?error=oauth_internal_error`);
  }
}
