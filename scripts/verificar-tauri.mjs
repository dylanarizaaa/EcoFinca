/**
 * Verifica que el equipo tenga lo necesario para compilar EcoFinca con Tauri
 * y, si falta algo, explica en español cómo instalarlo.
 *
 * Uso: node scripts/verificar-tauri.mjs [android]
 */

import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { platform } from 'node:os'

const objetivo = process.argv[2] === 'android' ? 'android' : 'escritorio'
const so = platform()

function existe(comando) {
  try {
    execSync(comando, { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

const faltantes = []

if (!existe('cargo --version')) {
  const pasos = {
    win32: [
      '1. Instala «Microsoft C++ Build Tools»: https://visualstudio.microsoft.com/visual-cpp-build-tools/',
      '   y en el instalador marca «Desarrollo para el escritorio con C++».',
      '2. Instala Rust con rustup-init.exe desde https://rustup.rs (acepta la opción por defecto).',
      '3. Cierra y vuelve a abrir la terminal (y VS Code, si lo usas) para que reconozca «cargo».',
    ],
    darwin: [
      '1. Instala las herramientas de Xcode:  xcode-select --install',
      "2. Instala Rust:  curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh",
      '3. Cierra y vuelve a abrir la terminal.',
    ],
    linux: [
      "1. Instala Rust:  curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh",
      '2. Cierra y vuelve a abrir la terminal (o ejecuta:  source "$HOME/.cargo/env").',
    ],
  }
  faltantes.push({
    titulo: 'Rust (cargo) no está instalado o la terminal todavía no lo reconoce.',
    pasos: pasos[so] ?? pasos.linux,
  })
}

if (objetivo === 'escritorio' && so === 'linux' && existe('pkg-config --version') && !existe('pkg-config --exists webkit2gtk-4.1')) {
  faltantes.push({
    titulo: 'Faltan las librerías de sistema de Tauri (WebKitGTK 4.1).',
    pasos: [
      'En Debian/Ubuntu:',
      '  sudo apt install libwebkit2gtk-4.1-dev build-essential file libxdo-dev libssl-dev \\',
      '    libayatana-appindicator3-dev librsvg2-dev patchelf',
    ],
  })
}

if (objetivo === 'android') {
  const sdk = process.env.ANDROID_HOME
  const ndk = process.env.NDK_HOME
  if (!sdk || !existsSync(sdk)) {
    faltantes.push({
      titulo: 'No se encontró el SDK de Android (variable ANDROID_HOME).',
      pasos: [
        'Instala Android Studio (https://developer.android.com/studio) y, en SDK Manager, la plataforma',
        'Android 36, «SDK Build-Tools», «Android SDK Platform-Tools» y «NDK (Side by side)».',
        'Luego define ANDROID_HOME con la ruta del SDK (en Windows suele ser %LOCALAPPDATA%\\Android\\Sdk).',
      ],
    })
  }
  if (!ndk || !existsSync(ndk)) {
    faltantes.push({
      titulo: 'No se encontró el NDK de Android (variable NDK_HOME).',
      pasos: ['Define NDK_HOME con la carpeta del NDK, por ejemplo  <ANDROID_HOME>/ndk/<versión>.'],
    })
  }
  if (existe('rustup --version')) {
    try {
      const targets = execSync('rustup target list --installed', { encoding: 'utf8' })
      if (!targets.includes('aarch64-linux-android')) {
        faltantes.push({
          titulo: 'Faltan los destinos de compilación de Rust para Android.',
          pasos: ['rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android'],
        })
      }
    } catch {
      /* rustup no responde: el aviso de Rust ya cubre el caso */
    }
  }
}

if (faltantes.length > 0) {
  console.error('\nEcoFinca necesita instalar algunas herramientas antes de compilar la app de ' + objetivo + ':\n')
  for (const f of faltantes) {
    console.error('• ' + f.titulo)
    for (const p of f.pasos) console.error('    ' + p)
    console.error('')
  }
  console.error('Guía completa: docs/APLICACIONES.md\n')
  process.exit(1)
}
