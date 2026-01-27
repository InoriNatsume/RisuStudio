<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { risuChatParser, setSimulatorContext, setChatVar, getChatVar, evaluateCBS } from '$lib/core/cbs';

  // 데이터
  let characterName = '';
  let firstMessage = '';
  let backgroundHTML = '';
  let virtualScript = '';
  let regexScripts: any[] = [];
  let triggerScripts: any[] = [];
  let variables: Record<string, string> = {};
  let assets: Record<string, string> = {};
  
  // Lua 엔진
  let luaEngine: any = null;
  let luaCode = '';
  
  // 상태
  let loaded = false;
  let error = '';
  
  // 렌더링 결과
  let transformedContent = '';

  onMount(async () => {
    if (!browser) return;
    
    try {
      const dataStr = sessionStorage.getItem('risustudio_simulator_data');
      if (!dataStr) {
        error = '시뮬레이터 데이터가 없습니다. 스튜디오에서 "새 탭에서 열기"를 클릭해주세요.';
        return;
      }
      
      const data = JSON.parse(dataStr);
      characterName = data.characterName || '캐릭터';
      firstMessage = data.firstMessage || '';
      backgroundHTML = data.backgroundHTML || '';
      virtualScript = data.virtualScript || '';
      regexScripts = data.regexScripts || [];
      triggerScripts = data.triggerScripts || [];
      variables = data.variables || {};
      assets = data.assets || {};
      
      // Lua 코드 추출
      luaCode = extractLuaCode(triggerScripts);
      
      console.log('[Simulator] 데이터 로드:', {
        characterName,
        messageLength: firstMessage.length,
        regexCount: regexScripts.length,
        luaCodeLength: luaCode.length,
        virtualScriptLength: virtualScript.length
      });
      
      // Lua 엔진 초기화
      if (luaCode) {
        await initLuaEngine();
      }
      
      await render();
      loaded = true;
      
    } catch (e) {
      error = `데이터 파싱 오류: ${e}`;
      console.error(e);
    }
  });

  onDestroy(() => {
    if (luaEngine) {
      luaEngine.destroy();
    }
  });

  // Lua 코드 추출
  function extractLuaCode(triggers: any[]): string {
    const codes: string[] = [];
    for (const trigger of triggers) {
      for (const eff of trigger.effect || []) {
        if (eff.type === 'triggerlua' || eff.type === 'triggercode') {
          if (eff.code) {
            codes.push(eff.code);
          }
        }
      }
    }
    return codes.join('\n\n');
  }

  // Lua 엔진 초기화
  async function initLuaEngine() {
    try {
      const { LuaEngine } = await import('$lib/core/lua');
      
      luaEngine = new LuaEngine({
        onVarChange: (key, value) => {
          console.log('[Simulator] 변수 변경:', key, '=', value);
          variables = { ...variables, [key]: value };
          // 리렌더링
          render();
        },
        onLog: (msg) => {
          console.log('[Lua Log]', msg);
        }
      });
      
      await luaEngine.init();
      luaEngine.setVariables(variables);
      
      // Lua 코드 로드 (함수 정의)
      if (luaCode) {
        await luaEngine.execute(luaCode);
        console.log('[Simulator] Lua 코드 로드 완료');
      }
    } catch (e) {
      console.error('[Simulator] Lua 엔진 초기화 실패:', e);
    }
  }

  // CBS 변수 및 조건문 치환 (RisuAI 호환 파서 사용)
  function replaceCBSVariables(text: string): string {
    // 시뮬레이터 컨텍스트 설정
    setSimulatorContext({
      userName: 'User',
      personaPrompt: '',
      chatVars: new Map(Object.entries(variables)),
      globalChatVars: new Map()
    });
    
    // RisuAI 호환 파서로 처리
    return risuChatParser(text, {
      chatID: 0,
      visualize: true,
      cbsConditions: {
        firstmsg: true
      }
    });
  }

  // 정규식 적용 (RisuAI 방식)
  function applyRegexScripts(text: string): string {
    if (!regexScripts || regexScripts.length === 0) return text;
    
    let result = text;
    
    console.log('[Simulator] 정규식 적용 시작, 스크립트 수:', regexScripts.length);
    
    for (const script of regexScripts) {
      if (script.type !== 'editdisplay') continue;
      
      try {
        // 1. 플래그 처리 (RisuAI 방식)
        let flags = 'g';
        const hasCbsFlag = script.flag?.includes('<cbs>');
        
        if (script.ableFlag && script.flag) {
          // 메타 플래그 (<move_top>, <cbs> 등) 제거
          flags = script.flag.replace(/<[^>]+>/g, '');
          // 유효하지 않은 플래그 제거
          flags = flags.trim().replace(/[^dgimsuvy]/g, '');
          // 중복 제거
          flags = flags.split('').filter((v: string, i: number, a: string[]) => a.indexOf(v) === i).join('');
        }
        if (flags.length === 0) {
          flags = 'u';
        }
        
        // 2. 입력 패턴 전처리 - <cbs> 플래그가 있으면 CBS 파싱 적용 (RisuAI 방식)
        let inPattern = script.in || '';
        if (hasCbsFlag && inPattern) {
          // CBS 파싱 적용
          inPattern = evaluateCBS(inPattern);
          console.log('[Simulator] <cbs> 플래그 - IN 패턴 CBS 처리:', script.comment || script.in?.substring(0, 30));
        }
        
        // 빈 패턴이면 스킵
        if (!inPattern || inPattern.trim() === '') {
          continue;
        }
        
        // 3. 출력 템플릿 전처리 (RisuAI 방식)
        let outTemplate = script.out || '';
        outTemplate = outTemplate.replaceAll('$n', '\n');  // $n → 줄바꿈
        // CBS 캡처 그룹 문법 변환: {{raw::$1}} → $1
        outTemplate = outTemplate.replace(/\{\{raw::\$(\d+)\}\}/g, '$$$1');
        
        // 4. 정규식 생성 및 치환 (test() 없이 바로 replace)
        const regex = new RegExp(inPattern, flags);
        const before = result;
        result = result.replace(regex, outTemplate);
        
        if (before !== result) {
          console.log('[Simulator] 정규식 매칭:', script.comment || script.in, '→ 변경됨');
        }
      } catch (e) {
        console.warn('[Simulator] 정규식 오류:', script.comment, e);
      }
    }
    
    return result;
  }

  // RisuAI 방식: 에셋 이름 정규화 (확장자 + 특수문자 제거)
  function trimAssetName(str: string): string {
    const ext = ['webp', 'png', 'jpg', 'jpeg', 'gif', 'mp4', 'webm', 'avi', 'm4p', 'm4v', 'mp3', 'wav', 'ogg'];
    let s = str.toLowerCase();
    for (const e of ext) {
      if (s.endsWith('.' + e)) {
        s = s.substring(0, s.length - e.length - 1);
        break;
      }
    }
    return s.trim().replace(/[_ \-.]/g, '');
  }

  // Levenshtein distance (RisuAI 방식)
  function getDistance(a: string, b: string): number {
    const h = a.length + 1;
    const w = b.length + 1;
    const d = new Int16Array(h * w);
    for (let i = 0; i < h; i++) d[i * w] = i;
    for (let i = 0; i < w; i++) d[i] = i;
    for (let i = 1; i < h; i++) {
      for (let j = 1; j < w; j++) {
        d[i * w + j] = Math.min(
          d[(i - 1) * w + j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1),
          d[(i - 1) * w + j] + 1,
          d[i * w + j - 1] + 1
        );
      }
    }
    return d[h * w - 1];
  }

  // 에셋 URL 치환 (RisuAI 방식)
  // RisuAI parseAdditionalAssets 구현
  // {{asset::name}}, {{image::name}}, {{raw::name}}, {{video::name}}, {{audio::name}} 등 처리
  function parseAdditionalAssets(html: string): string {
    if (!html) return html;
    
    // {{type::name}} 또는 {{type::name::}} 패턴 매칭
    const assetRegex = /\{\{(asset|image|img|video|video-img|audio|raw|path|bg|bgm|emotion)::([^}:]+)(?:::)?\}\}/gi;
    
    return html.replace(assetRegex, (full, type, name) => {
      const lowerType = type.toLowerCase();
      const lowerName = name.toLowerCase().trim();
      
      // 에셋 URL 찾기 (정확 매칭 또는 fuzzy 매칭)
      let assetUrl = findAssetUrl(lowerName);
      
      if (!assetUrl) {
        console.warn('[parseAdditionalAssets] 에셋 없음:', name);
        return ''; // RisuAI도 매칭 안되면 빈 문자열 반환
      }
      
      switch (lowerType) {
        case 'raw':
        case 'path':
          return assetUrl;
        case 'img':
          return `<img src="${assetUrl}" alt="${name}" />`;
        case 'image':
          return `<div class="risu-inlay-image"><img src="${assetUrl}" alt="${name}" /></div>\n`;
        case 'asset':
          // 확장자에 따라 이미지/비디오 자동 결정
          const ext = name.split('.').pop()?.toLowerCase() || '';
          const videoExts = ['mp4', 'webm', 'avi', 'm4p', 'm4v'];
          if (videoExts.includes(ext)) {
            return `<video controls autoplay loop><source src="${assetUrl}" type="video/${ext}"></video>\n`;
          }
          return `<div class="risu-inlay-image"><img src="${assetUrl}" alt="${name}" /></div>\n`;
        case 'video':
          return `<video controls autoplay loop><source src="${assetUrl}" type="video/mp4"></video>\n`;
        case 'video-img':
          return `<video autoplay muted loop><source src="${assetUrl}" type="video/mp4"></video>\n`;
        case 'audio':
        case 'bgm':
          return `<audio controls autoplay loop><source src="${assetUrl}" type="audio/mpeg"></audio>\n`;
        case 'bg':
          return `<div class="risu-bg" style="background-image: url('${assetUrl}')"></div>\n`;
        case 'emotion':
          return `<img src="${assetUrl}" alt="${name}" class="risu-emotion" />`;
        default:
          return assetUrl;
      }
    });
  }
  
  // 에셋 URL 찾기 (정확 매칭 + fuzzy 매칭)
  function findAssetUrl(name: string): string | null {
    if (!assets || Object.keys(assets).length === 0) return null;
    
    const trimmedName = trimAssetName(name);
    
    // 1. 정확한 매칭
    if (assets[name]) return assets[name];
    
    // 2. 대소문자 무시 매칭
    for (const [key, url] of Object.entries(assets)) {
      if (key.toLowerCase() === name.toLowerCase()) return url;
    }
    
    // 3. Fuzzy 매칭 (RisuAI 방식)
    let closestUrl = '';
    let closestDist = 999999;
    const maxDifference = 3;
    
    for (const [key, url] of Object.entries(assets)) {
      const trimmedKey = trimAssetName(key);
      const dist = getDistance(trimmedName, trimmedKey);
      
      if (dist < closestDist) {
        closestDist = dist;
        closestUrl = url;
      }
    }
    
    if (closestDist <= maxDifference && closestUrl) {
      return closestUrl;
    }
    
    return null;
  }

  // src 속성 치환 (이미 HTML에 있는 경우)
  function resolveAssetUrls(html: string): string {
    if (!html || Object.keys(assets).length === 0) return html;
    
    return html.replace(/src=["']([^"']+)["']/gi, (match, src) => {
      if (src.startsWith('data:') || src.startsWith('http') || src.startsWith('blob:')) {
        return match;
      }
      
      const assetUrl = findAssetUrl(src);
      if (assetUrl) {
        return `src="${assetUrl}"`;
      }
      
      return match;
    });
  }

  // 렌더링된 virtualScript (CBS 변수 치환 적용)
  let transformedVirtualScript = '';

  // 렌더링 (async로 변경 - Lua editDisplay 지원)
  // RisuAI 순서: Lua listenEdit → CBS 파싱 → Regex 적용
  async function render() {
    let content = firstMessage;
    console.log('[Simulator] 렌더링 시작, 원본 길이:', content.length);
    
    // 1. Lua editDisplay 트리거 실행 (listenEdit 콜백) - RisuAI는 Lua가 먼저!
    if (luaEngine) {
      try {
        content = await luaEngine.runEditDisplay(content, 'simulator');
        console.log('[Simulator] Lua editDisplay 실행 완료, 길이:', content.length);
      } catch (e) {
        console.warn('[Simulator] Lua editDisplay 오류:', e);
      }
    }
    
    // 2. 첫 번째 에셋 치환 (CBS 전에) - RisuAI parseAdditionalAssets
    content = parseAdditionalAssets(content);
    
    // 3. CBS 처리 (정규식 적용 전)
    const beforeCBS1 = content;
    content = replaceCBSVariables(content);
    console.log('[Simulator] CBS 처리 완료, 길이:', content.length, '변경:', beforeCBS1.length !== content.length);
    
    // 4. 정규식 적용 (Lua 이후에 실행)
    const beforeRegex = content;
    content = applyRegexScripts(content);
    console.log('[Simulator] 정규식 처리 완료, 길이:', content.length, '변경:', beforeRegex.length !== content.length);
    
    // 5. 두 번째 에셋 치환 (정규식 OUT에서 새 에셋 참조 생성 가능)
    content = parseAdditionalAssets(content);
    
    // 6. src 속성 치환 (HTML 내 직접 참조)
    content = resolveAssetUrls(content);
    
    transformedContent = content;
    
    // virtualScript도 처리
    if (virtualScript) {
      transformedVirtualScript = parseAdditionalAssets(virtualScript);
      transformedVirtualScript = replaceCBSVariables(transformedVirtualScript);
      transformedVirtualScript = resolveAssetUrls(transformedVirtualScript);
      console.log('[Simulator] virtualScript 렌더링 완료, 길이:', transformedVirtualScript.length);
    }
    
    console.log('[Simulator] 렌더링 완료, 길이:', content.length);
  }

  // 트리거 클릭 핸들러 (async - Lua 함수 호출)
  async function handleTriggerClick(triggerName: string) {
    console.log('[Simulator] 트리거 클릭:', triggerName);
    
    if (!luaEngine) {
      console.warn('[Simulator] Lua 엔진 없음');
      return;
    }
    
    // 함수 호출 시도
    const success = await luaEngine.callFunction(triggerName, 'simulator');
    
    if (!success) {
      // 함수가 없으면 직접 실행 시도
      console.log('[Simulator] 함수 없음, 패턴 매칭 시도');
      
      // greetingkXXX 패턴 → K = XXX
      const kMatch = triggerName.match(/k(\d+)$/i);
      if (kMatch) {
        const kValue = kMatch[1];
        variables = { ...variables, K: kValue };
        await render();
      }
    }
  }

  // 클릭 이벤트 위임
  function handleContentClick(event: MouseEvent) {
    let target = event.target as HTMLElement;
    
    while (target && target !== event.currentTarget) {
      // risu-trigger 속성
      const triggerName = target.getAttribute('risu-trigger');
      if (triggerName) {
        event.preventDefault();
        event.stopPropagation();
        handleTriggerClick(triggerName);
        return;
      }
      
      // risu-btn 속성 (Lua 버튼)
      const btnEvent = target.getAttribute('risu-btn');
      if (btnEvent) {
        event.preventDefault();
        event.stopPropagation();
        handleTriggerClick(btnEvent);
        return;
      }
      
      target = target.parentElement as HTMLElement;
    }
  }
</script>

<svelte:head>
  <title>{characterName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700;900&display=swap" rel="stylesheet">
</svelte:head>

{#if error}
  <div class="error-page">
    <p>{error}</p>
  </div>
{:else if !loaded}
  <div class="loading-page">
    <div class="spinner"></div>
  </div>
{:else}
  <div class="chat-page">
    {@html backgroundHTML}
    
    <!-- virtualScript (트리거 UI - EXIT 8 ARCHIVE 등) -->
    {#if transformedVirtualScript}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div class="virtual-script-container" on:click={handleContentClick}>
        {@html transformedVirtualScript}
      </div>
    {/if}
    
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="chat-content" on:click={handleContentClick}>
      {@html transformedContent}
    </div>
  </div>
{/if}

<style>
  /* RisuAI와 동일한 기본 스타일 */
  :global(*) {
    box-sizing: border-box;
    font-family: var(--risu-font-family);
  }
  
  :global(html, body) {
    margin: 0;
    padding: 0;
    background: var(--risu-theme-bgcolor);
    color: var(--risu-theme-textcolor);
    overflow-y: auto;
    overflow-x: hidden;
    min-height: 100vh;
    width: 100%;
  }
  
  :global(:root) {
    --FontColorStandard: #fafafa;
    --FontColorBold: #e5e5e5;
    --FontColorItalic: #8c8d93;
    --FontColorItalicBold: #8c8d93;
    --FontColorQuote1: #8c8d93;
    --FontColorQuote2: #8c8d93;
    --risu-theme-bgcolor: #282a36;
    --risu-theme-darkbg: #21222c;
    --risu-theme-borderc: #6272a4;
    --risu-theme-selected: #44475a;
    --risu-theme-draculared: #ff5555;
    --risu-theme-textcolor: #f5f5f5;
    --risu-theme-textcolor2: #64748b;
    --risu-theme-darkborderc: #4b5563;
    --risu-theme-darkbutton: #374151;
    --risu-font-family: Arial, sans-serif, serif;
  }
  
  .error-page, .loading-page {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    color: #888;
  }
  
  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid #44475a;
    border-top-color: #6272a4;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .chat-page {
    min-height: 100vh;
    padding: 24px;
    background: #282a36;
  }
  
  .chat-content {
    max-width: 800px;
    margin: 0 auto;
    line-height: 1.7;
  }
  
  /* RisuAI chattext 스타일 호환 */
  .chat-content :global(p) {
    color: var(--FontColorStandard);
  }
  
  .chat-content :global(p:first-child) {
    margin-top: 0.3rem;
  }
  
  .chat-content :global(em) {
    color: var(--FontColorItalic);
  }
  
  .chat-content :global(strong) {
    color: var(--FontColorBold);
  }
  
  .chat-content :global(strong em),
  .chat-content :global(em strong) {
    color: var(--FontColorItalicBold);
  }
  
  :global([risu-trigger]),
  :global([risu-btn]) {
    cursor: pointer;
  }
  
  :global([risu-trigger]:hover),
  :global([risu-btn]:hover) {
    opacity: 0.85;
  }
  
  :global(img) {
    max-width: 100%;
    height: auto;
  }
  
  /* virtualScript 컨테이너 - RisuAI 스타일 */
  .virtual-script-container {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1000;
    pointer-events: none;
  }
  
  /* virtualScript 내부 요소는 클릭 가능하게 */
  .virtual-script-container :global(*) {
    pointer-events: auto;
  }
  
  /* virtualScript 내부 고정 요소 지원 */
  .virtual-script-container :global(.fixed),
  .virtual-script-container :global([style*="position: fixed"]),
  .virtual-script-container :global([style*="position:fixed"]) {
    position: fixed !important;
  }
  
  /* floating-btn-group 등 RisuAI 일반 클래스 */
  :global(.floating-btn-group) {
    position: fixed;
    bottom: 20px;
    right: 20px;
    display: flex;
    gap: 8px;
    z-index: 1001;
  }
  
  :global(.float-btn) {
    padding: 10px 16px;
    border-radius: 8px;
    background: var(--risu-theme-darkbg);
    border: 1px solid var(--risu-theme-borderc);
    color: var(--risu-theme-textcolor);
    cursor: pointer;
    font-size: 14px;
  }
  
  :global(.float-btn:hover) {
    background: var(--risu-theme-selected);
  }
  
  /* exit8-panel 등 커스텀 패널 스타일 */
  :global(.exit8-panel) {
    position: fixed;
    top: 0;
    right: 0;
    width: 400px;
    height: 100vh;
    background: var(--risu-theme-darkbg);
    border-left: 1px solid var(--risu-theme-borderc);
    z-index: 1002;
    overflow-y: auto;
  }
  
  :global(.panel-header) {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    border-bottom: 1px solid var(--risu-theme-borderc);
  }
  
  :global(.btn-anomaly),
  :global(.btn-entity) {
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    border: none;
    background: transparent;
    color: var(--risu-theme-textcolor);
  }
  
  :global(.btn-anomaly.active),
  :global(.btn-entity.active) {
    border-bottom: 2px solid var(--risu-theme-draculared);
  }
</style>
