// lib/screens/searchscreen.dart
import 'package:flutter/material.dart';
import 'package:stack_map/pages/CampusNavigator.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final TextEditingController fromController = TextEditingController();
  final TextEditingController toController = TextEditingController();

  String? fromRoom;
  String? toRoom;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF3F4F8),
      appBar: AppBar(
        title: const Text("Campus Navigator", style: TextStyle(color: Colors.white)),
        backgroundColor: const Color(0xFF6C11FF),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(20),
            child: Card(
              elevation: 8,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  children: [
                    TextField(
                      controller: fromController,
                      decoration: const InputDecoration(
                        labelText: "From (e.g., A-101)",
                        prefixIcon: Icon(Icons.my_location),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: toController,
                      decoration: const InputDecoration(
                        labelText: "To (e.g., B-204)",
                        prefixIcon: Icon(Icons.flag),
                      ),
                    ),
                    const SizedBox(height: 20),
                    ElevatedButton(
                      onPressed: () {
                        setState(() {
                          fromRoom = fromController.text;
                          toRoom = toController.text;
                        });
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.deepPurple,
                        foregroundColor: Colors.white,
                      ),
                      child: const Text("Navigate"),
                    ),
                  ],
                ),
              ),
            ),
          ),

          if (fromRoom != null && toRoom != null)
            Expanded(
              child: CampusMapNavigator(
                fromRoom: fromRoom!,
                toRoom: toRoom!,
              ),
            ),
        ],
      ),
    );
  }
}
