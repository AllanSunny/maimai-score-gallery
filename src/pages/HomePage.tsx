import { NavigationCard } from "../components/ui/NavigationCard";
import { PageHeading } from "../components/ui/PageHeading";
import { appHref } from "../utils/navigation";

const destinations = [
  {
    href: appHref("/about"),
    title: "About",
    description: "An explanation of what maimai is and what you'll find in this gallery.",
    accentClassName: "border-basic",
  },
  {
    href: appHref("/top-50"),
    title: "Top 50",
    description: "A showcase of the 50 charts that currently make up my player rating in-game.",
    accentClassName: "border-advanced",
  },
  {
    href: appHref("/scores"),
    title: "Song list",
    description: "A searchable archive of my recorded plays, organized by song.",
    accentClassName: "border-expert",
  },
];

export function HomePage() {
  return (
    <div>
      <PageHeading
        title="Allan's maimai score gallery"
        description="Welcome to a result of my latest rhythm game obsession! This is a showcase of my maimai score milestones and the progress behind them, from my current B50 to every recorded play."
      />

      <section aria-label="Explore the gallery" className="mt-9 md:mt-14 grid gap-4 md:grid-cols-3">
        {destinations.map((destination) => (
          <NavigationCard
            key={destination.href}
            href={destination.href}
            accentClassName={destination.accentClassName}
            className="flex flex-col justify-between p-6"
          >
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-primary">{destination.title}</h2>
              <p className="mt-3 text-lightest">{destination.description}</p>
            </div>
            <span className="mt-8 text-sm text-primary underline decoration-primary/50">
              View {destination.title.toLowerCase()}
            </span>
          </NavigationCard>
        ))}
      </section>
    </div>
  );
}
