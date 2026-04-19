from __future__ import annotations

import asyncio
import re

from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.prompts import ChatPromptTemplate
from langchain_text_splitters import RecursiveCharacterTextSplitter

_CHROMA_DIR = "./chroma_data"
_embeddings: HuggingFaceEmbeddings | None = None

PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        "You are a collaborative project planning assistant helping a team in a shared "
        "chatroom. Answer using the project documents provided as context. "
        "Be concise, structured, and actionable.",
    ),
    ("system", "Relevant excerpts from project documents:\n{context}"),
    ("system", "Recent conversation:\n{history}"),
    ("human", "{question}"),
])

SPLITTER = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)

_ROLE_MAP = {"system": "system", "human": "user", "ai": "assistant"}


def _get_embeddings() -> HuggingFaceEmbeddings:
    global _embeddings
    if _embeddings is None:
        _embeddings = HuggingFaceEmbeddings(model_name="BAAI/bge-small-en-v1.5")
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
