// Generated client-safe projection of the canonical JSONL. Never edit the output by hand.
import { readFile,writeFile } from 'node:fs/promises';
const input=new URL('../src/data/deaths-mhlw/records-2024.jsonl',import.meta.url);
const output=new URL('../src/data/deaths-mhlw/records-2024.generated.json',import.meta.url);
const rows=(await readFile(input,'utf8')).split(/\r?\n/).filter(line=>line.trim()).map(line=>JSON.parse(line));
await writeFile(output,JSON.stringify(rows)+'\n');
console.log(`Projected ${rows.length} canonical 2024 fatal accident records.`);
