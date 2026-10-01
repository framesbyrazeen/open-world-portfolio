import {fileURLToPath} from 'node:url';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
export default {
 root:fileURLToPath(new URL('./sources',import.meta.url)),
 publicDir:fileURLToPath(new URL('./static',import.meta.url)),
 base:'./',
 define:{'import.meta.env.VITE_COMPRESSED':'true','import.meta.env.VITE_SERVER_URL':'""','import.meta.env.VITE_GAME_PUBLIC':'false','import.meta.env.VITE_LOG':'false','import.meta.env.VITE_DAY_CYCLE_PROGRESS':'"0.12"','import.meta.env.VITE_YEAR_CYCLE_PROGRESS':'"0.7"','import.meta.env.VITE_WHISPERS_COUNT':'"0"','import.meta.env.VITE_MUSIC':'"1"'},
 build:{outDir:fileURLToPath(new URL('../dist-pages',import.meta.url)),emptyOutDir:true,sourcemap:false},
 plugins:[wasm(),topLevelAwait()],
};
