/**
 * Editor Service
 * 편집기 CRUD 작업 및 데이터 관리
 */

import { logger } from '../core/logger';

// 데이터 타입
export type FileType = 'charx' | 'risum' | 'risup';

export interface EditorData {
  type: FileType;
  card?: any;       // charx용
  cardData?: any;   // charx용 (card.data)
  module?: any;     // risum용
  preset?: any;     // risup용
  lorebook?: any[];
  regex?: any[];
  trigger?: any[];
  assets?: Map<string, any>;
  _raw?: any;
}

/**
 * 로어북 CRUD
 */
export const lorebookService = {
  getAll(data: EditorData): any[] {
    return data.lorebook || data.module?.lorebook || [];
  },

  getById(data: EditorData, id: string | number): any | undefined {
    const lorebook = this.getAll(data);
    return lorebook.find(item => item.id === id);
  },

  add(data: EditorData, entry: any): EditorData {
    const newData = structuredClone(data);
    const lorebook = newData.lorebook || newData.module?.lorebook || [];
    
    // ID 자동 생성
    if (!entry.id) {
      entry.id = Date.now();
    }
    
    lorebook.push(entry);
    
    if (newData.module) {
      newData.module.lorebook = lorebook;
    } else {
      newData.lorebook = lorebook;
    }
    
    logger.debug('editor', '로어북 항목 추가', { id: entry.id });
    return newData;
  },

  update(data: EditorData, id: string | number, updates: Partial<any>): EditorData {
    const newData = structuredClone(data);
    const lorebook = newData.lorebook || newData.module?.lorebook || [];
    
    const index = lorebook.findIndex((item: any) => item.id === id);
    if (index !== -1) {
      lorebook[index] = { ...lorebook[index], ...updates };
      
      if (newData.module) {
        newData.module.lorebook = lorebook;
      } else {
        newData.lorebook = lorebook;
      }
      
      logger.debug('editor', '로어북 항목 수정', { id });
    }
    
    return newData;
  },

  delete(data: EditorData, id: string | number): EditorData {
    const newData = structuredClone(data);
    const lorebook = (newData.lorebook || newData.module?.lorebook || [])
      .filter((item: any) => item.id !== id);
    
    if (newData.module) {
      newData.module.lorebook = lorebook;
    } else {
      newData.lorebook = lorebook;
    }
    
    logger.debug('editor', '로어북 항목 삭제', { id });
    return newData;
  },

  reorder(data: EditorData, fromIndex: number, toIndex: number): EditorData {
    const newData = structuredClone(data);
    const lorebook = [...(newData.lorebook || newData.module?.lorebook || [])];
    
    const [item] = lorebook.splice(fromIndex, 1);
    lorebook.splice(toIndex, 0, item);
    
    if (newData.module) {
      newData.module.lorebook = lorebook;
    } else {
      newData.lorebook = lorebook;
    }
    
    return newData;
  }
};

/**
 * Regex CRUD
 */
export const regexService = {
  getAll(data: EditorData): any[] {
    return data.regex || data.module?.regex || [];
  },

  add(data: EditorData, entry: any): EditorData {
    const newData = structuredClone(data);
    const regex = [...(newData.regex || newData.module?.regex || [])];
    
    regex.push(entry);
    
    if (newData.module) {
      newData.module.regex = regex;
    } else {
      newData.regex = regex;
    }
    
    logger.debug('editor', 'Regex 항목 추가');
    return newData;
  },

  update(data: EditorData, index: number, updates: Partial<any>): EditorData {
    const newData = structuredClone(data);
    const regex = [...(newData.regex || newData.module?.regex || [])];
    
    if (index >= 0 && index < regex.length) {
      regex[index] = { ...regex[index], ...updates };
      
      if (newData.module) {
        newData.module.regex = regex;
      } else {
        newData.regex = regex;
      }
    }
    
    return newData;
  },

  delete(data: EditorData, index: number): EditorData {
    const newData = structuredClone(data);
    const regex = [...(newData.regex || newData.module?.regex || [])];
    
    regex.splice(index, 1);
    
    if (newData.module) {
      newData.module.regex = regex;
    } else {
      newData.regex = regex;
    }
    
    logger.debug('editor', 'Regex 항목 삭제', { index });
    return newData;
  },

  reorder(data: EditorData, fromIndex: number, toIndex: number): EditorData {
    const newData = structuredClone(data);
    const regex = [...(newData.regex || newData.module?.regex || [])];
    
    const [item] = regex.splice(fromIndex, 1);
    regex.splice(toIndex, 0, item);
    
    if (newData.module) {
      newData.module.regex = regex;
    } else {
      newData.regex = regex;
    }
    
    return newData;
  }
};

/**
 * Trigger CRUD
 */
export const triggerService = {
  getAll(data: EditorData): any[] {
    return data.trigger || data.module?.trigger || [];
  },

  add(data: EditorData, entry: any): EditorData {
    const newData = structuredClone(data);
    const trigger = [...(newData.trigger || newData.module?.trigger || [])];
    
    trigger.push(entry);
    
    if (newData.module) {
      newData.module.trigger = trigger;
    } else {
      newData.trigger = trigger;
    }
    
    logger.debug('editor', 'Trigger 항목 추가');
    return newData;
  },

  update(data: EditorData, index: number, updates: Partial<any>): EditorData {
    const newData = structuredClone(data);
    const trigger = [...(newData.trigger || newData.module?.trigger || [])];
    
    if (index >= 0 && index < trigger.length) {
      trigger[index] = { ...trigger[index], ...updates };
      
      if (newData.module) {
        newData.module.trigger = trigger;
      } else {
        newData.trigger = trigger;
      }
    }
    
    return newData;
  },

  delete(data: EditorData, index: number): EditorData {
    const newData = structuredClone(data);
    const trigger = [...(newData.trigger || newData.module?.trigger || [])];
    
    trigger.splice(index, 1);
    
    if (newData.module) {
      newData.module.trigger = trigger;
    } else {
      newData.trigger = trigger;
    }
    
    logger.debug('editor', 'Trigger 항목 삭제', { index });
    return newData;
  },

  reorder(data: EditorData, fromIndex: number, toIndex: number): EditorData {
    const newData = structuredClone(data);
    const trigger = [...(newData.trigger || newData.module?.trigger || [])];
    
    const [item] = trigger.splice(fromIndex, 1);
    trigger.splice(toIndex, 0, item);
    
    if (newData.module) {
      newData.module.trigger = trigger;
    } else {
      newData.trigger = trigger;
    }
    
    return newData;
  }
};

/**
 * 기본 정보 업데이트
 */
export const infoService = {
  /**
   * charx 필드 업데이트
   */
  updateCharxField(data: EditorData, key: string, value: any, path?: string): EditorData {
    const newData = structuredClone(data);
    
    // path가 있으면 중첩 경로로 설정
    if (path && path.includes('.')) {
      const keys = path.split('.');
      let target = newData.cardData || newData.card?.data;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!target[keys[i]]) target[keys[i]] = {};
        target = target[keys[i]];
      }
      
      target[keys[keys.length - 1]] = value;
    } else {
      // 직접 필드 업데이트
      if (newData.cardData) {
        newData.cardData[key] = value;
      } else if (newData.card?.data) {
        newData.card.data[key] = value;
      }
    }
    
    logger.debug('editor', 'charx 필드 업데이트', { key, path });
    return newData;
  },

  /**
   * risum 필드 업데이트
   */
  updateRisumField(data: EditorData, key: string, value: any): EditorData {
    const newData = structuredClone(data);
    
    if (newData.module) {
      newData.module[key] = value;
    }
    
    logger.debug('editor', 'risum 필드 업데이트', { key });
    return newData;
  },

  /**
   * risup 필드 업데이트
   */
  updateRisupField(data: EditorData, key: string, value: any): EditorData {
    const newData = structuredClone(data);
    
    if (newData.preset) {
      newData.preset[key] = value;
    } else {
      (newData as any)[key] = value;
    }
    
    logger.debug('editor', 'risup 필드 업데이트', { key });
    return newData;
  }
};

/**
 * 에셋 서비스
 */
export const assetService = {
  getAll(data: EditorData): Map<string, any> {
    return data.assets || new Map();
  },

  add(data: EditorData, id: string, asset: any): EditorData {
    const newData = structuredClone(data);
    const assets = new Map(newData.assets || []);
    
    assets.set(id, asset);
    newData.assets = assets;
    
    logger.debug('editor', '에셋 추가', { id });
    return newData;
  },

  delete(data: EditorData, id: string): EditorData {
    const newData = structuredClone(data);
    const assets = new Map(newData.assets || []);
    
    assets.delete(id);
    newData.assets = assets;
    
    logger.debug('editor', '에셋 삭제', { id });
    return newData;
  },

  rename(data: EditorData, oldId: string, newId: string): EditorData {
    const newData = structuredClone(data);
    const assets = new Map(newData.assets || []);
    
    const asset = assets.get(oldId);
    if (asset) {
      assets.delete(oldId);
      asset.id = newId;
      asset.name = newId.split('.')[0];
      assets.set(newId, asset);
    }
    
    newData.assets = assets;
    
    logger.debug('editor', '에셋 이름 변경', { oldId, newId });
    return newData;
  }
};

/**
 * 변경 감지 유틸리티
 */
export function hasChanges(original: EditorData, current: EditorData): boolean {
  return JSON.stringify(original) !== JSON.stringify(current);
}

/**
 * 데이터 유효성 검증
 */
export function validateData(data: EditorData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (data.type === 'charx') {
    const cardData = data.cardData || data.card?.data;
    if (!cardData?.name) {
      errors.push('캐릭터 이름은 필수입니다');
    }
  }
  
  if (data.type === 'risum') {
    if (!data.module?.name) {
      errors.push('모듈 이름은 필수입니다');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
