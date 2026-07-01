"""
Rafiq v4.0 — Clinical Memory Engine
Integrates Mem0 with local ChromaDB and Sentence-Transformers.
"""
import os
import logging

log = logging.getLogger("rafiq.memory")

def sanitize_user_id(user_id: str) -> str:
    import re
    return re.sub(r'\s+', '_', user_id.strip())

class ClinicalMemory:
    """
    Intelligent medical memory for patient history and doctor preferences/corrections.
    Uses Mem0 under the hood, running fully local embeddings (no OpenAI key needed).
    """
    def __init__(self, groq_api_key: str, chroma_path: str = "rafiq_chroma_v4"):
        self.enabled = False
        self.mem = None
        groq_api_key = (groq_api_key or "").strip()
        os.environ.setdefault("GROQ_API_KEY", groq_api_key)

        explicit_enable = os.environ.get("RAFIQ_ENABLE_CLINICAL_MEMORY", "0") == "1"
        if not groq_api_key:
            log.info("ClinicalMemory disabled: GROQ_API_KEY is not configured.")
            return
        if os.environ.get("RAFIQ_OFFLINE", "0") == "1" and not explicit_enable:
            log.info("ClinicalMemory disabled in offline mode. Set RAFIQ_ENABLE_CLINICAL_MEMORY=1 to force it.")
            return
        
        # Embedding config with dynamic resolution
        embed_provider = os.environ.get("RAFIQ_EMBEDDING_PROVIDER", "huggingface").strip()
        embed_model = os.environ.get("RAFIQ_EMBEDDING_MODEL", "BAAI/bge-m3").strip()
        embed_base_url = os.environ.get("RAFIQ_EMBEDDING_BASE_URL", "").strip()
        embed_dims = os.environ.get("RAFIQ_EMBEDDING_DIMS", "").strip()

        # Offline fallback for testing/isolation
        if os.environ.get("RAFIQ_OFFLINE", "0") == "1":
            embed_provider = "huggingface"
            embed_model = "sentence-transformers/all-MiniLM-L6-v2"
            collection_name = "rafiq_clinical_memory_v4_2_offline"
            embedder_config = {
                "model": embed_model
            }
        else:
            # Dynamic collection name based on model to prevent dimension mismatches
            model_suffix = embed_model.replace("/", "_").replace("-", "_").lower()
            collection_name = f"rafiq_clinical_memory_v4_{model_suffix}"
            embedder_config = {
                "model": embed_model
            }
            if embed_provider == "openai":
                # For Gemini OpenAI-compatible endpoint or OpenAI direct
                # Set API Key directly in config for mem0
                embedder_config["api_key"] = os.environ.get("GOOGLE_API_KEY", os.environ.get("OPENAI_API_KEY", "")).strip()
                if embed_base_url:
                    embedder_config["openai_base_url"] = embed_base_url
                if embed_dims:
                    embedder_config["embedding_dims"] = int(embed_dims)

        # Mem0 Configuration
        history_db_path = os.path.join(chroma_path, "history.db")
        # Dynamic LLM Provider configuration to bypass Groq rate limits (Gemini has high TPM)
        if os.environ.get("RAFIQ_OFFLINE", "0") == "1":
            llm_config = {
                "provider": "groq",
                "config": {
                    "model": os.environ.get("RAFIQ_CLINICAL_MEMORY_MODEL", "llama-3.1-8b-instant").strip(),
                    "temperature": 0.1,
                }
            }
        else:
            google_key = os.environ.get("GOOGLE_API_KEY", "").strip()
            if google_key:
                llm_config = {
                    "provider": "openai",
                    "config": {
                        "model": "gemini-2.5-flash",
                        "api_key": google_key,
                        "openai_base_url": "https://generativelanguage.googleapis.com/v1beta/openai/",
                        "temperature": 0.1,
                    }
                }
            else:
                llm_config = {
                    "provider": "groq",
                    "config": {
                        "model": os.environ.get("RAFIQ_CLINICAL_MEMORY_MODEL", "llama-3.1-8b-instant").strip(),
                        "temperature": 0.1,
                    }
                }

        self.config = {
            "vector_store": {
                "provider": "chroma",
                "config": {
                    "collection_name": collection_name,
                    "path": chroma_path,
                }
            },
            "history_store": {
                "provider": "sqlite",
                "config": {
                    "path": history_db_path,
                }
            },
            "llm": llm_config,
            "embedder": {
                "provider": embed_provider,
                "config": embedder_config
            }
        }
        
        openrouter_key = os.environ.pop("OPENROUTER_API_KEY", None)
        openrouter_base = os.environ.pop("OPENROUTER_API_BASE", None)
        try:
            from mem0 import Memory
            self.mem = Memory.from_config(self.config)
            self.enabled = True
            log.info("ClinicalMemory successfully initialized with Mem0 + ChromaDB.")
        except Exception as e:
            log.error(f"Failed to initialize Mem0 ClinicalMemory: {e}. Falling back to disabled mode.", exc_info=True)
            self.mem = None
        finally:
            if openrouter_key is not None:
                os.environ["OPENROUTER_API_KEY"] = openrouter_key
            if openrouter_base is not None:
                os.environ["OPENROUTER_API_BASE"] = openrouter_base

    async def remember_patient_info(self, patient_id: str, info: str, metadata: dict = None) -> bool:
        """Saves patient medical facts, symptoms, allergies, or history."""
        if not self.enabled or not self.mem:
            return False
        try:
            from src.core import privacy
            deidentified_info = privacy.deidentify_text(info)
            meta = {"type": "patient", **(metadata or {})}
            clean_id = sanitize_user_id(patient_id)
            self.mem.add(deidentified_info, user_id=clean_id, metadata=meta)
            return True
        except Exception as e:
            log.error(f"Error adding patient memory: {e}")
            return False

    async def get_patient_context(self, patient_id: str, query: str, limit: int = 5) -> str:
        """Retrieves patient-specific memories relevant to the medical query."""
        if not self.enabled or not self.mem:
            return "لا توجد ذاكرة مفعّلة حالياً."
        try:
            from src.core import privacy
            deidentified_query = privacy.deidentify_text(query)
            clean_id = sanitize_user_id(patient_id)
            results = self.mem.search(deidentified_query, filters={"user_id": clean_id}, limit=limit)
            return self._format_memories(results)
        except Exception as e:
            log.error(f"Error searching patient memories: {e}")
            return "حدث خطأ أثناء استرجاع الذاكرة."

    async def remember_doctor_correction(self, doctor_id: str, correction: str, context: dict = None) -> bool:
        """Saves a doctor's correction or customized instruction as a local rule."""
        if not self.enabled or not self.mem:
            return False
        try:
            from src.core import privacy
            deidentified_correction = privacy.deidentify_text(correction)
            meta = {"type": "doctor_correction", **(context or {})}
            clean_id = sanitize_user_id(doctor_id)
            self.mem.add(deidentified_correction, user_id=f"doctor_{clean_id}", metadata=meta)
            return True
        except Exception as e:
            log.error(f"Error adding doctor memory: {e}")
            return False

    async def get_doctor_rules(self, doctor_id: str, query: str, limit: int = 3) -> str:
        """Retrieves doctor preferences or corrections relevant to the query."""
        if not self.enabled or not self.mem:
            return "لا توجد تعليمات مخصصة مسجلة."
        try:
            from src.core import privacy
            deidentified_query = privacy.deidentify_text(query)
            clean_id = sanitize_user_id(doctor_id)
            results = self.mem.search(deidentified_query, filters={"user_id": f"doctor_{clean_id}"}, limit=limit)
            return self._format_memories(results)
        except Exception as e:
            log.error(f"Error searching doctor corrections: {e}")
            return "حدث خطأ أثناء استرجاع تفضيلات الطبيب."

    async def get_all_memories(self, patient_id: str) -> list:
        """Retrieves all memories stored for the patient."""
        if not self.enabled or not self.mem:
            return []
        try:
            clean_id = sanitize_user_id(patient_id)
            results = self.mem.get_all(filters={"user_id": clean_id})
            items = []
            if isinstance(results, dict) and "results" in results:
                items = results["results"]
            elif isinstance(results, list):
                items = results
            return items
        except Exception as e:
            log.error(f"Error fetching all memories from Mem0: {e}")
            return []

    async def delete_memory(self, memory_id: str) -> bool:
        """Deletes a memory by its unique ID from Mem0."""
        if not self.enabled or not self.mem:
            return False
        try:
            self.mem.delete(memory_id)
            return True
        except Exception as e:
            log.error(f"Error deleting Mem0 memory: {e}")
            return False

    async def update_memory(self, memory_id: str, new_text: str) -> bool:
        """Updates a memory's text in Mem0 by its unique ID."""
        if not self.enabled or not self.mem:
            return False
        try:
            # Note: Mem0 update expects (memory_id, data)
            self.mem.update(memory_id, new_text)
            return True
        except Exception as e:
            log.error(f"Error updating Mem0 memory: {e}")
            return False

    async def build_enriched_context(self, patient_id: str, doctor_id: str, query: str) -> dict:
        """Returns patient history and doctor preferences related to the current query."""
        patient_history = await self.get_patient_context(patient_id, query)
        doctor_prefs = await self.get_doctor_rules(doctor_id, query)
        return {
            "patient_history": patient_history,
            "doctor_preferences": doctor_prefs
        }

    def _format_memories(self, results) -> str:
        """Formats the list of memories returned by Mem0 into a clean string."""
        if not results:
            return "لا توجد معلومات مسجلة متعلقة."
        
        # In Mem0 v2, results can be a list or a dictionary containing a 'results' key
        memories = []
        if isinstance(results, dict) and "results" in results:
            items = results["results"]
        elif isinstance(results, list):
            items = results
        else:
            items = []

        for r in items:
            if isinstance(r, dict) and "memory" in r:
                memories.append(f"- {r['memory']}")
            elif hasattr(r, "memory"):
                memories.append(f"- {r.memory}")
        
        if not memories:
            return "لا توجد معلومات مسجلة متعلقة."
        return "\n".join(memories)
