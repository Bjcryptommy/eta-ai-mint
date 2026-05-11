import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get('wallet');
  if (!wallet) return NextResponse.json({ message: 'wallet is required' }, { status: 400 });

  const res = await fetch(`${process.env.BACKEND_BASE_URL}/wallet-status/${wallet}`, {
    headers: { Authorization: `Bearer ${process.env.BACKEND_AUTH_TOKEN}` },
    cache: 'no-store',
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
