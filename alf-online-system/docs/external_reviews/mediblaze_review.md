# 🏥 External Architecture Review: Mediblaze Medical Chatbot

## strengths
* **LangGraph Workflows**: Utilizes LangGraph to build clear conversational state transitions.
* **Intelligent Tool Routing**: Implements a clean routing mechanism between local database RAG queries and real-time Web Search queries.
* **FastAPI Streaming**: Uses server-sent events (SSE) for streaming LLM responses to the frontend.

## weaknesses
* **Cloud-Dependent Storage**: Relies on Pinecone (Cloud Vector DB) which compromises patient privacy by sending data to a cloud host.
* **No PII Redaction**: Lacks client-side de-identification, sending raw patient text to Gemini APIs.
* **Lack of Local-First DB**: Does not support local SQLite or similar offline database for reminders and auditing.

## ideas worth stealing
* **Tool-Selection Nodes**: Define explicit routing decisions in a graph structure (RAG vs Search) to clean up Rafiq's `conv_processor.py`. `[SAFE_TO_ADOPT]`
* **Streaming SSE Events**: Standardize GUI bridge SSE payloads. `[SAFE_TO_ADOPT]`

## components worth replacing
* None. (Mediblaze's cloud components conflict with Rafiq's Local-Data First principles).

## components worth adapting
* **LangGraph Agent Structure**: Adapt the agent workflow logic to replace Rafiq's manual sequential calls in `src/core/medical_agents.py` with an event-driven flow. `[ADAPT_REQUIRED]`

## patterns worth adopting
* **Graph-based Conversation Flows**: Designing conversation states as nodes and edges to improve readability and debuggability. `[ADAPT_REQUIRED]`

## anti-patterns to avoid
* **Direct Cloud Vector DB Usage**: Storing sensitive clinical embeddings in cloud services (Pinecone). `[NOT_RECOMMENDED]`
* **Zero PII Filtering**: Transmitting un-redacted clinical texts directly to cloud LLM APIs. `[NOT_RECOMMENDED]`