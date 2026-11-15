# Ong Reels (60 s, 1080x1920) — status

| Stage | Picture (partN.html) | Voice | partN.mp4 |
|---|---|---|---|
| 1 · 0–15 s | done, checked | ElevenLabs Mirjalol (eleven_v4) | **done** — 15.000 s, 450 fr, −14.0 LUFS, −2.8 dBTP |
| 2 · 15–30 s | done, checked on provisional timing | **blocked: ElevenLabs credits** | waits for voice |
| 3 · 30–45 s | done, checked on provisional timing | **blocked: ElevenLabs credits** | waits for voice |
| 4 · 45–60 s | done, checked on provisional timing | **blocked: ElevenLabs credits** | waits for voice |

ElevenLabs refused stage 2 ("exceeds your quota … 233 credits remaining, 238 required").
Stages 2–4 need 238 + 207 + 215 = **660 credits** (eleven_v4 / v3, 1 credit per character).

## Finishing once credits exist (one TTS + one Scribe call per stage)
1. ElevenLabs TTS, voice `cfWx14ZbaEUT4BjIA5tH`, model eleven_v4, text = `shared/texts.json[N].voice`
   → save as `stageN/voice_N_raw.mp3`
2. ElevenLabs Scribe on that audio → `stageN/transcript_N.json` (`{"words":[{text,start,end},…]}`)
3. `./make_stage.sh N`   (words → checks → contact sheet → 2x render → sound → partN.mp4 → verify)
4. after stage 4: `./make_final.sh` → `final.mp4`, `final_contact.png`, loudness reading

Everything in the pictures is cued from `words_N.json`, so the real timings re-time every cut,
subtitle, hit and sound automatically.
