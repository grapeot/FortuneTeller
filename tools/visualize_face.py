#!/usr/bin/env python3
"""
Standalone privacy-safe face visualization.

What it does:
1) Uses MediaPipe FaceLandmarker (478 points)
2) Draws dense contour-only wireframe (no real face pixels, no keypoint dots)
3) Keeps core measurements and extends coverage

Usage:
    python tools/visualize_face.py <image_path> [--output <output_path>]
"""

import argparse
import json
import sys
import urllib.request
from pathlib import Path

try:
    import cv2
    import mediapipe as mp
    import numpy as np
    from mediapipe.tasks import python
    from mediapipe.tasks.python import vision
    from PIL import Image, ImageDraw, ImageFont
except ImportError as e:
    print(f"Error: Missing required package: {e}", file=sys.stderr)
    print(
        "Please install: uv pip install opencv-python mediapipe pillow", file=sys.stderr
    )
    sys.exit(1)


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
    "mouthLeft": 61,
    "mouthRight": 291,
}


CONTOUR_PATHS = {
    "face_oval": {
        "points": [
            10,
            338,
            297,
            332,
            284,
            251,
            389,
            356,
            454,
            323,
            361,
            288,
            397,
            365,
            379,
            378,
            400,
            377,
            152,
            148,
            176,
            149,
            150,
            136,
            172,
            58,
            132,
            93,
            234,
            127,
            162,
            21,
            54,
            103,
            67,
            109,
        ],
        "stroke": 2,
        "close": True,
    },
    "left_brow": {"points": [70, 63, 105, 66, 107], "stroke": 2, "close": False},
    "right_brow": {"points": [300, 293, 334, 296, 336], "stroke": 2, "close": False},
    "left_eye": {
        "points": [33, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163, 7],
        "stroke": 1,
        "close": True,
    },
    "right_eye": {
        "points": [
            362,
            385,
            386,
            387,
            388,
            466,
            263,
            249,
            390,
            373,
            374,
            380,
            381,
            382,
        ],
        "stroke": 1,
        "close": True,
    },
    "nose_bridge": {"points": [6, 197, 195, 5, 4, 1], "stroke": 1, "close": False},
    "nose_wings": {
        "points": [48, 115, 220, 45, 4, 275, 440, 344, 278],
        "stroke": 1,
        "close": False,
    },
    "upper_lip": {
        "points": [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291],
        "stroke": 1,
        "close": False,
    },
    "lower_lip": {
        "points": [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291],
        "stroke": 1,
        "close": False,
    },
}


GOLD = (255, 215, 0)
GOLD_SOFT = (255, 215, 0, 170)
LABEL_BG = (0, 0, 0, 166)


def load_chinese_font(size=14):
    fonts = [
        ("/System/Library/Fonts/STHeiti Medium.ttc", 0),
        ("/System/Library/Fonts/STHeiti Light.ttc", 0),
        ("/System/Library/Fonts/Supplemental/Songti.ttc", 0),
        ("/usr/share/fonts/truetype/wqy/wqy-microhei.ttc", 0),
        ("/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc", 0),
        ("/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc", 0),
    ]
    for font_path, font_index in fonts:
        try:
            if Path(font_path).exists():
                if font_path.endswith(".ttc"):
                    return ImageFont.truetype(font_path, size, index=font_index)
                return ImageFont.truetype(font_path, size)
        except Exception:
            continue
    return ImageFont.load_default()


def dist(a, b):
    return float(np.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2))


def pxy(landmarks, idx, w, h):
    return (float(landmarks[idx].x * w), float(landmarks[idx].y * h))


def get_model_path():
    model_url = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
    cache_dir = Path.home() / ".cache" / "mediapipe"
    cache_dir.mkdir(parents=True, exist_ok=True)
    model_path = cache_dir / "face_landmarker.task"

    if not model_path.exists():
        print("Downloading MediaPipe face landmarker model...")
        urllib.request.urlretrieve(model_url, model_path)
        print(f"✓ Model downloaded to {model_path}")

    return str(model_path)


def detect_landmarks(image_path):
    image = cv2.imread(str(image_path))
    if image is None:
        raise ValueError(f"Could not read image: {image_path}")
    h, w = image.shape[:2]
    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

    base_options = python.BaseOptions(model_asset_path=get_model_path())
    options = vision.FaceLandmarkerOptions(
        base_options=base_options,
        output_face_blendshapes=False,
        running_mode=vision.RunningMode.IMAGE,
        num_faces=1,
    )
    detector = vision.FaceLandmarker.create_from_options(options)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
    result = detector.detect(mp_image)
    detector.close()

    if not result.face_landmarks:
        raise ValueError("No face detected in image")
    return result.face_landmarks[0], w, h


def create_privacy_canvas(w, h):
    image = Image.new("RGB", (w, h), (9, 12, 20))
    draw = ImageDraw.Draw(image, "RGBA")
    for y in range(h):
        t = y / max(h - 1, 1)
        c = int(15 + 20 * t)
        draw.line([(0, y), (w, y)], fill=(c, c + 6, c + 18, 255), width=1)
    return image


def draw_path(draw, pts, color, width, close=False):
    if len(pts) < 2:
        return
    path = pts + ([pts[0]] if close else [])
    draw.line(path, fill=color, width=width, joint="curve")


def draw_contours(draw, landmarks, w, h):
    used = set()
    for spec in CONTOUR_PATHS.values():
        points = spec["points"]
        used.update(points)
        draw_path(
            draw,
            [pxy(landmarks, i, w, h) for i in points],
            color=GOLD_SOFT,
            width=spec["stroke"],
            close=spec["close"],
        )
    return len(used)


def draw_label(draw, text, x, y, font, align="left"):
    x0, y0, x1, y1 = draw.textbbox((0, 0), text, font=font)
    tw = x1 - x0
    th = y1 - y0
    pad = 4
    lx = x - tw if align == "right" else x
    draw.rectangle([lx - pad, y - pad, lx + tw + pad, y + th + pad], fill=LABEL_BG)
    draw.text((lx, y), text, fill=GOLD, font=font)


def measure(landmarks, w, h):
    brow_y = (
        pxy(landmarks, LM["leftBrowPeak"], w, h)[1]
        + pxy(landmarks, LM["rightBrowPeak"], w, h)[1]
    ) / 2
    forehead_y = pxy(landmarks, LM["foreheadTop"], w, h)[1]
    nose_bottom_y = pxy(landmarks, LM["noseBottom"], w, h)[1]
    chin_y = pxy(landmarks, LM["chin"], w, h)[1]

    # Hairline proxy: move up from foreheadTop by 35% of brow->forehead height.
    upper_raw = max(brow_y - forehead_y, 1.0)
    hairline_y = max(0.0, forehead_y - upper_raw * 0.35)

    upper = max(brow_y - hairline_y, 1.0)
    middle = max(nose_bottom_y - brow_y, 1.0)
    lower = max(chin_y - nose_bottom_y, 1.0)
    total = upper + middle + lower

    left_brow_inner = pxy(landmarks, LM["leftBrowInner"], w, h)
    right_brow_inner = pxy(landmarks, LM["rightBrowInner"], w, h)
    left_eye_inner = pxy(landmarks, LM["leftEyeInner"], w, h)
    right_eye_inner = pxy(landmarks, LM["rightEyeInner"], w, h)
    left_eye_outer = pxy(landmarks, LM["leftEyeOuter"], w, h)
    right_eye_outer = pxy(landmarks, LM["rightEyeOuter"], w, h)
    left_eye_top = pxy(landmarks, LM["leftEyeTop"], w, h)
    left_eye_bottom = pxy(landmarks, LM["leftEyeBottom"], w, h)
    right_eye_top = pxy(landmarks, LM["rightEyeTop"], w, h)
    right_eye_bottom = pxy(landmarks, LM["rightEyeBottom"], w, h)
    left_cheek = pxy(landmarks, LM["leftCheekbone"], w, h)
    right_cheek = pxy(landmarks, LM["rightCheekbone"], w, h)
    left_jaw = pxy(landmarks, LM["leftJaw"], w, h)
    right_jaw = pxy(landmarks, LM["rightJaw"], w, h)
    left_nose_wing = pxy(landmarks, LM["leftNoseWing"], w, h)
    right_nose_wing = pxy(landmarks, LM["rightNoseWing"], w, h)
    mouth_left = pxy(landmarks, LM["mouthLeft"], w, h)
    mouth_right = pxy(landmarks, LM["mouthRight"], w, h)

    eye_spacing = max(dist(left_eye_inner, right_eye_inner), 1.0)
    face_height = max(chin_y - hairline_y, 1.0)
    left_eye_width = max(dist(left_eye_outer, left_eye_inner), 1.0)
    right_eye_width = max(dist(right_eye_outer, right_eye_inner), 1.0)
    left_eye_height = dist(left_eye_top, left_eye_bottom)
    right_eye_height = dist(right_eye_top, right_eye_bottom)

    yintang = dist(left_brow_inner, right_brow_inner)
    tianzhai_left = left_eye_top[1] - pxy(landmarks, LM["leftBrowPeak"], w, h)[1]
    tianzhai_right = right_eye_top[1] - pxy(landmarks, LM["rightBrowPeak"], w, h)[1]
    tianzhai = (tianzhai_left + tianzhai_right) / 2
    temple_w = dist(
        pxy(landmarks, LM["leftTemple"], w, h), pxy(landmarks, LM["rightTemple"], w, h)
    )
    cheek_w = dist(left_cheek, right_cheek)
    jaw_w = dist(left_jaw, right_jaw)
    nose_w = dist(left_nose_wing, right_nose_wing)

    if cheek_w > temple_w * 1.06 and cheek_w > jaw_w * 1.06:
        lateral_pattern = "中面偏宽"
    elif jaw_w > cheek_w * 0.98:
        lateral_pattern = "下庭偏宽"
    else:
        lateral_pattern = "横向均衡"

    tianzhai_ratio_eye = tianzhai / ((left_eye_width + right_eye_width) / 2)
    if tianzhai_ratio_eye > 0.55:
        tianzhai_judgment = "偏宽"
    elif tianzhai_ratio_eye > 0.4:
        tianzhai_judgment = "适中"
    else:
        tianzhai_judgment = "偏窄"

    return {
        "hairlineY": hairline_y,
        "browY": brow_y,
        "noseBottomY": nose_bottom_y,
        "chinY": chin_y,
        "三停比例": {
            "上庭": round(upper / total * 100),
            "中庭": round(middle / total * 100),
            "下庭": 100 - round(upper / total * 100) - round(middle / total * 100),
            "上庭起点": "发际线估计",
        },
        "印堂": {
            "宽度px": round(yintang, 1),
            "相对眼距": round(yintang / eye_spacing, 2),
            "判断": "开阔"
            if yintang > eye_spacing * 0.7
            else "适中"
            if yintang > eye_spacing * 0.5
            else "较窄",
        },
        "田宅宫": {
            "距离px": round(tianzhai, 1),
            "相对眼宽倍数": round(tianzhai_ratio_eye, 2),
            "占脸高": round(tianzhai / face_height, 3),
            "判断": tianzhai_judgment,
        },
        "横向三宽": {
            "额颞宽px": round(temple_w, 1),
            "中面宽px": round(cheek_w, 1),
            "下颌宽px": round(jaw_w, 1),
            "形态": lateral_pattern,
        },
        "鼻翼": {
            "宽度px": round(nose_w, 1),
            "相对眼距": round(nose_w / eye_spacing, 2),
            "判断": "饱满" if nose_w > eye_spacing * 0.85 else "适中",
        },
        "扩展测量": {
            "面宽高比": round(cheek_w / face_height, 2),
            "双眼开合比": {
                "左": round(left_eye_height / left_eye_width, 2),
                "右": round(right_eye_height / right_eye_width, 2),
            },
            "眉峰高低差px": round(
                abs(
                    pxy(landmarks, LM["leftBrowPeak"], w, h)[1]
                    - pxy(landmarks, LM["rightBrowPeak"], w, h)[1]
                ),
                1,
            ),
            "人中长度占脸高": round(
                dist(
                    pxy(landmarks, LM["noseBottom"], w, h),
                    pxy(landmarks, LM["lipTop"], w, h),
                )
                / face_height,
                3,
            ),
            "口宽占眼距": round(dist(mouth_left, mouth_right) / eye_spacing, 2),
            "下庭高占脸高": round((chin_y - nose_bottom_y) / face_height, 2),
        },
    }


def draw_measurement_overlay(draw, landmarks, w, h, m, font):
    hairline_y = m["hairlineY"]
    brow_y = m["browY"]
    nose_bottom_y = m["noseBottomY"]
    chin_y = m["chinY"]

    # 三停线（发际线估计 + 上中下分界）
    for y in [hairline_y, brow_y, nose_bottom_y, chin_y]:
        x = int(w * 0.08)
        while x < int(w * 0.92):
            draw.line([(x, y), (min(x + 8, int(w * 0.92)), y)], fill=GOLD_SOFT, width=1)
            x += 12

    # 右上角测量面板
    panel_lines = [
        f"三停(发际线估计): {m['三停比例']['上庭']}/{m['三停比例']['中庭']}/{m['三停比例']['下庭']}",
        f"印堂: {m['印堂']['判断']} ({m['印堂']['相对眼距']})",
        f"田宅宫: {m['田宅宫']['判断']} ({m['田宅宫']['相对眼宽倍数']}x眼宽)",
        f"横向三宽: {m['横向三宽']['形态']}",
        f"鼻翼: {m['鼻翼']['判断']} ({m['鼻翼']['相对眼距']})",
        f"面宽高比: {m['扩展测量']['面宽高比']}",
    ]
    y = 12
    for line in panel_lines:
        draw_label(draw, line, w - 12, y, font, align="right")
        y += 22


def to_json(m):
    out = {
        k: v
        for k, v in m.items()
        if k not in {"hairlineY", "browY", "noseBottomY", "chinY"}
    }
    return json.dumps(out, ensure_ascii=False, indent=2)


def main():
    parser = argparse.ArgumentParser(
        description="Privacy-safe facial contour and measurement visualization"
    )
    parser.add_argument("image_path", type=Path, help="Path to input image")
    parser.add_argument(
        "--output",
        type=Path,
        help="Output image path (default: <input>-visualized.jpg)",
    )
    parser.add_argument(
        "--json", type=Path, help="Optional output path for measurement JSON"
    )
    args = parser.parse_args()

    if not args.image_path.exists():
        print(f"Error: Image not found: {args.image_path}", file=sys.stderr)
        sys.exit(1)

    output_path = (
        args.output
        or args.image_path.parent
        / f"{args.image_path.stem}-visualized{args.image_path.suffix}"
    )

    print(f"Detecting landmarks in {args.image_path}...")
    try:
        landmarks, w, h = detect_landmarks(args.image_path)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

    image = create_privacy_canvas(w, h)
    draw = ImageDraw.Draw(image, "RGBA")
    font = load_chinese_font(14)

    dense_count = draw_contours(draw, landmarks, w, h)
    m = measure(landmarks, w, h)
    draw_measurement_overlay(draw, landmarks, w, h, m, font)

    image.save(output_path, quality=95)
    print(f"✓ Saved visualization to: {output_path}")
    print(f"✓ Dense contour keypoints used: {dense_count}")

    print("\nMeasurements:")
    print(to_json(m))

    if args.json:
        args.json.write_text(to_json(m), encoding="utf-8")
        print(f"✓ Saved measurements JSON to: {args.json}")


if __name__ == "__main__":
    main()
