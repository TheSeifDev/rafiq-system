import networkx as nx
import logging
import re

log = logging.getLogger("rafiq.graph")

class MedicalKnowledgeGraph:
    """
    A local medical Knowledge Graph using NetworkX.
    Pre-populated with critical clinical facts, drug-drug contraindications, and diet guidelines.
    """
    def __init__(self):
        self.graph = nx.DiGraph()
        self._build_base_graph()

    def _build_base_graph(self):
        # Define base clinical relations: (subject, relation, object)
        # We store relationships in standard terminology.
        relations = [
            # Diabetes
            ("داء السكري", "يتعارض مع", "الكورتيزون"),
            ("داء السكري", "يستلزم", "مراقبة السكر اليومية"),
            ("ميتفورمين", "يعالج", "داء السكري"),
            ("جلوكوفاج", "يعالج", "داء السكري"),
            ("أنسولين", "يعالج", "داء السكري"),
            
            # Hypertension
            ("ارتفاع ضغط الدم", "يتعارض مع", "بروفين"),
            ("ارتفاع ضغط الدم", "يتعارض مع", "أيبوبروفين"),
            ("ارتفاع ضغط الدم", "يتعارض مع", "المسكنات غير الستيرويدية (NSAIDs)"),
            ("ارتفاع ضغط الدم", "يستلزم", "تقليل الملح في الطعام"),
            ("لوسارتان", "يعالج", "ارتفاع ضغط الدم"),
            
            # Warfarin
            ("وارفارين", "يتعارض مع", "أسبرين"),
            ("وارفارين", "يتعارض مع", "السبانخ والأطعمة الغنية بفيتامين K"),
            ("وارفارين", "يتعارض مع", "بروفين"),
            
            # Asthma
            ("مرض الربو الشعبي", "يتعارض مع", "أسبرين"),
            ("مرض الربو الشعبي", "يتعارض مع", "أدوية حاصرات بيتا (Beta Blockers)"),
            
            # Cholesterol
            ("أتورفاستاتين", "يعالج", "ارتفاع الكوليسترول في الدم"),
            ("ليبيتور", "يعالج", "ارتفاع الكوليسترول في الدم"),
            
            # General Symptoms & Treatments
            ("بنادول", "يعالج", "صداع"),
            ("باراسيتامول", "يعالج", "صداع"),
            ("بنادول", "يعالج", "حمى"),
            ("أوجمنتين", "يعالج", "التهاب"),
        ]
        
        for src, rel, dst in relations:
            self.graph.add_edge(src, dst, relation=rel)
            
    def get_related_facts(self, entity: str) -> list[str]:
        """Retrieves direct relations linked to a given entity."""
        facts = []
        entity_lower = entity.lower().strip()
        
        # Exact match or substring match on nodes
        matching_nodes = []
        for node in self.graph.nodes:
            if entity_lower in node.lower() or node.lower() in entity_lower:
                matching_nodes.append(node)
                
        for node in matching_nodes:
            # Outgoing relations (node -> dst)
            for neighbor in self.graph.neighbors(node):
                rel = self.graph[node][neighbor].get("relation", "مرتبط بـ")
                facts.append(f"• {node} {rel} {neighbor}")
            
            # Incoming relations (src -> node)
            for src in self.graph.predecessors(node):
                rel = self.graph[src][node].get("relation", "مرتبط بـ")
                facts.append(f"• {src} {rel} {node}")
                
        return list(set(facts))

    def get_medical_context(self, user_text: str) -> str:
        """
        Scans user query for known clinical entities and returns their graph relations.
        """
        # Try to import processor to extract normalized terminology
        try:
            from src.core.medical_nlp import MedicalTextProcessor, AR_COLLOQUIAL_MAP
            processor = MedicalTextProcessor()
            # Normalize user text first
            normalized_text = processor.normalize_arabic_medical(user_text)
            entities = processor.extract_entities(normalized_text)
            
            # Collect potential search keys
            search_keys = []
            search_keys.extend(entities.get("diseases", []))
            search_keys.extend(entities.get("drugs", []))
            search_keys.extend(entities.get("symptoms", []))
            
            # Also extract Arabic colloquial keys directly if found in user_text
            for colloquial, formal in AR_COLLOQUIAL_MAP.items():
                if colloquial in user_text:
                    search_keys.append(formal)
        except Exception as e:
            log.warning(f"Could not use MedicalTextProcessor for entity lookup: {e}")
            search_keys = []
            
        # Basic word scanning fallback if search_keys is empty
        if not search_keys:
            words = re.findall(r"\w+", user_text)
            search_keys.extend(words)

        all_facts = []
        for key in search_keys:
            if len(key) >= 3: # Skip very short terms
                all_facts.extend(self.get_related_facts(key))
                
        if not all_facts:
            return ""
            
        return "سياق الرسم البياني الطبي (Medical Knowledge Graph):\n" + "\n".join(all_facts)
