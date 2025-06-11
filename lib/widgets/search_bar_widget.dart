// lib/widgets/search_bar_widget.dart
import 'package:flutter/material.dart';
import 'package:campus_navigation/utils/app_colors.dart'; // Import custom colors

class SearchBarWidget extends StatelessWidget {
  final TextEditingController? controller;
  final String hintText;
  final ValueChanged<String>? onChanged;
  final VoidCallback? onSearchPressed;

  const SearchBarWidget({
    super.key,
    this.controller,
    this.hintText = "Where would you like to go?",
    this.onChanged,
    this.onSearchPressed,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16.0), // Margin around the search bar
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
        decoration: BoxDecoration(
          color: AppColors.cardBackgroundLight.withOpacity(0.9), // Slightly transparent white
          borderRadius: BorderRadius.circular(30.0), // Fully rounded corners
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.1),
              spreadRadius: 2,
              blurRadius: 8,
              offset: const Offset(0, 4), // Subtle shadow
            ),
          ],
        ),
        child: Row(
          children: [
            const Icon(Icons.search, color: AppColors.textGrey, size: 20), // Search icon
            const SizedBox(width: 10), // Space between icon and text field
            Expanded(
              child: TextField(
                controller: controller,
                onChanged: onChanged,
                decoration: InputDecoration(
                  hintText: hintText,
                  hintStyle: const TextStyle(color: AppColors.textGrey),
                  border: InputBorder.none, // No default border
                  isDense: true, // Reduce vertical padding
                  contentPadding: EdgeInsets.zero, // Remove all content padding
                ),
                style: const TextStyle(color: AppColors.textDark, fontSize: 16),
                cursorColor: AppColors.accentPurple, // Custom cursor color
              ),
            ),
            if (onSearchPressed != null)
              IconButton(
                icon: const Icon(Icons.arrow_forward_ios, color: AppColors.textGrey, size: 18),
                onPressed: onSearchPressed,
                splashRadius: 20,
              ),
          ],
        ),
      ),
    );
  }
}