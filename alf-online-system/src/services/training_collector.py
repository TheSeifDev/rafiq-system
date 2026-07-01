"""
Rafiq v4.0 — Doctor Feedback Training Data Collector
Appends correction records to a local JSONL file for DSPy prompt optimization.
"""
import json
import os
import datetime
import logging

log = logging.getLogger("rafiq.collector")

class TrainingCollector:
    """
    Collects questions, original answers, and doctor corrections to build
    a high-quality medical instruction dataset for DSPy prompt training.
    """
    def __init__(self, path: str = "training_data.jsonl"):
        self.path = path

    def record_correction(self, query: str, original_answer: str,
                          corrected_answer: str, who_context: str = "",
                          patient_history: str = "", doctor_id: str = "default"):
        """Saves a single correction instance as a training sample."""
        record = {
            "timestamp": datetime.datetime.now().isoformat(),
            "query": query,
            "original_answer": original_answer,
            "corrected_answer": corrected_answer,
            "who_context": who_context,
            "patient_history": patient_history,
            "doctor_id": doctor_id,
        }
        try:
            # Append in UTF-8
            with open(self.path, "a", encoding="utf-8") as f:
                f.write(json.dumps(record, ensure_ascii=False) + "\n")
            log.info(f"Doctor correction successfully recorded in training dataset. Total samples: {self.count_examples()}")
        except Exception as e:
            log.error(f"Failed to record doctor correction: {e}")

    def count_examples(self) -> int:
        """Returns the number of training examples collected so far."""
        if not os.path.exists(self.path):
            return 0
        try:
            with open(self.path, "r", encoding="utf-8") as f:
                return sum(1 for _ in f)
        except Exception as e:
            log.error(f"Error counting training examples: {e}")
            return 0

    def should_optimize(self, min_examples: int = 10) -> bool:
        """Checks if enough samples are available to trigger prompt optimization."""
        return self.count_examples() >= min_examples

    def load_dataset(self) -> list[dict]:
        """Loads all training examples from the dataset file."""
        if not os.path.exists(self.path):
            return []
        dataset = []
        try:
            with open(self.path, "r", encoding="utf-8") as f:
                for line in f:
                    if line.strip():
                        dataset.append(json.loads(line.strip()))
        except Exception as e:
            log.error(f"Error loading training dataset: {e}")
        return dataset
