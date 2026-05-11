import { NextResponse } from 'next/server';

export async function GET() {
  const res = await fetch(`${process.env.BACKEND_BASE_URL}/token-info`, {
    headers: { Authorization: `Bearer ${process.env.BACKEND_AUTH_TOKEN}` },
    cache: 'no-store',
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
