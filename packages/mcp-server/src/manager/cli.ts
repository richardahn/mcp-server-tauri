import { z } from 'zod';
import { execa } from 'execa';
import fs from 'fs/promises';
import path from 'path';

export const RunCommandSchema = z.object({
   command: z.string().describe('Any Tauri CLI command (e.g., "init", "dev", "build", "android dev", "migrate", "plugin add", etc.)'),
   args: z.array(z.string()).optional().describe('Additional arguments to pass to the command'),
   cwd: z.string().describe('The project directory'),
   timeout: z.number().optional().describe('Command timeout in milliseconds (default: 180000)'),
});

/**
 * Get available Tauri commands by running 'tauri --help'
 */
export async function listTauriCommands(cwd: string): Promise<string> {
   try {
      const packageJsonPath = path.join(cwd, 'package.json');

      const hasTauriScript = await fs
         .readFile(packageJsonPath, 'utf8')
         .then((content: string): boolean => {
            try {
               const pkg = JSON.parse(content) as { scripts?: Record<string, string> };

               return Boolean(pkg.scripts && pkg.scripts.tauri);
            } catch{
               return false;
            }
         })
         .catch(() => { return false; });

      let result;

      if (hasTauriScript) {
         result = await execa('npm', [ 'run', 'tauri', '--', '--help' ], {
            cwd,
            timeout: 10000,
         });
      } else {
         result = await execa('tauri', [ '--help' ], {
            cwd,
            timeout: 10000,
         });
      }

      return result.stdout;
   } catch(error: unknown) {
      const message = error instanceof Error ? error.message : String(error);

      throw new Error(`Failed to get Tauri commands: ${message}`);
   }
}

export async function runTauriCommand(
   command: string,
   cwd: string,
   args: string[] = [],
   timeout: number = 180000
): Promise<string> {
   try {
      // Split command if it contains spaces (e.g., "android dev" or "plugin add")
      const commandParts = command.split(' ');

      const allArgs = [ ...commandParts, ...args ];

      const packageJsonPath = path.join(cwd, 'package.json');

      const hasTauriScript = await fs
         .readFile(packageJsonPath, 'utf8')
         .then((content) => {
            try {
               const pkg = JSON.parse(content) as { scripts?: Record<string, string> };

               return Boolean(pkg.scripts && pkg.scripts.tauri);
            } catch{
               return false;
            }
         })
         .catch(() => { return false; });

      const isDevLikeCommand =
         commandParts[0] === 'dev' ||
         command.startsWith('android dev') ||
         command.startsWith('ios dev');

      const spawnTauri = (): ReturnType<typeof execa> => {
         if (hasTauriScript) {
            return execa('npm', [ 'run', 'tauri', '--', ...allArgs ], {
               cwd,
               timeout: isDevLikeCommand ? undefined : timeout,
            });
         }

         return execa('tauri', allArgs, {
            cwd,
            timeout: isDevLikeCommand ? undefined : timeout,
         });
      };

      const child = spawnTauri();

      if (isDevLikeCommand) {
         // For long-running dev commands, start the process and return once the
         // command appears healthy
         child.catch(() => { return; });

         await new Promise((resolve) => {
            setTimeout(resolve, 3000);
         });

         if (child.exitCode !== null) {
            if (child.exitCode === 0) {
               return 'Tauri dev command completed successfully.';
            }

            throw new Error('Tauri dev command exited unexpectedly. Check your project configuration and logs for details.');
         }

         const text = [
            'Tauri dev command started. It may still be initializing; check your terminal',
            'or devtools logs for live output. Use Ctrl+C in the appropriate terminal to',
            'stop it.',
         ];

         return text.join(' ');
      }

      const result = await child;

      if (Array.isArray(result.stdout)) {
         return result.stdout.join('\n');
      }

      if (result.stdout instanceof Uint8Array) {
         return new TextDecoder().decode(result.stdout);
      }

      return result.stdout || 'Command completed successfully';
   } catch(error: unknown) {
      const message = error instanceof Error ? error.message : String(error),
            stderr = error && typeof error === 'object' && 'stderr' in error ? String(error.stderr) : '';

      // Provide more helpful error messages
      if (message.includes('Unknown command')) {
         throw new Error(`Unknown Tauri command: "${command}". Run 'tauri --help' to see available commands.\n${stderr}`);
      }

      if (message.includes('spawn tauri ENOENT')) {
         const msgParts = [
            'Failed to run the Tauri CLI. Either add a "tauri" script to your',
            'package.json (e.g., "tauri": "tauri") or install the global Tauri CLI',
            'as described in the documentation, then try again.',
         ];

         throw new Error(msgParts.join(' '));
      }

      throw new Error(`Tauri command failed: ${message}${stderr ? `\n${stderr}` : ''}`);
   }
}
