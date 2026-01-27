<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import InfoTab from './tabs/InfoTab.svelte';
  import LorebookTab from './tabs/LorebookTab.svelte';
  import RegexTab from './tabs/RegexTab.svelte';
  import TriggerTab from './tabs/TriggerTab.svelte';
  import AssetTab from './tabs/AssetTab.svelte';
  import ScriptTab from './tabs/ScriptTab.svelte';
  // 프리셋 전용 탭들
  import PresetBasicTab from './tabs/PresetBasicTab.svelte';
  import PresetParamsTab from './tabs/PresetParamsTab.svelte';
  import PresetPromptsTab from './tabs/PresetPromptsTab.svelte';
  import PresetAdvancedTab from './tabs/PresetAdvancedTab.svelte';

  export let data: any;
  export let fileType: 'charx' | 'risum' | 'risup';
  export let fileName: string;

  const dispatch = createEventDispatcher();

  // 현재 활성 탭
  let activeTab: string = 'info';

  // 탭 목록 (파일 타입에 따라 다름)
  $: tabs = getTabs(fileType, data);

  // 파일 타입 변경 시 기본 탭으로 리셋
  $: if (fileType) {
    activeTab = fileType === 'risup' ? 'basic' : 'info';
  }

  function getTabs(type: string, data: any) {
    // 데이터에서 카운트 계산
    const lorebookCount = data?.module?.lorebook?.length || data?.lorebook?.length || 0;
    const regexCount = data?.module?.regex?.length || data?.regex?.length || 0;
    const triggerCount = data?.module?.trigger?.length || data?.trigger?.length || 0;
    const assetCount = data?.assets?.size || data?.module?.assets?.length || 0;
    
    const allTabs = [
      { id: 'info', label: '정보', icon: '📋', count: 0 },
      { id: 'lorebook', label: '로어북', icon: '📚', count: lorebookCount },
      { id: 'regex', label: 'Regex', icon: '⚙️', count: regexCount },
      { id: 'trigger', label: 'Trigger', icon: '⚡', count: triggerCount },
      { id: 'assets', label: '에셋', icon: '🖼️', count: assetCount },
      { id: 'script', label: '스크립트', icon: '📜', count: 0 },
    ];

    // 프리셋 전용 탭들
    const presetTabs = [
      { id: 'basic', label: '기본 정보', icon: '📋', count: 0 },
      { id: 'params', label: '모델 파라미터', icon: '🔧', count: 0 },
      { id: 'prompts', label: '프롬프트', icon: '📝', count: 0 },
      { id: 'advanced', label: '고급 설정', icon: '⚙️', count: 0 },
    ];

    switch (type) {
      case 'charx':
        return allTabs; // 전부
      case 'risum':
        return allTabs.filter(t => ['info', 'lorebook', 'regex', 'trigger', 'assets', 'script'].includes(t.id));
      case 'risup':
        return presetTabs;
      default:
        return allTabs;
    }
  }

  // 편집된 데이터
  $: editedData = data ? structuredClone(data) : null;

  // 변경 감지
  let hasChanges = false;

  function handleDataChange(event: CustomEvent<any>) {
    editedData = event.detail;
    hasChanges = true;
  }

  function handleSave() {
    dispatch('save', editedData);
    hasChanges = false;
  }

  function handleDownload() {
    dispatch('download', editedData);
  }

  // 메타데이터(card.json/module.json) 다운로드
  function handleDownloadMetadata() {
    if (!editedData) return;
    
    let jsonData: any;
    let filename: string;
    
    if (fileType === 'charx') {
      // charx: card 데이터 추출
      jsonData = editedData.card || editedData.cardData || editedData;
      filename = `${fileName.replace(/\.charx$/i, '')}_card.json`;
    } else if (fileType === 'risum') {
      // risum: module 데이터 추출
      jsonData = editedData.module || editedData;
      filename = `${fileName.replace(/\.risum$/i, '')}_module.json`;
    } else if (fileType === 'risup') {
      // risup: preset 데이터
      jsonData = editedData.preset || editedData;
      filename = `${fileName.replace(/\.risup$/i, '')}_preset.json`;
    } else {
      jsonData = editedData;
      filename = `${fileName}_metadata.json`;
    }
    
    // assets는 제외하고 내보내기 (너무 크므로)
    const exportData = { ...jsonData };
    if (exportData.assets instanceof Map) {
      exportData.assets = `[Map with ${exportData.assets.size} entries]`;
    }
    
    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function handleClose() {
    if (hasChanges) {
      if (!confirm('저장하지 않은 변경사항이 있습니다. 닫으시겠습니까?')) {
        return;
      }
    }
    dispatch('close');
  }

  // ========== 전역 검색 시스템 ==========
  interface GlobalSearchResult {
    tab: string;
    tabLabel: string;
    itemIndex: number;
    itemName: string;
    field: string;
    matchText: string;
    matchCount: number;
  }

  let globalSearchQuery = '';
  let globalSearchVisible = false;
  let globalSearchResults: GlobalSearchResult[] = [];
  let selectedSearchIndex = 0;

  function toggleGlobalSearch() {
    globalSearchVisible = !globalSearchVisible;
    if (!globalSearchVisible) {
      globalSearchQuery = '';
      globalSearchResults = [];
    }
  }

  $: if (globalSearchQuery && editedData) {
    globalSearchResults = performGlobalSearch(editedData, globalSearchQuery);
    selectedSearchIndex = 0;
  } else {
    globalSearchResults = [];
  }

  function performGlobalSearch(data: any, query: string): GlobalSearchResult[] {
    const results: GlobalSearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    // 로어북 검색
    const lorebook = data?.module?.lorebook || data?.lorebook || [];
    lorebook.forEach((item: any, idx: number) => {
      const fields = [
        { name: 'key', value: item.key || '' },
        { name: 'secondkey', value: item.secondkey || '' },
        { name: 'comment', value: item.comment || '' },
        { name: 'content', value: item.content || '' },
      ];
      fields.forEach(f => {
        const count = countMatches(f.value, lowerQuery);
        if (count > 0) {
          results.push({
            tab: 'lorebook',
            tabLabel: '📚 로어북',
            itemIndex: idx,
            itemName: item.comment || item.key || `항목 ${idx + 1}`,
            field: f.name,
            matchText: getMatchPreview(f.value, lowerQuery),
            matchCount: count,
          });
        }
      });
    });

    // Regex 검색 - pattern(in), replacement(out) 포함
    const regex = data?.module?.regex || data?.regex || [];
    regex.forEach((item: any, idx: number) => {
      const fields = [
        { name: 'comment', label: '이름', value: item.comment || '' },
        { name: 'in', label: 'pattern', value: item.in || '' },
        { name: 'out', label: 'replacement', value: item.out || '' },
      ];
      fields.forEach(f => {
        const count = countMatches(f.value, lowerQuery);
        if (count > 0) {
          results.push({
            tab: 'regex',
            tabLabel: '⚙️ Regex',
            itemIndex: idx,
            itemName: item.comment || `Regex ${idx + 1}`,
            field: f.label,
            matchText: getMatchPreview(f.value, lowerQuery),
            matchCount: count,
          });
        }
      });
    });

    // Trigger 검색 - effect 내부 code까지 검색
    const trigger = data?.module?.trigger || data?.trigger || [];
    trigger.forEach((item: any, idx: number) => {
      // effect 내부 코드 추출
      let effectCode = '';
      if (item.effect && Array.isArray(item.effect)) {
        item.effect.forEach((eff: any) => {
          if (eff.code) effectCode += eff.code + '\n';
          if (eff.value) effectCode += JSON.stringify(eff.value) + '\n';
        });
      }
      
      // conditions 내부도 문자열화
      let conditionsStr = '';
      if (item.conditions && Array.isArray(item.conditions)) {
        conditionsStr = JSON.stringify(item.conditions);
      }
      
      const fields = [
        { name: 'comment', label: '이름', value: item.comment || '' },
        { name: 'regex', label: 'regex', value: item.regex || '' },
        { name: 'conditions', label: 'conditions', value: conditionsStr },
        { name: 'effect', label: 'effect/code', value: effectCode || JSON.stringify(item.effect || []) },
      ];
      fields.forEach(f => {
        const count = countMatches(f.value, lowerQuery);
        if (count > 0) {
          results.push({
            tab: 'trigger',
            tabLabel: '⚡ Trigger',
            itemIndex: idx,
            itemName: item.comment || `Trigger ${idx + 1}`,
            field: f.label,
            matchText: getMatchPreview(f.value, lowerQuery),
            matchCount: count,
          });
        }
      });
    });

    // 스크립트(backgroundEmbedding) 검색
    const bgHtml = data?.cardData?.extensions?.risuai?.backgroundHTML || 
                   data?.module?.backgroundEmbedding || '';
    if (bgHtml) {
      const count = countMatches(bgHtml, lowerQuery);
      if (count > 0) {
        results.push({
          tab: 'script',
          tabLabel: '📜 스크립트',
          itemIndex: 0,
          itemName: '백그라운드 임베딩',
          field: 'backgroundEmbedding',
          matchText: getMatchPreview(bgHtml, lowerQuery),
          matchCount: count,
        });
      }
    }

    return results;
  }

  function countMatches(text: string, query: string): number {
    const lowerText = text.toLowerCase();
    let count = 0;
    let pos = 0;
    while ((pos = lowerText.indexOf(query, pos)) !== -1) {
      count++;
      pos += 1;
    }
    return count;
  }

  function getMatchPreview(text: string, query: string): string {
    const lowerText = text.toLowerCase();
    const pos = lowerText.indexOf(query);
    if (pos === -1) return '';
    const start = Math.max(0, pos - 20);
    const end = Math.min(text.length, pos + query.length + 40);
    let preview = text.substring(start, end);
    if (start > 0) preview = '...' + preview;
    if (end < text.length) preview = preview + '...';
    return preview;
  }

  function goToSearchResult(result: GlobalSearchResult) {
    activeTab = result.tab;
    globalSearchVisible = false;
    
    // 해당 탭으로 이동 후 하이라이트 이벤트 발생
    setTimeout(() => {
      const event = new CustomEvent('highlight-search-result', {
        detail: {
          itemIndex: result.itemIndex,
          field: result.field,
          query: globalSearchQuery,
        },
        bubbles: true,
      });
      document.dispatchEvent(event);
    }, 100);
  }

  function handleGlobalSearchKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      toggleGlobalSearch();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedSearchIndex = Math.min(selectedSearchIndex + 1, globalSearchResults.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedSearchIndex = Math.max(selectedSearchIndex - 1, 0);
    } else if (e.key === 'Enter' && globalSearchResults.length > 0) {
      goToSearchResult(globalSearchResults[selectedSearchIndex]);
    }
  }

  // 전역 단축키 (Ctrl+Shift+F)
  function handleGlobalKeydown(e: KeyboardEvent) {
    if (e.ctrlKey && e.shiftKey && e.key === 'F') {
      e.preventDefault();
      toggleGlobalSearch();
    }
  }
</script>

<svelte:window on:keydown={handleGlobalKeydown} />

<div class="editor-screen">
  <!-- 헤더 -->
  <header class="editor-header">
    <div class="file-info">
      <span class="file-icon">
        {#if fileType === 'charx'}📦
        {:else if fileType === 'risum'}📦
        {:else if fileType === 'risup'}⚙️
        {:else}📄{/if}
      </span>
      <h2 class="file-name">{fileName}</h2>
      {#if hasChanges}
        <span class="unsaved-badge">●</span>
      {/if}
    </div>
    <div class="header-actions">
      <button class="btn btn-icon" on:click={toggleGlobalSearch} title="전역 검색 (Ctrl+Shift+F)" class:active={globalSearchVisible}>
        🔍
      </button>
      <button class="btn btn-secondary" on:click={handleDownloadMetadata} title="메타데이터(JSON) 다운로드">📋 메타</button>
      <button class="btn btn-secondary" on:click={handleClose}>닫기</button>
      <button class="btn btn-primary" on:click={handleDownload}>다운로드</button>
    </div>
  </header>

  <!-- 전역 검색 패널 -->
  {#if globalSearchVisible}
    <div class="global-search-panel">
      <div class="global-search-header">
        <input
          type="text"
          class="global-search-input"
          placeholder="전체 검색 (로어북, Regex, Trigger, 스크립트)..."
          bind:value={globalSearchQuery}
          on:keydown={handleGlobalSearchKeydown}
        />
        <span class="global-search-count">
          {globalSearchResults.length}개 결과
        </span>
        <button class="global-search-close" on:click={toggleGlobalSearch}>✕</button>
      </div>
      {#if globalSearchResults.length > 0}
        <div class="global-search-results">
          {#each globalSearchResults as result, idx}
            <button 
              class="search-result-item" 
              class:selected={idx === selectedSearchIndex}
              on:click={() => goToSearchResult(result)}
            >
              <div class="result-header">
                <span class="result-tab">{result.tabLabel}</span>
                <span class="result-name">{result.itemName}</span>
                <span class="result-field">({result.field})</span>
                <span class="result-count">{result.matchCount}개</span>
              </div>
              <div class="result-preview">{result.matchText}</div>
            </button>
          {/each}
        </div>
      {:else if globalSearchQuery}
        <div class="no-results">검색 결과가 없습니다</div>
      {/if}
    </div>
  {/if}

  <!-- 탭 네비게이션 -->
  <nav class="tab-nav">
    {#each tabs as tab}
      <button
        class="tab-btn"
        class:active={activeTab === tab.id}
        on:click={() => activeTab = tab.id}
      >
        <span class="tab-icon">{tab.icon}</span>
        <span class="tab-label">{tab.label}</span>
        {#if tab.count > 0}
          <span class="tab-count">{tab.count}</span>
        {/if}
      </button>
    {/each}
  </nav>

  <!-- 탭 콘텐츠 -->
  <main class="tab-content" class:no-padding={fileType === 'risup' || activeTab !== 'info'}>
    {#if editedData}
      {#if fileType === 'risup'}
        <!-- 프리셋 전용 탭들 -->
        {#if activeTab === 'basic'}
          <PresetBasicTab data={editedData} on:change={handleDataChange} />
        {:else if activeTab === 'params'}
          <PresetParamsTab data={editedData} on:change={handleDataChange} />
        {:else if activeTab === 'prompts'}
          <PresetPromptsTab data={editedData} on:change={handleDataChange} />
        {:else if activeTab === 'advanced'}
          <PresetAdvancedTab data={editedData} on:change={handleDataChange} />
        {/if}
      {:else}
        <!-- 봇/모듈 탭들 -->
        {#if activeTab === 'info'}
          <InfoTab data={editedData} {fileType} on:change={handleDataChange} />
        {:else if activeTab === 'lorebook'}
          <LorebookTab data={editedData} on:change={handleDataChange} />
        {:else if activeTab === 'regex'}
          <RegexTab data={editedData} on:change={handleDataChange} />
        {:else if activeTab === 'trigger'}
          <TriggerTab data={editedData} on:change={handleDataChange} />
        {:else if activeTab === 'assets'}
          <AssetTab data={editedData} on:change={handleDataChange} />
        {:else if activeTab === 'script'}
          <ScriptTab data={editedData} {fileType} on:change={handleDataChange} />
        {/if}
      {/if}
    {:else}
      <div class="empty-state">
        <p>데이터를 불러오는 중...</p>
      </div>
    {/if}
  </main>
</div>

<style>
  .editor-screen {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--bg-primary, #1a1a2e);
    color: var(--text-primary, #eee);
  }

  .editor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    background: var(--bg-secondary, #16213e);
    border-bottom: 1px solid var(--border-color, #333);
  }

  .file-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .file-icon {
    font-size: 1.5rem;
  }

  .file-name {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
  }

  .unsaved-badge {
    color: var(--warning, #ffc107);
    font-size: 0.75rem;
  }

  .header-actions {
    display: flex;
    gap: 0.5rem;
  }

  .btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.875rem;
    transition: opacity 0.2s;
  }

  .btn:hover {
    opacity: 0.9;
  }

  .btn-icon {
    padding: 0.5rem;
    background: transparent;
    border: 1px solid var(--border-color, #444);
    color: var(--text-secondary, #aaa);
  }

  .btn-icon:hover, .btn-icon.active {
    background: var(--primary, #4a9eff);
    border-color: var(--primary, #4a9eff);
    color: white;
  }

  .btn-primary {
    background: var(--primary, #0f3460);
    color: white;
  }

  .btn-secondary {
    background: var(--bg-tertiary, #333);
    color: var(--text-primary, #eee);
  }

  /* 전역 검색 패널 */
  .global-search-panel {
    background: var(--bg-secondary, #1a1a2e);
    border-bottom: 1px solid var(--border-color, #333);
    max-height: 50vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .global-search-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--border-color, #333);
  }

  .global-search-input {
    flex: 1;
    padding: 0.5rem 1rem;
    background: var(--bg-primary, #0f0f23);
    color: var(--text-primary, #fff);
    border: 1px solid var(--border-color, #444);
    border-radius: 4px;
    font-size: 0.9rem;
  }

  .global-search-input:focus {
    outline: none;
    border-color: var(--primary, #4a9eff);
  }

  .global-search-count {
    font-size: 0.8rem;
    color: var(--text-secondary, #888);
  }

  .global-search-close {
    padding: 0.25rem 0.5rem;
    background: transparent;
    border: none;
    color: var(--text-secondary, #888);
    cursor: pointer;
    font-size: 1rem;
  }

  .global-search-close:hover {
    color: var(--text-primary, #fff);
  }

  .global-search-results {
    overflow-y: auto;
    max-height: 300px;
  }

  .search-result-item {
    display: block;
    width: 100%;
    padding: 0.75rem 1rem;
    background: transparent;
    border: none;
    border-bottom: 1px solid var(--border-color, #333);
    text-align: left;
    cursor: pointer;
    color: var(--text-primary, #fff);
  }

  .search-result-item:hover, .search-result-item.selected {
    background: var(--bg-tertiary, #252545);
  }

  .result-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
  }

  .result-tab {
    font-size: 0.75rem;
    padding: 0.15rem 0.4rem;
    background: var(--primary, #4a9eff);
    color: white;
    border-radius: 3px;
  }

  .result-name {
    font-weight: 600;
    font-size: 0.85rem;
  }

  .result-field {
    font-size: 0.75rem;
    color: var(--text-secondary, #888);
  }

  .result-count {
    margin-left: auto;
    font-size: 0.7rem;
    color: var(--warning, #ffd500);
    background: rgba(255, 213, 0, 0.2);
    padding: 0.1rem 0.4rem;
    border-radius: 3px;
  }

  .result-preview {
    font-size: 0.75rem;
    color: var(--text-secondary, #aaa);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-family: 'JetBrains Mono', monospace;
  }

  .no-results {
    padding: 2rem;
    text-align: center;
    color: var(--text-secondary, #888);
  }

  .tab-nav {
    display: flex;
    gap: 0;
    padding: 0 1rem;
    background: var(--bg-secondary, #16213e);
    border-bottom: 1px solid var(--border-color, #333);
    overflow-x: auto;
  }

  .tab-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    border: none;
    background: transparent;
    color: var(--text-secondary, #aaa);
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .tab-btn:hover {
    color: var(--text-primary, #eee);
    background: var(--bg-tertiary, #222);
  }

  .tab-btn.active {
    color: var(--primary-light, #4d8bf5);
    border-bottom-color: var(--primary-light, #4d8bf5);
  }

  .tab-icon {
    font-size: 1rem;
  }

  .tab-label {
    font-size: 0.875rem;
  }

  .tab-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.25rem;
    height: 1.25rem;
    padding: 0 0.375rem;
    font-size: 0.75rem;
    font-weight: 600;
    background: var(--primary, #0f3460);
    color: white;
    border-radius: 10px;
  }

  .tab-btn.active .tab-count {
    background: var(--primary-light, #4d8bf5);
  }

  .tab-content {
    flex: 1;
    overflow: auto;
    padding: 1rem;
  }

  .tab-content.no-padding {
    padding: 0;
  }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--text-secondary, #aaa);
  }
</style>
