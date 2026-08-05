import { PageHeading } from "../components/ui/PageHeading";
import { playerProfile } from "../config/profile";

export function ProfilePage() {
  return (
    <div>
      <PageHeading
        eyebrow="Profile summary"
        title="Player profile"
        description="A compact overview of my current maimai identity and progression. Live profile data will be connected here next."
      />

      <section className="mt-12 grid gap-4 rounded-2xl border border-line bg-white/50 p-6 sm:grid-cols-[auto_1fr] sm:p-8">
        <div className="grid size-24 place-items-center rounded-full bg-coral/10 text-2xl font-semibold text-coral">
          {playerProfile.iconUrl ? <img className="size-full rounded-full object-cover" src={playerProfile.iconUrl} alt="Player icon" /> : playerProfile.name.charAt(0)}
        </div>
        <div className="grid gap-6 sm:grid-cols-3 sm:items-center">
          <div><p className="text-xs uppercase tracking-wider text-muted">Player</p><p className="mt-1 text-xl font-semibold">{playerProfile.name}</p></div>
          <div><p className="text-xs uppercase tracking-wider text-muted">Overall rating</p><p className="mt-1 text-xl font-semibold">—</p></div>
          <div><p className="text-xs uppercase tracking-wider text-muted">Current title</p><p className="mt-1 text-xl font-semibold">{playerProfile.title}</p></div>
        </div>
      </section>
    </div>
  );
}
