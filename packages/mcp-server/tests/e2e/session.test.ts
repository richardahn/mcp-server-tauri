import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { manageDriverSession } from '../../src/driver/session-manager';

describe('Session Manager E2E Tests', () => {
   const TIMEOUT = 30000;

   beforeAll(async () => {
      // App is already started globally by the test setup
   }, TIMEOUT);

   afterAll(async () => {
      // Clean up session
      await manageDriverSession('stop');
   }, TIMEOUT);

   describe('Session Start with Default Settings', () => {
      it('should start session with localhost by default', async () => {
         const result = await manageDriverSession('start');

         expect(result).toContain('Session started');
         // Should connect to localhost since the test app is running locally
         expect(result).toMatch(/localhost|127\.0\.0\.1/);
      }, TIMEOUT);

      it('should stop session successfully', async () => {
         const result = await manageDriverSession('stop');

         expect(result).toBe('Session stopped');
      }, TIMEOUT);
   });

   describe('Session Start with Custom Port', () => {
      it('should start session on default port 9223', async () => {
         const result = await manageDriverSession('start', undefined, 9223);

         expect(result).toContain('Session started');
         expect(result).toContain('9223');
      }, TIMEOUT);

      afterAll(async () => {
         await manageDriverSession('stop');
      });
   });

   describe('Session Start with Explicit Host', () => {
      it('should try localhost first even when remote host is specified', async () => {
         // When a remote host is specified but localhost works, it should use localhost
         const result = await manageDriverSession('start', '192.168.1.100');

         expect(result).toContain('Session started');
         // Should have connected to localhost since that's where the test app is running
         expect(result).toContain('localhost');
      }, TIMEOUT);

      afterAll(async () => {
         await manageDriverSession('stop');
      });
   });

   describe('Session Start with localhost Host', () => {
      it('should connect directly to localhost without fallback', async () => {
         const result = await manageDriverSession('start', 'localhost');

         expect(result).toContain('Session started');
         expect(result).toContain('localhost');
      }, TIMEOUT);

      afterAll(async () => {
         await manageDriverSession('stop');
      });
   });

   describe('Session Start with 127.0.0.1 Host', () => {
      it('should connect directly to 127.0.0.1 without fallback', async () => {
         const result = await manageDriverSession('start', '127.0.0.1');

         expect(result).toContain('Session started');
         // Should work since 127.0.0.1 is localhost
         expect(result).toMatch(/127\.0\.0\.1|localhost/);
      }, TIMEOUT);

      afterAll(async () => {
         await manageDriverSession('stop');
      });
   });

   describe('Session with Custom Host and Port', () => {
      it('should accept both host and port parameters', async () => {
         // Use localhost with default port - should work
         const result = await manageDriverSession('start', 'localhost', 9223);

         expect(result).toContain('Session started');
         expect(result).toContain('localhost');
         expect(result).toContain('9223');
      }, TIMEOUT);

      afterAll(async () => {
         await manageDriverSession('stop');
      });
   });
});
