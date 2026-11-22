package com.ecofinca.simulador

import android.graphics.Color
import android.os.Bundle
import android.view.View
import androidx.activity.SystemBarStyle
import androidx.activity.enableEdgeToEdge
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat

class MainActivity : TauriActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    // Barras del sistema con el verde de EcoFinca e íconos claros.
    val verdeBosque = Color.parseColor("#234D35")
    enableEdgeToEdge(
      statusBarStyle = SystemBarStyle.dark(verdeBosque),
      navigationBarStyle = SystemBarStyle.dark(verdeBosque),
    )
    super.onCreate(savedInstanceState)
    window.decorView.setBackgroundColor(verdeBosque)

    // La vista web ocupa solo el espacio libre entre las barras del sistema, la muesca
    // y el teclado, para que ningún control quede tapado.
    val content = findViewById<View>(android.R.id.content)
    ViewCompat.setOnApplyWindowInsetsListener(content) { view, insets ->
      val area = insets.getInsets(
        WindowInsetsCompat.Type.systemBars() or
          WindowInsetsCompat.Type.displayCutout() or
          WindowInsetsCompat.Type.ime(),
      )
      view.setPadding(area.left, area.top, area.right, area.bottom)
      WindowInsetsCompat.CONSUMED
    }
  }
}
