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
    }
    
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
      
      // ableFlag가 false면 스킵
      if (script.ableFlag === false) {
        console.log('[RenderPreview] ⏭️ ableFlag=false로 스킵');
        continue;
      }
      
      try {
        console.log('[RenderPreview] 🔧 정규식 생성 시도:', {
          in: script.in,
          flag: script.flag,
          inType: typeof script.in
        });
        
        // 플래그에서 CBS 태그 등 제거하고 유효한 플래그만 추출
        let rawFlags = script.flag || 'g';
        // <cb>, <cbs> 등의 태그 제거
        rawFlags = rawFlags.replace(/<[^>]+>/g, '');
        // 유효한 플래그만 남기기 (g, i, m, s, u, y)
        const flags = rawFlags.split('').filter(c => 'gimsuy'.includes(c)).join('') || 'g';
        
        console.log('[RenderPreview] 🔧 플래그 정리:', { 원본: script.flag, 정리됨: flags });
        
        const regex = new RegExp(script.in, flags);
        console.log('[RenderPreview] ✓ 정규식 생성 성공');
        
        const matched = regex.test(text);
        
        console.log('[RenderPreview] 🔍 패턴 테스트:', {
          이름: script.comment,
          패턴: script.in,
          플래그: flags,
          매치됨: matched,
          입력에패턴있음: text.includes(script.in)
        });
        
        if (matched) {
          const before = result;
          result = result.replace(regex, script.out);
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

  // 단락 구분을 위한 스타일
  const paragraphStyle = `
<style>
  body {
    line-height: 1.8;
    padding: 16px;
  }
  p, div {
    margin-bottom: 1em;
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
