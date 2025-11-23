import { z } from 'zod';
import { execa } from 'execa';

export const ListDevicesSchema = z.object({});

async function getAndroidDevices(): Promise<string[]> {
   try {
      const { stdout } = await execa('adb', [ 'devices', '-l' ]);

      return stdout
         .split('\n')
         .slice(1)
         .filter((line) => { return line.trim().length > 0; })
         .map((line) => { return line.trim(); });
   } catch(_) {
      // Android SDK not available or adb command failed
      return [];
   }
}

async function getIOSSimulators(): Promise<string[]> {
   if (process.platform !== 'darwin') {
      return [];
   }

   try {
      const { stdout } = await execa('xcrun', [ 'simctl', 'list', 'devices', 'booted' ]);

      return stdout
         .split('\n')
         .filter((line) => { return line.trim().length > 0 && !line.includes('== Devices =='); });
   } catch(_) {
      // Xcode not installed or xcrun command failed
      return [];
   }
}

export async function listDevices(): Promise<{ android: string[]; ios: string[] }> {
   const [ android, ios ] = await Promise.all([
      getAndroidDevices(),
      getIOSSimulators(),
   ]);

   return { android, ios };
}

export const LaunchEmulatorSchema = z.object({
   platform: z.enum([ 'android', 'ios' ]),
   name: z.string().describe('Name of the AVD or Simulator'),
});

export async function launchEmulator(platform: string, name: string): Promise<string> {
   if (platform === 'android') {
      try {
         // Launch Android Emulator - Try to spawn, but immediately await to catch ENOENT
         await execa('emulator', [ '-avd', name ], {
            detached: true,
            stdio: 'ignore',
            timeout: 1000, // Just check if it spawns
         });
         return `Launching Android AVD: ${name}`;
      } catch(error: unknown) {
         const message = error instanceof Error ? error.message : String(error);

         throw new Error(`Failed to launch Android emulator: ${message}`);
      }
   } else if (platform === 'ios') {
      // Check if we're on macOS first
      if (process.platform !== 'darwin') {
         throw new Error('iOS simulators are only available on macOS');
      }

      try {
         // Launch iOS Simulator
         await execa('xcrun', [ 'simctl', 'boot', name ]);
         await execa('open', [ '-a', 'Simulator' ]);
         return `Booted iOS Simulator: ${name}`;
      } catch(error: unknown) {
         const message = error instanceof Error ? error.message : String(error);

         // Provide more helpful error messages
         if (message.includes('xcrun: error')) {
            throw new Error('Xcode is not installed. Please install Xcode from the App Store to use iOS simulators.');
         }
         throw new Error(`Failed to launch iOS simulator: ${message}`);
      }
   } else {
      throw new Error(`Unsupported platform: ${platform}. Use 'android' or 'ios'.`);
   }
}
