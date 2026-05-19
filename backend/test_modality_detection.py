"""
Test script for automatic modality detection
"""

from services.modality_detector import get_modality_detector
from PIL import Image
import io
import numpy as np

def create_test_image(image_type='skin'):
    """Create a synthetic test image"""
    if image_type == 'skin':
        # Warm tones for skin
        img = np.random.randint(150, 220, (224, 224, 3), dtype=np.uint8)
        img[:, :, 0] = np.random.randint(180, 220, (224, 224))  # More red
        img[:, :, 1] = np.random.randint(120, 180, (224, 224))  # Less green
        img[:, :, 2] = np.random.randint(100, 160, (224, 224))  # Even less blue
    elif image_type == 'chest':
        # Grayscale for X-ray
        gray = np.random.randint(50, 200, (224, 224), dtype=np.uint8)
        img = np.stack([gray, gray, gray], axis=2)
    elif image_type == 'brain':
        # Grayscale for MRI/CT
        gray = np.random.randint(30, 180, (224, 224), dtype=np.uint8)
        img = np.stack([gray, gray, gray], axis=2)
    elif image_type == 'eye':
        # Darker, mixed colors
        img = np.random.randint(50, 150, (224, 224, 3), dtype=np.uint8)
    else:
        img = np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8)
    
    pil_img = Image.fromarray(img)
    
    # Convert to bytes
    img_bytes = io.BytesIO()
    pil_img.save(img_bytes, format='PNG')
    return img_bytes.getvalue()

def test_modality_detection():
    """Test modality detection with synthetic images"""
    detector = get_modality_detector()
    
    test_cases = ['skin', 'chest', 'brain', 'eye']
    
    print("=" * 60)
    print("Testing Automatic Modality Detection")
    print("=" * 60)
    
    for expected_type in test_cases:
        print(f"\n📸 Testing {expected_type.upper()} image:")
        
        # Create test image
        image_bytes = create_test_image(expected_type)
        
        # Detect modality
        result = detector.detect_modality(image_bytes, f"test_{expected_type}.png")
        
        detected = result['modality']
        confidence = result['confidence']
        
        # Show results
        print(f"   Expected: {expected_type}")
        print(f"   Detected: {detected} (confidence: {confidence:.2%})")
        print(f"   Match: {'✅ YES' if detected == expected_type else '❌ NO'}")
        print(f"   All scores: {result['all_scores']}")
    
    print("\n" + "=" * 60)
    print("Test complete!")
    print("=" * 60)

if __name__ == "__main__":
    test_modality_detection()
