/**
 * RisuAI storage/database.svelte 어댑터
 * 
 * 시뮬레이터용 스텁
 */

// ============== 타입 정의 ==============

export interface loreBook {
    key: string;
    secondkey: string;
    insertorder: number;
    comment: string;
    content: string;
    mode: 'normal' | 'raw' | 'lorebook';
    alwaysActive: boolean;
    selective: boolean;
    extentions?: Record<string, unknown>;
    order?: number;
    activeProbability?: number;
    loreCache?: unknown;
    useRegex?: boolean;
    scanDepth?: number | null;
    caseSensitive?: boolean;
    matchWholeWords?: boolean;
    priority?: number;
    displayName?: string;
    groupOverride?: string | null;
    groupWeight?: number;
}

export interface character {
    type: 'character' | 'group' | 'simple';
    name: string;
    nickname?: string;
    firstMessage: string;
    alternateGreetings?: string[];
    desc: string;
    notes: string;
    personality?: string;
    scenario?: string;
    exampleMessage?: string;
    chats: Chat[];
    chatPage: number;
    image?: string;
    emotionImages: [string, string][];
    bias: [string, number][];
    globalLore: loreBook[];
    chaId: string;
    sdData: unknown;
    customscript: customscript[];
    triggerscript: triggerscript[];
    additionalAssets: [string, string, string?][];
    virtualscript?: string;
    backgroundHTML?: string;
    lowLevelAccess?: boolean;
    extentions?: Record<string, unknown>;
}

export interface Chat {
    message: Message[];
    note: string;
    name: string;
    localLore: loreBook[];
    sdpieces?: unknown;
    isRecording?: boolean;
    fmIndex?: number;
}

export interface Message {
    role: 'user' | 'char' | 'system';
    data: string;
    saying?: string;
    chatId?: string;
    time?: number;
}

export interface groupChat {
    type: 'group';
    name: string;
    chats: Chat[];
    chatPage: number;
    characters: string[];
}

export interface customscript {
    type: 'editinput' | 'editoutput' | 'editprocess' | 'editdisplay';
    in: string;
    out: string;
    ableFlag: boolean;
    flag: string;
    comment?: string;
}

export interface triggerscript {
    type: string;
    condition: string;
    effect: string;
}

export interface loreSettings {
    scanDepth: number;
    tokenBudget: number;
    recursiveScanning: boolean;
}

export interface Database {
    characters: character[];
    formatversion?: number;
    aiModel?: string;
    subModel?: string;
    persona?: {
        name: string;
        icon: string;
        personaPrompt: string;
    };
    username?: string;
    userIcon?: string;
    personaPrompt?: string;
    customBackground?: string;
    globalNote?: string;
    autoTranslate?: boolean;
    fullScreen?: boolean;
    playMessage?: boolean;
    iconsize?: number;
    theme?: string;
    subtheme?: string;
    timeZone?: string;
    jailbreakToggle?: boolean;
    jailbreak?: string;
    mainPrompt?: string;
    globalscript?: customscript[];
    loreSettings?: loreSettings;
}

export interface MessageGenerationInfo {
    // placeholder
}

// ============== 시뮬레이터 상태 ==============

let simulatorDatabase: Database = {
    characters: [],
    username: 'User',
};

let currentCharacter: character | null = null;
let currentChat: Chat | null = null;

export const appVer = '2026.1.184';

// ============== 함수들 ==============

export function getDatabase(): Database {
    return simulatorDatabase;
}

export function setDatabase(db: Database): void {
    simulatorDatabase = db;
}

export function getCurrentCharacter(): character | null {
    return currentCharacter;
}

export function setCurrentCharacter(char: character | null): void {
    currentCharacter = char;
}

export function getCurrentChat(): Chat | null {
    return currentChat;
}

export function setCurrentChat(chat: Chat | null): void {
    currentChat = chat;
}

export function getCharacterByIndex(index: number): character | null {
    return simulatorDatabase.characters[index] ?? null;
}

export function setCharacterByIndex(index: number, char: character): void {
    simulatorDatabase.characters[index] = char;
}

export function saveImage(data: string): string {
    // 시뮬레이터에서는 그냥 반환
    return data;
}

export function importPreset(preset: any): void {
    // 시뮬레이터에서는 무시
}

export function setDatabaseLite(db: Partial<Database>): void {
    simulatorDatabase = { ...simulatorDatabase, ...db };
}

export function defaultSdDataFunc(): any {
    return {};
}

// ============== 시뮬레이터 컨텍스트 설정 ==============

export function setSimulatorData(data: {
    character?: character;
    chat?: Chat;
    database?: Partial<Database>;
}): void {
    if (data.character) {
        currentCharacter = data.character;
    }
    if (data.chat) {
        currentChat = data.chat;
    }
    if (data.database) {
        simulatorDatabase = { ...simulatorDatabase, ...data.database };
    }
}
