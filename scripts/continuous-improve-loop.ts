#!/usr/bin/env tsx
/**
 * Continuous Improve Loop
 * Classifies test failures and suggests fixes
 */

import { promises as fs } from 'fs';

enum FailureType {
  FLAKY = 'flaky',
  MISSING_MOCK = 'missing_mock',
  SELECTOR_DRIFT = 'selector_drift',
  SCHEMA_DRIFT = 'schema_drift',
  ASYNC_ISSUE = 'async_issue',
  SEED_DATA = 'seed_data',
  PERMISSION = 'permission',
  SOCKET = 'socket',
  ENV_ISSUE = 'env_issue',
  TRUE_BUG = 'true_bug',
  TEST_ISSUE = 'test_issue'
}

interface TestFailure {
  testName: string;
  file: string;
  error: string;
  type: FailureType;
  suggestedFix?: string;
}

function classifyFailure(error: string, testName: string): FailureType {
  const errorLower = error.toLowerCase();
  
  // Pattern matching for classification
  if (errorLower.includes('timeout') || errorLower.includes('timed out')) {
    return FailureType.ASYNC_ISSUE;
  }
  
  if (errorLower.includes('econnrefused') || errorLower.includes('connection')) {
    return FailureType.ENV_ISSUE;
  }
  
  if (errorLower.includes('mock') || errorLower.includes('stub')) {
    return FailureType.MISSING_MOCK;
  }
  
  if (errorLower.includes('selector') || errorLower.includes('element not found')) {
    return FailureType.SELECTOR_DRIFT;
  }
  
  if (errorLower.includes('schema') || errorLower.includes('column') || errorLower.includes('table')) {
    return FailureType.SCHEMA_DRIFT;
  }
  
  if (errorLower.includes('permission') || errorLower.includes('unauthorized') || errorLower.includes('forbidden')) {
    return FailureType.PERMISSION;
  }
  
  if (errorLower.includes('socket') || errorLower.includes('websocket')) {
    return FailureType.SOCKET;
  }
  
  if (errorLower.includes('seed') || errorLower.includes('fixture')) {
    return FailureType.SEED_DATA;
  }
  
  // Default to true bug if can't classify
  return FailureType.TRUE_BUG;
}

function suggestFix(type: FailureType, error: string): string {
  switch (type) {
    case FailureType.ASYNC_ISSUE:
      return 'Increase timeout or fix async await pattern';
    case FailureType.ENV_ISSUE:
      return 'Check if required services are running';
    case FailureType.MISSING_MOCK:
      return 'Add mock for external service';
    case FailureType.SELECTOR_DRIFT:
      return 'Update selectors to match current UI';
    case FailureType.SCHEMA_DRIFT:
      return 'Run database migrations or update schema';
    case FailureType.PERMISSION:
      return 'Check authentication/authorization setup';
    case FailureType.SOCKET:
      return 'Verify Socket.IO connection and events';
    case FailureType.SEED_DATA:
      return 'Update test fixtures or seed data';
    default:
      return 'Investigate and fix the underlying issue';
  }
}

async function analyzeFailures(results: any): Promise<TestFailure[]> {
  const failures: TestFailure[] = [];
  
  // Parse test results and classify failures
  if (results.testResults) {
    for (const fileResult of results.testResults) {
      for (const testResult of fileResult.assertionResults || []) {
        if (testResult.status === 'failed') {
          const errorMessage = testResult.failureMessages?.join('\n') || 'Unknown error';
          const type = classifyFailure(errorMessage, testResult.title);
          
          failures.push({
            testName: testResult.title,
            file: fileResult.name,
            error: errorMessage.substring(0, 200), // Truncate
            type,
            suggestedFix: suggestFix(type, errorMessage)
          });
        }
      }
    }
  }
  
  return failures;
}

function generateHistogram(failures: TestFailure[]): Record<FailureType, number> {
  const histogram: Record<string, number> = {};
  
  for (const failure of failures) {
    histogram[failure.type] = (histogram[failure.type] || 0) + 1;
  }
  
  return histogram as Record<FailureType, number>;
}

async function generateReport(failures: TestFailure[]): Promise<void> {
  const histogram = generateHistogram(failures);
  
  let report = '# Test Failure Analysis\n\n';
  report += `**Total Failures:** ${failures.length}\n\n`;
  report += '## Failure Type Histogram\n\n';
  
  for (const [type, count] of Object.entries(histogram).sort((a, b) => b[1] - a[1])) {
    report += `- **${type}**: ${count} failures\n`;
  }
  
  report += '\n## Detailed Failures\n\n';
  
  for (const failure of failures) {
    report += `### ${failure.testName}\n`;
    report += `- **File:** ${failure.file}\n`;
    report += `- **Type:** ${failure.type}\n`;
    report += `- **Suggested Fix:** ${failure.suggestedFix}\n`;
    report += `- **Error:** ${failure.error}\n\n`;
  }
  
  await fs.writeFile('reports/test-failure-analysis.md', report);
  console.log(`\n📊 Failure analysis saved to reports/test-failure-analysis.md`);
  console.log(`\n📈 Summary:`);
  console.log(`   Total Failures: ${failures.length}`);
  for (const [type, count] of Object.entries(histogram).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${type}: ${count}`);
  }
}

async function main() {
  console.log('🔍 Analyzing test failures...\n');
  
  try {
    const resultsJson = await fs.readFile('/tmp/test-results.json', 'utf-8');
    const results = JSON.parse(resultsJson);
    
    const failures = await analyzeFailures(results);
    await generateReport(failures);
    
  } catch (error) {
    console.error('Error analyzing failures:', error);
    console.log('\n⚠️  Could not read test results. Run tests first:\n');
    console.log('   npx vitest run --reporter=json > /tmp/test-results.json\n');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { classifyFailure, suggestFix, analyzeFailures };
