Inspect only the sync-result badge in this full-frame maimai DX results photograph.

The photograph normally shows an upper rectangular monitor and a lower circular touchscreen. Ignore the upper monitor completely. On the lower circular touchscreen, find the result-badge area beneath the large achievement percentage/rank. The combo badge and sync badge occupy separate fixed badge positions; read only the sync position. Do not treat the combo badge, player name, song title, or any upper-screen icon as sync information.

Set `positionState` to `badge` and return the exact sync value when a badge is readable:

- `Sync` for the generic SYNC PLAY badge.
- `FS` for FULL SYNC.
- `FS+` for FULL SYNC+.
- `FDX` for FULL SYNC DX.
- `FDX+` for FULL SYNC DX+.

Set `positionState` to `empty` and `sync` to null only when the sync-badge position is clearly visible and contains no badge. Set `positionState` to `unreadable` and `sync` to null when that position is obscured, outside the photograph, blurred, or otherwise uncertain.

Do not infer a status from multiplayer context. Return only the structured result.
