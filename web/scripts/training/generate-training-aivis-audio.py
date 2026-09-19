"""Generate the two 20-slide training narrations with local AivisSpeech.

This is a deliberately offline production step.  It only accepts a loopback
AivisSpeech endpoint and never reads an API key.  The voice profiles and the
query -> parameter update -> synthesis flow match the natural local narration
pipeline used by the sibling YouTube project.

Examples:
  py -3.12 scripts/training/generate-training-aivis-audio.py --training all
  py -3.12 scripts/training/generate-training-aivis-audio.py --training fall-prevention
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
import urllib.error
import urllib.parse
import urllib.request
import wave
from dataclasses import dataclass
from pathlib import Path
from typing import Any


WEB_ROOT = Path(__file__).resolve().parents[2]
MANIFEST_ROOT = WEB_ROOT / "scripts/training/audio-manifests"
DEFAULT_ENDPOINT = "http://127.0.0.1:10101"
ENGINE_NAME = "AivisSpeech Engine"
CREDIT = "音声: AivisSpeech / リダ"
CREDIT_URL = "https://youtube.com/channel/UC2tX473Zo09ZCnhAUNdAvjA/join"


@dataclass(frozen=True)
class VoiceProfile:
    speaker: str
    style: str
    style_id: int
    speed: float
    intonation: float
    volume: float
    pre_phoneme_length: float
    post_phoneme_length: float


@dataclass(frozen=True)
class TrainingTarget:
    data: Path
    output: Path
    voice: VoiceProfile


# This is the locally installed voice and long-form profile the user selected
# after listening to the YouTube project's auditions (2026-09-08).  The model's
# custom licence requires the credit and URL declared above.
LIDA_GENKI = VoiceProfile(
    speaker="リダ / Lida（感情表現モデル）",
    style="元気",
    style_id=1349521252,
    speed=1.02,
    intonation=1.02,
    volume=0.80,
    pre_phoneme_length=0.08,
    post_phoneme_length=0.14,
)


TARGETS: dict[str, TrainingTarget] = {
    "fall-prevention": TrainingTarget(
        data=WEB_ROOT / "src/data/safety-seminars/fall-prevention.json",
        output=WEB_ROOT / "public/training/safety-seminars/fall-prevention/audio",
        voice=LIDA_GENKI,
    ),
    "ai-chat-work": TrainingTarget(
        data=WEB_ROOT / "src/data/ai-seminars/ai-chat-work.json",
        output=WEB_ROOT / "public/training/ai-seminars/ai-chat-work/audio",
        voice=LIDA_GENKI,
    ),
}


def ensure_loopback_endpoint(raw: str) -> str:
    parsed = urllib.parse.urlparse(raw)
    if parsed.scheme != "http" or parsed.hostname not in {"127.0.0.1", "localhost", "::1"}:
        raise SystemExit("AivisSpeech endpoint must be local loopback HTTP; remote TTS is prohibited")
    if parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise SystemExit("AivisSpeech endpoint must not contain credentials or query parameters")
    return raw.rstrip("/")


def request_json(url: str, *, payload: dict[str, Any] | None = None, timeout: int = 180) -> Any:
    body = None
    headers: dict[str, str] = {}
    if payload is not None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=body, headers=headers, method="POST" if body else "GET")
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def request_bytes(url: str, payload: dict[str, Any], *, timeout: int = 600) -> bytes:
    req = urllib.request.Request(
        url,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return response.read()


def mora_signature(query: dict[str, Any]) -> list[tuple[Any, ...]]:
    keys = ("text", "consonant", "consonant_length", "vowel", "vowel_length", "pitch")
    return [
        tuple(mora.get(key) for key in keys)
        for phrase in query.get("accent_phrases", [])
        for mora in phrase.get("moras", [])
    ]


def synthesis_parameters(voice: VoiceProfile, index: int, text: str) -> dict[str, Any]:
    del index, text  # Kept in the signature so future profiles can vary safely per slide.
    return {
        "speedScale": voice.speed,
        "pitchScale": 0.0,
        "intonationScale": voice.intonation,
        "volumeScale": voice.volume,
        "prePhonemeLength": voice.pre_phoneme_length,
        "postPhonemeLength": voice.post_phoneme_length,
        "outputSamplingRate": 48000,
        "outputStereo": False,
    }


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def validate_wav(path: Path) -> float:
    with wave.open(str(path), "rb") as audio:
        channels = audio.getnchannels()
        sample_rate = audio.getframerate()
        sample_width = audio.getsampwidth()
        frames = audio.getnframes()
    if (channels, sample_rate, sample_width) != (1, 48000, 2) or frames <= 0:
        raise RuntimeError(
            f"invalid Aivis WAV: {channels}ch {sample_rate}Hz {sample_width * 8}bit {frames} frames"
        )
    return frames / sample_rate


def encode_mp3(wav_path: Path, mp3_path: Path) -> None:
    command = [
        "ffmpeg",
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-i",
        str(wav_path),
        "-ac",
        "1",
        "-ar",
        "48000",
        "-b:a",
        "64k",
        str(mp3_path),
    ]
    subprocess.run(command, check=True)
    if not mp3_path.is_file() or mp3_path.stat().st_size <= 1000:
        raise RuntimeError(f"ffmpeg produced an invalid MP3: {mp3_path}")


def probe_mp3(path: Path) -> dict[str, Any]:
    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-select_streams",
            "a:0",
            "-show_entries",
            "stream=codec_name,sample_rate,channels,duration",
            "-of",
            "json",
            str(path),
        ],
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    streams = json.loads(result.stdout).get("streams", [])
    if len(streams) != 1:
        raise RuntimeError(f"expected exactly one audio stream: {path}")
    stream = streams[0]
    if stream.get("codec_name") != "mp3" or int(stream.get("sample_rate", 0)) != 48000:
        raise RuntimeError(f"unexpected MP3 format: {path}: {stream}")
    if int(stream.get("channels", 0)) != 1 or float(stream.get("duration", 0)) <= 0:
        raise RuntimeError(f"invalid MP3 stream: {path}: {stream}")
    return stream


def validate_voice(endpoint: str, voice: VoiceProfile) -> None:
    speakers = request_json(f"{endpoint}/speakers", timeout=60)
    matches = [
        speaker
        for speaker in speakers
        if speaker.get("name") == voice.speaker
        and any(
            style.get("id") == voice.style_id and style.get("name") == voice.style
            for style in speaker.get("styles", [])
        )
    ]
    if len(matches) != 1:
        raise RuntimeError(
            f"required Aivis voice is unavailable: {voice.speaker}/{voice.style}/{voice.style_id}"
        )


def input_fingerprint(text: str, voice: VoiceProfile, index: int, engine_version: str) -> str:
    payload = {
        "text": text,
        "voice": voice.__dict__,
        "parameters": synthesis_parameters(voice, index, text),
        "engine": ENGINE_NAME,
        "engine_version": engine_version,
        "encoder": "mp3-64k-48khz-mono",
    }
    return sha256_bytes(json.dumps(payload, ensure_ascii=False, sort_keys=True).encode("utf-8"))


def load_manifest(path: Path) -> dict[str, Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        return {}


def build_manifest(
    training_id: str,
    target: TrainingTarget,
    engine_version: str,
    records: list[dict[str, Any]],
) -> dict[str, Any]:
    return {
        "schema_version": 1,
        "training_id": training_id,
        "engine": ENGINE_NAME,
        "engine_version": engine_version,
        "endpoint_policy": "loopback-only; no API key",
        "speaker": target.voice.speaker,
        "style": target.voice.style,
        "style_id": target.voice.style_id,
        "format": {"codec": "mp3", "sample_rate": 48000, "channels": 1, "bitrate": "64k"},
        "licence": {
            "name": "リダ カスタムライセンス",
            "credit_required": True,
            "credit": CREDIT,
            "credit_url": CREDIT_URL,
        },
        "slides": sorted(records, key=lambda item: int(item["slide"])),
    }


def write_manifest_atomic(path: Path, manifest: dict[str, Any]) -> None:
    temporary = path.with_suffix(".json.tmp")
    temporary.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    os.replace(temporary, path)


def generate_target(training_id: str, target: TrainingTarget, endpoint: str, engine_version: str) -> None:
    training = json.loads(target.data.read_text(encoding="utf-8-sig"))
    slides = training.get("slides", [])
    if len(slides) != 20:
        raise RuntimeError(f"{training_id} must contain exactly 20 slides; found {len(slides)}")
    numbers = [int(slide["number"]) for slide in slides]
    if numbers != list(range(1, 21)):
        raise RuntimeError(f"{training_id} slide numbers must be 1..20; found {numbers}")

    validate_voice(endpoint, target.voice)
    target.output.mkdir(parents=True, exist_ok=True)
    MANIFEST_ROOT.mkdir(parents=True, exist_ok=True)
    manifest_path = MANIFEST_ROOT / f"{training_id}.json"
    old_manifest = load_manifest(manifest_path)
    old_slides = {int(item["slide"]): item for item in old_manifest.get("slides", []) if "slide" in item}
    records: list[dict[str, Any]] = []

    with tempfile.TemporaryDirectory(prefix=f"{training_id}-aivis-") as temporary:
        temp_dir = Path(temporary)
        for index, slide in enumerate(slides):
            number = int(slide["number"])
            text = str(slide["narration"]).strip()
            if not text:
                raise RuntimeError(f"{training_id} slide {number:02d} has empty narration")
            output_path = target.output / f"slide-{number:02d}.mp3"
            fingerprint = input_fingerprint(text, target.voice, index, engine_version)
            previous = old_slides.get(number, {})
            if (
                previous.get("input_sha256") == fingerprint
                and output_path.is_file()
                and previous.get("mp3_sha256") == sha256_file(output_path)
            ):
                probe = probe_mp3(output_path)
                records.append(previous)
                write_manifest_atomic(
                    manifest_path,
                    build_manifest(training_id, target, engine_version, records),
                )
                print(f"[{training_id}] {number:02d}/20 cached ({float(probe['duration']):.1f}s)", flush=True)
                continue

            query_url = (
                f"{endpoint}/audio_query?"
                + urllib.parse.urlencode({"text": text, "speaker": target.voice.style_id})
            )
            query = request_json(query_url, payload={}, timeout=300)
            before = mora_signature(query)
            parameters = synthesis_parameters(target.voice, index, text)
            query.update(parameters)
            if mora_signature(query) != before:
                raise RuntimeError(f"phoneme mutation detected before slide {number:02d} synthesis")

            synthesis_url = (
                f"{endpoint}/synthesis?"
                + urllib.parse.urlencode({"speaker": target.voice.style_id})
            )
            wav_data = request_bytes(synthesis_url, query, timeout=900)
            wav_path = temp_dir / f"slide-{number:02d}.wav"
            temp_mp3 = temp_dir / f"slide-{number:02d}.mp3"
            wav_path.write_bytes(wav_data)
            wav_duration = validate_wav(wav_path)
            encode_mp3(wav_path, temp_mp3)
            probe = probe_mp3(temp_mp3)
            if abs(float(probe["duration"]) - wav_duration) > 0.25:
                raise RuntimeError(
                    f"duration mismatch on {training_id} slide {number:02d}: "
                    f"WAV {wav_duration:.3f}s / MP3 {float(probe['duration']):.3f}s"
                )
            os.replace(temp_mp3, output_path)
            record = {
                "slide": number,
                "input_sha256": fingerprint,
                "narration_sha256": sha256_bytes(text.encode("utf-8")),
                "mp3_sha256": sha256_file(output_path),
                "duration_seconds": round(float(probe["duration"]), 3),
                "parameters": parameters,
            }
            records.append(record)
            # Persist after every successful slide.  An interrupted long batch
            # resumes from hashes without trusting a partial MP3.
            write_manifest_atomic(
                manifest_path,
                build_manifest(training_id, target, engine_version, records),
            )
            print(f"[{training_id}] {number:02d}/20 generated ({record['duration_seconds']:.1f}s)", flush=True)

    expected_names = {f"slide-{number:02d}.mp3" for number in range(1, 21)}
    actual_names = {path.name for path in target.output.glob("slide-*.mp3")}
    if actual_names != expected_names:
        raise RuntimeError(
            f"{training_id} audio set mismatch; missing={sorted(expected_names - actual_names)}, "
            f"extra={sorted(actual_names - expected_names)}"
        )

    write_manifest_atomic(
        manifest_path,
        build_manifest(training_id, target, engine_version, records),
    )
    total = sum(float(record["duration_seconds"]) for record in records)
    print(f"[{training_id}] complete: 20 files / {total / 60:.1f} minutes / {target.voice.speaker}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--training", choices=["all", *TARGETS], default="all")
    parser.add_argument(
        "--endpoint",
        default=os.environ.get("AIVIS_API", DEFAULT_ENDPOINT),
        help="local AivisSpeech endpoint (loopback HTTP only)",
    )
    args = parser.parse_args()
    endpoint = ensure_loopback_endpoint(args.endpoint)
    if shutil.which("ffmpeg") is None or shutil.which("ffprobe") is None:
        raise SystemExit("ffmpeg and ffprobe are required")
    try:
        version = str(request_json(f"{endpoint}/version", timeout=10))
    except (OSError, urllib.error.URLError) as error:
        raise SystemExit(
            "AivisSpeech Engine is not running. Start the locally installed AivisSpeech app first."
        ) from error
    selected = TARGETS.items() if args.training == "all" else [(args.training, TARGETS[args.training])]
    print(f"engine: {ENGINE_NAME} {version} / endpoint: loopback / cloud API: none")
    for training_id, target in selected:
        generate_target(training_id, target, endpoint, version)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("interrupted; completed MP3 files remain valid", file=sys.stderr)
        sys.exit(130)
