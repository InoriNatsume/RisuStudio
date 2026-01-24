# RisuAI 프리셋 스키마 (.risup / .risupreset)

> **버전**: 1.0.0  
> **최종 업데이트**: 2026-01-25  
> **소스**: RisuAI `src/ts/storage/database.svelte.ts`, `src/ts/process/prompt.ts`

이 문서는 `.risup` / `.risupreset` 파일에 저장되는 **프리셋 데이터 스키마**를 정의합니다.

---

## 1. botPreset 인터페이스

프리셋의 최상위 구조입니다.

```typescript
interface botPreset {
  // ═══════════════════════════════════════════════════════════════
  // 기본 정보
  // ═══════════════════════════════════════════════════════════════
  name?: string;                    // 프리셋 이름
  image?: string;                   // 프리셋 이미지 (Base64)
  apiType?: string;                 // API 타입 (예: "openai", "claude", "gemini")
  aiModel?: string;                 // AI 모델명
  subModel?: string;                // 보조 모델명

  // ═══════════════════════════════════════════════════════════════
  // 모델 파라미터
  // ═══════════════════════════════════════════════════════════════
  temperature: number;              // 온도 (0-200, 실제값 = /100)
  maxContext: number;               // 최대 컨텍스트 토큰
  maxResponse: number;              // 최대 응답 토큰
  frequencyPenalty: number;         // 빈도 패널티 (0-200)
  PresensePenalty: number;          // 존재 패널티 (0-200) ※ 오타 주의
  top_p?: number;                   // Top P (0-1)
  top_k?: number;                   // Top K
  top_a?: number;                   // Top A
  min_p?: number;                   // Min P
  repetition_penalty?: number;      // 반복 패널티
  
  // ═══════════════════════════════════════════════════════════════
  // 프롬프트 (레거시 - promptTemplate 없을 때 사용)
  // ═══════════════════════════════════════════════════════════════
  mainPrompt: string;               // 메인 시스템 프롬프트
  jailbreak: string;                // Jailbreak 프롬프트
  globalNote: string;               // 글로벌 노트
  autoSuggestPrompt?: string;       // 자동 제안 프롬프트
  autoSuggestPrefix?: string;       // 자동 제안 접두사
  autoSuggestClean?: boolean;       // 자동 제안 정리

  // ═══════════════════════════════════════════════════════════════
  // 프롬프트 템플릿 (최신 - 구조화된 프롬프트 배열)
  // ═══════════════════════════════════════════════════════════════
  promptTemplate?: PromptItem[];    // ⭐ 핵심: 구조화된 프롬프트 배열
  formatingOrder: FormatingOrderItem[];  // 포맷팅 순서

  // ═══════════════════════════════════════════════════════════════
  // 정규식 스크립트
  // ═══════════════════════════════════════════════════════════════
  regex?: RegexScript[];            // 입출력 변환 정규식

  // ═══════════════════════════════════════════════════════════════
  // Bias (토큰 가중치)
  // ═══════════════════════════════════════════════════════════════
  bias: [string, number][];         // [토큰, 가중치] 배열

  // ═══════════════════════════════════════════════════════════════
  // URL 설정
  // ═══════════════════════════════════════════════════════════════
  openAIKey?: string;               // API 키 (보통 익스포트 시 제거)
  proxyKey?: string;                // 프록시 키
  forceReplaceUrl?: string;         // 강제 URL 교체
  forceReplaceUrl2?: string;        // 강제 URL 교체 2
  koboldURL?: string;               // Kobold URL
  textgenWebUIStreamURL?: string;   // TextGen WebUI 스트림 URL
  textgenWebUIBlockingURL?: string; // TextGen WebUI 블로킹 URL

  // ═══════════════════════════════════════════════════════════════
  // 모델별 설정
  // ═══════════════════════════════════════════════════════════════
  proxyRequestModel?: string;       // 프록시 요청 모델
  openrouterRequestModel?: string;  // OpenRouter 요청 모델
  customProxyRequestModel?: string; // 커스텀 프록시 요청 모델
  currentPluginProvider?: string;   // 현재 플러그인 프로바이더

  // ═══════════════════════════════════════════════════════════════
  // Instruct/Chat 템플릿
  // ═══════════════════════════════════════════════════════════════
  useInstructPrompt?: boolean;      // Instruct 프롬프트 사용
  instructChatTemplate?: string;    // Instruct 채팅 템플릿 ID
  JinjaTemplate?: string;           // Jinja 템플릿
  
  // ═══════════════════════════════════════════════════════════════
  // 프롬프트 전처리
  // ═══════════════════════════════════════════════════════════════
  promptPreprocess: boolean;        // 프롬프트 전처리 활성화
  promptSettings?: PromptSettings;  // 프롬프트 설정

  // ═══════════════════════════════════════════════════════════════
  // JSON Schema
  // ═══════════════════════════════════════════════════════════════
  jsonSchemaEnabled?: boolean;      // JSON 스키마 활성화
  jsonSchema?: string;              // JSON 스키마 정의
  strictJsonSchema?: boolean;       // 엄격한 JSON 스키마
  extractJson?: string;             // JSON 추출 경로

  // ═══════════════════════════════════════════════════════════════
  // 그룹 채팅
  // ═══════════════════════════════════════════════════════════════
  groupTemplate?: string;           // 그룹 템플릿
  groupOtherBotRole?: string;       // 다른 봇 역할 ('user' | 'assistant')

  // ═══════════════════════════════════════════════════════════════
  // 커스텀 토글/변수
  // ═══════════════════════════════════════════════════════════════
  customPromptTemplateToggle?: string;  // 커스텀 토글 정의
  templateDefaultVariables?: string;     // 기본 변수 정의
  moduleIntergration?: string;           // 모듈 통합 설정

  // ═══════════════════════════════════════════════════════════════
  // 고급 설정
  // ═══════════════════════════════════════════════════════════════
  localStopStrings?: string[];      // 로컬 중지 문자열
  NAISettings?: NAISettings;        // NovelAI 설정
  NAIadventure?: boolean;           // NAI 어드벤처 모드
  NAIappendName?: boolean;          // NAI 이름 추가
  ooba?: OobaSettings;              // Oobabooga 설정
  ainconfig?: AINsettings;          // AIN 설정
  reverseProxyOobaArgs?: OobaChatCompletionRequestParams;
  
  // OpenRouter 프로바이더
  openrouterProvider?: {
    order: string[];
    only: string[];
    ignore: string[];
  };
  
  // 분리된 파라미터 (메모리, 감정, 번역 등)
  seperateParametersEnabled?: boolean;
  seperateParameters?: {
    memory: SeparateParameters;
    emotion: SeparateParameters;
    translate: SeparateParameters;
    otherAx: SeparateParameters;
  };
  
  // 커스텀 API 포맷
  customAPIFormat?: LLMFormat;
  systemContentReplacement?: string;
  systemRoleReplacement?: 'user' | 'assistant';
  
  // 커스텀 플래그
  enableCustomFlags?: boolean;
  customFlags?: LLMFlags[];
  
  // 추론 관련
  reasonEffort?: number;            // 추론 노력
  thinkingTokens?: number;          // 생각 토큰
  outputImageModal?: boolean;       // 이미지 출력 모달
  
  // 모델 도구/폴백
  modelTools?: string[];
  fallbackModels?: {
    memory: string[];
    emotion: string[];
    translate: string[];
    otherAx: string[];
    model: string[];
  };
  fallbackWhenBlankResponse?: boolean;
  
  verbosity?: number;               // 상세도
  dynamicOutput?: DynamicOutput;    // 동적 출력
}
```

---

## 2. PromptItem 타입 (프롬프트 템플릿)

`promptTemplate` 배열의 각 항목입니다. **유니온 타입**으로 구성됩니다.

```typescript
type PromptItem = 
  | PromptItemPlain 
  | PromptItemTyped 
  | PromptItemChat 
  | PromptItemAuthorNote 
  | PromptItemChatML 
  | PromptItemCache;
```

### 2.1 PromptItemPlain

가장 일반적인 텍스트 프롬프트입니다.

```typescript
interface PromptItemPlain {
  type: 'plain' | 'jailbreak' | 'cot';
  type2: 'normal' | 'globalNote' | 'main';
  text: string;
  role: 'user' | 'bot' | 'system';
  name?: string;  // 표시 이름 (예: "The Veil", "Poiesis")
}
```

| type | 설명 |
|------|------|
| `plain` | 일반 프롬프트 |
| `jailbreak` | Jailbreak 프롬프트 |
| `cot` | Chain of Thought 프롬프트 |

| type2 | 설명 |
|-------|------|
| `normal` | 일반 |
| `globalNote` | 글로벌 노트 |
| `main` | 메인 프롬프트 |

### 2.2 PromptItemTyped

특정 타입의 데이터를 삽입하는 프롬프트입니다.

```typescript
interface PromptItemTyped {
  type: 'persona' | 'description' | 'lorebook' | 'postEverything' | 'memory';
  innerFormat?: string;  // 내부 포맷 (예: "{{slot}}")
  name?: string;
}
```

| type | 설명 |
|------|------|
| `persona` | 페르소나 프롬프트 |
| `description` | 캐릭터 설명 |
| `lorebook` | 로어북 데이터 |
| `postEverything` | 모든 것 뒤에 삽입 |
| `memory` | 메모리/요약 |

### 2.3 PromptItemChat

채팅 기록을 삽입하는 프롬프트입니다.

```typescript
interface PromptItemChat {
  type: 'chat';
  rangeStart: number;    // 시작 인덱스
  rangeEnd: number | 'end';  // 끝 인덱스 또는 'end'
  chatAsOriginalOnSystem?: boolean;
  name?: string;
}
```

### 2.4 PromptItemAuthorNote

작성자 노트 프롬프트입니다.

```typescript
interface PromptItemAuthorNote {
  type: 'authornote';
  innerFormat?: string;
  defaultText?: string;
  name?: string;
}
```

### 2.5 PromptItemChatML

ChatML 형식 프롬프트입니다.

```typescript
interface PromptItemChatML {
  type: 'chatML';
  text: string;
  name?: string;
}
```

### 2.6 PromptItemCache

캐시 포인트 프롬프트입니다.

```typescript
interface PromptItemCache {
  type: 'cache';
  name: string;
  depth: number;
  role: 'user' | 'assistant' | 'system' | 'all';
}
```

---

## 3. FormatingOrderItem (포맷팅 순서)

프롬프트가 조합되는 순서를 정의합니다.

```typescript
type FormatingOrderItem = 
  | 'main'           // 메인 프롬프트
  | 'jailbreak'      // Jailbreak
  | 'chats'          // 채팅 기록
  | 'lorebook'       // 로어북
  | 'globalNote'     // 글로벌 노트
  | 'authorNote'     // 작성자 노트
  | 'lastChat'       // 마지막 채팅
  | 'description'    // 캐릭터 설명
  | 'postEverything' // 모든 것 뒤
  | 'personaPrompt'; // 페르소나
```

### 예시

```json
{
  "formatingOrder": [
    "main",
    "description",
    "personaPrompt",
    "chats",
    "lastChat",
    "jailbreak",
    "lorebook",
    "globalNote",
    "authorNote"
  ]
}
```

---

## 4. RegexScript (정규식 스크립트)

입출력 텍스트를 변환하는 정규식 스크립트입니다.

```typescript
interface RegexScript {
  comment: string;   // 스크립트 이름
  type: 'editinput' | 'editoutput' | 'editdisplay' | 'edittrans';
  in: string;        // 정규식 패턴
  out: string;       // 치환 문자열
  flag?: string;     // 정규식 플래그 (기본: 'g')
  aliasRecursive?: boolean;  // 재귀 별칭
}
```

| type | 설명 |
|------|------|
| `editinput` | 입력 텍스트 편집 |
| `editoutput` | 출력 텍스트 편집 |
| `editdisplay` | 표시 텍스트 편집 |
| `edittrans` | 번역 텍스트 편집 |

---

## 5. PromptSettings

프롬프트 관련 세부 설정입니다.

```typescript
interface PromptSettings {
  assistantPrefill: string;        // 어시스턴트 프리필
  postEndInnerFormat: string;      // 끝 내부 포맷
  sendChatAsSystem: boolean;       // 채팅을 시스템으로 전송
  sendName: boolean;               // 이름 전송
  utilOverride: boolean;           // 유틸 오버라이드
  customChainOfThought?: boolean;  // 커스텀 CoT
  maxThoughtTagDepth?: number;     // 최대 생각 태그 깊이
  trimStartNewChat?: boolean;      // 새 채팅 시작 트림
}
```

---

## 6. mainPrompt vs promptTemplate

### 언제 무엇을 사용하나?

| 필드 | 사용 시기 | 예시 |
|------|-----------|------|
| `mainPrompt`, `jailbreak` | `promptTemplate`가 없는 **레거시 프리셋** | 구버전 프리셋 |
| `promptTemplate` | **최신 프리셋** (대부분) | RisuAI 2024+ |

### 왜 둘 다 존재하나?

1. **하위 호환성**: 구버전 프리셋 지원
2. **마이그레이션**: `promptTemplate`가 없으면 `mainPrompt`/`jailbreak`에서 자동 생성
3. **단순 사용**: 간단한 프리셋은 레거시 필드만으로 충분

### RisuAI 동작

```typescript
// RisuAI가 프롬프트를 조합할 때
if (preset.promptTemplate && preset.promptTemplate.length > 0) {
  // promptTemplate 사용 (최신 방식)
  for (const item of preset.promptTemplate) {
    processPromptItem(item);
  }
} else {
  // mainPrompt, jailbreak 사용 (레거시 방식)
  processLegacyPrompts(preset.mainPrompt, preset.jailbreak);
}
```

---

## 7. 예시: 실제 프리셋 구조

```json
{
  "name": "My Preset",
  "aiModel": "claude-3-opus",
  "temperature": 80,
  "maxContext": 100000,
  "maxResponse": 4000,
  "top_p": 1,
  
  "mainPrompt": "",
  "jailbreak": "",
  "globalNote": "",
  
  "promptTemplate": [
    {
      "type": "plain",
      "type2": "main",
      "text": "You are a helpful assistant.",
      "role": "system",
      "name": "메인 프롬프트"
    },
    {
      "type": "persona",
      "innerFormat": "User's persona: {{slot}}",
      "name": "페르소나"
    },
    {
      "type": "description",
      "innerFormat": "{{slot}}",
      "name": "캐릭터 설명"
    },
    {
      "type": "lorebook",
      "name": "로어북"
    },
    {
      "type": "chat",
      "rangeStart": 0,
      "rangeEnd": "end",
      "name": "채팅 기록"
    },
    {
      "type": "plain",
      "type2": "normal",
      "text": "[Write your next response]",
      "role": "system",
      "name": "Jailbreak"
    }
  ],
  
  "formatingOrder": [
    "main", "description", "personaPrompt", 
    "chats", "lastChat", "jailbreak", 
    "lorebook", "globalNote", "authorNote"
  ],
  
  "regex": [
    {
      "comment": "Remove OOC",
      "type": "editoutput",
      "in": "\\(OOC:.*?\\)",
      "out": "",
      "flag": "gi"
    }
  ],
  
  "bias": [],
  "promptPreprocess": false
}
```

---

## 8. 참조

- **원본 소스**: `RisuAI/src/ts/storage/database.svelte.ts` (botPreset 인터페이스)
- **프롬프트 타입**: `RisuAI/src/ts/process/prompt.ts` (PromptItem 타입)
- **파싱 로직**: [risup_cherrypick.md](../reference/risup_cherrypick.md)
