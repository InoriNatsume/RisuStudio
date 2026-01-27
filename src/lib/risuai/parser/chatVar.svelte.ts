// RisuAI parser/chatVar.svelte.ts - 시뮬레이터용 간소화 버전
// 원본: Risuai-2026.1.184/src/ts/parser/chatVar.svelte.ts

// 시뮬레이터 변수 저장소
let chatVars: Map<string, string> = new Map();
let globalChatVars: Map<string, string> = new Map();

/**
 * Chat 변수 가져오기
 */
export function getChatVar(key: string): string {
    return chatVars.get(key) ?? 'null';
}

/**
 * Chat 변수 설정
 */
export function setChatVar(key: string, value: string | number | boolean): void {
    chatVars.set(key, String(value));
}

/**
 * Global Chat 변수 가져오기
 */
export function getGlobalChatVar(key: string): string {
    return globalChatVars.get(key) ?? 'null';
}

/**
 * Global Chat 변수 설정
 */
export function setGlobalChatVar(key: string, value: string | number | boolean): void {
    globalChatVars.set(key, String(value));
}

/**
 * 모든 Chat 변수 초기화
 */
export function clearChatVars(): void {
    chatVars.clear();
}

/**
 * 모든 Global Chat 변수 초기화
 */
export function clearGlobalChatVars(): void {
    globalChatVars.clear();
}

/**
 * 외부에서 변수 맵 직접 설정 (시뮬레이터용)
 */
export function setChatVarsMap(vars: Map<string, string>): void {
    chatVars = vars;
}

export function setGlobalChatVarsMap(vars: Map<string, string>): void {
    globalChatVars = vars;
}

/**
 * 현재 변수 맵 가져오기 (디버깅용)
 */
export function getChatVarsMap(): Map<string, string> {
    return chatVars;
}

export function getGlobalChatVarsMap(): Map<string, string> {
    return globalChatVars;
}
