# 🧪 Testing Strategy

## Execution
Run all test suites via pytest:
```bash
pytest tests/
```

## Mocking
* LLM calls and TTS generation are mocked inside `tests/conftest.py` to allow offline testing and avoid using API credits.
* SQLite connections use in-memory databases `:memory:` for isolation during unit testing.