<script lang="ts">
  import { evaluateCBS, setSimulatorContext } from '$lib/core/cbs';

  export let results: Array<{
    input: string;
    output: string;
    command?: string;
  }> = [];

  // 캐릭터 정보 (외부에서 전달받음)
  export let charName: string = 'Character';
  export let chatVars: Record<string, string> = {};

  // Live CBS tester
  let testInput = '';
  let testOutput = '';
  let testError = '';
  let testTrace: Array<{ command: string; result: string }> = [];

  function runTest() {
    testError = '';
    testTrace = [];
    try {
      // 시뮬레이터 컨텍스트 설정
      setSimulatorContext({
        userName: 'User',
        chatVars: new Map(Object.entries(chatVars)),
        globalChatVars: new Map()
      });
      
      const result = evaluateCBS(testInput);
      testOutput = result;
    } catch (e) {
      testError = e instanceof Error ? e.message : String(e);
      testOutput = '';
    }
  }

  // Example CBS snippets
  const examples = [
    { label: '변수', code: '{{setvar::count::10}}Count: {{getvar::count}}' },
    { label: '조건', code: '{{#if::{{getvar::hp}}::>50}}Healthy{{#else}}Injured{{#endif}}' },
    { label: '랜덤', code: '{{random::apple,banana,cherry}}' },
    { label: '시간', code: '{{date}} {{time}}' },
    { label: '캐릭터', code: '{{char}} says hello to {{user}}' },
  ];
</script>

<div class="cbs-debug-panel">
  <div class="panel-header">
    <h3>🔧 CBS 디버그</h3>
    <span class="count">{results.length}개 처리됨</span>
  </div>

  <!-- Live Tester -->
  <div class="live-tester">
    <div class="tester-header">
      <span>🧪 실시간 테스터</span>
      <div class="examples">
        {#each examples as ex}
          <button 
            class="example-btn" 
            on:click={() => { testInput = ex.code; runTest(); }}
            title={ex.code}
          >
            {ex.label}
          </button>
        {/each}
      </div>
    </div>
    
    <div class="tester-content">
      <div class="input-group">
        <label>입력</label>
        <textarea 
          bind:value={testInput}
          placeholder="CBS 구문을 입력하세요... 예: {'{{'}char{'}}'}"
          rows="3"
          on:input={runTest}
        ></textarea>
      </div>
      
      <div class="output-group">
        <label>출력</label>
        {#if testError}
          <div class="error-output">{testError}</div>
        {:else}
          <div class="success-output">{testOutput || '(결과 없음)'}</div>
        {/if}
      </div>
    </div>
  </div>

  <!-- Results List -->
  <div class="results-section">
    <div class="section-header">
      <span>📋 처리 결과</span>
    </div>
    
    {#if results.length === 0}
      <div class="empty-state">
        <p>시뮬레이션을 실행하면 CBS 처리 결과가 표시됩니다.</p>
      </div>
    {:else}
      <div class="results-list">
        {#each results as result, i}
          <div class="result-item">
            <div class="result-header">
              <span class="result-index">#{i + 1}</span>
              {#if result.command}
                <span class="result-command">{result.command}</span>
              {/if}
            </div>
            <div class="result-diff">
              <div class="diff-before">
                <span class="diff-label">Before</span>
                <code>{result.input}</code>
              </div>
              <div class="diff-arrow">→</div>
              <div class="diff-after">
                <span class="diff-label">After</span>
                <code>{result.output}</code>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Command Reference -->
  <div class="reference-section">
    <details>
      <summary>📚 명령어 레퍼런스</summary>
      <div class="reference-content">
        <div class="ref-category">
          <h4>변수</h4>
          <code>{'{{setvar::name::value}}'}</code>
          <code>{'{{getvar::name}}'}</code>
          <code>{'{{addvar::name::1}}'}</code>
        </div>
        <div class="ref-category">
          <h4>조건</h4>
          <code>{'{{#if::condition}}...{{#endif}}'}</code>
          <code>{'{{#else}}'}</code>
          <code>{'{{equal::a::b}}'}</code>
        </div>
        <div class="ref-category">
          <h4>텍스트</h4>
          <code>{'{{random::a,b,c}}'}</code>
          <code>{'{{pick::array::index}}'}</code>
          <code>{'{{trim::text}}'}</code>
        </div>
        <div class="ref-category">
          <h4>시간</h4>
          <code>{'{{date}}'}</code>
          <code>{'{{time}}'}</code>
          <code>{'{{isotime}}'}</code>
        </div>
      </div>
    </details>
  </div>
</div>

<style>
  .cbs-debug-panel {
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

  .live-tester {
    background: var(--bg-secondary, #252526);
    border-radius: 6px;
    overflow: hidden;
  }

  .tester-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.03);
    border-bottom: 1px solid var(--border-color, #3c3c3c);
    font-size: 12px;
    font-weight: 600;
  }

  .examples {
    display: flex;
    gap: 4px;
  }

  .example-btn {
    padding: 2px 8px;
    font-size: 10px;
    background: var(--bg-primary, #1e1e1e);
    border: 1px solid var(--border-color, #3c3c3c);
    border-radius: 3px;
    color: var(--text-secondary, #888);
    cursor: pointer;
  }

  .example-btn:hover {
    background: var(--accent-color, #0e639c);
    color: white;
    border-color: var(--accent-color, #0e639c);
  }

  .tester-content {
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .input-group, .output-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .input-group label, .output-group label {
    font-size: 11px;
    color: var(--text-secondary, #888);
    text-transform: uppercase;
  }

  textarea {
    width: 100%;
    padding: 8px;
    background: var(--bg-primary, #1e1e1e);
    border: 1px solid var(--border-color, #3c3c3c);
    border-radius: 4px;
    color: var(--text-primary, #d4d4d4);
    font-family: 'Consolas', monospace;
    font-size: 12px;
    resize: vertical;
  }

  textarea:focus {
    outline: none;
    border-color: var(--accent-color, #0e639c);
  }

  .success-output, .error-output {
    padding: 8px;
    border-radius: 4px;
    font-family: 'Consolas', monospace;
    font-size: 12px;
    min-height: 40px;
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

  .results-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
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

  .result-index {
    font-size: 11px;
    color: var(--text-secondary, #888);
  }

  .result-command {
    font-size: 11px;
    color: #dcdcaa;
    font-family: monospace;
  }

  .result-diff {
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }

  .diff-before, .diff-after {
    flex: 1;
    min-width: 0;
  }

  .diff-label {
    display: block;
    font-size: 10px;
    color: var(--text-secondary, #888);
    margin-bottom: 4px;
  }

  .diff-before code {
    color: #f14c4c;
  }

  .diff-after code {
    color: #4ec9b0;
  }

  code {
    display: block;
    padding: 4px 6px;
    background: var(--bg-primary, #1e1e1e);
    border-radius: 3px;
    font-size: 11px;
    word-break: break-all;
  }

  .diff-arrow {
    color: var(--text-secondary, #888);
    padding-top: 16px;
  }

  .reference-section {
    margin-top: auto;
  }

  .reference-section summary {
    cursor: pointer;
    font-size: 12px;
    color: var(--text-secondary, #888);
    padding: 8px;
    background: var(--bg-secondary, #252526);
    border-radius: 4px;
  }

  .reference-content {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    padding: 12px;
    background: var(--bg-secondary, #252526);
    border-radius: 0 0 4px 4px;
  }

  .ref-category h4 {
    margin: 0 0 6px 0;
    font-size: 11px;
    color: var(--text-secondary, #888);
  }

  .ref-category code {
    margin-bottom: 4px;
    font-size: 10px;
    color: #9cdcfe;
  }
</style>
