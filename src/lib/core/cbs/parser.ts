/**
 * RisuStudio CBS Parser
 * 
 * CBS 문법을 파싱하여 AST로 변환
 */

import type { CBSNode } from './types';

/**
 * CBS 파서 클래스
 * 
 * CBS 문법:
 * - {{command}} - 기본 명령어
 * - {{command::arg1::arg2}} - 인자 포함
 * - {{#block condition}}...{{/block}} - 블록 명령어
 * - {{:else}} - else 분기
 */
export class CBSParser {
  private source: string = '';
  private pos: number = 0;

  /**
   * CBS 소스 코드를 AST로 파싱
   */
  parse(source: string): CBSNode[] {
    this.source = source;
    this.pos = 0;
    
    const nodes: CBSNode[] = [];
    
    while (this.pos < this.source.length) {
      const node = this.parseNext();
      if (node) {
        nodes.push(node);
      }
    }
    
    return nodes;
  }

  /**
   * 다음 노드 파싱
   */
  private parseNext(): CBSNode | null {
    // CBS 명령어 시작 확인
    if (this.match('{{')) {
      return this.parseCommand();
    }
    
    // 일반 텍스트
    return this.parseText();
  }

  /**
   * 일반 텍스트 파싱
   */
  private parseText(): CBSNode {
    const start = this.pos;
    let text = '';
    
    while (this.pos < this.source.length) {
      // CBS 시작 확인
      if (this.peek(2) === '{{') {
        break;
      }
      text += this.source[this.pos];
      this.pos++;
    }
    
    return {
      type: 'text',
      value: text,
      position: { start, end: this.pos },
    };
  }

  /**
   * CBS 명령어 파싱
   */
  private parseCommand(): CBSNode {
    const start = this.pos;
    
    // {{ 건너뛰기
    this.pos += 2;
    
    // 명령어 내용 추출
    const content = this.extractUntilClose();
    
    // 주석 처리 ({{// comment}}) - 블록 체크보다 먼저!
    if (content.startsWith('//')) {
      return {
        type: 'command',
        value: content,
        command: '//',
        args: [content.slice(2).trim()],
        position: { start, end: this.pos },
      };
    }
    
    // 블록 명령어 확인 (#if, #when, #each 등)
    if (content.startsWith('#')) {
      return this.parseBlockCommand(content, start);
    }
    
    // 블록 종료 확인 (/if, /when 등) - // 제외
    if (content.startsWith('/') && !content.startsWith('//')) {
      return {
        type: 'command',
        value: content,
        command: content,
        args: [],
        position: { start, end: this.pos },
      };
    }
    
    // 일반 명령어 파싱
    return this.parseSimpleCommand(content, start);
  }

  /**
   * 단순 명령어 파싱 ({{command::arg1::arg2}})
   */
  private parseSimpleCommand(content: string, start: number): CBSNode {
    // 주석 처리 ({{// comment}})
    if (content.startsWith('//')) {
      return {
        type: 'command',
        value: content,
        command: '//',
        args: [content.slice(2).trim()],
        position: { start, end: this.pos },
      };
    }

    // :: 구분자로 분리 (단, 중첩된 {{ }} 내의 ::는 보존)
    const parts = this.splitArgs(content);
    
    const command = parts[0]?.trim() || '';
    const args = parts.slice(1).map(arg => arg.trim());
    
    return {
      type: 'command',
      value: content,
      command,
      args,
      position: { start, end: this.pos },
    };
  }

  /**
   * 블록 명령어 파싱 ({{#when condition}}...{{/when}})
   */
  private parseBlockCommand(content: string, start: number): CBSNode {
    // #when, #if, #each 등 파싱
    const parts = this.splitArgs(content);
    const command = parts[0]?.trim() || '';
    const args = parts.slice(1).map(arg => arg.trim());
    
    // 공백으로 구분된 경우 처리 (#when condition)
    const spaceIdx = command.indexOf(' ');
    let blockName = command;
    let inlineArg: string | null = null;
    
    if (spaceIdx > 0) {
      blockName = command.slice(0, spaceIdx);
      inlineArg = command.slice(spaceIdx + 1).trim();
    }
    
    // 종료 태그 이름 결정
    const endTag = '/' + blockName.slice(1);
    
    // 블록 내용 파싱
    const children = this.parseBlockContent(endTag);
    
    const allArgs = inlineArg ? [inlineArg, ...args] : args;
    
    return {
      type: 'block',
      value: content,
      command: blockName,
      args: allArgs,
      children,
      position: { start, end: this.pos },
    };
  }

  /**
   * 블록 내용 파싱
   */
  private parseBlockContent(endTag: string): CBSNode[] {
    const children: CBSNode[] = [];
    
    while (this.pos < this.source.length) {
      // 종료 태그 확인
      if (this.peek(2) === '{{') {
        const savedPos = this.pos;
        this.pos += 2;
        const nextContent = this.extractUntilClose();
        
        if (nextContent === endTag) {
          break;
        }
        
        // 되돌리고 정상 파싱
        this.pos = savedPos;
      }
      
      const node = this.parseNext();
      if (node) {
        children.push(node);
      }
    }
    
    return children;
  }

  /**
   * 닫는 }} 까지 내용 추출
   */
  private extractUntilClose(): string {
    let content = '';
    let depth = 1;
    
    while (this.pos < this.source.length && depth > 0) {
      if (this.peek(2) === '{{') {
        depth++;
        content += '{{';
        this.pos += 2;
      } else if (this.peek(2) === '}}') {
        depth--;
        if (depth === 0) {
          this.pos += 2;
          break;
        }
        content += '}}';
        this.pos += 2;
      } else {
        content += this.source[this.pos];
        this.pos++;
      }
    }
    
    return content;
  }

  /**
   * :: 구분자로 인자 분리 (중첩 처리)
   */
  private splitArgs(content: string): string[] {
    const args: string[] = [];
    let current = '';
    let depth = 0;
    let i = 0;
    
    while (i < content.length) {
      // 중첩된 {{ 확인
      if (content.slice(i, i + 2) === '{{') {
        depth++;
        current += '{{';
        i += 2;
        continue;
      }
      
      // 중첩된 }} 확인
      if (content.slice(i, i + 2) === '}}') {
        depth--;
        current += '}}';
        i += 2;
        continue;
      }
      
      // :: 구분자 확인 (중첩되지 않은 경우만)
      if (depth === 0 && content.slice(i, i + 2) === '::') {
        args.push(current);
        current = '';
        i += 2;
        continue;
      }
      
      current += content[i];
      i++;
    }
    
    if (current) {
      args.push(current);
    }
    
    return args;
  }

  /**
   * 현재 위치에서 패턴 매치 확인
   */
  private match(pattern: string): boolean {
    return this.source.slice(this.pos, this.pos + pattern.length) === pattern;
  }

  /**
   * 현재 위치에서 n 글자 미리보기
   */
  private peek(n: number): string {
    return this.source.slice(this.pos, this.pos + n);
  }
}

/**
 * CBS 소스 코드에서 사용된 변수 목록 추출
 */
export function extractVariables(source: string): { name: string; type: string; operation: string }[] {
  const variables: { name: string; type: string; operation: string }[] = [];
  
  // getvar::name 패턴
  const getvarRegex = /\{\{getvar::([^}:]+)/g;
  let match;
  while ((match = getvarRegex.exec(source)) !== null) {
    variables.push({ name: match[1], type: 'chatVar', operation: 'get' });
  }
  
  // setvar::name::value 패턴
  const setvarRegex = /\{\{setvar::([^}:]+)/g;
  while ((match = setvarRegex.exec(source)) !== null) {
    variables.push({ name: match[1], type: 'chatVar', operation: 'set' });
  }
  
  // addvar::name::value 패턴
  const addvarRegex = /\{\{addvar::([^}:]+)/g;
  while ((match = addvarRegex.exec(source)) !== null) {
    variables.push({ name: match[1], type: 'chatVar', operation: 'add' });
  }
  
  // getglobalvar::name 패턴
  const globalRegex = /\{\{getglobalvar::([^}:]+)/g;
  while ((match = globalRegex.exec(source)) !== null) {
    variables.push({ name: match[1], type: 'globalVar', operation: 'get' });
  }
  
  // tempvar::name 패턴
  const tempRegex = /\{\{(?:get)?tempvar::([^}:]+)/g;
  while ((match = tempRegex.exec(source)) !== null) {
    variables.push({ name: match[1], type: 'tempVar', operation: 'get' });
  }
  
  // settempvar::name::value 패턴
  const setTempRegex = /\{\{settempvar::([^}:]+)/g;
  while ((match = setTempRegex.exec(source)) !== null) {
    variables.push({ name: match[1], type: 'tempVar', operation: 'set' });
  }
  
  return variables;
}

/**
 * 편의를 위한 파서 인스턴스 생성 함수
 */
export function parseCBS(source: string): CBSNode[] {
  const parser = new CBSParser();
  return parser.parse(source);
}
