<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import InfoTab from './tabs/InfoTab.svelte';
  import LorebookTab from './tabs/LorebookTab.svelte';
  import RegexTab from './tabs/RegexTab.svelte';
  import TriggerTab from './tabs/TriggerTab.svelte';
  import AssetTab from './tabs/AssetTab.svelte';

  export let data: any;
  export let fileType: 'charx' | 'risum' | 'risup';
  export let fileName: string;

  const dispatch = createEventDispatcher();

  // 현재 활성 탭
  let activeTab: 'info' | 'lorebook' | 'regex' | 'trigger' | 'assets' = 'info';

  // 탭 목록 (파일 타입에 따라 다름)
  $: tabs = getTabs(fileType, data);

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

    switch (type) {
      case 'charx':
        return allTabs; // 전부
      case 'risum':
        return allTabs.filter(t => ['info', 'lorebook', 'regex', 'trigger', 'assets'].includes(t.id));
      case 'risup':
        return [{ id: 'info', label: '프리셋 정보', icon: '⚙️', count: 0 }];
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
  <main class="tab-content">
    {#if editedData}
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

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--text-secondary, #aaa);
  }
</style>
