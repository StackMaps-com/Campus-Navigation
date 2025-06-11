// lib/screens/splash_screen.dart
import 'package:flutter/material.dart';
import 'dart:async';

import 'package:campus_navigation/screens/main_app_shell.dart'; // IMPORTANT: Navigating to MainAppShell now
import 'package:campus_navigation/utils/app_colors.dart'; // Ensure app_colors is imported

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _opacityAnimation;

  @override
  void initState() {
    super.initState();

    // Setup animation controller for fade-in effect
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2), // Animation duration
    );

    // Define the opacity animation (fades from 0.0 to 1.0)
    _opacityAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(_controller);

    // Start the animation
    _controller.forward();

    // Navigate to the MainAppShell after a delay
    Timer(const Duration(seconds: 3), () { // Display splash for 3 seconds
      if (mounted) { // Check if the widget is still in the widget tree
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (context) => const MainAppShell()), // Navigate to MainAppShell
        );
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose(); // Dispose the animation controller
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.primaryBackground, // Use your dark background color
      body: Center(
        child: FadeTransition( // Apply only the fade-in animation
          opacity: _opacityAnimation,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Your StackMaps Logo (Text-based)
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: const [
                  Text(
                    'Stack',
                    style: TextStyle(
                      // fontFamily: 'Inter', // Only use if you've added Inter font in pubspec.yaml
                      fontSize: 48,
                      fontWeight: FontWeight.w800,
                      color: AppColors.textLight, // White/light text
                      letterSpacing: -2.0,
                    ),
                  ),
                  Text(
                    'Maps',
                    style: TextStyle(
                      // fontFamily: 'Inter', // Only use if you've added Inter font in pubspec.yaml
                      fontSize: 48,
                      fontWeight: FontWeight.w800,
                      color: AppColors.accentPurple, // Amethyst purple accent
                      letterSpacing: -2.0,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              const Text(
                'Elevated Navigation. Fluid Discovery.', // Your desired tagline
                style: TextStyle(
                  // fontFamily: 'Inter', // Only use if you've added Inter font in pubspec.yaml
                  fontSize: 18,
                  color: AppColors.textLight,
                  letterSpacing: 0.5,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}