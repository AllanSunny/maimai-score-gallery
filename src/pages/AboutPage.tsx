import { Fragment, type MouseEvent } from "react";
import breakNote from "../assets/notes/break.png";
import holdNote from "../assets/notes/hold.png";
import slideArrow from "../assets/notes/slide-arrow.png";
import slideStar from "../assets/notes/slide-star.png";
import tapNote from "../assets/notes/tap.png";
import touchNote from "../assets/notes/touch.png";
import { ChartTypeIcon } from "../components/chart/ChartTypeIcon";
import { ComboDisplay } from "../components/score/ComboDisplay";
import { SyncDisplay } from "../components/score/SyncDisplay";
import { ContentCard } from "../components/ui/ContentCard";
import { PageHeading } from "../components/ui/PageHeading";
import { navigate } from "../utils/navigation";

const difficulties = [
  { name: "BASIC", color: "basic", description: "A friendly introduction to the song for newer players." },
  { name: "ADVANCED", color: "advanced", description: "A step up that still leaves plenty of room to ease into the game." },
  { name: "EXPERT", color: "expert", description: "Where the bulk of the challenge begins for repeat players." },
  { name: "MASTER", color: "master", description: "The song's main high-difficulty chart." },
  { name: "Re:MASTER", color: "remaster", description: "A different Master-level interpretation of the song that is most often harder." },
];

const comboStatuses = [
  { status: "FC" as const, label: "No missed notes." },
  { status: "FC+" as const, label: "No misses or Goods." },
  { status: "AP" as const, label: "Only Perfects and Critical Perfects." },
  { status: "AP+" as const, label: "An All Perfect with every Break note judged Critical Perfect." },
];

const syncStatuses = [
  { status: "Sync" as const, label: "The chart was played with another person." },
  { status: "FS" as const, label: "Both players earned at least a Full Combo, with this player on the higher difficulty." },
  { status: "FS+" as const, label: "Both earned a Full Combo on the same difficulty, or the other player did so on a higher one." },
  { status: "FDX" as const, label: "Both players earned at least a Full Combo+ on the same difficulty." },
  { status: "FDX+" as const, label: "Both players earned an All Perfect on the same difficulty." },
];

const syncStatusColumns = [syncStatuses.slice(0, 3), syncStatuses.slice(3)];

const noteTypes = [
  {
    name: "Tap / Hold",
    description: "Notes you tap or hold at one of the eight buttons.",
    images: [
      { src: tapNote, className: "h-13" },
      { src: holdNote, className: "h-15" },
    ],
  },
  {
    name: "Slide",
    description: "Star-shaped notes following a path of arrows you trace across the touchscreen.",
    images: [
      { src: slideStar, className: "h-14" },
      { src: slideArrow, className: "h-10" },
    ],
  },
  {
    name: "Touch",
    description: "Notes you tap or hold directly on different areas of the touchscreen.",
    images: [{ src: touchNote, className: "h-12" }],
  },
  {
    name: "Break",
    description: "Orange variations of other notes that are weighted more heavily in scoring.",
    images: [{ src: breakNote, className: "h-13" }],
  },
];

const sectionLinks = [
  { href: "#what-is-maimai", label: "What is maimai?" },
  { href: "#songs-charts-and-scores", label: "Songs, charts, and scores" },
  { href: "#difficulty-levels-and-chart-types", label: "Difficulties and chart types" },
  { href: "#scoring-and-achievements", label: "Scoring and achievements" },
];

function SectionHeading({ id, children }: { id: string; children: string }) {
  return <h2 id={id} className="scroll-mt-6 text-2xl font-semibold tracking-tight sm:text-3xl">{children}</h2>;
}

function navigateToSection(event: MouseEvent<HTMLAnchorElement>, href: string) {
  event.preventDefault();
  navigate(`/about${href}`);
  document.getElementById(href.slice(1))?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

export function AboutPage() {
  return (
    <div>
      <PageHeading
        id="about-this-gallery"
        title="About this gallery"
        description="Never heard of maimai before? Here's a quick guide to the game, how its songs and charts are organized, and what you'll find in this gallery."
      />

      <nav aria-label="On this page" className="mt-6 flex flex-wrap gap-2">
        {sectionLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="btn btn-secondary"
            onClick={(event) => navigateToSection(event, link.href)}
          >
            {link.label}
          </a>
        ))}
      </nav>

      <section className="mt-12">
        <SectionHeading id="what-is-maimai">So what is a maimai?</SectionHeading>
        <ContentCard accentColor="primary" variant="secondary" className="mt-5 p-5 sm:p-7">
          <div className="space-y-4 text-lightest">
            <p>
              <span className="font-semibold text-primary">maimai</span> (typically stylized all lowercase), better known as its
              current version, <span className="font-semibold text-primary">maimai DX</span>, is one of SEGA's best-known arcade
              rhythm games! Its cabinets feature circular touchscreens with eight buttons around the edges,{" "}
              <a
                href="https://en.wikipedia.org/wiki/Maimai_%28video_game_series%29#/media/File:Maimai_DX_CiRCLE_PLUS_cabinet,_Philippines.png"
              >
                making them look quite a bit like washing machines
              </a>.
            </p>
            <p>
              You may have noticed that the cabinet has two screens attached to each other. That's intentional, and it's the other
              big thing that makes maimai unique! The game actively encourages two players to join the same session and even has
              special Sync achievements for clearing charts and earning combos together.
            </p>
          </div>
        </ContentCard>

        <ContentCard accentColor="remaster" variant="secondary" className="mt-5 p-5 sm:p-7">
          <div className="space-y-5 text-lightest">
            <p>
              The objective is like any other rhythm game: tap the buttons to the beat when the notes fly toward them. You can also
              touch the screen near the buttons, which is what I prefer to do. The game's signature input is the star-shaped
              <span className="font-semibold text-primary"> Slide</span> note, which leaves a trail of arrows that you trace across
              the screen.
            </p>

            <p>The main input types you'll see referenced throughout the gallery are:</p>
            <ul className="grid gap-y-5 md:grid-cols-2 md:gap-x-12">
              {noteTypes.map((noteType) => (
                <li key={noteType.name} className="flex items-center gap-6">
                  <span aria-hidden="true" className="flex w-22 shrink-0 items-center justify-center gap-2">
                    {noteType.images.map((image) => (
                      <img key={image.src} src={image.src} alt="" className={`${image.className} max-w-16 object-contain`} />
                    ))}
                  </span>
                  <span>
                    <span className="block font-semibold text-primary">{noteType.name}</span>
                    {noteType.description}
                  </span>
                </li>
              ))}
            </ul>

            <p>Yellow notes indicate multiple inputs that happen at the same time.</p>
            <p>
              <a href="https://drive.google.com/file/d/1CmaGTflL799vyfBifZg_duljNs1ECwYh/view?usp=sharing">
                Here's a video of me doing all this in action!
              </a>{" "}
              Of course, I've also recorded the corresponding score results{" "}
              <a href="https://allansunny.github.io/maimai-score-gallery/charts/song-a7a461d9d280-dx-master#UyxstW7KkMmCHUym14wI8jR1NHKlU1Pc7hDBGVpuftA">
                here
              </a>
              .
            </p>
          </div>
        </ContentCard>
      </section>

      <section className="mt-12">
        <SectionHeading id="songs-charts-and-scores">From a song to a score</SectionHeading>
        <p className="mt-4 text-lightest">
          The easiest way to understand the gallery is as three layers. A <span className="font-semibold text-primary">song</span> is
          the music itself, a <span className="font-semibold text-primary">chart</span> is the pattern of notes you tap, hold, or slide
          along with that music, and a <span className="font-semibold text-primary">score</span> is the result from one time I played
          that chart.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <ContentCard accentColor="advanced" variant="secondary" className="p-5">
            <h3 id="songs" className="scroll-mt-6 font-semibold text-advanced">Song</h3>
            <p className="mt-2 text-lightest">The title, artist, cover art, and every available difficulty are all grouped together.</p>
          </ContentCard>
          <ContentCard accentColor="master" variant="secondary" className="p-5">
            <h3 id="charts" className="scroll-mt-6 font-semibold text-master">Chart</h3>
            <p className="mt-2 text-lightest">You'll see its difficulty, level, chart type, and the best achievement, rating, combo, and sync status I've recorded.</p>
          </ContentCard>
          <ContentCard accentColor="expert" variant="secondary" className="p-5">
            <h3 id="scores" className="scroll-mt-6 font-semibold text-expert">Score</h3>
            <p className="mt-2 text-lightest">Each play shows when it happened, its achievement and rank, rating gain, combo and sync badges, and judgment breakdown.</p>
          </ContentCard>
        </div>
      </section>

      <section className="mt-12">
        <SectionHeading id="difficulty-levels-and-chart-types">Difficulty levels and chart types</SectionHeading>
        <p className="mt-4 text-lightest">
          Every song has at least four difficulty levels: BASIC, ADVANCED, EXPERT, and MASTER. Expert and Master are where the bulk
          of the difficulty and the game's content lie for repeat players, while Basic and Advanced help newer players ease into
          the game while still enjoying themselves. Some songs also have a Re:MASTER difficulty, which is a different Master-level
          interpretation, often harder than the original Master chart, but sometimes easier.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {difficulties.map((difficulty) => (
            <ContentCard key={difficulty.name} accentColor={difficulty.color} variant="secondary" className="p-4">
              <h3 id={`difficulty-${difficulty.color}`} className="scroll-mt-6 font-semibold" style={{ color: `var(--color-${difficulty.color})` }}>{difficulty.name}</h3>
              <p className="mt-2 text-lightest">{difficulty.description}</p>
            </ContentCard>
          ))}
        </div>
        <ContentCard accentColor="primary" variant="secondary" className="mt-5 p-5 sm:p-7">
          <div className="grid gap-12 text-lightest md:grid-cols-2">
            <div>
              <h3 id="deluxe-and-standard-charts" className="scroll-mt-6 font-semibold text-primary">Deluxe and Standard Charts</h3>
              <p className="mt-2">
                Every chart set is classified as <span className="font-semibold text-primary">Deluxe</span> (
                <span className="font-semibold text-primary">DX</span>, shown in this gallery as{" "}
                <ChartTypeIcon chartType="DX" className="inline-block h-4 mx-1 w-auto align-text-bottom" />) or
                <span className="font-semibold text-primary"> Standard</span> (<span className="font-semibold text-primary">STD</span>,
                shown as{" "} <ChartTypeIcon chartType="STD" className="inline-block h-4 mx-1 w-auto align-text-bottom" />).
                スタンダード charts identify sets from before the game's 2019 hardware upgrade, while でらっくす charts use the newer
                format that introduced Touch notes, and is where the DX in maimai DX comes from. Some older songs have both STD and DX chart sets!
              </p>
            </div>
            <div>
              <h3 id="levels-and-chart-constants" className="scroll-mt-6 font-semibold text-primary">Levels and chart constants</h3>
              <p className="mt-2">
                Every chart is rated from 1 to 15, with 15 being the hardest. The difficulty is exponential, so a 14 will be
                <em> significantly</em> harder than a 12. Each chart also has an internal decimal
                <span className="font-semibold text-primary"> chart constant</span> that compares charts within the same level.
                Constants ending in .6 through .9 display with a <span className="font-semibold text-primary">+</span>, so a 12.7
                appears in the game and this gallery as 12+.
              </p>
            </div>
          </div>
        </ContentCard>
      </section>

      <section className="mt-12">
        <SectionHeading id="scoring-and-achievements">Scoring and achievements</SectionHeading>
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <ContentCard accentColor="advanced" variant="secondary" className="p-5 sm:p-7">
            <h3 id="score-values" className="scroll-mt-6 text-xl font-semibold text-advanced">What the numbers mean</h3>
            <div className="mt-4 space-y-3 text-lightest">
              <p><span className="font-semibold text-primary">Achievement</span> is the main score for a play, shown to four decimal places from 0 to 101.0000%.</p>
              <p><span className="font-semibold text-primary">Rank</span> is the letter grade that goes along with that percentage. SSS+ is the highest, requiring 100.5000% or above.</p>
              <p><span className="font-semibold text-primary">Judgments</span> show how many notes were Critical Perfects, Perfects, Greats, Goods, or Misses. You'll also see Fast and Slow timing totals when they're available.</p>
              <p><span className="font-semibold text-primary">Rating</span> is calculated from the achievement and chart constant. The gallery shows what the best score is worth as well as how much my overall player rating changed after each play.</p>
            </div>
          </ContentCard>

          <ContentCard accentColor="expert" variant="secondary" className="p-5 sm:p-7">
            <h3 id="combo-achievements" className="scroll-mt-6 text-xl font-semibold text-expert">Combo achievements</h3>
            <dl className="mt-5 grid grid-cols-[max-content_1fr] items-center gap-x-5 gap-y-4">
              {comboStatuses.map(({ status, label }) => (
                <Fragment key={status}>
                  <dt><ComboDisplay className="max-h-7 object-contain" status={status} size="large" /></dt>
                  <dd className="text-sm leading-6 text-lightest">{label}</dd>
                </Fragment>
              ))}
            </dl>
          </ContentCard>
        </div>

        <ContentCard accentColor="basic" variant="secondary" className="mt-5 p-5 sm:p-7">
          <h3 id="sync-achievements" className="scroll-mt-6 text-xl font-semibold text-basic">Two-player sync achievements</h3>
          <div className="mt-5 grid gap-y-5 md:grid-cols-2 md:gap-x-12">
            {syncStatusColumns.map((column, index) => (
              <dl key={index} className="grid grid-cols-[max-content_1fr] items-center gap-x-5 gap-y-5">
                {column.map(({ status, label }) => (
                  <Fragment key={status}>
                    <dt><SyncDisplay className="max-h-7 object-contain" status={status} size="large" /></dt>
                    <dd className="text-sm leading-6 text-lightest">{label}</dd>
                  </Fragment>
                ))}
              </dl>
            ))}
          </div>
        </ContentCard>
      </section>

      <section className="mt-12 border-t border-lightest pt-8">
        <p className="text-lightest">
          More technical details about this gallery's setup can be found on the{" "}
          <a href="https://github.com/AllanSunny/maimai-score-gallery#readme">
            README
          </a>
          .
        </p>
      </section>
    </div>
  );
}
