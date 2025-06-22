// lib/config/app_layout_config.dart
import 'package:flutter/foundation.dart' show kIsWeb; // kIsWeb identifies if running on web
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart'; // Import for debugPrint

// This class helps determine if we should show a desktop-friendly layout.
class AppLayoutConfig {
  // Define a threshold for what constitutes a "desktop-sized" width on the web.
  // Below this, we'll treat it as a mobile/tablet-like experience, even on web.
  static const double _webDesktopThresholdWidth = 800.0; // Adjust as needed

  // Check if the current environment and screen size warrant a desktop layout.
  static bool shouldUseWebDesktopLayout(BuildContext context) {
    if (kIsWeb) { // Only consider this for web platforms
      final screenWidth = MediaQuery.of(context).size.width;
      // IMPORTANT: Check your VS Code debug console for these print statements!
      debugPrint('AppLayoutConfig DEBUG: kIsWeb = $kIsWeb');
      debugPrint('AppLayoutConfig DEBUG: screenWidth = $screenWidth');
      debugPrint('AppLayoutConfig DEBUG: threshold = $_webDesktopThresholdWidth');
      debugPrint('AppLayoutConfig DEBUG: shouldUseWebDesktopLayout = ${screenWidth > _webDesktopThresholdWidth}');
      return screenWidth > _webDesktopThresholdWidth;
    }
    return false; // Not web, or not wide enough for desktop layout
  }
}