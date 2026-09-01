# Ramp Boss

Arcade airport ground-operations game. You are the Ramp Boss. Keep the airport moving.

This repository contains the first playable MVP: a landscape web prototype with a data-driven simulation core and a top-down pixel ramp. The product vision is iOS and Android; the web build is the fastest way to prove the turnaround loop.

Drag the map so it follows your finger. Pinch or scroll to zoom. The airport itself is the interface.

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

Repo: [github.com/bobdyksen/rampboss](https://github.com/bobdyksen/rampboss)

This is a static Vite app. `vercel.json` pins the build to `npm run build` and `dist`.

1. Open [vercel.com/new](https://vercel.com/new)
2. Import `bobdyksen/rampboss`
3. Leave the Vite preset. Deploy.

Production follows `main`. Other branches get Preview URLs.

Or from a logged-in machine:

```bash
npx vercel        # preview
npx vercel --prod # production
```

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
- `src/render` — top-down pixel ramp, aircraft, and vehicles
- `src/ui` — HUD, radial dispatch menu, results
- `tests` — clock, pathfinding, scoring, turnaround rules

All durations, arrivals, and movement use simulation time. Pause / 1x / 2x only change the clock.

## Design rule

Do not add a real-world airport feature unless it creates a decision, a tradeoff, time pressure, a resource conflict, or a satisfying visual payoff.

## Next after the loop is fun

More aircraft classes, weather, events, upgrades, campaign airports, and endless shift. Do not expand until the two-gate morning bank produces “oh crap, I’m not ready for him.”
