interface PageHeadingProps {
  eyebrow?: string;
  title: string;
  description: string;
}

export function PageHeading({ eyebrow, title, description }: PageHeadingProps) {
  return (
    <header className="max-w-2xl">
      {eyebrow && <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-coral">{eyebrow}</p>}
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
      <p className="mt-5 text-lightest leading-7 text-lightest">{description}</p>
    </header>
  );
}
