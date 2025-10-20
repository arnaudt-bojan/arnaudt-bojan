import { describe, it, expect } from 'vitest';
import { classifyFailure } from './pattern-classifier';
import { generateFixProposal } from './auto-fix-proposals';
import { captureFailure, saveFailureSnapshot } from './failure-capture';

describe('Auto-Debug System @debug', () => {
  it('should classify database connection errors', () => {
    const error = 'Error: ECONNREFUSED - database connection failed';
    const stack = 'at Database.connect';

    const classification = classifyFailure(error, stack);

    expect(classification.pattern).toBe('database_connection');
    expect(classification.confidence).toBeGreaterThan(0.8);
  });

  it('should classify authentication errors', () => {
    const error = 'Error: Unauthorized - 401';
    const stack = 'at auth.middleware';

    const classification = classifyFailure(error, stack);

    expect(classification.pattern).toBe('authentication');
    expect(classification.confidence).toBeGreaterThan(0.7);
  });

  it('should generate fix proposals', () => {
    const proposal = generateFixProposal('database_connection', 'ECONNREFUSED');

    expect(proposal.steps.length).toBeGreaterThan(0);
    expect(proposal.automated).toBe(false);
  });

  it('should generate automated fix proposals', () => {
    const proposal = generateFixProposal('validation', 'Validation error');

    expect(proposal.automated).toBe(true);
    expect(proposal.code).toBeDefined();
  });

  it('should capture failure snapshots', () => {
    const mockTest = {
      file: 'test.spec.ts',
      name: 'should test something'
    };

    const mockError = new Error('Test failure');
    mockError.stack = 'at test.spec.ts:10:20';

    const snapshot = captureFailure(mockTest, mockError);

    expect(snapshot.testFile).toBe('test.spec.ts');
    expect(snapshot.error).toBe('Test failure');
    expect(snapshot.timestamp).toBeDefined();
  });
});
