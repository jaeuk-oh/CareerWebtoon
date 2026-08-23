import asyncio
import json
import logging
from typing import AsyncGenerator
from openai import AsyncOpenAI
from tenacity import retry, stop_after_attempt, wait_exponential
from app.core.config import get_settings

logger = logging.getLogger(__name__)

# httpx's `timeout` only bounds each individual socket read, not the request as a
# whole — a connection that trickles data (or keeps the socket alive without ever
# finishing) can dodge it indefinitely. Wrapping every call in asyncio.wait_for gives
# a real wall-clock deadline so a stuck request always ends up raising and handing
# control back to tenacity's @retry instead of hanging the request forever.
HARD_CALL_TIMEOUT = 60.0

class LLMGateway:
    def __init__(self):
        settings = get_settings()
        self._api_key = settings.NVIDIA_API_KEY
        self._base_url = settings.NVIDIA_API_BASE_URL
        self.WRITER_MODEL = "nvidia/llama-3.3-nemotron-super-49b-v1"
        self.CRITIC_MODEL = "nvidia/nemotron-3-super-120b-a12b"

    def _build_messages(self, prompt: str, system_prompt: str = None) -> list[dict]:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        return messages

    async def _create(self, *, call_timeout: float = HARD_CALL_TIMEOUT, **kwargs):
        # A fresh client (and its own connection pool) per call, not shared across
        # tenacity's retries: cancelling a request via asyncio.wait_for's hard
        # deadline doesn't cleanly unwind httpx's HTTP/2 stream state, and reusing
        # that same client on the next attempt can fail with "Already borrowed"
        # instead of actually retrying against a clean connection.
        client = AsyncOpenAI(api_key=self._api_key, base_url=self._base_url, timeout=call_timeout + 15.0)
        try:
            return await asyncio.wait_for(
                client.chat.completions.create(**kwargs), timeout=call_timeout
            )
        finally:
            await client.close()

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def generate(
        self, prompt: str, system_prompt: str = None, temperature: float = 0.3,
        max_tokens: int = 2048, timeout: float = HARD_CALL_TIMEOUT
    ) -> str:
        try:
            response = await self._create(
                call_timeout=timeout,
                model=self.WRITER_MODEL,
                messages=self._build_messages(prompt, system_prompt),
                temperature=temperature,
                max_tokens=max_tokens
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"Error in generate: {e!r}")
            raise

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def generate_json(
        self, prompt: str, system_prompt: str = None, max_tokens: int = 2048,
        timeout: float = HARD_CALL_TIMEOUT
    ) -> dict:
        try:
            response = await self._create(
                call_timeout=timeout,
                model=self.WRITER_MODEL,
                messages=self._build_messages(prompt, system_prompt),
                temperature=0.1,
                max_tokens=max_tokens,
                response_format={"type": "json_object"}
            )
            content = response.choices[0].message.content
            return json.loads(content)
        except Exception as e:
            logger.error(f"Error in generate_json: {e!r}")
            raise

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def analyze(
        self, prompt: str, system_prompt: str = None, temperature: float = 0.2,
        max_tokens: int = 2048, timeout: float = HARD_CALL_TIMEOUT
    ) -> str:
        try:
            response = await self._create(
                call_timeout=timeout,
                model=self.CRITIC_MODEL,
                messages=self._build_messages(prompt, system_prompt),
                temperature=temperature,
                max_tokens=max_tokens
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"Error in analyze: {e!r}")
            raise

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def evaluate_json(
        self, prompt: str, system_prompt: str = None, max_tokens: int = 2048,
        timeout: float = HARD_CALL_TIMEOUT
    ) -> dict:
        try:
            response = await self._create(
                call_timeout=timeout,
                model=self.CRITIC_MODEL,
                messages=self._build_messages(prompt, system_prompt),
                temperature=0.1,
                max_tokens=max_tokens,
                response_format={"type": "json_object"}
            )
            content = response.choices[0].message.content
            return json.loads(content)
        except Exception as e:
            logger.error(f"Error in evaluate_json: {e!r}")
            raise

    async def stream_generate(
        self, prompt: str, system_prompt: str = None, model: str = None, timeout: float = 120.0
    ) -> AsyncGenerator[str, None]:
        # No @retry here: a stream that dies partway through has already sent real
        # tokens to the client, so silently retrying from scratch would duplicate or
        # garble what the user already saw. The caller decides what "partial" means
        # for its own use case (document_engine keeps what streamed and moves on).
        client = AsyncOpenAI(api_key=self._api_key, base_url=self._base_url, timeout=timeout)
        try:
            response = await client.chat.completions.create(
                model=model or self.WRITER_MODEL,
                messages=self._build_messages(prompt, system_prompt),
                stream=True
            )
            async for chunk in response:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        except Exception as e:
            logger.error(f"Error in stream_generate: {e!r}")
            raise
        finally:
            await client.close()

def get_llm_gateway() -> LLMGateway:
    return LLMGateway()
