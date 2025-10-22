import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

interface FailureSnapshot {
  testFile: string;
  testName: string;
  error: string;
  stack: string;
  timestamp: string;
  gitDiff: string;
  recentCommits: string[];
  environment: Record<string, any>;
}

export function captureFailure(test: any, error: Error): FailureSnapshot {
  const snapshot: FailureSnapshot = {
    testFile: test.file || 'unknown',
    testName: test.name || 'unknown',
    error: error.message,
    stack: error.stack || '',
    timestamp: new Date().toISOString(),
    gitDiff: '',
    recentCommits: [],
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      cwd: process.cwd()
    }
  };

  // Capture git diff
  try {
    snapshot.gitDiff = execSync('git diff HEAD', { encoding: 'utf-8' });
  } catch {}

  // Capture recent commits
  try {
    const commits = execSync('git log -5 --oneline', { encoding: 'utf-8' });
    snapshot.recentCommits = commits.split('\n').filter(Boolean);
  } catch {}

  return snapshot;
}

export function saveFailureSnapshot(snapshot: FailureSnapshot) {
  const dir = path.join(process.cwd(), '.test-failures');
  fs.mkdirSync(dir, { recursive: true });

  const filename = `failure-${Date.now()}.json`;
  const filePath = path.join(dir, filename);

  fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2));
  console.log(`Failure snapshot saved to ${filePath}`);
  
  return filePath;
}
