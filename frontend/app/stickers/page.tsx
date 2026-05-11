import { SiteShell } from '@/components/SiteShell';
import { SectionLabel, StickerGrid } from '@/components/brutal-ui';

const groups = [
  { title: '01 - CORE MOODS', items: [
    { emoji: '😼', label: 'GM' },
    { emoji: '😺', label: 'MEOW' },
    { emoji: '😭', label: 'REKT' },
    { emoji: '🤨', label: 'HMM' },
  ]},
  { title: '02 - ACTIONS', items: [
    { emoji: '🔥', label: 'FIRE BRO' },
    { emoji: '🐟', label: 'GIB FISH' },
    { emoji: '🚀', label: 'WAGMI' },
    { emoji: '🫠', label: 'NGMI' },
  ]},
  { title: '03 - SPECIAL / SEASONAL', items: [
    { emoji: '🧻', label: 'SHITPOST' },
    { emoji: '🐈', label: 'CAT MODE' },
    { emoji: '🗃️', label: 'LITTERBOX' },
    { emoji: '👑', label: 'UR KING' },
  ]},
];

export default function StickersPage() {
  return (
    <SiteShell>
      <div className="space-y-10">
        <div className="space-y-4">
          <SectionLabel tone="mint">PILEMOJI</SectionLabel>
          <h1 className="display-text text-[clamp(4rem,10vw,7rem)] leading-[0.88] text-fog">PILEMOJI</h1>
          <p className="text-lg uppercase text-fog/80">catshit sticker pack · v1</p>
        </div>
        {groups.map((group, index) => (
          <section key={group.title} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="mono-ui text-sm font-bold uppercase tracking-[0.25em] text-fog/82">{group.title}</div>
              <span className="text-sm opacity-60">🐾</span>
            </div>
            <StickerGrid items={group.items} />
          </section>
        ))}
      </div>
    </SiteShell>
  );
}
