/**
 * RisuAI CBS 파서용 타입 정의
 * RisuAI의 storage/database.svelte.ts에서 필요한 타입만 추출
 */

export interface loreBook {
  key: string;
  secondkey: string;
  insertorder: number;
  comment: string;
  content: string;
  mode: 'normal' | 'raw' | 'lorebook';
  alwaysActive: boolean;
  selective: boolean;
  extentions?: Record<string, unknown>;
  order?: number;
  activeProbability?: number;
  loreCache?: unknown;
  useRegex?: boolean;
  scanDepth?: number | null;
  caseSensitive?: boolean;
  matchWholeWords?: boolean;
  priority?: number;
  displayName?: string;
  groupOverride?: string | null;
  groupWeight?: number;
}

export interface character {
  type: 'character' | 'group' | 'simple';
  name: string;
  nickname?: string;
  firstMessage: string;
  alternateGreetings?: string[];
  desc: string;
  notes: string;
  chats: Chat[];
  chatPage: number;
  image?: string;
  emotionImages: [string, string][];
  bias: [string, number][];
  globalLore: loreBook[];
  chaId: string;
  sdData: unknown;
  customscript: unknown[];
  triggerscript: unknown[];
  additionalAssets: [string, string, string?][];
  virtualscript?: string;
  backgroundHTML?: string;
  lowLevelAccess?: boolean;
  extentions?: Record<string, unknown>;
}

export interface Chat {
  message: Message[];
  note: string;
  name: string;
  localLore: loreBook[];
  sdpieces?: unknown;
  isRecording?: boolean;
  fmIndex?: number;
}

export interface Message {
  role: 'user' | 'char' | 'system';
  data: string;
  saying?: string;
  chatId?: string;
  time?: number;
}

export interface groupChat {
  type: 'group';
  name: string;
  chats: Chat[];
  chatPage: number;
  characters: string[];
}

export interface Database {
  characters: character[];
  formatversion?: number;
  aiModel?: string;
  subModel?: string;
  persona?: {
    name: string;
    icon: string;
    personaPrompt: string;
  };
  username?: string;
  userIcon?: string;
  personaPrompt?: string;
  customBackground?: string;
  globalNote?: string;
  autoTranslate?: boolean;
  fullScreen?: boolean;
  playMessage?: boolean;
  iconsize?: number;
  theme?: string;
  subtheme?: string;
  timeZone?: string;
  jailbreakToggle?: boolean;
  jailbreak?: string;
  globalLore?: loreBook[];
  maxContext?: number;
  temperature?: number;
  maxResponse?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  sdProvider?: string;
  runpodKey?: string;
  sdSteps?: number;
  sdCFG?: number;
  textgenWebUIStreamURL?: string;
  textgenWebUIBlockingURL?: string;
  forceReplaceUrl?: string;
  forceReplaceUrl2?: string;
  promptPreprocess?: boolean;
  bias?: [string, number][];
  swipe?: boolean;
  hideMobileRecordButton?: boolean;
  sendWithEnter?: boolean;
  assetWidth?: number;
  animationSpeed?: number;
  botPresets?: unknown[];
  botPresetsId?: number;
  sdConfig?: unknown;
  hordeConfig?: unknown;
  NAISettings?: unknown;
  globalscript?: unknown[];
  roundIcons?: boolean;
  characterOrder?: string[];
  backgroundFileType?: string;
  textTheme?: string;
  characterHubOptRecent?: boolean;
  useStreaming?: boolean;
  ttsAutoRecordingReady?: boolean;
  ttsModel?: string;
  ttsVoice?: string;
  presetRegex?: unknown[];
  hideAllImages?: boolean;
  autoScrollButton?: boolean;
  additionalStopList?: string[];
  assetMaxDifference?: number;
}

export interface RisuModule {
  name: string;
  description: string;
  lorebook?: loreBook[];
  regex?: unknown[];
  assets?: [string, string][];
  trigger?: unknown[];
  cjs?: string;
}

export interface LLMModel {
  id: string;
  name: string;
  shortName: string;
  internalID: string;
  format: number;
  provider: number;
  tokenizer: number;
}

export interface CbsConditions {
  [key: string]: boolean | string | number;
}

export interface matcherArg {
  chatID: number;
  db: Database;
  chara: character | string | null;
  rmVar: boolean;
  var?: { [key: string]: string } | null;
  tokenizeAccurate?: boolean;
  consistantChar?: boolean;
  displaying?: boolean;
  role?: string;
  runVar?: boolean;
  funcName?: string;
  text?: string;
  recursiveCount?: number;
  lowLevelAccess?: boolean;
  cbsConditions: CbsConditions;
  callStack?: number;
  triggerId?: string;
  getNested?: () => string[];
  setNestedRoot?: (val: string) => void;
}

export type RegisterCallback = (
  str: string,
  matcherArg: matcherArg,
  args: string[],
  vars: { [key: string]: string } | null
) => { text: string; var: { [key: string]: string } } | string | null;

export interface CBSRegisterArg {
  registerFunction: (arg: {
    name: string;
    callback: RegisterCallback | 'doc_only';
    alias: string[];
    description: string;
    deprecated?: {
      message: string;
      since?: string;
      replacement?: string;
    };
    internalOnly?: boolean;
  }) => void | Promise<void>;
  getDatabase: () => Database;
  getUserName: () => string;
  getPersonaPrompt: () => string;
  risuChatParser: (text: string, arg: matcherArg) => string;
  makeArray: (arr: unknown[]) => string;
  safeStructuredClone: <T>(obj: T) => T;
  parseArray: (str: string) => unknown[];
  parseDict: (str: string) => { [key: string]: unknown };
  getChatVar: (key: string) => string;
  setChatVar: (key: string, value: string) => void;
  getGlobalChatVar: (key: string) => string;
  calcString: (str: string) => number;
  dateTimeFormat: (format: string, timestamp?: number) => string;
  getModules: () => RisuModule[];
  getModuleLorebooks: () => loreBook[];
  pickHashRand: (seed: number, hash: string) => number;
  getSelectedCharID: () => number;
  getModelInfo: (model: string) => LLMModel;
  callInternalFunction: (args: string[]) => string;
  isTauri: boolean;
  isNodeServer: boolean;
  isMobile: boolean;
  appVer: string;
}
