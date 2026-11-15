#!/usr/bin/env python3
"""Map ElevenLabs timings onto the SUBTITLE words of a stage.

usage: words.py N "SUBTITLE TEXT"
reads  stageN/voice_N_raw.mp3, stageN/transcript_N.json
writes stageN/voice_N.mp3 (trimmed to <= 14.6 s), stageN/words_N.json
"""
import json, re, subprocess, sys, difflib
from pathlib import Path
import numpy as np

FPS = 30
MAX_VOICE = 14.55  # leaves room for mp3 frame padding so the file reads <= 14.6 s
ROOT = Path(__file__).resolve().parent.parent


def norm(w):
    w = w.lower().replace("ʻ", "").replace("'", "").replace("‘", "").replace("’", "")
    return re.sub(r"[^\w]", "", w).replace("_", "")


def decode(path, sr=48000):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(sr),
                          "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32), sr


def main():
    n = int(sys.argv[1]); sub_text = sys.argv[2]
    d = ROOT / f"stage{n}"
    trans = json.loads((d / f"transcript_{n}.json").read_text())["words"]
    trans = [w for w in trans if w.get("type", "word") == "word"]
    audio, sr = decode(d / f"voice_{n}_raw.mp3")

    # energy envelope (5 ms hop) for onset refinement
    hop = int(sr * 0.005)
    e = np.sqrt(np.convolve(audio ** 2, np.ones(hop * 4) / (hop * 4), "same"))[::hop]
    edb = 20 * np.log10(e + 1e-9)
    floor = np.percentile(edb, 10)
    thr = floor + 0.45 * (np.percentile(edb, 90) - floor)

    def refine(t):
        """snap a word start to the actual onset if a quiet gap precedes it"""
        i0, i1 = max(0, int((t - 0.10) / 0.005)), min(len(edb) - 1, int((t + 0.12) / 0.005))
        seg = edb[i0:i1]
        if len(seg) < 3 or seg.min() > thr:  # no gap: keep model timing
            return t
        q = np.where(seg < thr)[0]
        last_q = q[-1]
        on = np.where(seg[last_q:] >= thr)[0]
        if len(on) == 0:
            return t
        return round((i0 + last_q + on[0]) * 0.005, 3)

    subs = sub_text.split()
    a = [norm(w) for w in subs]
    b = [norm(w["text"]) for w in trans]
    out = [None] * len(subs)
    sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal":
            for k in range(i2 - i1):
                out[i1 + k] = (trans[j1 + k]["start"], trans[j1 + k]["end"])
        elif tag in ("replace", "delete"):
            if j2 > j1:
                t0, t1 = trans[j1]["start"], trans[j2 - 1]["end"]
            else:  # no audio token: borrow the gap between neighbours
                t0 = trans[j1 - 1]["end"] if j1 > 0 else 0.0
                t1 = trans[j1]["start"] if j1 < len(trans) else t0 + 0.2
            lens = np.array([max(1, len(subs[i])) for i in range(i1, i2)], float)
            edges = t0 + (t1 - t0) * np.concatenate([[0], np.cumsum(lens) / lens.sum()])
            for k in range(i2 - i1):
                out[i1 + k] = (float(edges[k]), float(edges[k + 1]))
    words = []
    for w, (s, e_) in zip(subs, out):
        s2 = refine(s)
        words.append({"word": w, "start": round(s2, 3), "end": round(max(e_, s2 + 0.05), 3),
                      "frame": int(round(s2 * FPS))})
    # monotonic starts
    for i in range(1, len(words)):
        if words[i]["start"] <= words[i - 1]["start"]:
            words[i]["start"] = round(words[i - 1]["start"] + 1 / FPS, 3)
            words[i]["frame"] = int(round(words[i]["start"] * FPS))

    # voice length: last audible sample
    above = np.where(np.abs(audio) > 10 ** (-50 / 20))[0]
    speech_end = above[-1] / sr if len(above) else len(audio) / sr
    dur = min(MAX_VOICE, len(audio) / sr, speech_end + 0.12)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(d / f"voice_{n}_raw.mp3"), "-t", f"{dur:.3f}",
                    "-af", f"afade=t=out:st={dur - 0.04:.3f}:d=0.04", "-ar", "44100",
                    "-c:a", "libmp3lame", "-b:a", "192k", str(d / f"voice_{n}.mp3")], check=True)
    meta = {"stage": n, "voice_duration": round(dur, 3), "speech_end": round(speech_end, 3),
            "timing_source": "ElevenLabs Scribe word timestamps, onsets refined on the waveform",
            "words": words}
    (d / f"words_{n}.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1))
    print(f"voice_{n}.mp3 {dur:.3f}s (speech ends {speech_end:.3f}s), {len(words)} words")
    for w in words:
        print(f'  {w["frame"]:4d} {w["start"]:6.3f} {w["word"]}')


if __name__ == "__main__":
    main()
