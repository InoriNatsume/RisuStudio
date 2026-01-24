<script lang="ts">
  import { onMount } from 'svelte';
  import { parseCharx, parseRisum, parseRisup, exportCharx, exportRisum, exportRisup, buildAssetMap } from '$lib/core';
  import { logger } from '$lib/core/logger';
  import EditorScreen from '$lib/components/editor/EditorScreen.svelte';

  let fileData: any = null;
  let fileName = '';
  let fileType: 'charx' | 'risum' | 'risup' | '' = '';
  let error = '';
  let isDragging = false;
  let loading = false;
  
  // 뷰 모드: 'drop' = 드롭존, 'json' = JSON 뷰어, 'edit' = 편집기
  let viewMode: 'drop' | 'json' | 'edit' = 'drop';

  function getFileType(name: string): 'charx' | 'risum' | 'risup' | '' {
    const ext = name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'charx': return 'charx';
      case 'risum': return 'risum';
      case 'risup':
      case 'risupreset': return 'risup';
      default: return '';
    }
  }

  /**
   * risum 파싱 결과를 UI용 데이터로 변환
   */
  function transformRisumData(result: any): any {
    const { module, assets, version } = result;
    
    // 에셋 배열을 Map으로 변환 (module.assets와 매핑)
    const assetMap = new Map<string, { name: string; ext: string; data: Uint8Array }>();
    
    if (module.assets && assets) {
      for (let i = 0; i < module.assets.length && i < assets.length; i++) {
        const [name, , ext] = module.assets[i];
        const id = `${name}.${ext}`;
        assetMap.set(id, {
          name,
          ext,
          data: assets[i]
        });
      }
    }
    
    return {
      // 모듈 데이터
      module,
      // UI용 에셋 맵
      assets: assetMap,
      // 원본 에셋 배열 (export용)
      _rawAssets: assets,
      // 버전
      version,
      // 타입 표시
      type: 'risum'
    };
  }

  async function handleFile(file: File) {
    loading = true;
    error = '';
    fileData = null;
    fileName = file.name;
    fileType = getFileType(file.name);

    logger.info('file', `Loading file: ${file.name} (${fileType})`);

    try {
      const buffer = await file.arrayBuffer();
      const data = new Uint8Array(buffer);

      switch (fileType) {
        case 'charx':
          fileData = await parseCharx(data);
          break;
        case 'risum':
          // risum은 변환 필요
          const risumResult = parseRisum(data);
          fileData = transformRisumData(risumResult);
          break;
        case 'risup':
          fileData = await parseRisup(data);
          break;
        default:
          error = `Unsupported file type: ${fileType}`;
          logger.error('file', error);
      }

      if (fileData) {
        logger.info('file', `Successfully parsed ${fileType} file`);
        viewMode = 'edit'; // 파싱 후 자동으로 편집 모드로 전환
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Unknown error';
      logger.error('file', `Parse error: ${error}`);
    } finally {
      loading = false;
    }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
    const file = e.dataTransfer?.files[0];
    if (file) handleFile(file);
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    isDragging = true;
  }

  function handleDragLeave() {
    isDragging = false;
  }

  function handleFileInput(e: Event) {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) handleFile(file);
  }

  function formatJson(data: any): string {
    // Map과 Uint8Array를 처리하는 replacer
    const replacer = (key: string, value: any) => {
      if (value instanceof Map) {
        const obj: Record<string, string> = {};
        for (const [k, v] of value) {
          if (v instanceof Uint8Array) {
            obj[k] = `[Uint8Array: ${v.length} bytes]`;
          } else {
            obj[k] = v;
          }
        }
        return obj;
      }
      if (value instanceof Uint8Array) {
        return `[Uint8Array: ${value.length} bytes]`;
      }
      // 긴 문자열 자르기
      if (typeof value === 'string' && value.length > 500) {
        return value.slice(0, 500) + '... [truncated]';
      }
      return value;
    };
    
    try {
      return JSON.stringify(data, replacer, 2);
    } catch (e) {
      return `[Error formatting: ${e}]`;
    }
  }

  function renderValue(value: any, depth = 0): string {
    if (value === null) return '<span class="null">null</span>';
    if (value === undefined) return '<span class="undefined">undefined</span>';
    
    const type = typeof value;
    
    if (type === 'string') {
      if (value.length > 100) {
        return `<span class="string">"${escapeHtml(value.slice(0, 100))}..."</span>`;
      }
      return `<span class="string">"${escapeHtml(value)}"</span>`;
    }
    if (type === 'number') return `<span class="number">${value}</span>`;
    if (type === 'boolean') return `<span class="boolean">${value}</span>`;
    
    if (value instanceof Uint8Array) {
      return `<span class="binary">Uint8Array(${value.length} bytes)</span>`;
    }
    
    return escapeHtml(String(value));
  }

  function escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function handleClose() {
    fileData = null;
    fileName = '';
    fileType = '';
    error = '';
    viewMode = 'drop';
  }

  async function handleDownload(event: CustomEvent<any>) {
    const data = event.detail;
    if (!data || !fileType) return;

    try {
      let blob: Blob;
      let downloadName = fileName;

      switch (fileType) {
        case 'charx':
          const charxBytes = await exportCharx(data.card, data.assets);
          blob = new Blob([new Uint8Array(charxBytes)], { type: 'application/zip' });
          break;
        case 'risum':
          const risumBytes = exportRisum(data.module, data.assets);
          blob = new Blob([new Uint8Array(risumBytes)], { type: 'application/octet-stream' });
          break;
        case 'risup':
          // parseRisup() 결과는 { preset, format } 구조
          const risupBytes = await exportRisup(data.preset);
          blob = new Blob([new Uint8Array(risupBytes)], { type: 'application/octet-stream' });
          break;
        default:
          return;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadName;
      a.click();
      URL.revokeObjectURL(url);
      
      logger.info('file', `Downloaded: ${downloadName}`);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Download failed';
      logger.error('file', `Download error: ${error}`);
    }
  }
</script>

<svelte:head>
  <title>RisuStudio</title>
</svelte:head>

<!-- 편집기 모드 -->
{#if viewMode === 'edit' && fileData && fileType}
  <EditorScreen
    data={fileData}
    {fileType}
    {fileName}
    on:close={handleClose}
    on:download={handleDownload}
  />
{:else}
  <!-- 드롭존 모드 -->
  <main>
  <header>
    <h1>RisuStudio</h1>
    <p class="subtitle">RisuAI Development IDE</p>
  </header>

  <section 
    class="dropzone"
    class:dragging={isDragging}
    class:has-file={fileData !== null}
    on:drop={handleDrop}
    on:dragover={handleDragOver}
    on:dragleave={handleDragLeave}
    role="button"
    tabindex="0"
  >
    {#if loading}
      <div class="loading">
        <div class="spinner"></div>
        <p>Loading...</p>
      </div>
    {:else if !fileData}
      <div class="dropzone-content">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        <p>Drop a file here or click to select</p>
        <p class="supported">.charx, .risum, .risup, .risupreset</p>
        <input 
          type="file" 
          accept=".charx,.risum,.risup,.risupreset" 
          on:change={handleFileInput}
        />
      </div>
    {:else}
      <div class="file-info">
        <span class="file-name">{fileName}</span>
        <span class="file-type">{fileType}</span>
      </div>
    {/if}
  </section>

  {#if error}
    <div class="error-panel">
      <h3>Error</h3>
      <pre>{error}</pre>
    </div>
  {/if}
</main>
{/if}

<style>
  main {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  header {
    text-align: center;
    margin-bottom: 2rem;
  }

  h1 {
    font-size: 2.5rem;
    margin: 0;
    background: linear-gradient(135deg, var(--accent), var(--accent-hover));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .subtitle {
    color: var(--text-muted);
    margin-top: 0.5rem;
  }

  .dropzone {
    border: 2px dashed var(--border);
    border-radius: 12px;
    padding: 3rem;
    text-align: center;
    transition: all 0.2s ease;
    cursor: pointer;
    position: relative;
    background: var(--surface);
  }

  .dropzone:hover,
  .dropzone.dragging {
    border-color: var(--accent);
    background: rgba(99, 102, 241, 0.05);
  }

  .dropzone.has-file {
    border-style: solid;
    cursor: default;
  }

  .dropzone-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .dropzone-content svg {
    color: var(--text-muted);
    opacity: 0.5;
  }

  .dropzone-content p {
    margin: 0;
    color: var(--text-secondary);
  }

  .supported {
    font-size: 0.875rem;
    color: var(--text-muted);
  }

  .dropzone input[type="file"] {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
  }

  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--border);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .file-info {
    display: flex;
    align-items: center;
    gap: 1rem;
    justify-content: center;
  }

  .file-name {
    font-weight: 600;
    color: var(--text-primary);
  }

  .file-type {
    background: var(--accent);
    color: white;
    padding: 0.25rem 0.75rem;
    border-radius: 999px;
    font-size: 0.75rem;
    text-transform: uppercase;
  }

  .error-panel {
    margin-top: 1rem;
    padding: 1rem;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 8px;
  }

  .error-panel h3 {
    margin: 0 0 0.5rem;
    color: #ef4444;
    font-size: 1rem;
  }

  .error-panel pre {
    margin: 0;
    color: #fca5a5;
    font-size: 0.875rem;
    white-space: pre-wrap;
  }

  .data-panel {
    margin-top: 2rem;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .panel-header h2 {
    margin: 0;
    font-size: 1.25rem;
  }

  .panel-header button {
    background: var(--surface);
    border: 1px solid var(--border);
    color: var(--text-secondary);
    padding: 0.5rem 1rem;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .panel-header button:hover {
    background: var(--border);
    color: var(--text-primary);
  }

  .json-tree {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 1rem;
    overflow-x: auto;
    max-height: 600px;
    overflow-y: auto;
  }

  .json-tree pre {
    margin: 0;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 0.875rem;
    line-height: 1.5;
    color: var(--text-secondary);
    white-space: pre-wrap;
    word-break: break-word;
  }

  :global(.json-tree .string) { color: #a5d6ff; }
  :global(.json-tree .number) { color: #79c0ff; }
  :global(.json-tree .boolean) { color: #ff7b72; }
  :global(.json-tree .null) { color: #8b949e; }
  :global(.json-tree .binary) { color: #d2a8ff; }
</style>
