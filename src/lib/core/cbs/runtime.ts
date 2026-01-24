/**
 * RisuStudio CBS Runtime
 * 
 * CBS (Character Building Script) 실행 엔진
 */

import type { 
  CBSContext, 
  CBSResult, 
  CBSTraceStep, 
  CBSError,
  CBSNode,
  CBSCommand,
} from './types';
import { createDefaultContext } from './types';
import { CBSParser } from './parser';
import { registerBuiltinCommands } from './commands';

/**
 * CBS 런타임 클래스
 */
export class CBSRuntime {
  private commands: Map<string, CBSCommand>;
  private parser: CBSParser;
  private trace: CBSTraceStep[];
  private errors: CBSError[];
  private tempVars: Record<string, string>;

  constructor() {
    this.commands = registerBuiltinCommands();
    this.parser = new CBSParser();
    this.trace = [];
    this.errors = [];
    this.tempVars = {};
  }

  /**
   * CBS 코드 실행
   */
  evaluate(code: string, context?: Partial<CBSContext>): CBSResult {
    // 컨텍스트 초기화
    const ctx: CBSContext = {
      ...createDefaultContext(),
      ...context,
    };

    // 추적 정보 초기화
    this.trace = [];
    this.errors = [];
    this.tempVars = { ...ctx.tempVars };

    // 파싱
    const nodes = this.parser.parse(code);

    // 실행
    const output = this.evaluateNodes(nodes, ctx);

    return {
      output,
      trace: this.trace,
      modifiedVars: {
        chatVars: { ...ctx.chatVars },
        globalVars: { ...ctx.globalVars },
        tempVars: { ...this.tempVars },
      },
      errors: this.errors,
    };
  }

  /**
   * 노드 배열 실행
   */
  private evaluateNodes(nodes: CBSNode[], ctx: CBSContext): string {
    let result = '';

    for (const node of nodes) {
      // 강제 반환 확인
      if (this.tempVars['__force_return__'] === '1') {
        return this.tempVars['__return__'] ?? result;
      }

      result += this.evaluateNode(node, ctx);
    }

    return result;
  }

  /**
   * 단일 노드 실행
   */
  private evaluateNode(node: CBSNode, ctx: CBSContext): string {
    switch (node.type) {
      case 'text':
        return node.value;

      case 'command':
        return this.evaluateCommand(node, ctx);

      case 'block':
        return this.evaluateBlock(node, ctx);

      default:
        return '';
    }
  }

  /**
   * 명령어 실행
   */
  private evaluateCommand(node: CBSNode, ctx: CBSContext): string {
    const startTime = performance.now();
    const commandName = (node.command ?? '').toLowerCase();
    
    // 종료 태그는 무시
    if (commandName.startsWith('/')) {
      return '';
    }

    // :else 태그는 블록 처리에서 다룸
    if (commandName === ':else') {
      return '';
    }

    // 명령어 찾기
    const command = this.commands.get(commandName);

    if (!command) {
      // 알 수 없는 명령어: 원본 그대로 반환
      this.errors.push({
        message: `알 수 없는 명령어: ${commandName}`,
        command: commandName,
        position: node.position,
        severity: 'warning',
      });
      return `{{${node.value}}}`;
    }

    // doc_only 명령어는 특별 처리 필요 (#if, #when 등)
    if (command.callback === 'doc_only') {
      return this.handleDocOnlyCommand(node, ctx);
    }

    try {
      // 인자 내 중첩 CBS 평가
      const evaluatedArgs = (node.args ?? []).map(arg => 
        this.evaluateNestedCBS(arg, ctx)
      );

      // 콜백 실행
      const result = command.callback(evaluatedArgs, ctx, this.tempVars);

      let output: string;
      if (result === null) {
        output = `{{${node.value}}}`;
      } else if (typeof result === 'object') {
        output = result.text;
        Object.assign(this.tempVars, result.var);
      } else {
        output = result;
      }

      // 추적 정보 기록
      const traceStep: CBSTraceStep = {
        original: `{{${node.value}}}`,
        result: output,
        command: commandName,
        args: evaluatedArgs,
        position: node.position,
        duration: performance.now() - startTime,
      };
      this.trace.push(traceStep);

      return output;
    } catch (error) {
      this.errors.push({
        message: `명령어 실행 오류: ${error instanceof Error ? error.message : String(error)}`,
        command: commandName,
        position: node.position,
        severity: 'error',
      });
      return '';
    }
  }

  /**
   * 블록 실행 (#when, #each 등)
   */
  private evaluateBlock(node: CBSNode, ctx: CBSContext): string {
    const blockName = (node.command ?? '').toLowerCase();

    switch (blockName) {
      case '#when':
      case '#if':
        return this.evaluateWhenBlock(node, ctx);

      case '#each':
        return this.evaluateEachBlock(node, ctx);

      case '#puredisplay':
      case '#pure':
        return this.evaluatePureBlock(node, ctx);

      default:
        // 알 수 없는 블록
        this.errors.push({
          message: `알 수 없는 블록: ${blockName}`,
          command: blockName,
          position: node.position,
          severity: 'warning',
        });
        return '';
    }
  }

  /**
   * #when / #if 블록 평가
   */
  private evaluateWhenBlock(node: CBSNode, ctx: CBSContext): string {
    const args = node.args ?? [];
    
    // 조건 평가
    const condition = this.evaluateCondition(args, ctx);
    
    // 자식 노드에서 :else 분리
    const children = node.children ?? [];
    let thenNodes: CBSNode[] = [];
    let elseNodes: CBSNode[] = [];
    let foundElse = false;

    for (const child of children) {
      if (child.type === 'command' && child.command === ':else') {
        foundElse = true;
        continue;
      }
      
      if (foundElse) {
        elseNodes.push(child);
      } else {
        thenNodes.push(child);
      }
    }

    // 조건에 따라 실행
    if (condition) {
      return this.evaluateNodes(thenNodes, ctx);
    } else {
      return this.evaluateNodes(elseNodes, ctx);
    }
  }

  /**
   * 조건 평가
   */
  private evaluateCondition(args: string[], ctx: CBSContext): boolean {
    if (args.length === 0) return false;

    // 연산자 처리
    let i = 0;
    let keepWhitespace = false;
    let negate = false;

    // 전처리 연산자
    while (i < args.length) {
      const arg = args[i]?.toLowerCase();
      if (arg === 'keep') {
        keepWhitespace = true;
        i++;
      } else if (arg === 'legacy') {
        i++;
      } else if (arg === 'not') {
        negate = !negate;
        i++;
      } else {
        break;
      }
    }

    // 나머지 인자로 조건 평가
    const remainingArgs = args.slice(i);
    
    if (remainingArgs.length === 0) {
      return negate ? true : false;
    }

    let result: boolean;

    if (remainingArgs.length === 1) {
      // 단일 조건
      const evaluated = this.evaluateNestedCBS(remainingArgs[0], ctx);
      result = evaluated === '1' || evaluated.toLowerCase() === 'true';
    } else if (remainingArgs.length >= 3) {
      // 이항 연산자
      const left = this.evaluateNestedCBS(remainingArgs[0], ctx);
      const op = remainingArgs[1]?.toLowerCase();
      const right = this.evaluateNestedCBS(remainingArgs[2], ctx);

      switch (op) {
        case 'and':
          result = (left === '1') && (right === '1');
          break;
        case 'or':
          result = (left === '1') || (right === '1');
          break;
        case 'is':
        case '==':
          result = left === right;
          break;
        case 'isnot':
        case '!=':
          result = left !== right;
          break;
        case '>':
        case 'gt':
          result = Number(left) > Number(right);
          break;
        case '<':
        case 'lt':
          result = Number(left) < Number(right);
          break;
        case '>=':
        case 'gte':
          result = Number(left) >= Number(right);
          break;
        case '<=':
        case 'lte':
          result = Number(left) <= Number(right);
          break;
        case 'var':
          result = !!ctx.chatVars[left];
          break;
        default:
          result = false;
      }
    } else {
      result = false;
    }

    return negate ? !result : result;
  }

  /**
   * #each 블록 평가
   */
  private evaluateEachBlock(node: CBSNode, ctx: CBSContext): string {
    const args = node.args ?? [];
    if (args.length === 0) return '';

    // {{#each ARRAY as VARNAME}} 형식 파싱
    const fullArg = args.join('::');
    const asMatch = fullArg.match(/(.+?)\s+as\s+(\w+)/i);
    
    if (!asMatch) {
      this.errors.push({
        message: '#each 형식 오류: "ARRAY as VARNAME" 형식이어야 합니다',
        command: '#each',
        position: node.position,
        severity: 'error',
      });
      return '';
    }

    const arrayExpr = asMatch[1].trim();
    const varName = asMatch[2];

    // 배열 평가
    const arrayStr = this.evaluateNestedCBS(arrayExpr, ctx);
    let array: unknown[];
    
    try {
      array = JSON.parse(arrayStr);
      if (!Array.isArray(array)) {
        array = [];
      }
    } catch {
      array = [];
    }

    // 반복 실행
    let result = '';
    for (const item of array) {
      // 슬롯 변수 설정
      this.tempVars[varName] = typeof item === 'string' ? item : JSON.stringify(item);
      
      // 자식 노드 실행
      result += this.evaluateNodes(node.children ?? [], ctx);
    }

    return result;
  }

  /**
   * #puredisplay 블록 평가 (CBS 처리 없이 원본 반환)
   */
  private evaluatePureBlock(node: CBSNode, ctx: CBSContext): string {
    // 자식 노드들의 원본 값을 그대로 반환
    let result = '';
    for (const child of node.children ?? []) {
      if (child.type === 'text') {
        result += child.value;
      } else if (child.type === 'command') {
        result += `{{${child.value}}}`;
      } else if (child.type === 'block') {
        result += `{{${child.value}}}`;
        // 블록 내용은 재귀적으로 원본 추출 필요
      }
    }
    return result;
  }

  /**
   * doc_only 명령어 처리
   */
  private handleDocOnlyCommand(node: CBSNode, ctx: CBSContext): string {
    const commandName = (node.command ?? '').toLowerCase();

    // slot 명령어
    if (commandName === 'slot') {
      const slotName = node.args?.[0] ?? '';
      if (slotName) {
        return this.tempVars[slotName] ?? '';
      }
      return '';
    }

    // 기타 doc_only 명령어는 원본 반환
    return `{{${node.value}}}`;
  }

  /**
   * 중첩된 CBS 평가
   */
  private evaluateNestedCBS(text: string, ctx: CBSContext): string {
    // 중첩된 {{...}}가 있으면 재귀 평가
    if (text.includes('{{') && text.includes('}}')) {
      const nodes = this.parser.parse(text);
      return this.evaluateNodes(nodes, ctx);
    }
    return text;
  }

  /**
   * 사용자 정의 명령어 등록
   */
  registerCommand(command: CBSCommand): void {
    this.commands.set(command.name.toLowerCase(), command);
    for (const alias of command.aliases) {
      this.commands.set(alias.toLowerCase(), command);
    }
  }

  /**
   * 등록된 명령어 목록 조회
   */
  getCommands(): CBSCommand[] {
    const seen = new Set<string>();
    const commands: CBSCommand[] = [];

    for (const [name, cmd] of this.commands) {
      if (!seen.has(cmd.name)) {
        seen.add(cmd.name);
        commands.push(cmd);
      }
    }

    return commands;
  }
}

/**
 * 기본 CBS 런타임 인스턴스
 */
let defaultRuntime: CBSRuntime | null = null;

/**
 * 기본 런타임 가져오기
 */
export function getRuntime(): CBSRuntime {
  if (!defaultRuntime) {
    defaultRuntime = new CBSRuntime();
  }
  return defaultRuntime;
}

/**
 * CBS 코드 실행 (편의 함수)
 */
export function evaluateCBS(code: string, context?: Partial<CBSContext>): CBSResult {
  return getRuntime().evaluate(code, context);
}
