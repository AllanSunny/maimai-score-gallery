# Allan's maimai score gallery
Welcome to a result of my latest rhythm game obsession! 

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
updates to a document tracking points where I made major decisions.](docs/decisions-summary.md)

This is entirely a fan project and has no affiliation with SEGA.

## So what is a maimai, anyway?

Maimai (typically stylized all lowercase), or its current version, maimai DX, is one of SEGA's most well-known arcade 
rhythm games! Since its 2012 launch in Japan, it has gained popularity across southeast Asia, Australia, China, and 
as of 2025, the US! The cabinets feature circular touchscreens with 8 buttons around the edges, [appearing very much 
like washing machines](https://en.wikipedia.org/wiki/Maimai_%28video_game_series%29#/media/File:Maimai_DX_CiRCLE_PLUS_cabinet,_Philippines.png). 

### Core Mechanics

The objective is like any other rhythm game: tap the buttons to the beat when the notes fly towards them!
(Touching the edges of the screen near the buttons works as well, which is what I prefer to do.)

What makes maimai really unique for new and veteran rhythm game players alike is the `slide` note, 
a trail of arrows going across the screen that the player must trace their hand over, in varying combinations of 
formations and timing.

Beyond that, the input types are as follows:
- Tap: Pink circles that fly towards the buttons, that you tap to the beat.
- Hold: Long pink hexagons that also fly towards the buttons, that you hold down until it ends.
- Slide: Blue/pink star notes that move along a path of blue arrows in time with the music.
- Touch: Blue "closing square" notes that you tap on the screen when the quadrants come together. 
  - A variation of this is the touch hold, which appears as a multicolored rotated square and functions exactly as the name suggests.
- Break: Orange variations of notes that are weighted more heavily in scoring.

Yellow variations of the above notes (except break notes) mean that they happen at the same timing as other yellow notes.

[Here's a video of me doing all this in action!](https://drive.google.com/file/d/1CmaGTflL799vyfBifZg_duljNs1ECwYh/view?usp=sharing) 
Of course, I've also recorded the corresponding play [here](https://allansunny.github.io/maimai-score-gallery/charts/song-a7a461d9d280-dx-master#UyxstW7KkMmCHUym14wI8jR1NHKlU1Pc7hDBGVpuftA).

Each song has at least four difficulty levels: `BASIC`, `ADVANCED`, `EXPERT`, and `MASTER`. Each difficulty has its
own `chart`, which is the pattern of notes you tap, hold, or slide along with the music. Expert and
master charts are where the bulk of the difficulty and the game's content lie for repeat players, while Basic and
Advanced charts are meant to help newer players ease into the game while still enjoying themselves.

Some songs also feature an extra `Re:MASTER` level, which is a different interpretation of a song with
Master-level difficulty, often harder than the original Master chart, but sometimes easier.

Every set of charts has one or both of a `deluxe` (written in Japanese as `でらっくす`, shown in this app as `DX`) or `standard` 
(written in Japanese as `スタンダード`, shown in this app as `STD`) classification. This is used to identify charts that came before 
or after the game's hardware upgrade in 2019 that also introduced touch notes, which is where the DX in maimai DX comes from. 
Some older songs will have charts with both classifications!

Every chart is rated with a numerical level from 1 to 15 representing its difficulty, with 15 being the hardest. The 
difficulty is exponential, so a 14 will be *significantly* harder than a 12. Every chart also has an internal 
`chart constant`, a decimal rating that compares charts within the level. A value of `.6` and above is represented with 
a + sign on the level in game, indicating its increased difficulty. The chart constants themselves are not usually 
exposed to the players, and are instead sourced using calculations on player rating. For this app, chart constant 
data is graciously sourced from [zetaraku's arcade-songs-fetch repo](https://github.com/zetaraku/arcade-songs-fetch) when available.

You may have noticed that the cabinet has two screens attached to each other. This is also intentional, and 
the other aspect that makes maimai unique! The game actively encourages two players to join in on a session 
at the same time. In fact, only one session can be running at a time, regardless of whether both sides of the 
cabinet have a player or not. The game has some achievements specifically tied to clear conditions in 2-player 
mode, to further encourage partnering up with friends or strangers.

### What does this gallery show?

With those mechanics in mind, here are the important parts of score breakdowns from a song that will be shown on this gallery.

Each score page represents a specific chart for a song. At the top is its summary, which shows:
- Song title
- Song artist
- Cover art
- Difficulty and corresponding level rating
- Summary of the best achievement percentage, rank, combo status, sync status across all play history records
  - Each value can be from independent plays, but rank will always follow percentage
- When available, amount of player rating the best achievement percentage is worth [calculation here](src/utils/rating.ts).

Each play history record on a song shows:
- Achievement: A 4-decimal place percentage value from 0 to 101.0000%. This is the primary score of any play.
- Ranking: Letter values denoting the achievement bracket. SSS+ is the highest, requiring a percentage of 100.5000% and above. The brackets are defined [here](src/utils/rank.ts).
- Judgements: Totals of each note's possible judgement values `(critical perfect, perfect, great, good, miss)`. When available, totals are also broken down by note type and fast/slow counts.
- Combo status: Status symbols for judgement achievements as follows-
  - Full Combo (FC): No missed notes
  - Full Combo+ (FC+): No misses, and no goods
  - All Perfect (AP): All perfects and critical perfects
  - All Perfect+ (AP+): All perfects and critical perfects, as well as all critical perfects on break notes
- Sync status: Status symbols for playing or achieving combo symbols at the same time as the other player-
  - Sync Play: Played the chart with someone else
  - Full Sync (FS): Both players get at least a full combo, while you play on a higher difficulty than the other player
  - Full Sync+ (FS+): Both players get at least a full combo on the same difficulty, or they full combo on a higher difficulty
  - Full Sync DX (FDX): Both players get at least a full combo + on the same difficulty
  - Full Sync DX+ (FDX+): Both players get an all perfect on the same difficulty
- Player rating: At any given point in time, a number calculated based on your current top 50 scores according to achievement rank and chart constant
- Timestamp the originating photo was taken, in US Eastern Time

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
   - Any failures are also tracked in a separate page on the same Google sheet for manual review, and retried later once marked corrected. Notifications about failures are sent to a Discord webhook (`DISCORD_WEBHOOK_URL`) in a private server of mine, since I check notifications there most frequently.
5. From that same sheet, score records are archived into [JSON files](src/data/scores) that are read by the app.
   - For songs that do not yet exist in the [generated catalog](src/data/generated-catalog.json) or any [manual overrides](src/data/overrides.json), its information is retrieved and archived from a SEGA endpoint (set on `SEGA_CATALOG_URL`, currently points to https://maimai.sega.jp/data/maimai_songs.json).
   - Chart constant and chart designer information, if available, is fetched from arcade-songs-fetch.
6. New scores are validated and chart "best of" summaries are updated where needed.

## More Info

- More detailed architecture information is [here](docs/data-model.md).
- The deeper technical details of the workflows I've been using in this project are [here](docs/operations.md).
