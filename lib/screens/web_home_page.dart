// lib/screens/web_home_page.dart
import 'package:flutter/material.dart';
import 'package:campus_navigation/utils/app_colors.dart';
import 'package:campus_navigation/widgets/search_bar_widget.dart';
import 'package:campus_navigation/widgets/custom_card.dart';
import 'package:campus_navigation/widgets/research_area_card.dart';

class WebHomePage extends StatelessWidget {
  // Correct const constructor for a StatelessWidget
  const WebHomePage({super.key});

  // Make all static data lists 'static const' as their content is immutable
  static const List<Map<String, dynamic>> _quickNavItems = [
    {'icon': Icons.assistant_direction, 'text': 'Navigate Campus'},
    {'icon': Icons.school, 'text': 'Departments'},
    {'icon': Icons.restaurant, 'text': 'Cafeteria'},
    {'icon': Icons.local_library, 'text': 'Library'},
    {'icon': Icons.sports_esports, 'text': 'Sports Complex'},
    {'icon': Icons.meeting_room, 'text': 'Admin Office'},
  ];

  static const List<Map<String, String>> _happeningPlaces = [
    {'title': 'Innovation Hub', 'description': 'Latest student projects.'},
    {'title': 'Central Auditorium', 'description': 'Major events & programs.'},
    {'title': 'Incubation Center', 'description': 'Startup support.'},
    {'title': 'Student Union', 'description': 'Student activities.'},
  ];

  static const List<Map<String, String>> _researchAreas = [
    {
      'title': 'AI & Machine Learning Lab',
      'description': 'Cutting-edge research in neural networks and data science. Explore our breakthroughs and current projects.',
      'roomInfo': '[Room: A-205, Block A]',
    },
    {
      'title': 'Robotics & Automation Center',
      'description': 'Exploring the future of automated systems and intelligent robots. Join our pioneering work and see demos.',
      'roomInfo': '[Room: A-207, Block A]',
    },
    {
      'title': 'Sustainable Energy Unit',
      'description': 'Developing solutions for clean and renewable energy technologies. Learn about our green initiatives and studies.',
      'roomInfo': '[Room: A-209, Block A]',
    },
    {
      'title': 'Biotechnology Research Wing',
      'description': 'Advancing studies in genetic engineering and bioinformatics. Discover our latest biological findings.',
      'roomInfo': '[Room: B-101, Block B]',
    },
    {
      'title': 'Cyber Security Research Lab',
      'description': 'Focused on securing digital infrastructures and data privacy. Engage with experts in network protection.',
      'roomInfo': '[Room: C-303, Block C]',
    },
  ];

  // Helper method for Quick Navigation cards
  List<Widget> _buildQuickNavCards(BuildContext context) {
    return _quickNavItems.map((item) {
      return SizedBox( // Constrain size for Wrap layout
        width: 180, // Fixed width for each quick nav card
        height: 150, // Fixed height
        child: CustomCard( // CustomCard cannot be const here because of the dynamic onTap callback
          icon: item['icon'],
          text: item['text'],
          iconSize: 40,
          fontSize: 16,
          onTap: () {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('${item['text']} pressed (Web)!')),
            );
          },
        ),
      );
    }).toList();
  }

  // Helper method for Most Happening Places cards
  List<Widget> _buildHappeningPlacesCards(BuildContext context) {
    return _happeningPlaces.map((item) {
      return SizedBox( // Constrain size for Wrap layout
        width: 180, // Fixed width for each card
        height: 150, // Fixed height
        child: CustomCard( // CustomCard cannot be const here because of the dynamic onTap callback
          icon: Icons.lightbulb_outline,
          text: item['title']!,
          iconColor: AppColors.accentPurple,
          backgroundColor: AppColors.cardBackgroundResearch,
          iconSize: 40,
          fontSize: 16,
          onTap: () {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('${item['title']} pressed (Web)!')),
            );
          },
        ),
      );
    }).toList();
  }


  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.secondaryBackground, // Light background for the body
      appBar: AppBar(
        backgroundColor: AppColors.primaryBackground, // Dark header
        elevation: 0,
        title: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16.0), // const for padding
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // StackMaps Logo (Text-based, slightly larger for web)
              Row(
                children: const [ // Children are const here as the Text widgets are const
                  Text(
                    'Stack',
                    style: TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.w800,
                      color: AppColors.textLight,
                      letterSpacing: -1.5,
                    ),
                  ),
                  Text(
                    'Maps',
                    style: TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.w800,
                      color: AppColors.accentPurple,
                      letterSpacing: -1.5,
                    ),
                  ),
                ],
              ),
              // Settings Icon Button - cannot be const due to onPressed callback
              IconButton(
                icon: const Icon(Icons.settings, color: AppColors.textLight, size: 28),
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Settings button pressed (Web)!')),
                  );
                },
                splashRadius: 28,
              ),
            ],
          ),
        ),
        toolbarHeight: kToolbarHeight + 20, // Slightly taller app bar
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0), // const for padding
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // --- Search Bar ---
            SearchBarWidget( // Cannot be const because of onPressed callback
              hintText: "Search campus locations, departments, labs...",
              onSearchPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Web Search executed!')),
                );
              },
            ),
            const SizedBox(height: 32), // const for SizedBox

            // --- Quick Navigation & Most Happening Places Section (Side-by-Side) ---
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  flex: 1,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text( // const for Text
                        'Quick Navigation',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textDark,
                        ),
                      ),
                      const SizedBox(height: 16), // const for SizedBox
                      Wrap(
                        spacing: 16.0,
                        runSpacing: 16.0,
                        children: _buildQuickNavCards(context), // Children are not const
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 32), // const for SizedBox

                Expanded(
                  flex: 1,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text( // const for Text
                        'Most Happening Places',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textDark,
                        ),
                      ),
                      const SizedBox(height: 16), // const for SizedBox
                      Wrap(
                        spacing: 16.0,
                        runSpacing: 16.0,
                        children: _buildHappeningPlacesCards(context), // Children are not const
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 48), // const for SizedBox

            // --- Research Areas Section (Full Width) ---
            const Text( // const for Text
              'Research Areas',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w700,
                color: AppColors.textDark,
              ),
            ),
            const SizedBox(height: 16), // const for SizedBox
            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(), // const for physics
              itemCount: _researchAreas.length,
              itemBuilder: (context, index) {
                return Padding(
                  padding: const EdgeInsets.only(bottom: 16.0), // const for padding
                  child: ResearchAreaCard( // ResearchAreaCard cannot be const because of dynamic onTap callback
                    title: _researchAreas[index]['title']!,
                    description: _researchAreas[index]['description']!,
                    roomInfo: _researchAreas[index]['roomInfo']!,
                    onReadMore: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Read More for ${_researchAreas[index]['title']} (Web)!')),
                      );
                    },
                  ),
                );
              },
            ),
            const SizedBox(height: 24), // const for SizedBox
          ],
        ),
      ),
    );
  }
}