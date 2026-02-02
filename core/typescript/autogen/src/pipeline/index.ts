/**
 * @module pipeline
 * @description Pipeline state management for AutoGen Hybrid Agentic Architecture
 */

export {
  loadPipelineState,
  savePipelineState,
  updatePipelineState,
  resetPipelineState,
  canProceedTo,
  getPipelineStateSummary,
  type PipelineState,
  type PipelineStage,
  type PipelineHistoryEntry,
} from './state.js';
