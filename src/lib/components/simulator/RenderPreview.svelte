<script lang="ts">
  import type { RegexScript } from '$lib/core/regex/types';
  import type { TriggerScript } from '$lib/core/trigger/types';
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';

  // Props
  export let backgroundHTML: string = '';
  export let firstMessage: string = '';
  export let assets: Map<string, { dataUrl: string; name: string }> = new Map();
  export let regexScripts: RegexScript[] = [];
  export let triggerScripts: TriggerScript[] = [];

  const dispatch = createEventDispatcher<{
    triggerClick: { triggerName: string };
    varChange: { key: string; value: string };
  }>();

  let scale = 100;
  let iframeRef: HTMLIFrameElement;

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

  // RisuAI 방식: 에셋 찾기 (Levenshtein distance + 정규화)
  function findAssetByBasename(srcPath: string): { dataUrl: string; name: string } | null {
    // 정확한 이름으로 먼저 찾기
    const exact = assets.get(srcPath);
    if (exact) return exact;
    
    // RisuAI 방식: 정규화된 이름으로 가장 가까운 매칭 찾기
    const trimmedSrc = trimAssetName(srcPath);
    let closestAsset: { dataUrl: string; name: string } | null = null;
    let closestDist = 999999;
    
    const maxDifference = 3; // RisuAI 기본값
    
    for (const [key, asset] of assets) {
      const trimmedKey = trimAssetName(key);
      const dist = getDistance(trimmedSrc, trimmedKey);
      
      if (dist < closestDist) {
        closestDist = dist;
        closestAsset = asset;
        
        // 완전 일치면 바로 반환
        if (dist === 0) {
          console.log('[RenderPreview] 에셋 정확 매칭:', srcPath, '→', key);
          return asset;
        }
      }
    }
    
    if (closestDist <= maxDifference && closestAsset) {
      console.log('[RenderPreview] 에셋 근사 매칭 (거리', closestDist + '):', srcPath);
      return closestAsset;
    }
    
    return null;
  }

  // 에셋 경로를 dataUrl로 변환
  function resolveAssetUrls(content: string): string {
    if (!content) return content;
    
    let resolved = content;
    
    // 모든 에셋 패턴 처리
    for (const [key, asset] of assets) {
      // 다양한 경로 형식 치환
      resolved = resolved.replace(new RegExp(`embeded://${escapeRegex(key)}`, 'g'), asset.dataUrl);
      resolved = resolved.replace(new RegExp(`~risuasset:${escapeRegex(key)}`, 'g'), asset.dataUrl);
      resolved = resolved.replace(new RegExp(`~risuasset:assets/${escapeRegex(key)}`, 'g'), asset.dataUrl);
      resolved = resolved.replace(new RegExp(`\\{\\{asset::${escapeRegex(key)}\\}\\}`, 'g'), asset.dataUrl);
      
      // src="파일명" 형식도 치환 (일반 HTML img 태그)
      resolved = resolved.replace(new RegExp(`src="${escapeRegex(key)}"`, 'g'), `src="${asset.dataUrl}"`);
      resolved = resolved.replace(new RegExp(`src='${escapeRegex(key)}'`, 'g'), `src='${asset.dataUrl}'`);
      
      // assets/ 경로 포함된 경우도 처리
      if (!key.startsWith('assets/')) {
        resolved = resolved.replace(new RegExp(`src="assets/${escapeRegex(key)}"`, 'g'), `src="${asset.dataUrl}"`);
        resolved = resolved.replace(new RegExp(`src='assets/${escapeRegex(key)}'`, 'g'), `src='${asset.dataUrl}'`);
      }
    }
    
    // RisuAI 방식: 매칭 안 된 src 속성에 대해 베이스네임 폴백
    resolved = resolved.replace(/src=["']([^"']+)["']/g, (match, srcPath) => {
      // 이미 dataUrl이면 스킵
      if (srcPath.startsWith('data:') || srcPath.startsWith('blob:') || srcPath.startsWith('http')) {
        return match;
      }
      
      console.log('[RenderPreview] src 매칭 시도:', srcPath, '에셋키:', [...assets.keys()]);
      
      // 베이스네임으로 찾기
      const found = findAssetByBasename(srcPath);
      if (found) {
        console.log('[RenderPreview] ✅ 에셋 매칭 성공:', srcPath);
        return `src="${found.dataUrl}"`;
      }
      
      console.log('[RenderPreview] ❌ 에셋 매칭 실패:', srcPath);
      return match;
    });
    
    return resolved;
  }

  function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // 정규식 스크립트를 firstMessage에 적용해서 HTML 생성
  function applyRegexScripts(text: string, scripts: RegexScript[]): string {
    if (!text || scripts.length === 0) return text;
    
    let result = text;
    
    const editDisplayScripts = scripts.filter(s => s.type === 'editdisplay');
    console.log('[RenderPreview] 🔄 정규식 적용 시작:', {
      입력길이: text.length,
      입력샘플: text.slice(0, 100),
      정규식개수: scripts.length,
      editdisplay개수: editDisplayScripts.length,
      editdisplay상세: editDisplayScripts.map(s => ({
        이름: s.comment,
        패턴: s.in,
        출력길이: s.out?.length
      }))
    });
    
    for (const script of scripts) {
      console.log('[RenderPreview] 📋 스크립트 검사:', {
        이름: script.comment,
        type: script.type,
        ableFlag: script.ableFlag,
        패턴: script.in?.slice(0, 30)
      });
      
      // editoutput 또는 editdisplay 타입만 적용 (채팅 출력에 영향주는 것들)
      if (script.type !== 'editoutput' && script.type !== 'editdisplay') {
        console.log('[RenderPreview] ⏭️ 타입 불일치로 스킵:', script.type);
        continue;
      }
      
      // ableFlag는 "커스텀 플래그 사용 여부"이지 "활성화 여부"가 아님
      // ableFlag: false = 기본 플래그 사용, ableFlag: true = 사용자 지정 플래그 사용
      
      try {
        console.log('[RenderPreview] 🔧 정규식 생성 시도:', {
          in: script.in,
          flag: script.flag,
          ableFlag: script.ableFlag,
          inType: typeof script.in
        });
        
        // ableFlag가 true면 사용자 지정 플래그 사용, false면 기본 플래그 'g'
        let rawFlags = (script.ableFlag === true && script.flag) ? script.flag : 'g';
        // <cb>, <cbs> 등의 태그 제거
        rawFlags = rawFlags.replace(/<[^>]+>/g, '');
        // 유효한 플래그만 남기기 (g, i, m, s, u, y)
        const flags = rawFlags.split('').filter(c => 'gimsuy'.includes(c)).join('') || 'g';
        
        console.log('[RenderPreview] 🔧 플래그 정리:', { 원본: script.flag, ableFlag: script.ableFlag, 정리됨: flags });
        
        const regex = new RegExp(script.in, flags);
        console.log('[RenderPreview] ✓ 정규식 생성 성공');
        
        // reset lastIndex for global regex
        regex.lastIndex = 0;
        const matched = regex.test(result);
        regex.lastIndex = 0;
        
        console.log('[RenderPreview] 🔍 패턴 테스트:', {
          이름: script.comment,
          패턴: script.in,
          플래그: flags,
          매치됨: matched
        });
        
        if (matched) {
          const before = result;
          
          // RisuAI CBS 캡처 그룹 문법을 JavaScript 문법으로 변환
          // {{raw::$1}} → $1, {{raw::$2}} → $2, etc.
          let outTemplate = script.out || '';
          outTemplate = outTemplate.replace(/\{\{raw::\$(\d+)\}\}/g, '$$$1');
          
          // 표지판 regex의 전체 out 확인
          if (script.comment === '표지판') {
            console.log('[RenderPreview] 📋 표지판 전체 OUT:', script.out);
          }
          console.log('[RenderPreview] 📝 치환 전:', {
            이름: script.comment,
            out원본: script.out?.slice(0, 100),
            out변환: outTemplate?.slice(0, 100)
          });
          result = result.replace(regex, outTemplate);
          console.log('[RenderPreview] ✅ 정규식 적용됨:', {
            이름: script.comment,
            출력길이: result.length,
            출력샘플: result.slice(0, 300)
          });
        }
      } catch (e) {
        console.warn('[RenderPreview] 정규식 오류:', script.comment, e);
      }
    }
    
    return result;
  }

  // 정규식 적용 결과 - regexScripts도 의존성으로 명시
  $: transformedContent = applyRegexScripts(firstMessage, regexScripts);
  
  // 디버깅
  $: if (regexScripts.length > 0) {
    console.warn('[RenderPreview] 정규식 적용 결과:', {
      inputLen: firstMessage?.length,
      outputLen: transformedContent?.length,
      regexCount: regexScripts.length,
      변환됨: firstMessage !== transformedContent,
      sample: transformedContent?.slice(0, 300)
    });
  }

  // CSS에서 클래스 이름 추출해서 샘플 HTML 생성
  function extractCSSClasses(css: string): string[] {
    const matches = css.match(/\.([a-zA-Z_-][a-zA-Z0-9_-]*)\s*\{/g) || [];
    return [...new Set(matches.map(m => m.replace(/\.\s*|\s*\{/g, '')))];
  }

  // MomoTalk 샘플 HTML 생성 (CSS 클래스 기반)
  function generateSampleHTML(css: string): string {
    const classes = extractCSSClasses(css);
    console.warn('[RenderPreview] 발견된 CSS 클래스:', classes);
    
    // momotalk-container가 있으면 MomoTalk 스타일 샘플 생성
    if (classes.includes('momotalk-container')) {
      return `
        <div class="momotalk-container">
          <div class="momotalk-header">
            <span>🏠 MomoTalk</span>
            <span class="close-btn">×</span>
          </div>
          <div class="momotalk-content">
            <div class="character-list">
              <div class="character-item">
                <div class="character-avatar"></div>
                <div class="character-info">
                  <div class="character-name">샘플 캐릭터</div>
                  <div class="character-message">샘플 미리보기입니다</div>
                </div>
              </div>
            </div>
            <div class="chat-area">
              <p>CSS가 적용된 MomoTalk UI 미리보기</p>
            </div>
          </div>
        </div>
      `;
    }
    
    // 그 외: 발견된 클래스들로 간단한 샘플 생성
    return classes.slice(0, 5).map(c => `<div class="${c}">샘플: .${c}</div>`).join('\n');
  }

  // iframe 안에 주입할 클릭 핸들러 스크립트
  const iframeScript = `
<script>
  document.addEventListener('click', function(e) {
    // risu-trigger 속성이 있는 요소 찾기
    let target = e.target;
    while (target && target !== document.body) {
      const triggerName = target.getAttribute('risu-trigger');
      if (triggerName) {
        e.preventDefault();
        e.stopPropagation();
        window.parent.postMessage({ type: 'risu-trigger', triggerName: triggerName }, '*');
        return;
      }
      target = target.parentElement;
    }
  });
<\/script>
`;

  // RisuAI 기본 스타일 + 버튼 스타일
  // RisuAI와 동일한 렌더링 환경을 제공
  const paragraphStyle = `
<style>
  /* RisuAI 기본 CSS 변수 (다크 테마 기준) */
  :root {
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
  }
  
  * {
    box-sizing: border-box;
  }
  
  body {
    margin: 0;
    padding: 16px;
    font-family: Arial, sans-serif, serif;
    color: var(--risu-theme-textcolor);
    background: var(--risu-theme-bgcolor);
  }
  
  /* 버튼 기본 스타일 */
  .button-default, [risu-trigger] {
    display: inline-block;
    padding: 8px 16px;
    margin: 4px;
    background: #0e639c;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  .button-default:hover, [risu-trigger]:hover {
    background: #1177bb;
  }
</style>
`;

  // iframe용 HTML 생성 - 통합된 뷰
  // 1. 정규식 적용 (editdisplay 등) → HTML 변환
  // 2. 에셋 URL 치환
  $: contentHTML = resolveAssetUrls(transformedContent || '<p>메시지가 없습니다</p>');
  $: fullHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!-- 폰트 preconnect for faster loading -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <!-- Noto Sans KR 폰트 preload (표지판 등에서 사용) -->
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700;900&display=swap" rel="stylesheet">
  ${backgroundHTML}
  ${paragraphStyle}
</head>
<body>
${contentHTML}
${iframeScript}
</body>
</html>
  `;

  // postMessage 리스너
  function handleMessage(event: MessageEvent) {
    if (event.data?.type === 'risu-trigger') {
      const triggerName = event.data.triggerName;
      console.log('[RenderPreview] 트리거 클릭:', triggerName);
      dispatch('triggerClick', { triggerName });
    }
  }

  onMount(() => {
    window.addEventListener('message', handleMessage);
  });

  onDestroy(() => {
    window.removeEventListener('message', handleMessage);
  });

  // 디버깅
  $: console.warn('[RenderPreview] HTML:', fullHTML.length, '트리거:', triggerScripts.length);

  // 트리거에서 함수 이름 추출 (greetingk101 등)
  function extractTriggerFunctions(triggers: TriggerScript[]): string[] {
    const functions: string[] = [];
    for (const trigger of triggers) {
      // effect 배열에서 triggerlua 타입 찾기
      for (const eff of trigger.effect || []) {
        if ((eff as any).type === 'triggerlua' || (eff as any).type === 'triggercode') {
          const code = (eff as any).code || '';
          // function greetingk101(triggerId) 패턴 찾기
          const matches = code.match(/function\s+(\w+)\s*\(/g) || [];
          for (const match of matches) {
            const name = match.replace(/function\s+|\s*\(/g, '');
            if (name) functions.push(name);
          }
        }
      }
    }
    return functions;
  }

  $: triggerFunctions = extractTriggerFunctions(triggerScripts);
</script>

<div class="render-preview">
  <div class="preview-header">
    <h3>🖼️ 렌더링 미리보기</h3>
    <div class="preview-controls">
      <label class="control-item">
        <span>크기:</span>
        <input type="range" min="50" max="150" bind:value={scale} />
        <span>{scale}%</span>
      </label>
    </div>
  </div>

  <div class="preview-info">
    <span class="info-badge" class:active={regexScripts.length > 0}>
      정규식: {regexScripts.length}개
    </span>
    <span class="info-badge" class:active={firstMessage.length > 0}>
      메시지: {firstMessage.length}자
    </span>
    <span class="info-badge" class:active={backgroundHTML.length > 0}>
      CSS: {backgroundHTML.length}자
    </span>
    <span class="info-badge" class:active={assets.size > 0}>
      에셋: {assets.size}개
    </span>
  </div>

  <div class="preview-container">
    <iframe
      title="렌더링 미리보기"
      class="preview-iframe"
      srcdoc={fullHTML}
    ></iframe>
  </div>

  <details class="code-preview">
    <summary>📝 변환된 HTML 보기 ({transformedContent?.length || 0}자)</summary>
    <pre><code>{transformedContent?.slice(0, 3000) || '(없음)'}{(transformedContent?.length || 0) > 3000 ? '\n... (truncated)' : ''}</code></pre>
  </details>
</div>

<style>
  .render-preview {
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .preview-header h3 {
    margin: 0;
    font-size: 14px;
  }

  .preview-controls {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .control-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--text-secondary, #888);
  }

  .control-item input[type="range"] {
    width: 80px;
  }

  .preview-info {
    display: flex;
    gap: 12px;
  }

  .info-badge {
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 10px;
    background: var(--bg-secondary, #333);
    color: var(--text-secondary, #888);
  }

  .info-badge.active {
    background: #0e639c;
    color: white;
  }

  .preview-container {
    flex: 1;
    border: 1px solid var(--border-color, #3c3c3c);
    border-radius: 8px;
    overflow: auto;
    min-height: 500px;
    background: #fff;
    position: relative;
  }

  .preview-iframe {
    display: block;
    width: 100%;
    height: 600px;
    border: none;
    background: #fff;
  }

  .code-preview {
    background: var(--bg-secondary, #252526);
    border-radius: 6px;
    padding: 8px 12px;
    max-height: 200px;
    overflow: auto;
  }

  .code-preview summary {
    cursor: pointer;
    font-size: 12px;
    color: var(--text-secondary, #888);
  }

  .code-preview pre {
    margin: 8px 0 0 0;
    font-size: 11px;
    white-space: pre-wrap;
    word-break: break-all;
    color: #9cdcfe;
  }
</style>
