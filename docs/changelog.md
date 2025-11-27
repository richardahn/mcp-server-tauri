# Changelog

All notable changes to this project are documented here. Releases are fetched dynamically from [GitHub Releases](https://github.com/hypothesi/mcp-server-tauri/releases).

<script setup>
import { ref, onMounted } from 'vue';

const releases = ref([]);
const loading = ref(true);
const error = ref('');

onMounted(async () => {
   try {
      const response = await fetch(
         'https://api.github.com/repos/hypothesi/mcp-server-tauri/releases'
      );
      if (response.ok) {
         releases.value = await response.json();
      } else {
         error.value = 'Failed to load releases';
      }
   } catch (e) {
      error.value = 'Failed to load releases';
   } finally {
      loading.value = false;
   }
});

function formatDate(dateString) {
   return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
   });
}
</script>

<div class="releases-container">
   <div v-if="loading" class="loading">Loading releases...</div>
   <div v-else-if="error" class="error">
      {{ error }}. <a href="https://github.com/hypothesi/mcp-server-tauri/releases" target="_blank" rel="noopener">View on GitHub →</a>
   </div>
   <div v-else-if="releases.length === 0" class="empty">
      No releases found. <a href="https://github.com/hypothesi/mcp-server-tauri/releases" target="_blank" rel="noopener">View on GitHub →</a>
   </div>
   <div v-else class="releases-list">
      <div v-for="release in releases" :key="release.id" class="release-card">
         <div class="release-header">
            <a :href="release.html_url" target="_blank" rel="noopener" class="release-title">
               {{ release.name || release.tag_name }}
            </a>
            <span v-if="release.prerelease" class="prerelease-badge">Pre-release</span>
         </div>
         <div class="release-meta">
            <span class="release-tag">{{ release.tag_name }}</span>
            <span class="release-date">{{ formatDate(release.published_at) }}</span>
         </div>
         <div v-if="release.body" class="release-body" v-html="renderMarkdown(release.body)"></div>
         <a :href="release.html_url" target="_blank" rel="noopener" class="view-release">
            View on GitHub →
         </a>
      </div>
   </div>
</div>

<script>
// Simple markdown-ish rendering for release notes
function renderMarkdown(text) {
   if (!text) return '';
   return text
      // Escape HTML
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Headers
      .replace(/^### (.+)$/gm, '<h4>$1</h4>')
      .replace(/^## (.+)$/gm, '<h3>$1</h3>')
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      // List items
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      // Wrap consecutive list items
      .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
      // Line breaks
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');
}
</script>

<style>
.releases-container {
   margin-top: 24px;
}

.loading, .error, .empty {
   padding: 24px;
   text-align: center;
   color: var(--vp-c-text-2);
}

.error {
   color: var(--vp-c-danger-1);
}

.releases-list {
   display: flex;
   flex-direction: column;
   gap: 24px;
}

.release-card {
   padding: 20px;
   border: 1px solid var(--vp-c-divider);
   border-radius: 12px;
   background: var(--vp-c-bg-soft);
}

.release-header {
   display: flex;
   align-items: center;
   gap: 12px;
   margin-bottom: 8px;
}

.release-title {
   font-size: 1.25rem;
   font-weight: 600;
   color: var(--vp-c-brand-1);
   text-decoration: none;
}

.release-title:hover {
   text-decoration: underline;
}

.prerelease-badge {
   padding: 2px 8px;
   font-size: 12px;
   font-weight: 500;
   color: var(--vp-c-warning-1);
   background: var(--vp-c-warning-soft);
   border-radius: 10px;
}

.release-meta {
   display: flex;
   align-items: center;
   gap: 12px;
   margin-bottom: 16px;
   font-size: 14px;
   color: var(--vp-c-text-2);
}

.release-tag {
   padding: 2px 8px;
   background: var(--vp-c-default-soft);
   border-radius: 6px;
   font-family: var(--vp-font-family-mono);
   font-size: 13px;
}

.release-body {
   padding: 16px;
   background: var(--vp-c-bg);
   border-radius: 8px;
   margin-bottom: 12px;
   font-size: 14px;
   line-height: 1.6;
}

.release-body h3 {
   font-size: 1rem;
   font-weight: 600;
   margin: 16px 0 8px 0;
}

.release-body h3:first-child {
   margin-top: 0;
}

.release-body h4 {
   font-size: 0.9rem;
   font-weight: 600;
   margin: 12px 0 6px 0;
}

.release-body ul {
   margin: 8px 0;
   padding-left: 20px;
}

.release-body li {
   margin: 4px 0;
}

.view-release {
   font-size: 14px;
   color: var(--vp-c-brand-1);
   text-decoration: none;
}

.view-release:hover {
   text-decoration: underline;
}
</style>
