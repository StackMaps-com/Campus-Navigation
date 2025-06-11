// lib/screens/home_page.dart
import 'package:flutter/material.dart';
import 'package:campus_navigation/widgets/app_header.dart';          // Correct import for AppBarHeader
import 'package:campus_navigation/widgets/search_bar_widget.dart'; // Correct import for SearchBarWidget
import 'package:campus_navigation/widgets/custom_card.dart';
import 'package:campus_navigation/widgets/research_area_card.dart';
import 'package:campus_navigation/utils/app_colors.dart';

class MobileHomePage extends StatelessWidget {
  const MobileHomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const AppBarHeader(), // Our custom app bar
      backgroundColor: AppColors.secondaryBackground, // Light background for the body
      body: Column(
        children: [
          // Search Bar
          SearchBarWidget( // This widget is now correctly imported and recognized
            onSearchPressed: () {
              // TODO: Implement actual search logic or navigation to search results
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Search button pressed!')),
              );
            },
          ),
          Expanded( // Allows the content to scroll if it exceeds screen height
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start, // Align content to the left
                children: [
                  // --- Quick Navigation Section ---
                  const Text(
                    'Quick Navigation',
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textDark,
                    ),
                  ),
                  const SizedBox(height: 16),
                  GridView.builder(
                    shrinkWrap: true, // Takes only as much space as its children
                    physics: const NeverScrollableScrollPhysics(), // Disable internal scrolling
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2, // 2 cards per row
                      crossAxisSpacing: 16.0, // Horizontal space between cards
                      mainAxisSpacing: 16.0, // Vertical space between cards
                      childAspectRatio: 1.2, // Aspect ratio of each card (width/height)
                    ),
                    itemCount: 4, // Number of quick navigation items
                    itemBuilder: (context, index) {
                      // Data for Quick Navigation cards (can be moved to a separate model later)
                      final List<Map<String, dynamic>> quickNavItems = [
                        {
                          'icon': Icons.assistant_direction, // A direction icon
                          'text': 'Navigate Block A',
                          'onTap': () {
                            // TODO: Implement navigation to indoor map
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Navigate Block A pressed!')),
                            );
                          },
                        },
                        {
                          'icon': Icons.school,
                          'text': 'Departments',
                          'onTap': () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Departments pressed!')),
                            );
                          },
                        },
                        {
                          'icon': Icons.restaurant,
                          'text': 'Cafeteria',
                          'onTap': () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Cafeteria pressed!')),
                            );
                          },
                        },
                        {
                          'icon': Icons.local_library,
                          'text': 'Library',
                          'onTap': () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Library pressed!')),
                            );
                          },
                        },
                      ];
                      return CustomCard(
                        icon: quickNavItems[index]['icon'],
                        text: quickNavItems[index]['text'],
                        onTap: quickNavItems[index]['onTap'],
                      );
                    },
                  ),
                  const SizedBox(height: 32), // Space between sections

                  // --- Most Happening Places Section ---
                  const Text(
                    'Most Happening Places',
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textDark,
                    ),
                  ),
                  const SizedBox(height: 16),
                  GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2, // 2 cards per row
                      crossAxisSpacing: 16.0,
                      mainAxisSpacing: 16.0,
                      childAspectRatio: 1.1, // Slightly different aspect ratio
                    ),
                    itemCount: 2, // Number of happening places
                    itemBuilder: (context, index) {
                      final List<Map<String, String>> happeningPlaces = [
                        {
                          'title': 'Innovation Hub',
                          'description': 'Discover the latest student projects and startup initiatives. Often buzzing with activity!',
                        },
                        {
                          'title': 'Central Auditorium',
                          'description': 'Host to major events, guest lectures, and cultural programs throughout the year.',
                        },
                      ];
                      return CustomCard(
                        icon: Icons.lightbulb_outline, // Placeholder icon
                        text: happeningPlaces[index]['title']!,
                        iconColor: AppColors.accentPurple, // Different icon color
                        backgroundColor: AppColors.cardBackgroundResearch, // Lighter background
                        onTap: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('${happeningPlaces[index]['title']} pressed!')),
                          );
                        },
                      );
                    },
                  ),
                  const SizedBox(height: 32),

                  // --- Research Areas Section ---
                  const Text(
                    'Research Areas',
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textDark,
                    ),
                  ),
                  const SizedBox(height: 16),
                  ListView.builder( // Using ListView for blog-like cards
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(), // Disable internal scrolling
                    itemCount: 3, // Number of research areas
                    itemBuilder: (context, index) {
                      final List<Map<String, String>> researchAreas = [
                        {
                          'title': 'AI & Machine Learning Lab',
                          'description': 'Cutting-edge research in neural networks and data science. Explore our breakthroughs.',
                          'roomInfo': '[Room: A-205]',
                        },
                        {
                          'title': 'Robotics & Automation Center',
                          'description': 'Exploring the future of automated systems and intelligent robots. Join our pioneering work.',
                          'roomInfo': '[Room: A-207]',
                        },
                        {
                          'title': 'Sustainable Energy Unit',
                          'description': 'Developing solutions for clean and renewable energy technologies. Learn about our green initiatives.',
                          'roomInfo': '[Room: A-209]',
                        },
                      ];
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 16.0), // Space between cards
                        child: ResearchAreaCard(
                          title: researchAreas[index]['title']!,
                          description: researchAreas[index]['description']!,
                          roomInfo: researchAreas[index]['roomInfo']!,
                          onReadMore: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text('Read More for ${researchAreas[index]['title']}!')),
                            );
                          },
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: 32), // Padding at the bottom
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}