#!/usr/bin/env node
/**
 * Quality gate "lite" de VittalMind.
 *
 * Se ejecuta dentro del contenedor definido en docker-compose.quality-tools.yml
 * (perfil `quality`), pero tambien funciona en local si se invoca con node.
 *
 * Mide, por proyecto (Backend y App):
 *   - errores de tipos       -> tsc --noEmit
 *   - errores/avisos de lint -> ESLint (typescript-eslint + sonarjs)
 *   - any y console          -> derivados de las reglas de ESLint
 *   - duplicacion            -> jscpd
 *
 * Escribe quality-reports/QUALITY_<timestamp>.md y .json y devuelve exit 1
 * si se supera algun umbral (ver docs/quality-gate.md).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const REPO = process.env.REPO_DIR || '/repo';
const REPORTS = process.env.REPORTS_DIR || '/reports';
const MAX_WARNINGS = Number(process.env.QUALITY_MAX_WARNINGS ?? 50);
const MAX_DUPLICATION = Number(process.env.QUALITY_MAX_DUPLICATION ?? 5);
const MIN_TOKENS = Number(process.env.QUALITY_MIN_TOKENS ?? 50);

const PROJECTS = [
  // maxDuplication: umbral por proyecto. Backend esta sano; App arrastra
  // duplicacion de pantallas de auth y dialogos (ver docs/quality-gate.md).
  { name: 'Backend', dir: 'Backend', patterns: ['src/**/*.ts'], maxDuplication: 5 },
  { name: 'App', dir: 'App', patterns: ['src/**/*.ts', 'src/**/*.tsx'], maxDuplication: 12 },
];

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, HOME: '/tmp', CI: '1' },
    maxBuffer: 128 * 1024 * 1024,
  });
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    error: result.error ? String(result.error) : null,
  };
}

function countTypeErrors(output) {
  return output
    .split(/\r?\n/)
    .filter((line) => /error TS\d+/.test(line)).length;
}

function lintProject(project) {
  const projectDir = path.join(REPO, project.dir);
  const bin = path.join(projectDir, 'node_modules', '.bin', 'eslint');
  const reportPath = `/tmp/eslint-${project.name}.json`;

  if (!existsSync(bin)) {
    return { error: `No existe node_modules/.bin/eslint: ejecuta npm install en ${project.dir}` };
  }

  const result = run(bin, [...project.patterns, '-f', 'json', '-o', reportPath], projectDir);
  if (!existsSync(reportPath)) {
    return { error: `ESLint no genero reporte (exit ${result.status}): ${result.stderr.slice(0, 400)}` };
  }

  const files = JSON.parse(readFileSync(reportPath, 'utf8'));
  const messages = files.flatMap((file) =>
    file.messages.map((message) => ({
      file: path.relative(projectDir, file.filePath).replaceAll('\\', '/'),
      line: message.line ?? 0,
      severity: message.severity,
      ruleId: message.ruleId ?? 'unknown',
      message: message.message,
    })),
  );

  const errors = messages.filter((message) => message.severity === 2);
  const warnings = messages.filter((message) => message.severity === 1);
  const byRule = {};
  for (const message of [...errors, ...warnings]) {
    byRule[message.ruleId] = (byRule[message.ruleId] ?? 0) + 1;
  }

  return {
    errors,
    warnings,
    anyCount: errors.filter((m) => m.ruleId === '@typescript-eslint/no-explicit-any').length,
    consoleCount: errors.filter((m) => m.ruleId === 'no-console').length,
    byRule,
  };
}

function duplication(project) {
  const projectDir = path.join(REPO, project.dir);
  const output = `/tmp/jscpd-${project.name}`;
  const result = run(
    'jscpd',
    [
      '--min-tokens', String(MIN_TOKENS),
      '--format', 'typescript,tsx',
      '--reporters', 'json',
      '--output', output,
      '--silent',
      'src',
    ],
    projectDir,
  );

  const reportPath = path.join(output, 'jscpd-report.json');
  if (!existsSync(reportPath)) {
    return { error: `jscpd no genero reporte (exit ${result.status}): ${result.stderr.slice(0, 300)}` };
  }

  const report = JSON.parse(readFileSync(reportPath, 'utf8'));
  const total = report.statistics?.total ?? {};
  return {
    percentage: Number(total.percentage ?? 0),
    duplicatedLines: Number(total.duplicatedLines ?? 0),
    lines: Number(total.lines ?? 0),
    clones: Array.isArray(report.duplicates) ? report.duplicates.length : 0,
  };
}

function analyse(project) {
  const projectDir = path.join(REPO, project.dir);
  const notes = [];

  if (!existsSync(projectDir)) {
    return { name: project.name, failed: true, notes: [`No existe ${project.dir}/`] };
  }

  const tscBin = path.join(projectDir, 'node_modules', '.bin', 'tsc');
  let typeErrors = 0;
  if (!existsSync(tscBin)) {
    notes.push(`No existe node_modules/.bin/tsc: ejecuta npm install en ${project.dir}`);
  } else {
    const tsc = run(tscBin, ['--noEmit', '--incremental', 'false', '-p', 'tsconfig.json'], projectDir);
    typeErrors = countTypeErrors(`${tsc.stdout}\n${tsc.stderr}`);
    if (tsc.status !== 0 && typeErrors === 0) {
      notes.push(`tsc fallo sin errores TS reconocibles: ${tsc.stderr.slice(0, 300)}`);
    }
  }

  const lint = lintProject(project);
  if (lint.error) notes.push(lint.error);

  const dup = duplication(project);
  if (dup.error) notes.push(dup.error);

  const eslintErrors = lint.errors?.length ?? 0;
  const eslintWarnings = lint.warnings?.length ?? 0;
  const duplicationPct = dup.percentage ?? 0;
  const maxDuplication = project.maxDuplication ?? MAX_DUPLICATION;

  const failed =
    notes.length > 0 ||
    typeErrors > 0 ||
    eslintErrors > 0 ||
    eslintWarnings > MAX_WARNINGS ||
    duplicationPct > maxDuplication;

  return {
    name: project.name,
    failed,
    notes,
    typeErrors,
    eslintErrors,
    eslintWarnings,
    anyCount: lint.anyCount ?? 0,
    consoleCount: lint.consoleCount ?? 0,
    duplicationPct,
    maxDuplication,
    duplicatedLines: dup.duplicatedLines ?? 0,
    clones: dup.clones ?? 0,
    byRule: lint.byRule ?? {},
    errors: (lint.errors ?? []).slice(0, 40),
    warnings: (lint.warnings ?? []).slice(0, 40),
  };
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

function renderMarkdown(results, globalPass) {
  const lines = [];
  lines.push(`# QUALITY REPORT - ${new Date().toISOString()}`);
  lines.push('');
  lines.push(`## Veredicto: **${globalPass ? 'PASS' : 'FAIL'}**`);
  lines.push('');
  lines.push('| Proyecto | tsc | ESLint err | ESLint warn | any | console | Duplicacion | Resultado |');
  lines.push('|---|---|---|---|---|---|---|---|');
  for (const r of results) {
    lines.push(
      `| ${r.name} | ${r.typeErrors ?? '-'} | ${r.eslintErrors ?? '-'} | ${r.eslintWarnings ?? '-'} | ` +
        `${r.anyCount ?? '-'} | ${r.consoleCount ?? '-'} | ${r.duplicationPct ?? '-'}% ` +
        `(max ${r.maxDuplication ?? MAX_DUPLICATION}%) | ${r.failed ? 'FAIL' : 'PASS'} |`,
    );
  }
  lines.push('');
  lines.push(`Umbrales: 0 errores de tipos, 0 errores de lint, <= ${MAX_WARNINGS} avisos, ` +
    `duplicacion <= 5% en Backend y <= 12% en App (jscpd, min-tokens ${MIN_TOKENS}).`);
  lines.push('');

  for (const r of results) {
    lines.push(`### ${r.name}`);
    if (r.notes?.length) {
      for (const note of r.notes) lines.push(`- WARN: ${note}`);
    }
    if (r.errors?.length) {
      lines.push('');
      lines.push('#### Errores de lint');
      for (const e of r.errors) lines.push(`- \`${e.file}:${e.line}\` [${e.ruleId}] ${e.message}`);
    }
    if (r.warnings?.length) {
      lines.push('');
      lines.push('#### Avisos (primeros 40)');
      for (const w of r.warnings) lines.push(`- \`${w.file}:${w.line}\` [${w.ruleId}] ${w.message}`);
    }
    const rules = Object.entries(r.byRule ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 12);
    if (rules.length) {
      lines.push('');
      lines.push('#### Reglas mas frecuentes');
      for (const [rule, count] of rules) lines.push(`- ${count} x \`${rule}\``);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('Generado por scripts/quality/run-quality.mjs (contenedor quality-lite).');
  return lines.join('\n');
}

function main() {
  if (!existsSync(REPORTS)) mkdirSync(REPORTS, { recursive: true });

  const results = PROJECTS.map(analyse);
  const globalPass = results.every((result) => !result.failed);
  const stamp = timestamp();

  const jsonPath = path.join(REPORTS, `QUALITY_${stamp}.json`);
  const mdPath = path.join(REPORTS, `QUALITY_${stamp}.md`);

  writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        globalPass,
        thresholds: { MAX_WARNINGS, MAX_DUPLICATION, MIN_TOKENS },
        results,
      },
      null,
      2,
    ),
  );
  writeFileSync(mdPath, renderMarkdown(results, globalPass));

  console.log(`\n=== QUALITY GATE: ${globalPass ? 'PASS' : 'FAIL'} ===`);
  for (const r of results) {
    console.log(
      `  ${r.name}: tsc=${r.typeErrors ?? '-'} eslint=${r.eslintErrors ?? '-'} err / ` +
        `${r.eslintWarnings ?? '-'} warn, any=${r.anyCount ?? '-'}, console=${r.consoleCount ?? '-'}, ` +
        `duplicacion=${r.duplicationPct ?? '-'}% -> ${r.failed ? 'FAIL' : 'PASS'}`,
    );
    for (const note of r.notes ?? []) console.log(`    ! ${note}`);
  }
  console.log(`\nReporte: ${mdPath}`);
  process.exit(globalPass ? 0 : 1);
}

main();
