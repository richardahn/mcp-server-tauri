import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';

// Tauri supports multiple configuration files
const TAURI_CONFIG_FILES = [
   'tauri.conf.json',
   'tauri.conf.json5',
   'Tauri.toml',
   // Platform-specific configs
   'tauri.windows.conf.json',
   'tauri.linux.conf.json',
   'tauri.macos.conf.json',
   'tauri.android.conf.json',
   'tauri.ios.conf.json',
   // Build-specific configs
   'tauri.conf.dev.json',
   'tauri.conf.prod.json',
   // Project files
   'Cargo.toml',
   'package.json',
   // Mobile-specific files
   'Info.plist',
   'AndroidManifest.xml',
] as const;

export const ReadConfigSchema = z.object({
   projectPath: z.string(),
   file: z.enum(TAURI_CONFIG_FILES).describe('Tauri configuration file to read'),
});

export const WriteConfigSchema = z.object({
   projectPath: z.string(),
   file: z.enum(TAURI_CONFIG_FILES).describe('Tauri configuration file to write'),
   content: z.string().describe('The new content of the file'),
});

export async function readConfig(projectPath: string, file: string): Promise<string> {
   const filePath = path.join(projectPath, getRelativePath(file));

   try {
      const content = await fs.readFile(filePath, 'utf-8');

      return content;
   } catch(error) {
      throw new Error(`Failed to read ${file}: ${error}`);
   }
}

/**
 * List all available Tauri configuration files in the project
 */
export async function listConfigFiles(projectPath: string): Promise<string[]> {
   const availableFiles: string[] = [];

   for (const file of TAURI_CONFIG_FILES) {
      const filePath = path.join(projectPath, getRelativePath(file));

      try {
         await fs.access(filePath);
         availableFiles.push(file);
      } catch(e) {
         // File doesn't exist, skip it
      }
   }

   return availableFiles;
}

export async function writeConfig(projectPath: string, file: string, content: string): Promise<string> {
   const filePath = path.join(projectPath, getRelativePath(file));

   // Validate JSON files
   if (file.endsWith('.json')) {
      try {
         JSON.parse(content);
      } catch(e) {
         throw new Error(`Invalid JSON content for ${file}`);
      }
   }

   // Validate JSON5 files
   if (file.endsWith('.json5')) {
      // JSON5 is a superset of JSON, basic validation
      // In production, you'd want to use a json5 parser
      try {
         // At minimum, check for basic syntax
         if (!content.trim()) {
            throw new Error(`Empty content for ${file}`);
         }
      } catch(e) {
         throw new Error(`Invalid content for ${file}`);
      }
   }

   // Validate TOML files
   if (file.endsWith('.toml')) {
      // Basic TOML validation - in production use a TOML parser
      if (!content.trim()) {
         throw new Error(`Empty content for ${file}`);
      }
   }

   // Validate XML files
   if (file.endsWith('.xml')) {
      // Basic XML validation
      if (!content.includes('<') || !content.includes('>')) {
         throw new Error(`Invalid XML content for ${file}`);
      }
   }

   // Validate plist files
   if (file.endsWith('.plist')) {
      // plist files are XML-based
      if (!content.includes('<?xml') || !content.includes('<plist')) {
         throw new Error(`Invalid plist content for ${file}`);
      }
   }

   try {
      await fs.writeFile(filePath, content, 'utf-8');
      return `Successfully wrote to ${file}`;
   } catch(error) {
      throw new Error(`Failed to write ${file}: ${error}`);
   }
}

function getRelativePath(file: string): string {
   // Main Tauri config files
   if (file === 'tauri.conf.json' || file === 'tauri.conf.json5' || file === 'Tauri.toml') {
      return `src-tauri/${file}`;
   }

   // Platform-specific Tauri configs
   if (file.startsWith('tauri.') && (file.endsWith('.conf.json') || file.endsWith('.conf.json5'))) {
      return `src-tauri/${file}`;
   }

   // Cargo.toml
   if (file === 'Cargo.toml') {
      return 'src-tauri/Cargo.toml';
   }

   // iOS Info.plist
   if (file === 'Info.plist') {
      return 'src-tauri/gen/apple/Runner/Info.plist';
   }

   // Android manifest
   if (file === 'AndroidManifest.xml') {
      return 'src-tauri/gen/android/app/src/main/AndroidManifest.xml';
   }

   // Package.json is at root
   if (file === 'package.json') {
      return 'package.json';
   }

   // Default: assume it's relative to project root
   return file;
}
