<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { evaluateCBS } from '$lib/core/cbs';
  import { RegexEngine, RegexDebugger } from '$lib/core/regex';
  import { TriggerEngine, TriggerDebugger } from '$lib/core/trigger';
  import type { RegexScript } from '$lib/core/regex/types';
  import type { TriggerScript } from '$lib/core/trigger/types';
  import CBSDebugPanel from './CBSDebugPanel.svelte';
  import RegexDebugPanel from './RegexDebugPanel.svelte';
  import TriggerDebugPanel from './TriggerDebugPanel.svelte';
  import PromptPreview from './PromptPreview.svelte';
  import RenderPreview from './RenderPreview.svelte';

  const dispatch = createEventDispatcher();

  // MIME 타입 헬퍼
  function getMimeType(ext: string): string {
    const map: Record<string, string> = {
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'avif': 'image/avif',
      'svg': 'image/svg+xml',
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'ogg': 'audio/ogg',
      'mp4': 'video/mp4',
      'webm': 'video/webm',
    };
    return map[ext.toLowerCase()] || 'application/octet-stream';
  }

  // Props - editedData가 그대로 전달됨
  export let characterData: any = null;
  export let moduleData: any = null;
  export let presetData: any = null;

  // ========== 데이터 추출 (RegexTab/TriggerTab과 동일한 방식) ==========
  
  // Regex 스크립트 추출 (RegexTab의 getRegexList와 동일)
  function getRegexList(data: any): RegexScript[] {
    if (!data) return [];
    
    // 디버그: 어디에 regex가 있는지 확인
    console.log('[getRegexList] 데이터 구조 확인:', {
      'data.module?.regex': data.module?.regex?.length,
      'data.regex': data.regex?.length,
      'data.cardData?.extensions?.risuai?.additionalData?.data?.regex': 
        data.cardData?.extensions?.risuai?.additionalData?.data?.regex?.length,
      키목록: Object.keys(data || {})
    });
    
    // 다양한 경로에서 regex 찾기
    if (data.module?.regex) return data.module.regex;
    if (data.regex) return data.regex;
    
    // charx 병합 구조의 경우
    if (data.cardData?.extensions?.risuai?.additionalData?.data?.regex) {
      return data.cardData.extensions.risuai.additionalData.data.regex;
    }
    
    return [];
  }

  // Trigger 스크립트 추출 (TriggerTab의 getTriggerList와 동일)
  function getTriggerList(data: any): TriggerScript[] {
    if (!data) return [];
    if (data.module?.trigger) return data.module.trigger;
    if (data.trigger) return data.trigger;
    return [];
  }

  // 캐릭터 정보 추출
  function getCharacterInfo(data: any): { name: string; description: string; personality: string; firstMessage: string; systemPrompt: string } {
    if (!data) return { name: '', description: '', personality: '', firstMessage: '', systemPrompt: '' };
    
    // fileData 구조: { card, cardData, ... }
    // cardData는 card.data를 이미 추출해놓은 것
    const cardData = data.cardData || data.card?.data || data;
    
    console.log('[getCharacterInfo] 실제 데이터 경로:', {
      hasCardData: !!data.cardData,
      hasCard: !!data.card,
      cardDataName: cardData?.name,
      cardDataFirstMes: !!cardData?.first_mes,
    });
    
    return {
      name: cardData.name || cardData.nickname || 'Character',
      description: cardData.description || '',
      personality: cardData.personality || '',
      firstMessage: cardData.first_mes || cardData.firstMessage || '',
      systemPrompt: cardData.system_prompt || cardData.systemPrompt || '',
    };
  }

  // 백그라운드 임베딩 추출
  function getBackgroundEmbedding(data: any): { css: string; html: string } {
    if (!data) return { css: '', html: '' };
    
    // fileData 구조: { cardData, ... } → cardData.extensions.risuai
    const cardData = data.cardData || data.card?.data || data;
    const ext = cardData?.extensions?.risuai || {};
    
    // 디버깅
    if (cardData?.extensions) {
      console.warn('[HTML 디버그] backgroundHTML 길이:', ext.backgroundHTML?.length || 0);
      console.warn('[HTML 디버그] backgroundHTML 시작:', ext.backgroundHTML?.slice(0, 500));
    }
    
    return {
      css: ext.additionalText || ext.backgroundCSS || '',
      html: ext.backgroundHTML || '',
    };
  }

  // virtualscript 추출 (트리거 UI)
  function getVirtualScript(data: any): string {
    if (!data) return '';
    
    const cardData = data.cardData || data.card?.data || data;
    const ext = cardData?.extensions?.risuai || {};
    const additionalData = ext.additionalData?.data || {};
    
    // virtualscript 위치 확인
    const virtualscript = additionalData.virtualscript || ext.virtualscript || cardData.virtualscript || '';
    
    if (virtualscript) {
      console.log('[getVirtualScript] virtualscript 발견, 길이:', virtualscript.length);
    }
    
    return virtualscript;
  }

  // 에셋 추출 (이미지, 오디오 등)
  // fileData.assets는 이미 Map<string, { id, name, ext, type, data, dataUrl, size }>
  function getAssets(data: any): Map<string, { dataUrl: string; name: string }> {
    const result = new Map<string, { dataUrl: string; name: string }>();
    if (!data) return result;
    
    // fileData.assets가 이미 Map인 경우 (transformCharxData에서 생성)
    if (data.assets instanceof Map) {
      console.log('[getAssets] assets Map 발견, 크기:', data.assets.size);
      for (const [key, asset] of data.assets) {
        let dataUrl = asset.dataUrl;
        
        // dataUrl이 없으면 data에서 생성
        if (!dataUrl && asset.data) {
          try {
            const bytes = asset.data instanceof Uint8Array ? asset.data : new Uint8Array(asset.data);
            const mime = getMimeType(asset.ext || 'png');
            const blob = new Blob([bytes], { type: mime });
            dataUrl = URL.createObjectURL(blob);
            console.log('[getAssets] Blob URL 생성:', key, dataUrl.slice(0, 30));
          } catch (e) {
            console.error('[getAssets] Blob URL 생성 실패:', key, e);
          }
        }
        
        if (dataUrl) {
          result.set(key, { 
            dataUrl, 
            name: asset.name || key 
          });
        }
      }
    }
    // 배열인 경우
    else if (Array.isArray(data.assets)) {
      for (const asset of data.assets) {
        if (asset.uri && asset.name) {
          result.set(asset.name, { 
            dataUrl: asset.uri, 
            name: asset.name 
          });
        }
      }
    }
    
    console.log('[getAssets] 최종 결과:', result.size, '개, 키:', [...result.keys()]);
    
    // 캐릭터 아이콘 추출 (risuai extension에서)
    const cardData = data.cardData || data.card?.data || data;
    const risuai = cardData?.extensions?.risuai || {};
    
    // iconUrl 또는 다른 아이콘 필드
    const charIconUrl = risuai.iconUrl || risuai.icon;
    if (charIconUrl) {
      result.set('__char_icon__', { dataUrl: charIconUrl, name: 'Character Icon' });
    }
    
    // assets Map에서 아이콘 찾기 (ccv3에서는 대표 이미지가 따로 있을 수 있음)
    if (data.assets instanceof Map) {
      // 메인 아이콘 에셋이 있는지 확인
      for (const [key, asset] of data.assets) {
        if ((key === 'main' || key === 'icon' || asset.name === 'main') && asset.dataUrl) {
          result.set('__char_icon__', { dataUrl: asset.dataUrl, name: 'Character Icon' });
          break;
        }
      }
    }
    
    console.log('[getAssets] 최종 결과:', result.size, '개, keys:', [...result.keys()].slice(0, 5));
    
    return result;
  }

  // ========== Reactive 데이터 ==========
  $: regexScripts = getRegexList(characterData);
  $: triggerScripts = getTriggerList(characterData);
  $: charInfo = getCharacterInfo(characterData);
  $: bgEmbed = getBackgroundEmbedding(characterData);
  $: virtualScript = getVirtualScript(characterData);
  $: assets = getAssets(characterData);
  $: charIcon = assets.get('__char_icon__')?.dataUrl || '';

  // 디버그: regex 추출 확인
  $: {
    console.log('[SimulatorPanel] 🔍 Regex 추출 결과:', {
      characterData키: Object.keys(characterData || {}),
      'module?.regex': characterData?.module?.regex?.length,
      'regex': characterData?.regex?.length,
      추출된개수: regexScripts.length,
      editdisplay개수: regexScripts.filter((s: any) => s.type === 'editdisplay').length
    });
  }

  // CBS 처리된 첫 메시지 (MomoTalk UI 렌더링용)
  // chatVars가 변경되면 재계산됨
  $: processedFirstMessage = computeProcessedMessage(charInfo.firstMessage, chatVars);
  
  function computeProcessedMessage(rawMessage: string, vars: Record<string, string>): string {
    if (!rawMessage) return '';
    try {
      const result = evaluateCBS(rawMessage);
      console.log('[SimulatorPanel] CBS 처리 결과 (K=' + vars.K + '):', {
        inputLen: rawMessage.length,
        outputLen: result.length,
        sample: result.slice(0, 300)
      });
      return result;
    } catch (e) {
      console.warn('[SimulatorPanel] CBS 처리 실패:', e);
      return rawMessage;
    }
  }

  // State
  let activeTab: 'render' | 'prompt' | 'cbs' | 'regex' | 'trigger' = 'render';
  let isRunning = false;
  
  // Simulation inputs
  let userMessage = '';
  let chatHistory: Array<{ role: string; content: string }> = [];
  // MomoTalk 같은 UI의 기본 변수 (K는 탭 선택, 자주 사용됨)
  let chatVars: Record<string, string> = { K: '101' };
  
  // Simulation results
  let processedPrompt = '';
  let cbsResults: Array<{ input: string; output: string; command?: string }> = [];
  let regexResults: Array<{ step: number; before: string; after: string; scriptName: string }> = [];
  let triggerResults: Array<{ step: number; effect: string; before: any; after: any }> = [];

  // Engines
  const regexEngine = new RegexEngine();
  const triggerEngine = new TriggerEngine();
  const regexDebugger = new RegexDebugger();
  const triggerDebugger = new TriggerDebugger();

  // 디버그 로깅
  $: {
    console.log('[SimulatorPanel] 전체 characterData:', characterData);
    console.log('[SimulatorPanel] 데이터 요약:', {
      regexCount: regexScripts.length,
      triggerCount: triggerScripts.length,
      charName: charInfo.name,
      firstMessage: charInfo.firstMessage?.slice(0, 100),
      hasBgCSS: bgEmbed.css.length > 0,
      bgCSSLen: bgEmbed.css.length,
      hasBgHTML: bgEmbed.html.length > 0,
      bgHTMLLen: bgEmbed.html.length,
      assetCount: assets.size,
      assetKeys: [...assets.keys()],
    });
  }

  function createCBSContext() {
    return {
      char: { name: charInfo.name },
      user: 'User',
      chatVars: { ...chatVars },
      globalVars: {},
      tempVars: {},
      chatHistory: chatHistory.map((msg, i) => ({
        role: msg.role as 'user' | 'char',
        data: msg.content,
      })),
      history: [],
      chatID: chatHistory.length,
    };
  }

  function runSimulation() {
    isRunning = true;
    cbsResults = [];
    regexResults = [];
    triggerResults = [];

    try {
      const context = createCBSContext();

      // 1. Process CBS in description
      if (charInfo.description) {
        const result = evaluateCBS(charInfo.description, context);
        if (charInfo.description !== result.output) {
          cbsResults.push({ 
            input: charInfo.description.slice(0, 100), 
            output: result.output.slice(0, 100), 
            command: 'description' 
          });
        }
      }

      // 2. Process CBS in personality  
      if (charInfo.personality) {
        const result = evaluateCBS(charInfo.personality, context);
        if (charInfo.personality !== result.output) {
          cbsResults.push({ 
            input: charInfo.personality.slice(0, 100), 
            output: result.output.slice(0, 100), 
            command: 'personality' 
          });
        }
      }

      // 3. Process CBS in first message
      if (charInfo.firstMessage) {
        const result = evaluateCBS(charInfo.firstMessage, context);
        if (charInfo.firstMessage !== result.output) {
          cbsResults.push({ 
            input: charInfo.firstMessage.slice(0, 100), 
            output: result.output.slice(0, 100), 
            command: 'firstMessage' 
          });
        }
      }

      // 4. Run regex scripts
      if (regexScripts.length > 0) {
        regexEngine.setScripts(regexScripts);
        regexDebugger.setScripts(regexScripts);
        regexDebugger.setMode('editinput');
        
        const regexInput = userMessage || 'Sample user message for testing';
        const debugResult = regexDebugger.runAll(regexInput);
        regexResults = debugResult.steps.map((step: any) => ({
          step: step.step,
          before: step.input?.slice(0, 100) || '',
          after: step.output?.slice(0, 100) || '',
          scriptName: step.script?.name || `Script ${step.step}`,
        }));
      }

      // 5. Run trigger scripts
      if (triggerScripts.length > 0) {
        triggerEngine.setScripts(triggerScripts);
        const triggerContext = triggerEngine.createContext();
        triggerContext.chat = chatHistory.map((msg) => ({
          role: msg.role as 'user' | 'char',
          content: msg.content,
        }));
        triggerContext.chatVars = { ...chatVars };

        triggerDebugger.setScript(triggerScripts[0]);
        const trigSteps = triggerDebugger.runAll();
        triggerResults = trigSteps.map(step => ({
          step: step.step,
          effect: step.effect?.type || 'unknown',
          before: summarizeContext(step.beforeContext),
          after: summarizeContext(step.afterContext),
        }));
      }

      // 6. Build final prompt
      processedPrompt = buildPromptPreview();

    } catch (error) {
      console.error('Simulation error:', error);
      processedPrompt = `Error: ${error instanceof Error ? error.message : String(error)}`;
    }

    isRunning = false;
  }

  function summarizeContext(ctx: any): string {
    const vars = Object.entries(ctx?.chatVars || {}).slice(0, 3);
    return vars.map(([k, v]) => `${k}=${v}`).join(', ') || '(no vars)';
  }

  function buildPromptPreview(): string {
    const parts: string[] = [];
    const context = createCBSContext();
    
    if (charInfo.systemPrompt) {
      const result = evaluateCBS(charInfo.systemPrompt, context);
      parts.push(`[System Prompt]\n${result.output}`);
    }
    
    if (charInfo.description) {
      const result = evaluateCBS(charInfo.description, context);
      parts.push(`[Description]\n${result.output}`);
    }
    
    if (charInfo.personality) {
      const result = evaluateCBS(charInfo.personality, context);
      parts.push(`[Personality]\n${result.output}`);
    }
    
    if (charInfo.firstMessage) {
      const result = evaluateCBS(charInfo.firstMessage, context);
      parts.push(`[First Message]\n${result.output}`);
    }
    
    // Add chat history
    chatHistory.forEach((msg) => {
      const role = msg.role === 'user' ? 'User' : charInfo.name;
      parts.push(`[${role}]\n${msg.content}`);
    });
    
    if (userMessage) {
      parts.push(`[User]\n${userMessage}`);
    }
    
    return parts.join('\n\n---\n\n');
  }

  function addMessage(role: 'user' | 'char') {
    if (!userMessage.trim()) return;
    
    chatHistory = [...chatHistory, { role, content: userMessage }];
    userMessage = '';
  }

  function clearHistory() {
    chatHistory = [];
    chatVars = { K: '101' }; // 기본값 유지
    cbsResults = [];
    regexResults = [];
    triggerResults = [];
    processedPrompt = '';
  }

  function setVariable(key: string, value: string) {
    chatVars = { ...chatVars, [key]: value };
  }

  function addVariableFromInputs() {
    const keyEl = document.getElementById('varKey') as HTMLInputElement;
    const valEl = document.getElementById('varValue') as HTMLInputElement;
    if (keyEl && keyEl.value) {
      setVariable(keyEl.value, valEl?.value || '');
      keyEl.value = '';
      if (valEl) valEl.value = '';
    }
  }

  // 트리거 클릭 핸들러 (RenderPreview에서 호출)
  // reference/web/app.js의 handleTriggerMessage 방식 참고
  function handleTriggerClick(event: CustomEvent<{ triggerName: string }>) {
    const { triggerName } = event.detail;
    console.log('[SimulatorPanel] 트리거 클릭:', triggerName);
    
    // 1. triggerMap에서 매핑 찾기
    const mapping = triggerMap[triggerName];
    if (mapping) {
      console.log('[SimulatorPanel] triggerMap 매핑 발견:', mapping);
      chatVars = { ...chatVars, [mapping.key]: mapping.value };
      triggerResults = [...triggerResults, {
        step: triggerResults.length + 1,
        effect: `${triggerName} -> ${mapping.key}=${mapping.value}`,
        before: { ...chatVars },
        after: { ...chatVars }
      }];
      return;
    }
    
    // 2. 매핑 없으면 greetingk(\d+) 패턴에서 추정
    const guess = String(triggerName).match(/greetingk(\d+)/i);
    if (guess) {
      const kValue = guess[1];
      console.log('[SimulatorPanel] 패턴 추정:', triggerName, '-> K=', kValue);
      chatVars = { ...chatVars, K: kValue };
      triggerResults = [...triggerResults, {
        step: triggerResults.length + 1,
        effect: `${triggerName} -> K=${kValue} (추정)`,
        before: { ...chatVars },
        after: { ...chatVars }
      }];
      return;
    }
    
    console.warn('[SimulatorPanel] 트리거 매핑 없음:', triggerName);
  }
  
  // 트리거 Lua 코드에서 함수-변수 매핑 추출
  // function greetingk101(triggerId) setChatVar(triggerId, "K", "101") end
  function parseTriggerLua(triggers: TriggerScript[]): Record<string, { key: string; value: string }> {
    const map: Record<string, { key: string; value: string }> = {};
    
    for (const trigger of triggers) {
      for (const eff of trigger.effect || []) {
        if ((eff as any).type !== 'triggerlua' && (eff as any).type !== 'triggercode') continue;
        
        const code = (eff as any).code || '';
        // function functionName(triggerId) setChatVar(triggerId, "K", "101") end
        const re = /function\s+([A-Za-z0-9_]+)\s*\([^)]*\)\s*setChatVar\s*\([^,]+,\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*\)/g;
        let match;
        while ((match = re.exec(code)) !== null) {
          map[match[1]] = { key: match[2], value: match[3] };
          console.log('[SimulatorPanel] triggerMap 추가:', match[1], '->', match[2], '=', match[3]);
        }
      }
    }
    
    return map;
  }
  
  // triggerMap 계산 (triggerScripts가 변경될 때)
  $: triggerMap = parseTriggerLua(triggerScripts);

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

  // 에셋에서 가장 가까운 매칭 찾기 (RisuAI 방식)
  function findClosestAsset(name: string, assetMap: Map<string, { dataUrl: string; name?: string }>): { key: string; dataUrl: string } | null {
    const trimmedName = trimAssetName(name);
    let closestKey = '';
    let closestDist = 999999;
    let closestDataUrl = '';
    
    const maxDifference = 3; // RisuAI 기본값
    
    for (const [key, assetObj] of assetMap) {
      if (key === '__char_icon__') continue;
      
      const trimmedKey = trimAssetName(key);
      const dist = getDistance(trimmedName, trimmedKey);
      
      if (dist < closestDist) {
        closestKey = key;
        closestDist = dist;
        closestDataUrl = assetObj.dataUrl;
      }
    }
    
    if (closestDist > maxDifference) {
      return null;
    }
    
    return { key: closestKey, dataUrl: closestDataUrl };
  }

  // 새 탭에서 시뮬레이터 열기
  function openInNewTab() {
    // firstMessage + regex out에서 사용되는 이미지만 추출
    const usedAssets: Record<string, string> = {};
    
    // 1. firstMessage에서 img src 추출
    const imgPattern = /src=["']([^"']+)["']/gi;
    let match;
    const imagesToFind = new Set<string>();
    
    // firstMessage에서 찾기
    while ((match = imgPattern.exec(charInfo.firstMessage)) !== null) {
      const src = match[1];
      if (!src.startsWith('data:') && !src.startsWith('http') && !src.startsWith('blob:')) {
        imagesToFind.add(src);
      }
    }
    
    // 2. regex out에서도 찾기 (치환 후 생성될 이미지)
    for (const script of regexScripts) {
      if (script.out) {
        const outPattern = /src=["']([^"'$]+)["']/gi;
        while ((match = outPattern.exec(script.out)) !== null) {
          const src = match[1];
          if (!src.startsWith('data:') && !src.startsWith('http') && !src.startsWith('{{')) {
            imagesToFind.add(src);
          }
        }
      }
    }
    
    console.log('[SimulatorPanel] 사용되는 이미지:', [...imagesToFind]);
    
    // 3. RisuAI 방식으로 에셋 매칭
    // 에셋 ID(예: 규칙.png)와 HTML 참조명(예: 규칙.webp)이 달라도 매칭
    for (const imgName of imagesToFind) {
      const found = findClosestAsset(imgName, assets);
      if (found) {
        // HTML에서 참조하는 이름(imgName)을 키로 저장
        usedAssets[imgName] = found.dataUrl;
        console.log('[SimulatorPanel] 에셋 매칭:', imgName, '→', found.key);
      } else {
        console.warn('[SimulatorPanel] 에셋 미발견:', imgName);
      }
    }
    
    console.log('[SimulatorPanel] 추출된 에셋:', Object.keys(usedAssets).length, '개');
    
    // 데이터 준비
    const simulatorData = {
      characterName: charInfo.name,
      firstMessage: charInfo.firstMessage,
      backgroundHTML: bgEmbed.css + bgEmbed.html,
      virtualScript,
      regexScripts,
      triggerScripts,
      variables: chatVars,
      assets: usedAssets,
    };
    
    console.log('[SimulatorPanel] virtualScript 길이:', virtualScript.length);
    
    // sessionStorage에 저장
    try {
      const dataStr = JSON.stringify(simulatorData);
      console.log('[SimulatorPanel] 시뮬레이터 데이터 크기:', (dataStr.length / 1024).toFixed(1), 'KB');
      sessionStorage.setItem('risustudio_simulator_data', dataStr);
      
      // 새 탭 열기
      window.open('/simulator', '_blank');
    } catch (e) {
      console.error('[SimulatorPanel] 데이터 저장 오류:', e);
      alert('시뮬레이터 데이터 저장에 실패했습니다. 이미지가 너무 많습니다.');
    }
  }

  // 트리거에서 함수 이름 추출
  function extractTriggerFunctions(triggers: any[]): string[] {
    const functions: string[] = [];
    for (const trigger of triggers) {
      for (const eff of trigger.effect || []) {
        if (eff.type === 'triggerlua' || eff.type === 'triggercode') {
          const code = eff.code || '';
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

  // 트리거 함수 추출 (reactive)
  $: triggerFunctions = extractTriggerFunctions(triggerScripts);

  // 트리거 함수 실행 (버튼 클릭 시)
  function executeTriggerFunction(funcName: string) {
    console.log('[SimulatorPanel] 트리거 함수 실행:', funcName);
    
    // 함수 이름에서 setChatVar 값 추출 (greetingk101 -> K="101")
    // 패턴: greetingkXXX -> K=XXX
    const kMatch = funcName.match(/k(\d+)$/i);
    if (kMatch) {
      const kValue = kMatch[1];
      console.log('[SimulatorPanel] K 값 설정:', kValue);
      chatVars = { ...chatVars, K: kValue };
    }
    
    // 트리거 Lua 코드에서 직접 찾아서 실행
    for (const trigger of triggerScripts) {
      for (const eff of trigger.effect || []) {
        if (eff.type === 'triggerlua' || eff.type === 'triggercode') {
          const code = eff.code || '';
          // 해당 함수의 setChatVar 찾기
          const funcPattern = new RegExp(`function\\s+${funcName}\\s*\\([^)]*\\)\\s*([^]*?)\\s*end`, 'm');
          const funcMatch = code.match(funcPattern);
          if (funcMatch) {
            const funcBody = funcMatch[1];
            // setChatVar 파싱
            const setVarMatch = funcBody.match(/setChatVar\s*\([^,]*,\s*["'](\w+)["']\s*,\s*["']([^"']+)["']\s*\)/);
            if (setVarMatch) {
              const [, key, value] = setVarMatch;
              console.log('[SimulatorPanel] setChatVar from function:', key, '=', value);
              chatVars = { ...chatVars, [key]: value };
            }
          }
        }
      }
    }
  }
</script>

<div class="simulator-panel">
  <div class="simulator-header">
    <h2>🧪 프롬프트 시뮬레이터</h2>
    <div class="data-summary">
      <span class="badge" class:active={bgEmbed.css.length > 0 || bgEmbed.html.length > 0} title="백그라운드 임베딩">🖼️ {bgEmbed.css.length > 0 || bgEmbed.html.length > 0 ? 'O' : 'X'}</span>
      <span class="badge" class:active={assets.size > 0} title="에셋">📦 {assets.size}</span>
      <span class="badge" class:active={regexScripts.length > 0} title="Regex 스크립트">⚙️ {regexScripts.length}</span>
      <span class="badge" class:active={triggerScripts.length > 0} title="Trigger 스크립트">⚡ {triggerScripts.length}</span>
      <span class="badge" title="캐릭터">👤 {charInfo.name}</span>
    </div>
    <div class="header-actions">
      <button class="run-btn" on:click={runSimulation} disabled={isRunning}>
        {isRunning ? '⏳ 실행 중...' : '▶️ 시뮬레이션 실행'}
      </button>
      <button class="newtab-btn" on:click={openInNewTab} title="새 탭에서 전체화면 시뮬레이터 열기">
        🔳 새 탭에서 열기
      </button>
      <button class="clear-btn" on:click={clearHistory}>
        🗑️ 초기화
      </button>
    </div>
  </div>

  <div class="simulator-tabs">
    <button 
      class="tab" 
      class:active={activeTab === 'render'}
      on:click={() => activeTab = 'render'}
    >
      🖼️ 렌더링 미리보기
    </button>
    <button 
      class="tab" 
      class:active={activeTab === 'prompt'}
      on:click={() => activeTab = 'prompt'}
    >
      📝 프롬프트
    </button>
    <button 
      class="tab" 
      class:active={activeTab === 'cbs'}
      on:click={() => activeTab = 'cbs'}
    >
      🔧 CBS 디버그 ({cbsResults.length})
    </button>
    <button 
      class="tab" 
      class:active={activeTab === 'regex'}
      on:click={() => activeTab = 'regex'}
    >
      🔍 Regex ({regexScripts.length}개 스크립트)
    </button>
    <button 
      class="tab" 
      class:active={activeTab === 'trigger'}
      on:click={() => activeTab = 'trigger'}
    >
      ⚡ Trigger ({triggerScripts.length}개 스크립트)
    </button>
  </div>

  <div class="simulator-content">
    <div class="input-section">
      <div class="chat-input">
        <label>💬 사용자 메시지</label>
        <textarea 
          bind:value={userMessage}
          placeholder="테스트할 사용자 메시지를 입력하세요..."
          rows="3"
        ></textarea>
        <div class="input-actions">
          <button on:click={() => addMessage('user')}>+ 사용자 메시지 추가</button>
          <button on:click={() => addMessage('char')}>+ 캐릭터 메시지 추가</button>
        </div>
      </div>

      <div class="variables-section">
        <label>📊 변수 ({Object.keys(chatVars).length})</label>
        
        <!-- 트리거 기반 버튼 (트리거에서 추출한 함수들) -->
        {#if triggerFunctions.length > 0}
          <div class="trigger-buttons">
            <span class="preset-label">트리거:</span>
            <div class="trigger-btn-list">
              {#each triggerFunctions.slice(0, 12) as funcName}
                <button 
                  class="trigger-btn" 
                  on:click={() => executeTriggerFunction(funcName)}
                  title={funcName}
                >
                  {funcName.replace(/^greeting/, '').replace(/^k/, 'K:')}
                </button>
              {/each}
              {#if triggerFunctions.length > 12}
                <span class="more-triggers">+{triggerFunctions.length - 12} more</span>
              {/if}
            </div>
          </div>
        {/if}
        
        <div class="var-list">
          {#each Object.entries(chatVars) as [key, value]}
            <div class="var-item">
              <span class="var-key">{key}</span>
              <span class="var-value">{value}</span>
              <button class="var-delete" on:click={() => {
                const { [key]: _, ...rest } = chatVars;
                chatVars = rest;
              }}>×</button>
            </div>
          {/each}
        </div>
        <div class="var-add">
          <input type="text" placeholder="변수명" id="varKey" />
          <input type="text" placeholder="값" id="varValue" />
          <button on:click={addVariableFromInputs}>추가</button>
        </div>
      </div>

      <div class="history-section">
        <label>📜 대화 기록 ({chatHistory.length})</label>
        <div class="history-list">
          {#each chatHistory as msg, i}
            <div class="history-item" class:user={msg.role === 'user'} class:char={msg.role === 'char'}>
              <span class="role">{msg.role === 'user' ? '👤' : '🤖'}</span>
              <span class="content">{msg.content.slice(0, 50)}{msg.content.length > 50 ? '...' : ''}</span>
              <button class="delete" on:click={() => {
                chatHistory = chatHistory.filter((_, idx) => idx !== i);
              }}>×</button>
            </div>
          {/each}
        </div>
      </div>
    </div>

    <div class="output-section">
      {#if activeTab === 'render'}
        <RenderPreview 
          backgroundHTML={bgEmbed.html}
          firstMessage={processedFirstMessage}
          {assets}
          {regexScripts}
          {triggerScripts}
          on:triggerClick={handleTriggerClick}
        />
      {:else if activeTab === 'prompt'}
        <PromptPreview content={processedPrompt} />
      {:else if activeTab === 'cbs'}
        <CBSDebugPanel results={cbsResults} charName={charInfo.name} {chatVars} />
      {:else if activeTab === 'regex'}
        <RegexDebugPanel results={regexResults} scripts={regexScripts} />
      {:else if activeTab === 'trigger'}
        <TriggerDebugPanel results={triggerResults} scripts={triggerScripts} />
      {/if}
    </div>
  </div>
</div>

<style>
  .simulator-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--bg-primary, #1e1e1e);
    color: var(--text-primary, #d4d4d4);
  }

  .simulator-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: var(--bg-secondary, #252526);
    border-bottom: 1px solid var(--border-color, #3c3c3c);
  }

  .simulator-header h2 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
  }

  .header-actions {
    display: flex;
    gap: 8px;
  }

  .run-btn {
    background: #0e639c;
    color: white;
    border: none;
    padding: 6px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
  }

  .run-btn:hover:not(:disabled) {
    background: #1177bb;
  }

  .run-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .clear-btn {
    background: transparent;
    color: var(--text-secondary, #888);
    border: 1px solid var(--border-color, #3c3c3c);
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
  }

  .clear-btn:hover {
    background: var(--bg-hover, #2a2a2a);
  }

  .newtab-btn {
    background: #44475a;
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
  }

  .newtab-btn:hover {
    background: #6272a4;
  }

  .data-summary {
    display: flex;
    gap: 8px;
  }

  .badge {
    padding: 4px 8px;
    background: var(--bg-primary, #1e1e1e);
    border-radius: 4px;
    font-size: 11px;
    color: var(--text-secondary, #888);
  }

  .simulator-tabs {
    display: flex;
    gap: 0;
    background: var(--bg-secondary, #252526);
    border-bottom: 1px solid var(--border-color, #3c3c3c);
  }

  .tab {
    flex: 1;
    padding: 10px 16px;
    background: transparent;
    color: var(--text-secondary, #888);
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    font-size: 13px;
    transition: all 0.2s;
  }

  .tab:hover {
    color: var(--text-primary, #d4d4d4);
    background: var(--bg-hover, #2a2a2a);
  }

  .tab.active {
    color: var(--accent-color, #0e639c);
    border-bottom-color: var(--accent-color, #0e639c);
  }

  .simulator-content {
    flex: 1;
    display: flex;
    overflow: hidden;
  }

  .input-section {
    width: 300px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 12px;
    background: var(--bg-secondary, #252526);
    border-right: 1px solid var(--border-color, #3c3c3c);
    overflow-y: auto;
  }

  .output-section {
    flex: 1;
    overflow: auto;
    padding: 12px;
  }

  label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary, #888);
    margin-bottom: 6px;
  }

  textarea {
    width: 100%;
    padding: 8px;
    background: var(--bg-primary, #1e1e1e);
    border: 1px solid var(--border-color, #3c3c3c);
    border-radius: 4px;
    color: var(--text-primary, #d4d4d4);
    font-family: inherit;
    font-size: 13px;
    resize: vertical;
  }

  textarea:focus {
    outline: none;
    border-color: var(--accent-color, #0e639c);
  }

  .input-actions {
    display: flex;
    gap: 8px;
    margin-top: 8px;
  }

  .input-actions button {
    flex: 1;
    padding: 6px;
    font-size: 11px;
    background: var(--bg-primary, #1e1e1e);
    border: 1px solid var(--border-color, #3c3c3c);
    color: var(--text-secondary, #888);
    border-radius: 4px;
    cursor: pointer;
  }

  .input-actions button:hover {
    background: var(--bg-hover, #2a2a2a);
    color: var(--text-primary, #d4d4d4);
  }

  .variables-section, .history-section {
    background: var(--bg-primary, #1e1e1e);
    border-radius: 4px;
    padding: 8px;
  }

  .var-list, .history-list {
    max-height: 120px;
    overflow-y: auto;
  }

  .var-item, .history-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 6px;
    font-size: 12px;
    border-radius: 3px;
    background: var(--bg-secondary, #252526);
    margin-bottom: 4px;
  }

  .var-key {
    color: #9cdcfe;
    font-family: monospace;
  }

  .var-value {
    flex: 1;
    color: #ce9178;
    font-family: monospace;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .var-delete, .delete {
    background: transparent;
    border: none;
    color: var(--text-secondary, #888);
    cursor: pointer;
    font-size: 14px;
    padding: 0 4px;
  }

  .var-delete:hover, .delete:hover {
    color: #f14c4c;
  }

  .var-add {
    display: flex;
    gap: 4px;
    margin-top: 8px;
  }

  .var-add input {
    flex: 1;
    padding: 4px 8px;
    font-size: 11px;
    background: var(--bg-secondary, #252526);
    border: 1px solid var(--border-color, #3c3c3c);
    border-radius: 3px;
    color: var(--text-primary, #d4d4d4);
  }

  .var-add button {
    padding: 4px 8px;
    font-size: 11px;
    background: var(--accent-color, #0e639c);
    border: none;
    border-radius: 3px;
    color: white;
    cursor: pointer;
  }

  .preset-label {
    font-size: 11px;
    color: var(--text-secondary, #888);
    margin-right: 4px;
  }

  .trigger-buttons {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 8px;
  }

  .trigger-btn-list {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .trigger-btn {
    padding: 2px 6px;
    font-size: 9px;
    background: var(--bg-secondary, #252526);
    border: 1px solid var(--border-color, #3c3c3c);
    border-radius: 3px;
    color: var(--text-primary, #d4d4d4);
    cursor: pointer;
  }

  .trigger-btn:hover {
    background: var(--accent-color, #0e639c);
    border-color: var(--accent-color, #0e639c);
    color: white;
  }

  .more-triggers {
    font-size: 9px;
    color: var(--text-secondary, #888);
    padding: 2px 4px;
  }

  .history-item.user {
    border-left: 2px solid #4ec9b0;
  }

  .history-item.char {
    border-left: 2px solid #dcdcaa;
  }

  .role {
    font-size: 14px;
  }

  .content {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
