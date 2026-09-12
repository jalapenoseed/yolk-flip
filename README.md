# Yolk Flip

Mobile-first frying-pan game. Your phone is the pan. Cook sunny-side, over easy, over medium, or over hard without breaking the yolk.

## Play

Open `index.html` on a phone (Safari or Chrome).

1. Tap **Start Service**
2. Tap **Enable Gyro** and allow motion access (required on iPhone)
3. **Crack Egg**
4. Tilt the phone to slide the egg
5. Flick the phone (or swipe up on the pan, or tap **Flick Flip**) to flip
6. Watch TOP / BOTTOM cook meters
7. **Plate** when the ticket looks right

Desktop fallback: drag the egg around the pan, swipe up to flip.

## Tickets

| Style | Flip | Goal |
|---|---|---|
| Sunny Side Up | 0 | Set the white, liquid yolk |
| Over Easy | 1 gentle | Runny yolk, lightly cooked second side |
| Over Medium | 1 | Jammy center |
| Over Hard | 1 | Yolk set, still intact |

A violent flick, rim slam, or hard landing breaks the yolk.

## Why this stack

Single-page HTML5 + Canvas. No build step. Works as a GitHub Pages site, in Koder, or dropped into an iOS web wrapper. Gyro uses `DeviceOrientationEvent` with iOS permission prompt.

## GitHub Pages

Settings → Pages → Deploy from branch `main` → `/` (root). Then open:

`https://jalapenoseed.github.io/yolk-flip/`

## License

MIT
