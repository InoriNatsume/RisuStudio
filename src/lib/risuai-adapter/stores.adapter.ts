/**
 * RisuAI stores.svelte 어댑터
 * 
 * 시뮬레이터용 스텁 - RisuAI의 Svelte 스토어를 모방
 */

// Svelte store 모방
function writable<T>(initial: T) {
    let value = initial;
    const subscribers = new Set<(v: T) => void>();
    
    return {
        subscribe: (fn: (v: T) => void) => {
            subscribers.add(fn);
            fn(value);
            return () => subscribers.delete(fn);
        },
        set: (v: T) => {
            value = v;
            subscribers.forEach(fn => fn(v));
        },
        update: (fn: (v: T) => T) => {
            value = fn(value);
            subscribers.forEach(fn => fn(value));
        }
    };
}

// get 함수
export function get<T>(store: { subscribe: (fn: (v: T) => void) => () => void }): T {
    let value: T;
    const unsub = store.subscribe(v => { value = v; });
    unsub();
    return value!;
}

// ============== 시뮬레이터 상태 ==============

// 현재 선택된 캐릭터 ID
export const selectedCharID = writable<number>(0);

// 현재 트리거 ID
export const CurrentTriggerIdStore = writable<string>('');

// 캐릭터 이모션
export const CharEmotion = writable<{[key: string]: string}>({});

// DB 상태
export const DBState = {
    db: null as any,
};

// selIdState
export const selIdState = writable<string>('');

// MobileGUI
export const MobileGUI = writable<boolean>(false);

// 로딩 상태
export const loadedStore = writable<boolean>(true);
export const LoadingStatusState = writable<string>('');

// ReloadGUIPointer
export const ReloadGUIPointer = writable<number>(0);

// botMakerMode
export const botMakerMode = writable<boolean>(false);

// OpenRealmStore
export const OpenRealmStore = writable<boolean>(false);

// MobileGUIStack
export const MobileGUIStack = writable<string[]>([]);

// ShowRealmFrameStore
export const ShowRealmFrameStore = writable<boolean>(false);

// SettingsMenuIndex
export const SettingsMenuIndex = writable<number>(0);

// settingsOpen
export const settingsOpen = writable<boolean>(false);
