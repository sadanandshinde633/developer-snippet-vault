import { NextRequest, NextResponse } from 'next/server';
import { getBaseUrl } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { provider: string } }
) {
  const { provider } = params;
  const baseUrl = getBaseUrl(req);

  if (provider === 'github') {
    const clientId = process.env.GITHUB_CLIENT_ID?.trim();
    if (!clientId) {
      return NextResponse.redirect(
        `${baseUrl}/login?oauth_notice=github_unconfigured`
      );
    }
    const redirectUri = `${baseUrl}/api/auth/oauth/github/callback`;
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&scope=user:email`;
    return NextResponse.redirect(githubAuthUrl);
  }

  if (provider === 'google') {
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    if (!clientId) {
      return NextResponse.redirect(
        `${baseUrl}/login?oauth_notice=google_unconfigured`
      );
    }
    const redirectUri = `${baseUrl}/api/auth/oauth/google/callback`;
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=code&scope=openid%20email%20profile&access_type=offline&prompt=consent`;
    return NextResponse.redirect(googleAuthUrl);
  }

  return NextResponse.redirect(`${baseUrl}/login?error=invalid_provider`);
}
