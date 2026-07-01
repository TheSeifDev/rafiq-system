# 🔄 Data Flow Map

```text
[Audio Input] -> [STT Service (Groq Whisper)] -> [Raw Text]
                                                       |
[Speech/UI] <- [TTS Service] <- [Re-identify] <- [LLM Generate] <- [De-identify (Pseudonymizer)]
```