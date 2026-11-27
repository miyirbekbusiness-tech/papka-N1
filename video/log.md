# Ish jurnali — "Agarda SSSR yana tiklansa?"

## STAGE 0 · Setup — gate oʻtdi, API kalit kutilmoqda
- Node 22.23.5, ffmpeg 6.1.1, Python 3.13; remotion/@remotion/cli/@remotion/google-fonts 4.0.547, d3-geo 3.1.2, topojson-client 3.1.0, world-atlas 2.0.2 (aniq versiyalar). Shriftlar (Montserrat 800/900, Inter 700) Google Fonts'dan public/fonts ga lokal saqlandi — render internetsiz ishlaydi.
- GATE: 2 s test kompozitsiya (Oʻzbekiston xaritasi + subtitr) render qilindi: 1920×1080, 30 fps, 2.000 s. Bu bulutli Linux konteyner (GPU yoʻq): --gl=swangle; Windows noutbukda --gl=angle --concurrency=4.
- Toʻxtash sababi: .env va ELEVENLABS_API_KEY yoʻq; api.elevenlabs.io bu konteyner tarmogʻida bloklangan. ref/namuna.mp4 ham yoʻq. Ulangan ElevenLabs akkauntida "Mirjalol Professional Voice" (cfWx14ZbaEUT4BjIA5tH) bor, lekin u free tarif: 10 000 dan 5 485 belgi qolgan.
