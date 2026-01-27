/**
 * RisuAI util.ts 어댑터
 * 
 * 시뮬레이터용 스텁
 */

import { getDatabase, getCurrentCharacter, type character } from './database.adapter';

export function getUserName(): string {
    const db = getDatabase();
    return db.username ?? db.persona?.name ?? 'User';
}

export function getPersonaPrompt(): string {
    const db = getDatabase();
    return db.personaPrompt ?? db.persona?.personaPrompt ?? '';
}

export function getUserIcon(): string {
    const db = getDatabase();
    return db.userIcon ?? db.persona?.icon ?? '';
}

export function findCharacterbyId(id: string): character {
    const db = getDatabase();
    const found = db.characters.find(c => c.chaId === id);
    return found ?? {
        type: 'character',
        name: 'Unknown Character',
        firstMessage: '',
        desc: '',
        notes: '',
        chats: [],
        chatPage: 0,
        emotionImages: [],
        bias: [],
        globalLore: [],
        chaId: '',
        sdData: {},
        customscript: [],
        triggerscript: [],
        additionalAssets: [],
    };
}

export function checkNullish<T>(value: T | null | undefined): value is T {
    return value !== null && value !== undefined;
}

export function selectSingleFile(accept?: string): Promise<File | null> {
    return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        if (accept) input.accept = accept;
        input.onchange = () => {
            resolve(input.files?.[0] ?? null);
        };
        input.click();
    });
}

export function selectMultipleFile(accept?: string): Promise<FileList | null> {
    return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        if (accept) input.accept = accept;
        input.onchange = () => {
            resolve(input.files);
        };
        input.click();
    });
}

export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function changeFullscreen(value: boolean): void {
    if (value) {
        document.documentElement.requestFullscreen?.();
    } else {
        document.exitFullscreen?.();
    }
}

export function parseKeyValue(str: string): { key: string; value: string } {
    const idx = str.indexOf('=');
    if (idx === -1) {
        return { key: str, value: '' };
    }
    return {
        key: str.substring(0, idx),
        value: str.substring(idx + 1),
    };
}

export function pickHashRand(seed: number, hash: string): number {
    // 간단한 해시 기반 난수
    let h = 0;
    for (let i = 0; i < hash.length; i++) {
        h = ((h << 5) - h + hash.charCodeAt(i)) | 0;
    }
    return Math.abs((h + seed) % 1000000) / 1000000;
}

export async function replaceAsync(
    str: string,
    regex: RegExp,
    asyncFn: (match: string, ...args: any[]) => Promise<string>
): Promise<string> {
    const promises: Promise<string>[] = [];
    str.replace(regex, (match, ...args) => {
        promises.push(asyncFn(match, ...args));
        return match;
    });
    const results = await Promise.all(promises);
    return str.replace(regex, () => results.shift()!);
}

export function isKnownUri(str: string): boolean {
    return str.startsWith('http://') || 
           str.startsWith('https://') || 
           str.startsWith('data:') || 
           str.startsWith('blob:');
}

export function decryptBuffer(buffer: ArrayBuffer, key: string): ArrayBuffer {
    // 시뮬레이터에서는 그냥 반환
    return buffer;
}

export function selectFileByDom(accept?: string): Promise<File | null> {
    return selectSingleFile(accept);
}
