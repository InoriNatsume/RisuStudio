<script lang="ts">
  import { createEventDispatcher, tick } from 'svelte';
  import DSLEditor from '../DSLEditor.svelte';

  export let data: any;

  const dispatch = createEventDispatcher();

  // 프리셋 데이터 추출
  $: preset = data?.preset || data || {};

  // 프롬프트 필드들 (세로로 길게 보여주던 필드들)
  const promptFieldDefs = [
    { key: 'mainPrompt', label: '메인 프롬프트' },
    { key: 'jailbreak', label: 'Jailbreak' },
    { key: 'globalNote', label: 'Global Note' },
    { key: 'autoSuggestPrompt', label: 'Auto Suggest Prompt' },
  ];

  // 선택된 프롬프트 필드
  let selectedField = 'mainPrompt';
  let dslEditor: DSLEditor;

  // 현재 선택된 필드의 값
  $: currentValue = preset[selectedField] || '';

  function selectField(key: string) {
    selectedField = key;
  }

  function handleTextChange(event: CustomEvent<{ value: string }>) {
    const newData = structuredClone(data);
    const target = newData.preset || newData;
    target[selectedField] = event.detail.value;
    dispatch('change', newData);
  }

  function handleTextareaChange(e: Event) {
    const target = e.currentTarget as HTMLTextAreaElement;
    const newData = structuredClone(data);
    const presetTarget = newData.preset || newData;
    presetTarget[selectedField] = target.value;
    dispatch('change', newData);
  }
</script>

<div class="preset-prompts-tab">
  <!-- 좌측: 에디터 -->
  <main class="editor-panel">
    <div class="editor-toolbar">
      <span class="current-field">{promptFieldDefs.find(f => f.key === selectedField)?.label || selectedField}</span>
    </div>
    <div class="editor-wrapper">
      <DSLEditor
        bind:this={dslEditor}
        value={currentValue}
        mode="lorebook"
        placeholder="프롬프트 내용을 입력하세요..."
        on:change={handleTextChange}
      />
    </div>
  </main>

  <!-- 우측: 북마크 패널 -->
  <aside class="bookmark-panel">
    <div class="panel-header">
      <span class="panel-title">프롬프트 항목</span>
    </div>
    <ul class="entry-list">
      {#each promptFieldDefs as field}
        <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
        <li
          class="entry-item"
          class:selected={selectedField === field.key}
          on:click={() => selectField(field.key)}
          on:keydown={(e) => e.key === 'Enter' && selectField(field.key)}
        >
          <span class="entry-name">{field.label}</span>
          <span class="entry-preview">
            {#if preset[field.key]}
              {preset[field.key].slice(0, 50)}{preset[field.key].length > 50 ? '...' : ''}
            {:else}
              <span class="empty">(비어있음)</span>
            {/if}
          </span>
        </li>
      {/each}
    </ul>
  </aside>
</div>

<style>
  .preset-prompts-tab {
    display: flex;
    height: calc(100vh - 200px);
    min-height: 500px;
    gap: 0;
    background: var(--risu-theme-bgcolor, #1a1a1a);
  }

  .editor-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .editor-toolbar {
    display: flex;
    align-items: center;
    padding: 0.5rem 0.75rem;
    background: var(--risu-theme-darkbg, #252525);
    border-bottom: 1px solid var(--risu-theme-borderc, #444);
  }

  .current-field {
    font-weight: 600;
    color: var(--risu-theme-textcolor, #fff);
  }

  .editor-wrapper {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .bookmark-panel {
    width: 280px;
    min-width: 200px;
    max-width: 350px;
    display: flex;
    flex-direction: column;
    background: var(--risu-theme-darkbg, #252525);
    border-left: 1px solid var(--risu-theme-borderc, #444);
  }

  .panel-header {
    padding: 0.75rem;
    border-bottom: 1px solid var(--risu-theme-borderc, #444);
  }

  .panel-title {
    font-weight: 600;
    font-size: 0.875rem;
    color: var(--risu-theme-textcolor, #fff);
  }

  .entry-list {
    list-style: none;
    margin: 0;
    padding: 0.5rem;
    flex: 1;
    overflow-y: auto;
  }

  .entry-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.625rem 0.75rem;
    margin-bottom: 0.25rem;
    background: transparent;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.15s;
  }

  .entry-item:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  .entry-item.selected {
    background: var(--risu-theme-primary-600, #4682B4);
    color: white;
  }

  .entry-name {
    font-size: 0.875rem;
    font-weight: 500;
  }

  .entry-preview {
    font-size: 0.75rem;
    color: var(--risu-theme-textcolor2, #888);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .entry-item.selected .entry-preview {
    color: rgba(255, 255, 255, 0.7);
  }

  .empty {
    font-style: italic;
    opacity: 0.5;
  }
</style>
