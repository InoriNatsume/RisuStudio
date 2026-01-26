<script lang="ts">
  import { TriggerEngine, TriggerDebugger } from '$lib/core/trigger';
  import type { TriggerScript, TriggerType } from '$lib/core/trigger/types';

  export let results: Array<{
    step: number;
    effect: string;
    before: any;
    after: any;
  }> = [];
  
  export let scripts: TriggerScript[] = [];

  // State
  let selectedScript: TriggerScript | null = null;
  let selectedType: TriggerType = 'start';
  
  // Debugger
  const engine = new TriggerEngine();
  const debugger_ = new TriggerDebugger();

  // Debug state
  let debugSteps: Array<{
    step: number;
    effect: any;
    beforeContext: any;
    afterContext: any;
  }> = [];
  let currentStep = 0;
  let isRunning = false;

  // Filter scripts by type
  $: filteredScripts = scripts.filter(s => s.type === selectedType);

  const triggerTypes: { value: TriggerType; label: string; icon: string }[] = [
    { value: 'start', label: '시작', icon: '🚀' },
    { value: 'input', label: '입력', icon: '📝' },
    { value: 'output', label: '출력', icon: '📤' },
    { value: 'request', label: '요청', icon: '🔄' },
    { value: 'display', label: '표시', icon: '🖥️' },
    { value: 'manual', label: '수동', icon: '👆' },
  ];

  function selectScript(script: TriggerScript) {
    selectedScript = script;
    debugSteps = [];
    currentStep = 0;
  }

  function runDebug() {
    if (!selectedScript) return;
    
    isRunning = true;
    debugger_.setScript(selectedScript);
    debugSteps = debugger_.runAll();
    currentStep = 0;
    isRunning = false;
  }

  function stepForward() {
    if (currentStep < debugSteps.length) {
      currentStep++;
    }
  }

  function stepBack() {
    if (currentStep > 0) {
      currentStep--;
    }
  }

  $: currentDebugStep = debugSteps[currentStep - 1];
  $: isComplete = currentStep >= debugSteps.length;
  $: logs = debugger_.getLogs();

  function formatContext(ctx: any): string {
    if (!ctx) return '(없음)';
    
    const parts: string[] = [];
    
    if (ctx.chatVars && Object.keys(ctx.chatVars).length > 0) {
      const vars = Object.entries(ctx.chatVars).slice(0, 5);
      parts.push(`변수: ${vars.map(([k, v]) => `${k}=${v}`).join(', ')}`);
    }
    
    if (ctx.chat && ctx.chat.length > 0) {
      parts.push(`채팅: ${ctx.chat.length}개`);
    }
    
    if (ctx.stopped) {
      parts.push('⛔ 중단됨');
    }
    
    return parts.join(' | ') || '(변화 없음)';
  }

  function getEffectIcon(type: string): string {
    switch (type) {
      case 'setvar': return '📊';
      case 'cutchat': return '✂️';
      case 'modifychat': return '✏️';
      case 'systemprompt': return '⚙️';
      case 'impersonate': return '🎭';
      case 'stop': return '⛔';
      case 'v2ConsoleLog': return '📋';
      case 'v2RunCBS': return '🔧';
      case 'v2LuaCode': return '🌙';
      default: return '⚡';
    }
  }
</script>

<div class="trigger-debug-panel">
  <div class="panel-header">
    <h3>⚡ Trigger 디버그</h3>
    <span class="count">{scripts.length}개 스크립트</span>
  </div>

  <!-- Type Filter -->
  <div class="type-filter">
    {#each triggerTypes as type}
      <button 
        class="type-btn"
        class:active={selectedType === type.value}
        on:click={() => selectedType = type.value}
      >
        <span class="type-icon">{type.icon}</span>
        <span class="type-label">{type.label}</span>
        <span class="type-count">
          {scripts.filter(s => s.type === type.value).length}
        </span>
      </button>
    {/each}
  </div>

  <div class="debug-content">
    <!-- Script List -->
    <div class="script-list">
      <div class="list-header">📜 {selectedType} 트리거</div>
      
      {#if filteredScripts.length === 0}
        <div class="empty-list">
          이 타입의 트리거가 없습니다.
        </div>
      {:else}
        {#each filteredScripts as script, i}
          <button 
            class="script-item"
            class:selected={selectedScript === script}
            on:click={() => selectScript(script)}
          >
            <span class="script-index">#{i + 1}</span>
            <span class="script-name">{script.comment || '(이름 없음)'}</span>
            <span class="effect-count">{script.effect?.length || 0} 효과</span>
          </button>
        {/each}
      {/if}
    </div>

    <!-- Debug Area -->
    <div class="debug-area">
      {#if selectedScript}
        <div class="debug-header">
          <span class="script-title">
            {selectedScript.comment || '트리거'}
          </span>
          <button 
            class="run-btn" 
            on:click={runDebug}
            disabled={isRunning}
          >
            {isRunning ? '⏳...' : '▶ 디버그 실행'}
          </button>
        </div>

        <!-- Conditions -->
        <div class="conditions-section">
          <div class="section-title">📋 조건</div>
          {#if selectedScript.conditions && selectedScript.conditions.length > 0}
            <div class="conditions-list">
              {#each selectedScript.conditions as cond, i}
                <div class="condition-item">
                  <span class="cond-index">#{i + 1}</span>
                  <span class="cond-type">{cond.type}</span>
                  {#if cond.type === 'var'}
                    <code>{cond.var} {cond.operator || '='} {cond.value}</code>
                  {:else if cond.type === 'chatIndex'}
                    <code>채팅 #{cond.value}</code>
                  {:else}
                    <code>항상 실행</code>
                  {/if}
                </div>
              {/each}
            </div>
          {:else}
            <div class="no-conditions">조건 없음 (항상 실행)</div>
          {/if}
        </div>

        <!-- Effects -->
        <div class="effects-section">
          <div class="section-title">⚡ 효과 ({selectedScript.effect?.length || 0})</div>
          {#if selectedScript.effect && selectedScript.effect.length > 0}
            <div class="effects-list">
              {#each selectedScript.effect as eff, i}
                <div class="effect-item" class:current={currentStep === i + 1}>
                  <span class="effect-icon">{getEffectIcon(eff.type)}</span>
                  <span class="effect-type">{eff.type}</span>
                  {#if eff.type === 'setvar'}
                    <code>{eff.var} {eff.operator} {eff.value}</code>
                  {:else if eff.type === 'modifychat'}
                    <code>채팅 #{eff.index}</code>
                  {:else if eff.type === 'v2ConsoleLog'}
                    <code>로그: {eff.source}</code>
                  {/if}
                </div>
              {/each}
            </div>
          {:else}
            <div class="no-effects">효과 없음</div>
          {/if}
        </div>

        <!-- Step Debugger -->
        {#if debugSteps.length > 0}
          <div class="step-debugger">
            <div class="step-controls">
              <button on:click={stepBack} disabled={currentStep === 0}>◀</button>
              <span class="step-indicator">{currentStep} / {debugSteps.length}</span>
              <button on:click={stepForward} disabled={isComplete}>▶</button>
            </div>

            {#if currentDebugStep}
              <div class="step-detail">
                <div class="step-effect">
                  <span class="effect-icon">{getEffectIcon(currentDebugStep.effect?.type || '')}</span>
                  <span>{currentDebugStep.effect?.type || 'unknown'}</span>
                </div>
                <div class="context-diff">
                  <div class="ctx-before">
                    <label>Before</label>
                    <code>{formatContext(currentDebugStep.beforeContext)}</code>
                  </div>
                  <div class="ctx-after">
                    <label>After</label>
                    <code>{formatContext(currentDebugStep.afterContext)}</code>
                  </div>
                </div>
              </div>
            {:else}
              <div class="step-initial">
                초기 상태 - ▶ 버튼으로 진행
              </div>
            {/if}
          </div>
        {/if}

        <!-- Logs -->
        {#if logs.length > 0}
          <div class="logs-section">
            <div class="section-title">📋 로그</div>
            <div class="logs-list">
              {#each logs as log}
                <div class="log-item">{log}</div>
              {/each}
            </div>
          </div>
        {/if}

      {:else}
        <div class="no-selection">
          <div class="empty-icon">👈</div>
          <p>왼쪽에서 트리거를 선택하세요</p>
        </div>
      {/if}
    </div>
  </div>

  <!-- Simulation Results -->
  {#if results.length > 0}
    <div class="results-section">
      <div class="section-title">📊 시뮬레이션 결과</div>
      <div class="results-list">
        {#each results as result}
          <div class="result-item">
            <span class="result-step">#{result.step}</span>
            <span class="result-effect">{result.effect}</span>
            <span class="result-change">{result.after}</span>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .trigger-debug-panel {
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .panel-header h3 {
    margin: 0;
    font-size: 14px;
  }

  .count {
    font-size: 12px;
    color: var(--text-secondary, #888);
    background: var(--bg-secondary, #252526);
    padding: 2px 8px;
    border-radius: 10px;
  }

  .type-filter {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }

  .type-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    background: var(--bg-secondary, #252526);
    border: 1px solid var(--border-color, #3c3c3c);
    border-radius: 4px;
    color: var(--text-secondary, #888);
    cursor: pointer;
    font-size: 11px;
  }

  .type-btn:hover {
    background: var(--bg-hover, #2a2a2a);
    color: var(--text-primary, #d4d4d4);
  }

  .type-btn.active {
    background: var(--accent-color, #0e639c);
    border-color: var(--accent-color, #0e639c);
    color: white;
  }

  .type-icon {
    font-size: 12px;
  }

  .type-count {
    font-size: 10px;
    opacity: 0.7;
  }

  .debug-content {
    flex: 1;
    display: flex;
    gap: 12px;
    min-height: 0;
    overflow: hidden;
  }

  .script-list {
    width: 200px;
    flex-shrink: 0;
    background: var(--bg-secondary, #252526);
    border-radius: 6px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .list-header {
    padding: 8px 12px;
    font-size: 12px;
    font-weight: 600;
    background: rgba(255, 255, 255, 0.03);
    border-bottom: 1px solid var(--border-color, #3c3c3c);
  }

  .empty-list {
    padding: 16px;
    text-align: center;
    color: var(--text-secondary, #888);
    font-size: 12px;
  }

  .script-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: transparent;
    border: none;
    border-bottom: 1px solid var(--border-color, #3c3c3c);
    color: var(--text-primary, #d4d4d4);
    cursor: pointer;
    text-align: left;
    width: 100%;
    font-size: 12px;
  }

  .script-item:hover {
    background: var(--bg-hover, #2a2a2a);
  }

  .script-item.selected {
    background: rgba(14, 99, 156, 0.3);
    border-left: 2px solid var(--accent-color, #0e639c);
  }

  .script-index {
    color: var(--text-secondary, #888);
    font-size: 10px;
  }

  .script-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .effect-count {
    font-size: 10px;
    color: var(--text-secondary, #888);
  }

  .debug-area {
    flex: 1;
    min-width: 0;
    background: var(--bg-secondary, #252526);
    border-radius: 6px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .debug-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.03);
    border-bottom: 1px solid var(--border-color, #3c3c3c);
  }

  .script-title {
    font-weight: 600;
    font-size: 13px;
  }

  .run-btn {
    padding: 4px 12px;
    background: var(--accent-color, #0e639c);
    border: none;
    border-radius: 4px;
    color: white;
    font-size: 11px;
    cursor: pointer;
  }

  .run-btn:hover:not(:disabled) {
    background: #1177bb;
  }

  .run-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .no-selection {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary, #888);
  }

  .empty-icon {
    font-size: 32px;
    margin-bottom: 8px;
    opacity: 0.5;
  }

  .conditions-section, .effects-section, .step-debugger, .logs-section {
    padding: 10px 12px;
    border-bottom: 1px solid var(--border-color, #3c3c3c);
  }

  .section-title {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-secondary, #888);
    margin-bottom: 8px;
  }

  .conditions-list, .effects-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .condition-item, .effect-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 8px;
    background: var(--bg-primary, #1e1e1e);
    border-radius: 4px;
    font-size: 12px;
  }

  .effect-item.current {
    background: rgba(14, 99, 156, 0.3);
    border: 1px solid var(--accent-color, #0e639c);
  }

  .cond-index, .effect-icon {
    font-size: 11px;
  }

  .cond-type, .effect-type {
    color: #dcdcaa;
    font-family: monospace;
  }

  .condition-item code, .effect-item code {
    color: #9cdcfe;
    font-size: 11px;
    margin-left: auto;
  }

  .no-conditions, .no-effects {
    color: var(--text-secondary, #888);
    font-size: 12px;
    font-style: italic;
  }

  .step-controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    margin-bottom: 10px;
  }

  .step-controls button {
    padding: 4px 12px;
    background: var(--bg-primary, #1e1e1e);
    border: 1px solid var(--border-color, #3c3c3c);
    border-radius: 4px;
    color: var(--text-primary, #d4d4d4);
    cursor: pointer;
  }

  .step-controls button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .step-indicator {
    font-weight: 600;
    color: var(--accent-color, #0e639c);
  }

  .step-detail {
    background: var(--bg-primary, #1e1e1e);
    border-radius: 4px;
    padding: 10px;
  }

  .step-effect {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    font-weight: 600;
  }

  .context-diff {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .ctx-before, .ctx-after {
    font-size: 11px;
  }

  .ctx-before label, .ctx-after label {
    display: block;
    font-size: 10px;
    color: var(--text-secondary, #888);
    margin-bottom: 4px;
  }

  .ctx-before code {
    color: #f14c4c;
  }

  .ctx-after code {
    color: #4ec9b0;
  }

  .step-initial {
    text-align: center;
    color: var(--text-secondary, #888);
    font-size: 12px;
    padding: 8px;
  }

  .logs-section {
    max-height: 100px;
    overflow-y: auto;
  }

  .logs-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .log-item {
    font-family: monospace;
    font-size: 11px;
    color: #4ec9b0;
    padding: 2px 4px;
    background: var(--bg-primary, #1e1e1e);
    border-radius: 2px;
  }

  .results-section {
    background: var(--bg-secondary, #252526);
    border-radius: 6px;
    padding: 10px 12px;
    max-height: 120px;
    overflow-y: auto;
  }

  .results-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .result-item {
    display: flex;
    gap: 8px;
    font-size: 12px;
    padding: 4px 8px;
    background: var(--bg-primary, #1e1e1e);
    border-radius: 3px;
  }

  .result-step {
    color: var(--text-secondary, #888);
  }

  .result-effect {
    color: #dcdcaa;
  }

  .result-change {
    color: #4ec9b0;
    margin-left: auto;
  }
</style>
