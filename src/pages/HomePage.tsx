import { NavigationCard } from "../components/ui/NavigationCard";
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
      <section className="">
        <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">Allan's maimai score gallery</h1>
        <p className="mt-4 text-base text-lightest">
          Welcome to a result of my latest rhythm game obsession! This is a showcase of my maimai score milestones and the progress behind them,
          from my current B50 to every recorded play.
        </p>
      </section>

      <section aria-label="Explore the gallery" className="mt-16 grid gap-4 md:grid-cols-3">
        {destinations.map((destination) => <NavigationCard key={destination.href} {...destination} />)}
      </section>
    </div>
  );
}
