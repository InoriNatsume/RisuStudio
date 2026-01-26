/**
 * RisuStudio CBS Built-in Commands
 * 
 * RisuAI CBS 표준 명령어 구현
 */

import type { CBSCommand, CBSContext, CBSCallbackResult } from './types';

/**
 * 내장 CBS 명령어 등록 함수
 */
export function registerBuiltinCommands(): Map<string, CBSCommand> {
  const commands = new Map<string, CBSCommand>();

  /**
   * 명령어 등록 헬퍼
   */
  function register(cmd: CBSCommand): void {
    commands.set(cmd.name.toLowerCase(), cmd);
    for (const alias of cmd.aliases) {
      commands.set(alias.toLowerCase(), cmd);
    }
  }

  // ===== 기본 변수 =====

  register({
    name: 'char',
    aliases: ['bot'],
    description: '현재 캐릭터/봇의 이름 또는 닉네임 반환',
    callback: (args, ctx) => ctx.char.nickname || ctx.char.name,
  });

  register({
    name: 'user',
    aliases: [],
    description: '현재 사용자 이름 반환',
    callback: (args, ctx) => ctx.user,
  });

  register({
    name: 'blank',
    aliases: ['none'],
    description: '빈 문자열 반환',
    callback: () => '',
  });

  register({
    name: 'br',
    aliases: ['newline'],
    description: '줄바꿈 문자 반환',
    callback: () => '\n',
  });

  register({
    name: 'chatindex',
    aliases: ['chat_index'],
    description: '현재 메시지 인덱스 반환',
    callback: (args, ctx) => ctx.chatID.toString(),
  });

  // ===== 변수 처리 =====

  register({
    name: 'getvar',
    aliases: [],
    description: '채팅 변수 값 가져오기',
    callback: (args, ctx) => ctx.chatVars[args[0]] ?? '',
  });

  register({
    name: 'setvar',
    aliases: [],
    description: '채팅 변수 값 설정',
    callback: (args, ctx) => {
      if (ctx.rmVar) return '';
      if (ctx.runVar) {
        ctx.chatVars[args[0]] = args[1] ?? '';
        return '';
      }
      return null;
    },
  });

  register({
    name: 'addvar',
    aliases: [],
    description: '채팅 변수에 숫자 더하기',
    callback: (args, ctx) => {
      if (ctx.rmVar) return '';
      if (ctx.runVar) {
        const current = Number(ctx.chatVars[args[0]] || '0');
        const add = Number(args[1] || '0');
        ctx.chatVars[args[0]] = (current + add).toString();
        return '';
      }
      return null;
    },
  });

  register({
    name: 'setdefaultvar',
    aliases: [],
    description: '변수가 없을 때만 기본값 설정',
    callback: (args, ctx) => {
      if (ctx.rmVar) return '';
      if (ctx.runVar) {
        if (!ctx.chatVars[args[0]]) {
          ctx.chatVars[args[0]] = args[1] ?? '';
        }
        return '';
      }
      return null;
    },
  });

  register({
    name: 'getglobalvar',
    aliases: [],
    description: '글로벌 변수 값 가져오기',
    callback: (args, ctx) => ctx.globalVars[args[0]] ?? '',
  });

  register({
    name: 'tempvar',
    aliases: ['gettempvar'],
    description: '임시 변수 값 가져오기',
    callback: (args, ctx, vars) => ({
      text: vars[args[0]] ?? '',
      var: vars,
    }),
  });

  register({
    name: 'settempvar',
    aliases: [],
    description: '임시 변수 값 설정',
    callback: (args, ctx, vars) => {
      vars[args[0]] = args[1] ?? '';
      return { text: '', var: vars };
    },
  });

  // ===== 계산 =====

  register({
    name: 'calc',
    aliases: [],
    description: '수식 계산',
    callback: (args) => {
      try {
        return calcString(args[0]).toString();
      } catch {
        return 'NaN';
      }
    },
  });

  // ===== 비교 연산 =====

  register({
    name: 'equal',
    aliases: [],
    description: '두 값이 같은지 비교',
    callback: (args) => (args[0] === args[1]) ? '1' : '0',
  });

  register({
    name: 'notequal',
    aliases: ['not_equal'],
    description: '두 값이 다른지 비교',
    callback: (args) => (args[0] !== args[1]) ? '1' : '0',
  });

  register({
    name: 'greater',
    aliases: [],
    description: '첫 번째 값이 더 큰지 비교',
    callback: (args) => (Number(args[0]) > Number(args[1])) ? '1' : '0',
  });

  register({
    name: 'less',
    aliases: [],
    description: '첫 번째 값이 더 작은지 비교',
    callback: (args) => (Number(args[0]) < Number(args[1])) ? '1' : '0',
  });

  register({
    name: 'greaterequal',
    aliases: ['greater_equal'],
    description: '첫 번째 값이 크거나 같은지 비교',
    callback: (args) => (Number(args[0]) >= Number(args[1])) ? '1' : '0',
  });

  register({
    name: 'lessequal',
    aliases: ['less_equal'],
    description: '첫 번째 값이 작거나 같은지 비교',
    callback: (args) => (Number(args[0]) <= Number(args[1])) ? '1' : '0',
  });

  // ===== 논리 연산 =====

  register({
    name: 'and',
    aliases: [],
    description: '논리 AND 연산',
    callback: (args) => (args[0] === '1' && args[1] === '1') ? '1' : '0',
  });

  register({
    name: 'or',
    aliases: [],
    description: '논리 OR 연산',
    callback: (args) => (args[0] === '1' || args[1] === '1') ? '1' : '0',
  });

  register({
    name: 'not',
    aliases: [],
    description: '논리 NOT 연산',
    callback: (args) => args[0] === '1' ? '0' : '1',
  });

  // ===== 문자열 조작 =====

  register({
    name: 'startswith',
    aliases: [],
    description: '문자열이 특정 접두사로 시작하는지 확인',
    callback: (args) => args[0]?.startsWith(args[1] ?? '') ? '1' : '0',
  });

  register({
    name: 'endswith',
    aliases: [],
    description: '문자열이 특정 접미사로 끝나는지 확인',
    callback: (args) => args[0]?.endsWith(args[1] ?? '') ? '1' : '0',
  });

  register({
    name: 'contains',
    aliases: [],
    description: '문자열에 특정 부분 문자열이 포함되는지 확인',
    callback: (args) => args[0]?.includes(args[1] ?? '') ? '1' : '0',
  });

  register({
    name: 'replace',
    aliases: [],
    description: '모든 일치 문자열 치환',
    callback: (args) => (args[0] ?? '').replaceAll(args[1] ?? '', args[2] ?? ''),
  });

  register({
    name: 'split',
    aliases: [],
    description: '문자열을 배열로 분할',
    callback: (args) => JSON.stringify((args[0] ?? '').split(args[1] ?? '')),
  });

  register({
    name: 'join',
    aliases: [],
    description: '배열을 문자열로 결합',
    callback: (args) => {
      try {
        const arr = JSON.parse(args[0] ?? '[]');
        return arr.join(args[1] ?? '');
      } catch {
        return '';
      }
    },
  });

  register({
    name: 'trim',
    aliases: [],
    description: '앞뒤 공백 제거',
    callback: (args) => (args[0] ?? '').trim(),
  });

  register({
    name: 'length',
    aliases: [],
    description: '문자열 길이 반환',
    callback: (args) => (args[0] ?? '').length.toString(),
  });

  register({
    name: 'lower',
    aliases: [],
    description: '소문자로 변환',
    callback: (args) => (args[0] ?? '').toLowerCase(),
  });

  register({
    name: 'upper',
    aliases: [],
    description: '대문자로 변환',
    callback: (args) => (args[0] ?? '').toUpperCase(),
  });

  register({
    name: 'capitalize',
    aliases: [],
    description: '첫 글자 대문자로 변환',
    callback: (args) => {
      const str = args[0] ?? '';
      return str.charAt(0).toUpperCase() + str.slice(1);
    },
  });

  // ===== 숫자 연산 =====

  register({
    name: 'round',
    aliases: [],
    description: '반올림',
    callback: (args) => Math.round(Number(args[0] ?? 0)).toString(),
  });

  register({
    name: 'floor',
    aliases: [],
    description: '내림',
    callback: (args) => Math.floor(Number(args[0] ?? 0)).toString(),
  });

  register({
    name: 'ceil',
    aliases: [],
    description: '올림',
    callback: (args) => Math.ceil(Number(args[0] ?? 0)).toString(),
  });

  register({
    name: 'abs',
    aliases: [],
    description: '절대값',
    callback: (args) => Math.abs(Number(args[0] ?? 0)).toString(),
  });

  register({
    name: 'remaind',
    aliases: [],
    description: '나머지 연산',
    callback: (args) => (Number(args[0] ?? 0) % Number(args[1] ?? 1)).toString(),
  });

  register({
    name: 'pow',
    aliases: [],
    description: '거듭제곱',
    callback: (args) => Math.pow(Number(args[0] ?? 0), Number(args[1] ?? 1)).toString(),
  });

  register({
    name: 'min',
    aliases: [],
    description: '최소값',
    callback: (args) => {
      const nums = args.length > 1 ? args : parseArraySafe(args[0]);
      return Math.min(...nums.map(Number)).toString();
    },
  });

  register({
    name: 'max',
    aliases: [],
    description: '최대값',
    callback: (args) => {
      const nums = args.length > 1 ? args : parseArraySafe(args[0]);
      return Math.max(...nums.map(Number)).toString();
    },
  });

  register({
    name: 'sum',
    aliases: [],
    description: '합계',
    callback: (args) => {
      const nums = args.length > 1 ? args : parseArraySafe(args[0]);
      return nums.map(Number).reduce((a, b) => a + b, 0).toString();
    },
  });

  register({
    name: 'average',
    aliases: [],
    description: '평균',
    callback: (args) => {
      const nums = args.length > 1 ? args : parseArraySafe(args[0]);
      const sum = nums.map(Number).reduce((a, b) => a + b, 0);
      return (sum / nums.length).toString();
    },
  });

  register({
    name: 'fixnum',
    aliases: ['fixnumber'],
    description: '소수점 자릿수 고정',
    callback: (args) => Number(args[0] ?? 0).toFixed(Number(args[1] ?? 0)),
  });

  // ===== 배열 조작 =====

  register({
    name: 'arraylength',
    aliases: [],
    description: '배열 길이',
    callback: (args) => parseArraySafe(args[0]).length.toString(),
  });

  register({
    name: 'arrayelement',
    aliases: [],
    description: '배열 요소 가져오기',
    callback: (args) => {
      const arr = parseArraySafe(args[0]);
      const idx = Number(args[1] ?? 0);
      const element = arr.at(idx);
      return element !== undefined ? 
        (typeof element === 'object' ? JSON.stringify(element) : String(element)) : 
        'null';
    },
  });

  register({
    name: 'arraypush',
    aliases: [],
    description: '배열에 요소 추가',
    callback: (args) => {
      const arr = parseArraySafe(args[0]);
      arr.push(args[1] ?? '');
      return JSON.stringify(arr);
    },
  });

  register({
    name: 'arraypop',
    aliases: [],
    description: '배열 마지막 요소 제거',
    callback: (args) => {
      const arr = parseArraySafe(args[0]);
      arr.pop();
      return JSON.stringify(arr);
    },
  });

  register({
    name: 'arrayshift',
    aliases: [],
    description: '배열 첫 번째 요소 제거',
    callback: (args) => {
      const arr = parseArraySafe(args[0]);
      arr.shift();
      return JSON.stringify(arr);
    },
  });

  register({
    name: 'makearray',
    aliases: ['array', 'a'],
    description: '배열 생성',
    callback: (args) => JSON.stringify(args),
  });

  register({
    name: 'makedict',
    aliases: ['dict', 'd', 'makeobject', 'object', 'o'],
    description: '객체 생성 (key=value 형식)',
    callback: (args) => {
      const out: Record<string, string> = {};
      for (const arg of args) {
        const eqIdx = arg.indexOf('=');
        if (eqIdx > 0) {
          out[arg.slice(0, eqIdx)] = arg.slice(eqIdx + 1);
        }
      }
      return JSON.stringify(out);
    },
  });

  register({
    name: 'dictelement',
    aliases: ['objectelement'],
    description: '객체 요소 가져오기',
    callback: (args) => {
      try {
        const obj = JSON.parse(args[0] ?? '{}');
        const val = obj[args[1] ?? ''];
        return val !== undefined ?
          (typeof val === 'object' ? JSON.stringify(val) : String(val)) :
          'null';
      } catch {
        return 'null';
      }
    },
  });

  // ===== 랜덤 =====

  register({
    name: 'random',
    aliases: [],
    description: '랜덤 선택',
    callback: (args) => {
      if (args.length === 0) {
        return Math.random().toString();
      }
      
      let arr: string[];
      if (args.length === 1) {
        if (args[0].startsWith('[') && args[0].endsWith(']')) {
          arr = parseArraySafe(args[0]).map(String);
        } else {
          arr = args[0].replace(/\\,/g, '\u0000').split(/[:,]/g);
          arr = arr.map(s => s.replace(/\u0000/g, ','));
        }
      } else {
        arr = args;
      }
      
      return arr[Math.floor(Math.random() * arr.length)] ?? '';
    },
  });

  register({
    name: 'randint',
    aliases: [],
    description: '범위 내 랜덤 정수',
    callback: (args) => {
      const min = Number(args[0] ?? 0);
      const max = Number(args[1] ?? 100);
      if (isNaN(min) || isNaN(max)) return 'NaN';
      return (Math.floor(Math.random() * (max - min + 1)) + min).toString();
    },
  });

  register({
    name: 'roll',
    aliases: [],
    description: '주사위 굴리기 (XdY 형식)',
    callback: (args) => {
      if (args.length === 0) return '1';
      
      const notation = args[0].split('d');
      let num = 1;
      let sides = 6;
      
      if (notation.length === 2) {
        num = Number(notation[0] || 1);
        sides = Number(notation[1] || 6);
      } else if (notation.length === 1) {
        sides = Number(notation[0]);
      }
      
      if (isNaN(num) || isNaN(sides) || num < 1 || sides < 1) return 'NaN';
      
      let total = 0;
      for (let i = 0; i < num; i++) {
        total += Math.floor(Math.random() * sides) + 1;
      }
      return total.toString();
    },
  });

  // ===== 시간 =====

  register({
    name: 'time',
    aliases: [],
    description: '현재 시간 (HH:MM:SS)',
    callback: (args, ctx) => {
      if (ctx.tokenizeAccurate) return '00:00:00';
      const now = new Date();
      return `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
    },
  });

  register({
    name: 'date',
    aliases: ['datetimeformat'],
    description: '현재 날짜 (YYYY-M-D)',
    callback: (args, ctx) => {
      if (ctx.tokenizeAccurate) return '2000-1-1';
      const now = new Date();
      if (args.length === 0) {
        return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
      }
      // 포맷 문자열 지원 (간단한 구현)
      return formatDate(args[0], args[1] ? Number(args[1]) : Date.now());
    },
  });

  register({
    name: 'unixtime',
    aliases: [],
    description: '현재 Unix 타임스탬프 (초)',
    callback: (args, ctx) => {
      if (ctx.tokenizeAccurate) return '0';
      return Math.floor(Date.now() / 1000).toString();
    },
  });

  // ===== 이스케이프 문자 =====

  register({
    name: 'decbo',
    aliases: ['displayescapedcurlybracketopen'],
    description: '이스케이프된 { 반환',
    callback: () => '\uE9b8',
  });

  register({
    name: 'decbc',
    aliases: ['displayescapedcurlybracketclose'],
    description: '이스케이프된 } 반환',
    callback: () => '\uE9b9',
  });

  register({
    name: 'bo',
    aliases: ['ddecbo'],
    description: '이스케이프된 {{ 반환',
    callback: () => '\uE9b8\uE9b8',
  });

  register({
    name: 'bc',
    aliases: ['ddecbc'],
    description: '이스케이프된 }} 반환',
    callback: () => '\uE9b9\uE9b9',
  });

  // ===== 주석 =====

  register({
    name: '//',
    aliases: [],
    description: '주석 (출력 없음)',
    callback: () => '',
  });

  register({
    name: 'comment',
    aliases: [],
    description: '표시되는 주석',
    callback: (args, ctx) => {
      if (!ctx.displaying) return '';
      return `<div class="risu-comment">${args[0] ?? ''}</div>`;
    },
  });

  // ===== 반환 제어 =====

  register({
    name: 'return',
    aliases: [],
    description: '값 반환 후 실행 종료',
    callback: (args, ctx, vars) => {
      vars['__return__'] = args[0] ?? '';
      vars['__force_return__'] = '1';
      return { text: '', var: vars };
    },
  });

  // ===== 채팅 히스토리 =====

  register({
    name: 'previouscharchat',
    aliases: [],
    description: '이전 캐릭터 메시지 반환',
    callback: (args, ctx) => ctx.history.filter(m => m.role === 'char').at(-1)?.content ?? '',
  });

  register({
    name: 'previoususerchat',
    aliases: [],
    description: '이전 사용자 메시지 반환',
    callback: (args, ctx) => ctx.history.filter(m => m.role === 'user').at(-1)?.content ?? '',
  });

  register({
    name: 'lastmessage',
    aliases: [],
    description: '마지막 메시지 반환',
    callback: (args, ctx) => ctx.history.at(-1)?.content ?? '',
  });

  register({
    name: 'lastmessageid',
    aliases: [],
    description: '마지막 메시지 ID 반환',
    callback: (args, ctx) => (ctx.history.length - 1).toString(),
  });

  register({
    name: 'history',
    aliases: [],
    description: '특정 인덱스 메시지 반환',
    callback: (args, ctx) => {
      const idx = Number(args[0] ?? 0);
      return ctx.history.at(idx)?.content ?? '';
    },
  });

  register({
    name: 'previouschatlog',
    aliases: [],
    description: '이전 채팅 로그 반환',
    callback: (args, ctx) => {
      const count = Number(args[0] ?? 1);
      return ctx.history.slice(-count).map(m => m.content).join('\n');
    },
  });

  register({
    name: 'userhistory',
    aliases: [],
    description: '사용자 메시지 히스토리 반환',
    callback: (args, ctx) => {
      const userMsgs = ctx.history.filter(m => m.role === 'user');
      const idx = Number(args[0] ?? 0);
      return userMsgs.at(idx)?.content ?? '';
    },
  });

  register({
    name: 'charhistory',
    aliases: [],
    description: '캐릭터 메시지 히스토리 반환',
    callback: (args, ctx) => {
      const charMsgs = ctx.history.filter(m => m.role === 'char');
      const idx = Number(args[0] ?? 0);
      return charMsgs.at(idx)?.content ?? '';
    },
  });

  // ===== 캐릭터 정보 =====

  register({
    name: 'personality',
    aliases: [],
    description: '캐릭터 성격 반환',
    callback: (args, ctx) => ctx.char.personality ?? '',
  });

  register({
    name: 'description',
    aliases: ['desc'],
    description: '캐릭터 설명 반환',
    callback: (args, ctx) => ctx.char.description ?? '',
  });

  register({
    name: 'scenario',
    aliases: [],
    description: '시나리오 반환',
    callback: (args, ctx) => ctx.char.scenario ?? '',
  });

  register({
    name: 'exampledialogue',
    aliases: ['example_dialogue', 'mesexample'],
    description: '예시 대화 반환',
    callback: (args, ctx) => ctx.char.mes_example ?? '',
  });

  register({
    name: 'persona',
    aliases: [],
    description: '사용자 페르소나 반환',
    callback: (args, ctx) => ctx.persona ?? '',
  });

  register({
    name: 'mainprompt',
    aliases: ['systemprompt'],
    description: '시스템 프롬프트 반환',
    callback: (args, ctx) => ctx.char.system_prompt ?? '',
  });

  register({
    name: 'jb',
    aliases: ['jailbreak'],
    description: '탈옥 프롬프트 반환',
    callback: (args, ctx) => ctx.jailbreak ?? '',
  });

  register({
    name: 'globalnote',
    aliases: [],
    description: '글로벌 노트 반환',
    callback: (args, ctx) => ctx.globalNote ?? '',
  });

  register({
    name: 'firstmsgindex',
    aliases: [],
    description: '첫 메시지 인덱스 반환',
    callback: () => '0',
  });

  // ===== 상태 확인 =====

  register({
    name: 'isfirstmsg',
    aliases: [],
    description: '첫 메시지인지 확인',
    callback: (args, ctx) => ctx.chatID === 0 ? '1' : '0',
  });

  register({
    name: 'jbtoggled',
    aliases: [],
    description: '탈옥 활성화 상태',
    callback: (args, ctx) => ctx.jbToggled ? '1' : '0',
  });

  register({
    name: 'maxcontext',
    aliases: [],
    description: '최대 컨텍스트 크기',
    callback: (args, ctx) => (ctx.maxContext ?? 4096).toString(),
  });

  register({
    name: 'model',
    aliases: [],
    description: '현재 모델명 반환',
    callback: (args, ctx) => ctx.model ?? 'unknown',
  });

  register({
    name: 'role',
    aliases: [],
    description: '현재 역할 반환',
    callback: (args, ctx) => ctx.role ?? 'unknown',
  });

  // ===== 시간 확장 =====

  register({
    name: 'isotime',
    aliases: [],
    description: 'ISO 형식 시간 반환',
    callback: (args, ctx) => {
      if (ctx.tokenizeAccurate) return '00:00:00';
      return new Date().toISOString().slice(11, 19);
    },
  });

  register({
    name: 'isodate',
    aliases: [],
    description: 'ISO 형식 날짜 반환',
    callback: (args, ctx) => {
      if (ctx.tokenizeAccurate) return '2000-01-01';
      return new Date().toISOString().slice(0, 10);
    },
  });

  register({
    name: 'messagetime',
    aliases: [],
    description: '메시지 시간 반환',
    callback: (args, ctx) => {
      const idx = Number(args[0] ?? ctx.chatID);
      const msg = ctx.history[idx];
      if (!msg?.timestamp) return 'unknown';
      return new Date(msg.timestamp).toLocaleTimeString();
    },
  });

  register({
    name: 'messagedate',
    aliases: [],
    description: '메시지 날짜 반환',
    callback: (args, ctx) => {
      const idx = Number(args[0] ?? ctx.chatID);
      const msg = ctx.history[idx];
      if (!msg?.timestamp) return 'unknown';
      return new Date(msg.timestamp).toLocaleDateString();
    },
  });

  // ===== 배열 확장 =====

  register({
    name: 'arraysplice',
    aliases: [],
    description: '배열에서 요소 제거/추가',
    callback: (args) => {
      const arr = parseArraySafe(args[0]);
      const start = Number(args[1] ?? 0);
      const deleteCount = Number(args[2] ?? 1);
      const items = args.slice(3);
      arr.splice(start, deleteCount, ...items);
      return JSON.stringify(arr);
    },
  });

  register({
    name: 'spread',
    aliases: [],
    description: '배열 요소를 분리하여 반환',
    callback: (args) => {
      const arr = parseArraySafe(args[0]);
      const separator = args[1] ?? ', ';
      return arr.join(separator);
    },
  });

  register({
    name: 'filter',
    aliases: [],
    description: '배열 필터링 (표현식 평가)',
    callback: (args, ctx, vars) => {
      const arr = parseArraySafe(args[0]);
      const condition = args[1] ?? '';
      const filtered = arr.filter((item, idx) => {
        // 간단한 조건 평가
        const evaluated = condition
          .replace(/\$item/g, String(item))
          .replace(/\$index/g, String(idx));
        return evaluated === '1' || evaluated === 'true';
      });
      return JSON.stringify(filtered);
    },
  });

  register({
    name: 'all',
    aliases: [],
    description: '모든 요소가 조건 충족하는지 확인',
    callback: (args) => {
      const arr = parseArraySafe(args[0]);
      return arr.every(v => v === '1' || v === 'true' || v === true) ? '1' : '0';
    },
  });

  register({
    name: 'any',
    aliases: [],
    description: '하나라도 조건 충족하는지 확인',
    callback: (args) => {
      const arr = parseArraySafe(args[0]);
      return arr.some(v => v === '1' || v === 'true' || v === true) ? '1' : '0';
    },
  });

  register({
    name: 'range',
    aliases: [],
    description: '범위 배열 생성',
    callback: (args) => {
      const start = Number(args[0] ?? 0);
      const end = Number(args[1] ?? 10);
      const step = Number(args[2] ?? 1);
      const result: number[] = [];
      for (let i = start; i < end; i += step) {
        result.push(i);
      }
      return JSON.stringify(result);
    },
  });

  register({
    name: 'reverse',
    aliases: [],
    description: '배열/문자열 뒤집기',
    callback: (args) => {
      const input = args[0] ?? '';
      if (input.startsWith('[') && input.endsWith(']')) {
        const arr = parseArraySafe(input);
        return JSON.stringify(arr.reverse());
      }
      return input.split('').reverse().join('');
    },
  });

  // ===== 유니코드/인코딩 =====

  register({
    name: 'unicodeencode',
    aliases: ['ue'],
    description: '유니코드 인코딩',
    callback: (args) => {
      const str = args[0] ?? '';
      return str.split('').map(c => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`).join('');
    },
  });

  register({
    name: 'unicodedecode',
    aliases: ['u'],
    description: '유니코드 디코딩',
    callback: (args) => {
      const str = args[0] ?? '';
      return str.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => 
        String.fromCharCode(parseInt(hex, 16))
      );
    },
  });

  register({
    name: 'tohex',
    aliases: [],
    description: '16진수로 변환',
    callback: (args) => Number(args[0] ?? 0).toString(16),
  });

  register({
    name: 'fromhex',
    aliases: [],
    description: '16진수에서 변환',
    callback: (args) => parseInt(args[0] ?? '0', 16).toString(),
  });

  register({
    name: 'hash',
    aliases: [],
    description: '간단한 해시 생성',
    callback: (args) => {
      const str = args[0] ?? '';
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash).toString();
    },
  });

  register({
    name: 'tonumber',
    aliases: [],
    description: '숫자로 변환',
    callback: (args) => {
      const num = Number(args[0] ?? 0);
      return isNaN(num) ? '0' : num.toString();
    },
  });

  // ===== 주사위/확률 =====

  register({
    name: 'dice',
    aliases: [],
    description: '주사위 굴리기 (XdY+Z 형식)',
    callback: (args) => {
      const notation = args[0] ?? '1d6';
      const match = notation.match(/^(\d*)d(\d+)([+-]\d+)?$/i);
      if (!match) return 'NaN';
      
      const num = Number(match[1] || 1);
      const sides = Number(match[2]);
      const modifier = Number(match[3] || 0);
      
      let total = modifier;
      for (let i = 0; i < num; i++) {
        total += Math.floor(Math.random() * sides) + 1;
      }
      return total.toString();
    },
  });

  register({
    name: 'pick',
    aliases: [],
    description: '일관된 랜덤 선택 (시드 기반)',
    callback: (args, ctx) => {
      const seed = args[0] ?? '';
      const choices = args.slice(1);
      if (choices.length === 0) return '';
      
      // 간단한 해시 기반 선택
      let hash = 0;
      for (let i = 0; i < seed.length; i++) {
        hash = ((hash << 5) - hash) + seed.charCodeAt(i);
        hash = hash & hash;
      }
      const idx = Math.abs(hash) % choices.length;
      return choices[idx];
    },
  });

  register({
    name: 'rollp',
    aliases: [],
    description: '영구 주사위 (한번만 굴림)',
    callback: (args, ctx, vars) => {
      const key = `__rollp_${args[0] ?? 'default'}__`;
      if (vars[key]) return vars[key];
      
      const notation = args[1] ?? '1d6';
      const match = notation.match(/^(\d*)d(\d+)([+-]\d+)?$/i);
      if (!match) return 'NaN';
      
      const num = Number(match[1] || 1);
      const sides = Number(match[2]);
      const modifier = Number(match[3] || 0);
      
      let total = modifier;
      for (let i = 0; i < num; i++) {
        total += Math.floor(Math.random() * sides) + 1;
      }
      
      vars[key] = total.toString();
      return { text: total.toString(), var: vars };
    },
  });

  // ===== 이스케이프 문자 확장 =====

  register({
    name: 'displayescapedbracketopen',
    aliases: ['debo'],
    description: '이스케이프된 [ 반환',
    callback: () => '\uE9ba',
  });

  register({
    name: 'displayescapedbracketclose',
    aliases: ['debc'],
    description: '이스케이프된 ] 반환',
    callback: () => '\uE9bb',
  });

  register({
    name: 'displayescapedanglebracketopen',
    aliases: ['deabo'],
    description: '이스케이프된 < 반환',
    callback: () => '\uE9bc',
  });

  register({
    name: 'displayescapedanglebracketclose',
    aliases: ['deabc'],
    description: '이스케이프된 > 반환',
    callback: () => '\uE9bd',
  });

  register({
    name: 'displayescapedcolon',
    aliases: ['dec'],
    description: '이스케이프된 : 반환',
    callback: () => '\uE9be',
  });

  register({
    name: 'displayescapedsemicolon',
    aliases: ['des'],
    description: '이스케이프된 ; 반환',
    callback: () => '\uE9bf',
  });

  register({
    name: 'cbr',
    aliases: [],
    description: '조건부 줄바꿈',
    callback: (args) => args[0] === '1' ? '\n' : '',
  });

  // ===== 오류 처리 =====

  register({
    name: 'iserror',
    aliases: [],
    description: '값이 에러인지 확인',
    callback: (args) => {
      const val = args[0] ?? '';
      return val === 'NaN' || val === 'null' || val === 'undefined' || val === 'error' ? '1' : '0';
    },
  });

  // ===== XOR 암호화 =====

  register({
    name: 'xor',
    aliases: [],
    description: 'XOR 암호화',
    callback: (args) => {
      const text = args[0] ?? '';
      const key = args[1] ?? '';
      if (!key) return text;
      
      let result = '';
      for (let i = 0; i < text.length; i++) {
        result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
      }
      return btoa(result);
    },
  });

  register({
    name: 'xordecrypt',
    aliases: [],
    description: 'XOR 복호화',
    callback: (args) => {
      const encoded = args[0] ?? '';
      const key = args[1] ?? '';
      if (!key) return encoded;
      
      try {
        const text = atob(encoded);
        let result = '';
        for (let i = 0; i < text.length; i++) {
          result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
        }
        return result;
      } catch {
        return '';
      }
    },
  });

  // ===== 디스플레이 전용 =====

  register({
    name: 'tex',
    aliases: ['latex'],
    description: 'LaTeX 수식 표시',
    callback: (args, ctx) => {
      if (!ctx.displaying) return '';
      return `<span class="risu-tex">${args[0] ?? ''}</span>`;
    },
  });

  register({
    name: 'ruby',
    aliases: [],
    description: '루비 텍스트 표시',
    callback: (args, ctx) => {
      if (!ctx.displaying) return args[0] ?? '';
      return `<ruby>${args[0] ?? ''}<rp>(</rp><rt>${args[1] ?? ''}</rt><rp>)</rp></ruby>`;
    },
  });

  register({
    name: 'codeblock',
    aliases: [],
    description: '코드 블록 표시',
    callback: (args, ctx) => {
      if (!ctx.displaying) return args[0] ?? '';
      const lang = args[1] ?? '';
      return `<pre><code class="language-${lang}">${args[0] ?? ''}</code></pre>`;
    },
  });

  register({
    name: 'button',
    aliases: [],
    description: '버튼 표시 (디스플레이 전용)',
    callback: (args, ctx) => {
      if (!ctx.displaying) return '';
      const label = args[0] ?? 'Button';
      const action = args[1] ?? '';
      return `<button class="risu-button" data-action="${action}">${label}</button>`;
    },
  });

  // ===== 에셋 =====

  register({
    name: 'asset',
    aliases: [],
    description: '에셋 표시',
    callback: () => '', // 시뮬레이터에서는 빈 문자열
  });

  register({
    name: 'emotion',
    aliases: [],
    description: '감정 에셋 표시',
    callback: () => '',
  });

  register({
    name: 'audio',
    aliases: [],
    description: '오디오 에셋 재생',
    callback: () => '',
  });

  register({
    name: 'bg',
    aliases: ['background'],
    description: '배경 설정',
    callback: () => '',
  });

  register({
    name: 'bgm',
    aliases: [],
    description: '배경음악 재생',
    callback: () => '',
  });

  register({
    name: 'video',
    aliases: [],
    description: '비디오 재생',
    callback: () => '',
  });

  register({
    name: 'image',
    aliases: ['img'],
    description: '이미지 표시',
    callback: () => '',
  });

  register({
    name: 'inlay',
    aliases: [],
    description: '인레이 표시',
    callback: () => '',
  });

  // ===== 조건부 블록 (doc_only) =====

  register({
    name: '#if',
    aliases: [],
    description: '조건부 블록',
    callback: 'doc_only',
  });

  register({
    name: '#if_pure',
    aliases: [],
    description: '순수 조건부 블록',
    callback: 'doc_only',
  });

  register({
    name: '#when',
    aliases: [],
    description: 'when 조건부 블록',
    callback: 'doc_only',
  });

  register({
    name: ':else',
    aliases: [],
    description: 'else 블록',
    callback: 'doc_only',
  });

  register({
    name: '#pure',
    aliases: [],
    description: '순수 블록 (CBS 평가 안함)',
    callback: 'doc_only',
  });

  register({
    name: '#puredisplay',
    aliases: [],
    description: '디스플레이 순수 블록',
    callback: 'doc_only',
  });

  register({
    name: '#each',
    aliases: [],
    description: '반복 블록',
    callback: 'doc_only',
  });

  // ===== 기타 =====

  register({
    name: 'risu',
    aliases: [],
    description: 'RisuAI 정보 반환',
    callback: () => 'RisuStudio',
  });

  register({
    name: '?',
    aliases: [],
    description: '조건 연산자',
    callback: (args) => args[0] === '1' ? (args[1] ?? '') : (args[2] ?? ''),
  });

  register({
    name: '__',
    aliases: [],
    description: '빈 줄 (디스플레이용)',
    callback: () => '\n\n',
  });

  register({
    name: 'trigger_id',
    aliases: ['triggerid'],
    description: '트리거 ID 반환',
    callback: (args, ctx) => ctx.triggerId ?? 'null',
  });

  register({
    name: 'prefillsupported',
    aliases: [],
    description: '프리필 지원 여부',
    callback: () => '0', // 시뮬레이터에서는 지원 안함
  });

  register({
    name: 'screenwidth',
    aliases: [],
    description: '화면 너비',
    callback: () => typeof window !== 'undefined' ? window.innerWidth.toString() : '1920',
  });

  register({
    name: 'screenheight',
    aliases: [],
    description: '화면 높이',
    callback: () => typeof window !== 'undefined' ? window.innerHeight.toString() : '1080',
  });

  register({
    name: 'emotionlist',
    aliases: [],
    description: '감정 목록 반환',
    callback: (args, ctx) => JSON.stringify(ctx.char.emotionList ?? []),
  });

  register({
    name: 'assetlist',
    aliases: [],
    description: '에셋 목록 반환',
    callback: (args, ctx) => JSON.stringify(ctx.char.assets ?? []),
  });

  register({
    name: 'moduleenabled',
    aliases: [],
    description: '모듈 활성화 여부',
    callback: (args, ctx) => {
      const moduleName = args[0] ?? '';
      return ctx.enabledModules?.includes(moduleName) ? '1' : '0';
    },
  });

  register({
    name: 'bkspc',
    aliases: ['backspace'],
    description: '백스페이스 (마지막 문자 제거)',
    callback: (args) => {
      const count = Number(args[0] ?? 1);
      return '\b'.repeat(count);
    },
  });

  register({
    name: 'erase',
    aliases: [],
    description: '텍스트 지우기',
    callback: () => '',
  });

  register({
    name: 'hiddenkey',
    aliases: [],
    description: '숨김 키',
    callback: () => '',
  });

  return commands;
}

// ===== 헬퍼 함수 =====

/**
 * 안전한 배열 파싱
 */
function parseArraySafe(str: string | undefined): unknown[] {
  if (!str) return [];
  try {
    const parsed = JSON.parse(str);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * 기본 수식 계산 (간단한 구현)
 */
function calcString(expr: string): number {
  // 기본적인 수식만 지원 (+, -, *, /, 괄호)
  // 보안을 위해 허용된 문자만 처리
  const sanitized = expr.replace(/[^0-9+\-*/().%\s]/g, '');
  
  try {
    // eslint-disable-next-line no-new-func
    return new Function(`return (${sanitized})`)();
  } catch {
    return NaN;
  }
}

/**
 * 날짜 포맷팅 (간단한 구현)
 */
function formatDate(format: string, timestamp: number): string {
  const date = new Date(timestamp);
  
  return format
    .replace(/YYYY/g, date.getFullYear().toString())
    .replace(/MM/g, (date.getMonth() + 1).toString().padStart(2, '0'))
    .replace(/DD/g, date.getDate().toString().padStart(2, '0'))
    .replace(/HH/g, date.getHours().toString().padStart(2, '0'))
    .replace(/mm/g, date.getMinutes().toString().padStart(2, '0'))
    .replace(/ss/g, date.getSeconds().toString().padStart(2, '0'))
    .replace(/M/g, (date.getMonth() + 1).toString())
    .replace(/D/g, date.getDate().toString())
    .replace(/H/g, date.getHours().toString())
    .replace(/m/g, date.getMinutes().toString())
    .replace(/s/g, date.getSeconds().toString());
}
