<script lang="ts">
  import { createEventDispatcher, tick } from 'svelte';
  import DSLEditor from '../DSLEditor.svelte';

  export let data: any;

  const dispatch = createEventDispatcher();

  $: regexList = getRegexList(data);
  
  let selectedIndex = -1;
  let viewMode: 'dsl' | 'raw' = 'dsl';
  let dslText = '';
  let searchTerm = '';
  let dslEditor: DSLEditor;

  $: filteredList = regexList.filter(entry => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      entry.comment?.toLowerCase().includes(term) ||
      entry.in?.toLowerCase().includes(term)
    );
  });

  $: if (regexList) {
    dslText = regexToDSL(regexList);
  }

  function getRegexList(data: any): any[] {
    if (!data) return [];
    if (data.module?.regex) return data.module.regex;
    if (data.regex) return data.regex;
    return [];
  }

  function regexToDSL(entries: any[]): string {
    return entries.map(entry => {
      const lines: string[] = [];
      lines.push('===');
      if (entry.comment) lines.push(`name = "${escapeQuotes(entry.comment)}"`);
      if (entry.type) lines.push(`type = "${entry.type}"`);
      
      // pattern (in)
      if (entry.in) {
        if (entry.in.includes('\n')) {
          lines.push(`pattern = '''`);
          lines.push(entry.in);
          lines.push(`'''`);
        } else {
          lines.push(`pattern = "${escapeQuotes(entry.in)}"`);
        }
      }
      
      // replace (out)
      if (entry.out) {
        if (entry.out.includes('\n')) {
          lines.push(`replace = '''`);
          lines.push(entry.out);
          lines.push(`'''`);
        } else {
          lines.push(`replace = "${escapeQuotes(entry.out)}"`);
        }
      }
      
      if (entry.flag) lines.push(`flags = "${entry.flag}"`);
      if (entry.ableFlag) lines.push(`ableFlag = "true"`);
      
      return lines.join('\n');
    }).join('\n\n');
  }

  function dslToRegex(dsl: string): any[] {
    const entries: any[] = [];
    const blocks = dsl.split(/^===$/m).filter(b => b.trim());
    
    for (const block of blocks) {
      const entry: any = {
        comment: '',
        in: '',
        out: '',
        flag: '',
        type: 'editinput',
        ableFlag: false
      };
      
      // 멀티라인 pattern
      const patternMatch = block.match(/pattern\s*=\s*'''([\s\S]*?)'''/);
      if (patternMatch) entry.in = patternMatch[1].trim();
      
      // 멀티라인 replace
      const replaceMatch = block.match(/replace\s*=\s*'''([\s\S]*?)'''/);
      if (replaceMatch) entry.out = replaceMatch[1].trim();
      
      const lines = block
        .replace(/pattern\s*=\s*'''[\s\S]*?'''/g, '')
        .replace(/replace\s*=\s*'''[\s\S]*?'''/g, '')
        .split('\n');
      
      for (const line of lines) {
        const match = line.match(/^(\w+)\s*=\s*(.+)$/);
        if (!match) continue;
        
        const [, key, rawValue] = match;
        let value = rawValue.trim();
        
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        
        switch (key) {
          case 'name': case 'comment': entry.comment = value; break;
          case 'type': entry.type = value; break;
          case 'pattern': if (!entry.in) entry.in = value; break;
          case 'replace': if (!entry.out) entry.out = value; break;
          case 'flag': case 'flags': entry.flag = value; break;
          case 'ableFlag': entry.ableFlag = value === 'true'; break;
        }
      }
      
      if (entry.comment || entry.in) entries.push(entry);
    }
    
    return entries;
  }

  function escapeQuotes(str: string): string {
    return str.replace(/"/g, '\\"');
  }

  function selectEntry(index: number) {
    selectedIndex = index;
    scrollToEntry(index);
  }

  async function scrollToEntry(index: number) {
    await tick();
    if (!dslEditor) return;
    
    const lines = dslText.split('\n');
    let lineIndex = 0;
    let entryCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === '===') {
        if (entryCount === index) { lineIndex = i + 1; break; }
        entryCount++;
      }
    }
    
    dslEditor.scrollToLine(lineIndex);
  }

  function addEntry() {
    const newList = [...regexList, {
      comment: '새 Regex',
      in: '',
      out: '',
      flag: '',
      type: 'editinput',
      ableFlag: false
    }];
    updateRegexList(newList);
    selectedIndex = newList.length - 1;
  }

  function deleteEntry(index: number) {
    if (!confirm('이 항목을 삭제하시겠습니까?')) return;
    const newList = regexList.filter((_, i) => i !== index);
    updateRegexList(newList);
    if (selectedIndex === index) selectedIndex = -1;
    else if (selectedIndex > index) selectedIndex--;
  }

  function handleDSLChange(event: CustomEvent<{ value: string }>) {
    dslText = event.detail.value;
  }

  function applyDSL() {
    try {
      const newList = dslToRegex(dslText);
      updateRegexList(newList);
    } catch (e) {
      console.error('DSL 파싱 오류:', e);
      alert('DSL 파싱 오류');
    }
  }

  function updateRegexList(newList: any[]) {
    const newData = structuredClone(data);
    if (newData.module) newData.module.regex = newList;
    else newData.regex = newList;
    dispatch('change', newData);
  }

  function copyToClipboard() { navigator.clipboard.writeText(dslText); }

  async function pasteFromClipboard() {
    try { dslText = await navigator.clipboard.readText(); } catch {}
  }
</script>

<div class="regex-tab">
  <!-- 메인: DSL 코드 에디터 -->
  <main class="editor-panel">
    <div class="editor-toolbar">
      <div class="toolbar-left">
        <button class="mode-btn" class:active={viewMode === 'dsl'} on:click={() => viewMode = 'dsl'}>DSL</button>
        <button class="mode-btn" class:active={viewMode === 'raw'} on:click={() => viewMode = 'raw'}>Raw</button>
      </div>
      <div class="toolbar-right">
        <button class="tool-btn" on:click={copyToClipboard} title="복사">📋</button>
        <button class="tool-btn" on:click={pasteFromClipboard} title="붙여넣기">📄</button>
        <button class="tool-btn apply-btn" on:click={applyDSL} title="적용">✓ 적용</button>
      </div>
    </div>
    
    <div class="editor-wrapper">
      {#if viewMode === 'dsl'}
        <DSLEditor
          bind:this={dslEditor}
          value={dslText}
          mode="regex"
          placeholder={'===\nname = "Regex 이름"\ntype = "editdisplay"\npattern = "<img mps=\"(.*?)\">"\nreplace = \'\'\'\n대체 문자열\n\'\'\''}
          on:change={handleDSLChange}
        />
      {:else}
        <textarea
          class="code-editor raw-editor"
          value={JSON.stringify(regexList, null, 2)}
          on:input={(e) => { try { updateRegexList(JSON.parse(e.currentTarget.value)); } catch {} }}
          spellcheck="false"
        ></textarea>
      {/if}
    </div>
  </main>

  <!-- 우측: 북마크 패널 -->
  <aside class="bookmark-panel">
    <div class="panel-header">
      <input type="text" placeholder="🔍 검색..." bind:value={searchTerm} class="search-input" />
    </div>
    
    <ul class="entry-list">
      {#each filteredList as entry, i}
        {@const originalIndex = regexList.indexOf(entry)}
        <li
          class="entry-item"
          class:selected={selectedIndex === originalIndex}
          on:click={() => selectEntry(originalIndex)}
          on:keydown={(e) => e.key === 'Enter' && selectEntry(originalIndex)}
          role="button"
          tabindex="0"
        >
          <div class="entry-info">
            <span class="entry-name">{entry.comment || entry.in?.slice(0, 20) || '(이름 없음)'}</span>
            <span class="entry-type">{entry.type || 'editinput'}</span>
          </div>
          <button class="btn-delete" on:click|stopPropagation={() => deleteEntry(originalIndex)} title="삭제">×</button>
        </li>
      {/each}
      
      {#if filteredList.length === 0}
        <li class="empty-message">{searchTerm ? '검색 결과 없음' : 'Regex가 없습니다'}</li>
      {/if}
    </ul>
    
    <div class="panel-footer">
      <button class="btn-add" on:click={addEntry}>+ 추가</button>
      <span class="count">총 {regexList.length}개</span>
    </div>
  </aside>
</div>

<style>
  .regex-tab {
    display: flex;
    height: calc(100vh - 200px);
    min-height: 500px;
    gap: 0;
    background: var(--risu-theme-bgcolor, #1a1a1a);
  }

  /* 에디터 패널 (왼쪽) */
  .editor-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .editor-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0.75rem;
    background: var(--risu-theme-darkbg, #252525);
    border-bottom: 1px solid var(--risu-theme-borderc, #444);
  }

  .toolbar-left, .toolbar-right { display: flex; gap: 0.25rem; }

  .mode-btn {
    padding: 0.375rem 0.75rem;
    background: transparent;
    color: var(--risu-theme-textcolor2, #888);
    border: 1px solid var(--risu-theme-borderc, #444);
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.75rem;
    transition: all 0.15s;
  }

  .mode-btn:hover { color: var(--risu-theme-textcolor, #fff); }
  .mode-btn.active {
    background: var(--risu-theme-primary-600, #4682B4);
    color: white;
    border-color: var(--risu-theme-primary-600, #4682B4);
  }

  .tool-btn {
    padding: 0.375rem 0.5rem;
    background: transparent;
    color: var(--risu-theme-textcolor2, #888);
    border: 1px solid var(--risu-theme-borderc, #444);
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.875rem;
    transition: all 0.15s;
  }

  .tool-btn:hover {
    color: var(--risu-theme-textcolor, #fff);
    background: rgba(255,255,255,0.05);
  }

  .apply-btn {
    background: #238636;
    color: white;
    border-color: #238636;
  }

  .apply-btn:hover { background: #2ea043; }

  .editor-wrapper {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .raw-editor {
    width: 100%;
    height: 100%;
    padding: 1rem;
    background: var(--risu-theme-bgcolor, #1a1a1a);
    color: #abb2bf;
    border: none;
    resize: none;
    font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
    font-size: 0.8125rem;
    line-height: 1.5;
  }
  .raw-editor:focus { outline: none; }

  /* 북마크 패널 (오른쪽) - ModuleManager 스타일 */
  .bookmark-panel {
    width: 200px;
    min-width: 180px;
    display: flex;
    flex-direction: column;
    background: var(--risu-theme-darkbg, #252525);
    border-left: 1px solid var(--risu-theme-borderc, #444);
  }

  .panel-header {
    padding: 0.5rem;
    border-bottom: 1px solid var(--risu-theme-borderc, #444);
  }

  .search-input {
    width: 100%;
    padding: 0.375rem 0.5rem;
    border: 1px solid var(--risu-theme-borderc, #444);
    border-radius: 4px;
    background: var(--risu-theme-bgcolor, #1a1a1a);
    color: var(--risu-theme-textcolor, #fff);
    font-size: 0.75rem;
  }

  .search-input::placeholder { color: var(--risu-theme-textcolor2, #888); }
  .search-input:focus {
    outline: none;
    border-color: var(--risu-theme-primary-600, #4682B4);
  }

  .entry-list {
    flex: 1;
    overflow-y: auto;
    list-style: none;
    margin: 0;
    padding: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  /* ModuleManager 스타일 - 테두리가 있는 아이템 */
  .entry-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 10px;
    cursor: pointer;
    transition: all 0.15s;
    background: var(--risu-theme-bgcolor, #1a1a1a);
    border: 1px solid transparent;
    border-radius: 6px;
  }

  .entry-item:hover {
    background: rgba(255,255,255,0.05);
    border-color: var(--risu-theme-borderc, #444);
  }

  .entry-item.selected {
    background: rgba(74, 144, 217, 0.15);
    border-color: #4A90D9;
  }

  .entry-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .entry-name {
    font-size: 0.8125rem;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--risu-theme-textcolor, #fff);
  }

  .entry-type {
    font-size: 0.6875rem;
    color: var(--risu-theme-textcolor2, #888);
  }

  .btn-delete {
    opacity: 0;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    color: #E06C75;
    padding: 0.125rem 0.25rem;
    transition: opacity 0.15s;
  }

  .entry-item:hover .btn-delete { opacity: 0.7; }
  .btn-delete:hover { opacity: 1 !important; }

  .empty-message {
    padding: 1rem;
    text-align: center;
    color: var(--risu-theme-textcolor2, #888);
    font-size: 0.75rem;
  }

  .panel-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem;
    border-top: 1px solid var(--risu-theme-borderc, #444);
    font-size: 0.6875rem;
  }

  .btn-add {
    padding: 0.25rem 0.5rem;
    background: rgba(255,255,255,0.05);
    color: var(--risu-theme-textcolor, #fff);
    border: 1px solid var(--risu-theme-borderc, #444);
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.6875rem;
    transition: all 0.15s;
  }

  .btn-add:hover {
    background: rgba(255,255,255,0.1);
    border-color: var(--risu-theme-primary-600, #4682B4);
  }

  .count { color: var(--risu-theme-textcolor2, #888); }
</style>
