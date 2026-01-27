/**
 * RisuAI 어댑터 통합 모듈
 * 
 * 시뮬레이터에서 RisuAI 원본 코드를 사용할 때 필요한 모든 어댑터를 export
 */

// stores
export {
    get,
    selectedCharID,
    CurrentTriggerIdStore,
    CharEmotion,
    DBState,
    selIdState,
    MobileGUI,
    loadedStore,
    LoadingStatusState,
    ReloadGUIPointer,
    botMakerMode,
    OpenRealmStore,
    MobileGUIStack,
    ShowRealmFrameStore,
    SettingsMenuIndex,
    settingsOpen,
} from './stores.adapter';

// database
export {
    type Database,
    type character,
    type Chat,
    type Message,
    type groupChat,
    type loreBook,
    type loreSettings,
    type customscript,
    type triggerscript,
    type MessageGenerationInfo,
    appVer,
    getDatabase,
    setDatabase,
    getCurrentCharacter,
    setCurrentCharacter,
    getCurrentChat,
    setCurrentChat,
    getCharacterByIndex,
    setCharacterByIndex,
    saveImage,
    importPreset,
    setDatabaseLite,
    defaultSdDataFunc,
    setSimulatorData,
} from './database.adapter';

// util
export {
    getUserName,
    getPersonaPrompt,
    getUserIcon,
    findCharacterbyId,
    checkNullish,
    selectSingleFile,
    selectMultipleFile,
    sleep,
    changeFullscreen,
    parseKeyValue,
    pickHashRand,
    replaceAsync,
    isKnownUri,
    decryptBuffer,
    selectFileByDom,
} from './util.adapter';

// platform
export {
    isTauri,
    isNodeServer,
    isCapacitor,
} from './platform.adapter';

// modules
export {
    type RisuModule,
    getModules,
    setModules,
    getModuleLorebooks,
    getModuleAssets,
    getModuleRegexScripts,
    moduleUpdate,
    readModule,
    exportModule,
} from './modules.adapter';

// modellist
export {
    type LLMModel,
    getModelInfo,
    getModelList,
} from './modellist.adapter';
