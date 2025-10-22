import { FailurePattern } from './pattern-classifier';

interface FixProposal {
  pattern: FailurePattern;
  steps: string[];
  code?: string;
  automated: boolean;
}

export function generateFixProposal(pattern: FailurePattern, error: string): FixProposal {
  switch (pattern) {
    case 'database_connection':
      return {
        pattern,
        automated: false,
        steps: [
          '1. Check if PostgreSQL is running: `ps aux | grep postgres`',
          '2. Verify DATABASE_URL environment variable is set',
          '3. Test connection: `npx prisma db pull`',
          '4. Restart database if needed'
        ],
        code: `// Verify connection in test setup
beforeAll(async () => {
  await db.$connect();
});

afterAll(async () => {
  await db.$disconnect();
});`
      };

    case 'authentication':
      return {
        pattern,
        automated: true,
        steps: [
          '1. Ensure createBuyerSession() is called before authenticated requests',
          '2. Verify session cookie is set: .set("Cookie", `connect.sid=${session}`)',
          '3. Check auth middleware is not blocking test requests'
        ],
        code: `// Add session to request
const session = await createBuyerSession();
const res = await request(app)
  .get('/api/protected-route')
  .set('Cookie', \`connect.sid=\${session}\`)
  .expect(200);`
      };

    case 'validation':
      return {
        pattern,
        automated: true,
        steps: [
          '1. Review Zod schema for the endpoint',
          '2. Ensure test data matches schema requirements',
          '3. Add missing required fields or fix data types'
        ],
        code: `// Check schema and fix test data
const validData = {
  // Add all required fields from schema
  email: 'test@example.com',
  password: 'ValidPassword123!',
  // ... other required fields
};`
      };

    case 'timeout':
      return {
        pattern,
        automated: true,
        steps: [
          '1. Increase test timeout: it("test", async () => {...}, 10000)',
          '2. Check if server is responding slowly',
          '3. Consider mocking slow external services'
        ],
        code: `// Increase timeout for slow operations
it('should complete slow operation', async () => {
  // test code
}, 10000); // 10 second timeout`
      };

    case 'type_error':
      return {
        pattern,
        automated: true,
        steps: [
          '1. Add null checks before accessing properties',
          '2. Use optional chaining: object?.property',
          '3. Provide default values: object ?? defaultValue'
        ],
        code: `// Add null safety
if (!user?.id) {
  throw new Error('User ID is required');
}
await doSomething(user.id);`
      };

    default:
      return {
        pattern: 'unknown',
        automated: false,
        steps: [
          '1. Review error message and stack trace',
          '2. Check recent code changes: git diff HEAD',
          '3. Search for similar issues in test history',
          '4. Add debugging logs to isolate the problem'
        ]
      };
  }
}
