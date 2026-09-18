# Razeen’s Playground

A full-screen interactive personal portfolio for Mohammed Razeen P, inspired by the idea of exploring a portfolio as a small game world.

## Run

- `npm run install:ci` — install locked dependencies
- `npm run dev` — preview at http://localhost:5173
- `npm run build` — build for hosting
- `npx tsc --noEmit` — type check
- `node --test scripts/driving.test.mjs` — driving and collision regression tests

Requires Node.js 22.13 or newer.

## Experience

Drive an orange rover through a landscaped world containing a home studio, workshop, learning campus, and creative garden. Arrow keys/WASD drive, Shift boosts, Space brakes, Enter opens a nearby chapter, and R returns to the start. Drag to orbit and scroll to zoom. Clicking the ground drives toward a spot; obstacles need to be steered around. The map offers direct destination travel. Mobile arrow controls support simultaneous touch input.

The Cannon vehicle has suspension, acceleration, steering, brakes, and physical interactions with crates, cones, ramps, buildings, and fences. Reset restores the car and movable objects. Sound is off by default. The procedural world uses Three.js instancing for forest vegetation. Decorative motion respects reduced-motion preferences.

The Portfolio button opens a complete conventional reading view. All chapter panels use accessible Radix dialogs. A keyboard skip link and WebGL fallback make the résumé content available independently of driving.

## Source

- `app/page.tsx`: interface, map, journal, controls and content dialogs
- `app/content.ts`: résumé-derived biography, workshop experience, skills and credentials
- `app/world.tsx`: rendering, camera, audio, input and simulation loop
- `app/scene.ts`: world geometry, signage and rover model
- `app/driving.mjs`: physics setup shared with the regression tests
- `app/globals.css`: responsive interface styles
- `public/Mohammed-Razeen-P-Resume.pdf`: supplied original résumé

Personal photographs have not yet been supplied. The creative garden’s colored panels are decorative world objects, not claimed examples of Razeen’s photography.

## Jungle edition

The world now includes 165 tropical trees (55 palms), broad-leaf canopies, bamboo, ferns, grass, orchids, mushrooms, buttress roots, hanging vines, roof plants, lanterns, butterflies and drifting motes. A faceted waterfall feeds a shallow stream into the pond, with animated foam, reeds, frogs and rope bridge rails. The map shows the forest and stream and includes a waterfall shortcut. Optional audio mixes the engine with water and forest noise, becoming stronger near the waterfall.

Vegetation is generated deterministically and large trees avoid driving routes, building approaches, the bridge and ramps. Instanced plant geometry keeps draw calls down; smaller screens use lower render resolution and shadow-map size. Reduced motion stops foliage, insect and water animation.

- `app/jungle.ts` — jungle geometry, animation and waterfall
- `app/jungle-layout.mjs` — planting and protected driving corridors
- `node --test scripts/driving.test.mjs scripts/jungle.test.mjs` — driving and planting regression checks

## Tropical expedition

The playable radius is now 148 world units (previously 60), about six times the area. A 616-unit outer trail connects through the central area, with rolling terrain, a recessed river channel, a bridge crossing, a ridge stop and a vibe coding campsite. Terrain rendering and Cannon wheel contacts share the same heightfield and triangle interpolation. Both bridges derive their visible planks, ramps and solid rails from one descriptor list; no decorative-only bridge deck remains.

Choose clear morning, monsoon rain, forest mist or golden hour. Weather transitions change fog, light, surface roughness and tire grip. Rain includes moving streaks, ground splashes, puddles, headlights and wipers. These are simulated weather presets, not live weather data. The camera switches between a perspective orbit view and a following driving view. Procedural material textures and instanced foliage keep asset downloads small. Rendering resolution adapts to frame time; phones use fewer rain/splash particles and smaller shadow maps, with the same destinations and driving routes. Equal frame rates on all hardware are not guaranteed.

The regression suite covers full crossings in both directions over both bridges at a controlled speed, terrain support, controls, barriers and planting clearances. Natural material treatment and physical terrain improve realism, while the original portfolio landmarks retain their stylized forms. This is a browser-sized environment, not photorealistic AAA game rendering.

- `app/landscape.mjs`: terrain samples, trail corridors and shared bridge geometry
- `app/expedition.ts`: terrain, extended forest, river, trail props, bridge visuals and campsite
- `app/weather.ts`: sky, weather transitions, rain and puddles

## Mountains to the sea

The circular road has been replaced with an irregular coastal region and ten connected routes. The résumé chapters occupy separate jungle, riverside, mountain and beach hubs. Mountain roads use graded terrain shoulders to remain drivable while the surrounding peaks retain their height. The beach has an animated sea and surf, coastal palms, seabirds, driftwood and a physical pier. The old road ramps are removed; optional challenges occupy a separate clearing. The coding desk and camp are off the through-road.

Visible solid boxes, structural cylinders, furniture, bamboo, larger rocks, hub buildings and pier parts register collision geometry after their final transforms. Static shapes are grouped spatially to avoid a separate physics body for every small beam. The vehicle cabin, hood and tire sides also collide. Thin foliage and tiny ground decoration remain nonblocking. Convex natural objects use conservative collision bounds rather than exact polygon-level contacts.

`node scripts/world-audit.mjs` constructs the complete real scene in Node, sweeps each road for obstructions, simulates driving all ten routes, and verifies solid hubs and the coding desk. It writes its report to ignored `outputs/world-audit/report.json`. Optional route indices limit repeat drives after a localized fix. `node --test scripts/driving.test.mjs scripts/jungle.test.mjs` covers both bridges, terrain, controls, the solid cabin/table interaction and planting. The map remains a procedurally rendered browser experience, not RDR-class photorealism.


## Driving and mobile refinement

The playable bounds now span 392 × 392 units, with 13 branching routes and new cloud ridge, western cove and eastern overlook stops. Summit grades are explicitly limited and share their exact heightfield with the renderer and vehicle. A cached immutable height grid reduces repeated terrain work during animation.

The four-wheel drivetrain has more low-speed torque, progressive torque falloff, better wet grip, stronger brakes, damped suspension, and ground-normal anti-roll control. The original .48-radian steering lock is preserved; its response reduces at speed. The simulation uses a bounded 120 Hz accumulator instead of Cannon’s elapsed-time overload, which could discard physics updates under CPU load. Tree collision shapes are grouped into spatial tiles to reduce the simulation workload. Wheel rays only support the vehicle on terrain, bridge decks, the pier and challenge ramps. Chassis, roof rack, hood, bumpers and tire-side shapes collide with props. Tents and rocks use convex hulls so rotated bounding boxes do not create oversized invisible barriers.

R and the recovery button choose a clear nearby position, retain its heading, and use the bridge deck height where appropriate. Valid checkpoints exclude water, obstacles, steep ground and the map edge. Local browser storage restores the last safe area after a reload. Out-of-bounds and submerged vehicles also recover locally. Recovery no longer resets all movable objects.

Phones have a proportional thumb joystick plus independent Boost and Brake buttons with pointer capture, pointer-cancel and blur cleanup. The same driving areas and portfolio content remain accessible on desktop. Adaptive rendering is still necessary; no equal-FPS or real-device performance guarantee is made.

Continuous road masks add gravel and wheel-worn tracks. Water uses animated multi-scale normals, depth color, caustic patterns and shoreline foam; the waterfall has deforming translucent curtains and wet rocks. These are procedural browser graphics, not RDR-class rendering. Résumé highlights now feature the NPTEL Elite + Silver credential, PCB and cybersecurity workshops, and Razeen’s interest in vibe coding.

Validation commands:
- `node --test scripts/driving.test.mjs scripts/jungle.test.mjs scripts/recovery.test.mjs scripts/handling.test.mjs`
- `node scripts/world-audit.mjs` (all 13 routes, actual full scene)
- `node scripts/world-audit.mjs --reverse --wet` (return journeys with wet grip)
- `node scripts/world-audit.mjs --impacts` (ten direct impacts against actual furniture, hubs, bamboo, lanterns and bridge rails)
- `node scripts/world-audit.mjs --ramps` (both ramps, full pier and pier recovery)
- Reports are written under ignored `outputs/world-audit/report-*.json`.

Spotify is not integrated. A playlist link is a future option; Spotify's developer restrictions on games and audiovisual synchronization must be considered before any in-world streaming integration.


## City, forest and desert refinement

Sixteen connected routes now include Copperlight city and a sandstone desert. The city has instanced window façades, roof equipment, shop canopies, sidewalks and lamps; forest transitions add layered conifers; the desert has eroded sandstone formations, cacti, dune terrain and wind-ripple shading. Asphalt markings, sand trails and forest gravel share the physical terrain. New structural scenery participates in collision registration, with generous space at the city approach bend.

Hill starts now receive slope-dependent low-range wheel torque, including at partial joystick input. Suspension rays cover their full extension. Rigid tire side proxies collide with obstacles but no longer drag against the drivable terrain and fight the suspension. Adjacent road grades blend through bends instead of changing abruptly at the nearest segment boundary. Maximum steering lock and flat-road engine limits are unchanged.

`node scripts/hill-starts.mjs` and `node scripts/hill-starts.mjs --wet` each check 207 stopped starts along climbs and shoulders at 55% throttle. This regression reproduces the earlier barely-moving and backward-rolling cases, which a continuous route drive did not expose. Full-scene route, collision, bridge, ramp and pier checks remain available with the commands above; the atlas now exposes city, desert and forest destinations.


## Security hardening — 18 September 2026

The production entrypoint (`worker.ts`) wraps Vinext before request decoding. This read-only portfolio accepts GET/HEAD and rejects all other methods before server-action handling. It rejects oversized URLs and internal file probes, emits generic failures, and removes framework identification. Authentication and the unchanged owner-only audience remain enforced by Sites, not by browser storage or spoofable application cookies.

HTML uses a fresh cryptographically random 192-bit CSP nonce per response, passed to the renderer through an overwritten request header and matched in the response policy. No script `unsafe-inline` or `unsafe-eval` is permitted. Inline styles remain allowed for React/Three positioning. Nonce-bearing responses are private/no-store. The policy limits resources and connections to the current origin, disables frames, objects, forms and workers, and uses same-origin framing protection. HSTS, nosniff, no-referrer, restricted device permissions and same-origin resource headers cover documents and static assets. The PDF is an attachment with a sandbox policy. Existing asset caching is preserved for hashed static files.

Saved positions are size-limited and copied into a validated coordinate-only object. They never hold identity or authorization information. The production asset check rejects shipped source maps, environment files and private-key files.

Framework and tool dependencies were patched, including Next, React/RSC, Vinext, Vite and Cloudflare packages. A targeted esbuild 0.25.12 override fixes the deprecated esbuild-kit loader used by the existing database tool; its synchronous and asynchronous transforms were checked. The complete npm audit (including development dependencies) reported zero known advisories on 18 September 2026, down from 24. This is time-specific and does not prove absence of unknown vulnerabilities.

Validation: `node --test scripts/security.test.mjs` checks nonce rotation/spoof resistance, HTTP method and source-path restrictions, error confidentiality and checkpoint tampering. `node scripts/security-http.mjs http://127.0.0.1:8787` checks the actual production Worker, matching nonces on all 26 rendered script elements, asset headers and downloads. Browser QA confirmed the world runs with enforced CSP. No external penetration test, new DDoS service or account-security configuration is claimed. Re-run dependency auditing regularly and before future releases; security headers are not a substitute for framework patches or hosting access control.

References: [MDN CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP), [Cloudflare asset headers](https://developers.cloudflare.com/workers/static-assets/headers/).
