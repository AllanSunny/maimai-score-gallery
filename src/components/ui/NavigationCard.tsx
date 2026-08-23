interface NavigationCardProps {
  href: string;
  title: string;
  description: string;
}

export function NavigationCard({ href, title, description }: NavigationCardProps) {
  return (
    <a
      href={href}
      className="group flex min-h-48 flex-col justify-between rounded-2xl border border-line bg-white/50 p-6 transition hover:-translate-y-0.5 hover:border-muted/50 hover:bg-white"
    >
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <p className="mt-3 max-w-sm text-sm leading-6 text-lightest">{description}</p>
      </div>
      <span className="mt-8 text-sm font-medium text-coral group-hover:translate-x-1 transition-transform">
        View {title.toLowerCase()} →
      </span>
    </a>
  );
}
