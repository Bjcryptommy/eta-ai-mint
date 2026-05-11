import { TokenInfo } from './types';

export async function getServerTokenInfo(): Promise<TokenInfo | null> {
  try {
    const res = await fetch(`${process.env.BACKEND_BASE_URL}/token-info`, {
      headers: { Authorization: `Bearer ${process.env.BACKEND_AUTH_TOKEN}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
