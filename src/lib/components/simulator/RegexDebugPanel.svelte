<script lang="ts">
  import { RegexEngine, RegexDebugger } from '$lib/core/regex';
  import type { RegexScript, RegexMode } from '$lib/core/regex/types';

  export let results: Array<{
    step: number;
    before: string;
    after: string;
    scriptName: string;
  }> = [];
  
  export let scripts: RegexScript[] = [];

  // Live tester
  let testInput = 'Hello, this is a test message.';
  let testPattern = '/test/gi';
  let testReplace = 'example';
  let testOutput = '';
  let testError = '';
  let testMode: RegexMode = 'editinput';

  const engine = new RegexEngine();
  const debugger_ = new RegexDebugger();

  // Step-by-step state
  let debugSteps: Array<{
    step: number;
    beforeText: string;
    afterText: string;
    script: RegexScript | null;
  }> = [];
  let currentStep = 0;

  function runTest() {
    testError = '';
    try {
      // Parse pattern
      const match = testPattern.match(/^\/(.+)\/([gimsuvy]*)$/);
      if (!match) {
        testError = 'Invalid pattern format. Use /pattern/flags';
        return;
      }

      const regex = new RegExp(match[1], match[2]);
      testOutput = testInput.replace(regex, testReplace);
    } catch (e) {
      testError = e instanceof Error ? e.message : String(e);
    }
  }

  function runDebugger() {
    if (scripts.length === 0) return;
    
    debugger_.setScripts(scripts);
    debugSteps = debugger_.runAll(testInput, testMode);
    currentStep = 0;
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

  function goToStep(step: number) {
    currentStep = Math.max(0, Math.min(step, debugSteps.length));
  }

  $: currentDebugStep = debugSteps[currentStep - 1];
  $: isComplete = currentStep >= debugSteps.length;

  const modes: { value: RegexMode; label: string }[] = [
    { value: 'editinput', label: '입력 수정' },
    { value: 'editoutput', label: '출력 수정' },
    { value: 'editprocess', label: '프로세스' },
    { value: 'editdisplay', label: '표시' },
  ];
</script>

<div class="regex-debug-panel">
  <div class="panel-header">
    <h3>🔍 Regex 디버그</h3>
    <span class="count">{scripts.length}개 스크립트</span>
  </div>

  <!-- Live Tester -->
  <div class="live-tester">
    <div class="tester-header">
      <span>🧪 Regex 테스터</span>
    </div>
    
    <div class="tester-content">
      <div class="input-row">
        <div class="input-group">
          <label>입력 텍스트</label>
          <input 
            type="text"
            bind:value={testInput}
            placeholder="테스트할 텍스트..."
          />
        </div>
      </div>
      
      <div class="pattern-row">
        <div class="input-group">
          <label>패턴 (예: /hello/gi)</label>
          <input 
            type="text"
            bind:value={testPattern}
            placeholder="/pattern/flags"
          />
        </div>
        <div class="input-group">
          <label>교체</label>
          <input 
            type="text"
            bind:value={testReplace}
            placeholder="replacement"
          />
        </div>
        <button class="test-btn" on:click={runTest}>테스트</button>
      </div>
      
      <div class="output-row">
        <label>결과</label>
        {#if testError}
          <div class="error-output">{testError}</div>
        {:else}
          <div class="success-output">{testOutput}</div>
        {/if}
      </div>
    </div>
  </div>

  <!-- Step Debugger -->
  {#if scripts.length > 0}
    <div class="step-debugger">
      <div class="debugger-header">
        <span>🐛 단계별 디버거</span>
        <div class="mode-select">
          <select bind:value={testMode} on:change={runDebugger}>
            {#each modes as mode}
              <option value={mode.value}>{mode.label}</option>
            {/each}
          </select>
        </div>
        <button class="run-debug-btn" on:click={runDebugger}>▶ 실행</button>
      </div>

      {#if debugSteps.length > 0}
        <div class="step-controls">
          <button on:click={stepBack} disabled={currentStep === 0}>◀ 이전</button>
          <span class="step-indicator">
            {currentStep} / {debugSteps.length}
          </span>
          <button on:click={stepForward} disabled={isComplete}>다음 ▶</button>
        </div>

        <div class="step-timeline">
          {#each debugSteps as step, i}
            <button 
              class="step-dot"
              class:active={i + 1 === currentStep}
              class:passed={i + 1 < currentStep}
              on:click={() => goToStep(i + 1)}
              title={step.script?.comment || `Step ${i + 1}`}
            >
              {i + 1}
            </button>
          {/each}
        </div>

        {#if currentDebugStep}
          <div class="step-detail">
            <div class="step-script">
              <span class="script-name">{currentDebugStep.script?.comment || 'Script'}</span>
              <code class="script-pattern">{currentDebugStep.script?.in || ''}</code>
            </div>
            <div class="step-diff">
              <div class="diff-before">
                <label>Before</label>
                <pre>{currentDebugStep.beforeText}</pre>
              </div>
              <div class="diff-after">
                <label>After</label>
                <pre>{currentDebugStep.afterText}</pre>
              </div>
            </div>
          </div>
        {:else}
          <div class="step-initial">
            <p>시작 상태: <code>{testInput}</code></p>
            <p class="hint">▶ 다음 버튼으로 단계별 실행</p>
          </div>
        {/if}
      {/if}
    </div>
  {/if}

  <!-- Results from simulation -->
  <div class="results-section">
    <div class="section-header">📋 시뮬레이션 결과</div>
    
    {#if results.length === 0}
      <div class="empty-state">
        시뮬레이션을 실행하면 Regex 처리 결과가 표시됩니다.
      </div>
    {:else}
      <div class="results-list">
        {#each results as result}
          <div class="result-item">
            <div class="result-header">
              <span class="step-badge">#{result.step}</span>
              <span class="script-name">{result.scriptName}</span>
            </div>
            <div class="result-diff">
              <div class="before">
                <span class="label">Before:</span>
                <code>{result.before}</code>
              </div>
              <div class="after">
                <span class="label">After:</span>
                <code>{result.after}</code>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Scripts List -->
  {#if scripts.length > 0}
    <details class="scripts-list">
      <summary>📜 등록된 스크립트 ({scripts.length})</summary>
      <div class="scripts-content">
        {#each scripts as script, i}
          <div class="script-item">
            <span class="script-index">#{i + 1}</span>
            <span class="script-comment">{script.comment || '(이름 없음)'}</span>
            <span class="script-type">{script.type}</span>
          </div>
        {/each}
      </div>
    </details>
  {/if}
</div>

<style>
  .regex-debug-panel {
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 16px;
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

  .live-tester, .step-debugger {
    background: var(--bg-secondary, #252526);
    border-radius: 6px;
    overflow: hidden;
  }

  .tester-header, .debugger-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.03);
    border-bottom: 1px solid var(--border-color, #3c3c3c);
    font-size: 12px;
    font-weight: 600;
  }

  .tester-content {
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .input-row, .pattern-row, .output-row {
    display: flex;
    gap: 8px;
    align-items: flex-end;
  }

  .input-group {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  label {
    font-size: 10px;
    color: var(--text-secondary, #888);
    text-transform: uppercase;
  }

  input, select {
    padding: 6px 8px;
    background: var(--bg-primary, #1e1e1e);
    border: 1px solid var(--border-color, #3c3c3c);
    border-radius: 4px;
    color: var(--text-primary, #d4d4d4);
    font-family: 'Consolas', monospace;
    font-size: 12px;
  }

  input:focus, select:focus {
    outline: none;
    border-color: var(--accent-color, #0e639c);
  }

  .test-btn, .run-debug-btn {
    padding: 6px 12px;
    background: var(--accent-color, #0e639c);
    border: none;
    border-radius: 4px;
    color: white;
    font-size: 12px;
    cursor: pointer;
  }

  .test-btn:hover, .run-debug-btn:hover {
    background: #1177bb;
  }

  .success-output, .error-output {
    flex: 1;
    padding: 8px;
    border-radius: 4px;
    font-family: 'Consolas', monospace;
    font-size: 12px;
  }

  .success-output {
    background: rgba(78, 201, 176, 0.1);
    border: 1px solid rgba(78, 201, 176, 0.3);
    color: #4ec9b0;
  }

  .error-output {
    background: rgba(241, 76, 76, 0.1);
    border: 1px solid rgba(241, 76, 76, 0.3);
    color: #f14c4c;
  }

  .mode-select select {
    padding: 4px 8px;
    font-size: 11px;
  }

  .step-controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 12px;
    border-bottom: 1px solid var(--border-color, #3c3c3c);
  }

  .step-controls button {
    padding: 6px 12px;
    background: var(--bg-primary, #1e1e1e);
    border: 1px solid var(--border-color, #3c3c3c);
    border-radius: 4px;
    color: var(--text-primary, #d4d4d4);
    cursor: pointer;
    font-size: 12px;
  }

  .step-controls button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .step-controls button:hover:not(:disabled) {
    background: var(--bg-hover, #2a2a2a);
  }

  .step-indicator {
    font-size: 13px;
    font-weight: 600;
    color: var(--accent-color, #0e639c);
    min-width: 60px;
    text-align: center;
  }

  .step-timeline {
    display: flex;
    justify-content: center;
    gap: 4px;
    padding: 8px 12px;
    border-bottom: 1px solid var(--border-color, #3c3c3c);
  }

  .step-dot {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--bg-primary, #1e1e1e);
    border: 2px solid var(--border-color, #3c3c3c);
    color: var(--text-secondary, #888);
    font-size: 10px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .step-dot.passed {
    background: #4ec9b0;
    border-color: #4ec9b0;
    color: white;
  }

  .step-dot.active {
    background: var(--accent-color, #0e639c);
    border-color: var(--accent-color, #0e639c);
    color: white;
    transform: scale(1.2);
  }

  .step-detail {
    padding: 12px;
  }

  .step-script {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  }

  .script-name {
    font-weight: 600;
    color: #dcdcaa;
  }

  .script-pattern {
    font-size: 11px;
    color: #9cdcfe;
    background: var(--bg-primary, #1e1e1e);
    padding: 2px 6px;
    border-radius: 3px;
  }

  .step-diff {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .diff-before, .diff-after {
    background: var(--bg-primary, #1e1e1e);
    border-radius: 4px;
    padding: 8px;
  }

  .diff-before label {
    color: #f14c4c;
  }

  .diff-after label {
    color: #4ec9b0;
  }

  .diff-before pre, .diff-after pre {
    margin: 4px 0 0 0;
    white-space: pre-wrap;
    word-break: break-word;
    font-size: 12px;
  }

  .step-initial {
    padding: 12px;
    text-align: center;
    color: var(--text-secondary, #888);
    font-size: 13px;
  }

  .step-initial code {
    display: inline;
    padding: 2px 6px;
    background: var(--bg-primary, #1e1e1e);
    border-radius: 3px;
  }

  .hint {
    font-size: 11px;
    opacity: 0.7;
  }

  .results-section {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .section-header {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary, #888);
    margin-bottom: 8px;
  }

  .empty-state {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary, #888);
    font-size: 13px;
    text-align: center;
  }

  .results-list {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .result-item {
    background: var(--bg-secondary, #252526);
    border-radius: 4px;
    padding: 8px;
  }

  .result-header {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
  }

  .step-badge {
    font-size: 10px;
    color: var(--text-secondary, #888);
    background: var(--bg-primary, #1e1e1e);
    padding: 2px 6px;
    border-radius: 3px;
  }

  .result-diff {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12px;
  }

  .result-diff .label {
    color: var(--text-secondary, #888);
  }

  .result-diff code {
    display: inline;
    padding: 2px 4px;
    background: var(--bg-primary, #1e1e1e);
    border-radius: 3px;
    font-size: 11px;
  }

  .before code {
    color: #f14c4c;
  }

  .after code {
    color: #4ec9b0;
  }

  .scripts-list {
    margin-top: auto;
  }

  .scripts-list summary {
    cursor: pointer;
    font-size: 12px;
    color: var(--text-secondary, #888);
    padding: 8px;
    background: var(--bg-secondary, #252526);
    border-radius: 4px;
  }

  .scripts-content {
    padding: 8px;
    background: var(--bg-secondary, #252526);
    border-radius: 0 0 4px 4px;
    max-height: 150px;
    overflow-y: auto;
  }

  .script-item {
    display: flex;
    gap: 8px;
    padding: 4px 0;
    font-size: 12px;
  }

  .script-index {
    color: var(--text-secondary, #888);
  }

  .script-comment {
    flex: 1;
  }

  .script-type {
    color: #9cdcfe;
    font-size: 10px;
  }
</style>
