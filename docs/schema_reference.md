# RisuAI 데이터 스키마 레퍼런스

> **버전**: 1.0.0  
> **최종 업데이트**: 2026-01-25  
> **소스**: RisuAI `src/ts/storage/database.svelte.ts`, `src/ts/process/modules.ts`, `src/ts/process/triggers.ts`

이 문서는 RisuAI의 모든 데이터 스키마를 정의합니다.

---

## 목차

1. [모듈 (RisuModule)](#1-모듈-risumodule)
2. [캐릭터 (character)](#2-캐릭터-character)
3. [그룹 채팅 (groupChat)](#3-그룹-채팅-groupchat)
4. [로어북 (loreBook)](#4-로어북-lorebook)
5. [정규식 스크립트 (customscript)](#5-정규식-스크립트-customscript)
6. [트리거 스크립트 (triggerscript)](#6-트리거-스크립트-triggerscript)
7. [채팅 (Chat, Message)](#7-채팅-chat-message)
8. [에셋 구조](#8-에셋-구조)

---

## 1. 모듈 (RisuModule)

`.risum` 파일의 메인 데이터 구조입니다.

```typescript
interface RisuModule {
  // ═══════════════════════════════════════════════════════════════
  // 기본 정보
  // ═══════════════════════════════════════════════════════════════
  name: string;                      // 모듈 이름
  description: string;               // 모듈 설명
  id: string;                        // UUID
  namespace?: string;                // 네임스페이스 (충돌 방지)

  // ═══════════════════════════════════════════════════════════════
  // 컨텐츠
  // ═══════════════════════════════════════════════════════════════
  lorebook?: loreBook[];             // 로어북 엔트리 배열
  regex?: customscript[];            // 정규식 스크립트 배열
  trigger?: triggerscript[];         // 트리거 스크립트 배열
  cjs?: string;                      // CustomJS 코드

  // ═══════════════════════════════════════════════════════════════
  // 에셋
  // ═══════════════════════════════════════════════════════════════
  // [이름, 경로(사용 안함), 확장자] 형식
  // 경로는 익스포트 시 비워지고, 바이너리에서 순서로 매핑
  assets?: [string, string, string][];

  // ═══════════════════════════════════════════════════════════════
  // 옵션
  // ═══════════════════════════════════════════════════════════════
  lowLevelAccess?: boolean;          // 저수준 접근 권한
  hideIcon?: boolean;                // 아이콘 숨김
  backgroundEmbedding?: string;      // 배경 임베딩
  customModuleToggle?: string;       // 커스텀 모듈 토글

  // ═══════════════════════════════════════════════════════════════
  // MCP 서버
  // ═══════════════════════════════════════════════════════════════
  mcp?: MCPModule;
}

interface MCPModule {
  url: string;
}
```

### .risum 바이너리 구조

```
┌─────────────────────────────────────────────────────────────────┐
│ 헤더                                                            │
├─────────┬─────────┬─────────────┬──────────────────────────────┤
│ Magic   │ Version │ Main Length │ Main Data (RPack)            │
│ 1 byte  │ 1 byte  │ 4 bytes LE  │ variable                     │
│ 0x6F    │ 0x00    │             │ → JSON {type, module}        │
├─────────┴─────────┴─────────────┴──────────────────────────────┤
│ 에셋 블록 (반복)                                                 │
├─────────┬─────────────┬────────────────────────────────────────┤
│ Marker  │ Asset Length│ Asset Data (RPack)                     │
│ 1 byte  │ 4 bytes LE  │ variable                               │
│ 0x01    │             │ → 바이너리                             │
├─────────┴─────────────┴────────────────────────────────────────┤
│ EOF 마커: 0x00                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 메인 블록 JSON 구조

```json
{
  "type": "risuModule",
  "module": {
    "name": "모듈 이름",
    "description": "설명",
    "id": "uuid",
    "lorebook": [...],
    "regex": [...],
    "trigger": [...],
    "cjs": "// JS 코드",
    "assets": [
      ["에셋이름", "", "확장자"],
      ...
    ]
  }
}
```

---

## 2. 캐릭터 (character)

`.charx`, `.png`, `.jpg/.jpeg` 파일에서 추출되는 캐릭터 데이터입니다.

```typescript
interface character {
  type?: "character";
  
  // ═══════════════════════════════════════════════════════════════
  // 기본 정보
  // ═══════════════════════════════════════════════════════════════
  name: string;                      // 캐릭터 이름
  image?: string;                    // 프로필 이미지 (Base64 또는 에셋 경로)
  firstMessage: string;              // 첫 메시지
  desc: string;                      // 설명 (description)
  notes: string;                     // 노트
  personality: string;               // 성격
  scenario: string;                  // 시나리오
  
  // ═══════════════════════════════════════════════════════════════
  // 대화
  // ═══════════════════════════════════════════════════════════════
  chats: Chat[];                     // 채팅 세션 배열
  chatFolders: ChatFolder[];         // 채팅 폴더
  chatPage: number;                  // 현재 채팅 페이지 인덱스
  exampleMessage: string;            // 대화 예시
  alternateGreetings: string[];      // 대체 인사말
  firstMsgIndex: number;             // 현재 첫 메시지 인덱스

  // ═══════════════════════════════════════════════════════════════
  // 프롬프트
  // ═══════════════════════════════════════════════════════════════
  systemPrompt: string;              // 시스템 프롬프트
  postHistoryInstructions: string;   // 후기록 지시
  replaceGlobalNote: string;         // 글로벌 노트 대체
  additionalText: string;            // 추가 텍스트
  depth_prompt?: {                   // 깊이 프롬프트
    depth: number;
    prompt: string;
  };

  // ═══════════════════════════════════════════════════════════════
  // 로어북 & 스크립트
  // ═══════════════════════════════════════════════════════════════
  globalLore: loreBook[];            // 글로벌 로어북
  customscript: customscript[];      // 정규식 스크립트
  triggerscript: triggerscript[];    // 트리거 스크립트
  loreSettings?: loreSettings;       // 로어북 설정
  lorePlus?: boolean;                // 로어북 플러스

  // ═══════════════════════════════════════════════════════════════
  // 에셋
  // ═══════════════════════════════════════════════════════════════
  emotionImages: [string, string][]; // [감정이름, 이미지경로]
  additionalAssets?: [string, string, string][]; // [이름, 경로, 확장자]
  ccAssets?: ccAsset[];              // CCv3 에셋 (CharX용)
  
  // ═══════════════════════════════════════════════════════════════
  // 외형 & 디스플레이
  // ═══════════════════════════════════════════════════════════════
  viewScreen: 'emotion' | 'none' | 'imggen' | 'vn';
  largePortrait?: boolean;           // 큰 초상화
  inlayViewScreen?: boolean;         // 인레이 뷰 스크린
  backgroundHTML?: string;           // 배경 HTML
  backgroundCSS?: string;            // 배경 CSS

  // ═══════════════════════════════════════════════════════════════
  // AI 설정
  // ═══════════════════════════════════════════════════════════════
  bias: [string, number][];          // 토큰 바이어스
  utilityBot: boolean;               // 유틸리티 봇

  // ═══════════════════════════════════════════════════════════════
  // 이미지 생성
  // ═══════════════════════════════════════════════════════════════
  sdData: [string, string][];        // Stable Diffusion 데이터
  newGenData?: {
    prompt: string;
    negative: string;
    instructions: string;
    emotionInstructions: string;
  };

  // ═══════════════════════════════════════════════════════════════
  // TTS (음성 합성)
  // ═══════════════════════════════════════════════════════════════
  ttsMode?: string;
  ttsSpeech?: string;
  ttsReadOnlyQuoted?: boolean;
  voicevoxConfig?: VoicevoxConfig;
  naittsConfig?: NAITTSConfig;
  gptSoVitsConfig?: GPTSoVitsConfig;
  fishSpeechConfig?: FishSpeechConfig;
  oaiVoice?: string;
  hfTTS?: { model: string; language: string };
  vits?: OnnxModelFiles;

  // ═══════════════════════════════════════════════════════════════
  // 메타데이터
  // ═══════════════════════════════════════════════════════════════
  chaId: string;                     // 캐릭터 ID
  creator: string;                   // 제작자
  creatorNotes: string;              // 제작자 노트
  characterVersion: string;          // 캐릭터 버전
  tags: string[];                    // 태그
  license?: string;                  // 라이선스
  private?: boolean;                 // 비공개
  source?: string[];                 // 소스 URL
  creation_date?: number;            // 생성일
  modification_date?: number;        // 수정일
  imported?: boolean;                // 임포트 여부
  trashTime?: number;                // 휴지통 시간
  nickname?: string;                 // 닉네임
  lastInteraction?: number;          // 마지막 상호작용

  // ═══════════════════════════════════════════════════════════════
  // 고급 설정
  // ═══════════════════════════════════════════════════════════════
  removedQuotes?: boolean;           // 따옴표 제거
  supaMemory?: boolean;              // 수파 메모리
  reloadKeys?: number;               // 리로드 키
  virtualscript?: string;            // 가상 스크립트
  scriptstate?: Record<string, string | number | boolean>;
  extentions?: Record<string, any>;  // 확장 데이터
  additionalData?: {
    tag?: string[];
    creator?: string;
    character_version?: string;
  };
  defaultVariables?: string;         // 기본 변수
  lowLevelAccess?: boolean;          // 저수준 접근
  hideChatIcon?: boolean;            // 채팅 아이콘 숨김
  translatorNote?: string;           // 번역 노트
  doNotChangeSeperateModels?: boolean;
  escapeOutput?: boolean;            // 출력 이스케이프
  prebuiltAssetCommand?: boolean;    // 프리빌트 에셋 명령
  prebuiltAssetStyle?: string;       // 프리빌트 에셋 스타일
  prebuiltAssetExclude?: string[];   // 프리빌트 에셋 제외
  modules?: string[];                // 연결된 모듈
  realmId?: string;                  // Realm ID
  group_only_greetings?: string[];   // 그룹 전용 인사말
}

interface ccAsset {
  type: string;   // 'icon', 'emotion', 'background' 등
  uri: string;    // 'ccdefault:', 'embeded://...', '__asset:N'
  name: string;   // 에셋 이름
  ext: string;    // 확장자
}

interface loreSettings {
  tokenBudget: number;
  scanDepth: number;
  recursiveScanning: boolean;
  fullWordMatching?: boolean;
}
```

---

## 3. 그룹 채팅 (groupChat)

여러 캐릭터가 참여하는 그룹 채팅입니다.

```typescript
interface groupChat {
  type: 'group';
  
  // ═══════════════════════════════════════════════════════════════
  // 기본 정보
  // ═══════════════════════════════════════════════════════════════
  name: string;
  image?: string;
  firstMessage: string;
  chaId: string;

  // ═══════════════════════════════════════════════════════════════
  // 그룹 멤버
  // ═══════════════════════════════════════════════════════════════
  characters: string[];              // 캐릭터 ID 배열
  characterTalks: number[];          // 각 캐릭터 대화 횟수
  characterActive: boolean[];        // 각 캐릭터 활성 상태

  // ═══════════════════════════════════════════════════════════════
  // 채팅
  // ═══════════════════════════════════════════════════════════════
  chats: Chat[];
  chatFolders: ChatFolder[];
  chatPage: number;
  alternateGreetings?: string[];
  firstMsgIndex?: number;

  // ═══════════════════════════════════════════════════════════════
  // 그룹 설정
  // ═══════════════════════════════════════════════════════════════
  viewScreen: 'single' | 'multiple' | 'none' | 'emp';
  autoMode: boolean;                 // 자동 모드
  useCharacterLore: boolean;         // 캐릭터 로어 사용
  orderByOrder?: boolean;            // 순서대로
  oneAtTime?: boolean;               // 한 번에 하나

  // ═══════════════════════════════════════════════════════════════
  // 로어북 & 스크립트
  // ═══════════════════════════════════════════════════════════════
  globalLore: loreBook[];
  customscript: customscript[];
  loreSettings?: loreSettings;
  lorePlus?: boolean;

  // ═══════════════════════════════════════════════════════════════
  // 에셋
  // ═══════════════════════════════════════════════════════════════
  emotionImages: [string, string][];
  additionalAssets?: [string, string, string][];

  // (기타 character와 유사한 필드들...)
}
```

---

## 4. 로어북 (loreBook)

월드 정보 / 로어북 엔트리입니다.

```typescript
interface loreBook {
  // ═══════════════════════════════════════════════════════════════
  // 트리거
  // ═══════════════════════════════════════════════════════════════
  key: string;                       // 기본 키워드 (쉼표 구분)
  secondkey: string;                 // 보조 키워드 (selective=true일 때)
  selective: boolean;                // 보조 키 필요 여부

  // ═══════════════════════════════════════════════════════════════
  // 컨텐츠
  // ═══════════════════════════════════════════════════════════════
  comment: string;                   // 표시 이름
  content: string;                   // 실제 내용

  // ═══════════════════════════════════════════════════════════════
  // 삽입 설정
  // ═══════════════════════════════════════════════════════════════
  insertorder: number;               // 삽입 순서 (우선순위)
  mode: 'multiple' | 'constant' | 'normal' | 'child' | 'folder';
  alwaysActive: boolean;             // 항상 활성화

  // ═══════════════════════════════════════════════════════════════
  // 고급 설정
  // ═══════════════════════════════════════════════════════════════
  activationPercent?: number;        // 활성화 확률 (0-100)
  useRegex?: boolean;                // 정규식 사용
  bookVersion?: number;              // 로어북 버전
  id?: string;                       // 엔트리 ID
  folder?: string;                   // 폴더 ID

  // ═══════════════════════════════════════════════════════════════
  // 확장
  // ═══════════════════════════════════════════════════════════════
  extentions?: {
    risu_case_sensitive: boolean;    // 대소문자 구분
  };
  
  loreCache?: {                      // 캐시
    key: string;
    data: string[];
  };
}
```

---

## 5. 정규식 스크립트 (customscript)

입출력 텍스트를 변환하는 정규식 스크립트입니다.

```typescript
interface customscript {
  comment: string;                   // 스크립트 이름
  type: string;                      // 타입 (아래 참조)
  in: string;                        // 정규식 패턴
  out: string;                       // 치환 문자열
  flag?: string;                     // 정규식 플래그 (기본: 'g')
  ableFlag?: boolean;                // 플래그 활성화 여부
}
```

### Type 값

| type | 설명 |
|------|------|
| `editinput` | 입력 텍스트 편집 |
| `editoutput` | 출력 텍스트 편집 |
| `editdisplay` | 표시 텍스트 편집 |
| `edittrans` | 번역 텍스트 편집 |

---

## 6. 트리거 스크립트 (triggerscript)

조건에 따라 동작을 실행하는 스크립트입니다.

```typescript
interface triggerscript {
  comment: string;                   // 스크립트 이름
  type: TriggerType;                 // 실행 시점
  conditions: triggerCondition[];    // 조건 배열
  effect: triggerEffect[];           // 효과 배열
  lowLevelAccess?: boolean;          // 저수준 접근
}

type TriggerType = 
  | 'start'      // 채팅 시작
  | 'manual'     // 수동 실행
  | 'output'     // AI 출력 후
  | 'input'      // 사용자 입력 후
  | 'display'    // 표시 시
  | 'request';   // 요청 시
```

### 조건 (triggerCondition)

```typescript
type triggerCondition = 
  | triggerConditionsVar 
  | triggerConditionsExists 
  | triggerConditionsChatIndex;

// 변수 조건
interface triggerConditionsVar {
  type: 'var' | 'value';
  var: string;
  value: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'null' | 'true';
}

// 존재 여부 조건
interface triggerConditionsExists {
  type: 'exists';
  value: string;
  type2: 'strict' | 'loose' | 'regex';
  depth: number;
}

// 채팅 인덱스 조건
interface triggerConditionsChatIndex {
  type: 'chatindex';
  value: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'null' | 'true';
}
```

### 효과 (triggerEffect)

```typescript
// 기본 효과
interface triggerEffectSetvar {
  type: 'setvar';
  operator: '=' | '+=' | '-=' | '*=' | '/=';
  var: string;
  value: string;
}

interface triggerEffectCutChat {
  type: 'cutchat';
  start: string;
  end: string;
}

interface triggerEffectModifyChat {
  type: 'modifychat';
  index: string;
  value: string;
}

interface triggerEffectSystemPrompt {
  type: 'systemprompt';
  location: 'start' | 'historyend' | 'promptend';
  value: string;
}

// 코드 효과
interface triggerCode {
  type: 'triggercode' | 'triggerlua';
  code: string;
}

// (V2 트리거는 더 많은 타입이 있음)
```

---

## 7. 채팅 (Chat, Message)

채팅 세션과 메시지입니다.

```typescript
interface Chat {
  message: Message[];                // 메시지 배열
  note: string;                      // 채팅 노트
  name: string;                      // 채팅 이름
  localLore: loreBook[];             // 로컬 로어북
  
  // 메모리
  sdData?: string;
  supaMemoryData?: string;
  hypaV2Data?: SerializableHypaV2Data;
  hypaV3Data?: SerializableHypaV3Data;
  lastMemory?: string;
  
  suggestMessages?: string[];        // 제안 메시지
  isStreaming?: boolean;             // 스트리밍 중
  scriptstate?: Record<string, string | number | boolean>;
  modules?: string[];                // 연결된 모듈
  id?: string;                       // 채팅 ID
  bindedPersona?: string;            // 바인딩된 페르소나
  fmIndex?: number;                  // 첫 메시지 인덱스
  folderId?: string;                 // 폴더 ID
  lastDate?: number;                 // 마지막 날짜
  bookmarks?: string[];              // 북마크
  bookmarkNames?: Record<string, string>;
}

interface Message {
  role: 'user' | 'char';             // 역할
  data: string;                      // 메시지 내용
  saying?: string;                   // 말하는 캐릭터 (그룹)
  chatId?: string;                   // 메시지 ID
  time?: number;                     // 타임스탬프
  name?: string;                     // 이름 오버라이드
  otherUser?: boolean;               // 다른 사용자
  disabled?: false | true | 'allBefore';  // 비활성화
  isComment?: boolean;               // 코멘트 여부
  
  // 생성 정보
  generationInfo?: MessageGenerationInfo;
  promptInfo?: MessagePresetInfo;
}

interface MessageGenerationInfo {
  model?: string;
  generationId?: string;
  inputTokens?: number;
  outputTokens?: number;
  maxContext?: number;
  stageTiming?: {
    stage1?: number;
    stage2?: number;
    stage3?: number;
    stage4?: number;
  };
}

interface ChatFolder {
  id: string;
  name?: string;
  color?: string;
  folded: boolean;
}
```

---

## 8. 에셋 구조

### 8.1 CharX (.charx) 에셋

CharX 파일은 ZIP 아카이브입니다.

```
character.charx (ZIP)
├── card.json              # CCv3 캐릭터 데이터
├── module.risum           # 선택: 임베드된 모듈
└── assets/                # 에셋 파일들
    └── type/itype/        # RisuAI 경로 구조
        ├── image1.png
        └── emotion_happy.webp
```

### 8.2 ccAssets (card.json 내)

```json
{
  "data": {
    "assets": [
      {
        "type": "icon",
        "uri": "ccdefault:",
        "name": "",
        "ext": "png"
      },
      {
        "type": "emotion",
        "uri": "embeded://assets/emotion/itype/happy.png",
        "name": "happy",
        "ext": "png"
      },
      {
        "type": "emotion",
        "uri": "__asset:1",
        "name": "sad",
        "ext": "png"
      }
    ]
  }
}
```

### 8.3 URI 형식

| URI 형식 | 설명 | 사용처 |
|----------|------|--------|
| `ccdefault:` | 기본 아이콘 (스킵) | 모든 포맷 |
| `embeded://assets/...` | ZIP 내 파일 경로 | CharX, CharX-JPEG |
| `__asset:N` | tEXt 청크 인덱스 | PNG |

### 8.4 모듈 에셋

```typescript
// module.assets = [
//   [이름, 경로(빈 문자열), 확장자],
//   ...
// ]
// 
// 에셋 블록 순서와 1:1 대응
// assets[0] → 첫 번째 에셋 블록
// assets[1] → 두 번째 에셋 블록
```

### 8.5 중복 이름 처리 (ModuleManager 방식)

```typescript
// 같은 이름의 에셋이 여러 개일 때:
// fm3.png
// fm3{{1}}.png
// fm3{{2}}.png

const nameCount = new Map<string, number>();
for (const asset of assets) {
  const count = nameCount.get(name) || 0;
  nameCount.set(name, count + 1);
  
  if (count === 0) {
    fileName = `${name}.${ext}`;
  } else {
    fileName = `${name}{{${count}}}.${ext}`;
  }
}
```

---

## 9. DSL (Domain Specific Language) 형식

RisuStudio와 ModuleManager에서 사용하는 TOML 기반 DSL 형식입니다.

### 9.1 공통 구조

```toml
===
name = "항목 이름"
type = "항목 타입"
field = "인라인 값"
multilineField = '''
멀티라인
값
'''

===
name = "다음 항목"
...
```

- **구분자**: `===` (각 항목 시작)
- **키 = 값**: TOML 스타일
- **인라인 문자열**: `"..."`
- **멀티라인 문자열**: `'''...'''`

### 9.2 로어북 DSL

```toml
===
name = "엔트리 이름"
key = "키워드1, 키워드2"
priority = "100"
insertOrder = "200"
content = '''
로어북 내용
'''
```

| 필드 | JSON 필드 | 설명 |
|------|-----------|------|
| `name` | `comment` | 엔트리 이름 |
| `key` | `key` | 활성화 키워드 (쉼표 구분) |
| `priority` | `priority` | 우선순위 |
| `insertOrder` | `insertorder` | 삽입 순서 |
| `content` | `content` | 로어북 내용 |

### 9.3 정규식 DSL

```toml
===
name = "Regex 이름"
type = "editdisplay"
pattern = "<img mps=\"(.*?)\">"
replace = '''
{{#if {{greater_equal::{{chat_index}}::{{? {{lastmessageid}}-5}}}}}}
<table class="asset-table">
...
</table>
{{/if}}
'''
flags = "g"
ableFlag = "true"
```

| 필드 | JSON 필드 | 설명 |
|------|-----------|------|
| `name` | `comment` | 스크립트 이름 |
| `type` | `type` | 타입 (editinput, editoutput, editdisplay, edittrans) |
| `pattern` | `in` | 정규식 패턴 |
| `replace` | `out` | 치환 문자열 |
| `flags` | `flag` | 정규식 플래그 |
| `ableFlag` | `ableFlag` | 플래그 활성화 여부 |

### 9.4 트리거 DSL

```toml
===
name = "트리거 이름"
type = "output"
active = "true"
lowLevelAccess = "false"
condition = '''
[{"type":"var","var":"enabled","operator":"=","value":"1"}]
'''
effect = '''
[{"type":"setvar","var":"count","value":"{{add::{{getvar::count}}::1}}","operator":"="}]
'''
```

| 필드 | JSON 필드 | 설명 |
|------|-----------|------|
| `name` | `comment` | 트리거 이름 |
| `type` | `type` | 실행 시점 (start, manual, output, input, display, request) |
| `active` | `active` | 활성화 상태 |
| `lowLevelAccess` | `lowLevelAccess` | 저수준 접근 권한 |
| `regex` | `regex` | 정규식 조건 |
| `condition` | `conditions` | 조건 배열 (JSON) |
| `effect` | `effect` | 효과 배열 (JSON 또는 텍스트) |

### 9.5 특수 효과 타입

`triggerlua`, `triggercode` 타입은 effect를 코드 블록으로 표시:

```toml
===
name = "Lua 트리거"
type = "manual"
effectType = "triggerlua"
effect = '''
local count = getvar("count") or 0
setvar("count", count + 1)
'''
```

---

## 참조

- **프리셋 스키마**: [risup_schema.md](risup_schema.md)
- **RisuAI 소스**: `src/ts/storage/database.svelte.ts`
- **모듈 처리**: `src/ts/process/modules.ts`
- **트리거 처리**: `src/ts/process/triggers.ts`
- **모듈 매니저**: `reference/module-manager-v3_2.0.6.js`
