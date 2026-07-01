import os
import sys
import time
import logging
import asyncio
from abc import ABC, abstractmethod
from typing import AsyncIterator, Dict, Any, Callable, List
from openai import AsyncOpenAI
from src.config import settings

# Base Exceptions and Error Classification
class LLMError(Exception):
    """Exception for LLM errors, classifying retryable vs non-retryable failures."""
    def __init__(self, message: str, is_retryable: bool = True):
        super().__init__(message)
        self.is_retryable = is_retryable

def classify_exception(e: Exception) -> LLMError:
    """Classify exceptions into retryable or non-retryable errors."""
    err_str = str(e).lower()
    is_retryable = True
    
    # Non-retryable signatures
    if any(sig in err_str for sig in [
        "auth", "unauthorized", "api_key", "invalid api key", 
        "key not found", "401", "403", "forbidden"
    ]):
        is_retryable = False
    elif any(sig in err_str for sig in [
        "context length", "context_length_exceeded", 
        "maximum context length", "token limit"
    ]):
        is_retryable = False
    elif "400" in err_str and "bad request" in err_str:
        is_retryable = False
        
    return LLMError(f"LLM Exception: {e}", is_retryable=is_retryable)

# Circuit Breaker Implementation
class CircuitBreaker:
    """Protects against calling repeatedly failing LLM providers."""
    def __init__(self, name: str, threshold: int = 3, cooldown: float = 60.0):
        self.name = name
        self.threshold = threshold
        self.cooldown = cooldown
        self.state = "CLOSED"  # CLOSED, OPEN, HALF-OPEN, PERMANENTLY_OPEN
        self.failure_count = 0
        self.last_failure_time = 0.0

    def can_execute(self) -> bool:
        if self.state == "PERMANENTLY_OPEN":
            return False
        if self.state == "OPEN":
            if time.time() - self.last_failure_time > self.cooldown:
                logging.info(f"Circuit Breaker for '{self.name}' entered HALF-OPEN state.")
                self.state = "HALF-OPEN"
                return True
            return False
        return True

    def record_success(self):
        if self.state == "PERMANENTLY_OPEN":
            return
        if self.state != "CLOSED":
            logging.info(f"Circuit Breaker for '{self.name}' closed successfully.")
        self.failure_count = 0
        self.state = "CLOSED"

    def record_failure(self):
        if self.state == "PERMANENTLY_OPEN":
            return
        self.failure_count += 1
        self.last_failure_time = time.time()
        logging.warning(f"Circuit Breaker for '{self.name}' failure count: {self.failure_count}/{self.threshold}")
        if self.failure_count >= self.threshold:
            logging.error(f"Circuit Breaker for '{self.name}' TRIPPED to OPEN. Cooldown: {self.cooldown} seconds.")
            self.state = "OPEN"

# Provider Abstraction Interface
class BaseLLMProvider(ABC):
    """Unified contract for LLM text generation and streaming."""
    @abstractmethod
    async def generate(self, messages: List[Dict[str, str]], temp: float = 0.7, max_tok: int = 2048) -> str:
        """Execute non-streaming completion."""
        pass

    @abstractmethod
    async def generate_stream(self, messages: List[Dict[str, str]], temp: float = 0.7, max_tok: int = 2048) -> AsyncIterator[str]:
        """Execute streaming completion."""
        pass

# Groq Integration
class GroqProvider(BaseLLMProvider):
    def __init__(self):
        key = os.environ.get("GROQ_API_KEY", "").strip()
        if not key:
            raise ValueError("GROQ_API_KEY is not configured.")
        try:
            from groq import AsyncGroq
        except ImportError:
            raise ImportError("groq python package is not installed. Run pip install groq.")
        self.client = AsyncGroq(api_key=key)

    async def generate(self, messages: List[Dict[str, str]], temp: float = 0.7, max_tok: int = 2048) -> str:
        model = os.environ.get("RAFIQ_GROQ_CHAT_MODEL", "llama-3.3-70b-versatile").strip()
        retries = 3
        delay = 0.5
        for attempt in range(retries):
            try:
                r = await self.client.chat.completions.create(
                    messages=messages,
                    model=model,
                    temperature=temp,
                    max_tokens=max_tok,
                    timeout=15.0
                )
                return r.choices[0].message.content or ""
            except Exception as e:
                err_str = str(e).lower()
                is_rate_limit = any(sig in err_str for sig in ["429", "rate limit", "rate_limit_exceeded"])
                if is_rate_limit and attempt < retries - 1:
                    logging.warning(f"Groq 429 Rate Limit hit. Retrying in {delay:.2f}s (attempt {attempt+1}/{retries})...")
                    await asyncio.sleep(delay)
                    delay *= 2
                    continue
                raise classify_exception(e)

    async def generate_stream(self, messages: List[Dict[str, str]], temp: float = 0.7, max_tok: int = 2048) -> AsyncIterator[str]:
        model = os.environ.get("RAFIQ_GROQ_CHAT_MODEL", "llama-3.3-70b-versatile").strip()
        retries = 3
        delay = 0.5
        for attempt in range(retries):
            try:
                r = await self.client.chat.completions.create(
                    messages=messages,
                    model=model,
                    temperature=temp,
                    max_tokens=max_tok,
                    stream=True,
                    timeout=15.0
                )
                async with r:
                    async for chunk in r:
                        val = chunk.choices[0].delta.content
                        if val:
                            yield val
                return
            except Exception as e:
                err_str = str(e).lower()
                is_rate_limit = any(sig in err_str for sig in ["429", "rate limit", "rate_limit_exceeded"])
                if is_rate_limit and attempt < retries - 1:
                    logging.warning(f"Groq stream 429 Rate Limit hit. Retrying in {delay:.2f}s (attempt {attempt+1}/{retries})...")
                    await asyncio.sleep(delay)
                    delay *= 2
                    continue
                raise classify_exception(e)

# Gemini Integration (OpenAI SDK wrapper)
class GeminiProvider(BaseLLMProvider):
    def __init__(self):
        key = os.environ.get("GOOGLE_API_KEY", "").strip()
        if not key:
            raise ValueError("GOOGLE_API_KEY is not configured.")
        self.client = AsyncOpenAI(
            api_key=key,
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
        )

    async def generate(self, messages: List[Dict[str, str]], temp: float = 0.7, max_tok: int = 2048) -> str:
        try:
            r = await self.client.chat.completions.create(
                messages=messages,
                model="models/gemini-2.5-flash",
                temperature=temp,
                max_tokens=max_tok,
                timeout=15.0
            )
            return r.choices[0].message.content or ""
        except Exception as e:
            raise classify_exception(e)

    async def generate_stream(self, messages: List[Dict[str, str]], temp: float = 0.7, max_tok: int = 2048) -> AsyncIterator[str]:
        try:
            r = await self.client.chat.completions.create(
                messages=messages,
                model="models/gemini-2.5-flash",
                temperature=temp,
                max_tokens=max_tok,
                stream=True,
                timeout=15.0
            )
            async with r:
                async for chunk in r:
                    val = chunk.choices[0].delta.content
                    if val:
                        yield val
        except Exception as e:
            raise classify_exception(e)

# OpenRouter Integration
class OpenRouterProvider(BaseLLMProvider):
    def __init__(self):
        key = os.environ.get("OPENROUTER_API_KEY", "").strip()
        if not key:
            raise ValueError("OPENROUTER_API_KEY is not configured.")
        self.client = AsyncOpenAI(
            api_key=key,
            base_url="https://openrouter.ai/api/v1"
        )
        self.model = os.environ.get("RAFIQ_OPENROUTER_MODEL", "meta-llama/llama-3.3-70b-instruct").strip()

    async def generate(self, messages: List[Dict[str, str]], temp: float = 0.7, max_tok: int = 2048) -> str:
        try:
            r = await self.client.chat.completions.create(
                messages=messages,
                model=self.model,
                temperature=temp,
                max_tokens=max_tok,
                timeout=15.0
            )
            return r.choices[0].message.content or ""
        except Exception as e:
            raise classify_exception(e)

    async def generate_stream(self, messages: List[Dict[str, str]], temp: float = 0.7, max_tok: int = 2048) -> AsyncIterator[str]:
        try:
            r = await self.client.chat.completions.create(
                messages=messages,
                model=self.model,
                temperature=temp,
                max_tokens=max_tok,
                stream=True,
                timeout=15.0
            )
            async with r:
                async for chunk in r:
                    val = chunk.choices[0].delta.content
                    if val:
                        yield val
        except Exception as e:
            raise classify_exception(e)

# Nvidia NIM Integration
class NvidiaNimProvider(BaseLLMProvider):
    def __init__(self):
        key = os.environ.get("NVIDIA_NIM_API_KEY", "").strip()
        if not key:
            raise ValueError("NVIDIA_NIM_API_KEY is not configured.")
        self.client = AsyncOpenAI(
            api_key=key,
            base_url="https://integrate.api.nvidia.com/v1"
        )
        self.model = os.environ.get("RAFIQ_NVIDIA_MODEL", "meta/llama3-70b-instruct").strip()

    async def generate(self, messages: List[Dict[str, str]], temp: float = 0.7, max_tok: int = 2048) -> str:
        try:
            r = await self.client.chat.completions.create(
                messages=messages,
                model=self.model,
                temperature=temp,
                max_tokens=max_tok,
                timeout=15.0
            )
            return r.choices[0].message.content or ""
        except Exception as e:
            raise classify_exception(e)

    async def generate_stream(self, messages: List[Dict[str, str]], temp: float = 0.7, max_tok: int = 2048) -> AsyncIterator[str]:
        try:
            r = await self.client.chat.completions.create(
                messages=messages,
                model=self.model,
                temperature=temp,
                max_tokens=max_tok,
                stream=True,
                timeout=15.0
            )
            async with r:
                async for chunk in r:
                    val = chunk.choices[0].delta.content
                    if val:
                        yield val
        except Exception as e:
            raise classify_exception(e)

# Pluggable Response Validation Layer
class ResponseValidationLayer:
    def __init__(self):
        self._validators: List[Callable[[str], bool]] = []

    def add_validator(self, validator: Callable[[str], bool]):
        self._validators.append(validator)

    def validate(self, response: str) -> bool:
        for v in self._validators:
            if not v(response):
                return False
        return True

# Lazy Registry Factory
class LLMProviderRegistry:
    def __init__(self):
        self._creators: Dict[str, Callable[[], BaseLLMProvider]] = {
            "groq": lambda: GroqProvider(),
            "gemini": lambda: GeminiProvider(),
            "openrouter": lambda: OpenRouterProvider(),
            "nvidia": lambda: NvidiaNimProvider(),
        }
        self._instances: Dict[str, BaseLLMProvider] = {}
        self._breakers: Dict[str, CircuitBreaker] = {
            "groq": CircuitBreaker("groq"),
            "gemini": CircuitBreaker("gemini"),
            "openrouter": CircuitBreaker("openrouter"),
            "nvidia": CircuitBreaker("nvidia"),
        }

    def get_provider(self, name: str) -> BaseLLMProvider:
        name = name.lower()
        if name not in self._creators:
            raise ValueError(f"Provider '{name}' is not registered.")
        
        breaker = self._breakers[name]
        if not breaker.can_execute():
            raise LLMError(f"Circuit Breaker is OPEN for provider '{name}' (tripped).", is_retryable=True)

        if name not in self._instances:
            try:
                # Instantiate on first use (True Lazy Factory)
                self._instances[name] = self._creators[name]()
            except Exception as e:
                self.record_failure(name, e)
                raise classify_exception(e)
        return self._instances[name]

    def record_success(self, name: str):
        self._breakers[name.lower()].record_success()

    def record_failure(self, name: str, exception: Exception | None = None):
        breaker = self._breakers[name.lower()]
        if exception:
            err_str = str(exception).lower()
            if any(sig in err_str for sig in ["auth", "api_key", "invalid api key", "unauthorized", "401", "403", "key not configured", "not configured"]):
                logging.error(f"Circuit Breaker for '{breaker.name}' locked to PERMANENTLY_OPEN due to auth/config failure: {exception}")
                breaker.state = "PERMANENTLY_OPEN"
                return
        breaker.record_failure()

    async def run_startup_health_checks(self) -> Dict[str, bool]:
        """Verify configurations during startup and warm up breakers."""
        status = {}
        env_keys = {
            "groq": "GROQ_API_KEY",
            "gemini": "GOOGLE_API_KEY",
            "openrouter": "OPENROUTER_API_KEY",
            "nvidia": "NVIDIA_NIM_API_KEY",
        }
        for name in list(self._creators.keys()):
            key_var = env_keys[name]
            if not os.environ.get(key_var, "").strip():
                # Pre-trip circuit breaker for unconfigured keys permanently
                self._breakers[name].state = "PERMANENTLY_OPEN"
                status[name] = False
            else:
                try:
                    provider = self.get_provider(name)
                    # Lightweight health check ping
                    await provider.generate([{"role": "user", "content": "hello"}], max_tok=1)
                    status[name] = True
                except Exception as e:
                    logging.warning(f"Health check failed for {name}: {e}")
                    self.record_failure(name, e)
                    status[name] = False
        return status

# LLM Client Orchestrator
class LLMClient:
    def __init__(self, registry: LLMProviderRegistry | None = None):
        self.registry = registry or LLMProviderRegistry()
        self.validation_layer = ResponseValidationLayer()
        self.default_chain = ["groq", "gemini", "openrouter", "nvidia"]

    def _get_chain(self) -> List[str]:
        primary = os.environ.get("RAFIQ_PRIMARY_AI", "groq").lower().strip()
        chain = []
        if primary in self.default_chain:
            chain.append(primary)
        for item in self.default_chain:
            if item not in chain:
                chain.append(item)
        return chain

    async def generate(self, messages: List[Dict[str, str]], temp: float = 0.7, max_tok: int = 2048) -> str:
        from src.utils.observability import measure_latency, log_exception
        from src.utils.beta_telemetry import record_llm_latency, record_error
        chain = self._get_chain()
        last_error = None
        for name in chain:
            try:
                provider = self.registry.get_provider(name)
                t0 = time.monotonic()
                with measure_latency("llm", extra_info={"provider": name, "model": getattr(provider, "model", "default")}):
                    res = await provider.generate(messages, temp=temp, max_tok=max_tok)
                latency_ms = (time.monotonic() - t0) * 1000
                record_llm_latency(latency_ms)
                self.registry.record_success(name)
                
                # Check response validation layer
                if not self.validation_layer.validate(res):
                    raise LLMError(f"Safety Validation layer blocked response from '{name}'", is_retryable=False)
                
                return res
            except LLMError as le:
                logging.warning(f"LLMClient: provider '{name}' failed: {le}")
                log_exception(le, context=f"llm_generate:{name}")
                record_error(f"{name}_llm_error: {str(le)}")
                self.registry.record_failure(name, le)
                last_error = le
                
                err_str = str(le).lower()
                is_auth_error = any(sig in err_str for sig in ["auth", "api_key", "invalid api key", "unauthorized", "401", "403", "key not configured", "not configured"])
                if not le.is_retryable and not is_auth_error:
                    raise le
            except Exception as e:
                logging.warning(f"LLMClient: provider '{name}' got unexpected error: {e}")
                log_exception(e, context=f"llm_generate_unexpected:{name}")
                record_error(f"{name}_unexpected_error: {str(e)}")
                self.registry.record_failure(name, e)
                last_error = classify_exception(e)
                
                err_str = str(last_error).lower()
                is_auth_error = any(sig in err_str for sig in ["auth", "api_key", "invalid api key", "unauthorized", "401", "403", "key not configured", "not configured"])
                if not last_error.is_retryable and not is_auth_error:
                    raise last_error
        
        raise last_error or RuntimeError("All LLM providers in fallback chain failed.")

    async def generate_stream(self, messages: List[Dict[str, str]], temp: float = 0.7, max_tok: int = 2048) -> AsyncIterator[str]:
        from src.utils.beta_telemetry import record_llm_latency, record_error
        chain = self._get_chain()
        last_error = None
        for name in chain:
            buffer = []
            try:
                provider = self.registry.get_provider(name)
                t0 = time.monotonic()
                stream = provider.generate_stream(messages, temp=temp, max_tok=max_tok)
                
                # Buffer the first few tokens to detect early stream failures
                try:
                    async for chunk in stream:
                        buffer.append(chunk)
                        if len(buffer) == 1:
                            yield buffer[0]
                        elif len(buffer) > 1:
                            yield buffer[-1]
                finally:
                    if hasattr(stream, "aclose"):
                        await stream.aclose()
                    
                latency_ms = (time.monotonic() - t0) * 1000
                record_llm_latency(latency_ms)
                self.registry.record_success(name)
                return
            except LLMError as le:
                logging.warning(f"LLMClient: stream provider '{name}' failed: {le}")
                record_error(f"{name}_stream_llm_error: {str(le)}")
                self.registry.record_failure(name, le)
                last_error = le
                if len(buffer) > 0:
                    raise le
                
                err_str = str(le).lower()
                is_auth_error = any(sig in err_str for sig in ["auth", "api_key", "invalid api key", "unauthorized", "401", "403", "key not configured", "not configured"])
                if not le.is_retryable and not is_auth_error:
                    raise le
            except Exception as e:
                logging.warning(f"LLMClient: stream provider '{name}' got unexpected error: {e}")
                record_error(f"{name}_stream_unexpected_error: {str(e)}")
                self.registry.record_failure(name, e)
                last_error = classify_exception(e)
                if len(buffer) > 0:
                    raise last_error
                
                err_str = str(last_error).lower()
                is_auth_error = any(sig in err_str for sig in ["auth", "api_key", "invalid api key", "unauthorized", "401", "403", "key not configured", "not configured"])
                if not last_error.is_retryable and not is_auth_error:
                    raise last_error
                    
        raise last_error or RuntimeError("All LLM stream providers failed.")

# Shared global instance
GLOBAL_LLM_CLIENT = LLMClient()
