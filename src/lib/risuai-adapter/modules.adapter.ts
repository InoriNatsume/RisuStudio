/**
 * RisuAI process/modules.ts 어댑터
 * 
 * 시뮬레이터용 스텁
 */

import type { loreBook } from './database.adapter';

export interface RisuModule {
    name: string;
    description?: string;
    lorebook?: loreBook[];
    regex?: any[];
    assets?: [string, string][];
    scripts?: any[];
}

let modules: RisuModule[] = [];

export function getModules(): RisuModule[] {
    return modules;
}

export function setModules(m: RisuModule[]): void {
    modules = m;
}

export function getModuleLorebooks(): loreBook[] {
    return modules.flatMap(m => m.lorebook ?? []);
}

export function getModuleAssets(): [string, string][] {
    return modules.flatMap(m => m.assets ?? []);
}

export function getModuleRegexScripts(): any[] {
    return modules.flatMap(m => m.regex ?? []);
}

export function moduleUpdate(): void {
    // 시뮬레이터에서는 무시
}

export async function readModule(file: File): Promise<RisuModule | null> {
    // 시뮬레이터에서는 구현 필요 시 추가
    return null;
}

export async function exportModule(module: RisuModule): Promise<Blob> {
    return new Blob([JSON.stringify(module)], { type: 'application/json' });
}
