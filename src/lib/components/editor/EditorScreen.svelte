<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import InfoTab from './tabs/InfoTab.svelte';
  import LorebookTab from './tabs/LorebookTab.svelte';
  import RegexTab from './tabs/RegexTab.svelte';
  import TriggerTab from './tabs/TriggerTab.svelte';
  import AssetTab from './tabs/AssetTab.svelte';
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
        return allTabs.filter(t => ['info', 'lorebook', 'regex', 'trigger', 'assets'].includes(t.id));
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
</script>

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
      <button class="btn btn-secondary" on:click={handleDownloadMetadata} title="메타데이터(JSON) 다운로드">📋 메타</button>
      <button class="btn btn-secondary" on:click={handleClose}>닫기</button>
      <button class="btn btn-primary" on:click={handleDownload}>다운로드</button>
    </div>
  </header>

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

  .btn-primary {
    background: var(--primary, #0f3460);
    color: white;
  }

  .btn-secondary {
    background: var(--bg-tertiary, #333);
    color: var(--text-primary, #eee);
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
