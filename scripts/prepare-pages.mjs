import { copyFile, readdir } from 'node:fs/promises';
// Only built public files are copied. Development sources and private files stay separate.
for (const file of await readdir('dist')) await copyFile('dist/' + file, file);
console.log('GitHub Pages assets refreshed at the repository root. Commit them with your source changes.');
