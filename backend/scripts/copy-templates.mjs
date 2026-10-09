import { cp, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
await mkdir(path.join(root, '..', 'dist', 'templates'), { recursive: true });
await cp(
  path.join(root, '..', 'src', 'templates'),
  path.join(root, '..', 'dist', 'templates'),
  { recursive: true },
);
console.log('Email templates copied to dist/templates');
