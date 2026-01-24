/**
 * RisuStudio CBS (Character Building Script) Types
 * 
 * CBS is RisuAI's templating language for dynamic text processing.
 * Syntax: {{command::arg1::arg2::...}}
 */

/**
 * CBS 실행 컨텍스트
 * 시뮬레이터에서 변수와 채팅 상태를 관리
 */
export interface CBSContext {
  /** 채팅 세션 변수 (채팅 내에서 유지) */
  chatVars: Record<string, string>;
  
  /** 글로벌 변수 (모든 채팅에서 공유) */
  globalVars: Record<string, string>;
  
  /** 임시 변수 (실행 중에만 유지) */
  tempVars: Record<string, string>;
  
  /** 캐릭터 정보 */
  char: {
    name: string;
    nickname?: string;
  };
  
  /** 사용자 이름 */
  user: string;
  
  /** 채팅 기록 */
  chatHistory: CBSMessage[];
  
  /** 현재 채팅 ID (메시지 인덱스) */
  chatID: number;
  
  /** 변수 설정 가능 여부 */
  runVar?: boolean;
  
  /** 변수 제거 모드 */
  rmVar?: boolean;
  
  /** 토큰 정확도 모드 (시간 관련 함수에서 상수 반환) */
  tokenizeAccurate?: boolean;
  
  /** 화면 표시용 처리 중 여부 */
  displaying?: boolean;
}

/**
 * CBS 메시지 형식
 */
export interface CBSMessage {
  role: 'user' | 'char' | 'system';
  data: string;
  time?: number;
}

/**
 * CBS 실행 결과
 */
export interface CBSResult {
  /** 처리된 출력 텍스트 */
  output: string;
  
  /** 실행 추적 정보 */
  trace: CBSTraceStep[];
  
  /** 변경된 변수들 */
  modifiedVars: {
    chatVars: Record<string, string>;
    globalVars: Record<string, string>;
    tempVars: Record<string, string>;
  };
  
  /** 에러 목록 */
  errors: CBSError[];
}

/**
 * CBS 실행 추적 단계
 */
export interface CBSTraceStep {
  /** 원본 표현식 */
  original: string;
  
  /** 평가된 결과 */
  result: string;
  
  /** 명령어 이름 */
  command: string;
  
  /** 인자들 */
  args: string[];
  
  /** 소스 위치 */
  position: {
    start: number;
    end: number;
  };
  
  /** 실행 시간 (ms) */
  duration?: number;
  
  /** 중첩된 평가 */
  nested?: CBSTraceStep[];
}

/**
 * CBS 에러
 */
export interface CBSError {
  message: string;
  command?: string;
  position?: {
    start: number;
    end: number;
  };
  severity: 'warning' | 'error';
}

/**
 * CBS 파싱된 노드
 */
export interface CBSNode {
  type: 'text' | 'command' | 'block';
  value: string;
  command?: string;
  args?: string[];
  children?: CBSNode[];
  position: {
    start: number;
    end: number;
  };
}

/**
 * CBS 명령어 정의
 */
export interface CBSCommand {
  /** 명령어 이름 */
  name: string;
  
  /** 명령어 별칭 */
  aliases: string[];
  
  /** 설명 */
  description: string;
  
  /** 콜백 함수 */
  callback: CBSCallback | 'doc_only';
  
  /** 내부 전용 여부 */
  internalOnly?: boolean;
  
  /** 사용 중단 정보 */
  deprecated?: {
    message: string;
    since?: string;
    replacement?: string;
  };
}

/**
 * CBS 콜백 함수 타입
 */
export type CBSCallback = (
  args: string[],
  context: CBSContext,
  vars: Record<string, string>
) => CBSCallbackResult;

/**
 * CBS 콜백 결과 타입
 */
export type CBSCallbackResult = 
  | string 
  | null 
  | { text: string; var: Record<string, string> };

/**
 * 변수 정보 (에디터용)
 */
export interface VariableInfo {
  name: string;
  type: 'chatVar' | 'globalVar' | 'tempVar';
  operation: 'get' | 'set' | 'add';
  position: {
    start: number;
    end: number;
  };
}

/**
 * 기본 CBS 컨텍스트 생성
 */
export function createDefaultContext(): CBSContext {
  return {
    chatVars: {},
    globalVars: {},
    tempVars: {},
    char: { name: 'Character' },
    user: 'User',
    chatHistory: [],
    chatID: -1,
    runVar: true,
    rmVar: false,
    tokenizeAccurate: false,
    displaying: false,
  };
}
