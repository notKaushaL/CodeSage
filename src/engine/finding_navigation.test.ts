import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isEditableElement,
  getOrderedFindings,
  getNextFindingIndex,
  getPrevFindingIndex,
} from '../utils/navigation';
import { DiffFile, Finding } from './types';

test('FINDING NAVIGATION 1: getNextFindingIndex wraps around properly', () => {
  assert.equal(getNextFindingIndex(-1, 3), 0);
  assert.equal(getNextFindingIndex(0, 3), 1);
  assert.equal(getNextFindingIndex(1, 3), 2);
  assert.equal(getNextFindingIndex(2, 3), 0); // wrap-around
  assert.equal(getNextFindingIndex(0, 0), -1);
});

test('FINDING NAVIGATION 2: getPrevFindingIndex wraps around backwards properly', () => {
  assert.equal(getPrevFindingIndex(-1, 3), 2); // starts from end
  assert.equal(getPrevFindingIndex(2, 3), 1);
  assert.equal(getPrevFindingIndex(1, 3), 0);
  assert.equal(getPrevFindingIndex(0, 3), 2); // wrap-around
  assert.equal(getPrevFindingIndex(0, 0), -1);
});

test('FINDING NAVIGATION 3: getOrderedFindings orders findings by file and line number', () => {
  const files: DiffFile[] = [
    {
      oldPath: 'src/fileA.ts',
      newPath: 'src/fileA.ts',
      isNew: false,
      isDeleted: false,
      isRename: false,
      language: 'TypeScript',
      hunks: [],
      addedLineCount: 1,
      deletedLineCount: 0,
    },
    {
      oldPath: 'src/fileB.ts',
      newPath: 'src/fileB.ts',
      isNew: false,
      isDeleted: false,
      isRename: false,
      language: 'TypeScript',
      hunks: [],
      addedLineCount: 2,
      deletedLineCount: 0,
    },
  ];

  const findings: Finding[] = [
    {
      id: 'f-b2',
      file_path: 'src/fileB.ts',
      line_number: 50,
      severity: 'MEDIUM',
      category: 'BUG',
      title: 'B Line 50',
      description: 'desc',
      confidence: 0.8,
      source: 'GEMINI_ENGINE',
    },
    {
      id: 'f-a2',
      file_path: 'src/fileA.ts',
      line_number: 30,
      severity: 'CRITICAL',
      category: 'SECURITY',
      title: 'A Line 30',
      description: 'desc',
      confidence: 0.9,
      source: 'STATIC_ANALYZER',
    },
    {
      id: 'f-a1',
      file_path: 'src/fileA.ts',
      line_number: 10,
      severity: 'HIGH',
      category: 'SECURITY',
      title: 'A Line 10',
      description: 'desc',
      confidence: 0.85,
      source: 'STATIC_ANALYZER',
    },
  ];

  const ordered = getOrderedFindings(files, findings);
  assert.equal(ordered.length, 3);
  assert.equal(ordered[0].finding.id, 'f-a1');
  assert.equal(ordered[0].fileIndex, 0);
  assert.equal(ordered[0].lineNumber, 10);

  assert.equal(ordered[1].finding.id, 'f-a2');
  assert.equal(ordered[1].fileIndex, 0);
  assert.equal(ordered[1].lineNumber, 30);

  assert.equal(ordered[2].finding.id, 'f-b2');
  assert.equal(ordered[2].fileIndex, 1);
  assert.equal(ordered[2].lineNumber, 50);
});

test('FINDING NAVIGATION 4: Filters findings by selected category and severity', () => {
  const files: DiffFile[] = [
    {
      oldPath: 'test.py',
      newPath: 'test.py',
      isNew: false,
      isDeleted: false,
      isRename: false,
      language: 'Python',
      hunks: [],
      addedLineCount: 1,
      deletedLineCount: 0,
    },
  ];

  const findings: Finding[] = [
    {
      id: 'f1',
      file_path: 'test.py',
      line_number: 1,
      severity: 'CRITICAL',
      category: 'SECURITY',
      title: 'Crit Sec',
      description: '',
      confidence: 0.9,
      source: 'STATIC_ANALYZER',
    },
    {
      id: 'f2',
      file_path: 'test.py',
      line_number: 2,
      severity: 'LOW',
      category: 'PERFORMANCE',
      title: 'Low Perf',
      description: '',
      confidence: 0.8,
      source: 'GEMINI_ENGINE',
    },
  ];

  const filteredSec = getOrderedFindings(files, findings, 'SECURITY', null);
  assert.equal(filteredSec.length, 1);
  assert.equal(filteredSec[0].finding.id, 'f1');

  const filteredCrit = getOrderedFindings(files, findings, null, 'CRITICAL');
  assert.equal(filteredCrit.length, 1);
  assert.equal(filteredCrit[0].finding.id, 'f1');
});

test('FINDING NAVIGATION 5: isEditableElement correctly identifies inputs vs passive elements', () => {
  const inputEl = {
    tagName: 'INPUT',
    isContentEditable: false,
    getAttribute: () => null,
    closest: () => null,
  };
  assert.equal(isEditableElement(inputEl as any), true);

  const textareaEl = {
    tagName: 'TEXTAREA',
    isContentEditable: false,
    getAttribute: () => null,
    closest: () => null,
  };
  assert.equal(isEditableElement(textareaEl as any), true);

  const selectEl = {
    tagName: 'SELECT',
    isContentEditable: false,
    getAttribute: () => null,
    closest: () => null,
  };
  assert.equal(isEditableElement(selectEl as any), true);

  const contentEditableEl = {
    tagName: 'DIV',
    isContentEditable: true,
    getAttribute: () => 'true',
    closest: () => null,
  };
  assert.equal(isEditableElement(contentEditableEl as any), true);

  const regularDiv = {
    tagName: 'DIV',
    isContentEditable: false,
    getAttribute: () => null,
    closest: () => null,
  };
  assert.equal(isEditableElement(regularDiv as any), false);

  const regularButton = {
    tagName: 'BUTTON',
    isContentEditable: false,
    getAttribute: () => null,
    closest: () => null,
  };
  assert.equal(isEditableElement(regularButton as any), false);

  assert.equal(isEditableElement(null), false);
});
