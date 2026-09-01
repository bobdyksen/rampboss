# Ramp Boss sprite drop

Top-down pixel art. Drop PNGs here using the filenames below. Transparent background. Nearest-neighbor, no outlines that rely on anti-aliasing.

**View:** straight top-down, not isometric.  
**Facing:** nose / cab toward the **top** of the PNG. The game rotates the sprite.  
**Pivot:** visual center of the vehicle or aircraft.  
**Format:** PNG-24 + alpha.  
**Palette:** limited, bright, readable at phone size.

Suggested pixel sizes are canvas sizes, not on-screen size. Keep a little padding so rotation does not clip wingtips.

## Need now (MVP)

### Aircraft

| File | Size | Notes |
| --- | --- | --- |
| `ac_rj70.png` | 32×40 | Regional jet, CRJ/ERJ class. White wings, readable fuselage. Nav lights: red left, green right. |
| `ac_rj70_ridge.png` | 32×40 | Same jet, RidgeLink teal livery (`#2aa198`). Optional if you would rather I tint `ac_rj70`. |
| `ac_rj70_swift.png` | 32×40 | SwiftAir orange (`#f39c12`). Optional. |
| `ac_nb320.png` | 40×56 | Narrowbody, A320/737 class. Longer fuselage, bigger wing. |
| `ac_nb320_horizon.png` | 40×56 | Horizon Pacific blue (`#2f6fed`). Optional. |

Engines on the wings. Beacon on the spine. Nose at top.

### Ground equipment

| File | Size | Color cue | Notes |
| --- | --- | --- | --- |
| `veh_fuel_truck.png` | 16×24 | Yellow tank | Cab + cylindrical tank. |
| `veh_belt_loader.png` | 16×24 | Orange | Low chassis, conveyor pointing **up** (toward aircraft). |
| `veh_baggage_tractor.png` | 16×28 | Dark orange | Tractor + cart. Bags on the cart help a lot. |
| `veh_cleaning_van.png` | 16×24 | Green | Small van / cabin-service truck. |
| `veh_pushback_tug.png` | 16×20 | Red | Low, squat, hitch toward the **top**. |

### Props that sell the loop

| File | Size | Notes |
| --- | --- | --- |
| `prop_bag_01.png` … `prop_bag_05.png` | 8×8 | Suitcases, mixed colors. |
| `prop_jet_bridge.png` | 16×48 | Straight top-down tunnel. Nose/cabin at **bottom** so I can stretch it toward the L1 door. |
| `prop_jet_bridge_head.png` | 20×16 | Cabin that sits on the aircraft end. |
| `prop_chocks.png` | 8×8 | Pair of yellow chocks. |

### Ramp tiles (optional but high payoff)

| File | Size | Notes |
| --- | --- | --- |
| `tile_tarmac.png` | 16×16 | Seamless. |
| `tile_grass.png` | 16×16 | Seamless. |
| `tile_taxi_line.png` | 16×16 | Yellow centerline, tileable on one axis. |
| `tile_stand.png` | 32×32 | Circular lead-in / stop mark. |
| `bldg_terminal.png` | 96×32 | Top-down terminal strip, glass + roof. |
| `mark_gate_1.png` / `mark_gate_2.png` | 16×16 | Painted gate numbers. |

## Juice, second pass

These are not blockers. They make the ramp feel alive.

| File | Size | Notes |
| --- | --- | --- |
| `ac_rj70_beacon_on.png` | same as jet | Red spine light on. I can also blink a pixel if you skip this. |
| `fx_engine_wash.png` | 16×16 | Soft dust / heat under a departing jet. |
| `unit_ramp_agent.png` | 8×12 | Tiny worker, top-down. |
| `ui_icon_fuel.png` | 16×16 | Radial menu. |
| `ui_icon_bags.png` | 16×16 | |
| `ui_icon_clean.png` | 16×16 | |
| `ui_icon_load.png` | 16×16 | |
| `ui_icon_push.png` | 16×16 | |
| `ui_icon_bridge.png` | 16×16 | |

## Do not paint yet

Widebody, cargo, catering truck, lav, water, GPU, deice truck, stairs. Those are later stages. Two airframes and five vehicles are the whole MVP.

## How I will hook them up

Put the files in this folder (`public/sprites/`). Keep the names. I will load them at runtime and fall back to the generated placeholders if a file is missing. One rotation, no 8-direction sheets, unless a vehicle looks wrong when spun (then a 4-dir set named `_n _e _s _w` is enough).
