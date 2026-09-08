interface NavigationCardProps {
  href: string;
  title: string;
  description: string;
  accentClassName: string;
}

export function NavigationCard({ href, title, description, accentClassName }: NavigationCardProps) {
  return (
    <a
      href={href}
      className={`group flex min-h-48 flex-col justify-between rounded-lg border-l-4 ${accentClassName} bg-darkest/60 p-6 no-underline ring-1 ring-inset ring-primary/50 transition duration-150 hover:-translate-y-0.5 hover:bg-dark/80 hover:ring-primary/70 hover:shadow-[0_2px_6px_var(--color-darkest)] focus-visible:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`}
    >
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <p className="mt-3 max-w-sm text-lightest">{description}</p>
      </div>
      <span className="mt-8 text-sm underline decoration-primary/50 group-hover:decoration-lightest/50">
        View {title.toLowerCase()}
      </span>
    </a>
  );
}
