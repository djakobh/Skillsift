import sys
import json
from pathlib import Path

import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision


PROJECT_ROOT = Path(__file__).resolve().parent.parent
MODELS_DIR = PROJECT_ROOT / "models"

POSE_MODEL_PATH = MODELS_DIR / "pose_landmarker.task"
FACE_MODEL_PATH = MODELS_DIR / "face_landmarker.task"


def percent(good: int, valid: int):
    if valid == 0:
        return None
    return round((good / valid) * 100.0, 1)


def start_segment(active_segments, category, timestamp_sec, is_good, score, note):
    is_good = bool(is_good)
    active_segments[category] = {
        "category": str(category),
        "startSec": float(timestamp_sec),
        "endSec": float(timestamp_sec),
        "isGood": is_good,
        "scores": [float(score)] if score is not None else [],
        "note": str(note) if note is not None else None,
    }


def extend_segment(active_segments, category, timestamp_sec, score):
    seg = active_segments[category]
    seg["endSec"] = float(timestamp_sec)
    if score is not None:
        seg["scores"].append(float(score))


def close_segment(active_segments, segments, category):
    seg = active_segments[category]
    scores = seg.pop("scores", [])
    score_avg = round(sum(scores) / len(scores), 3) if scores else None

    segments.append({
        "category": str(seg["category"]),
        "startSec": float(seg["startSec"]),
        "endSec": float(seg["endSec"]),
        "isGood": bool(seg["isGood"]),
        "scoreAvg": float(score_avg) if score_avg is not None else None,
        "note": str(seg["note"]) if seg["note"] is not None else None,
    })

    active_segments[category] = None


def update_segment(active_segments, segments, category, timestamp_sec, is_good, score, good_note, bad_note):
    is_good = bool(is_good)
    score = float(score) if score is not None else None
    note = good_note if is_good else bad_note

    current = active_segments[category]

    if current is None:
        start_segment(active_segments, category, timestamp_sec, is_good, score, note)
        return

    if bool(current["isGood"]) == is_good:
        extend_segment(active_segments, category, timestamp_sec, score)
    else:
        close_segment(active_segments, segments, category)
        start_segment(active_segments, category, timestamp_sec, is_good, score, note)


def to_json_safe(obj):
    if isinstance(obj, dict):
        return {str(k): to_json_safe(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [to_json_safe(v) for v in obj]
    elif isinstance(obj, tuple):
        return [to_json_safe(v) for v in obj]
    elif isinstance(obj, np.bool_):
        return bool(obj)
    elif isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, Path):
        return str(obj)
    else:
        return obj


def analyze(video_path: str, sample_fps: int = 10):
    video_file = Path(video_path)

    if not video_file.exists():
        return {"error": f"video_not_found: {video_file}"}

    if not POSE_MODEL_PATH.exists():
        return {"error": f"missing_pose_model: {POSE_MODEL_PATH}"}

    if not FACE_MODEL_PATH.exists():
        return {"error": f"missing_face_model: {FACE_MODEL_PATH}"}

    cap = cv2.VideoCapture(str(video_file))
    if not cap.isOpened():
        return {"error": f"could_not_open_video: {video_file}"}

    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps is None or fps <= 0:
        fps = 30.0

    frame_step = max(1, int(round(fps / sample_fps)))

    total_sampled = 0
    posture_valid = 0
    posture_good = 0
    eye_valid = 0
    eye_good = 0
    expression_valid = 0
    expression_good = 0

    segments = []
    active_segments = {
        "posture": None,
        "eye_contact": None,
        "facial_expression": None,
    }

    SHOULDER_LEVEL_MAX = 0.06
    LEAN_MAX = 0.18
    FACE_YAW_MAX = 12.0
    FACE_PITCH_MAX = 12.0
    SMILE_MIN = 0.25
    FROWN_MAX = 0.35
    MOUTH_PUCKER_MAX = 0.35

    pose_options = vision.PoseLandmarkerOptions(
        base_options=python.BaseOptions(model_asset_path=str(POSE_MODEL_PATH)),
        running_mode=vision.RunningMode.VIDEO,
        num_poses=1,
    )

    face_options = vision.FaceLandmarkerOptions(
        base_options=python.BaseOptions(model_asset_path=str(FACE_MODEL_PATH)),
        running_mode=vision.RunningMode.VIDEO,
        num_faces=1,
        output_face_blendshapes=True,
        output_facial_transformation_matrixes=False,
    )

    with vision.PoseLandmarker.create_from_options(pose_options) as pose_landmarker, \
         vision.FaceLandmarker.create_from_options(face_options) as face_landmarker:

        frame_idx = 0

        while True:
            ok, frame = cap.read()
            if not ok:
                break

            if frame_idx % frame_step != 0:
                frame_idx += 1
                continue

            frame_idx += 1
            total_sampled += 1
            timestamp_sec = round(frame_idx / fps, 2)

            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
            timestamp_ms = int((frame_idx / fps) * 1000)

            pose_result = pose_landmarker.detect_for_video(mp_image, timestamp_ms)
            face_result = face_landmarker.detect_for_video(mp_image, timestamp_ms)

            # -----------------------------------
            # POSTURE
            # -----------------------------------
            if pose_result.pose_landmarks and len(pose_result.pose_landmarks) > 0:
                landmarks = pose_result.pose_landmarks[0]

                LEFT_SHOULDER = 11
                RIGHT_SHOULDER = 12
                LEFT_HIP = 23
                RIGHT_HIP = 24
                NOSE = 0

                left_shoulder = landmarks[LEFT_SHOULDER]
                right_shoulder = landmarks[RIGHT_SHOULDER]
                left_hip = landmarks[LEFT_HIP]
                right_hip = landmarks[RIGHT_HIP]
                nose = landmarks[NOSE]

                posture_valid += 1

                shoulder_level_diff = abs(float(left_shoulder.y) - float(right_shoulder.y))
                hip_center_x = (float(left_hip.x) + float(right_hip.x)) / 2.0
                lean = abs(float(nose.x) - hip_center_x)

                posture_score = max(
                    0.0,
                    1.0 - ((shoulder_level_diff / SHOULDER_LEVEL_MAX) * 0.5 + (lean / LEAN_MAX) * 0.5)
                )
                posture_score = round(min(1.0, float(posture_score)), 3)

                good_posture = bool(
                    shoulder_level_diff <= SHOULDER_LEVEL_MAX and
                    lean <= LEAN_MAX
                )

                if good_posture:
                    posture_good += 1

                update_segment(
                    active_segments,
                    segments,
                    "posture",
                    timestamp_sec,
                    good_posture,
                    posture_score,
                    "upright posture maintained",
                    "slouch detected"
                )

            # -----------------------------------
            # FACE / EYE CONTACT / EXPRESSION
            # -----------------------------------
            if face_result.face_landmarks and len(face_result.face_landmarks) > 0:
                face_landmarks = face_result.face_landmarks[0]

                eye_valid += 1
                expression_valid += 1

                left_eye_outer = np.array([float(face_landmarks[33].x), float(face_landmarks[33].y)])
                right_eye_outer = np.array([float(face_landmarks[263].x), float(face_landmarks[263].y)])
                nose_tip = np.array([float(face_landmarks[1].x), float(face_landmarks[1].y)])

                eye_width = float(np.linalg.norm(left_eye_outer - right_eye_outer)) + 1e-6
                left_dist = float(np.linalg.norm(nose_tip - left_eye_outer)) / eye_width
                right_dist = float(np.linalg.norm(nose_tip - right_eye_outer)) / eye_width

                yaw_ratio = left_dist - right_dist
                yaw_deg = float(yaw_ratio * 60.0)

                eye_line_y = (left_eye_outer[1] + right_eye_outer[1]) / 2.0
                pitch_ratio = (nose_tip[1] - eye_line_y) / eye_width
                pitch_deg = float(pitch_ratio * 60.0)

                eye_score = max(
                    0.0,
                    1.0 - ((abs(yaw_deg) / FACE_YAW_MAX) * 0.5 + (abs(pitch_deg) / FACE_PITCH_MAX) * 0.5)
                )
                eye_score = round(min(1.0, float(eye_score)), 3)

                good_eye_contact = bool(
                    abs(yaw_deg) <= FACE_YAW_MAX and
                    abs(pitch_deg) <= FACE_PITCH_MAX
                )

                if good_eye_contact:
                    eye_good += 1

                update_segment(
                    active_segments,
                    segments,
                    "eye_contact",
                    timestamp_sec,
                    good_eye_contact,
                    eye_score,
                    "gaze maintained",
                    "gaze not maintained"
                )

                blendshape_map = {}
                if face_result.face_blendshapes and len(face_result.face_blendshapes) > 0:
                    categories = face_result.face_blendshapes[0]
                    for cat in categories:
                        blendshape_map[str(cat.category_name)] = float(cat.score)

                smile_left = float(blendshape_map.get("mouthSmileLeft", 0.0))
                smile_right = float(blendshape_map.get("mouthSmileRight", 0.0))
                brow_inner_up = float(blendshape_map.get("browInnerUp", 0.0))
                frown_left = float(blendshape_map.get("mouthFrownLeft", 0.0))
                frown_right = float(blendshape_map.get("mouthFrownRight", 0.0))
                pucker = float(blendshape_map.get("mouthPucker", 0.0))

                smile_score = max(smile_left, smile_right)
                frown_score = max(frown_left, frown_right)

                expression_score = round(min(1.0, float(smile_score)), 3)

                good_expression = bool(
                    (smile_score >= SMILE_MIN or brow_inner_up >= 0.15)
                    and frown_score <= FROWN_MAX
                    and pucker <= MOUTH_PUCKER_MAX
                )

                if good_expression:
                    expression_good += 1

                update_segment(
                    active_segments,
                    segments,
                    "facial_expression",
                    timestamp_sec,
                    good_expression,
                    expression_score,
                    "expression appears engaged",
                    "expression appears less engaged"
                )

    cap.release()

    for category in list(active_segments.keys()):
        if active_segments[category] is not None:
            close_segment(active_segments, segments, category)

    result = {
        "summary": {
            "video": {
                "sample_fps": int(sample_fps),
                "sampled_frames": int(total_sampled),
            },
            "posture": {
                "valid_frames": int(posture_valid),
                "good_frames": int(posture_good),
                "good_percent": percent(posture_good, posture_valid),
            },
            "eye_contact": {
                "valid_frames": int(eye_valid),
                "good_frames": int(eye_good),
                "good_percent": percent(eye_good, eye_valid),
            },
            "facial_expression": {
                "valid_frames": int(expression_valid),
                "good_frames": int(expression_good),
                "good_percent": percent(expression_good, expression_valid),
            },
        },
        "segments": segments
    }

    return to_json_safe(result)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Missing video_path argument"}))
        sys.exit(1)
    
    video_path = sys.argv[1]

    #DEBUG
    print("VIDEO PATH:", video_path, file=sys.stderr)

    result = analyze(sys.argv[1])
    print(json.dumps(result))