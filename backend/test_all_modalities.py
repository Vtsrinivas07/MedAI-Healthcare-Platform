"""
Comprehensive test for automatic modality detection across all medical image types
"""

from services.modality_detector import get_modality_detector
from PIL import Image
import io
import numpy as np

def create_realistic_test_image(image_type):
    """Create more realistic synthetic medical images"""
    
    if image_type == 'skin':
        # Realistic skin image with lesion
        # Base skin tone (peachy/tan colors)
        img = np.zeros((224, 224, 3), dtype=np.uint8)
        img[:, :, 0] = np.random.randint(180, 220, (224, 224))  # Red channel
        img[:, :, 1] = np.random.randint(140, 180, (224, 224))  # Green channel
        img[:, :, 2] = np.random.randint(120, 160, (224, 224))  # Blue channel
        
        # Add a darker lesion/mole in center
        center_y, center_x = 112, 112
        radius = 20
        y, x = np.ogrid[:224, :224]
        mask = (x - center_x)**2 + (y - center_y)**2 <= radius**2
        img[mask] = [80, 50, 40]  # Dark brown lesion
        
    elif image_type == 'chest':
        # Realistic chest X-ray (grayscale with lung structure)
        gray = np.random.randint(40, 120, (224, 224), dtype=np.uint8)
        
        # Add lung-like structures (darker areas for lungs)
        left_lung = np.zeros((224, 224), dtype=np.uint8)
        right_lung = np.zeros((224, 224), dtype=np.uint8)
        
        # Create oval shapes for lungs
        y, x = np.ogrid[:224, :224]
        left_mask = ((x - 70)**2 / 40**2 + (y - 112)**2 / 60**2) <= 1
        right_mask = ((x - 154)**2 / 40**2 + (y - 112)**2 / 60**2) <= 1
        
        gray[left_mask] = np.random.randint(20, 60, gray[left_mask].shape)
        gray[right_mask] = np.random.randint(20, 60, gray[right_mask].shape)
        
        # Add ribs (horizontal lines)
        for i in range(50, 180, 15):
            gray[i:i+2, :] = np.random.randint(100, 150, (2, 224))
        
        img = np.stack([gray, gray, gray], axis=2)
        
    elif image_type == 'brain':
        # Realistic brain MRI/CT (grayscale with brain structure)
        gray = np.random.randint(30, 100, (224, 224), dtype=np.uint8)
        
        # Create circular brain outline
        y, x = np.ogrid[:224, :224]
        brain_mask = (x - 112)**2 + (y - 112)**2 <= 90**2
        
        # Brain tissue (lighter)
        gray[brain_mask] = np.random.randint(80, 140, gray[brain_mask].shape)
        
        # Add ventricles (darker areas)
        ventricle_mask = (x - 112)**2 + (y - 100)**2 <= 15**2
        gray[ventricle_mask] = np.random.randint(20, 50, gray[ventricle_mask].shape)
        
        # Add some texture
        noise = np.random.randint(-10, 10, (224, 224))
        gray = np.clip(gray + noise, 0, 255).astype(np.uint8)
        
        img = np.stack([gray, gray, gray], axis=2)
        
    elif image_type == 'eye':
        # Realistic OCT scan (layered, darker image)
        img = np.zeros((224, 224, 3), dtype=np.uint8)
        
        # Create layered structure typical of OCT
        for layer in range(0, 224, 30):
            intensity = np.random.randint(40, 120)
            img[layer:layer+20, :, :] = intensity
            
        # Add some color variation
        img[:, :, 0] = np.clip(img[:, :, 0] + np.random.randint(-20, 20, (224, 224)), 0, 255)
        img[:, :, 1] = np.clip(img[:, :, 1] + np.random.randint(-15, 15, (224, 224)), 0, 255)
        img[:, :, 2] = np.clip(img[:, :, 2] + np.random.randint(-10, 10, (224, 224)), 0, 255)
        
        # Add retinal blood vessels (dark lines)
        for i in range(5):
            start_x = np.random.randint(0, 224)
            for y in range(224):
                x = int(start_x + 30 * np.sin(y / 20))
                if 0 <= x < 224:
                    img[y, max(0, x-1):min(224, x+2), :] = [20, 10, 10]
    
    else:
        # Generic image
        img = np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8)
    
    pil_img = Image.fromarray(img.astype(np.uint8))
    
    # Convert to bytes
    img_bytes = io.BytesIO()
    pil_img.save(img_bytes, format='PNG')
    return img_bytes.getvalue()

def test_all_modalities():
    """Test automatic detection for all medical image modalities"""
    detector = get_modality_detector()
    
    print("\n" + "=" * 70)
    print("🏥 AUTOMATIC MEDICAL IMAGE MODALITY DETECTION TEST")
    print("=" * 70)
    print("\nTesting all 4 medical image types:")
    print("  • Skin (Dermatology)")
    print("  • Chest (X-Ray)")
    print("  • Eye (OCT Scan)")
    print("  • Brain (MRI/CT)")
    print("\n" + "-" * 70)
    
    test_cases = [
        ('skin', 'skin_lesion.jpg', '🩺 Dermatology'),
        ('chest', 'chest_xray.png', '🫁 Chest X-Ray'),
        ('brain', 'brain_mri.dcm', '🧠 Brain MRI'),
        ('eye', 'retina_oct.jpg', '👁️ Eye OCT'),
    ]
    
    results = []
    
    for expected_type, filename, description in test_cases:
        print(f"\n{description}")
        print(f"  Filename: {filename}")
        
        # Create realistic test image
        image_bytes = create_realistic_test_image(expected_type)
        
        # Detect modality
        result = detector.detect_modality(image_bytes, filename)
        
        detected = result['modality']
        confidence = result['confidence']
        all_scores = result['all_scores']
        
        # Determine if correct
        is_correct = detected == expected_type
        results.append(is_correct)
        
        # Show results
        print(f"  Expected:  {expected_type.upper()}")
        print(f"  Detected:  {detected.upper()} ({confidence:.1%} confidence)")
        print(f"  Result:    {'✅ CORRECT' if is_correct else '❌ INCORRECT'}")
        
        # Show all scores
        print(f"  Scores:")
        sorted_scores = sorted(all_scores.items(), key=lambda x: x[1], reverse=True)
        for modality, score in sorted_scores:
            bar = '█' * int(score * 20)
            print(f"    {modality:6s}: {bar:20s} {score:.1%}")
    
    # Summary
    print("\n" + "=" * 70)
    accuracy = sum(results) / len(results) * 100
    print(f"📊 RESULTS: {sum(results)}/{len(results)} correct ({accuracy:.0f}% accuracy)")
    print("=" * 70)
    
    if accuracy == 100:
        print("\n🎉 Perfect! All modalities detected correctly!")
    elif accuracy >= 75:
        print("\n✅ Good! Most modalities detected correctly.")
    else:
        print("\n⚠️ Some modalities need improvement.")
    
    print("\n💡 How it works:")
    print("  1. User uploads any medical image")
    print("  2. System analyzes color, texture, and patterns")
    print("  3. Automatically detects: Skin / Chest / Eye / Brain")
    print("  4. Routes to correct disease classification model")
    print("  5. Returns accurate diagnosis")
    print("\n" + "=" * 70 + "\n")

if __name__ == "__main__":
    test_all_modalities()
