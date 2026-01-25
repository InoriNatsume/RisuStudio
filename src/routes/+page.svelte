<script lang="ts">
  import { onMount } from 'svelte';
  import { parseCharx, parseRisum, parseRisup, exportCharx, exportRisum, exportRisup, buildAssetMap } from '$lib/core';
  import { logger } from '$lib/core/logger';
  import EditorScreen from '$lib/components/editor/EditorScreen.svelte';
  import { strFromU8 } from 'fflate';

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
   * charx 파싱 결과를 UI용 데이터로 변환
   * RisuAI characterCards.ts의 importCharacterCardSpec 로직 참조
   */
  function transformCharxData(result: any): any {
    const { card, assets, raw } = result;
    const cardData = card.data;
    
    // extensions.risuai 확인 (RisuAI에서 customScripts, triggerscript 저장 위치)
    const risuext = cardData?.extensions?.risuai;
    
    // 디버깅: 실제 구조 확인
    console.log('[charx] card.spec:', card.spec);
    console.log('[charx] cardData keys:', Object.keys(cardData || {}));
    console.log('[charx] extensions keys:', Object.keys(cardData?.extensions || {}));
    console.log('[charx] risuext keys:', Object.keys(risuext || {}));
    console.log('[charx] ZIP 파일 목록:', Array.from(assets.keys()));
    
    // module.risum 확인 - charx 내부에 모듈이 포함되어 있는지
    let moduleData: any = null;
    const moduleRisumData = assets.get('module.risum') || raw?.['module.risum'];
    if (moduleRisumData) {
      console.log('[charx] module.risum 발견! 크기:', moduleRisumData.length);
      try {
        const parsedModule = parseRisum(moduleRisumData);
        moduleData = parsedModule.module;
        console.log('[charx] module.risum 파싱 성공:', {
          name: moduleData?.name,
          regex: moduleData?.regex?.length,
          trigger: moduleData?.trigger?.length
        });
      } catch (e) {
        console.warn('[charx] module.risum 파싱 실패:', e);
      }
    }
    
    // 에셋 딕셔너리 생성 (경로 → 바이트 데이터)
    const assetDict: Record<string, Uint8Array> = {};
    for (const [path, data] of assets) {
      assetDict[path] = data;
    }
    
    // 로어북 변환 (character_book → globalLore 형식)
    const lorebook: any[] = [];
    const charbook = cardData.character_book;
    if (charbook?.entries) {
      const entries = Array.isArray(charbook.entries) ? charbook.entries : Object.values(charbook.entries);
      for (const book of entries) {
        lorebook.push({
          key: book.keys?.join(', ') ?? '',
          secondkey: book.secondary_keys?.join(', ') ?? '',
          insertorder: book.insertion_order ?? 0,
          comment: book.name ?? book.comment ?? '',
          content: book.content ?? '',
          mode: 'normal',
          alwaysActive: book.constant ?? false,
          selective: book.selective ?? false,
          useRegex: book.use_regex ?? false,
          activationPercent: book.extensions?.risu_activationPercent ?? 100
        });
      }
    }
    
    // Regex 변환 - 여러 가능한 경로에서 탐색
    // 1. module.risum이 있으면 그 안의 regex 사용
    // 2. extensions.risuai.customScripts (대문자 S!)
    // 3. data.customscript
    let regex = moduleData?.regex ?? [];
    if (!regex || regex.length === 0) {
      regex = risuext?.customScripts ?? [];
    }
    if (!regex || regex.length === 0) {
      regex = cardData?.customscript ?? [];
    }
    if (!regex || regex.length === 0) {
      regex = risuext?.customscripts ?? [];
    }
    console.log('[charx] regex source - module:', moduleData?.regex?.length,
                'risuext?.customScripts:', risuext?.customScripts?.length, 
                'cardData?.customscript:', cardData?.customscript?.length);
    
    // 트리거 변환 - 여러 가능한 경로에서 탐색
    // 1. module.risum이 있으면 그 안의 trigger 사용
    // 2. extensions.risuai.triggerscript
    // 3. data.triggerscript
    let trigger = moduleData?.trigger ?? [];
    if (!trigger || trigger.length === 0) {
      trigger = risuext?.triggerscript ?? [];
    }
    if (!trigger || trigger.length === 0) {
      trigger = cardData?.triggerscript ?? [];
    }
    console.log('[charx] trigger source - module:', moduleData?.trigger?.length,
                'risuext?.triggerscript:', risuext?.triggerscript?.length,
                'cardData?.triggerscript:', cardData?.triggerscript?.length);
    
    console.log('[charx] 변환 결과 - lorebook:', lorebook.length, 'regex:', regex.length, 'trigger:', trigger.length);
    
    // 에셋 맵 생성
    const assetMap = new Map<string, { id: string; name: string; ext: string; type: string; data: Uint8Array; dataUrl: string; size: number }>();
    
    // 에셋 경로 해석 함수
    function resolveAssetPath(uri: string): Uint8Array | null {
      if (!uri) return null;
      
      // __asset: 경로
      if (uri.startsWith('__asset:')) {
        const key = uri.replace('__asset:', '');
        return assetDict[key] || assetDict[`assets/${key}`] || null;
      }
      
      // embeded:// 경로
      if (uri.startsWith('embeded://')) {
        const key = uri.replace('embeded://', '');
        return assetDict[key] || assetDict[`assets/${key}`] || null;
      }
      
      // 직접 경로
      return assetDict[uri] || assetDict[`assets/${uri}`] || null;
    }
    
    // CCv3 assets 필드 처리 (card.data.assets)
    if (cardData.assets && Array.isArray(cardData.assets)) {
      for (const asset of cardData.assets) {
        const uri = asset.uri;
        const assetData = resolveAssetPath(uri);
        
        if (assetData) {
          const fileName = asset.name || uri.split('/').pop() || 'unnamed';
          const ext = asset.ext || fileName.split('.').pop()?.toLowerCase() || '';
          const id = fileName;
          
          if (!assetMap.has(id)) {
            assetMap.set(id, {
              id,
              name: fileName,
              ext,
              type: asset.type || getAssetType(ext),
              data: assetData,
              dataUrl: createDataUrl(assetData, ext),
              size: assetData.length
            });
          }
        }
      }
    }
    
    // additionalAssets 처리 (risuai extension)
    const additionalAssets = risuext?.additionalAssets ?? [];
    for (const asset of additionalAssets) {
      const [assetName, assetPath, rawFileName] = asset;
      const ext = rawFileName ? rawFileName.split('.').pop()?.toLowerCase() || '' : '';
      const assetData = resolveAssetPath(assetPath);
      
      if (assetData) {
        const id = assetName || rawFileName || assetPath;
        if (!assetMap.has(id)) {
          assetMap.set(id, {
            id,
            name: assetName,
            ext,
            type: getAssetType(ext),
            data: assetData,
            dataUrl: createDataUrl(assetData, ext),
            size: assetData.length
          });
        }
      }
    }
    
    // ZIP 내 모든 파일 추가 (card.json 제외)
    for (const [path, data] of assets) {
      if (path === 'card.json') continue;
      
      // 파일명과 확장자 추출
      const pathParts = path.split('/');
      const fullName = pathParts[pathParts.length - 1] || path;
      const nameParts = fullName.split('.');
      const ext = nameParts.length > 1 ? nameParts.pop()?.toLowerCase() || '' : '';
      const name = nameParts.join('.');
      
      // id는 경로에서 assets/ 제거한 것 또는 파일명
      const id = path.startsWith('assets/') ? path.slice(7) : path;
      
      if (!assetMap.has(id) && !assetMap.has(name)) {
        assetMap.set(id, {
          id,
          name: name || fullName,
          ext,
          type: getAssetType(ext),
          data,
          dataUrl: createDataUrl(data, ext),
          size: data.length
        });
      }
    }
    
    console.log('[charx] assetMap size:', assetMap.size, 'first 5 keys:', Array.from(assetMap.keys()).slice(0, 5));
    
    return {
      card,
      cardData,
      // RisuAI 내부 포맷과 호환
      lorebook,
      regex,
      trigger,
      // 에셋
      assets: assetMap,
      // 원본
      _raw: raw,
      type: 'charx'
    };
  }
  
  function getAssetType(ext: string): string {
    const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'bmp'];
    const audioExts = ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'];
    const videoExts = ['mp4', 'webm', 'mov', 'avi'];
    
    if (imageExts.includes(ext)) return 'image';
    if (audioExts.includes(ext)) return 'audio';
    if (videoExts.includes(ext)) return 'video';
    return 'other';
  }
  
  /**
   * AssetGod 방식: magic bytes로 이미지 포맷 감지
   * 확장자가 없거나 잘못된 경우에도 정확하게 이미지 형식 판별
   */
  function detectImageFormat(data: Uint8Array): string | null {
    if (!data || data.length < 12) return null;
    
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4E && data[3] === 0x47) return 'png';
    
    // JPEG: FF D8 FF
    if (data[0] === 0xFF && data[1] === 0xD8 && data[2] === 0xFF) return 'jpeg';
    
    // GIF: 47 49 46 38 (GIF8)
    if (data[0] === 0x47 && data[1] === 0x49 && data[2] === 0x46 && data[3] === 0x38) return 'gif';
    
    // WebP: RIFF....WEBP (52 49 46 46 ... 57 45 42 50)
    if (data[0] === 0x52 && data[1] === 0x49 && data[2] === 0x46 && data[3] === 0x46 &&
        data.length > 11 && data[8] === 0x57 && data[9] === 0x45 && data[10] === 0x42 && data[11] === 0x50) return 'webp';
    
    // AVIF/HEIC: ....ftyp (offset 4-7 = 66 74 79 70)
    if (data.length > 12 && data[4] === 0x66 && data[5] === 0x74 && data[6] === 0x79 && data[7] === 0x70) {
      const brand = String.fromCharCode(data[8], data[9], data[10], data[11]);
      if (brand === 'avif' || brand === 'avis' || brand === 'mif1' || brand === 'heic') return 'avif';
    }
    
    // BMP: 42 4D
    if (data[0] === 0x42 && data[1] === 0x4D) return 'bmp';
    
    return null;
  }
  
  /**
   * AssetGod 방식: magic bytes 우선, 확장자 폴백으로 MIME 타입 결정
   */
  function createDataUrl(data: Uint8Array, ext: string): string {
    // 1. magic bytes로 이미지 포맷 감지 시도
    const detectedFormat = detectImageFormat(data);
    
    // 2. 감지된 포맷이 있으면 해당 MIME 사용
    if (detectedFormat) {
      const formatMimeMap: Record<string, string> = {
        'png': 'image/png',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'avif': 'image/avif',
        'bmp': 'image/bmp'
      };
      const mimeType = formatMimeMap[detectedFormat] || 'image/png';
      const base64 = uint8ArrayToBase64(data);
      return `data:${mimeType};base64,${base64}`;
    }
    
    // 3. 확장자 기반 폴백
    const mimeTypes: Record<string, string> = {
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'avif': 'image/avif',
      'bmp': 'image/bmp',
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'ogg': 'audio/ogg',
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'json': 'application/json',
      'css': 'text/css',
      'ttf': 'font/ttf',
      'otf': 'font/otf',
      'woff': 'font/woff',
      'woff2': 'font/woff2'
    };
    
    const mimeType = mimeTypes[ext] || 'application/octet-stream';
    const base64 = uint8ArrayToBase64(data);
    return `data:${mimeType};base64,${base64}`;
  }
  
  function uint8ArrayToBase64(bytes: Uint8Array): string {
    // 큰 파일 처리를 위한 청크 방식 (AssetGod 참조)
    const chunkSize = 8192;
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.byteLength));
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    return btoa(binary);
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
          // charx도 변환 필요
          const charxResult = await parseCharx(data);
          fileData = transformCharxData(charxResult);
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
