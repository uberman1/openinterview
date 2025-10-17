#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
const args = process.argv.slice(2);
spawnSync('node', ['scripts/deploy.mjs','--dry-run', ...args], { stdio: 'inherit' });
