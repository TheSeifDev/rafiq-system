"""
Rafiq v4.2 — ReAct Agent Multi-Agent Medical Consultation System
Uses LangGraph create_react_agent and ChatGroq to dynamically orchestrate medical tools.
"""
import os
import logging
import contextvars
from typing import Any
from src.config import settings

log = logging.getLogger("rafiq.agents")

# Global flag to check if LangGraph is fully functional
LANGGRAPH_AVAILABLE = False
try:
    from langgraph.prebuilt import create_react_agent
    from langchain_groq import ChatGroq
    from langchain_core.tools import tool
    LANGGRAPH_AVAILABLE = True
except ImportError as e:
    log.warning(f"langgraph, langchain-groq, or langchain_core not installed: {e}. Falling back to single-turn LLM.")

# Context variables to hold the current consultation contexts dynamically
patient_context_var = contextvars.ContextVar("patient_context", default="")

# Declare global tools once
if LANGGRAPH_AVAILABLE:
    @tool
    async def retrieve_patient_history() -> str:
        """Retrieve the current medical history, recorded medications, and allergies of the patient."""
        log.info("Tool retrieve_patient_history invoked asynchronously.")
        patient_context = patient_context_var.get()
        return patient_context if patient_context.strip() else "No medical history recorded for the patient."

    @tool
    async def check_drug_interactions(new_drug: str, existing_drugs: list[str]) -> str:
        """
        Check potential drug-drug interactions between a new drug and the patient's existing medication list.
        Inputs:
        - new_drug: The name of the new drug (generic English name preferred, e.g. 'warfarin', 'aspirin').
        - existing_drugs: A list of names of medications the patient is currently taking.
        """
        log.info(f"Tool check_drug_interactions invoked asynchronously with: {new_drug}, {existing_drugs}")
        try:
            from src.services import rxnav_interactions
            # Ensure existing_drugs is a list
            if isinstance(existing_drugs, str):
                existing_drugs = [existing_drugs]
            
            # Check using RxNav API asynchronously
            res = await rxnav_interactions.check_drug_interactions(new_drug, existing_drugs)
            warnings = res.warnings_ar()
            
            # Also check local json as fallback/supplement if possible
            try:
                from src.services.rxnav_interactions import INTERACTION_CHECKER
                local_warnings = INTERACTION_CHECKER.check(new_drug, existing_drugs)
                if local_warnings:
                    warnings.extend(local_warnings)
            except Exception:
                pass
            
            if warnings:
                return "تم رصد التداخلات والتحذيرات التالية:\n" + "\n".join(list(set(warnings)))
            return f"لا توجد تداخلات دوائية معروفة بين {new_drug} والأدوية المحددة."
        except Exception as e:
            log.warning(f"Error checking drug interactions: {e}")
            return "تعذر فحص التداخلات بسبب خطأ فني."

    @tool
    async def query_medical_knowledge_graph(query_term: str) -> str:
        """
        Search the local medical knowledge graph for relationships, food conflicts, or contraindications related to a disease, symptom, or drug.
        Inputs:
        - query_term: The medical term to search for (English or Arabic, e.g., 'diabetes' or 'warfarin').
        """
        log.info(f"Tool query_medical_knowledge_graph invoked asynchronously with: {query_term}")
        try:
            from src.database.medical_knowledge_graph import MedicalKnowledgeGraph
            mkg = MedicalKnowledgeGraph()
            ctx = mkg.get_medical_context(query_term)
            return ctx if ctx else f"No registered relations found for term '{query_term}' in knowledge graph."
        except Exception as e:
            log.warning(f"Error querying medical knowledge graph: {e}")
            return "تعذر الاستعلام من الرسم البياني الطبي."

    @tool
    async def validate_with_guardrails(draft_response: str) -> str:
        """
        Validate the final drafted Arabic response against clinical safety guidelines (no exact dosages, no definitive diagnoses).
        Inputs:
        - draft_response: The draft response text proposed for the patient (in Arabic).
        """
        log.info("Tool validate_with_guardrails invoked asynchronously.")
        try:
            from src.core.medical_guardrails import MedicalGuardrails
            guard = MedicalGuardrails()
            safe, reason = guard.validate(draft_response)
            if not safe:
                return f"تنبيه أمان: المسودة تحتوي على مخالفة للتعليمات الطبية: {reason}. يرجى إعادة صياغتها لتكون آمنة."
            return "المسودة آمنة ومطابقة للتعليمات الطبية."
        except Exception as e:
            return "تعذر تشغيل الفحص الأمني."

    GLOBAL_MEDICAL_TOOLS = [
        retrieve_patient_history,
        check_drug_interactions,
        query_medical_knowledge_graph,
        validate_with_guardrails
    ]
else:
    GLOBAL_MEDICAL_TOOLS = []

def _get_relevant_drug_terms(query: str) -> str:
    """Filters the bilingual drug map and returns only terms relevant to the user query to save tokens."""
    try:
        from src.core.medical_nlp import AR_DRUG_MAP
        query_lower = query.lower()
        relevant = {}
        for ar_term, en_term in AR_DRUG_MAP.items():
            if ar_term in query_lower or en_term.lower() in query_lower:
                relevant[ar_term] = en_term
                
        if not relevant:
            # Fallback: return the first 15 most common terms
            common_keys = list(AR_DRUG_MAP.keys())[:15]
            relevant = {k: AR_DRUG_MAP[k] for k in common_keys}
            
        table_rows = [f"| {ar} | {en} |" for ar, en in relevant.items()]
        return "\n".join(table_rows)
    except Exception:
        return ""

def _build_bilingual_instruction(query: str) -> str:
    drug_table = _get_relevant_drug_terms(query)
    if not drug_table:
        return ""
    return f"""
=========================================
BILINGUAL DRUG GLOSSARY (مسرد الأدوية ثنائي اللغة):
When calling tools, you MUST map these Arabic drug names to their English generic terms:

| Arabic Name | English Name |
|-------------|--------------|
{drug_table}

=========================================
"""

_GLOBAL_LLM = None

def get_global_llm():
    global _GLOBAL_LLM
    if _GLOBAL_LLM is None and LANGGRAPH_AVAILABLE:
        try:
            if not os.environ.get("GROQ_API_KEY", "").strip():
                raise ValueError("GROQ_API_KEY is not configured.")
            model_name = settings.GROQ_CHAT_MODEL or "llama-3.3-70b-versatile"
            _GLOBAL_LLM = ChatGroq(model=model_name, temperature=0.15)
        except Exception as e:
            log.warning(f"Failed to initialize ChatGroq for ReAct agent: {e}. ReAct agent will not be used.")
            _GLOBAL_LLM = None
    return _GLOBAL_LLM

async def run_medical_consultation(query: str, who_evidence: str, patient_context: str = "", doctor_rules: str = "", sentiment: str = "neutral", chat_history: list = None, on_token_callback=None, session_id: str | None = None) -> str:
    """
    Executes a dynamic ReAct Agent consultation utilizing medical tools:
    - retrieve_patient_history
    - check_drug_interactions
    - query_medical_knowledge_graph
    - validate_with_guardrails
    """
    from src.core import privacy
    from src.utils.observability import session_id_var
    import uuid
    sess_id = session_id or session_id_var.get()
    if not sess_id or sess_id == "-":
        sess_id = f"anon_{uuid.uuid4().hex[:12]}"
    session_id_var.set(sess_id)

    query = privacy.deidentify_text(query, session_id=sess_id)
    who_evidence = privacy.deidentify_text(who_evidence, session_id=sess_id)
    patient_context = privacy.deidentify_text(patient_context, session_id=sess_id)
    doctor_rules = privacy.deidentify_text(doctor_rules, session_id=sess_id)

    if not LANGGRAPH_AVAILABLE or get_global_llm() is None:
        log.warning("LangGraph not available or ChatGroq failed to initialize, running single-turn fallback...")
        return await _run_single_turn_fallback(query, who_evidence, patient_context, doctor_rules, sentiment, chat_history, on_token_callback)

    try:
        # Set the context variable so retrieve_patient_history can access it
        token_reset = patient_context_var.set(patient_context)

        # Get the globally defined LLM
        llm = get_global_llm()

        has_who_context = bool(who_evidence and who_evidence.strip())

        triage_instructions = """
Clinical Triage Guidelines (إرشادات الفحص والفرز الطبي التفاعلي):
- When receiving a complaint about a common symptom (such as headache), do not just give simple advice. Consider all possibilities: from simple causes (dehydration, lack of sleep, eye strain) to critical/life-threatening conditions (brain tumor/cancer, stroke, cerebral hemorrhage).
- Converse with the patient as a cautious, empathetic, and professional consultant, exploring the case fully without inducing unnecessary panic.
- Ask gradual, targeted questions (maximum 1-2 questions per turn to avoid overwhelming the patient) to explore associated symptoms: patient age, onset, pattern of the headache (sudden and severe vs. gradually worsening over weeks), location of pain, and presence of neurological/visual flags (blurred vision, morning vomiting, weakness or speech difficulties, numbness, seizures, personality changes) or recent head trauma.
- Monitor patient answers: if they report symptoms matching "Red Flags" for structural brain issues:
  1. Warmly and professionally caution them that these symptoms warrant prompt medical evaluation to rule out structural/neurological issues. Do NOT give a definitive diagnosis of "brain cancer", but suggest evaluation to rule out structural causes.
  2. Urgent advice: urge them to consult a neurologist immediately and get diagnostic imaging like MRI and a fundoscopy.
- If symptoms are typical with no red flags, reassure the patient and offer supportive hygiene/lifestyle advice (adequate hydration, rest, early sleep, etc.).
"""

        # ReAct system prompt guiding tool usage under Bilingual Reasoning Protocol
        system_prompt = f"""
You are a highly capable and intelligent medical consultant assistant named "Rafiq" (رفيق).

=========================================
BILINGUAL REASONING PROTOCOL (CRITICAL):
1. You MUST perform all internal reasoning, Chain of Thought (CoT), planning, and tool calls EXCLUSIVELY in English.
2. When calling tools, use English parameters and generic drug names (e.g. use 'warfarin' instead of 'وارفارين', 'aspirin' instead of 'أسبرين' for check_drug_interactions). This prevents LLaMA model JSON parsing and character encoding looping errors.
3. The ONLY exception is when calling `validate_with_guardrails`, where you must pass the drafted Arabic response.
4. The final text response returned to the patient MUST be written entirely in Arabic.
=========================================

Current patient medical history and previous complaints:
---
{patient_context}
---

Medical History Integration Rule:
- Review the patient context above.
- If the patient complains of a symptom that is already recorded in their history, you MUST explicitly acknowledge the previous occurrence and its date/time in the opening of your response in Arabic (e.g., "أرى أنك اشتكيت من صداع يوم الخميس الماضي..." or "سلامتك، ألاحظ أنك عانيت من صداع قبل أيام...") to show continuity of care.
"""
        if has_who_context:
            system_prompt += f"""
Approved Medical Evidence from the World Health Organization (WHO):
---
{who_evidence}
---
"""
        else:
            system_prompt += """
Important Note (No specific WHO evidence available for this query):
- Do NOT prescribe or describe any direct medical treatment, medications, or specific dosages.
- Instead, kindly welcome the patient, reassure them, and provide only safe, supportive, and hygiene advice (hydration, rest, light meal, reducing screens, early sleep).
- Ask clarifying questions to understand the situation better (age, duration, exact location, associated symptoms like fever or nausea, recent trauma).
- Clearly explain the urgent warning symptoms (Red Flags) that require immediate emergency care.
"""

        system_prompt += triage_instructions

        # Inject the bilingual drug glossary reference dynamically
        glossary_instruction = _build_bilingual_instruction(query)
        system_prompt += glossary_instruction

        system_prompt += f"""
Previous Doctor Preferences & Custom Rules to respect:
---
{doctor_rules}
---

Patient's Query: "{query}"

Please process the query efficiently:
- You already have the patient context, history, and WHO evidence directly in this prompt. You do NOT need to call `retrieve_patient_history` or `query_medical_knowledge_graph` unless you need details not present. If you can answer using the provided prompt context, do so immediately and directly in 1 turn without tool calls.
- ONLY call `check_drug_interactions` if the user is asking about a new medication to check compatibility.
- Draft the clinical response in Arabic based on the evidence, history, and guidelines, conforming to strict safety rules:
     - Avoid definitive diagnosis (do not say "أنت مصاب بـ" or "لديك مرض كذا").
     - Do NOT specify exact dosages in milligrams, milliliters, or pill counts. Avoid words like: ملغ, مل, مجم, جرام, حبة, حبتين, قرص, قرصين, جرعة. Use neutral phrasing like 'التعليمات المرفقة', 'إرشادات العبوة', 'استشارة الطبيب/الصيدلي'.
     - Do not recommend stopping or changing medication without consulting their doctor.
     - CRITICAL: Do NOT write any generic medical disclaimers, warnings, or WHO source links at the end of the text. These are already hardcoded and statically displayed in the user interface (GUI). Keep your output direct, concise, and focused.
     {"- Do not invent medical facts or statistics not present in the WHO evidence." if has_who_context else "- Do not prescribe treatment; limit response to general advice, questions, and emergency warnings."}
- Call `validate_with_guardrails` ONLY if you have drafted a complex response to verify its safety. Otherwise, present your final response directly.

Finally, present your validated medical response in a warm, professional Arabic tone.
"""

        # Tone adaptation guidelines
        if sentiment in ("distressed", "urgent"):
            system_prompt += "\nتنبيه هام جداً حول نبرة الرد: المريض يعاني من حالة توتر أو ألم أو حالة عاجلة. يجب أن تكون صياغتك غاية في التعاطف والرحمة والمواساة، وطمئن المريض بهدوء ووضوح شديد، وتجنب أي لغة قد تزيد من قلقه."
        elif sentiment == "positive":
            system_prompt += "\nتنبيه حول نبرة الرد: المريض في حالة إيجابية أو ودية. كن ودوداً ولطيفاً ومبتسماً في صياغة ردودك."

        # Build ReAct agent using prebuilt create_react_agent
        agent = create_react_agent(llm, GLOBAL_MEDICAL_TOOLS, prompt=system_prompt)
        
        # Invoke agent
        messages = []
        if chat_history:
            for msg in chat_history:
                role = msg.get("role")
                content = msg.get("content")
                if role in ("user", "assistant") and content:
                    messages.append((role, privacy.deidentify_text(content, session_id=sess_id)))
        messages.append(("user", query))
        inputs = {"messages": messages}
        
        final_ans = ""
        try:
            async for chunk, metadata in agent.astream(inputs, stream_mode="messages"):
                if metadata.get("langgraph_node") == "agent":
                    token = chunk.content
                    if token:
                        final_ans += token
                        if on_token_callback:
                            await on_token_callback(token)
            if not final_ans:
                raise RuntimeError("Empty stream output from agent.")
        except Exception as e:
            log.warning(f"astream failed: {e}. Falling back to ainvoke.")
            result = await agent.ainvoke(inputs)
            messages_out = result.get("messages", [])
            if messages_out:
                final_ans = messages_out[-1].content
        
        from src.core import privacy
        return privacy.reidentify_text(final_ans, session_id=sess_id)

    except Exception as e:
        log.error(f"Error executing ReAct agent: {e}", exc_info=True)
        return await _run_single_turn_fallback(query, who_evidence, patient_context, doctor_rules, sentiment, chat_history, on_token_callback, session_id=sess_id)
    finally:
        if LANGGRAPH_AVAILABLE:
            patient_context_var.reset(token_reset)

async def _run_single_turn_fallback(query: str, who_evidence: str, patient_context: str, doctor_rules: str, sentiment: str = "neutral", chat_history: list = None, on_token_callback=None, session_id: str | None = None) -> str:
    """Fallback LLM mechanism when LangGraph fails."""
    from src.utils.observability import session_id_var
    import uuid
    sess_id = session_id or session_id_var.get()
    if not sess_id or sess_id == "-":
        sess_id = f"anon_{uuid.uuid4().hex[:12]}"
    try:
        from src.services.llm_client import GLOBAL_LLM_CLIENT
        has_who_context = bool(who_evidence and who_evidence.strip())
        triage_instructions = """
إرشادات الفحص والفرز الطبي التفاعلي (Clinical Triage Guidelines):
- عند تلقي شكوى من عَرَض شائع (مثل الصداع)، يجب عليك ألا تكتفي بتقديم نصائح بسيطة، بل افترض جميع الاحتمالات الممكنة؛ بدءاً من الأسباب البسيطة (مثل الجفاف، قلة النوم، أو الإجهاد) ووصولاً إلى الاحتمالات الخطيرة جداً التي قد تهدد الحياة (مثل ورم الدماغ/سرطان المخ، السكتة الدماغية، أو نزيف الدماغ).
- تفاعل مع المريض كطبيب حذر واستشاري يسعى لاستكشاف الحالة بشكل كامل ودقيق دون ترهيب المريض.
- اطرح أسئلة استيضاحية ذكية وتدريجية (1-2 أسئلة في الرد الواحد كحد أقصى لتجنب إرهاق المريض) لاستكشاف الأعراض المصاحبة. اسأل عن: عمر المريض، نمط الصداع وبدايته وتطوره (هل هو مفاجئ وحاد، أم يزداد سوءاً بشكل مستمر عبر الأسابيع)، موقعه الدقيق، وجود أعراض عصبية أو بصرية مصاحبة (مثل: زغللة العين أو اضطراب الرؤية، الغثيان أو القيء المتكرر وخاصة في الصباح الباكر عند الاستيقاظ، ثقل في الحركة أو صعوبة النطق، خدر أو تنميل في الأطراف، نوبات تشنجية، أو تغيرات في السلوك والشخصية)، أو التعرض لإصابة حديثة في الرأس.
- راقب إجابات المريض بدقة: إذا ذكر المريض في سياق المحادثة أي أعراض تتوافق مع "علامات الخطورة" لمرض خطير (مثل صداع مزمن يزداد سوءاً ومصحوب بقيء صباحي وزغللة في العين)، قم بما يلي:
  1. نبه المريض بلطف وبنبرة مطمئنة ومهنية أن هذه الأعراض قد تشير إلى احتمالية وجود مشكلة بنيوية في المخ تحتاج لتقييم عاجل (دون تشخيص جازم ومباشر بـ "سرطان المخ"، بل قل مثلاً: "هذه الأعراض تستدعي الفحص الطبي الدقيق لاستبعاد أي مشاكل بنيوية في المخ").
  2. انصحه بوضوح وإلحاح بضرورة استشارة طبيب مخ وأعصاب فوراً، وإجراء الفحوصات الطبية اللازمة مثل أشعة الرنين المغناطيسي (MRI) وفحص قاع العين.
- إذا كانت الأعراض عادية وتشير لصداع بسيط بدون أي علامات خطورة عصبية، طمئن المريض وقدم له النصائح العامة (شرب الماء الكافي، أخذ قسط من الراحة، النوم المبكر، إلخ).
"""
        prompt = f"""
أنت طبيب استشاري ذكي ومساعد طبي مخصص لنظام "رفيق".
"""
        if has_who_context:
            prompt += f"""
سياق منظمة الصحة العالمية (WHO):
{who_evidence}
"""
        else:
            prompt += """
تنبيه هام (لا تتوفر أدلة محددة من منظمة الصحة العالمية لهذا السؤال بالذات):
- لا تصف أي علاج طبي مباشر أو أدوية أو جرعات.
- بدلاً من ذلك، رحب بالمريض بلطف وطمأنه، وقدم له نصائح وإرشادات عامة وآمنة فقط (مثل: شرب الماء، الراحة، تقليل استخدام الشاشات، النوم المبكر).
- اطرح أسئلة استيضاحية هامة لتفهم الحالة (العمر، مدة العَرَض، مكان الألم، الأعراض المصاحبة كالحمى أو الدوخة أو الغثيان، وجود إصابة مؤخراً).
- وضح للمريض الأعراض التحذيرية الخطيرة التي تستدعي الرعاية الطبية الفورية فوراً.
"""

        if chat_history:
            prompt += "\nسياق المحادثة الطبية السابقة:\n"
            for msg in chat_history:
                role_label = "المريض" if msg["role"] == "user" else "المساعد الطبي"
                prompt += f"{role_label}: {privacy.deidentify_text(msg['content'], session_id=sess_id)}\n"

        prompt += triage_instructions

        prompt += f"""
تاريخ المريض الطبي الحالي وشكاواه السابقة:
{patient_context}

تعليمات هامة حول التاريخ الطبي:
- يجب عليك مراجعة تاريخ المريض الطبي وشكاواه السابقة المذكورة أعلاه.
- إذا اشتكى المريض من عَرَض صحي مسجل مسبقاً في تاريخه الطبي (مثل الصداع)، يجب عليك الإشارة إلى الشكوى السابقة والتاريخ واليوم أو الوقت الذي حدثت فيه صراحةً في أول ردك لطمأنته ومتابعة حالته بشكل مستمر (مثال: "أرى أنك اشتكيت من صداع يوم الخميس الماضي..." أو "سلامتك، ألاحظ أنك عانيت من صداع قبل أيام...").


تفضيلات الأطباء:
{doctor_rules}

سؤال المريض:
{query}

الإجابة الطبية النهائية (مع الالتزام بعدم التشخيص الجازم أو تحديد جرعات، وتجنب تماماً كلمات مثل ملغ، مل، مجم، جرام، حبة، قرص، جرعة، جرعات، وعدم إضافة أي تذييلات (Disclaimers) أو تحذيرات طبية عامة أو روابط WHO في نهاية إجابتك لأنها معروضة بالفعل للمريض في واجهة المستخدم):
"""
        if sentiment in ("distressed", "urgent"):
            prompt += "\nتنبيه هام جداً حول نبرة الرد: المريض يعاني من حالة توتر أو ألم أو حالة عاجلة. يجب أن تكون صياغتك غاية في التعاطف والرحمة والمواساة، وطمئن المريض بهدوء."
        elif sentiment == "positive":
            prompt += "\nتنبيه حول نبرة الرد: المريض في حالة إيجابية أو ودية. كن ودوداً ولطيفاً."
            
        # Add the glossary to the fallback prompt
        glossary_instruction = _build_bilingual_instruction(query)
        prompt += glossary_instruction

        messages = [{"role": "user", "content": prompt}]
        log.warning("Medical consultation falling back to degraded single-turn mode via GLOBAL_LLM_CLIENT.")

        from src.core import privacy
        if on_token_callback:
            res_text = ""
            async for token in GLOBAL_LLM_CLIENT.generate_stream(messages, temp=0.15):
                if token:
                    res_text += token
                    await on_token_callback(token)
            return privacy.reidentify_text(res_text, session_id=sess_id)
        else:
            res_text = await GLOBAL_LLM_CLIENT.generate(messages, temp=0.15)
            return privacy.reidentify_text(res_text, session_id=sess_id)
    except Exception as e:
        log.error(f"Fallback LLM execution failed: {e}")
        return "عذراً، لم نتمكن من تشغيل الاستشارة الطبية حالياً."

# Mock/Compatibility placeholder for testing
def get_medical_graph():
    """Dummy return for backward compatibility test verification."""
    if LANGGRAPH_AVAILABLE:
        class DummyGraph:
            def invoke(self, inputs):
                return {"final_answer": "إجابة اختبار"}
        return DummyGraph()
    return None
