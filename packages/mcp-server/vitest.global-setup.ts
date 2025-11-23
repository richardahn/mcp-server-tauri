import { spawn, ChildProcess } from 'child_process';
import path from 'path';

const TEST_APP_PATH = path.resolve(process.cwd(), '../test-app');

// Detect GitHub CI environment and use longer timeout
// eslint-disable-next-line no-process-env
const IS_CI = Boolean(process.env.CI || process.env.GITHUB_ACTIONS);

const STARTUP_TIMEOUT_MS = IS_CI ? 480000 : 30000; // 4 minutes in CI, 30 seconds locally

let tauriProcess: ChildProcess | null = null,
    isShuttingDown = false;

async function startGlobalTestApp(): Promise<void> {
   return new Promise((resolve, reject) => {
      console.log('🚀 Starting Tauri app globally (once for all tests)...');

      tauriProcess = spawn('npm', [ 'run', 'tauri', 'dev' ], {
         cwd: TEST_APP_PATH,
         stdio: 'pipe',
         shell: true,
         detached: process.platform !== 'win32',
         // eslint-disable-next-line no-process-env
         env: { ...process.env, WEBKIT_DISABLE_COMPOSITING_MODE: '1' },
      });

      if (!tauriProcess.stdout || !tauriProcess.stderr) {
         reject(new Error('Failed to spawn Tauri process'));
         return;
      }

      let appReady = false,
          pluginReady = false;

      const checkReady = (): void => {
         if (appReady && pluginReady) {
            console.log('✅ Global test environment ready!');
            resolve();
         }
      };

      tauriProcess.stdout.on('data', (data) => {
         const output = data.toString();

         // Only log important messages
         if (output.includes('Local:') || output.includes('MCP Bridge') || output.includes('WebSocket server')) {
            console.log('[App]:', output.trim());
         }

         if (!appReady && (output.includes('Local:') || output.includes('http://localhost:1420'))) {
            appReady = true;
            console.log('✓ Vite server ready');
            checkReady();
         }

         if (!pluginReady && output.includes('MCP Bridge WebSocket server listening')) {
            pluginReady = true;
            console.log('✓ MCP Bridge plugin ready');
            checkReady();
         }
      });

      tauriProcess.stderr.on('data', (data) => {
         // Don't log anything during shutdown
         if (isShuttingDown) {
            return;
         }

         const err = data.toString(),
               noisePatterns = [ 'Compiling', 'Building', 'Finished', 'Info', 'Running', 'npm warn' ],
               isNoise = noisePatterns.some((p) => { return err.includes(p); });

         if (!isNoise) {
            console.error('[App Error]:', err.trim());
         }
      });

      tauriProcess.on('error', (error) => {
         // Don't log anything during shutdown
         if (isShuttingDown) {
            return;
         }

         console.error('Failed to start Tauri process:', error);
         reject(error);
      });

      // Timeout for app startup
      setTimeout(() => {
         if (!appReady || !pluginReady) {
            reject(new Error(`Tauri app failed to start within ${STARTUP_TIMEOUT_MS / 1000}s timeout`));
         }
      }, STARTUP_TIMEOUT_MS);
   });
}

function stopGlobalTestApp(): void {
   if (tauriProcess) {
      console.log('🛑 Stopping global Tauri app...');
      isShuttingDown = true;

      try {
         if (process.platform === 'win32') {
            const pid = tauriProcess.pid;

            if (pid) {
               spawn('taskkill', [ '/pid', pid.toString(), '/f', '/t' ]);
            }
         } else {
            // Kill the entire process group
            const pid = tauriProcess.pid;

            if (pid) {
               process.kill(-pid, 'SIGTERM');
            }
         }
      } catch(error: unknown) {
         console.error('Error stopping Tauri app:', error);
      }

      tauriProcess = null;
   }
}

export async function setup(): Promise<void> {
   await startGlobalTestApp();

   // Store the process reference globally so tests can access it
   (global as Record<string, unknown>).__TAURI_APP_STARTED = true;
}

export async function teardown(): Promise<void> {
   stopGlobalTestApp();
   (global as Record<string, unknown>).__TAURI_APP_STARTED = false;
}
