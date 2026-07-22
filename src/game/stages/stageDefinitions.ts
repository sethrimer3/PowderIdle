import type { StageConfig,StageDefinition } from './stageTypes';
export function stageDefinition(config:StageConfig,id:StageDefinition['id']):StageDefinition {const definition=config.stages.find(stage=>stage.id===id);if(!definition)throw new Error(`Missing stage definition ${id}`);return definition}
