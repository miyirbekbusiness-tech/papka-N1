# Meadow Light — 10 s stylized meadow film

`meadow.html` is the whole film: three.js 0.160.0 (jsDelivr importmap), custom toon `ShaderMaterial`s, a deterministic timeline and the Web Audio score.

- Open it in a browser to play it in a loop. Click once to synthesize and play the soundtrack.
- `?t=6.67` freezes on an exact time. `?scale=0.5` renders at half resolution for slow machines.
- `window.renderAt(t)` draws time *t* exactly as one sample. `window.renderFrameMB(frame, 12)` draws a 60 fps frame with a 12-sample, 180° motion blur and sub-pixel jitter.
- `window.renderSoundtrack()` returns the 48 kHz stereo `AudioBuffer` from an `OfflineAudioContext`. Its events come from the same `TL` timeline as the picture (gust 1.67, crest 3.33, birds 5.0, shafts 6.67, reappear 8.33).

## Rendering

```bash
export THREE_JS=/path/to/node_modules/three/build/three.module.js   # only needed if jsDelivr is unreachable
render/render_all.sh                      # 6 resumable 100-frame segments -> out/meadow_video.mp4
node render/render.cjs audio out/sound_raw.wav
# loudness: two-pass loudnorm (linear) to -14 LUFS, TP < -2 dBTP -> out/sound.wav, then mux:
ffmpeg -i out/meadow_video.mp4 -i out/sound.wav -c:v copy -c:a aac -b:a 256k -shortest out/meadow_light.mp4
node render/render.cjs stills <dir> 0,1.67,3.33,5,6.67,8.33,10 [samples]   # contact-sheet frames
```

Rendering runs in headless Chromium (SwiftShader on CPU). On 4 cores that is roughly 6–20 s per motion-blurred frame.
