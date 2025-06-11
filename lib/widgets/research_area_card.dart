// lib/widgets/research_area_card.dart
import 'package:flutter/material.dart';
import 'package:campus_navigation/utils/app_colors.dart'; // Import custom colors

class ResearchAreaCard extends StatelessWidget {
  final String title;
  final String description;
  final String roomInfo;
  final VoidCallback? onReadMore;

  const ResearchAreaCard({
    super.key,
    required this.title,
    required this.description,
    required this.roomInfo,
    this.onReadMore,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      color: AppColors.cardBackgroundResearch, // Lighter background for research cards
      elevation: 4,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16.0),
      ),
      child: InkWell( // Making the whole card tappable if desired
        borderRadius: BorderRadius.circular(16.0),
        onTap: onReadMore, // You can make the whole card tap to read more
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start, // Align content to start
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textDark,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                description,
                style: const TextStyle(
                  fontSize: 13,
                  color: AppColors.textDark,
                  height: 1.4, // Line height
                ),
                maxLines: 3, // Limit description length
                overflow: TextOverflow.ellipsis, // Show ellipsis if text overflows
              ),
              const SizedBox(height: 8),
              Align(
                alignment: Alignment.centerRight, // Align button to the right
                child: TextButton(
                  onPressed: onReadMore,
                  style: TextButton.styleFrom(
                    backgroundColor: AppColors.accentPurple, // Amethyst purple button
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12.0), // Rounded button
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    minimumSize: Size.zero, // Remove default minimum size
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap, // Shrink tap area
                  ),
                  child: const Text(
                    'Read More',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textLight, // White text
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                roomInfo,
                style: const TextStyle(
                  fontSize: 12,
                  color: AppColors.textGrey,
                  fontStyle: FontStyle.italic,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}