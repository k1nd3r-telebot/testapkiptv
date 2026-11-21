IPTV Player - versiunea Android
================================

Cum obtii fisierul APK (cateva minute):

1. Instaleaza Android Studio (https://developer.android.com/studio), daca nu-l ai.
2. Dezarhiveaza acest folder.
3. In Android Studio: File > Open > selecteaza folderul "iptv-android".
   La prima deschidere asteapta sincronizarea Gradle (descarca singur ce lipseste).
   Daca intreaba de Gradle Wrapper, accepta.
4. Meniu: Build > Build Bundle(s) / APK(s) > Build APK(s).
5. Cand se termina, apare un mesaj "locate". Fisierul este:
   app/build/outputs/apk/debug/app-debug.apk

Instalare pe telefon:
- Copiaza app-debug.apk pe telefon (cablu, Drive, Telegram etc.).
- Deschide-l din aplicatia Fisiere. Permite "Instalare din surse necunoscute" cand iti cere.
- Aplicatia apare ca "IPTV Player".

Note:
- Daca vrei sa modifici interfata, editezi fisierele din app/src/main/assets/
  (app.js, app.css, mobile.css - acesta contine stilurile pentru telefon).
- Pentru telefon, ecranul de jos (bara de redare) si lista de canale sunt aranjate vertical.

BUILD PRIN GITHUB:
- Pune tot continutul folderului iptv-android in radacina repository-ului (settings.gradle trebuie sa fie vizibil direct, nu intr-un subfolder).
- Fisierul .github/workflows/build.yml face build-ul automat la fiecare push.
- Dupa build: tab-ul Actions > ultimul run > Artifacts > IPTV-Player-debug (contine app-debug.apk).
- Daca ai deja un workflow vechi cu "chmod +x gradlew", inlocuieste-l cu acesta.
