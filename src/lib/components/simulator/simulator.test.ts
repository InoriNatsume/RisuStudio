/**
 * RisuStudio Simulator Integration Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CBSRuntime, evaluateCBS } from '$lib/core/cbs';
import { RegexEngine, RegexDebugger } from '$lib/core/regex';
import { TriggerEngine, TriggerDebugger } from '$lib/core/trigger';
import type { RegexScript } from '$lib/core/regex/types';
import type { TriggerScript } from '$lib/core/trigger/types';

describe('Simulator Integration', () => {
  describe('프롬프트 시뮬레이션 워크플로우', () => {
    it('CBS → Regex → Trigger 순서로 처리', () => {
      // 1. CBS 처리 (evaluateCBS 사용)
      const cbsInput = 'Hello {{char}}, I am {{user}}';
      const cbsResult = evaluateCBS(cbsInput, {
        char: { name: 'Alice' },
        user: 'Bob',
      });
      
      expect(cbsResult.output).toBe('Hello Alice, I am Bob');
      
      // 2. Regex 처리
      const regexEngine = new RegexEngine();
      const regexScripts: RegexScript[] = [
        {
          comment: 'Replace greeting',
          type: 'editinput',
          in: 'Hello',
          out: 'Hi',
        },
      ];
      regexEngine.setScripts(regexScripts);
      const regexResult = regexEngine.process(cbsResult.output, 'editinput');
      
      expect(regexResult.output).toBe('Hi Alice, I am Bob');
      
      // 3. Trigger 처리
      const triggerEngine = new TriggerEngine();
      const triggerScripts: TriggerScript[] = [
        {
          type: 'start',
          conditions: [],
          effect: [
            { type: 'setvar', operator: '=', var: 'greeted', value: 'true' },
          ],
        },
      ];
      triggerEngine.setScripts(triggerScripts);
      const triggerContext = triggerEngine.createContext();
      const triggerResult = triggerEngine.run('start', triggerContext);
      
      expect(triggerResult.success).toBe(true);
      expect(triggerResult.context.chatVars['greeted']).toBe('true');
    });
    
    it('조건부 프롬프트 포함', () => {
      // 변수가 설정된 경우 (간단한 테스트)
      const simple = evaluateCBS('Value is {{getvar::test}}', {
        chatVars: { test: 'hello' },
      });
      
      expect(simple.output).toBe('Value is hello');
    });
    
    it('다중 Regex 스크립트 순차 적용', () => {
      const regexEngine = new RegexEngine();
      const scripts: RegexScript[] = [
        { comment: 'Step 1', type: 'editinput', in: 'a', out: 'b' },
        { comment: 'Step 2', type: 'editinput', in: 'b', out: 'c' },
      ];
      
      // 순차 적용 테스트
      regexEngine.setScripts([scripts[0]]);
      const step1 = regexEngine.process('aaa', 'editinput');
      expect(step1.output).toBe('bbb');
      
      regexEngine.setScripts([scripts[1]]);
      const step2 = regexEngine.process('bbb', 'editinput');
      expect(step2.output).toBe('ccc');
    });
    
    it('Trigger 조건 체크', () => {
      const triggerEngine = new TriggerEngine();
      const script: TriggerScript = {
        type: 'start',
        conditions: [
          { type: 'var', var: 'level', value: '10', operator: '>=' },
        ],
        effect: [
          { type: 'setvar', operator: '=', var: 'boss_fight', value: 'true' },
        ],
      };
      
      triggerEngine.setScripts([script]);
      
      // 레벨이 낮은 경우
      const ctx1 = triggerEngine.createContext();
      ctx1.chatVars['level'] = '5';
      const result1 = triggerEngine.run('start', ctx1);
      expect(result1.context.chatVars['boss_fight']).toBeUndefined();
      
      // 레벨이 충분한 경우
      const ctx2 = triggerEngine.createContext();
      ctx2.chatVars['level'] = '15';
      const result2 = triggerEngine.run('start', ctx2);
      expect(result2.context.chatVars['boss_fight']).toBe('true');
    });
  });
  
  describe('디버거 통합', () => {
    it('Regex 엔진 단계별 처리', () => {
      const engine = new RegexEngine();
      
      // 단계별 처리
      engine.setScripts([
        { comment: 'Replace X', type: 'editinput', in: 'X', out: 'Y' },
      ]);
      const step1 = engine.process('XXX', 'editinput');
      expect(step1.output).toBe('YYY');
      
      engine.setScripts([
        { comment: 'Replace Y', type: 'editinput', in: 'Y', out: 'Z' },
      ]);
      const step2 = engine.process('YYY', 'editinput');
      expect(step2.output).toBe('ZZZ');
    });
    
    it('Trigger 디버거 단계별 실행', () => {
      const debugger_ = new TriggerDebugger();
      debugger_.setScript({
        type: 'start',
        conditions: [],
        effect: [
          { type: 'setvar', operator: '=', var: 'a', value: '1' },
          { type: 'setvar', operator: '+=', var: 'a', value: '2' },
          { type: 'setvar', operator: '+=', var: 'a', value: '3' },
        ],
      });
      
      debugger_.init();
      
      // 1단계: a = 1
      debugger_.stepForward();
      expect(debugger_.getCurrentState().context.chatVars['a']).toBe('1');
      
      // 2단계: a = 1 + 2 = 3
      debugger_.stepForward();
      expect(debugger_.getCurrentState().context.chatVars['a']).toBe('3');
      
      // 3단계: a = 3 + 3 = 6
      debugger_.stepForward();
      expect(debugger_.getCurrentState().context.chatVars['a']).toBe('6');
    });
  });
  
  describe('에러 처리', () => {
    it('잘못된 Regex 패턴', () => {
      const engine = new RegexEngine();
      engine.setScripts([
        { comment: 'Invalid', type: 'editinput', in: '/[invalid', out: '' },
      ]);
      
      // 에러가 나도 원본 반환
      const result = engine.process('test', 'editinput');
      expect(result.output).toBe('test');
      expect(result.errors.length).toBeGreaterThan(0);
    });
    
    it('빈 스크립트 처리', () => {
      const cbsRuntime = new CBSRuntime();
      const regexEngine = new RegexEngine();
      const triggerEngine = new TriggerEngine();
      
      regexEngine.setScripts([]);
      triggerEngine.setScripts([]);
      
      const input = 'Hello World';
      
      // 빈 스크립트는 원본 그대로
      const regexResult = regexEngine.process(input, 'editinput');
      expect(regexResult.output).toBe(input);
      
      const ctx = triggerEngine.createContext();
      const result = triggerEngine.run('start', ctx);
      expect(result.success).toBe(true);
      expect(result.effectsExecuted).toBe(0);
    });
  });
});
