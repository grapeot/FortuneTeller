#!/usr/bin/env python3
"""
Standalone face measurement visualization tool.

Visualizes 5 key facial measurements:
1. 三停比例 (Three Divisions)
2. 印堂宽度 (Glabella Width)
3. 田宅宫 (Eyebrow-Eye Distance)
4. 颧骨突出度 (Cheekbone Prominence)
5. 鼻翼宽度 (Nose Wing Width)

Usage:
    python tools/visualize_face.py <image_path> [--output <output_path>]
"""

import argparse
import sys
import urllib.request
from pathlib import Path

try:
    import cv2
    import numpy as np
    import mediapipe as mp
    from mediapipe.tasks import python
    from mediapipe.tasks.python import vision
    from PIL import Image, ImageDraw, ImageFont
except ImportError as e:
    print(f"Error: Missing required package: {e}", file=sys.stderr)
    print("Please install: pip install opencv-python mediapipe pillow", file=sys.stderr)
    sys.exit(1)


# MediaPipe landmark indices (matching face-annotator.js)
LM = {
    "foreheadTop": 10,
    "foreheadMid": 151,
    "glabella": 9,
    "noseBridgeTop": 6,
    "noseTip": 1,
    "noseBottom": 2,
    "leftNoseWing": 48,
    "rightNoseWing": 278,
    "leftEyeOuter": 33,
    "leftEyeInner": 133,
    "rightEyeOuter": 362,
    "rightEyeInner": 263,
    "leftEyeTop": 159,
    "leftEyeBottom": 145,
    "rightEyeTop": 386,
    "rightEyeBottom": 374,
    "leftBrowInner": 70,
    "leftBrowOuter": 107,
    "leftBrowPeak": 105,
    "rightBrowInner": 300,
    "rightBrowOuter": 336,
    "rightBrowPeak": 334,
    "upperLip": 13,
    "lowerLip": 14,
    "lipTop": 0,
    "lipBottom": 17,
    "chin": 152,
    "leftCheekbone": 234,
    "rightCheekbone": 454,
    "leftJaw": 172,
    "rightJaw": 397,
    "leftTemple": 54,
    "rightTemple": 284,
    "philtrum": 164,
}

# Colors
GOLD = (255, 215, 0)
GOLD_DIM = (255, 215, 0, 153)  # 60% opacity
BLACK_BG = (0, 0, 0, 166)  # 65% opacity
WHITE = (255, 255, 255)


def dist(a, b):
    """Calculate Euclidean distance between two points."""
    return np.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2)


def get_point(landmarks, idx, width, height):
    """Get pixel coordinates from normalized landmark."""
    return (int(landmarks[idx].x * width), int(landmarks[idx].y * height))


def get_model_path():
    """Get or download the MediaPipe face landmarker model."""
    model_url = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
    cache_dir = Path.home() / ".cache" / "mediapipe"
    cache_dir.mkdir(parents=True, exist_ok=True)
    model_path = cache_dir / "face_landmarker.task"
    
    if not model_path.exists():
        print(f"Downloading MediaPipe face landmarker model...")
        urllib.request.urlretrieve(model_url, model_path)
        print(f"✓ Model downloaded to {model_path}")
    
    return str(model_path)


def detect_landmarks(image_path):
    """Detect face landmarks using MediaPipe."""
    # Read image
    image = cv2.imread(str(image_path))
    if image is None:
        raise ValueError(f"Could not read image: {image_path}")
    
    height, width = image.shape[:2]
    
    # Convert BGR to RGB
    rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    
    # Get model path (download if needed)
    model_path = get_model_path()
    
    # Initialize MediaPipe FaceLandmarker
    base_options = python.BaseOptions(model_asset_path=model_path)
    options = vision.FaceLandmarkerOptions(
        base_options=base_options,
        output_face_blendshapes=False,
        running_mode=vision.RunningMode.IMAGE,
        num_faces=1,
    )
    detector = vision.FaceLandmarker.create_from_options(options)
    
    # Create MediaPipe image
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_image)
    
    # Detect landmarks
    detection_result = detector.detect(mp_image)
    
    if not detection_result.face_landmarks or len(detection_result.face_landmarks) == 0:
        raise ValueError("No face detected in image")
    
    landmarks = detection_result.face_landmarks[0]
    return landmarks, width, height


def visualize_santing(draw, landmarks, width, height, font):
    """Visualize 三停比例 (Three Divisions)."""
    # Get key points
    forehead_y = landmarks[LM["foreheadTop"]].y * height
    brow_y = (landmarks[LM["leftBrowPeak"]].y + landmarks[LM["rightBrowPeak"]].y) / 2 * height
    nose_bottom_y = landmarks[LM["noseBottom"]].y * height
    chin_y = landmarks[LM["chin"]].y * height
    
    # Calculate divisions
    upper = brow_y - forehead_y
    middle = nose_bottom_y - brow_y
    lower = chin_y - nose_bottom_y
    total = upper + middle + lower
    
    upper_pct = int((upper / total) * 100)
    middle_pct = int((middle / total) * 100)
    lower_pct = 100 - upper_pct - middle_pct
    
    # Draw division lines (dashed)
    line_margin = width * 0.1
    dash_length = 8
    gap_length = 4
    
    # Upper/Middle boundary
    x = line_margin
    while x < width - line_margin:
        draw.line([(x, brow_y), (min(x + dash_length, width - line_margin), brow_y)], fill=GOLD, width=2)
        x += dash_length + gap_length
    
    # Middle/Lower boundary
    x = line_margin
    while x < width - line_margin:
        draw.line([(x, nose_bottom_y), (min(x + dash_length, width - line_margin), nose_bottom_y)], fill=GOLD, width=2)
        x += dash_length + gap_length
    
    # Draw labels on right side
    label_x = width - 20
    
    def draw_label(text, y_pos):
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        bg_x = label_x - text_width - 8
        bg_y = y_pos - text_height // 2 - 4
        draw.rectangle([bg_x - 4, bg_y, label_x + 4, bg_y + text_height + 8], fill=BLACK_BG)
        draw.text((bg_x, bg_y + 4), text, fill=GOLD, font=font)
    
    draw_label(f"上庭 {upper_pct}%", (forehead_y + brow_y) / 2)
    draw_label(f"中庭 {middle_pct}%", (brow_y + nose_bottom_y) / 2)
    draw_label(f"下庭 {lower_pct}%", (nose_bottom_y + chin_y) / 2)


def visualize_yintang(draw, landmarks, width, height, font):
    """Visualize 印堂宽度 (Glabella Width)."""
    left_brow_inner = get_point(landmarks, LM["leftBrowInner"], width, height)
    right_brow_inner = get_point(landmarks, LM["rightBrowInner"], width, height)
    
    # Calculate width
    yintang_width = dist(left_brow_inner, right_brow_inner)
    
    # Get eye spacing for comparison
    left_eye_inner = get_point(landmarks, LM["leftEyeInner"], width, height)
    right_eye_inner = get_point(landmarks, LM["rightEyeInner"], width, height)
    eye_spacing = dist(left_eye_inner, right_eye_inner)
    
    # Determine judgment
    if yintang_width > eye_spacing * 0.7:
        judgment = "开阔"
    elif yintang_width > eye_spacing * 0.5:
        judgment = "适中"
    else:
        judgment = "较窄"
    
    # Draw line
    draw.line([left_brow_inner, right_brow_inner], fill=GOLD, width=2)
    
    # Draw label above midpoint
    mid_x = (left_brow_inner[0] + right_brow_inner[0]) // 2
    mid_y = (left_brow_inner[1] + right_brow_inner[1]) // 2
    text = f"印堂: {yintang_width:.1f}px ({judgment})"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    bg_x = mid_x - text_width // 2
    bg_y = mid_y - text_height - 15
    draw.rectangle([bg_x - 4, bg_y - 4, bg_x + text_width + 4, bg_y + text_height + 4], fill=BLACK_BG)
    draw.text((bg_x, bg_y), text, fill=GOLD, font=font)


def visualize_tianzhai(draw, landmarks, width, height, font):
    """Visualize 田宅宫 (Eyebrow-Eye Distance)."""
    left_brow_peak = get_point(landmarks, LM["leftBrowPeak"], width, height)
    left_eye_top = get_point(landmarks, LM["leftEyeTop"], width, height)
    right_brow_peak = get_point(landmarks, LM["rightBrowPeak"], width, height)
    right_eye_top = get_point(landmarks, LM["rightEyeTop"], width, height)
    
    # Calculate distances
    left_tianzhai = left_eye_top[1] - left_brow_peak[1]
    right_tianzhai = right_eye_top[1] - right_brow_peak[1]
    avg_tianzhai = (left_tianzhai + right_tianzhai) / 2
    
    # Get eye width for comparison
    left_eye_outer = get_point(landmarks, LM["leftEyeOuter"], width, height)
    left_eye_inner = get_point(landmarks, LM["leftEyeInner"], width, height)
    eye_width = dist(left_eye_outer, left_eye_inner)
    
    # Determine judgment
    judgment = "宽广" if avg_tianzhai > eye_width * 0.4 else "较窄"
    
    # Draw vertical lines with arrows
    def draw_arrow_line(start, end):
        draw.line([start, end], fill=GOLD, width=2)
        # Simple arrow (triangle at end)
        arrow_size = 5
        if end[1] > start[1]:  # Downward
            arrow_points = [
                (end[0], end[1]),
                (end[0] - arrow_size, end[1] - arrow_size),
                (end[0] + arrow_size, end[1] - arrow_size),
            ]
        else:  # Upward
            arrow_points = [
                (end[0], end[1]),
                (end[0] - arrow_size, end[1] + arrow_size),
                (end[0] + arrow_size, end[1] + arrow_size),
            ]
        draw.polygon(arrow_points, fill=GOLD)
    
    draw_arrow_line(left_brow_peak, left_eye_top)
    draw_arrow_line(right_brow_peak, right_eye_top)
    
    # Draw label on left side
    label_x = left_brow_peak[0] - 10
    label_y = (left_brow_peak[1] + left_eye_top[1]) // 2
    text = f"田宅宫: {avg_tianzhai:.1f}px ({judgment})"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    bg_x = label_x - text_width - 4
    bg_y = label_y - text_height // 2
    draw.rectangle([bg_x - 4, bg_y - 4, bg_x + text_width + 4, bg_y + text_height + 4], fill=BLACK_BG)
    draw.text((bg_x, bg_y), text, fill=GOLD, font=font)


def visualize_cheekbone(draw, landmarks, width, height, font):
    """Visualize 颧骨突出度 (Cheekbone Prominence)."""
    left_cheekbone = get_point(landmarks, LM["leftCheekbone"], width, height)
    right_cheekbone = get_point(landmarks, LM["rightCheekbone"], width, height)
    left_jaw = get_point(landmarks, LM["leftJaw"], width, height)
    right_jaw = get_point(landmarks, LM["rightJaw"], width, height)
    
    # Calculate widths
    cheek_y = (left_cheekbone[1] + right_cheekbone[1]) // 2
    jaw_y = (left_jaw[1] + right_jaw[1]) // 2
    
    cheek_width = dist(left_cheekbone, right_cheekbone)
    jaw_width = dist(left_jaw, right_jaw)
    
    # Determine judgment
    judgment = "突出" if cheek_width > jaw_width * 1.08 else "平和"
    
    # Draw width lines
    draw.line([left_cheekbone, right_cheekbone], fill=GOLD, width=2)
    draw.line([left_jaw, right_jaw], fill=GOLD, width=2)
    
    # Draw endpoints
    for point in [left_cheekbone, right_cheekbone, left_jaw, right_jaw]:
        draw.ellipse([point[0] - 3, point[1] - 3, point[0] + 3, point[1] + 3], fill=GOLD, outline=GOLD)
    
    # Draw label between lines
    label_x = max(left_cheekbone[0], left_jaw[0]) + 10
    label_y = (cheek_y + jaw_y) // 2
    text = f"颧骨: {cheek_width:.1f}px vs 下颌: {jaw_width:.1f}px ({judgment})"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    bg_x = label_x
    bg_y = label_y - text_height // 2
    draw.rectangle([bg_x - 4, bg_y - 4, bg_x + text_width + 4, bg_y + text_height + 4], fill=BLACK_BG)
    draw.text((bg_x, bg_y), text, fill=GOLD, font=font)


def visualize_nose_wing(draw, landmarks, width, height, font):
    """Visualize 鼻翼宽度 (Nose Wing Width)."""
    left_nose_wing = get_point(landmarks, LM["leftNoseWing"], width, height)
    right_nose_wing = get_point(landmarks, LM["rightNoseWing"], width, height)
    
    # Calculate width
    nose_width = dist(left_nose_wing, right_nose_wing)
    
    # Get eye spacing for comparison
    left_eye_inner = get_point(landmarks, LM["leftEyeInner"], width, height)
    right_eye_inner = get_point(landmarks, LM["rightEyeInner"], width, height)
    eye_spacing = dist(left_eye_inner, right_eye_inner)
    
    # Determine judgment
    judgment = "饱满" if nose_width > eye_spacing * 0.85 else "适中"
    
    # Draw line
    draw.line([left_nose_wing, right_nose_wing], fill=GOLD, width=2)
    
    # Draw label above midpoint
    mid_x = (left_nose_wing[0] + right_nose_wing[0]) // 2
    mid_y = (left_nose_wing[1] + right_nose_wing[1]) // 2
    text = f"鼻翼: {nose_width:.1f}px ({judgment})"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    bg_x = mid_x - text_width // 2
    bg_y = mid_y - text_height - 15
    draw.rectangle([bg_x - 4, bg_y - 4, bg_x + text_width + 4, bg_y + text_height + 4], fill=BLACK_BG)
    draw.text((bg_x, bg_y), text, fill=GOLD, font=font)


def main():
    parser = argparse.ArgumentParser(description="Visualize facial measurements")
    parser.add_argument("image_path", type=Path, help="Path to input image")
    parser.add_argument("--output", type=Path, help="Path to output image (default: <input>-visualized.jpg)")
    args = parser.parse_args()
    
    if not args.image_path.exists():
        print(f"Error: Image not found: {args.image_path}", file=sys.stderr)
        sys.exit(1)
    
    # Determine output path
    if args.output:
        output_path = args.output
    else:
        output_path = args.image_path.parent / f"{args.image_path.stem}-visualized{args.image_path.suffix}"
    
    print(f"Detecting landmarks in {args.image_path}...")
    try:
        landmarks, width, height = detect_landmarks(args.image_path)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
    
    print(f"Face detected: {width}x{height}")
    print("Drawing visualizations...")
    
    # Load image
    image = Image.open(args.image_path).convert("RGB")
    draw = ImageDraw.Draw(image, "RGBA")
    
    # Try to load a font, fallback to default if not available
    try:
        # Try to use a system font
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 14)
    except:
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 14)
        except:
            font = ImageFont.load_default()
    
    # Draw all visualizations
    visualize_santing(draw, landmarks, width, height, font)
    visualize_yintang(draw, landmarks, width, height, font)
    visualize_tianzhai(draw, landmarks, width, height, font)
    visualize_cheekbone(draw, landmarks, width, height, font)
    visualize_nose_wing(draw, landmarks, width, height, font)
    
    # Save result
    image.save(output_path, quality=95)
    print(f"✓ Saved visualization to: {output_path}")


if __name__ == "__main__":
    main()
