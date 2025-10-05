# Install dependencies first:
# pip install ultralytics torch torchvision pillow transformers opencv-python

from ultralytics import YOLO
from PIL import Image
import torch
from transformers import CLIPProcessor, CLIPModel
import cv2
import numpy as np

import os
print("Current working directory:", os.getcwd())

# -------------------------
# Step 1: Load Models
# -------------------------
yolo_model = YOLO("yolov8n.pt")   # Pretrained YOLOv8 nano model
clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")

# -------------------------
# Step 2: Detect Pet with YOLO
# -------------------------
def detect_and_crop(image_path):
    results = yolo_model(image_path)
    r = results[0]

    # Loop through detections and find dogs/cats
    for box, cls in zip(r.boxes.xyxy, r.boxes.cls):
        label = r.names[int(cls)]
        if label in ["dog", "cat"]:
            x1, y1, x2, y2 = map(int, box)
            cropped = Image.open(image_path).crop((x1, y1, x2, y2))
            return label, cropped, (x1, y1, x2, y2)
    return None, None, None

# -------------------------
# Step 3: Classify Mood with CLIP
# -------------------------
def classify_mood(image):
    moods = ["happy", "tired", "playful", "anxious"]
    inputs = clip_processor(
        text=[f"a {m} pet" for m in moods],
        images=image,
        return_tensors="pt",
        padding=True
    )

    with torch.no_grad():
        outputs = clip_model(**inputs)
        logits_per_image = outputs.logits_per_image
        probs = logits_per_image.softmax(dim=1).cpu().numpy()[0]

    best_idx = probs.argmax()
    return moods[best_idx], probs[best_idx]

# -------------------------
# Step 4: Recommend Actions
# -------------------------
def get_recommendation(pet_type, mood):
    rules = {
        ("dog", "happy"): "Take your dog for a walk or play fetch 🎾",
        ("dog", "tired"): "Let your dog rest and provide fresh water 💧",
        ("dog", "playful"): "Engage with toys to burn energy 🐕",
        ("dog", "anxious"): "Check if something is stressing your dog 😟",
        ("cat", "happy"): "Give your cat some toys or treats 🐱✨",
        ("cat", "tired"): "Let your cat nap in a quiet spot 💤",
        ("cat", "playful"): "Play with a laser pointer or string toy 🎯",
        ("cat", "anxious"): "Make sure the environment is calm 🐱😟"
    }
    return rules.get((pet_type, mood), "Keep monitoring your pet.")

# -------------------------
# Step 5: Draw Detection Box with Mood
# -------------------------
def draw_detection_with_mood(image_path, box_coords, pet_type, mood, confidence):
    # Read image with OpenCV
    img = cv2.imread(image_path)
    x1, y1, x2, y2 = box_coords
    
    # Draw bounding box
    cv2.rectangle(img, (x1, y1), (x2, y2), (0, 255, 0), 2)
    
    # Prepare label text
    label = f"{pet_type} - {mood} ({confidence*100:.1f}%)"
    
    # Get text size for background rectangle
    font = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = 0.6
    thickness = 2
    (text_width, text_height), baseline = cv2.getTextSize(label, font, font_scale, thickness)
    
    # Draw background rectangle for text
    cv2.rectangle(img, (x1, y1 - text_height - 10), (x1 + text_width + 10, y1), (0, 255, 0), -1)
    
    # Draw text
    cv2.putText(img, label, (x1 + 5, y1 - 5), font, font_scale, (0, 0, 0), thickness)
    
    return img

# -------------------------
# Step 6: Run Demo
# -------------------------
image_path = "./ML-AI/dog_sample.jpg"   # replace with your test image
pet_type, cropped, box_coords = detect_and_crop(image_path)

if pet_type:
    mood, confidence = classify_mood(cropped)
    rec = get_recommendation(pet_type, mood)

    print(f"Pet detected: {pet_type}")
    print(f"Mood: {mood} ({confidence*100:.1f}% confidence)")
    print(f"Recommendation: {rec}")

    # Draw and display the annotated image
    annotated_img = draw_detection_with_mood(image_path, box_coords, pet_type, mood, confidence)
    
    # Display the image
    cv2.imshow("Pet Mood Detection", annotated_img)
    cv2.waitKey(0)
    cv2.destroyAllWindows()
    
    # Optionally save the annotated image
    #cv2.imwrite("./ML-AI/dog_mood_detected.jpg", annotated_img)
    #print("Annotated image saved as 'dog_mood_detected.jpg'")
    
else:
    print("No pet detected in the image.")