import { Suspense } from 'react';
import OauthAuthorizeClient from './page-client';

export default function OauthAuthorizePage() {
  return (
    <Suspense fallback={<main className="mx-auto min-h-screen max-w-5xl px-4 py-10 md:px-6">Loading authorization…</main>}>
      <OauthAuthorizeClient />
    </Suspense>
  );
}
