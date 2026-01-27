/**
 * CBS (Chat Block Script) 모듈 - RisuAI 호환
 * 
 * 시뮬레이터에서 RisuAI의 CBS 구문을 완벽하게 지원합니다.
 */

// parser.ts에서 파서 함수 내보내기
export {
    risuChatParser,
    parseMessage,
    evaluateCBS,
    setSimulatorContext,
    getChatVar,
    setChatVar,
    getGlobalChatVar,
    setGlobalChatVar,
    calcString,
    dateTimeFormat,
    parseArray,
    parseDict,
    makeArray
} from './parser';

// types.ts에서 타입 내보내기
export type {
    Database,
    character,
    groupChat,
    loreBook,
    Message,
    Chat,
    matcherArg,
    CbsConditions
} from './types';
