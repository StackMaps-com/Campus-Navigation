// lib/screens/main_app_shell.dart
import 'package:flutter/material.dart';
import 'package:campus_navigation/config/app_layout_config.dart';
import 'package:campus_navigation/screens/mobile_home_page.dart';
import 'package:campus_navigation/screens/web_home_page.dart';

class MainAppShell extends StatelessWidget {
  const MainAppShell({super.key});

  @override
  Widget build(BuildContext context) {
    // Use the config to determine which layout to display
    if (AppLayoutConfig.shouldUseWebDesktopLayout(context)) {
      return const WebHomePage();
    } else {
      return const MobileHomePage();
    }
  }
}