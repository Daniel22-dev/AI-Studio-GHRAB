# Release notes 0.21.19

## Showroom – finální vizuální polish

- Levý informační sloupec všech osmi aplikací používá pevnou safe zónu, takže nadpisy, popisy a demo štítek už nezasahují do rámečku ukázky.
- Demo štítek je sjednocen na `DEMO · 1.A · ANGLIČTINA`; téma Present Perfect zůstává viditelné v samotných ukázkách, ale netlačí se na hranu preview.
- Diferenciátor má v náhledu celý název aplikace, čistou hlavičku a znovu vysázenou trojici pedagogických verzí. Text `jiná podpora` je uvnitř každé karty a nic nepřetéká.
- Hodnotitel a ostatní aplikace mají kratší, bezpečně zalomené popisy vlevo.
- Závěrečná teze kolem 1:20 byla kompletně překreslena: text je opticky i geometricky vycentrován a vztah mezi větami `Budoucnost nebude patřit…` / `Bude patřit těm…` je jednoznačný.
- Video bylo vyrenderováno z kvalitnějšího 6,6 Mb/s masteru, nikoli z CI komprimované kopie. Výstup zůstává 1920×1080 / 30 fps; audio stopa je převzata beze změny a skladba dál běží souvisle bez remixu.
- Výsledný soubor je pod P5 limitem 60 MB pro showroom MP4.
