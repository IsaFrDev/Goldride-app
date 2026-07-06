package uz.goldride.app

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class GoldrideModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("GoldrideModule")

    Function("helloKotlin") { name: String ->
      "Salom $name! Ushbu xabar Kotlin tilida yozilgan Native Moduldan kelmoqda! 🚀"
    }
  }
}
