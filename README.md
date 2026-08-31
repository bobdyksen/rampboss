# Ramp Boss

Arcade airport ground-operations game. You are the Ramp Boss. Keep the airport moving.

This repository contains the first playable MVP: a landscape web prototype with a data-driven simulation core and a stylized 3D ramp. The product vision is iOS and Android; the web build is the fastest way to prove the turnaround loop.

## Play

```bash
npm install
npm run dev
```

Open the printed local URL, then start the Ridgefield morning bank.

```bash
npm test
npm run build
```

## Deploy on Vercel

This is a static Vite app. Vercel detects that automatically. The repo itself currently lives on Origin (`origin.cursor.com`), which Vercel cannot watch, so pick one of these:

### A. GitHub import (keeps deploys hooked up)

1. Create an empty GitHub repo (for example `degas/rampboss`).
2. Add it as a second remote and push `main` plus this branch:

```bash
git remote add github https://github.com/YOUR_ORG/rampboss.git
git push -u github main
git push github cursor/ramp-boss-mvp-409c
```

3. Open [vercel.com/new](https://vercel.com/new), import that GitHub repo, and Deploy. Leave the preset as Vite. Build is `npm run build`, output is `dist`.
4. Production follows `main`. Every other branch, including this PR, gets a Preview URL.

### B. CLI deploy (no GitHub required)

From a machine where you can log into Vercel:

```bash
npx vercel login
npx vercel        # preview
npx vercel --prod # production
```

Do not override the prompted settings. `vercel.json` already pins Vite, the build command, and the `dist` folder.

I cannot finish the login from this cloud agent. If you add a GitHub remote or a `VERCEL_TOKEN`, the next deploy can be done from here.

## MVP loop

Two adjacent gates share one fuel truck, one belt loader, one bag tractor, one cleaning van, and one pushback tug.

Aircraft arrive, taxi in, and go on blocks. Jet bridge, deplane, and boarding run automatically once their dependencies unlock. You dispatch:

- Fuel
- Baggage unload / load
- Cleaning
- Pushback

Travel time is real. A truck at Gate 1 cannot instantly fuel Gate 2. Equipment sitting after an unload can stay for the load or be stolen for the other aircraft.

A shift lasts about five real minutes at 1x. Score, on-time streak, OTP, and a three-star rating close the session.

## Architecture

Simulation state is independent of Three.js.

- `src/sim` — clock, flights, task graph, vehicles, scoring
- `src/data` — aircraft, airlines, services, waypoints, scenario
- `src/render` — isometric ramp, primitive aircraft and vehicles
- `src/ui` — HUD, radial dispatch menu, results
- `tests` — clock, pathfinding, scoring, turnaround rules

All durations, arrivals, and movement use simulation time. Pause / 1x / 2x only change the clock.

## Design rule

Do not add a real-world airport feature unless it creates a decision, a tradeoff, time pressure, a resource conflict, or a satisfying visual payoff.

## Next after the loop is fun

More aircraft classes, weather, events, upgrades, campaign airports, and endless shift. Do not expand until the two-gate morning bank produces “oh crap, I’m not ready for him.”
