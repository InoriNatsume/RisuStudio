<script lang="ts">
  import { createEventDispatcher, tick } from 'svelte';
  import DSLEditor from '../DSLEditor.svelte';

  export let data: any;

  const dispatch = createEventDispatcher();

  // 프리셋 데이터 추출
  $: preset = data?.preset || data || {};

  // promptTemplate 배열 (프롬프트 순서와 내용)
  $: promptTemplate = preset.promptTemplate || [];

  // 단순 프롬프트 필드들 (하단 섹션)
  const simplePromptFields = [
    { key: 'mainPrompt', label: '메인 프롬프트' },
    { key: 'jailbreak', label: 'Jailbreak' },
    { key: 'globalNote', label: 'Global Note' },
    { key: 'autoSuggestPrompt', label: 'Auto Suggest Prompt' },
  ];

  // 현재 선택된 항목 - promptTemplate이 비어있으면 field 선택
  let selectedType: 'template' | 'field' = 'field';
  let selectedTemplateIndex = 0;
  let selectedFieldKey = 'mainPrompt';
  let dslEditor: DSLEditor;

  // 편집 모드 (원본 / 편집)
  let editMode: 'original' | 'formatted' = 'original';
  let formattedValue = '';
  let hasFormattedChanges = false;

  // promptTemplate이 있으면 template 선택으로 전환
  $: if (promptTemplate.length > 0 && selectedType === 'field' && selectedTemplateIndex === 0) {
    selectedType = 'template';
  }

  // 현재 선택된 항목의 텍스트 값
  $: currentValue = getCurrentValue(selectedType, selectedTemplateIndex, selectedFieldKey, preset, promptTemplate);

  // 선택 변경 시 formatted 값 초기화
  $: if (currentValue !== undefined) {
    formattedValue = formatForEdit(currentValue);
    hasFormattedChanges = false;
  }

  // 원본 → 편집용 변환 (줄바꿈 추가)
  function formatForEdit(text: string): string {
    if (!text) return '';
    return text
      // }}{{ 패턴에서 줄바꿈
      .replace(/\}\}\{\{/g, '}}\n{{')
      // {{/if}}{{ 패턴
      .replace(/\{\{\/if\}\}\{\{/g, '{{/if}}\n{{')
      // }}}(OOC: 패턴
      .replace(/\}\}\}\(OOC:/g, '}}}\n(OOC:')
      // ){{#if 패턴
      .replace(/\)\{\{#if/g, ')\n{{#if')
      // .{{/if}}{{#if 패턴
      .replace(/\.\{\{\/if\}\}\{\{#if/g, '.{{/if}}\n{{#if');
  }

  // 편집용 → 원본 변환 (줄바꿈 제거, 원본 형식 유지)
  function formatToOriginal(text: string): string {
    if (!text) return '';
    // 줄바꿈 제거 (줄바꿈 전후 공백도 정리)
    return text.replace(/\n/g, '');
  }

  function getCurrentValue(type: string, templateIdx: number, fieldKey: string, preset: any, template: any[]): string {
    if (type === 'field') {
      return preset[fieldKey] || '';
    }
    const item = template?.[templateIdx];
    if (!item) return '';
    return item.text || item.content || '';
  }

  // 현재 선택된 항목 이름
  $: currentLabel = getCurrentLabel(selectedType, selectedTemplateIndex, selectedFieldKey, promptTemplate);

  function getCurrentLabel(type: string, templateIdx: number, fieldKey: string, template: any[]): string {
    if (type === 'field') {
      return simplePromptFields.find(f => f.key === fieldKey)?.label || fieldKey;
    }
    const item = template?.[templateIdx];
    return item ? getPromptItemName(item) : '선택된 항목 없음';
  }

  // PromptItem 타입에 따른 표시 이름
  function getPromptItemName(item: any): string {
    if (!item) return 'Unknown';
    const type = item.type;
    const type2 = item.type2;
    
    if (item.name) {
      return `*${item.name}`;
    }
    
    if (type === 'plain' || type === 'jailbreak' || type === 'cot') {
      if (type2 === 'main') return '*메인 프롬프트';
      if (type2 === 'globalNote') return '*글로벌노트';
      if (type === 'jailbreak') return '*Jailbreak';
      if (type === 'cot') return '*Chain of Thought';
      return `*${type}`;
    }
    if (type === 'persona') return '*페르소나 프로필';
    if (type === 'description') return '*봇 프로필';
    if (type === 'lorebook') return '*로어북';
    if (type === 'postEverything') return '*Post Everything';
    if (type === 'authornote') return '*Author Note';
    if (type === 'chat') return '*채팅 기록';
    if (type === 'memory') return '*메모리';
    if (type === 'cache') return `*캐시 (${item.name || ''})`;
    if (type === 'chatML') return 'ChatML';
    if (type === 'comment') return '*/';
    
    return type || 'Unknown';
  }

  // 프롬프트 아이템 역할 표시
  function getPromptRole(item: any): string {
    if (!item?.role) return '';
    const roles: Record<string, string> = { user: '사용자', bot: '봇', system: '시스템', assistant: '봇' };
    return roles[item.role] || item.role;
  }

  function selectTemplate(index: number) {
    selectedType = 'template';
    selectedTemplateIndex = index;
  }

  function selectField(key: string) {
    selectedType = 'field';
    selectedFieldKey = key;
  }

  function handleTextChange(event: CustomEvent<{ value: string }>) {
    if (editMode === 'formatted') {
      // 편집 모드에서는 formattedValue만 업데이트
      formattedValue = event.detail.value;
      hasFormattedChanges = true;
      return;
    }
    
    // 원본 모드에서는 바로 적용
    const newData = structuredClone(data);
    const target = newData.preset || newData;
    
    if (selectedType === 'field') {
      target[selectedFieldKey] = event.detail.value;
    } else {
      if (target.promptTemplate && target.promptTemplate[selectedTemplateIndex]) {
        target.promptTemplate[selectedTemplateIndex].text = event.detail.value;
      }
    }
    dispatch('change', newData);
  }

  // 편집 모드에서 "적용" 버튼 클릭
  function applyFormattedChanges() {
    const originalFormat = formatToOriginal(formattedValue);
    
    const newData = structuredClone(data);
    const target = newData.preset || newData;
    
    if (selectedType === 'field') {
      target[selectedFieldKey] = originalFormat;
    } else {
      if (target.promptTemplate && target.promptTemplate[selectedTemplateIndex]) {
        target.promptTemplate[selectedTemplateIndex].text = originalFormat;
      }
    }
    
    dispatch('change', newData);
    hasFormattedChanges = false;
  }

  // 탭 변경
  function switchMode(mode: 'original' | 'formatted') {
    if (editMode === 'formatted' && hasFormattedChanges && mode === 'original') {
      if (!confirm('저장되지 않은 변경사항이 있습니다. 원본 탭으로 전환하시겠습니까?')) {
        return;
      }
      hasFormattedChanges = false;
    }
    editMode = mode;
    if (mode === 'formatted') {
      formattedValue = formatForEdit(currentValue);
    }
  }

  function moveItem(index: number, direction: 'up' | 'down') {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= promptTemplate.length) return;
    
    const newData = structuredClone(data);
    const target = newData.preset || newData;
    const arr = target.promptTemplate;
    [arr[index], arr[newIndex]] = [arr[newIndex], arr[index]];
    
    if (selectedType === 'template' && selectedTemplateIndex === index) {
      selectedTemplateIndex = newIndex;
    }
    dispatch('change', newData);
  }

  function deleteItem(index: number) {
    if (!confirm('이 항목을 삭제하시겠습니까?')) return;
    
    const newData = structuredClone(data);
    const target = newData.preset || newData;
    target.promptTemplate.splice(index, 1);
    
    if (selectedTemplateIndex >= target.promptTemplate.length) {
      selectedTemplateIndex = Math.max(0, target.promptTemplate.length - 1);
    }
    dispatch('change', newData);
  }
</script>

<div class="preset-prompts-tab">
  <!-- 좌측: 에디터 -->
  <main class="editor-panel">
    <div class="editor-toolbar">
      <span class="current-field">{currentLabel}</span>
      {#if selectedType === 'template' && promptTemplate[selectedTemplateIndex]}
        <span class="role-badge">{getPromptRole(promptTemplate[selectedTemplateIndex])}</span>
      {/if}
      
      <!-- 원본/편집 탭 -->
      <div class="mode-tabs">
        <button 
          class="mode-tab" 
          class:active={editMode === 'original'}
          on:click={() => switchMode('original')}
        >원본</button>
        <button 
          class="mode-tab" 
          class:active={editMode === 'formatted'}
          on:click={() => switchMode('formatted')}
        >편집</button>
      </div>
      
      <!-- 적용 버튼 (편집 모드에서만) -->
      {#if editMode === 'formatted' && hasFormattedChanges}
        <button class="apply-btn" on:click={applyFormattedChanges}>적용</button>
      {/if}
    </div>
    <div class="editor-wrapper">
      <DSLEditor
        bind:this={dslEditor}
        value={editMode === 'formatted' ? formattedValue : currentValue}
        mode="lorebook"
        placeholder="프롬프트 내용을 입력하세요..."
        on:change={handleTextChange}
      />
    </div>
  </main>

  <!-- 우측: 템플릿 목록 패널 -->
  <aside class="bookmark-panel">
    <div class="panel-header">
      <span class="panel-title">프롬프트 템플릿</span>
      <span class="item-count">{promptTemplate.length}개</span>
    </div>
    
    <!-- promptTemplate 목록 -->
    <ul class="entry-list">
      {#each promptTemplate as item, i}
        <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
        <li
          class="entry-item"
          class:selected={selectedType === 'template' && selectedTemplateIndex === i}
          on:click={() => selectTemplate(i)}
          on:keydown={(e) => e.key === 'Enter' && selectTemplate(i)}
        >
          <div class="entry-main">
            <span class="entry-name">{getPromptItemName(item)}</span>
            {#if item.role}
              <span class="entry-role">{getPromptRole(item)}</span>
            {/if}
          </div>
          <div class="entry-actions">
            <button class="action-btn" on:click|stopPropagation={() => deleteItem(i)} title="삭제">×</button>
            <button class="action-btn" on:click|stopPropagation={() => moveItem(i, 'down')} title="아래로" disabled={i === promptTemplate.length - 1}>↓</button>
            <button class="action-btn" on:click|stopPropagation={() => moveItem(i, 'up')} title="위로" disabled={i === 0}>↑</button>
          </div>
        </li>
      {/each}
      
      {#if promptTemplate.length === 0}
        <li class="empty-message">프롬프트 템플릿이 없습니다</li>
      {/if}
    </ul>

    <!-- 단순 프롬프트 필드들 -->
    <div class="simple-fields-section">
      <div class="section-divider">
        <span>기본 프롬프트 필드</span>
      </div>
      <ul class="entry-list simple-list">
        {#each simplePromptFields as field}
          <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
          <li
            class="entry-item simple"
            class:selected={selectedType === 'field' && selectedFieldKey === field.key}
            on:click={() => selectField(field.key)}
            on:keydown={(e) => e.key === 'Enter' && selectField(field.key)}
          >
            <span class="entry-name">{field.label}</span>
            {#if preset[field.key]}
              <span class="has-content">●</span>
            {/if}
          </li>
        {/each}
      </ul>
    </div>
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
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: var(--risu-theme-darkbg, #252525);
    border-bottom: 1px solid var(--risu-theme-borderc, #444);
  }

  .current-field {
    font-weight: 600;
    color: var(--risu-theme-textcolor, #fff);
  }

  .role-badge {
    padding: 0.125rem 0.5rem;
    background: var(--risu-theme-primary-600, #4682B4);
    color: white;
    border-radius: 4px;
    font-size: 0.75rem;
  }

  .mode-tabs {
    display: flex;
    margin-left: auto;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 4px;
    overflow: hidden;
  }

  .mode-tab {
    padding: 0.25rem 0.75rem;
    border: none;
    background: transparent;
    color: var(--risu-theme-textcolor2, #888);
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.15s;
  }

  .mode-tab:hover {
    color: var(--risu-theme-textcolor, #fff);
  }

  .mode-tab.active {
    background: var(--risu-theme-primary-600, #4682B4);
    color: white;
  }

  .apply-btn {
    padding: 0.25rem 0.75rem;
    border: none;
    background: #28a745;
    color: white;
    border-radius: 4px;
    font-size: 0.75rem;
    cursor: pointer;
    transition: background 0.15s;
  }

  .apply-btn:hover {
    background: #218838;
  }

  .editor-wrapper {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .bookmark-panel {
    width: 320px;
    min-width: 280px;
    max-width: 400px;
    display: flex;
    flex-direction: column;
    background: var(--risu-theme-darkbg, #252525);
    border-left: 1px solid var(--risu-theme-borderc, #444);
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    border-bottom: 1px solid var(--risu-theme-borderc, #444);
  }

  .panel-title {
    font-weight: 600;
    font-size: 0.875rem;
    color: var(--risu-theme-textcolor, #fff);
  }

  .item-count {
    font-size: 0.75rem;
    color: var(--risu-theme-textcolor2, #888);
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
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0.625rem;
    margin-bottom: 0.25rem;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid transparent;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s;
  }

  .entry-item:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: var(--risu-theme-borderc, #444);
  }

  .entry-item.selected {
    background: var(--risu-theme-primary-600, #4682B4);
    border-color: var(--risu-theme-primary-600, #4682B4);
    color: white;
  }

  .entry-main {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
    min-width: 0;
  }

  .entry-name {
    font-size: 0.8rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .entry-role {
    padding: 0.125rem 0.375rem;
    border-radius: 3px;
    font-size: 0.65rem;
    background: rgba(255, 255, 255, 0.1);
  }

  .entry-item.selected .entry-role {
    background: rgba(255, 255, 255, 0.2);
  }

  .entry-actions {
    display: flex;
    gap: 0.125rem;
    opacity: 0;
    transition: opacity 0.15s;
  }

  .entry-item:hover .entry-actions {
    opacity: 1;
  }

  .action-btn {
    width: 1.5rem;
    height: 1.5rem;
    padding: 0;
    border: none;
    background: rgba(255, 255, 255, 0.1);
    color: var(--risu-theme-textcolor2, #888);
    border-radius: 3px;
    cursor: pointer;
    font-size: 0.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .action-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.2);
    color: white;
  }

  .action-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .empty-message {
    text-align: center;
    padding: 1rem;
    color: var(--risu-theme-textcolor2, #666);
    font-style: italic;
    font-size: 0.8rem;
  }

  .simple-fields-section {
    border-top: 1px solid var(--risu-theme-borderc, #444);
  }

  .section-divider {
    padding: 0.5rem 0.75rem;
    background: rgba(0, 0, 0, 0.2);
    font-size: 0.7rem;
    color: var(--risu-theme-textcolor2, #888);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .simple-list {
    flex: 0;
    max-height: 200px;
  }

  .entry-item.simple {
    padding: 0.375rem 0.625rem;
  }

  .has-content {
    color: var(--risu-theme-primary-600, #4682B4);
    font-size: 0.5rem;
  }

  .entry-item.selected .has-content {
    color: white;
  }
</style>
