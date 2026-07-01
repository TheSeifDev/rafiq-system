"""
Rafiq v4.1 — Motivation Manager
Generates personalized, clinically supportive Arabic reminder messages based on patient mood and streak.
"""
import logging
import random
import os

log = logging.getLogger("rafiq.motivation")

# Handcrafted Arabic templates as robust offline fallbacks
FALLBACK_TEMPLATES = {
    "distressed": [
        "يا {patient_name}، أنا حاسس بيك، بس صحتك أهم حاجة في الدنيا. يلا ناخد جرعة {med_name} علشان نطمن عليك ونبقى أحسن.",
        "سلامتك يا {patient_name}. بلاش نقلق، خطوة بخطوة وصحتنا هترجع تمام. يلا ناخد {med_name} دلوقتي.",
        "أنا جنبك يا {patient_name}. كوباية مية صغيرة وجرعة {med_name} وهنكون أفضل بإذن الله."
    ],
    "sad": [
        "يا {patient_name}، متخليش الزعل ينسيك صحتك. يلا ناخد دواء {med_name} سوا علشان صحتك تنور من تاني.",
        "أنا هنا معاك يا {patient_name} وبشجعك. يلا ناخد جرعتنا من دواء {med_name}، صحتك غالية علينا.",
        "يوم بعد يوم وكل حاجة هتتحسن يا {patient_name}. يلا ناخد دواء {med_name} ونبتسم للحياة."
    ],
    "urgent": [
        "تنبيه هام يا {patient_name}! لازم ناخد دواء {med_name} فوراً لسلامتك وعدم تفويت الجرعة.",
        "عاجل يا {patient_name}: ده موعد جرعة {med_name}، من فضلك التزم بالموعد دلوقتي وصحتك أولاً.",
        "تذكير أخير يا {patient_name}! حان وقت دواء {med_name}. صحتك أمانة ولازم نحافظ عليها دلوقتي."
    ],
    "positive": [
        "عاش جداً يا {patient_name}! إحنا ملتزمين بقالنا {streak} أيام على التوالي! يلا نواصل بالجرعة دي من {med_name}.",
        "صباح النشاط والتفاؤل يا {patient_name}! يوم جديد وجرعة {med_name} في معادها تمام. فخور بالتزامك!",
        "أنت بطل يا {patient_name}، مستمرين في سلسلة الالتزام {streak} أيام! يلا ناخد جرعة {med_name} ونحافظ على Streak."
    ],
    "neutral": [
        "تذكير بموعد دواء {med_name} يا {patient_name}. يلا ناخد الجرعة في معادها لسلامتك.",
        "حان موعد جرعة {med_name} يا {patient_name}. اتفضل جرعتك مع كوباية مية.",
        "يا {patient_name}، موعد {med_name} جه دلوقتي. يلا ناخد الدواء ونكمل يومنا بنشاط."
    ]
}

class MotivationManager:
    """Generates personalized, mood-aware, and streak-aware Arabic reminder messages."""
    
    @staticmethod
    async def generate_message(med_name: str, patient_name: str, 
                               streak: int = 0, mood: str = "neutral", is_urgent: bool = False) -> str:
        """Generates a personalized clinical motivation message."""
        patient_name = patient_name or "المريض"
        mood = mood or "neutral"
        
        # Override mood if urgent
        if is_urgent:
            mood = "urgent"
        elif streak >= 3 and mood in ["neutral", "positive"]:
            mood = "positive"
            
        # Try calling Groq for custom dynamic generation
        groq_api_key = os.environ.get("GROQ_API_KEY", "")
        if groq_api_key:
            try:
                from langchain_groq import ChatGroq
                llm = ChatGroq(model=os.environ.get("RAFIQ_GROQ_CHAT_MODEL", "openai/gpt-oss-120b").strip(), temperature=0.25)
                
                # Context-aware clinical prompt
                prompt = f"""
أنت مساعد طبي ذكي ولطيف (رفيق). اكتب رسالة تذكير قصيرة جداً (سطر واحد فقط) للمريض ليأخذ دوائه.
البيانات المتاحة:
- اسم المريض: {patient_name}
- اسم الدواء: {med_name}
- الحالة النفسية الحالية للمريض: {mood}
- سلسلة الالتزام المتتالية بالجرعات: {streak} أيام

القواعد:
- النبرة: تشجيعية، دافئة، ملائمة تماماً للحالة النفسية (مواساة للمتوتر والحزين، حماسية للملتزم، حازمة وهامة للتنبيه العاجل).
- يجب أن تكون الرسالة باللغة العربية البسيطة والمحببة للمريض (مزيج خفيف من الفصحى المبسطة أو اللهجة المصرية اللطيفة المفهومة).
- لا تزد عن سطر واحد أو جملتين قصيرتين.
- لا تذكر أي تفاصيل طبية معقدة.
"""
                from src.core import privacy
                deidentified_prompt = privacy.deidentify_text(prompt)
                response = await llm.ainvoke(deidentified_prompt)
                content = response.content.strip().replace('"', '').replace("'", "")
                content = privacy.reidentify_text(content)
                if content:
                    log.info(f"Generated dynamic motivation message for {patient_name} (mood: {mood}, streak: {streak}): {content}")
                    return content
            except Exception as e:
                log.warning(f"Failed to generate dynamic motivation message, falling back to templates. Error: {e}")

        # Fallback to predefined templates
        templates = FALLBACK_TEMPLATES.get(mood, FALLBACK_TEMPLATES["neutral"])
        template = random.choice(templates)
        msg = template.format(patient_name=patient_name, med_name=med_name, streak=streak)
        log.info(f"Using fallback template (mood: {mood}, streak: {streak}): {msg}")
        return msg
