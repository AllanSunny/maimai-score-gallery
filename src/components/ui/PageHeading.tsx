interface PageHeadingProps {
  id?: string;
  title: string;
  description: string;
}

export function PageHeading({ id, title, description }: PageHeadingProps) {
  return (
    <header>
      <h1 id={id} className="scroll-mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
      <p className="mt-5 text-lightest">{description}</p>
    </header>
  );
}
