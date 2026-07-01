# 🐛 Known Bugs & Quirks

* **Audio Device Locks**: PyAudio sometimes fails to release input stream when speech recognition crashes, preventing subsequent wake word listening.
* **Arabic Diacritics Normalization**: Certain normalized characters affect Regex matches in the medical router if tatweel is not completely stripped.