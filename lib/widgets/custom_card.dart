// lib/widgets/custom_card.dart
import 'package:flutter/material.dart';
import 'package:campus_navigation/utils/app_colors.dart'; // Import custom colors
// reusable card for "Quick Navigation" and "Most Happening Places."
class CustomCard extends StatelessWidget {
  final IconData icon;
  final String text;
  final VoidCallback? onTap;
  final Color backgroundColor;
  final Color iconColor;
  final Color textColor;
  final double iconSize;
  final double fontSize;

  const CustomCard({
    super.key,
    required this.icon,
    required this.text,
    this.onTap,
    this.backgroundColor = AppColors.cardBackgroundLight,
    this.iconColor = AppColors.accentBlue, // Default blue for quick nav
    this.textColor = AppColors.textDark,
    this.iconSize = 36.0,
    this.fontSize = 14.0,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      color: backgroundColor,
      elevation: 4, // Subtle shadow
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16.0), // Rounded corners
      ),
      child: InkWell( // Provides ripple effect on tap
        borderRadius: BorderRadius.circular(16.0),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                size: iconSize,
                color: iconColor,
              ),
              const SizedBox(height: 8),
              Text(
                text,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: fontSize,
                  fontWeight: FontWeight.w600,
                  color: textColor,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}