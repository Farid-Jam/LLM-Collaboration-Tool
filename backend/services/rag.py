from __future__ import annotations

import asyncio
import re

import numpy as np
from huggingface_hub import InferenceClient
from langchain_chroma import Chroma
from langchain_core.embeddings import Embeddings
from langchain_core.prompts import ChatPromptTemplate
from langchain_text_splitters import RecursiveCharacterTextSplitter

from core.config import settings

_CHROMA_DIR = "./chroma_data"
_embeddings: "HFApiEmbeddings | None" = None


class HFApiEmbeddings(Embeddings):
    def __init__(self, token: str, model: str) -> None:
        self._client = InferenceClient(token=token)
        self._model = model

    def _embed(self, text: str) -> list[float]:
        result = self._client.feature_extraction(text, model=self._model)
        arr = np.array(result)
        if arr.ndim == 2:
            arr = arr.mean(axis=0)
        return arr.tolist()

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return [self._embed(t) for t in texts]

    def embed_query(self, text: str) -> list[float]:
        return self._embed(text)

PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        "You are a collaborative design partner helping a team think through ideas in a "
        "shared chatroom. Respond conversationally — like a thoughtful colleague, not a "
        "report generator. Keep replies focused and concise. Only use bullet points or "
        "headers when the user explicitly asks for a summary or list. If someone shares "
        "an idea or asks a question, engage with it directly: push back, ask a clarifying "
        "question, or build on it. Never pad responses with feature overviews or "
        "unsolicited summaries of what was discussed.\n\n"
        "When a user asks for a flowchart, sequence diagram, architecture diagram, "
        "entity-relationship diagram, class diagram, or any other structured visual, "
        "respond with a Mermaid diagram inside a fenced code block tagged 'mermaid'. "
        "Diagram type rules: use 'graph TD' for flowcharts (arrows: -->), "
        "'sequenceDiagram' for sequences (arrows: ->>, -->>), "
        "'erDiagram' for database schemas (relations: ||--o{{, ||--|{{, ||--||), "
        "'classDiagram' for class structures (inheritance: <|--, association: -->). "
        "Never copy the examples above — always generate a diagram specific to what the user asked. "
        "Labeled arrows in graph TD must use EXACTLY this format: A -->|label| B — "
        "never A -->|label|> B or any other variant. "
        "Node labels must not contain / or | characters. Keep diagrams to 10 nodes or fewer. "
        "Use Mermaid for any structured, logical, or relational visual.\n\n"
        "For creative visuals only — concept art, logos, mood boards, UI mockups — "
        "include a tag at the exact point the image should appear:\n"
        "[GENERATE_IMAGE: detailed description]\n"
        "Never use [GENERATE_IMAGE: ...] when the user asks for a diagram, flowchart, "
        "schema, or any structured visual — use Mermaid exclusively for those. "
        "Never produce both a Mermaid block and a [GENERATE_IMAGE: ...] tag for the same request. "
        "Do not explain that you are generating anything; just include the block or tag.",
    ),
    ("system", "Relevant excerpts from project documents:\n{context}"),
    ("system", "Recent conversation:\n{history}"),
    ("human", "{question}"),
])

SPLITTER = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)

_ROLE_MAP = {"system": "system", "human": "user", "ai": "assistant"}


def _get_embeddings() -> HFApiEmbeddings:
    global _embeddings
    if _embeddings is None:
        _embeddings = HFApiEmbeddings(token=settings.hf_token, model="BAAI/bge-small-en-v1.5")
    return _embeddings


def _docs_collection_name(room_id: str) -> str:
    return re.sub(r"[^a-zA-Z0-9_-]", "_", f"{room_id}_docs")


def _get_docs_store(room_id: str) -> Chroma:
    return Chroma(
        collection_name=_docs_collection_name(room_id),
        embedding_function=_get_embeddings(),
        persist_directory=_CHROMA_DIR,
    )


class RAGService:
    def split_text(self, text: str) -> list[str]:
        return SPLITTER.split_text(text)

    async def index_document_chunks(
        self,
        chunks: list[str],
        room_id: str,
        doc_id: str,
    ) -> None:
        store = _get_docs_store(room_id)
        ids = [f"{doc_id}_chunk_{i}" for i in range(len(chunks))]
        await asyncio.to_thread(store.add_texts, chunks, ids=ids)

    async def retrieve(self, query: str, room_id: str, k: int = 5) -> list[str]:
        store = _get_docs_store(room_id)
        try:
            docs = await asyncio.to_thread(store.similarity_search, query, k=k)
            return [d.page_content for d in docs]
        except Exception:
            return []

    async def get_prompt_messages(
        self,
        question: str,
        room_id: str,
        history: list[dict[str, str]],
    ) -> list[dict[str, str]]:
        context_chunks = await self.retrieve(question, room_id)
        context = "\n\n---\n\n".join(context_chunks) if context_chunks else \
            "No project documents uploaded yet. Ask users to upload a PDF."

        history_text = "\n".join(
            f"{'User' if m['role'] == 'user' else 'Assistant'}: {m['content']}"
            for m in history
        ) if history else "No prior conversation."

        msg_list = PROMPT.format_messages(
            context=context,
            history=history_text,
            question=question,
        )
        return [
            {"role": _ROLE_MAP.get(m.type, "user"), "content": m.content}
            for m in msg_list
        ]


rag_service = RAGService()
