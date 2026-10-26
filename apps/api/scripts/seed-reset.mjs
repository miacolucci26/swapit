// Marca el reseteo para el seed (portable a Windows sin cross-env): SEED_RESET=1 node dist/seed/run-seed.js
import { spawnSync } from 'node:child_process';
const r = spawnSync(process.execPath, ['dist/seed/run-seed.js'], { stdio: 'inherit', env: { ...process.env, SEED_RESET: '1' } });
process.exit(r.status ?? 1);
