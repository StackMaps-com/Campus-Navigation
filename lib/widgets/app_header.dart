// lib/widgets/app_header.dart
import 'package:flutter/material.dart';
import 'package:campus_navigation/utils/app_colors.dart'; // Import custom colors

class AppBarHeader extends StatelessWidget implements PreferredSizeWidget {
  const AppBarHeader({super.key});

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight + 20); // Height of AppBar + extra padding

  @override
  Widget build(BuildContext context) {
    return AppBar(
      backgroundColor: AppColors.primaryBackground, // Dark header background
      titleSpacing: 0, // Remove default title spacing
      elevation: 0, // No shadow
      title: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16.0), // Padding on sides
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            // StackMaps Logo (Text-based)
            Row(
              children: const [
                Text(
                  'Stack',
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.w800,
                    color: AppColors.textLight, // White/light text
                    letterSpacing: -1.0,
                  ),
                ),
                Text(
                  'Maps',
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.w800,
                    color: AppColors.accentPurple, // Amethyst purple accent
                    letterSpacing: -1.0,
                  ),
                ),
              ],
            ),
            // Settings Icon Button
            IconButton(
              icon: const Icon(Icons.settings, color: AppColors.textLight, size: 24),
              onPressed: () {
                // TODO: Implement settings navigation or dialog
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Settings button pressed!')),
                );
              },
              splashRadius: 24, // Visual feedback on tap
            ),
          ],
        ),
      ),
    );
  }
}