import { HomeClient } from '@/components/HomeClient';
import { SiteShell } from '@/components/SiteShell';
import { getServerTokenInfo } from '@/lib/server-api';

export default async function Page() {
  const tokenInfo = await getServerTokenInfo();
  return (
    <SiteShell>
      <HomeClient initialTokenInfo={tokenInfo} />
    </SiteShell>
  );
}
