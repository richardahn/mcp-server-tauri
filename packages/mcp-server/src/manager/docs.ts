import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';
import { execa } from 'execa';

export const GetDocsSchema = z.object({
   projectPath: z.string().describe('Path to the Tauri project'),
});

export async function getDocs(projectPath: string): Promise<string> {
   try {
      const version = await getTauriVersion(projectPath),
            isV2 = version.startsWith('2'),
            docs = await fetchDocs(version, isV2);

      return docs;
   } catch(error) {
      return `Error getting docs: ${error}`;
   }
}

async function getTauriVersion(projectPath: string): Promise<string> {
   try {
      // 1. Try 'cargo tree' to get the exact resolved version of the tauri crate
      try {
         const { stdout } = await execa('cargo', [ 'tree', '-p', 'tauri', '--depth', '0' ], { cwd: path.join(projectPath, 'src-tauri') }),
               match = stdout.match(/tauri v([\d.]+)/);

         if (match && match[1]) {
            return match[1];
         }
      } catch(e) {
         // Ignore
      }

      // 2. Try 'npm list' for the CLI version
      try {
         const { stdout } = await execa('npm', [ 'list', '@tauri-apps/cli', '--depth=0', '--json' ], { cwd: projectPath }),
               pkg = JSON.parse(stdout);

         if (pkg.dependencies?.['@tauri-apps/cli']?.version) {
            return pkg.dependencies['@tauri-apps/cli'].version;
         }
      } catch(e) {
         // Ignore
      }

      // 3. Fallback: Read Cargo.toml manually
      const cargoPath = path.join(projectPath, 'src-tauri', 'Cargo.toml'),
            cargoContent = await fs.readFile(cargoPath, 'utf-8'),
            match = cargoContent.match(/tauri\s*=\s*{?[^}]*version\s*=\s*"([^"]+)"/);

      if (match && match[1]) {
         return match[1];
      }

      // 4. Fallback: Read package.json
      const pkgPath = path.join(projectPath, 'package.json'),
            pkgContent = await fs.readFile(pkgPath, 'utf-8'),
            pkgJson = JSON.parse(pkgContent),
            cliVersion = pkgJson.devDependencies?.['@tauri-apps/cli'] || pkgJson.dependencies?.['@tauri-apps/cli'];

      if (cliVersion) {
         return cliVersion.replace('^', '').replace('~', '');
      }

      return 'unknown';
   } catch(e) {
      return 'unknown';
   }
}

// Exported for testing
export async function fetchDocs(version: string, isV2: boolean): Promise<string> {
   const branch = isV2 ? 'v2' : 'v1',
         treeUrl = `https://api.github.com/repos/tauri-apps/tauri-docs/git/trees/${branch}?recursive=1`,
         rawBaseUrl = `https://raw.githubusercontent.com/tauri-apps/tauri-docs/${branch}`;

   try {
      // Fetching file tree from ${treeUrl}...
      const treeResponse = await fetch(treeUrl, {
         headers: {
            'User-Agent': 'mcp-server-tauri', // GitHub API requires User-Agent
         },
      });

      if (!treeResponse.ok) {
         throw new Error(`Failed to fetch file tree: ${treeResponse.status} ${treeResponse.statusText}`);
      }

      interface TreeItem {
         type: string;
         path: string;
      }
      const treeData = (await treeResponse.json()) as { tree: TreeItem[] },
            relevantFiles = filterRelevantFiles(treeData.tree, isV2);

      // Found ${relevantFiles.length} relevant documentation files.

      let combinedDocs = `# Tauri ${isV2 ? 'v2' : 'v1'} Documentation (Dynamically Fetched)\n\n`;

      combinedDocs += `Version Detected: ${version}\n`;
      combinedDocs += `Source: ${rawBaseUrl}\n\n`;

      // Fetch content in batches to be polite and avoid timeouts
      const batchSize = 5;

      for (let i = 0; i < relevantFiles.length; i += batchSize) {
         const batch = relevantFiles.slice(i, i + batchSize),
               results = await Promise.all(batch.map((file) => { return fetchContent(rawBaseUrl, file); }));

         combinedDocs += results.join('\n\n');
      }

      return combinedDocs;
   } catch(e) {
      // Error fetching dynamic docs: ${e}
      return `Error fetching dynamic docs: ${e}\n\n` + getStaticFallback(version, isV2);
   }
}

interface TreeItem {
   type: string;
   path: string;
}

function isExcludedPath(filePath: string): boolean {
   // Check for common exclusions
   if (filePath.includes('/blog/') || filePath.includes('/_') || filePath.includes('/translations/')) {
      return true;
   }

   // Check file extensions
   if (!filePath.endsWith('.md') && !filePath.endsWith('.mdx')) {
      return true;
   }

   // Check for hidden or node_modules
   if (filePath.startsWith('.') || filePath.includes('/node_modules/')) {
      return true;
   }

   // Check for blog posts
   if (filePath.startsWith('blog/') || filePath.includes('/blog/')) {
      return true;
   }

   return false;
}

function isTranslationPath(filePath: string): boolean {
   const langCodes = [ 'fr', 'es', 'it', 'ja', 'ko', 'zh-cn', 'zh-tw', 'pt-br', 'ru', 'de' ];

   for (const lang of langCodes) {
      const hasLang = filePath.includes(`/${lang}/`) || filePath.includes(`/_${lang}/`) ||
          filePath.startsWith(`${lang}/`) || filePath.startsWith(`_${lang}/`);

      if (hasLang) {
         return true;
      }
   }
   return false;
}

function filterRelevantFiles(tree: TreeItem[], isV2: boolean): TreeItem[] {
   return tree.filter((item) => {
      if (item.type !== 'blob') {
         return false;
      }

      const file = item as TreeItem;

      if (isExcludedPath(file.path) || isTranslationPath(file.path)) {
         return false;
      }

      if (isV2) {
         // v2 docs are in src/content/docs
         if (!file.path.startsWith('src/content/docs/')) {
            return false;
         }
         // Exclude fragments and templates
         if (file.path.includes('/_fragments/') || file.path.includes('/.templates/')) {
            return false;
         }
      } else {
         // v1 docs are in docs/
         if (!file.path.startsWith('docs/')) {
            return false;
         }
         // Exclude templates
         if (file.path.includes('/.templates/')) {
            return false;
         }
      }

      return true;
   });
}

async function fetchContent(baseUrl: string, file: TreeItem): Promise<string> {
   try {
      const url = `${baseUrl}/${file.path}`,
            response = await fetch(url);

      if (!response.ok) {
         return `## ${file.path}\n\n(Failed to fetch: ${response.status})\n`;
      }
      const text = await response.text();

      // Remove frontmatter
      const cleanText = text.replace(/^---[\s\S]*?---\n/, '');

      return `## ${file.path}\n\n${cleanText}\n\n---\n`;
   } catch(e) {
      return `## ${file.path}\n\n(Error fetching content: ${e})\n`;
   }
}

function getStaticFallback(version: string, isV2: boolean): string {
   if (isV2) {
      return `# Tauri v2 Static Fallback
(Dynamic fetching failed. This is a minimal fallback.)

## Core Concepts
- **Frontend**: Web technologies (HTML/CSS/JS).
- **Backend**: Rust.
- **IPC**: Use \`invoke\` to call Rust commands.

## Security
- Enable capabilities in \`src-tauri/capabilities\`.
- Configure permissions in \`tauri.conf.json\`.
`;
   }

   return `# Tauri v1 LLM Cheat Sheet
Version Detected: ${version}
Documentation: https://tauri.app/v1/api/

## Core Concepts
- **Frontend**: Web technologies.
- **Backend**: Rust.
- **IPC**: \`invoke\` and \`#[tauri::command]\`.

## Key APIs (Frontend)
\`\`\`typescript
import { invoke } from '@tauri-apps/api/tauri';

// Call Rust command
await invoke('my_command', { arg: 'value' });
\`\`\`

## Key APIs (Rust)
\`\`\`rust
#[tauri::command]
fn my_command(arg: String) -> String {
    format!("Hello {}", arg)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![my_command])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
\`\`\`

## Configuration
- **tauri.conf.json**: Uses \`allowlist\` to enable features.
`;
}
