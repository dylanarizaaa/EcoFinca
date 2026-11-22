# EcoFinca como aplicación de escritorio y móvil (Tauri 2)

EcoFinca se empaqueta con [Tauri 2](https://v2.tauri.app/), que envuelve la misma aplicación web en una ventana nativa usando el motor web del sistema operativo. No hay servidor: el juego, el motor de simulación y el guardado (IndexedDB) funcionan dentro de la aplicación, sin conexión a internet.

| Plataforma | Formato | Motor web | Dónde se compila |
|---|---|---|---|
| Windows 10/11 | `.msi` y `.exe` (NSIS) | WebView2 | GitHub Actions o un PC con Windows |
| macOS 11+ | `.dmg` / `.app` (universal: Intel y Apple Silicon) | WKWebView | GitHub Actions o un Mac |
| Linux | `.deb`, `.rpm`, `.AppImage` | WebKitGTK 4.1 | GitHub Actions o cualquier Linux |
| Android 7+ (API 24) | `.apk` | Android System WebView | GitHub Actions o cualquier equipo con el SDK de Android |
| iOS 16+ | `.ipa` / Xcode | WKWebView | Solo en un Mac con Xcode |

## Estructura

```
src-tauri/
├── tauri.conf.json      # nombre, identificador (com.ecofinca.simulador), ventana, CSP, empaquetado
├── Cargo.toml           # aplicación Rust mínima (solo abre la ventana)
├── src/lib.rs, main.rs  # punto de entrada de escritorio y móvil
├── capabilities/        # permisos (solo los básicos: la app no usa APIs nativas)
├── icons/               # íconos generados con `npx tauri icon src-tauri/app-icon.png`
├── app-icon.png         # ícono fuente de 1024 px
└── gen/android/         # proyecto Android Studio generado por `tauri android init`
```

La aplicación no necesita permisos especiales: no accede a archivos, cámara ni red. La política de seguridad de contenido (CSP) solo permite recursos de la propia app.

## Requisitos para compilar localmente

Todas las plataformas: **Node.js 20+** y **Rust estable** (`rustup`). Después: `npm install`.

- **Windows:** Microsoft C++ Build Tools y WebView2 (incluido en Windows 10/11 actualizados).
- **macOS:** Xcode Command Line Tools (`xcode-select --install`).
- **Linux (Debian/Ubuntu):**
  ```bash
  sudo apt install libwebkit2gtk-4.1-dev build-essential file libxdo-dev libssl-dev \
    libayatana-appindicator3-dev librsvg2-dev patchelf
  ```
- **Android:** JDK 17 o superior, Android SDK (plataforma 36+, build-tools) y NDK. Variables de entorno:
  ```bash
  export ANDROID_HOME=$HOME/Android/Sdk
  export NDK_HOME=$ANDROID_HOME/ndk/<versión>
  rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
  ```
- **iOS:** un Mac con Xcode, CocoaPods y una cuenta de Apple Developer para instalar en un dispositivo.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run desktop:dev` | Abre la app de escritorio con recarga en caliente |
| `npm run desktop:build` | Genera los instaladores del sistema actual en `src-tauri/target/release/bundle/` |
| `npm run android:dev` | Ejecuta la app en un emulador o teléfono conectado por USB |
| `npm run android:build` | Genera el APK de producción (requiere firma, ver abajo) |
| `npm run tauri -- android build --apk --debug` | Genera un APK de depuración instalable sin configurar firma |
| `npm run ios:init` | Genera el proyecto de Xcode (`src-tauri/gen/apple`), solo en macOS |
| `npm run ios:dev` / `npm run ios:build` | Ejecuta o compila la app de iOS, solo en macOS |

Los comandos `desktop:*` y `android:*` ejecutan antes `scripts/verificar-tauri.mjs`, que comprueba que estén instalados Rust (y, en Linux, WebKitGTK; en Android, el SDK, el NDK y los destinos de Rust) y explica qué instalar si falta algo.

## Firma de Android

Android solo instala APK firmados. El APK de depuración se firma automáticamente con una clave de prueba. Para el APK de producción:

1. Crea una clave (guárdala y su contraseña en un lugar seguro: la necesitarás para publicar actualizaciones):
   ```bash
   keytool -genkeypair -v -keystore ecofinca.jks -alias ecofinca -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Crea `src-tauri/gen/android/keystore.properties` (está en `.gitignore`, nunca lo subas al repositorio):
   ```properties
   storeFile=/ruta/a/ecofinca.jks
   keyAlias=ecofinca
   password=tu-contraseña
   ```
3. Ejecuta `npm run android:build`. El APK queda en `src-tauri/gen/android/app/build/outputs/apk/universal/release/`.

Para que GitHub Actions firme el APK, crea estos secretos en *Settings → Secrets and variables → Actions*:

| Secreto | Valor |
|---|---|
| `ANDROID_KEY_BASE64` | El archivo `.jks` codificado: `base64 -w0 ecofinca.jks` |
| `ANDROID_KEY_ALIAS` | `ecofinca` |
| `ANDROID_KEY_PASSWORD` | La contraseña de la clave |

## Compilación en la nube (GitHub Actions)

El flujo `.github/workflows/aplicaciones.yml` compila Windows, macOS, Linux y Android:

- **Manual:** pestaña *Actions* → *Aplicaciones EcoFinca* → *Run workflow*. Puedes elegir compilar *todas* las plataformas, solo *escritorio* o solo *android*. Los instaladores quedan como *artifacts* de la ejecución.
- **Versión publicada:** al crear una etiqueta `vX.Y.Z` (por ejemplo `git tag v1.0.0 && git push origin v1.0.0`) se genera un borrador de *Release* con todos los instaladores.

## Instalación

- **Windows:** ejecuta el `.exe` o el `.msi`. Como no está firmado con un certificado de código, Windows SmartScreen puede mostrar un aviso: *Más información → Ejecutar de todas formas*.
- **macOS:** abre el `.dmg` y arrastra EcoFinca a *Aplicaciones*. Al no estar notarizada, la primera vez abre con clic derecho → *Abrir*.
- **Linux:** `sudo apt install ./EcoFinca_1.0.0_amd64.deb`, o da permiso de ejecución al `.AppImage` y ábrelo.
- **Android:** copia el `.apk` al teléfono, ábrelo y permite *instalar apps de origen desconocido* para el explorador de archivos.
- **iOS:** se instala desde Xcode en un dispositivo registrado, o mediante TestFlight con una cuenta de Apple Developer.

## Datos guardados

Cada instalación guarda sus partidas en el almacenamiento local de la app (IndexedDB del motor web): por ejemplo `~/.local/share/com.ecofinca.simulador` en Linux o `%LOCALAPPDATA%\com.ecofinca.simulador` en Windows. Desinstalar la app puede borrar las partidas.

## Detalles de adaptación

- `vite.config.ts` usa el puerto fijo 5173, escucha en `TAURI_DEV_HOST` para que el teléfono alcance el servidor de desarrollo e ignora `src-tauri/` al recargar.
- `index.html` declara `viewport-fit=cover` y `src/styles/globals.css` respeta las zonas seguras (`env(safe-area-inset-*)`) en iOS.
- En Android, `MainActivity.kt` pinta las barras del sistema con el verde de EcoFinca y limita la vista web al área libre de barras, muesca y teclado.
- Los textos de la interfaz hablan de «este dispositivo» en lugar de «este navegador», porque la misma interfaz corre en la web y en las apps.
