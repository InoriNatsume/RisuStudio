/**
 * RisuAI Lua 엔진 - wasmoon 기반
 * RisuAI의 scriptings.ts 패턴을 그대로 사용
 */

import type { LuaEngine as WasmoonEngine, LuaFactory } from 'wasmoon';

// 동적 import (SSR 방지)
let factory: LuaFactory | null = null;
let factoryPromise: Promise<void> | null = null;

async function ensureFactory(): Promise<void> {
  if (factory) return;
  
  if (factoryPromise) {
    await factoryPromise;
    return;
  }
  
  factoryPromise = (async () => {
    const wasmoon = await import('wasmoon');
    const _factory = new wasmoon.LuaFactory();
    
    // json.lua 마운트 (RisuAI 패턴)
    try {
      const res = await fetch('/lua/json.lua');
      if (res.ok) {
        const code = await res.text();
        await _factory.mountFile('json.lua', code);
        console.log('[LuaEngine] json.lua 마운트 완료');
      }
    } catch (e) {
      console.warn('[LuaEngine] json.lua 로드 실패:', e);
    }
    
    factory = _factory;
  })();
  
  await factoryPromise;
  factoryPromise = null;
}

export interface LuaEngineOptions {
  onVarChange?: (key: string, value: string) => void;
  onLog?: (message: string) => void;
}

export class LuaEngine {
  private engine: WasmoonEngine | null = null;
  private variables: Record<string, string> = {};
  private options: LuaEngineOptions;
  private initialized = false;
  private code = '';

  constructor(options: LuaEngineOptions = {}) {
    this.options = options;
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    
    try {
      // factory 준비 (json.lua 마운트 포함)
      await ensureFactory();
      
      if (!factory) {
        throw new Error('LuaFactory 초기화 실패');
      }
      
      this.engine = await factory.createEngine({ injectObjects: true });
      this.initialized = true;
      console.log('[LuaEngine] wasmoon 초기화 완료');
    } catch (e) {
      console.error('[LuaEngine] 초기화 실패:', e);
      throw e;
    }
  }

  /**
   * RisuAI API 등록 및 Lua 코드 실행
   * RisuAI의 scriptings.ts 패턴을 따름
   */
  async execute(code: string, triggerId: string = 'simulator'): Promise<boolean> {
    if (!this.initialized || !this.engine) {
      console.warn('[LuaEngine] 초기화되지 않음');
      return false;
    }

    // 코드가 같으면 재실행 불필요 (이미 함수 정의됨)
    if (code === this.code) {
      return true;
    }

    try {
      const self = this;
      const engine = this.engine;

      // RisuAI API 등록 (scriptings.ts의 declareAPI 패턴)
      
      // getChatVar(id, key)
      engine.global.set('getChatVar', (id: string, key: string) => {
        return self.variables[key] || 'null';
      });

      // setChatVar(id, key, value)
      engine.global.set('setChatVar', (id: string, key: string, value: string) => {
        self.variables[key] = value;
        self.options.onVarChange?.(key, value);
        console.log('[LuaEngine] setChatVar:', key, '=', value);
      });

      // getGlobalVar (로컬과 동일하게 처리)
      engine.global.set('getGlobalVar', (id: string, key: string) => {
        return self.variables[key] || 'null';
      });

      // getChatMain (채팅 메시지 가져오기 - 시뮬레이터에서는 빈 객체)
      engine.global.set('getChatMain', (id: string, index: number) => {
        return JSON.stringify(null);
      });

      // getChatLength
      engine.global.set('getChatLength', (id: string) => {
        return 0;
      });

      // getFullChatMain
      engine.global.set('getFullChatMain', (id: string) => {
        return JSON.stringify([]);
      });

      // logMain
      engine.global.set('logMain', (value: string) => {
        try {
          const parsed = JSON.parse(value);
          self.options.onLog?.(JSON.stringify(parsed));
          console.log('[Lua]', parsed);
        } catch {
          self.options.onLog?.(value);
          console.log('[Lua]', value);
        }
      });

      // stopChat
      engine.global.set('stopChat', (id: string) => {
        console.log('[LuaEngine] stopChat called');
      });

      // alertError, alertNormal (시뮬레이터에서는 콘솔 출력)
      engine.global.set('alertError', (id: string, value: string) => {
        console.error('[Lua Alert Error]', value);
        self.options.onLog?.(`[Error] ${value}`);
      });

      engine.global.set('alertNormal', (id: string, value: string) => {
        console.log('[Lua Alert]', value);
        self.options.onLog?.(value);
      });

      // cbs (CBS 파서 - 시뮬레이터에서는 그대로 반환)
      engine.global.set('cbs', (value: string) => {
        return value;
      });

      // getName, getPersonaName
      engine.global.set('getName', (id: string) => {
        return 'Character';
      });

      engine.global.set('getPersonaName', (id: string) => {
        return 'User';
      });

      // reloadDisplay, reloadChat (시뮬레이터에서는 리렌더링 트리거)
      engine.global.set('reloadDisplay', (id: string) => {
        console.log('[LuaEngine] reloadDisplay called');
      });

      engine.global.set('reloadChat', (id: string, index: number) => {
        console.log('[LuaEngine] reloadChat called:', index);
      });

      // RisuAI의 luaCodeWrapper 적용 후 코드 실행
      const wrappedCode = this.luaCodeWrapper(code);
      await engine.doString(wrappedCode);
      
      this.code = code;
      console.log('[LuaEngine] Lua 코드 실행 완료');
      return true;
    } catch (e) {
      console.error('[LuaEngine] 실행 오류:', e);
      return false;
    }
  }

  /**
   * RisuAI의 luaCodeWrapper 함수 (scriptings.ts에서 가져옴)
   * listenEdit, getChat, getFullChat 등 Lua 측 API 정의
   */
  private luaCodeWrapper(code: string): string {
    return `
json = require 'json'

function getChat(id, index)
    return json.decode(getChatMain(id, index))
end

function getFullChat(id)
    return json.decode(getFullChatMain(id))
end

function setFullChat(id, value)
    setFullChatMain(id, json.encode(value))
end

function log(value)
    logMain(json.encode(value))
end

function getLoreBooks(id, search)
    return json.decode(getLoreBooksMain(id, search) or "[]")
end

local editRequestFuncs = {}
local editDisplayFuncs = {}
local editInputFuncs = {}
local editOutputFuncs = {}

function listenEdit(type, func)
    if type == 'editRequest' then
        editRequestFuncs[#editRequestFuncs + 1] = func
        return
    end

    if type == 'editDisplay' then
        editDisplayFuncs[#editDisplayFuncs + 1] = func
        return
    end

    if type == 'editInput' then
        editInputFuncs[#editInputFuncs + 1] = func
        return
    end

    if type == 'editOutput' then
        editOutputFuncs[#editOutputFuncs + 1] = func
        return
    end

    error('Invalid listenEdit type: ' .. tostring(type))
end

function getState(id, name)
    local escapedName = "__"..name
    local raw = getChatVar(id, escapedName)
    if raw == nil or raw == "null" or raw == "" then
        return nil
    end
    return json.decode(raw)
end

function setState(id, name, value)
    local escapedName = "__"..name
    setChatVar(id, escapedName, json.encode(value))
end

function async(callback)
    return function(...)
        local co = coroutine.create(callback)
        local safe, result = coroutine.resume(co, ...)

        return Promise.create(function(resolve, reject)
            local checkresult
            local step = function()
                if coroutine.status(co) == "dead" then
                    local send = safe and resolve or reject
                    return send(result)
                end

                safe, result = coroutine.resume(co)
                checkresult()
            end

            checkresult = function()
                if safe and result == Promise.resolve(result) then
                    result:finally(step)
                else
                    step()
                end
            end

            checkresult()
        end)
    end
end

callListenMain = async(function(type, id, value, meta)
    local realValue = json.decode(value)
    local realMeta = json.decode(meta)

    if type == 'editRequest' then
        for _, func in ipairs(editRequestFuncs) do
            realValue = func(id, realValue, realMeta)
        end
    end

    if type == 'editDisplay' then
        for _, func in ipairs(editDisplayFuncs) do
            realValue = func(id, realValue, realMeta)
        end
    end

    if type == 'editInput' then
        for _, func in ipairs(editInputFuncs) do
            realValue = func(id, realValue, realMeta)
        end
    end

    if type == 'editOutput' then
        for _, func in ipairs(editOutputFuncs) do
            realValue = func(id, realValue, realMeta)
        end
    end

    return json.encode(realValue)
end)

${code}
`;
  }

  /**
   * editDisplay 트리거 실행 (listenEdit 콜백 호출)
   */
  async runEditDisplay(content: string, triggerId: string = 'simulator'): Promise<string> {
    if (!this.initialized || !this.engine) {
      console.warn('[LuaEngine] runEditDisplay: 엔진 초기화 안됨');
      return content;
    }

    try {
      const callListenMain = this.engine.global.get('callListenMain');
      console.log('[LuaEngine] callListenMain 함수 존재:', !!callListenMain);
      
      if (callListenMain) {
        console.log('[LuaEngine] editDisplay 호출, 입력 길이:', content.length);
        console.log('[LuaEngine] 입력에 ■ 포함:', content.includes('■'));
        
        const result = await callListenMain(
          'editDisplay',
          triggerId,
          JSON.stringify(content),
          JSON.stringify({})
        );
        
        console.log('[LuaEngine] editDisplay 결과 타입:', typeof result);
        console.log('[LuaEngine] editDisplay 결과 길이:', result?.length);
        
        if (result) {
          const parsed = JSON.parse(result);
          console.log('[LuaEngine] 파싱된 결과 길이:', parsed?.length);
          console.log('[LuaEngine] 결과에 ■ 포함:', parsed?.includes?.('■'));
          console.log('[LuaEngine] 결과에 exit8-panel 포함:', parsed?.includes?.('exit8-panel'));
          return parsed;
        }
      }
    } catch (e) {
      console.error('[LuaEngine] runEditDisplay 오류:', e);
    }

    return content;
  }

  /**
   * 특정 함수 호출
   */
  async callFunction(funcName: string, triggerId: string = 'simulator'): Promise<boolean> {
    if (!this.initialized || !this.engine) {
      console.warn('[LuaEngine] 초기화되지 않음');
      return false;
    }

    try {
      const func = this.engine.global.get(funcName);
      if (func && typeof func === 'function') {
        await func(triggerId);
        console.log('[LuaEngine] 함수 호출 성공:', funcName);
        return true;
      } else {
        console.warn('[LuaEngine] 함수 없음:', funcName);
        return false;
      }
    } catch (e) {
      console.error('[LuaEngine] 함수 호출 오류:', e);
      return false;
    }
  }

  /**
   * onButtonClick 호출
   */
  async callButtonClick(buttonId: string, triggerId: string = 'simulator'): Promise<any> {
    if (!this.initialized || !this.engine) {
      return null;
    }

    try {
      const func = this.engine.global.get('onButtonClick');
      if (func && typeof func === 'function') {
        const result = await func(triggerId, buttonId);
        console.log('[LuaEngine] onButtonClick 호출:', buttonId);
        return result;
      }
    } catch (e) {
      console.error('[LuaEngine] onButtonClick 오류:', e);
    }

    return null;
  }

  setVariables(vars: Record<string, string>): void {
    this.variables = { ...vars };
  }

  getVariables(): Record<string, string> {
    return { ...this.variables };
  }

  getVariable(key: string): string {
    return this.variables[key] || '';
  }

  setVariable(key: string, value: string): void {
    this.variables[key] = value;
    this.options.onVarChange?.(key, value);
  }

  destroy(): void {
    if (this.engine) {
      this.engine.global.close();
      this.engine = null;
    }
    this.initialized = false;
    this.code = '';
  }
}

/**
 * CBS 변수 치환
 * {{getvar::KEY}} → 변수 값
 * {{getglobalvar::KEY}} → 전역 변수 값
 */
export function replaceCBSVariables(text: string, variables: Record<string, string>): string {
  // {{getvar::KEY}} 또는 {{getvar::KEY::default}}
  let result = text.replace(/\{\{getvar::([^}:]+)(?:::([^}]*))?\}\}/gi, (match, key, defaultVal) => {
    const value = variables[key];
    if (value === undefined || value === null || value === '' || value === 'null' || value === 'nil') {
      return defaultVal || '';
    }
    return value;
  });

  // {{getglobalvar::KEY}} (로컬과 동일하게 처리)
  result = result.replace(/\{\{getglobalvar::([^}:]+)(?:::([^}]*))?\}\}/gi, (match, key, defaultVal) => {
    const value = variables[key];
    if (value === undefined || value === null || value === '' || value === 'null' || value === 'nil') {
      return defaultVal || '';
    }
    return value;
  });

  return result;
}
