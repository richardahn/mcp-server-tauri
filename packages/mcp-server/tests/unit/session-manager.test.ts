import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Session Manager Unit Tests', () => {
   const originalEnv = process.env;

   beforeEach(() => {
      vi.resetModules();
      vi.clearAllMocks();
      process.env = { ...originalEnv };
      delete process.env.MCP_BRIDGE_HOST;
      delete process.env.MCP_BRIDGE_PORT;
      delete process.env.TAURI_DEV_HOST;
   });

   afterEach(() => {
      process.env = originalEnv;
   });

   describe('ManageDriverSessionSchema', () => {
      it('should validate action: start', async () => {
         const { ManageDriverSessionSchema } = await import('../../src/driver/session-manager');

         const result = ManageDriverSessionSchema.parse({ action: 'start' });

         expect(result.action).toBe('start');
      });

      it('should validate action: stop', async () => {
         const { ManageDriverSessionSchema } = await import('../../src/driver/session-manager');

         const result = ManageDriverSessionSchema.parse({ action: 'stop' });

         expect(result.action).toBe('stop');
      });

      it('should accept optional host parameter', async () => {
         const { ManageDriverSessionSchema } = await import('../../src/driver/session-manager');

         const result = ManageDriverSessionSchema.parse({
            action: 'start',
            host: '192.168.1.100',
         });

         expect(result.host).toBe('192.168.1.100');
      });

      it('should accept optional port parameter', async () => {
         const { ManageDriverSessionSchema } = await import('../../src/driver/session-manager');

         const result = ManageDriverSessionSchema.parse({
            action: 'start',
            port: 9225,
         });

         expect(result.port).toBe(9225);
      });

      it('should accept both host and port parameters', async () => {
         const { ManageDriverSessionSchema } = await import('../../src/driver/session-manager');

         const result = ManageDriverSessionSchema.parse({
            action: 'start',
            host: '10.0.0.50',
            port: 9300,
         });

         expect(result.host).toBe('10.0.0.50');
         expect(result.port).toBe(9300);
      });

      it('should reject invalid action', async () => {
         const { ManageDriverSessionSchema } = await import('../../src/driver/session-manager');

         expect(() => { return ManageDriverSessionSchema.parse({ action: 'invalid' }); }).toThrow();
      });

      it('should have correct description for host parameter', async () => {
         const { ManageDriverSessionSchema } = await import('../../src/driver/session-manager');

         const hostField = ManageDriverSessionSchema.shape.host;

         expect(hostField.description).toContain('Host address');
         expect(hostField.description).toContain('MCP_BRIDGE_HOST');
         expect(hostField.description).toContain('TAURI_DEV_HOST');
      });

      it('should have correct description for port parameter', async () => {
         const { ManageDriverSessionSchema } = await import('../../src/driver/session-manager');

         const portField = ManageDriverSessionSchema.shape.port;

         expect(portField.description).toContain('Port');
         expect(portField.description).toContain('9223');
      });
   });
});
