# Allan's maimai score gallery
Welcome to a result of my latest rhythm game obsession! [View the gallery here.](https://allansunny.github.io/maimai-score-gallery/)

This project is meant to be a way for me to showcase my score progressions to friends when I 
say "here's this one chart I've been playing over the course of several months and finally aced 
today."

There are many beautiful fan-created projects out there that already help you with score 
tracking, but many of them are gated behind logins and also include extra helpful features, 
geared for advanced players who are on the grind to improve. This gallery deliberately keeps 
things simple, featuring just score milestones and when they happened, easy for anyone to digest!

I also took this project as an opportunity to get a better understanding of what AI code generation 
is capable of, especially when combined with an emphasis on human context and decision-making
driving the direction of the output. Most of the source code in this repo was generated through Codex, 
with me providing the requirements, context, and architectural decisions informed by my experience as a 
developer. Notable exceptions include the page designs, maimai game assets, and of course, this README 
you're reading right now! [During the development process, I've also generated 
updates to a document tracking points where I made these major decisions.](docs/decisions-summary.md)

This is entirely a fan project and has no affiliation with SEGA.

## So what is a maimai, anyway?

Maimai (typically stylized all lowercase), better known as its current version, maimai DX, is one of SEGA's most well-known arcade 
rhythm games! Since its 2012 launch in Japan, it has gained popularity across southeast Asia, Australia, China, and 
as of 2025, the US! The cabinets feature circular touchscreens with 8 buttons around the edges, [appearing very much 
like washing machines](https://en.wikipedia.org/wiki/Maimai_%28video_game_series%29#/media/File:Maimai_DX_CiRCLE_PLUS_cabinet,_Philippines.png). 

### Core Mechanics

The objective is like any other rhythm game: tap the buttons to the beat when the notes fly towards them!
(Touching the edges of the screen near the buttons works as well, which is what I prefer to do.)

What makes maimai especially unique for new and veteran rhythm game players alike is the `slide` note, a trail 
of arrows going across the screen that the player must trace with their hand in varying formations and timing.

Beyond that, the main input types you'll see referenced throughout the gallery are:

- **Tap / Hold:** Notes you tap or hold at one of the eight buttons.
- **Slide:** Star-shaped notes following a path of arrows you trace across the touchscreen.
- **Touch:** Notes you tap or hold directly on different areas of the touchscreen.
- **Break:** Orange variations of other notes that are weighted more heavily in scoring.

Yellow notes indicate multiple inputs that happen at the same time.

[Here's a video of me doing all this in action!](https://drive.google.com/file/d/1CmaGTflL799vyfBifZg_duljNs1ECwYh/view?usp=sharing) 
Of course, I've also recorded the corresponding score results [here](https://allansunny.github.io/maimai-score-gallery/charts/song-a7a461d9d280-dx-master#UyxstW7KkMmCHUym14wI8jR1NHKlU1Pc7hDBGVpuftA).

### What does this gallery show?

With those mechanics in mind, here are the important parts of a score breakdown you'll see throughout the gallery. 
Further organizational details can be found [here](https://allansunny.github.io/maimai-score-gallery/about#songs-charts-and-scores).

Each score page represents a specific chart for a song. At the top is its summary, which shows:
- Song title
- Song artist
- Cover art
- Difficulty and corresponding level rating
- Summary of the best achievement percentage, rank, combo status, and sync status across all play history records.
  - Each value can be from independent plays, but rank will always follow percentage.
- When available, amount of player rating the best achievement percentage is worth (calculation [here](src/utils/rating.ts)).

Each play history record on a song shows:
- **Achievement:** A 4-decimal place percentage value from 0 to 101.0000%. This is the primary score of any play.
- **Ranking:** Letter values denoting the achievement bracket. SSS+ is the highest, requiring a percentage of 100.5000% and above. The brackets are defined [here](src/utils/rank.ts).
- **Judgements:** Totals of each note's possible judgement values `(critical perfect, perfect, great, good, miss)`. When available, totals are also broken down by note type and fast/slow counts.
- **Combo and sync status:** Status symbols for judgement achievements between one and/or two players, further explained [here](https://allansunny.github.io/maimai-score-gallery/about#combo-achievements).
- **Player rating:** At any given point in time, a number calculated based on your current top 50 scores according to achievement rank and chart constant (more details [here](https://allansunny.github.io/maimai-score-gallery/top-50)).
- Timestamp the originating photo was taken, in US Eastern Time.

## The Workflow

For the sake of keeping iteration quick and flexible as new decision points came up, a lot of the current 
architecture is geared toward my specific needs. Because of that, I've made some tradeoffs that I wouldn't 
necessarily make if I were to scale this up into a full-blown production website. That's a potential project 
for the future!

The primary need behind me starting this project was a struggle for phone storage. The official SEGA 
web portal for maimai only keeps track of judgement breakdowns for the last 50 songs you played, which 
isn't a lot when you look at how many songs and individual scores are in this gallery! I'm a person 
who likes to keep historical records to reminisce on, especially when it comes to rhythm game scores, 
and the quickest way for me to do so was pictures of my results screens after each play. That, unfortunately,
has gotten to a point where it's unsustainable for my phone's storage space. So I decided to start offloading 
these photos to Google Drive. Then I thought, "it could be neat if I could transfer my scores and judgement 
breakdowns to a text form so it's easier to search through them." And that's where the workflow begins. 

The lifecycle of each score is as follows:
1. Each score photo is uploaded to a Google Drive folder from my phone. (This folder is set to the `GOOGLE_DRIVE_FOLDER_ID` variable.)
2. Every week (or manually), a Github action runs that calls on a Google service account to look in said Google Drive folder for new pictures.
3. The pictures are passed to an OpenAI OCR model (configured on `OPENAI_OCR_MODEL`), which is instructed to extract information from the results screen.
4. Based on the results of the OCR parsing:
   - All successfully processed images have their parsed JSON information stored in a Google sheet (`GOOGLE_SPREADSHEET_ID`), uniquely identified by file IDs to avoid future duplicate OCR calls. The files are then renamed by the Google service account to the timestamp associated with the image and the determined title of the song and moved into a subfolder (`GOOGLE_PROCESSED_FOLDER_ID`).
   - Any failures are also tracked in a separate tab on the same Google sheet for manual review, and retried later once marked corrected. Notifications about failures are sent to a Discord webhook (`DISCORD_WEBHOOK_URL`) in a private server of mine, since I check notifications there most frequently.
5. From that same sheet, score records are archived into [JSON files](src/data/scores) that are read by the app.
   - For songs that do not yet exist in the [generated catalog](src/data/generated-catalog.json) or any [manual overrides](src/data/overrides.json), their information is retrieved and archived from a SEGA endpoint (set on `SEGA_CATALOG_URL`, currently points to https://maimai.sega.jp/data/maimai_songs.json).
   - Chart constant and chart designer information, if available, is fetched from arcade-songs-fetch.
6. New scores are validated and chart "best of" summaries are updated where needed.

## More Technical Details

I've split up the deeper details of how everything works into different documents:

- **[Data Model](docs/data-model.md)** — How songs, charts, scores, and other data are structured, related, validated, and stored.
- **[Operations](docs/operations.md)** — How the import pipeline and other workflows operate, including configuration, maintenance, recovery, and deployment.
- **[Decision History](docs/decisions-summary.md)** — A summary of the decisions and tradeoffs that shaped the project as it evolved, including the context I provided while working with Codex.
