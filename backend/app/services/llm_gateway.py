import json
import logging
from typing import AsyncGenerator
from openai import AsyncOpenAI
from tenacity import retry, stop_after_attempt, wait_exponential
from app.core.config import get_settings

logger = logging.getLogger(__name__)

class LLMGateway:
    def __init__(self):
        settings = get_settings()
        self.client = AsyncOpenAI(
            api_key=settings.NVIDIA_API_KEY,
            base_url=settings.NVIDIA_API_BASE_URL
        )
        self.WRITER_MODEL = "mistralai/mistral-medium-3.5-128b"
        self.CRITIC_MODEL = "nvidia/nemotron-3-super-120b-a12b"

    def _build_messages(self, prompt: str, system_prompt: str = None) -> list[dict]:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        return messages

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def generate(self, prompt: str, system_prompt: str = None, temperature: float = 0.3, max_tokens: int = 2048) -> str:
        try:
            response = await self.client.chat.completions.create(
                model=self.WRITER_MODEL,
                messages=self._build_messages(prompt, system_prompt),
                temperature=temperature,
                max_tokens=max_tokens
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"Error in generate: {e}")
            raise

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def generate_json(self, prompt: str, system_prompt: str = None, max_tokens: int = 2048) -> dict:
        try:
            response = await self.client.chat.completions.create(
                model=self.WRITER_MODEL,
                messages=self._build_messages(prompt, system_prompt),
                temperature=0.1,
                max_tokens=max_tokens,
                response_format={"type": "json_object"}
            )
            content = response.choices[0].message.content
            return json.loads(content)
        except Exception as e:
            logger.error(f"Error in generate_json: {e}")
            raise

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def analyze(self, prompt: str, system_prompt: str = None, temperature: float = 0.2, max_tokens: int = 2048) -> str:
        try:
            response = await self.client.chat.completions.create(
                model=self.CRITIC_MODEL,
                messages=self._build_messages(prompt, system_prompt),
                temperature=temperature,
                max_tokens=max_tokens
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"Error in analyze: {e}")
            raise

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def evaluate_json(self, prompt: str, system_prompt: str = None, max_tokens: int = 2048) -> dict:
        try:
            response = await self.client.chat.completions.create(
                model=self.CRITIC_MODEL,
                messages=self._build_messages(prompt, system_prompt),
                temperature=0.1,
                max_tokens=max_tokens,
                response_format={"type": "json_object"}
            )
            content = response.choices[0].message.content
            return json.loads(content)
        except Exception as e:
            logger.error(f"Error in evaluate_json: {e}")
            raise

    async def stream_generate(self, prompt: str, system_prompt: str = None) -> AsyncGenerator[str, None]:
        try:
            response = await self.client.chat.completions.create(
                model=self.WRITER_MODEL,
                messages=self._build_messages(prompt, system_prompt),
                stream=True
            )
            async for chunk in response:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        except Exception as e:
            logger.error(f"Error in stream_generate: {e}")
            raise

def get_llm_gateway() -> LLMGateway:
    return LLMGateway()
