// lib/main.dart
import 'package:flutter/material.dart';
import 'package:campus_navigation/screens/splash_screen.dart'; // Imports the SplashScreen widget
import 'package:campus_navigation/utils/app_colors.dart';         // Imports your custom color definitions

void main() {
  // The runApp function takes the root widget of your application.
  // In this case, it's our MyApp StatelessWidget.
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  // A const constructor is used here as MyApp is immutable and improves performance.
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    // MaterialApp is the core widget that sets up your Material Design application.
    // It provides fundamental services like navigation, theming, etc.
    return MaterialApp(
      title: 'StackMaps', // The title of your application, visible in task switchers (Android) or browser tabs (Web)
      theme: ThemeData(
        // Defines the color scheme for your entire application.
        // colorScheme.fromSeed creates a harmonious color palette based on a single seed color.
        colorScheme: ColorScheme.fromSeed(seedColor: AppColors.accentPurple),
        useMaterial3: true, // Opts into Material 3 design language
      ),
      // debugShowCheckedModeBanner: false removes the "DEBUG" banner from the top-right corner in debug mode.
      debugShowCheckedModeBanner: false,

      // The 'home' property defines the first screen that is displayed when the app starts.
      // We are starting with the SplashScreen, which will handle its animation and then navigate
      // to either the mobile or web home page based on platform and screen size.
      home: const SplashScreen(),
    );
  }
}