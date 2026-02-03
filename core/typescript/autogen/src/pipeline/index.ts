/**
 * @module pipeline
 * @description Pipeline state management for AutoGen Hybrid Agentic Architecture
 */

export {
  loadPipelineState,
  loadPipelineStateWithInfo,
  savePipelineState,
  updatePipelineState,
  resetPipelineState,
  canProceedTo,
  getPipelineStateSummary,
  type PipelineState,
  type PipelineStage,
  type PipelineHistoryEntry,
  type LoadStateResult,
} from './state.js';
