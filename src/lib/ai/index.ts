export {
  generateEmbedding,
  generateEmbeddings,
  splitIntoChunks,
  prepareContentForEmbedding,
  createTextSplitter,
} from "./embeddings";

export {
  chatWithSources,
  createChatStream,
  searchContentSections,
  type ChatSource,
  type ChatRequest,
  type ChatResponse,
} from "./chat";

export {
  getSemanticRecommendations,
  getRuleBasedRecommendations,
  type ContentRecommendation,
} from "./recommendations";
