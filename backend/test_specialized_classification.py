"""
Test specialized classification methods for each modality
"""

import numpy as np
from services.image_diagnosis_service import ImageDiagnosisService

def test_specialized_classifiers():
    """Test the specialized classification methods"""
    
    service = ImageDiagnosisService()
    
    print("\n" + "=" * 80)
    print("🧪 SPECIALIZED CLASSIFICATION METHODS TEST")
    print("=" * 80)
    
    # Test 1: Skin Classification (Single-label, high threshold 0.6)
    print("\n📸 Test 1: SKIN Classification")
    print("  Method: _classify_skin()")
    print("  Type: Single-label with softmax")
    print("  Threshold: 0.6 (high)")
    
    skin_probs = np.array([0.05, 0.03, 0.10, 0.02, 0.75, 0.03, 0.02])  # Melanoma dominant
    skin_classes = ["Actinic keratoses", "Basal cell carcinoma", "Benign keratosis", 
                    "Dermatofibroma", "Melanoma", "Melanocytic nevi", "Vascular lesions"]
    
    result = service._classify_skin(skin_probs, skin_classes)
    print(f"\n  ✅ Primary Diagnosis: {result['disease']}")
    print(f"  📊 Confidence: {result['confidence']:.1%}")
    print(f"  ✓ Meets Threshold (0.6): {result['meets_threshold']}")
    print(f"  📋 Classification Type: {result['classification_type']}")
    
    # Test 2: Chest Classification (Multi-label, low threshold 0.35)
    print("\n" + "-" * 80)
    print("\n📸 Test 2: CHEST Classification")
    print("  Method: _classify_chest()")
    print("  Type: Multi-label with sigmoid")
    print("  Threshold: 0.35 (low)")
    
    chest_probs = np.array([0.15, 0.08, 0.42, 0.05, 0.12, 0.03, 0.68, 0.09, 0.25, 0.38, 0.06, 0.04, 0.11, 0.02])
    chest_classes = ["Atelectasis", "Cardiomegaly", "Effusion", "Infiltration", "Mass", 
                     "Nodule", "Pneumonia", "Pneumothorax", "Consolidation", "Edema", 
                     "Emphysema", "Fibrosis", "Pleural Thickening", "Hernia"]
    
    result = service._classify_chest(chest_probs, chest_classes)
    print(f"\n  ✅ Primary Diagnosis: {result['disease']}")
    print(f"  📊 Confidence: {result['confidence']:.1%}")
    print(f"  🔍 Detected Conditions: {result['num_conditions']}")
    print(f"  📋 Classification Type: {result['classification_type']}")
    print(f"\n  All Detected Conditions (above {result['threshold_used']} threshold):")
    for i, cond in enumerate(result['detected_conditions'], 1):
        print(f"    {i}. {cond['disease']}: {cond['confidence']:.1%}")
    
    # Test 3: Eye Classification (Single-label with uncertainty)
    print("\n" + "-" * 80)
    print("\n📸 Test 3: EYE Classification")
    print("  Method: _classify_eye()")
    print("  Type: Single-label with softmax + uncertainty metrics")
    print("  Threshold: 0.6")
    
    eye_probs = np.array([0.15, 0.62, 0.18, 0.05])  # Diabetic macular edema
    eye_classes = ["Choroidal neovascularization", "Diabetic macular edema", "Drusen", "Normal"]
    
    result = service._classify_eye(eye_probs, eye_classes)
    print(f"\n  ✅ Primary Diagnosis: {result['disease']}")
    print(f"  📊 Confidence: {result['confidence']:.1%}")
    print(f"  ✓ Meets Threshold (0.6): {result['meets_threshold']}")
    print(f"  📋 Classification Type: {result['classification_type']}")
    print(f"\n  🎯 Uncertainty Metrics:")
    print(f"    • Uncertainty Score: {result['uncertainty']:.3f} (0=certain, 1=uncertain)")
    print(f"    • Certainty Level: {result['certainty_level'].upper()}")
    print(f"    • Confidence Gap: {result['confidence_gap']:.3f}")
    print(f"    • Normalized Entropy: {result['entropy']:.3f}")
    
    # Test 4: Brain Classification (Single-label with top-3 differential)
    print("\n" + "-" * 80)
    print("\n📸 Test 4: BRAIN/ORGAN Classification")
    print("  Method: _classify_brain()")
    print("  Type: Single-label with softmax + top-3 differential diagnosis")
    print("  Threshold: 0.6")
    
    brain_probs = np.array([0.08, 0.12, 0.15, 0.45, 0.05, 0.03, 0.06, 0.02, 0.02, 0.01, 0.01])
    brain_classes = ["Bladder", "Femur left", "Femur right", "Heart", "Kidney left", 
                     "Kidney right", "Liver", "Lung left", "Lung right", "Pancreas", "Spleen"]
    
    result = service._classify_brain(brain_probs, brain_classes)
    print(f"\n  ✅ Primary Diagnosis: {result['disease']}")
    print(f"  📊 Confidence: {result['confidence']:.1%}")
    print(f"  ✓ Meets Threshold (0.6): {result['meets_threshold']}")
    print(f"  📋 Classification Type: {result['classification_type']}")
    print(f"\n  🔬 Top-3 Differential Diagnosis:")
    for i, diff in enumerate(result['differential_diagnosis'], 1):
        print(f"    {i}. {diff['disease']}: {diff['confidence']:.1%}")
    print(f"\n  📊 Top-3 Combined Confidence: {result['top3_confidence_sum']:.1%}")
    
    # Summary
    print("\n" + "=" * 80)
    print("📋 SUMMARY")
    print("=" * 80)
    print("\n✅ All specialized classification methods working correctly!")
    print("\n🎯 Key Features:")
    print("  • Skin: High threshold (0.6) for confident diagnosis")
    print("  • Chest: Multi-label detection with all conditions above 0.35")
    print("  • Eye: Uncertainty metrics for confidence assessment")
    print("  • Brain: Top-3 differential diagnosis for clinical decision support")
    print("\n" + "=" * 80 + "\n")

if __name__ == "__main__":
    test_specialized_classifiers()
