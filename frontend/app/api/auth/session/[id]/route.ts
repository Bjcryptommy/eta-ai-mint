import { NextRequest, NextResponse } from 'next/server';

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const res = await fetch(`${process.env.BACKEND_BASE_URL}/auth/session/${id}`, {
    cache: 'no-store',
    headers: { Authorization: `Bearer ${process.env.BACKEND_AUTH_TOKEN}` },
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
