from __future__ import annotations

from collections.abc import AsyncIterator

from huggingface_hub import AsyncInferenceClient

from core.config import settings

_client: AsyncInferenceClient | None = None


def _get_client() -> AsyncInferenceClient:
    global _client
    if _client is None:
        if not settings.hf_token:
            raise RuntimeError("HF_TOKEN is not set. Add it to backend/.env")
        _client = AsyncInferenceClient(
            model=settings.model_name,
            token=settings.hf_token,
        )
    return _client


class HFInferenceLLM:
    async def stream(self, messages: list[dict[str, str]]) -> AsyncIterator[str]:
        client = _get_client()
        response = await client.chat_completion(
            messages=messages,
            stream=True,
            max_tokens=300,
            temperature=0.7,
            stop=["<|eot_id|>", "<|end_of_text|>"],
        )
        async for chunk in response:
            choice = chunk.choices[0]
            if choice.delta.content:
                yield choice.delta.content
            if choice.finish_reason is not None:
                break


llm_service = HFInferenceLLM()
