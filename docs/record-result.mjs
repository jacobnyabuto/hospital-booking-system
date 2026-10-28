import { readFileSync, writeFileSync } from "node:fs";

const [id, status, ...rest] = process.argv.slice(2);
const actual = rest.join(" ").replace(/\|/g, "/").trim();

if (!id || !["Pass", "Fail", "Not run"].includes(status)) {
  console.error("Usage: node docs/record-result.mjs ID Pass|Fail|\"Not run\" \"what you saw\"");
  process.exit(1);
}

const file = new URL(id.startsWith("L") ? "./production-test.md" : "./test-plan.md", import.meta.url);
const lines = readFileSync(file, "utf8").split(/\r?\n/);
let hit = false;

const out = lines.map((line) => {
  const t = line.trim();
  if (!t.startsWith("|")) return line;
  const cells = t.replace(/^\||\|$/g, "").split("|");
  if (cells[0].trim() !== id) return line;
  hit = true;
  cells[cells.length - 2] = ` ${actual} `;
  cells[cells.length - 1] = ` ${status} `;
  return `|${cells.join("|")}|`;
});

if (!hit) {
  console.error(`No test with ID "${id}" found in docs/test-plan.md`);
  process.exit(1);
}
writeFileSync(file, out.join("\n"));
console.log(`Recorded ${id}: ${status}`);

