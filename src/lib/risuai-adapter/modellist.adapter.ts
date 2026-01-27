/**
 * RisuAI model/modellist.ts 어댑터
 * 
 * 시뮬레이터용 스텁
 */

export interface LLMModel {
    id: string;
    name: string;
    shortName: string;
    internalID: string;
    format: number;
    provider: number;
    tokenizer: number;
}

const defaultModel: LLMModel = {
    id: 'simulator',
    name: 'Simulator Model',
    shortName: 'Sim',
    internalID: 'simulator',
    format: 0,
    provider: 0,
    tokenizer: 0,
};

export function getModelInfo(modelId?: string): LLMModel {
    return defaultModel;
}

export function getModelList(): LLMModel[] {
    return [defaultModel];
}
