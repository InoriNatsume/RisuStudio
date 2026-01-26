<script lang="ts">
  export let content: string = '';
  
  // Parse content into sections
  $: sections = parseContent(content);
  
  interface Section {
    type: 'system' | 'description' | 'personality' | 'firstMessage' | 'user' | 'char' | 'unknown';
    title: string;
    content: string;
  }
  
  function parseContent(text: string): Section[] {
    if (!text) return [];
    
    const parts = text.split(/\n\n---\n\n/);
    return parts.map(part => {
      const match = part.match(/^\[([^\]]+)\]\n([\s\S]*)$/);
      if (match) {
        const title = match[1];
        const content = match[2];
        let type: Section['type'] = 'unknown';
        
        if (title === 'System') type = 'system';
        else if (title === 'Description') type = 'description';
        else if (title === 'Personality') type = 'personality';
        else if (title === 'First Message') type = 'firstMessage';
        else if (title === 'User') type = 'user';
        else type = 'char';
        
        return { type, title, content };
      }
      return { type: 'unknown' as const, title: '', content: part };
    });
  }
  
  function getTypeIcon(type: Section['type']): string {
    switch (type) {
      case 'system': return '⚙️';
      case 'description': return '📖';
      case 'personality': return '💭';
      case 'firstMessage': return '👋';
      case 'user': return '👤';
      case 'char': return '🤖';
      default: return '📄';
    }
  }
  
  function getTypeColor(type: Section['type']): string {
    switch (type) {
      case 'system': return '#569cd6';
      case 'description': return '#4ec9b0';
      case 'personality': return '#dcdcaa';
      case 'firstMessage': return '#ce9178';
      case 'user': return '#4fc1ff';
      case 'char': return '#c586c0';
      default: return '#888';
    }
  }
  
  // Token estimation (rough: 1 token ≈ 4 chars)
  $: totalChars = content.length;
  $: estimatedTokens = Math.ceil(totalChars / 4);
</script>

<div class="prompt-preview">
  <div class="preview-header">
    <h3>📝 프롬프트 미리보기</h3>
    <div class="stats">
      <span class="stat">
        <span class="stat-label">섹션</span>
        <span class="stat-value">{sections.length}</span>
      </span>
      <span class="stat">
        <span class="stat-label">문자</span>
        <span class="stat-value">{totalChars.toLocaleString()}</span>
      </span>
      <span class="stat">
        <span class="stat-label">토큰 (추정)</span>
        <span class="stat-value">~{estimatedTokens.toLocaleString()}</span>
      </span>
    </div>
  </div>
  
  {#if sections.length === 0}
    <div class="empty-state">
      <div class="empty-icon">🔍</div>
      <p>시뮬레이션을 실행하면 프롬프트 미리보기가 표시됩니다.</p>
      <p class="hint">▶️ 시뮬레이션 실행 버튼을 클릭하세요</p>
    </div>
  {:else}
    <div class="sections">
      {#each sections as section, i}
        <div class="section" style="--section-color: {getTypeColor(section.type)}">
          <div class="section-header">
            <span class="section-icon">{getTypeIcon(section.type)}</span>
            <span class="section-title">{section.title || `Section ${i + 1}`}</span>
            <span class="section-chars">{section.content.length} chars</span>
          </div>
          <div class="section-content">
            <pre>{section.content}</pre>
          </div>
        </div>
      {/each}
    </div>
  {/if}
  
  {#if content}
    <div class="raw-toggle">
      <details>
        <summary>📋 원본 텍스트 보기</summary>
        <pre class="raw-content">{content}</pre>
      </details>
    </div>
  {/if}
</div>

<style>
  .prompt-preview {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border-color, #3c3c3c);
  }

  .preview-header h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
  }

  .stats {
    display: flex;
    gap: 16px;
  }

  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .stat-label {
    font-size: 10px;
    color: var(--text-secondary, #888);
    text-transform: uppercase;
  }

  .stat-value {
    font-size: 14px;
    font-weight: 600;
    color: var(--accent-color, #0e639c);
  }

  .empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary, #888);
    text-align: center;
  }

  .empty-icon {
    font-size: 48px;
    margin-bottom: 16px;
    opacity: 0.5;
  }

  .empty-state p {
    margin: 4px 0;
  }

  .hint {
    font-size: 12px;
    opacity: 0.7;
  }

  .sections {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .section {
    background: var(--bg-secondary, #252526);
    border-radius: 6px;
    border-left: 3px solid var(--section-color);
    overflow: hidden;
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.03);
    border-bottom: 1px solid var(--border-color, #3c3c3c);
  }

  .section-icon {
    font-size: 14px;
  }

  .section-title {
    flex: 1;
    font-weight: 600;
    font-size: 13px;
    color: var(--section-color);
  }

  .section-chars {
    font-size: 11px;
    color: var(--text-secondary, #888);
  }

  .section-content {
    padding: 12px;
    max-height: 200px;
    overflow-y: auto;
  }

  .section-content pre {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 12px;
    line-height: 1.5;
    color: var(--text-primary, #d4d4d4);
  }

  .raw-toggle {
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px solid var(--border-color, #3c3c3c);
  }

  .raw-toggle summary {
    cursor: pointer;
    font-size: 12px;
    color: var(--text-secondary, #888);
    padding: 4px 0;
  }

  .raw-toggle summary:hover {
    color: var(--text-primary, #d4d4d4);
  }

  .raw-content {
    margin-top: 8px;
    padding: 12px;
    background: var(--bg-secondary, #252526);
    border-radius: 4px;
    font-size: 11px;
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 300px;
    overflow-y: auto;
  }
</style>
