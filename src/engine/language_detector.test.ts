import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveLanguageId, SUPPORTED_LANGUAGES } from '../utils/highlighter';

test('LANGUAGE DETECTOR 1: Detects supported languages from file extensions', () => {
  assert.equal(resolveLanguageId(undefined, 'src/App.tsx'), 'typescript');
  assert.equal(resolveLanguageId(undefined, 'index.ts'), 'typescript');
  assert.equal(resolveLanguageId(undefined, 'scripts/run.js'), 'javascript');
  assert.equal(resolveLanguageId(undefined, 'backend/main.py'), 'python');
  assert.equal(resolveLanguageId(undefined, 'service/Worker.java'), 'java');
  assert.equal(resolveLanguageId(undefined, 'main.go'), 'go');
  assert.equal(resolveLanguageId(undefined, 'core/lib.rs'), 'rust');
  assert.equal(resolveLanguageId(undefined, 'driver.c'), 'c');
  assert.equal(resolveLanguageId(undefined, 'engine.cpp'), 'cpp');
  assert.equal(resolveLanguageId(undefined, 'include/header.hpp'), 'cpp');
  assert.equal(resolveLanguageId(undefined, 'index.php'), 'php');
  assert.equal(resolveLanguageId(undefined, 'app.rb'), 'ruby');
  assert.equal(resolveLanguageId(undefined, 'public/index.html'), 'html');
  assert.equal(resolveLanguageId(undefined, 'styles/main.css'), 'css');
  assert.equal(resolveLanguageId(undefined, 'package.json'), 'json');
  assert.equal(resolveLanguageId(undefined, 'docker-compose.yml'), 'yaml');
  assert.equal(resolveLanguageId(undefined, 'schema.sql'), 'sql');
  assert.equal(resolveLanguageId(undefined, 'deploy.sh'), 'bash');
  assert.equal(resolveLanguageId(undefined, 'setup.bash'), 'bash');
});

test('LANGUAGE DETECTOR 2: Detects supported languages from language name metadata', () => {
  assert.equal(resolveLanguageId('TypeScript'), 'typescript');
  assert.equal(resolveLanguageId('TypeScript (React)'), 'typescript');
  assert.equal(resolveLanguageId('JavaScript'), 'javascript');
  assert.equal(resolveLanguageId('Python'), 'python');
  assert.equal(resolveLanguageId('Java'), 'java');
  assert.equal(resolveLanguageId('Go'), 'go');
  assert.equal(resolveLanguageId('Rust'), 'rust');
  assert.equal(resolveLanguageId('C'), 'c');
  assert.equal(resolveLanguageId('C++'), 'cpp');
  assert.equal(resolveLanguageId('PHP'), 'php');
  assert.equal(resolveLanguageId('Ruby'), 'ruby');
  assert.equal(resolveLanguageId('HTML'), 'html');
  assert.equal(resolveLanguageId('CSS'), 'css');
  assert.equal(resolveLanguageId('JSON'), 'json');
  assert.equal(resolveLanguageId('YAML'), 'yaml');
  assert.equal(resolveLanguageId('SQL'), 'sql');
  assert.equal(resolveLanguageId('Shell'), 'bash');
  assert.equal(resolveLanguageId('Bash'), 'bash');
});

test('LANGUAGE DETECTOR 3: Unsupported languages and plain text fall back gracefully to null', () => {
  assert.equal(resolveLanguageId('UnknownLang', 'notes.txt'), null);
  assert.equal(resolveLanguageId('Text', 'README'), null);
  assert.equal(resolveLanguageId(undefined, 'binary.dat'), null);
  assert.equal(resolveLanguageId(undefined, 'LICENSE'), null);
});

test('LANGUAGE DETECTOR 4: Supported languages list contains all 16 required languages', () => {
  const required = [
    'typescript',
    'javascript',
    'python',
    'java',
    'go',
    'rust',
    'c',
    'cpp',
    'php',
    'ruby',
    'html',
    'css',
    'json',
    'yaml',
    'sql',
    'bash',
  ];

  for (const lang of required) {
    assert.ok(
      SUPPORTED_LANGUAGES.includes(lang as any),
      `Expected ${lang} to be included in SUPPORTED_LANGUAGES`
    );
  }
});
