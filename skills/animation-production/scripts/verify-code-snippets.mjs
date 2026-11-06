#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import ts from 'typescript';

const [projectArg, rootArg] = process.argv.slice(2);
if (!projectArg) {
  console.error('Usage: node verify-code-snippets.mjs <project.json> [repository-root]');
  process.exit(2);
}
const projectPath = resolve(projectArg);
const repositoryRoot = resolve(rootArg ?? dirname(projectPath));
const project = JSON.parse(await readFile(projectPath, 'utf8'));
const findings = [];
const add = (severity, path, message) => findings.push({ severity, path, message });
const secretPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\b(?:api[_-]?key|secret|password|token)\s*[:=]\s*["'][^"']{8,}["']/i,
  /\b(?:sk|pk)_(?:live|test)_[A-Za-z0-9]{16,}\b/,
  /\bAKIA[A-Z0-9]{16}\b/,
];

const checkWithStdin = (command, args, code) => new Promise((resolveCheck) => {
  let stderr = '';
  const child = spawn(command, args, { stdio: ['pipe', 'ignore', 'pipe'] });
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  child.on('error', (error) => resolveCheck(error.message));
  child.on('exit', (status) => resolveCheck(status === 0 ? undefined : stderr.trim() || `${command} exited with ${status}`));
  child.stdin.end(code);
});

for (const [sceneIndex, scene] of (project.scenes ?? []).entries()) {
  for (const [elementIndex, element] of (scene.elements ?? []).entries()) {
    if (element.type !== 'code') continue;
    const path = `scenes[${sceneIndex}].elements[${elementIndex}]`;
    const code = String(element.content ?? '');
    if (secretPatterns.some((pattern) => pattern.test(code))) add('error', path, 'Possible credential or private key detected in displayed code.');
    if (code.split('\n').length > 16) add('warning', path, 'Code contains more than 16 lines; split it into narrated steps.');
    if (code.split('\n').some((line) => line.length > 80)) add('warning', path, 'Code contains a line longer than 80 characters; inspect video readability.');

    if (element.codeVerification === 'exact') {
      const source = element.codeSource;
      try {
        const sourcePath = resolve(repositoryRoot, source.file);
        const insideRoot = relative(repositoryRoot, sourcePath);
        if (!insideRoot || insideRoot.startsWith('..') || isAbsolute(insideRoot)) throw new Error('source file must stay inside the repository root');
        const sourceText = await readFile(sourcePath, 'utf8');
        const extracted = sourceText.split(/\r?\n/).slice(source.startLine - 1, source.endLine).join('\n');
        if (extracted !== code) add('error', path, `Displayed code does not exactly match ${source.file}:${source.startLine}-${source.endLine}.`);
      } catch (error) {
        add('error', path, `Could not verify repository source: ${error.message}`);
      }
    }
    if (element.codeSource?.extraction === 'ocr') add('warning', path, 'OCR-derived code needs visual comparison with the source and must not be presented as executed code without syntax verification.');
    if (element.codeVerification === 'display-only') continue;

    const language = String(element.language ?? '').toLowerCase();
    if (['typescript', 'ts', 'tsx', 'javascript', 'js', 'jsx'].includes(language)) {
      const result = ts.transpileModule(code, { reportDiagnostics: true, compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } });
      for (const diagnostic of result.diagnostics ?? []) add('error', path, ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
    } else if (language === 'json') {
      try { JSON.parse(code); } catch (error) { add('error', path, `Invalid JSON: ${error.message}`); }
    } else if (['python', 'py'].includes(language)) {
      const error = await checkWithStdin('python3', ['-c', "import sys; compile(sys.stdin.read(), '<video-snippet>', 'exec')"], code);
      if (error) add('error', path, `Python syntax check failed: ${error}`);
    } else if (['bash', 'sh', 'shell'].includes(language)) {
      const error = await checkWithStdin('bash', ['-n'], code);
      if (error) add('error', path, `Shell syntax check failed: ${error}`);
    } else {
      add('warning', path, `No syntax verifier configured for ${language || 'unknown language'}.`);
    }
  }
}

for (const finding of findings) console.log(`${finding.severity.toUpperCase()} ${finding.path}: ${finding.message}`);
const errors = findings.filter((finding) => finding.severity === 'error').length;
console.log(`Code verification ${errors ? 'failed' : 'passed'}: ${errors} error(s), ${findings.length - errors} warning(s).`);
if (errors) process.exit(1);
