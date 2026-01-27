# RisuAI 렌더링 로직 분석

이 문서는 RisuAI의 채팅 메시지 렌더링 파이프라인을 분석한 것입니다.

> **중요**: 이 문서는 실제 RisuAI 소스 분석과 시뮬레이터 구현 과정에서 발견한 내용을 기반으로 합니다.

---

## 🔗 CBS/파서 의존성 그래프

시뮬레이터에서 RisuAI 렌더링을 재현하려면 아래 의존성을 이해해야 합니다.

### 핵심 파일 의존성

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         parser.svelte.ts (메인 파서)                          │
│  - risuChatParser(), ParseMarkdown(), parseAdditionalAssets()                │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │ imports
        ┌───────────────────────┼───────────────────────┬─────────────────────┐
        ▼                       ▼                       ▼                     ▼
┌───────────────┐    ┌──────────────────┐    ┌─────────────────┐    ┌──────────────┐
│    cbs.ts     │    │ process/         │    │ parser/         │    │ process/     │
│ registerCBS() │    │ infunctions.ts   │    │ chatVar.svelte  │    │ scripts.ts   │
│ matcherArg    │    │ calcString()     │    │ getChatVar()    │    │processScript │
│ RegisterCB    │    │ toRPN()          │    │ setChatVar()    │    │Full()        │
└───────┬───────┘    │ calculateRPN()   │    │ getGlobalVar()  │    └───────┬──────┘
        │            └────────┬─────────┘    └────────┬────────┘            │
        │                     │                       │                     │
        │                     └───────────────────────┘                     │
        │                               │                                   │
        │                     ┌─────────▼─────────┐                         │
        │                     │   stores.svelte   │◄────────────────────────┘
        │                     │ DBState           │
        │                     │ selectedCharID    │
        │                     │ CurrentTriggerId  │
        └────────────────────►│                   │
                              └───────────────────┘
```

### 상세 import 관계

| 파일 | 의존하는 것 |
|------|-------------|
| `parser.svelte.ts` | `cbs.ts`, `process/infunctions.ts`, `parser/chatVar.svelte.ts`, `process/scripts.ts`, `stores.svelte`, `storage/database.svelte`, `process/modules.ts`, `model/modellist.ts`, `util.ts` |
| `cbs.ts` | `storage/database.svelte` (타입), `parser.svelte.ts` (CbsConditions 타입), `process/modules.ts` (RisuModule 타입), `model/modellist.ts` (LLMModel 타입), `stores.svelte` (CurrentTriggerIdStore) |
| `process/infunctions.ts` | `parser/chatVar.svelte.ts` (getChatVar, getGlobalChatVar) |
| `parser/chatVar.svelte.ts` | `stores.svelte` (DBState, selectedCharID), `util.ts` (parseKeyValue) |
| `process/scripts.ts` | `parser.svelte.ts` (risuChatParser), `process/scriptings.ts` (runLuaEditTrigger), `process/modules.ts`, `process/triggers.ts` |

### 시뮬레이터 포팅 전략

**방법 1: 개별 함수 포팅** (현재 방식)
- 장점: 필요한 것만 가져옴
- 단점: 의존성 누락 시 버그 발생, 업데이트마다 수동 동기화

**방법 2: 파일 통째 복사 + 어댑터** (권장)
- RisuAI 원본 파일을 `src/lib/risuai/` 폴더에 그대로 복사
- 어댑터 파일에서 시뮬레이터용 스텁 제공
- 장점: RisuAI 업데이트 시 파일만 교체하면 됨
- 단점: 사용하지 않는 코드도 포함

```
src/lib/
├── risuai/                    # RisuAI 원본 파일 (수정 최소화)
│   ├── parser.svelte.ts       # 원본 그대로
│   ├── cbs.ts                 # 원본 그대로
│   ├── process/
│   │   ├── infunctions.ts     # 원본 그대로
│   │   └── scripts.ts         # 원본 그대로
│   └── parser/
│       └── chatVar.svelte.ts  # 원본 그대로
│
├── risuai-adapter/            # 시뮬레이터용 어댑터
│   ├── stores.adapter.ts      # DBState, selectedCharID 스텁
│   ├── database.adapter.ts    # getDatabase(), getCurrentCharacter() 스텁
│   ├── platform.adapter.ts    # isTauri, isNodeServer 스텁
│   └── index.ts               # 통합 export
│
└── core/
    └── cbs/                   # 현재 구현 (제거 예정)
```

---

## 📁 핵심 파일 구조

```
src/ts/
├── parser.svelte.ts          # 메인 파서 (CBS, Markdown, Asset 처리)
├── cbs.ts                    # CBS 함수 등록
├── process/
│   ├── scripts.ts            # Regex 스크립트 처리 + processScriptFull
│   ├── scriptings.ts         # Lua/Python 스크립팅 엔진 (wasmoon)
│   └── triggers.ts           # 트리거 시스템
└── parser/
    └── chatVar.svelte.ts     # chatVar 관리

src/lib/ChatScreens/
├── Chat.svelte               # 채팅 메시지 렌더링 UI
├── ChatBody.svelte           # 채팅 본문 컨테이너
└── ChatScreen.svelte         # 전체 채팅 화면
```

---

## 🔄 렌더링 파이프라인 흐름 (정확한 순서)

```
원본 메시지 (firstMessage / chat message)
    ↓
1. parseAdditionalAssets()    # {{asset::name}} → 실제 이미지 URL
    ↓
2. processScriptFull()        # ★★★ 핵심 처리 ★★★
   ├─ 2-1. runLuaEditTrigger()  # Lua listenEdit 콜백 실행 (가장 먼저!)
   ├─ 2-2. runTrigger('display')# display 트리거 (editdisplay 모드)
   ├─ 2-3. pluginV2 실행
   ├─ 2-4. risuChatParser()     # CBS 변수 치환
   └─ 2-5. executeScript()      # Regex 스크립트 적용 (가장 마지막)
    ↓
3. parseAdditionalAssets()    # 다시 한번 (스크립트가 새 에셋 참조 생성 가능)
    ↓
4. parseInlayAssets()         # {{inlay::id}} 처리
    ↓
5. parseThoughtsAndTools()    # <Thoughts> 태그 처리
    ↓
6. encodeStyle()              # <style> 태그 보호
    ↓
7. renderHighlightableMarkdown()  # Markdown → HTML
    ↓
8. trimMarkdown()             # DOMPurify sanitize + decodeStyle
    ↓
최종 HTML 출력
```

### ⚠️ 중요: processScriptFull 내부 순서

**RisuAI의 정확한 실행 순서** (`scripts.ts:99`):

```typescript
export async function processScriptFull(char, data, mode, chatID, cbsConditions) {
    // 1. Lua 트리거 먼저 실행! (listenEdit 콜백)
    data = await runLuaEditTrigger(char, mode, data, { index: chatID })
    
    // 2. display 트리거 (editdisplay 모드일 때)
    if (mode === 'editdisplay') {
        const d = await runTrigger(currentChar, 'display', {...})
        data = d?.displayData ?? data
    }
    
    // 3. Plugin V2
    for (const plugin of pluginV2[mode]) { ... }
    
    // 4. CBS 파싱 (변수 치환)
    data = risuChatParser(data, { chatID, cbsConditions })
    
    // 5. Regex 스크립트 적용 (가장 마지막)
    for (const script of scripts) {
        executeScript(script)
    }
    
    return { data, emoChanged }
}
```

**시뮬레이터에서 이 순서가 중요한 이유**:
- Lua의 `listenEdit("editDisplay", callback)`이 `■` 심볼을 패널 HTML로 변환
- 만약 Regex가 먼저 실행되면 `■`가 다른 것으로 변환되어 Lua가 처리 못함

---

## 📜 주요 함수 상세

### 1. `ParseMarkdown()` - 메인 진입점

**위치**: `src/ts/parser.svelte.ts:723`

```typescript
export async function ParseMarkdown(
    data: string,
    charArg: (character | simpleCharacterArgument | groupChat | string) = null,
    mode: 'normal' | 'back' | 'pretranslate' | 'notrim' = 'normal',
    chatID = -1,
    cbsConditions: CbsConditions = {}
)
```

**처리 순서**:
1. `parseAdditionalAssets()` - 에셋 치환
2. `processScriptFull()` - editdisplay regex + 트리거 실행
3. `parseAdditionalAssets()` - 다시 실행 (스크립트가 새 에셋 참조 생성 가능)
4. `parseInlayAssets()` - inlay 에셋
5. `parseThoughtsAndTools()` - AI 사고 과정 태그
6. `encodeStyle()` - style 태그 보호
7. `renderHighlightableMarkdown()` - Markdown 렌더링
8. `trimMarkdown()` - DOMPurify + decodeStyle

---

### 2. `processScriptFull()` - Regex + 트리거

**위치**: `src/ts/process/scripts.ts:96`

```typescript
export async function processScriptFull(
    char: character | groupChat | simpleCharacterArgument,
    data: string,
    mode: ScriptMode,  // 'editinput' | 'editoutput' | 'editprocess' | 'editdisplay'
    chatID = -1,
    cbsConditions: CbsConditions = {}
)
```

**처리 순서**:
1. **Lua 트리거 먼저**: `runLuaEditTrigger(char, mode, data, { index: chatID })`
2. **display 트리거 실행** (editdisplay 모드일 때):
   ```typescript
   const d = await runTrigger(currentChar, 'display', {
       chat: getCurrentChat(),
       displayMode: true,
       displayData: data
   })
   data = d?.displayData ?? data
   ```
3. **플러그인 V2 실행**
4. **CBS 파싱**: `risuChatParser(data, { chatID, cbsConditions })`
5. **Regex 스크립트 실행**: `executeScript()` 루프

---

### 3. `executeScript()` - 단일 Regex 적용

**위치**: `src/ts/process/scripts.ts:144`

```typescript
function executeScript(pscript: pScript) {
    const script = pscript.script

    if (script.type === mode) {
        // 1. 출력 템플릿 전처리
        let outScript = script.out.replaceAll("$n", "\n")  // $n → 줄바꿈
        outScript = outScript.replace(/{{data}}/g, "$&")   // {{data}} → 전체 매치

        // 2. 플래그 처리
        let flag = script.ableFlag ? (script.flag || 'g') : 'g'
        flag = flag.trim().replace(/[^dgimsuvy]/g, '')  // 유효 플래그만
        flag = [...new Set(flag.split(''))].join('')    // 중복 제거
        if (flag.length === 0) flag = 'u'

        // 3. 정규식 생성 및 치환
        const reg = new RegExp(input, flag)
        data = data.replace(reg, outScript)
    }
}
```

**특수 명령어**:
- `@@emo <name>` - 이모션 변경
- `@@inject` - 채팅에 주입
- `@@move_top` / `@@move_bottom` - 텍스트 이동
- `@@repeat_back` - 이전 채팅에서 반복

---

### 4. `parseAdditionalAssets()` - 에셋 치환

**위치**: `src/ts/parser.svelte.ts:464`

**지원 문법**:
```
{{raw::name}}      → 에셋 URL (경로만)
{{path::name}}     → 에셋 URL (경로만)
{{img::name}}      → <img src="..."/>
{{image::name}}    → <div class="risu-inlay-image"><img .../></div>
{{video::name}}    → <video controls autoplay loop>...</video>
{{audio::name}}    → <audio controls autoplay loop>...</audio>
{{bg::name}}       → 배경 div
{{asset::name}}    → 확장자에 따라 이미지/비디오 자동 결정
{{emotion::name}}  → 이모션 이미지
```

**에셋 매칭 (Fuzzy Match)**:
```typescript
function getClosestMatch(char, name, assetPaths) {
    const trimmedName = trimmer(name)  // 확장자/특수문자 제거
    for (const asset of char.additionalAssets) {
        const dist = getDistance(trimmedName, trimmer(asset[0]))
        if (dist < closestDist) {
            closestDist = dist
            // ...
        }
    }
    if (closestDist > DBState.db.assetMaxDifference) {  // 기본값: 3
        return null
    }
    return match
}
```

---

### 5. `trimmer()` - 에셋 이름 정규화

**위치**: `src/ts/parser.svelte.ts:582`

```typescript
function trimmer(str: string) {
    const ext = ['webp', 'png', 'jpg', 'jpeg', 'gif', 'mp4', 'webm', 'avi', 'm4p', 'm4v', 'mp3', 'wav', 'ogg']
    for (const e of ext) {
        if (str.endsWith('.' + e)) {
            str = str.substring(0, str.length - e.length - 1)
        }
    }
    return str.trim().replace(/[_ -.]/g, '')
}
```

**예시**:
- `규칙.webp` → `규칙`
- `my_image.png` → `myimage`
- `Test-File.jpg` → `testfile`

---

### 6. `getDistance()` - Levenshtein 거리

**위치**: `src/ts/parser.svelte.ts:567`

```typescript
export function getDistance(a: string, b: string) {
    const h = a.length + 1
    const w = b.length + 1
    let d = new Int16Array(h * w)
    // ... Levenshtein distance 알고리즘
    return d[h * w - 1]
}
```

---

## 🎨 CSS 처리

### `encodeStyle()` / `decodeStyle()`

**목적**: `<style>` 태그를 DOMPurify sanitization에서 보호

**흐름**:
1. `encodeStyle()`: `<style>CSS</style>` → `<risu-style>HEX</risu-style>`
2. DOMPurify sanitize 통과
3. `decodeStyle()`: 
   - HEX → CSS 복원
   - 클래스명 접두사 추가: `.myclass` → `.x-risu-.myclass`
   - 셀렉터 래핑: `.myclass` → `.chattext .myclass`

**`decodeStyleRule()` 처리**:
```typescript
function decodeStyleRule(rule) {
    if (rule.type === 'rule') {
        rule.selectors = rule.selectors.map(slt => {
            // 클래스에 x-risu- 접두사 추가
            let selectors = slt.split(' ').map(v => {
                if (v.startsWith('.') && !v.startsWith('.x-risu-')) {
                    return ".x-risu-" + v.substring(1)
                }
                return v
            }).join(' ')
            // .chattext로 래핑
            return ".chattext " + selectors
        })
    }
}
```

---

## 🔧 Lua 트리거 시스템 (상세)

### listenEdit vs virtualScript

| 구분 | listenEdit | virtualScript |
|------|------------|---------------|
| 정의 위치 | Lua 코드 내부 | 캐릭터 카드 별도 필드 |
| 용도 | **메시지 내용 변환** | 트리거 UI HTML (버튼 등) |
| 실행 시점 | `processScriptFull` 첫 단계 | 별도 렌더링 |
| 예시 | `■` → 패널 HTML | 플로팅 버튼 그룹 |

### `listenEdit("editDisplay", callback)` - 핵심 패턴

```lua
listenEdit("editDisplay", function(triggerId, data)
    -- data = 메시지 내용 (HTML 포함)
    
    -- 특정 심볼을 UI로 변환
    data = data:gsub("■", function()
        return [[
        <div class="exit8-panel">
            <div class="panel-header">EXIT 8 ARCHIVE</div>
            <!-- 패널 내용 -->
        </div>
        ]]
    end)
    
    return data  -- 변환된 데이터 반환 필수!
end)
```

### `runLuaEditTrigger()` - 실행 흐름

**위치**: `src/ts/process/scriptings.ts:1299`

```typescript
export async function runLuaEditTrigger<T>(char, mode, content, meta): Promise<T> {
    // mode 정규화
    switch(mode) {
        case 'editdisplay': mode = 'editDisplay'; break
        case 'editinput': mode = 'editInput'; break
        // ...
    }
    
    // 모든 트리거에서 triggerlua 타입 찾기
    for (let trigger of triggers) {
        if (trigger?.effect?.[0]?.type === 'triggerlua') {
            const runResult = await runScripted(trigger.effect[0].code, {
                char, lowLevelAccess: false, mode, data, meta
            })
            data = runResult.res ?? data
        }
    }
    
    return data
}
```

### `callListenMain` - Lua 측 콜백 실행

```lua
-- luaCodeWrapper에서 정의됨
callListenMain = async(function(type, id, value, meta)
    local realValue = json.decode(value)
    
    if type == 'editDisplay' then
        for _, func in ipairs(editDisplayFuncs) do
            realValue = func(id, realValue, {})  -- 등록된 콜백 순차 실행
        end
    end
    
    return json.encode(realValue)
end)
```

### Lua API 함수들

| 함수 | 설명 |
|------|------|
| `getChatVar(id, key)` | 채팅 변수 읽기 |
| `setChatVar(id, key, value)` | 채팅 변수 쓰기 |
| `getGlobalVar(id, key)` | 전역 변수 읽기 |
| `setGlobalVar(id, key, value)` | 전역 변수 쓰기 |
| `getChat(id, index)` | 채팅 메시지 가져오기 |
| `getFullChat(id)` | 전체 채팅 히스토리 |
| `setChat(id, index, data)` | 채팅 메시지 수정 |
| `log(value)` | 콘솔 로그 |
| `listenEdit(type, func)` | 편집 콜백 등록 |
| `getState(id, name)` | 상태 읽기 (JSON 자동 파싱) |
| `setState(id, name, value)` | 상태 쓰기 (JSON 자동 직렬화) |

---

## 📋 트리거 타입

**위치**: `src/ts/process/triggers.ts`

| 타입 | 설명 |
|------|------|
| `start` | 채팅 시작 시 |
| `manual` | 수동 트리거 (`risu-trigger` 클릭) |
| `output` | AI 응답 후 |
| `input` | 사용자 입력 후 |
| `display` | editdisplay 모드에서 |
| `request` | API 요청 전 |

---

## 🎯 Regex 스크립트 타입

| 타입 | 적용 시점 |
|------|----------|
| `editinput` | 사용자 입력 |
| `editoutput` | AI 응답 |
| `editprocess` | 프롬프트 처리 |
| `editdisplay` | 화면 표시 (렌더링) |

---

## 📐 CSS 클래스 구조

**RisuAI의 채팅 컨테이너**:
```html
<div class="risu-chat">
  <div class="chattext">
    <!-- 렌더링된 메시지 HTML -->
  </div>
</div>
```

**주요 CSS 변수** (`src/styles.css`):
```css
:root {
  --FontColorStandard: #fafafa;
  --FontColorBold: #e5e5e5;
  --FontColorItalic: #8c8d93;
  --FontColorItalicBold: #8c8d93;
  --FontColorQuote1: #8c8d93;
  --FontColorQuote2: #8c8d93;
  --risu-theme-bgcolor: #282a36;
  --risu-theme-textcolor: #f5f5f5;
  --risu-font-family: Arial, sans-serif, serif;
}

* {
  font-family: var(--risu-font-family);
}

.chattext p:first-child {
  margin-top: 0.3rem;
}

.chattext em {
  color: var(--FontColorItalic);
}

.chattext strong {
  color: var(--FontColorBold);
}
```

---

## 🔗 risu-trigger / risu-btn 이벤트

**HTML에서 사용**:
```html
<button risu-trigger="triggerName" risu-id="optional-id">클릭</button>
<div risu-btn="functionName">버튼</div>
```

**Chat.svelte에서 처리**:
```typescript
async function handleButtonTriggerWithin(event: UIEvent) {
    const origin = target.closest('[risu-trigger], [risu-btn]')
    if (!origin) return

    const triggerName = origin.getAttribute('risu-trigger')
    const btnEvent = origin.getAttribute('risu-btn')

    if (triggerName) {
        await runTrigger(currentChar, 'manual', {
            chat: getCurrentChat(),
            manualName: triggerName,
        })
    } else if (btnEvent) {
        await runLuaButtonTrigger(currentChar, btnEvent)
    }
}
```

---

## 📝 시뮬레이터 구현 체크리스트

### 필수 구현:
- [x] CBS 변수 치환 (`{{getvar::K}}` 등)
- [x] Regex editdisplay 적용
- [x] 에셋 URL 치환 (Levenshtein 매칭)
- [x] **Lua 트리거 실행 (listenEdit 콜백)** ✅ 구현 완료
- [x] risu-trigger / risu-btn 클릭 이벤트
- [x] CSS 변수 (--FontColor*, --risu-theme-*)

### CSS 환경:
- [x] 전역 `font-family: Arial, sans-serif, serif`
- [x] `.chattext` 스타일 호환
- [x] CSS 클래스 x-risu- 접두사 (optional)
- [ ] `<style>` 태그 내 CSS를 `.chattext`로 래핑

### ⚠️ 시뮬레이터에서 발견한 중요 사항:

1. **실행 순서가 매우 중요!**
   ```
   ✓ 올바른 순서: Lua → CBS → Regex → Asset URL
   ✗ 잘못된 순서: CBS → Regex → Lua (■ 심볼이 Regex에서 먼저 처리됨)
   ```

2. **listenEdit 콜백은 return 필수**
   ```lua
   listenEdit("editDisplay", function(id, data)
       data = data:gsub("■", "패널HTML")
       return data  -- 반드시 return!
   end)
   ```

3. **wasmoon 엔진 주의사항**
   - `Promise.create` 필요 (async 함수 지원)
   - `json.lua` 마운트 필수
   - `callListenMain`은 async wrapper로 정의

---

## 🐛 알려진 차이점

1. **CSS 셀렉터 래핑**: RisuAI는 `<style>` 내 모든 셀렉터를 `.chattext`로 래핑함
2. **DOMPurify**: RisuAI는 HTML을 sanitize하여 위험한 태그 제거
3. **class 접두사**: `.myclass` → `.x-risu-myclass` 자동 변환
4. **에셋 캐싱**: `fileSrcCache`, `bestMatchCache` 등 성능 최적화

---

## 🎯 EXIT 8 캐릭터 사례 분석

이 캐릭터는 Lua의 `listenEdit("editDisplay")`를 사용하여 `■` 심볼을 패널 UI로 변환합니다.

### 동작 흐름:

1. **AI 응답 끝에 `[LOC:0]■` 추가** (`onOutput`에서)
2. **editDisplay 시 `■` → 패널 HTML 변환** (`listenEdit`에서)
3. **CBS 변수 치환** (`{{getvar::...}}` 처리)
4. **Regex 적용** (색상 스타일 등)

### Lua 코드 구조:
```lua
-- 1. 데이터 수집 함수
function addEntity(triggerId, id, name, age, height, desc)
    setChatVar(triggerId, "entity_" .. id .. "_name", name)
    -- ...
end

-- 2. 태그 처리
function processTags(triggerId, text)
    for id, name, age, height, desc in string.gmatch(text, "%[ENTITY_ADD:...:...%]") do
        addEntity(triggerId, id, name, age, height, desc)
    end
end

-- 3. 화면 표시 (핵심!)
listenEdit("editDisplay", function(triggerId, data)
    -- 태그 숨김
    data = data:gsub("%[ENTITY_ADD:[^%]]+%]", '<span style="display:none;"></span>')
    
    -- ■ → 패널 HTML 변환
    data = data:gsub("■", function()
        -- 패널 HTML 생성
        return full_panel_html
    end)
    
    return data
end)
```

---

## 📚 참고 코드 위치

| 기능 | 파일 | 라인 |
|------|------|------|
| ParseMarkdown | parser.svelte.ts | 723 |
| processScriptFull | process/scripts.ts | 99 |
| runLuaEditTrigger | process/scriptings.ts | 1299 |
| executeScript | process/scripts.ts | 144 |
| parseAdditionalAssets | parser.svelte.ts | 464 |
| trimmer | parser.svelte.ts | 582 |
| getDistance | parser.svelte.ts | 567 |
| getClosestMatch | parser.svelte.ts | 552 |
| decodeStyle | parser.svelte.ts | 841 |
| luaCodeWrapper | process/scriptings.ts | 1200 |
| callListenMain | process/scriptings.ts | 1264 |
| runTrigger | process/triggers.ts | - |

---

## ⚠️ 중요 발견: `'doc_only'` 함수와 parseAdditionalAssets

### 문제

CBS 함수 중 일부는 `'doc_only'`로 등록되어 있어서 CBS 파서가 직접 처리하지 않습니다:

```typescript
// cbs.ts에서 'doc_only'로 등록된 함수들
registerCBS("asset::", 'doc_only');      // {{asset::name}}
registerCBS("image::", 'doc_only');      // {{image::name}}  
registerCBS("video::", 'doc_only');      // {{video::name}}
registerCBS("audio::", 'doc_only');      // {{audio::name}}
registerCBS("raw::", 'doc_only');        // {{raw::name}}
registerCBS("inlay::", 'doc_only');      // {{inlay::id}}
```

### 실제 처리 위치

이 함수들은 `parser.svelte.ts`의 `parseAdditionalAssets()` 함수에서 처리됩니다:

```typescript
// parser.svelte.ts:464
export function parseAdditionalAssets(data: string, char: any) {
    // {{asset::name}} → <img src="data:...">
    data = data.replace(/\{\{(asset|image|video|audio|raw)::([^}]+)\}\}/gi, (match, type, name) => {
        const asset = findAsset(char, name);
        if (!asset) return '';
        
        if (type === 'raw') return asset.data;
        
        // 적절한 HTML 태그 생성
        return `<img src="${asset.data}">`;
    });
    
    return data;
}
```

### 시뮬레이터에서의 대응

```typescript
// 렌더링 순서에 parseAdditionalAssets 반드시 포함!
const render = async (input: string) => {
    let output = input;
    
    // 1. Lua editDisplay (있으면)
    output = runLuaEditTrigger(output);
    
    // 2. 첫 번째 에셋 치환 (CBS 전에!)
    output = parseAdditionalAssets(output, character);
    
    // 3. CBS 처리
    output = risuChatParser(output);
    
    // 4. Regex 적용
    output = executeRegexScripts(output);
    
    // 5. 두 번째 에셋 치환 (Regex 후에!)
    output = parseAdditionalAssets(output, character);
    
    return output;
};
```

---

## 🔴 아키텍처 결정: 시뮬레이터 분리

### 결정 배경

MANA App 캐릭터 테스트 중 CBS 조건문이 제대로 평가되지 않는 문제 발견:
- `{{#when}}`, `{{#if}}` 조건들이 변수 부재로 모두 false 평가
- 결과: 73,596자 → 5자로 축소

근본 원인:
1. CBS 변수 (`{{setvar::}}`, `{{getvar::}}`)는 **채팅 히스토리 컨텍스트**가 필요
2. 시뮬레이터는 단일 메시지만 가지고 있어 **상태가 축적되지 않음**
3. RisuAI는 실제 채팅 흐름에서 onOutput → onInput 트리거로 변수를 설정함

### 결론

**RisuStudio는 에디터로만 유지**, 시뮬레이터는 **별도 프로젝트로 분리**

```
RisuStudio (이 프로젝트)
├── 캐릭터 카드 편집
├── 스크립트 편집 (CBS, Regex, Trigger)
├── 에셋 관리
├── Import/Export (charx, risum, risup)
└── 문법 검증/하이라이팅

risu-simulator (별도 프로젝트)
├── 완전한 채팅 시뮬레이션
├── 채팅 히스토리 관리
├── 변수 상태 추적
├── Mock AI 응답
└── 트리거 디버깅
```

### 시뮬레이터 제거 시 영향 분석

#### 제거 대상 파일
```
src/routes/simulator/+page.svelte       # 시뮬레이터 페이지
src/lib/components/simulator/           # 시뮬레이터 컴포넌트
├── CBSDebugPanel.svelte
├── index.ts
├── PromptPreview.svelte
├── RegexDebugPanel.svelte
├── RenderPreview.svelte
├── simulator.test.ts
├── SimulatorPanel.svelte
└── TriggerDebugPanel.svelte
```

#### 영향받는 파일
```
src/lib/components/editor/EditorScreen.svelte
  - Line 15: import SimulatorPanel
  - Line 464: <SimulatorPanel> 사용
  → SimulatorPanel import/사용 제거 필요

src/lib/core/cbs/                       # CBS 모듈
  → 시뮬레이터 전용이면 제거 가능
  → 다른 곳에서 사용하면 유지
```

#### 영향받지 않는 파일
- 모든 편집 탭 (InfoTab, LoreTab, RegexTab, TriggerTab, ScriptTab 등)
- 파일 포맷 처리 (charx.ts, risum.ts, risup.ts)
- 메인 페이지 (+page.svelte)
- 에셋 처리 (assetProcessor.ts)

#### risuai 폴더 영향
```
src/lib/risuai/                         # RisuAI 원본 파일
src/lib/risuai-adapter/                 # 어댑터 파일
  → 시뮬레이터 전용이므로 함께 제거 가능
  → 단, 향후 문법 검증용으로 유지할 수도 있음
```

---

## 📅 업데이트 이력

- **2026-01-27 (2차)**: 아키텍처 결정 - 시뮬레이터 분리
  - `'doc_only'` 함수와 parseAdditionalAssets 문서화
  - MANA App 테스트 결과 분석 (변수 상태 문제)
  - 시뮬레이터 제거 시 영향 분석 추가
  - RisuStudio = 에디터 전용으로 결정

- **2026-01-27**: Lua listenEdit 시스템 분석 완료, 실행 순서 문서화
  - processScriptFull 내부 순서 명확화 (Lua → CBS → Regex)
  - listenEdit vs virtualScript 구분 정리
  - EXIT 8 캐릭터 사례 분석 추가
