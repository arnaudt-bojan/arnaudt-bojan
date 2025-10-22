#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { classifyFailure } from '../tests/archive/debug-tools/pattern-classifier';
import { generateFixProposal } from '../tests/archive/debug-tools/auto-fix-proposals';

const failuresDir = path.join(process.cwd(), '.test-failures');

if (!fs.existsSync(failuresDir)) {
  console.log('No failures found');
  process.exit(0);
}

const failures = fs.readdirSync(failuresDir)
  .filter(f => f.endsWith('.json'))
  .sort()
  .reverse();

if (failures.length === 0) {
  console.log('No failures found');
  process.exit(0);
}

const latestFailure = failures[0];
const failurePath = path.join(failuresDir, latestFailure);
const snapshot = JSON.parse(fs.readFileSync(failurePath, 'utf-8'));

console.log('\n=== AUTO-DEBUG ANALYSIS ===\n');
console.log(`Test: ${snapshot.testFile} - ${snapshot.testName}`);
console.log(`Error: ${snapshot.error}`);
console.log(`Timestamp: ${snapshot.timestamp}\n`);

const classification = classifyFailure(snapshot.error, snapshot.stack);
console.log(`Pattern: ${classification.pattern} (${Math.round(classification.confidence * 100)}% confidence)`);
console.log(`Description: ${classification.description}\n`);

const proposal = generateFixProposal(classification.pattern, snapshot.error);
console.log('=== FIX PROPOSAL ===\n');
console.log(`Automated: ${proposal.automated ? 'YES' : 'NO'}\n`);
console.log('Steps:');
proposal.steps.forEach((step: string) => console.log(`  ${step}`));

if (proposal.code) {
  console.log('\nSuggested Code:');
  console.log(proposal.code);
}

console.log('\n=== RECENT COMMITS ===');
snapshot.recentCommits.forEach((commit: string) => console.log(`  ${commit}`));

console.log('\nRun `npm run test` to verify the fix');
