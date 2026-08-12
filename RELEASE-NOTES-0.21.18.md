# Release notes 0.21.18

## Stabilized Premium Master

- steady application UI after entry; no continuous micro-pan or floating cards,
- LUDUS uses stable hero frames with short dissolves between game worlds,
- source-quality compositions, Full HD 1920x1080 at 30 fps, about 6.6 Mb/s video bitrate,
- continuous user-supplied soundtrack without remixing, about -16.8 LUFS integrated loudness,
- the ecosystem closing card appears once and transitions cleanly into the final thesis.

## CI hotfix po prvnim release candidate

- showroom video bylo znovu zakodovano z predchoziho stabilizovaneho masteru pomoci H.264 High / x264 CRF 14 / preset slow; casova osa, obrazovy obsah ani zvukova stopa se nemeni,
- vysledny MP4 ma 18 073 169 B a splnuje limit lazy media 60 000 000 B pro jeden soubor,
- objektivni shoda obrazu proti stabilizovanemu masteru: SSIM 0,999215 a prumerne PSNR 56,71 dB,
- portal-gateway.webp byl bezezmeny rozmeru 760 x 760 optimalizovan z 160 644 B na 154 772 B, aby entry critical payload zustal pod limitem,
- P3 quality gate po oprave: 176/176 kontrol PASS; entryCriticalBytes 496 812 / 500 000 B, lazyMediaBytes 18 371 319 / 65 000 000 B.
