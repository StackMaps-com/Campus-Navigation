import 'package:flutter/material.dart';
import 'package:stack_map/pages/student_page.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {

  @override
  void initState() {
    super.initState();
    _navigateSelectionPage();
  }

  // Function to navigate to the SelectionPage after a delay
  void _navigateSelectionPage() async {
    await Future.delayed(Duration(seconds: 2)); // Delay of 2 seconds
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (context) => StudentPage()), // Navigating to SelectionPage
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      //backgroundColor: Colors.white,
      body: Center(
        child: Container(
          child: Image.asset('lib/images/Naveaselogo.jpg',),
        ),
      ),
    );
  }
}
