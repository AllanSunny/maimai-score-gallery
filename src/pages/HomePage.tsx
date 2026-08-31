import { NavigationCard } from "../components/ui/NavigationCard";
import { appHref } from "../utils/navigation";

const destinations = [
  {
    href: appHref("/about"),
    title: "About this gallery",
    description: "Why I made this score archive and what I hope to preserve with it.",
  },
  {
    href: appHref("/top-50"),
    title: "Top 50",
    description: "A showcase of the fifty charts that currently make up my best rating collection.",
  },
  {
    href: appHref("/scores"),
    title: "Score list",
    description: "A searchable archive of my recorded plays, organized by song and chart.",
  },
];

export function HomePage() {
  return (
    <div>
      <section className="max-w-2xl">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-coral">Personal tracker</p>
        <h1 className="text-5xl font-semibold leading-tight tracking-tight sm:text-6xl">maimai score gallery</h1>
        <p className="mt-6 text-lg leading-8 text-lightest">
          A quiet record of my maimai progress—from current stats to favorite scores and every play in between.
        </p>
      </section>

      <section aria-label="Explore the gallery" className="mt-14 grid gap-4 md:grid-cols-3">
        {destinations.map((destination) => <NavigationCard key={destination.href} {...destination} />)}
      </section>
    </div>
  );
}
