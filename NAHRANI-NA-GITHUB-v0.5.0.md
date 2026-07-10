# Přesný postup nahrání AI Studio GHRAB v0.5.0 na GitHub

## Co budete nahrávat

Použijte soubor:

`AI-Studio-GHRAB-v0.5.0-GitHub.zip`

Tento ZIP je určený přímo pro GitHub repozitář AI Studia.

## Kam to vložit

Obsah ZIPu vložte do **kořene repozitáře** AI Studia.

Kořen repozitáře znamená místo, kde jsou soubory jako:

- `package.json`
- `src/`
- `scripts/`
- `.github/`
- `README.md`

Nevytvářejte složku typu `AI-Studio-GHRAB-v0.5.0/` uvnitř repozitáře. Na GitHub se mají nahrát přímo soubory a složky z rozbaleného ZIPu.

## Postup ve webovém rozhraní GitHubu

1. Otevřete repozitář AI Studia.
2. Zkontrolujte, že jste v hlavní stránce repozitáře, ne uvnitř nějaké složky.
3. Klikněte na **Add file**.
4. Zvolte **Upload files**.
5. Rozbalte `AI-Studio-GHRAB-v0.5.0-GitHub.zip` ve svém počítači.
6. Označte celý obsah rozbalené složky.
7. Přetáhněte soubory a složky do GitHubu.
8. Počkejte, až se vše nahraje.
9. Do commit message napište:

`Aktualizace AI Studio GHRAB v0.5.0`

10. Klikněte na **Commit changes**.
11. Otevřete záložku **Actions** a počkejte, až doběhne nasazení.
12. Po dokončení otevřete GitHub Pages adresu AI Studia.
13. V AI Studiu otevřete **Kontrola Studia** a spusťte kontrolu.

## Co se musí po aktualizaci změnit

Po úspěšném nahrání by mělo být vidět:

- verze `0.5.0` v zápatí;
- nové zápatí: `Autor a vývojový garant: Daniel Baláž · Školní projekt Gymnázia, Ostrava-Hrabůvka`;
- přístupná stránka **Kontrola Studia**;
- lokální demo proškolení v Kontrole Studia;
- bezpečný anonymní export v Pilotu a Reportu;
- funkční přepínač jazyka CZ/EN i na telefonu;
- upravené stavy aplikací bez zavádějícího označení „produkční“;
- changelog s verzí `0.5.0`.

## Pokud se změny neprojeví

1. Na stránce AI Studia stiskněte `Ctrl + F5`.
2. Pokud je Studio nainstalované jako aplikace, zavřete jej a znovu otevřete.
3. Otevřete **Kontrola Studia**.
4. Pokud se stále zobrazuje stará verze, počkejte několik minut a zkontrolujte GitHub Actions.
