<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let data: any;

  const dispatch = createEventDispatcher();

  // Asset 데이터 추출
  $: assetList = getAssetList(data);
  
  // 선택된 항목
  let selectedId = '';
  
  // 뷰 모드: gallery | list
  let viewMode: 'gallery' | 'list' = 'gallery';
  
  // 파일 input 참조
  let fileInput: HTMLInputElement;

  interface AssetEntry {
    id: string;
    name: string;
    ext: string;
    type: string;
    data?: string | Uint8Array;
    dataUrl?: string;  // 미리보기용
    size?: number;
  }

  function getAssetList(data: any): AssetEntry[] {
    if (!data) return [];
    
    console.log('[AssetTab] getAssetList called, data.assets:', data.assets);
    console.log('[AssetTab] data.assets instanceof Map:', data.assets instanceof Map);
    
    // risum/charx 모듈 에셋 (새 구조: Map<string, {name, ext, data: Uint8Array, dataUrl?}>)
    if (data.assets && data.assets instanceof Map) {
      const entries = [...data.assets.entries()] as [string, any][];
      console.log('[AssetTab] Map entries count:', entries.length);
      
      // 첫 번째 에셋 구조 확인
      if (entries.length > 0) {
        const [firstId, firstAsset] = entries[0];
        console.log('[AssetTab] First asset:', {
          id: firstId,
          name: firstAsset.name,
          ext: firstAsset.ext,
          type: firstAsset.type,
          hasData: !!firstAsset.data,
          dataType: firstAsset.data?.constructor?.name,
          dataLength: firstAsset.data?.length,
          isUint8Array: firstAsset.data instanceof Uint8Array,
          isArrayLike: ArrayBuffer.isView(firstAsset.data),
          hasDataUrl: !!firstAsset.dataUrl,
          dataUrlLen: firstAsset.dataUrl?.length,
          dataUrlStart: firstAsset.dataUrl?.slice(0, 50)
        });
      }
      
      const result = entries.map(([id, asset]) => {
        const ext = asset.ext || getExtension(id);
        const type = asset.type || getAssetType(ext);
        
        // 이미 dataUrl이 있으면 사용 (charx 변환에서 미리 계산됨)
        if (asset.dataUrl && asset.dataUrl.length > 0) {
          return {
            id,
            name: asset.name || id,
            ext,
            type,
            data: asset.data,
            dataUrl: asset.dataUrl,
            size: asset.size || (asset.data?.length || 0)
          };
        }
        
        // Uint8Array 또는 ArrayBuffer 체크 (instanceof 대신 duck typing)
        const isArrayLike = asset.data && (
          asset.data instanceof Uint8Array ||
          ArrayBuffer.isView(asset.data) ||
          (typeof asset.data.length === 'number' && typeof asset.data[0] === 'number')
        );
        
        // Uint8Array를 base64로 변환 (magic bytes 감지 사용)
        let dataUrl = '';
        let size = 0;
        
        if (isArrayLike) {
          // 배열 형태를 Uint8Array로 변환
          const bytes = asset.data instanceof Uint8Array ? asset.data : new Uint8Array(asset.data);
          size = bytes.length;
          try {
            // AssetGod 방식: magic bytes 우선 감지
            dataUrl = createDataUrlFromBytes(bytes, ext);
            console.log('[AssetTab] Blob URL 생성:', { id, ext, size, urlLen: dataUrl.length });
          } catch (e) {
            console.error('Asset conversion error:', e);
          }
        } else if (typeof asset.data === 'string') {
          // 이미 base64 문자열
          size = Math.ceil(asset.data.length * 0.75);
          dataUrl = `data:${getMimeType(ext)};base64,${asset.data}`;
        }
        
        return {
          id,
          name: asset.name || id,
          ext,
          type,
          data: asset.data,
          dataUrl,
          size
        };
      });
      
      // 디버그: 첫 3개 에셋 상태 확인
      if (result.length > 0) {
        console.log('[AssetTab] First 3 assets:', result.slice(0, 3).map(a => ({
          id: a.id,
          name: a.name,
          ext: a.ext,
          type: a.type,
          hasData: !!a.data,
          dataUrlLen: a.dataUrl?.length || 0,
          dataUrlStart: a.dataUrl?.slice(0, 50)
        })));
      }
      
      return result;
    }
    
    // 모듈 데이터가 module 필드 안에 있는 경우
    if (data.module?.assets && Array.isArray(data.module.assets)) {
      // module.assets = [[name, path, ext], ...]
      // 실제 데이터는 _rawAssets 또는 assets에 있음
      const rawAssets = data._rawAssets || [];
      
      return data.module.assets.map(([name, , ext]: [string, string, string], i: number) => {
        const id = `${name}.${ext}`;
        const assetData = rawAssets[i];
        let dataUrl = '';
        let size = 0;
        
        if (assetData instanceof Uint8Array) {
          size = assetData.length;
          try {
            // AssetGod 방식: magic bytes 우선 감지
            dataUrl = createDataUrlFromBytes(assetData, ext);
          } catch (e) {
            console.error('Asset conversion error:', e);
          }
        }
        
        return {
          id,
          name,
          ext,
          type: getAssetType(ext),
          data: assetData,
          dataUrl,
          size
        };
      });
    }
    
    // Character assets
    if (data.additionalAssets) {
      return data.additionalAssets.map((asset: any) => {
        const ext = getExtension(asset[1] || '');
        const dataUrl = asset[2] ? `data:${getMimeType(ext)};base64,${asset[2]}` : '';
        return {
          id: asset[0] || crypto.randomUUID(),
          name: asset[1] || asset[0],
          ext,
          type: 'image',
          data: asset[2],
          dataUrl,
          size: asset[2] ? Math.ceil(asset[2].length * 0.75) : 0,
        };
      });
    }
    
    return [];
  }
  
  /**
   * AssetGod 방식: magic bytes로 이미지 포맷 감지
   */
  function detectImageFormat(data: Uint8Array): string | null {
    if (!data || data.length < 12) return null;
    
    // PNG: 89 50 4E 47
    if (data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4E && data[3] === 0x47) return 'png';
    
    // JPEG: FF D8 FF
    if (data[0] === 0xFF && data[1] === 0xD8 && data[2] === 0xFF) return 'jpeg';
    
    // GIF: 47 49 46 38
    if (data[0] === 0x47 && data[1] === 0x49 && data[2] === 0x46 && data[3] === 0x38) return 'gif';
    
    // WebP: RIFF....WEBP
    if (data[0] === 0x52 && data[1] === 0x49 && data[2] === 0x46 && data[3] === 0x46 &&
        data.length > 11 && data[8] === 0x57 && data[9] === 0x45 && data[10] === 0x42 && data[11] === 0x50) return 'webp';
    
    // AVIF/HEIC: ....ftyp
    if (data.length > 12 && data[4] === 0x66 && data[5] === 0x74 && data[6] === 0x79 && data[7] === 0x70) {
      const brand = String.fromCharCode(data[8], data[9], data[10], data[11]);
      if (brand === 'avif' || brand === 'avis' || brand === 'mif1' || brand === 'heic') return 'avif';
    }
    
    return null;
  }
  
  /**
   * AssetGod 방식: Blob URL 생성 (base64보다 훨씬 효율적)
   */
  function createDataUrlFromBytes(data: Uint8Array, ext: string): string {
    if (!data || data.length === 0) return '';
    
    // 1. magic bytes로 이미지 포맷 감지
    const detectedFormat = detectImageFormat(data);
    
    // 2. MIME 타입 결정
    let mimeType: string;
    if (detectedFormat) {
      const formatMimeMap: Record<string, string> = {
        'png': 'image/png',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'avif': 'image/avif'
      };
      mimeType = formatMimeMap[detectedFormat] || 'image/png';
    } else {
      mimeType = getMimeType(ext);
    }
    
    // 3. Blob URL 생성
    try {
      const blob = new Blob([new Uint8Array(data)], { type: mimeType });
      return URL.createObjectURL(blob);
    } catch (e) {
      console.error('Failed to create blob URL:', e);
      return '';
    }
  }

  function getExtension(name: string): string {
    const match = name.match(/\.([^.]+)$/);
    return match ? match[1].toLowerCase() : '';
  }

  function getAssetType(ext: string): string {
    const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif'];
    const audioExts = ['mp3', 'wav', 'ogg', 'flac', 'm4a'];
    const videoExts = ['mp4', 'webm', 'mkv'];
    
    if (imageExts.includes(ext)) return 'image';
    if (audioExts.includes(ext)) return 'audio';
    if (videoExts.includes(ext)) return 'video';
    return 'other';
  }

  function getMimeType(ext: string): string {
    const mimeMap: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      webp: 'image/webp',
      avif: 'image/avif',
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      ogg: 'audio/ogg',
      mp4: 'video/mp4',
      webm: 'video/webm',
    };
    return mimeMap[ext] || 'application/octet-stream';
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function selectAsset(id: string) {
    selectedId = id;
  }

  function openFileDialog() {
    fileInput?.click();
  }

  async function handleFileUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files?.length) return;

    for (const file of files) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1] || '';
        addAsset(file.name, base64);
      };
      reader.readAsDataURL(file);
    }

    input.value = '';
  }

  function addAsset(name: string, base64Data: string) {
    const newData = structuredClone(data);
    const id = crypto.randomUUID();
    const ext = getExtension(name);

    if (newData.assets && newData.assets instanceof Map) {
      newData.assets.set(id, { name, ext, data: base64Data });
    } else if (newData.additionalAssets) {
      newData.additionalAssets.push([id, name, base64Data]);
    } else {
      // 새로 생성
      newData.additionalAssets = [[id, name, base64Data]];
    }

    dispatch('change', newData);
    selectedId = id;
  }

  function deleteAsset(id: string) {
    if (!confirm('이 에셋을 삭제하시겠습니까?')) return;

    const newData = structuredClone(data);

    if (newData.assets && newData.assets instanceof Map) {
      newData.assets.delete(id);
    } else if (newData.additionalAssets) {
      newData.additionalAssets = newData.additionalAssets.filter(
        (asset: any) => asset[0] !== id
      );
    }

    dispatch('change', newData);
    if (selectedId === id) selectedId = '';
  }

  function downloadAsset(asset: AssetEntry) {
    if (!asset.data) return;
    
    const link = document.createElement('a');
    link.href = `data:${getMimeType(asset.ext)};base64,${asset.data}`;
    link.download = asset.name;
    link.click();
  }

  $: selectedAsset = assetList.find((a) => a.id === selectedId);
</script>

<div class="asset-tab">
  <!-- 상단 툴바 -->
  <div class="toolbar">
    <div class="toolbar-left">
      <button
        class="view-btn"
        class:active={viewMode === 'gallery'}
        on:click={() => (viewMode = 'gallery')}
      >🖼️ 갤러리</button>
      <button
        class="view-btn"
        class:active={viewMode === 'list'}
        on:click={() => (viewMode = 'list')}
      >📋 목록</button>
    </div>
    
    <div class="toolbar-right">
      <button class="btn-add" on:click={openFileDialog}>+ 에셋 추가</button>
      <input
        bind:this={fileInput}
        type="file"
        accept="image/*,audio/*,video/*"
        multiple
        hidden
        on:change={handleFileUpload}
      />
    </div>
  </div>

  <div class="content-area">
    <!-- 갤러리 뷰 -->
    {#if viewMode === 'gallery'}
      <div class="gallery-view">
        {#each assetList as asset}
          <button
            class="gallery-item"
            class:selected={selectedId === asset.id}
            on:click={() => selectAsset(asset.id)}
          >
            <div class="gallery-thumb">
              {#if ['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'bmp'].includes(asset.ext) && asset.dataUrl}
                <img
                  src={asset.dataUrl}
                  alt={asset.name}
                  loading="lazy"
                  on:error={(e) => { console.log('[AssetTab] 이미지 로드 실패:', asset.id, asset.dataUrl?.slice(0, 50)); e.currentTarget.style.display = 'none'; }}
                />
              {:else if asset.type === 'audio'}
                <span class="type-icon">🎵</span>
              {:else if asset.type === 'video'}
                <span class="type-icon">🎬</span>
              {:else}
                <span class="type-icon">📄</span>
              {/if}
            </div>
            <span class="gallery-name">{asset.name}</span>
          </button>
        {/each}
        
        {#if assetList.length === 0}
          <div class="empty-gallery">
            <p>에셋이 없습니다</p>
            <button class="btn-add" on:click={openFileDialog}>+ 에셋 추가</button>
          </div>
        {/if}
      </div>
    {:else}
      <!-- 목록 뷰 -->
      <table class="list-view">
        <thead>
          <tr>
            <th>이름</th>
            <th>타입</th>
            <th>크기</th>
            <th>작업</th>
          </tr>
        </thead>
        <tbody>
          {#each assetList as asset}
            <tr
              class:selected={selectedId === asset.id}
              on:click={() => selectAsset(asset.id)}
            >
              <td class="name-cell">
                <span class="type-badge">{asset.type}</span>
                {asset.name}
              </td>
              <td>.{asset.ext}</td>
              <td>{formatSize(asset.size || 0)}</td>
              <td class="action-cell">
                <button on:click|stopPropagation={() => downloadAsset(asset)}>⬇️</button>
                <button on:click|stopPropagation={() => deleteAsset(asset.id)}>🗑️</button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
      
      {#if assetList.length === 0}
        <div class="empty-list">
          에셋이 없습니다
        </div>
      {/if}
    {/if}
  </div>

  <!-- 미리보기 패널 -->
  {#if selectedAsset}
    <div class="preview-panel">
      <div class="preview-header">
        <h3>{selectedAsset.name}</h3>
        <div class="preview-actions">
          <button on:click={() => downloadAsset(selectedAsset)}>⬇️ 다운로드</button>
          <button on:click={() => deleteAsset(selectedAsset.id)}>🗑️ 삭제</button>
        </div>
      </div>
      
      <div class="preview-content">
        {#if ['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'bmp'].includes(selectedAsset.ext) && selectedAsset.dataUrl}
          <img
            src={selectedAsset.dataUrl}
            alt={selectedAsset.name}
            on:error={() => console.log('[AssetTab] 상세 이미지 로드 실패:', selectedAsset.id)}
          />
        {:else if selectedAsset.type === 'audio' && selectedAsset.dataUrl}
          <audio controls src={selectedAsset.dataUrl}>
            Your browser does not support audio.
          </audio>
        {:else if selectedAsset.type === 'video' && selectedAsset.dataUrl}
          <video controls src={selectedAsset.dataUrl}>
            Your browser does not support video.
          </video>
        {:else}
          <div class="no-preview">미리보기 불가</div>
        {/if}
      </div>
      
      <div class="preview-info">
        <p><strong>ID:</strong> {selectedAsset.id}</p>
        <p><strong>크기:</strong> {formatSize(selectedAsset.size || 0)}</p>
        <p><strong>확장자:</strong> .{selectedAsset.ext}</p>
      </div>
    </div>
  {/if}
</div>

<style>
  .asset-tab {
    display: flex;
    flex-direction: column;
    height: calc(100vh - 200px);
    min-height: 400px;
    gap: 1rem;
  }

  .toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    background: var(--bg-secondary, #16213e);
    border-radius: 8px;
  }

  .toolbar-left,
  .toolbar-right {
    display: flex;
    gap: 0.5rem;
  }

  .view-btn {
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--border-color, #333);
    border-radius: 4px;
    background: transparent;
    color: var(--text-primary, #eee);
    cursor: pointer;
  }

  .view-btn.active {
    background: var(--primary, #0f3460);
    border-color: var(--primary, #0f3460);
  }

  .btn-add {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 4px;
    background: var(--primary, #0f3460);
    color: white;
    cursor: pointer;
  }

  .content-area {
    flex: 1;
    overflow-y: auto;
    background: var(--bg-secondary, #16213e);
    border-radius: 8px;
    padding: 1rem;
  }

  /* 갤러리 뷰 */
  .gallery-view {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 1rem;
  }

  .gallery-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.75rem;
    border: 2px solid transparent;
    border-radius: 8px;
    background: var(--bg-tertiary, #222);
    cursor: pointer;
    transition: all 0.15s;
  }

  .gallery-item:hover {
    border-color: var(--border-color, #555);
  }

  .gallery-item.selected {
    border-color: var(--primary, #0f3460);
    background: var(--bg-primary, #1a1a2e);
  }

  .gallery-thumb {
    width: 80px;
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border-radius: 4px;
    background: #111;
  }

  .gallery-thumb img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }

  .type-icon {
    font-size: 2rem;
  }

  .gallery-name {
    margin-top: 0.5rem;
    font-size: 0.75rem;
    max-width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: center;
  }

  .empty-gallery {
    grid-column: 1 / -1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 3rem;
    color: var(--text-secondary, #aaa);
  }

  /* 목록 뷰 */
  .list-view {
    width: 100%;
    border-collapse: collapse;
  }

  .list-view th,
  .list-view td {
    padding: 0.75rem;
    text-align: left;
    border-bottom: 1px solid var(--border-color, #333);
  }

  .list-view th {
    font-weight: 600;
    color: var(--text-secondary, #aaa);
    font-size: 0.75rem;
    text-transform: uppercase;
  }

  .list-view tr:hover {
    background: var(--bg-tertiary, #222);
  }

  .list-view tr.selected {
    background: var(--primary, #0f3460);
  }

  .name-cell {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .type-badge {
    padding: 0.125rem 0.5rem;
    border-radius: 4px;
    background: var(--bg-tertiary, #333);
    font-size: 0.75rem;
    text-transform: uppercase;
  }

  .action-cell button {
    padding: 0.25rem 0.5rem;
    border: none;
    background: transparent;
    cursor: pointer;
  }

  .empty-list {
    padding: 3rem;
    text-align: center;
    color: var(--text-secondary, #aaa);
  }

  /* 미리보기 패널 */
  .preview-panel {
    background: var(--bg-secondary, #16213e);
    border-radius: 8px;
    overflow: hidden;
  }

  .preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--border-color, #333);
  }

  .preview-header h3 {
    margin: 0;
    font-size: 0.875rem;
  }

  .preview-actions {
    display: flex;
    gap: 0.5rem;
  }

  .preview-actions button {
    padding: 0.375rem 0.75rem;
    border: 1px solid var(--border-color, #333);
    border-radius: 4px;
    background: transparent;
    color: var(--text-primary, #eee);
    cursor: pointer;
    font-size: 0.75rem;
  }

  .preview-content {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 1rem;
    min-height: 150px;
    background: #111;
  }

  .preview-content img {
    max-width: 100%;
    max-height: 300px;
    object-fit: contain;
  }

  .preview-content audio,
  .preview-content video {
    max-width: 100%;
  }

  .no-preview {
    color: var(--text-secondary, #aaa);
  }

  .preview-info {
    padding: 0.75rem 1rem;
    font-size: 0.75rem;
    color: var(--text-secondary, #aaa);
  }

  .preview-info p {
    margin: 0.25rem 0;
  }
</style>
