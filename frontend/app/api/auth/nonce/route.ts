import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const session = req.nextUrl.searchParams.get('session');
  const wallet = req.nextUrl.searchParams.get('wallet');
  const url = new URL(`${process.env.BACKEND_BASE_URL}/auth/nonce`);
  if (session) url.searchParams.set('session', session);
  if (wallet) url.searchParams.set('wallet', wallet);
  const res = await fetch(url, {
    cache: 'no-store',
    headers: { Authorization: `Bearer ${process.env.BACKEND_AUTH_TOKEN}` },
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
