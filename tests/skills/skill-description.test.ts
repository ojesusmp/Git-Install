import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..', '..');

function readSkill(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), 'utf8');
}

function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const fields: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim();
    fields[key] = value;
  }
  return fields;
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

const claudeSkill = readSkill('src/skills/claude/install-repo/SKILL.md');
const codexSkill = readSkill('src/skills/codex/install-repo/SKILL.md');

const claudeFrontmatter = parseFrontmatter(claudeSkill);
const codexFrontmatter = parseFrontmatter(codexSkill);

describe('skill-description', () => {
  it('(a) Claude SKILL.md description is <= 30 words', () => {
    const desc = claudeFrontmatter['description'];
    expect(desc, 'description field must exist in Claude SKILL.md').toBeTruthy();
    const count = wordCount(desc);
    expect(count, `description word count is ${count}, must be <= 30`).toBeLessThanOrEqual(30);
  });

  it('(b) Codex SKILL.md description is <= 30 words', () => {
    const desc = codexFrontmatter['description'];
    expect(desc, 'description field must exist in Codex SKILL.md').toBeTruthy();
    const count = wordCount(desc);
    expect(count, `description word count is ${count}, must be <= 30`).toBeLessThanOrEqual(30);
  });

  it('(c) Both SKILL.md files have name: install-repo', () => {
    expect(claudeFrontmatter['name']).toBe('install-repo');
    expect(codexFrontmatter['name']).toBe('install-repo');
  });

  it('(d) Both SKILL.md files have a ## When to invoke section', () => {
    expect(claudeSkill).toContain('## When to invoke');
    expect(codexSkill).toContain('## When to invoke');
  });
});
