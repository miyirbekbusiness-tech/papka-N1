# Ong Reels (60 s, 1080x1920) — done

- **final.mp4** — 60.000 s, 1800 frames, H.264 High CRF 14, AAC 192k, faststart; −14.0 LUFS, −2.6 dBTP (limiter 1.7 dB).
  Stage 1 narrated (ElevenLabs Mirjalol, eleven_v4); stages 2–4 without narration (ElevenLabs credits ran out):
  subtitles, music and all sound effects; music lifted 8 dB there so the four stages sit at the same loudness.
- **final_no_voice.mp4** — the same film with no narration at all; −14.0 LUFS, −2.9 dBTP (limiter 1.8 dB).
- final_contact.png — one frame per shot, from final.mp4. final_check.json — shot table + subtitle sync.

Stages 2–4 subtitles are paced for reading (shared/retime.py) so every shot is 3.5–5.0 s.
To add narration later: ElevenLabs TTS + Scribe per stage → `./make_stage.sh N` → `./make_final.sh`
(texts in shared/texts.json; 660 credits for stages 2–4).
