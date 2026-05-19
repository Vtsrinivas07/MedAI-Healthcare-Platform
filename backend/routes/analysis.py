from fastapi import APIRouter, Depends, HTTPException, status
from config.database import get_database
from middleware.auth import get_current_user
from services.ai_service import AIService

router = APIRouter()

ai_service: AIService | None = None
health_analytics = None


def get_ai_service() -> AIService:
    global ai_service
    if ai_service is None:
        ai_service = AIService()
    return ai_service


def get_health_analytics():
    global health_analytics
    if health_analytics is None:
        from services.health_analytics import HealthAnalyticsService

        health_analytics = HealthAnalyticsService()
    return health_analytics

@router.post("/image")
async def analyze_image(
    request: dict,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Analyze a medical image using AI (accepts image_url or description)"""
    try:
        image_url = request.get("image_url")
        description = request.get("description", "")
        analysis_type = request.get("type", "general")  # skin, xray, report, general

        if not image_url and not description:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="image_url or description is required"
            )

        type_labels = {
            "skin": "skin condition or rash",
            "xray": "medical X-ray or scan",
            "report": "medical test report",
            "general": "medical image",
        }
        label = type_labels.get(analysis_type, "medical image")

        if image_url:
            prompt = (
                f"A patient has shared a {label} for analysis (URL: {image_url}). "
                f"Additional context: {description}\n\n"
                "Provide a preliminary assessment covering:\n"
                "1. Possible conditions the image may indicate\n"
                "2. Recommended next steps\n"
                "3. Urgency level (routine / soon / urgent)\n"
                "Emphasise that professional evaluation is required."
            )
        else:
            prompt = (
                f"A patient has described their {label}: {description}\n\n"
                "Provide a preliminary assessment covering:\n"
                "1. Possible conditions based on the description\n"
                "2. Recommended next steps\n"
                "3. Urgency level (routine / soon / urgent)\n"
                "Emphasise that professional evaluation is required."
            )

        analysis = await get_ai_service().get_simple_response(
            message=prompt,
            conversation_history=[]
        )

        return {
            "success": True,
            "data": {
                "analysis": analysis,
                "analysis_type": analysis_type,
                "disclaimer": "This is a preliminary AI assessment. Please consult a qualified healthcare professional for proper diagnosis and treatment."
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error analyzing image: {str(e)}"
        )

@router.post("/symptoms")
async def analyze_symptoms(
    request: dict,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Analyze symptoms using AI"""
    try:
        symptoms = request.get("symptoms", [])
        
        if not symptoms:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Symptoms are required"
            )
        
        # Use AI service to analyze symptoms
        prompt = f"Analyze these symptoms and provide general medical guidance (not a diagnosis): {', '.join(symptoms)}"
        
        response = await get_ai_service().get_simple_response(
            message=prompt,
            conversation_history=[]
        )
        
        return {
            "success": True,
            "data": {
                "analysis": response,
                "symptoms": symptoms,
                "disclaimer": "This is not a medical diagnosis. Please consult a healthcare professional."
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error analyzing symptoms: {str(e)}"
        )

@router.get("/health-trends")
async def get_health_trends(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get health trends analysis for user"""
    try:
        # Get user's health logs
        cursor = db.health_logs.find({"user_id": str(current_user["_id"])}).sort("date", -1).limit(30)
        logs = await cursor.to_list(length=30)
        
        if not logs:
            return {
                "success": True,
                "data": {
                    "message": "No health data available",
                    "trends": []
                }
            }
        
        # Use health analytics service
        trends = await get_health_analytics().analyze_health_data(logs)
        
        return {
            "success": True,
            "data": trends
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error analyzing health trends: {str(e)}"
        )
