# Razeen's Open World Portfolio

Personalized adaptation of **Bruno Simon's Folio 2025**, released under the MIT license. Original engine, map, vehicle, models, textures, shaders, and interactions: copyright © 2025 Bruno Simon. See [license.md](./license.md).

Upstream source: https://github.com/brunosimon/folio-2025

Imported revision: `41046b57eeed8d156d9c3fd7fa259900baef7816`.

Razeen's adaptation includes resume-based workshop exhibits, a Java learning board, personal contact links, an Instagram sculpture, new physical name letters, local area recovery, and an accessible text portfolio. Workshop covers are explanatory illustrations, not photos or screenshots of workshop deliverables. No original client projects or professional awards are claimed as Razeen's work.

## Run and build

From the repository root, with Node 22.13+:

```cmd
npm ci --prefix reference-world
npm run dev
npm run build:pages
```

Development preview: http://127.0.0.1:5176/. Static output: `../dist-pages/`. The existing GitHub Pages workflow installs this directory's pinned dependencies and publishes that output on pushes to `main`.

The earlier jungle implementation remains under `app/` and is available with `npm run dev:legacy`. It is not the Pages build.

## Controls

Enter starts. WASD or arrow keys drive. Shift boosts, Space jumps, M opens the map. The Controls menu lists recovery and gamepad controls. On touch devices, drag on the world to use the directional joystick; the floating buttons provide context actions and recovery. Choose lower quality in Options for less capable GPUs.

The map has keyboard-accessible destinations. Read `portfolio.html` for all personal content without loading the 3D world.

## Privacy and attribution

The upstream analytics and multiplayer connection are removed. Assets and fonts are self-hosted. Browser storage contains local game progress and settings. Reloading starts at the original entrance; in-game recovery uses the nearest safe respawn. No account, credential, API key, resume PDF, or backend service is needed. Keep the MIT notice and visible world credit when publishing.

Music: Kounine, CC0, as distributed in the upstream project. Font notices are included in `static/fonts/`. Three.js, Rapier, Howler.js and the other libraries retain their respective licenses.

The `sources/data/projects.js`, `lab.js`, and `social.js` files contain the personalized exhibition and contact data. The Instagram interaction is in `sources/Game/World/Areas/SocialArea.js`. Original imported source comments and internal resource names may remain for compatibility.
