"""
Test modality detection specifically for bone/organ images
"""

from services.modality_detector import get_modality_detector
from PIL import Image
import io
import numpy as np

def create_bone_image():
    """Create a realistic bone image (very bright, smooth)"""
    # Very bright background (white)
    img = np.ones((224, 224, 3), dtype=np.uint8) * 240
    
    # Create bone shape (femur-like)
    # Bone is slightly off-white/cream colored
    bone_color = [235, 230, 220]
    
    # Create a long bone shape
    for y in range(40, 200):
        # Shaft of bone (narrow middle part)
        if 60 < y < 180:
            width = 25
        else:
            # Wider at ends (epiphysis)
            width = 35
        
        center_x = 112
        for x in range(center_x - width, center_x + width):
            if 0 <= x < 224:
                # Add slight texture to bone
                noise = np.random.randint(-5, 5)
                img[y, x] = np.clip(np.array(bone_color) + noise, 0, 255)
    
    # Add some bone texture (trabecular pattern at ends)
    for y in range(40, 60):
        for x in range(77, 147):
            if np.random.random() > 0.7:
                img[y, x] = np.clip(img[y, x] - 20, 0, 255)
    
    for y in range(180, 200):
        for x in range(77, 147):
            if np.random.random() > 0.7:
                img[y, x] = np.clip(img[y, x] - 20, 0, 255)
    
    return img

def create_chest_xray():
    """Create a chest X-ray (medium brightness, structured)"""
    # Medium gray background
    img = np.ones((224, 224, 3), dtype=np.uint8) * 100
    
    # Create lung areas (darker)
    y, x = np.ogrid[:224, :224]
    left_lung = ((x - 70)**2 / 40**2 + (y - 112)**2 / 60**2) <= 1
    right_lung = ((x - 154)**2 / 40**2 + (y - 112)**2 / 60**2) <= 1
    
    img[left_lung] = 40
    img[right_lung] = 40
    
    # Add ribs (horizontal lines)
    for i in range(50, 180, 15):
        img[i:i+2, :] = 120
    
    return img

def test_bone_vs_chest():
    """Test that bone images are detected as brain (organ) not chest"""
    detector = get_modality_detector()
    
    print("\n" + "=" * 70)
    print("🦴 BONE IMAGE DETECTION TEST")
    print("=" * 70)
    
    # Test 1: Bone image
    print("\n📸 Test 1: Femur Bone Image")
    print("  Expected: BRAIN (OrganSMNIST includes femur)")
    
    bone_img = create_bone_image()
    pil_img = Image.fromarray(bone_img.astype(np.uint8))
    img_bytes = io.BytesIO()
    pil_img.save(img_bytes, format='PNG')
    
    result = detector.detect_modality(img_bytes.getvalue(), "femur.png")
    
    print(f"  Detected: {result['modality'].upper()} ({result['confidence']:.1%} confidence)")
    print(f"  Result: {'✅ CORRECT' if result['modality'] == 'brain' else '❌ INCORRECT'}")
    print(f"  All scores:")
    for modality, score in sorted(result['all_scores'].items(), key=lambda x: x[1], reverse=True):
        bar = '█' * int(score * 20)
        print(f"    {modality:6s}: {bar:20s} {score:.1%}")
    
    # Test 2: Chest X-ray
    print("\n📸 Test 2: Chest X-Ray Image")
    print("  Expected: CHEST")
    
    chest_img = create_chest_xray()
    pil_img = Image.fromarray(chest_img.astype(np.uint8))
    img_bytes = io.BytesIO()
    pil_img.save(img_bytes, format='PNG')
    
    result = detector.detect_modality(img_bytes.getvalue(), "chest_xray.png")
    
    print(f"  Detected: {result['modality'].upper()} ({result['confidence']:.1%} confidence)")
    print(f"  Result: {'✅ CORRECT' if result['modality'] == 'chest' else '❌ INCORRECT'}")
    print(f"  All scores:")
    for modality, score in sorted(result['all_scores'].items(), key=lambda x: x[1], reverse=True):
        bar = '█' * int(score * 20)
        print(f"    {modality:6s}: {bar:20s} {score:.1%}")
    
    print("\n" + "=" * 70)
    print("💡 Key Differences:")
    print("  Bone Images:  Very bright (>200), smooth, low variance")
    print("  Chest X-Rays: Medium brightness (80-150), structured, moderate variance")
    print("=" * 70 + "\n")

if __name__ == "__main__":
    test_bone_vs_chest()
