/**
 * RisuAI 원본 모듈 통합
 * 
 * 이 폴더는 RisuAI 원본 파일을 최소한의 수정으로 포함합니다.
 * 모든 외부 의존성은 ../risuai-adapter 를 통해 해결됩니다.
 * 
 * 업데이트 방법:
 * 1. RisuAI 새 버전에서 해당 파일 복사
 * 2. import 경로만 ../risuai-adapter 로 수정
 * 3. 타입 오류 있으면 어댑터에 스텁 추가
 */

// cbs.ts - CBS 함수 등록
export { 
    registerCBS,
    type CBSRegisterArg,
    type matcherArg,
    type RegisterCallback,
    type CbsConditions,
} from './cbs';

// process/infunctions.ts - calcString
export { calcString } from './process/infunctions';

// parser/chatVar.svelte.ts - 변수 관리
export {
    getChatVar,
    setChatVar,
    getGlobalChatVar,
    setGlobalChatVar,
    clearChatVars,
    clearGlobalChatVars,
    setChatVarsMap,
    setGlobalChatVarsMap,
    getChatVarsMap,
    getGlobalChatVarsMap,
} from './parser/chatVar.svelte';
