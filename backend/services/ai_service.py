from openai import AsyncOpenAI
from typing import List, Tuple, Optional
from datetime import datetime
import io
import os
import logging
import httpx
import asyncio

from config.settings import settings

logger = logging.getLogger(__name__)

class AIService:
    def __init__(self):
        self.provider = settings.AI_PROVIDER.lower()
        logger.info(f"🤖 Initializing AI Service with provider: {self.provider}")
        
        # Initialize the appropriate client based on provider
        self.client = None
        self.model = None
        self.api_key_valid = False
        
        if self.provider == "gemini":
            self._init_gemini()
        elif self.provider == "groq":
            self._init_groq()
        elif self.provider == "huggingface":
            self._init_huggingface()
        elif self.provider == "openai":
            self._init_openai()
        elif self.provider == "ollama":
            self._init_ollama()
        else:
            logger.warning(f"Unknown AI provider: {self.provider}. Defaulting to Gemini.")
            self.provider = "gemini"
            self._init_gemini()
        
        # Initialize optional services
        try:
            from services.rag_service import RAGService
            self.rag_service = RAGService()
            self.rag_enabled = True
        except Exception as e:
            logger.warning(f"RAG service initialization failed: {e}. RAG features will be disabled.")
            self.rag_service = None
            self.rag_enabled = False

    @staticmethod
    def _resize_pil_for_vision(img, max_edge: int = 1280):
        from PIL import Image as PILImage

        w, h = img.size
        if max(w, h) <= max_edge:
            return img
        ratio = max_edge / float(max(w, h))
        new_w = max(1, int(w * ratio))
        new_h = max(1, int(h * ratio))
        try:
            resample = PILImage.Resampling.LANCZOS
        except AttributeError:
            resample = PILImage.LANCZOS
        return img.resize((new_w, new_h), resample)

    async def extract_text_from_image(self, image_bytes: bytes, mime_type: str = "image/jpeg") -> str:
        """OCR / transcribe document-style images using Gemini vision."""
        if settings.GEMINI_API_KEY:
            try:
                from google import genai as google_genai
                from google.genai import types as genai_types
                from PIL import Image

                client = google_genai.Client(api_key=settings.GEMINI_API_KEY)
                vision_model = settings.GEMINI_MODEL or "gemini-2.0-flash"
                if "1.5" in vision_model or "2.5" in vision_model:
                    vision_model = "gemini-2.0-flash"

                img = Image.open(io.BytesIO(image_bytes))
                if img.mode not in ("RGB", "L"):
                    img = img.convert("RGB")
                img = AIService._resize_pil_for_vision(img, max_edge=1600)

                # Convert PIL image to bytes for the new SDK
                buf = io.BytesIO()
                img.save(buf, format="JPEG")
                img_bytes = buf.getvalue()

                prompt = (
                    "Extract all readable text from this image (OCR). "
                    "If it is a lab report, prescription, discharge letter, or form, keep labels and values clear. "
                    "If there is almost no text, briefly describe what is shown in 2-4 sentences."
                )

                response = await asyncio.to_thread(
                    client.models.generate_content,
                    model=vision_model,
                    contents=[
                        genai_types.Part.from_bytes(data=img_bytes, mime_type="image/jpeg"),
                        prompt,
                    ],
                )
                text = (getattr(response, "text", None) or "").strip()
                return text or "[No text returned from vision model]"
            except Exception as exc:
                logger.exception("Gemini image extraction failed: %s", exc)
                error_str = str(exc).lower()
                if "quota" in error_str or "rate limit" in error_str or "429" in error_str:
                    return "[Image extraction failed: Gemini quota exceeded. Please wait or check your API key.]"
                return f"[Image text extraction failed: {str(exc)[:200]}]"

        return ""

    async def describe_image_basic(
        self, image_bytes: bytes, mime_type: str = "image/jpeg", user_question: str = ""
    ) -> str:
        """Describe a medical image using Gemini vision."""
        q = (user_question or "").strip()
        if settings.GEMINI_API_KEY:
            try:
                from google import genai as google_genai
                from google.genai import types as genai_types
                from PIL import Image

                client = google_genai.Client(api_key=settings.GEMINI_API_KEY)
                vision_model = settings.GEMINI_MODEL or "gemini-2.0-flash"
                if "1.5" in vision_model or "2.5" in vision_model:
                    vision_model = "gemini-2.0-flash"

                img = Image.open(io.BytesIO(image_bytes))
                if img.mode not in ("RGB", "L"):
                    img = img.convert("RGB")
                img = AIService._resize_pil_for_vision(img, max_edge=1280)

                buf = io.BytesIO()
                img.save(buf, format="JPEG")
                img_bytes = buf.getvalue()

                prompt = (
                    "You are a medical imaging assistant. Describe this medical image clearly for a healthcare professional. "
                    "Identify visible structures, any abnormalities, patterns, or notable findings. "
                    f"User question: \"{q if q else 'What is this image showing and are there any concerns?'}\" "
                    "Provide a structured response with: 1) Image type, 2) Key findings, 3) Possible concerns, 4) Recommended next steps. "
                    "Keep response under 300 words. Do not give a definitive diagnosis — recommend professional evaluation."
                )

                response = await asyncio.to_thread(
                    client.models.generate_content,
                    model=vision_model,
                    contents=[
                        genai_types.Part.from_bytes(data=img_bytes, mime_type="image/jpeg"),
                        prompt,
                    ],
                )
                return (getattr(response, "text", None) or "").strip()
            except Exception as exc:
                logger.exception("describe_image_basic failed: %s", exc)
                error_str = str(exc).lower()
                if "quota" in error_str or "rate limit" in error_str or "429" in error_str:
                    return "[Vision failed: Gemini quota exceeded. Please wait or check your API key.]"
                elif "api key" in error_str or "unauthorized" in error_str or "403" in error_str:
                    return "[Vision failed: Invalid Gemini API key. Please verify GEMINI_API_KEY.]"
                return f"[Vision call failed: {str(exc)[:200]}]"

        return "[Vision needs GEMINI_API_KEY. Add it to your environment variables.]"
    
    def _init_gemini(self):
        """Initialize Google Gemini (Fast & Free - Highly Recommended)"""
        if settings.GEMINI_API_KEY:
            self.api_key_valid = True
            self.model = settings.GEMINI_MODEL
            logger.info(f"✅ Google Gemini initialized with model: {self.model}")
        else:
            logger.error("❌ Google Gemini API key not configured")
    
    def _init_huggingface(self):
        """Initialize Hugging Face Inference API"""
        if settings.HUGGINGFACE_API_KEY:
            self.api_key_valid = True
            self.model = settings.HUGGINGFACE_MODEL
            logger.info(f"✅ Hugging Face initialized with model: {self.model}")
        else:
            logger.error("❌ Hugging Face API key not configured")
    
    def _init_openai(self):
        """Initialize OpenAI"""
        if settings.OPENAI_API_KEY and settings.OPENAI_API_KEY != "your-openai-api-key-here":
            self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            self.model = settings.OPENAI_MODEL
            self.api_key_valid = True
            logger.info(f"✅ OpenAI initialized with model: {self.model}")
        else:
            logger.error("❌ OpenAI API key not configured")
    
    def _init_groq(self):
        """Initialize Groq API (Ultra Fast & Free)"""
        if settings.GROQ_API_KEY and settings.GROQ_API_KEY != "your-groq-api-key-here":
            self.client = AsyncOpenAI(
                api_key=settings.GROQ_API_KEY,
                base_url="https://api.groq.com/openai/v1"
            )
            self.model = settings.GROQ_MODEL
            self.api_key_valid = True
            logger.info(f"✅ Groq initialized with model: {self.model}")
        else:
            logger.error("❌ Groq API key not configured")

    def _init_ollama(self):
        """Initialize Ollama (Local)"""
        self.client = AsyncOpenAI(
            api_key="ollama",  # Ollama doesn't need API key
            base_url=settings.OLLAMA_BASE_URL + "/v1"
        )
        self.model = settings.OLLAMA_MODEL
        self.api_key_valid = True
        logger.info(f"✅ Ollama initialized with model: {self.model}")
    
    async def get_simple_response(
        self,
        message: str,
        conversation_history: List[dict],
        *,
        max_tokens: int = 250,
        system_prompt: Optional[str] = None,
    ) -> str:
        """Get a simple AI response without RAG"""
        
        # Check if API is configured
        if not self.api_key_valid:
            providers_guide = {
                "gemini": "https://aistudio.google.com/app/apikey (FREE)",
                "groq": "https://console.groq.com/keys (FREE)",
                "huggingface": "https://huggingface.co/settings/tokens (FREE)",
                "openai": "https://platform.openai.com/api-keys (Paid)",
                "ollama": "https://ollama.ai/download (Local - FREE)",
            }
            guide_url = providers_guide.get(self.provider, "")
            
            return (
                f"⚠️ **{self.provider.upper()} Configuration Required**\n\n"
                f"The {self.provider} API is not configured properly.\n\n"
                f"**Get API Key**: {guide_url}\n\n"
                "Switch provider in `backend/.env`:\n"
                "1. Set `AI_PROVIDER=gemini` (or huggingface/openai/ollama)\n"
                "2. Add your API key for that provider\n"
                "3. Restart the backend"
            )
        
        default_system = (
            "You are MedAI, a concise medical assistant. "
            "Reply in under 80 words. Use bullet points only when listing items. "
            "Never repeat yourself. Mention urgent warning signs when relevant. "
            "Do not diagnose or prescribe medications. Be direct and helpful."
        )
        messages = [
            {
                "role": "system",
                "content": system_prompt or default_system,
            }
        ]
        
        # Add conversation history
        for msg in conversation_history[-3:]:
            messages.append({
                "role": msg["role"],
                "content": msg["content"]
            })
        
        # Add current message
        messages.append({
            "role": "user",
            "content": message
        })
        
        try:
            logger.info(f"Calling {self.provider} API for message: {message[:50]}...")
            result = await self._call_provider(messages, temperature=0.1, max_tokens=max_tokens)
            logger.info(f"{self.provider} API response received: {result[:100]}...")
            return result
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"{self.provider} API Error: {error_msg}")
            
            # Provide specific error messages
            if "api key" in error_msg.lower() or "unauthorized" in error_msg.lower():
                return (
                    f"⚠️ **API Key Error ({self.provider})**\n\n"
                    f"The API key for {self.provider} is invalid.\n\n"
                    "Check your configuration in `backend/.env` and restart the server."
                )
            elif "quota" in error_msg.lower() or "rate limit" in error_msg.lower():
                return (
                    f"⚠️ **Rate Limit Exceeded ({self.provider})**\n\n"
                    f"You've exceeded the rate limit for {self.provider}.\n\n"
                    "Try again in a few minutes, or switch to a different provider."
                )
            elif "model" in error_msg.lower():
                return (
                    f"⚠️ **Model Error ({self.provider})**\n\n"
                    f"The model '{self.model}' is not available.\n\n"
                    f"Update the model in `backend/.env` or check the provider's documentation for alternatives."
                )
            elif "connection" in error_msg.lower() and self.provider == "ollama":
                return (
                    "⚠️ **Ollama Not Running**\n\n"
                    "Ollama is not running on your computer.\n\n"
                    "1. Download from: https://ollama.ai/download\n"
                    "2. Run: `ollama serve`\n"
                    "3. Pull model: `ollama pull llama3`\n"
                    "Or switch to a cloud provider (gemini, huggingface, openai)"
                )
            else:
                return (
                    f"⚠️ **API Error**\n\n"
                    f"Error: {error_msg[:300]}\n\n"
                    "Try again or contact administrator."
                )
    
    async def _call_provider(
        self,
        messages: List[dict],
        temperature: float = 0.7,
        max_tokens: int = 1200
    ) -> str:
        """Route to the correct provider API"""
        if self.provider == "gemini":
            return await self._call_gemini(messages, temperature=temperature, max_tokens=max_tokens)
        if self.provider == "huggingface":
            return await self._call_huggingface(messages)
        # OpenAI / Ollama
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens
        )
        return response.choices[0].message.content

    async def _call_gemini(self, messages: List[dict], temperature: float = 0.7, max_tokens: int = 1200) -> str:
        """Call Google Gemini API using the new google-genai SDK"""
        try:
            from google import genai as google_genai
        except ImportError:
            logger.error("google-genai package not installed. Run: pip install google-genai")
            return "Error: google-genai package is required. Run: pip install google-genai"

        client = google_genai.Client(api_key=settings.GEMINI_API_KEY)
        model_name = self.model or "gemini-2.0-flash"
        # Normalize old model names
        if "1.5" in model_name:
            model_name = "gemini-2.0-flash"

        # Build prompt from messages
        system_prompt = ""
        user_message = ""
        for msg in messages:
            if msg["role"] == "system":
                system_prompt = msg["content"]
            elif msg["role"] == "user":
                user_message = msg["content"]
        full_message = f"{system_prompt}\n\nUser: {user_message}" if system_prompt else user_message

        try:
            from google.genai import types as genai_types
            response = await asyncio.to_thread(
                client.models.generate_content,
                model=model_name,
                contents=full_message,
                config=genai_types.GenerateContentConfig(
                    temperature=temperature,
                    max_output_tokens=max_tokens,
                ),
            )
            return (getattr(response, "text", None) or "").strip()
        except Exception as exc:
            last_exc = exc
            error_str = str(exc).lower()
            logger.error("Gemini generate_content failed: %s", exc)
            if "api key" in error_str or "unauthorized" in error_str or "403" in error_str:
                return "⚠️ Gemini API key is invalid or expired. Please check your GEMINI_API_KEY."
            elif "quota" in error_str or "rate limit" in error_str or "429" in error_str:
                return "⚠️ Gemini API quota exceeded. Please wait a few minutes."
            elif "not found" in error_str or "404" in error_str:
                return f"⚠️ Gemini model '{model_name}' not found. Check your GEMINI_MODEL setting."
            return f"[Gemini error: {str(exc)[:200]}]"

    
    async def _call_huggingface(self, messages: List[dict]) -> str:
        """Call Hugging Face Inference API"""
        # Convert messages to prompt
        prompt = self._messages_to_prompt(messages)
        
        url = f"https://api-inference.huggingface.co/models/{self.model}"
        headers = {"Authorization": f"Bearer {settings.HUGGINGFACE_API_KEY}"}
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                url,
                headers=headers,
                json={"inputs": prompt, "parameters": {"max_new_tokens": 1000, "temperature": 0.7}}
            )
            response.raise_for_status()
            result = response.json()
            
            if isinstance(result, list) and len(result) > 0:
                return result[0].get("generated_text", "").replace(prompt, "").strip()
            return str(result)
    
    def _messages_to_prompt(self, messages: List[dict]) -> str:
        """Convert messages to a single prompt string"""
        prompt = ""
        for msg in messages:
            role = msg["role"]
            content = msg["content"]
            if role == "system":
                prompt += f"System: {content}\n\n"
            elif role == "user":
                prompt += f"User: {content}\n\n"
            elif role == "assistant":
                prompt += f"Assistant: {content}\n\n"
        prompt += "Assistant:"
        return prompt
    
    async def get_rag_response(
        self,
        message: str,
        conversation_history: List[dict],
        *,
        max_output_tokens: int = 400,
    ) -> Tuple[str, Optional[List[dict]]]:
        """Get AI response enhanced with RAG (medical knowledge base)"""
        
        # If RAG is not available, fall back to simple response
        if not self.rag_enabled or not self.rag_service:
            logger.info("RAG not available, using simple response")
            response = await self.get_simple_response(
                message,
                conversation_history,
                max_tokens=max(max_output_tokens, 512),
            )
            return response, None
        
        try:
            # Search medical knowledge base
            relevant_docs = await self.rag_service.search_medical_knowledge(message, k=3)
            
            # Build context from retrieved documents
            context = "\n\n".join([
                f"Medical Reference {i+1}:\n{doc['content']}"
                for i, doc in enumerate(relevant_docs)
            ])
            
        except Exception as e:
            logger.warning(f"RAG processing failed: {e}. Falling back to simple response.")
            response = await self.get_simple_response(
                message,
                conversation_history,
                max_tokens=max(max_output_tokens, 512),
            )
            return response, None
        
        doc_style = max_output_tokens >= 1024
        rag_instructions = (
            "You are MedAI. The user may have pasted document text. Give a complete, well-structured answer—do not stop mid-sentence. "
            "Use clear headings and bullets when helpful. Cite abnormal values or concerns from the document when relevant. "
            "Mention urgent warning signs when appropriate. Do not prescribe medications."
            if doc_style
            else
            "You are MedAI. Answer quickly, clearly, and with short sections only when useful. Use the reference info below if it helps. "
            "Be concise and mention urgent warning signs when relevant."
        )
        messages = [
            {
                "role": "system",
                "content": f"{rag_instructions}\n\nMedical References:\n{context}",
            }
        ]
        
        # Add conversation history
        for msg in conversation_history[-3:]:
            messages.append({
                "role": msg["role"],
                "content": msg["content"]
            })
        
        # Add current message
        messages.append({
            "role": "user",
            "content": message
        })
        
        result = await self._call_provider(messages, temperature=0.2, max_tokens=max_output_tokens)
        
        # Prepare sources for citation
        sources = [
            {
                "title": doc.get("title", "Medical Reference"),
                "snippet": doc["content"][:200] + "...",
                "relevance": doc.get("score", 0.0)
            }
            for doc in relevant_docs
        ]
        
        return result, sources
    
    async def generate_health_recommendations(
        self,
        user_message: str,
        user_health_profile: Optional[dict] = None
    ) -> dict:
        """Generate structured health recommendations including medications, meal plans, and self-care"""
        
        profile_context = ""
        if user_health_profile:
            profile_context = f"""
            User Health Profile:
            - Age: {user_health_profile.get('age', 'N/A')}
            - Conditions: {', '.join(user_health_profile.get('conditions', []))}
            - Allergies: {', '.join(user_health_profile.get('allergies', []))}
            - Current Medications: {', '.join(user_health_profile.get('current_medications', []))}
            """
        
        prompt = f"""Based on this health concern: "{user_message}"
        {profile_context}
        
        Generate comprehensive health recommendations in the following JSON format:
        {{
            "medications": [
                {{
                    "name": "Medicine name (OTC only, no prescriptions)",
                    "dosage": "recommended dosage",
                    "frequency": "how often",
                    "duration": "how long to take",
                    "notes": "special instructions"
                }}
            ],
            "meal_plan": {{
                "breakfast": [
                    {{"name": "food item", "calories": 250, "benefits": "why recommended"}}
                ],
                "lunch": [
                    {{"name": "food item", "calories": 400, "benefits": "why recommended"}}
                ],
                "dinner": [
                    {{"name": "food item", "calories": 350, "benefits": "why recommended"}}
                ],
                "snacks": [
                    {{"name": "food item", "calories": 100, "benefits": "why recommended"}}
                ]
            }},
            "self_care": [
                {{
                    "task": "self-care activity",
                    "category": "mental|physical|hydration|health|monitoring",
                    "duration": "time needed",
                    "importance": "why it helps"
                }}
            ],
            "foods_to_avoid": ["food1", "food2"],
            "foods_to_include": ["food1", "food2"],
            "lifestyle_tips": ["tip1", "tip2"],
            "when_to_see_doctor": "specific conditions requiring medical attention"
        }}
        
        Guidelines:
        - Only recommend OTC medications, never prescription drugs
        - Provide realistic, achievable meal plans
        - Include 4-6 self-care tasks
        - Be specific and actionable
        - Consider user's health profile if provided
        """
        
        try:
            messages = [
                {
                    "role": "system",
                    "content": "You are a medical AI assistant that generates structured, actionable health recommendations. Respond with valid JSON only."
                },
                {"role": "user", "content": prompt}
            ]
            raw = await self._call_provider(messages, temperature=0.7)
            
            import json
            # Extract JSON from response
            raw = raw.strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            recommendations = json.loads(raw)
            return recommendations
        except Exception as e:
            logger.error(f"Error generating recommendations: {e}")
            # Return empty structure on error
            return {
                "medications": [],
                "meal_plan": {"breakfast": [], "lunch": [], "dinner": [], "snacks": []},
                "self_care": [],
                "foods_to_avoid": [],
                "foods_to_include": [],
                "lifestyle_tips": [],
                "when_to_see_doctor": "Consult a doctor if symptoms persist or worsen."
            }
