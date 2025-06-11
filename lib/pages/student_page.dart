import 'package:flutter/material.dart';
import 'package:stack_map/map_screen.dart';
import 'dart:math' as math;

class StudentPage extends StatefulWidget {
  const StudentPage({super.key});

  @override
  State<StudentPage> createState() => _StudentPageState();
}

class _StudentPageState extends State<StudentPage> with SingleTickerProviderStateMixin {
  int selectedIndex = 0;
  String selectedCategory = "Blocks";
  late AnimationController _animationController;
  final List<GlobalKey> _itemKeys = [];

  List<String> itemLabels = [
    "Blocks", "Canteen", "Library", "Labs", "Auditorium",
    "Research Centres", "Office", "Scholarship", "Gym", "Workshops"
  ];

  Map<String, List<Map<String, dynamic>>> categoryData = {
    "Blocks": [
      {"name": "ABC BLOCK", "icon": Icons.apartment},
      {"name": "PG BLOCK", "icon": Icons.home_work},
      {"name": "D BLOCK", "icon": Icons.location_city},
      {"name": "E BLOCK", "icon": Icons.location_city},
    ],
    "Canteen": [
      {"name": "COCO-COLA Canteen", "icon": Icons.fastfood},
      {"name": "PEB Canteen", "icon": Icons.restaurant},
      {"name": "Annapurna Canteen", "icon": Icons.local_dining},
      {"name": "Hostel Canteen", "icon": Icons.emoji_food_beverage},
    ],
    "Library": [
      {"name": "CSE Library", "icon": Icons.menu_book},
      {"name": "D-block Library", "icon": Icons.library_books},
    ],
    "Labs": [
      {"name": "Physics Lab", "icon": Icons.science},
      {"name": "Chemistry Lab", "icon": Icons.biotech},
      {"name": "Data Structures Lab", "icon": Icons.computer},
      {"name": "Tinkering Lab", "icon": Icons.build},
    ],
    "Auditorium": [
      {"name": "B-block Seminar Hall", "icon": Icons.account_balance},
      {"name": "KS-Auditorium", "icon": Icons.spatial_audio},
      {"name": "APJ Abdul Kalam Auditorium", "icon": Icons.mic_external_on},
    ],
    "Research Centres": [
      {"name": "VJ RESEARCH HUB", "icon": Icons.lightbulb},
    ],
    "Office": [
      {"name": "Principal Office", "icon": Icons.account_balance},
    ],
    "Scholarship": [
      {"name": "Scholarship Section", "icon": Icons.monetization_on},
    ],
    "Gym": [
      {"name": "GYM", "icon": Icons.fitness_center},
    ],
    "Workshops": [
      {"name": "IT Workshop", "icon": Icons.engineering},
    ],
  };

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    _animationController.forward();

    // Initialize item keys
    for (int i = 0; i < itemLabels.length; i++) {
      _itemKeys.add(GlobalKey());
    }
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final screenSize = MediaQuery.of(context).size;
    final isDesktop = screenSize.width > 600;

    return Scaffold(
      // Updated background color to a subtle gradient-friendly color
      backgroundColor: Color(0xFFF0F4FF),
      appBar: AppBar(
        automaticallyImplyLeading: false,
        flexibleSpace: Container(
          decoration: BoxDecoration(
            // Updated app bar gradient with vibrant colors
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xFF6C11FF), Color(0xFFFF426F)],
            ),
          ),
        ),
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  "Hi, Fam..! 👋",
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                TweenAnimationBuilder(
                  tween: Tween<double>(begin: 0.0, end: 1.0),
                  duration: Duration(milliseconds: 800),
                  builder: (context, value, child) {
                    return Transform.scale(
                      scale: value,
                      child: child,
                    );
                  },
                  child: Image.asset(
                    'lib/images/logo.png',
                    height: 40,
                    width: 40,
                  ),
                ),
              ],
            ),
            SizedBox(height: 10),
            TweenAnimationBuilder(
              tween: Tween<double>(begin: 0.0, end: 1.0),
              duration: Duration(milliseconds: 800),
              builder: (context, value, child) {
                return Transform.translate(
                  offset: Offset(0, 20 * (1 - value)),
                  child: Opacity(
                    opacity: value,
                    child: child,
                  ),
                );
              },
              child: Container(
                height: 40,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(15),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.1),
                      blurRadius: 5,
                      offset: Offset(0, 3),
                    ),
                  ],
                ),
                child: TextField(
                  decoration: InputDecoration(
                    hintText: 'Search a room...',
                    hintStyle: TextStyle(
                      color: Colors.grey,
                      fontSize: 14,
                    ),
                    // Updated search icon color to match new gradient
                    prefixIcon: Icon(Icons.search, color: Color(0xFFFF426F)),
                    border: InputBorder.none,
                    contentPadding: EdgeInsets.symmetric(horizontal: 15, vertical: 17),
                  ),
                ),
              ),
            ),
          ],
        ),
        toolbarHeight: 120,
      ),

      body: Row(
        children: [
          if (isDesktop)
            Container(
              width: 250,
              decoration: BoxDecoration(
                color: Colors.white,
                boxShadow: [
                  BoxShadow(
                    color: Colors.grey.withOpacity(0.1),
                    spreadRadius: 1,
                    blurRadius: 3,
                    offset: Offset(1, 0),
                  ),
                ],
              ),
              child: ListView.builder(
                padding: EdgeInsets.symmetric(vertical: 10),
                itemCount: itemLabels.length,
                itemBuilder: (context, index) {
                  bool isSelected = selectedIndex == index;

                  return AnimatedBuilder(
                    animation: _animationController,
                    builder: (context, child) {
                      final double start = index / itemLabels.length;
                      final double end = (index + 1) / itemLabels.length;
                      final double value = Interval(start, end, curve: Curves.easeOut)
                          .transform(_animationController.value);

                      return Transform.translate(
                        offset: Offset(-100 * (1 - value), 0),
                        child: Opacity(opacity: value, child: child),
                      );
                    },
                    child: Container(
                      key: _itemKeys[index],
                      margin: EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        // Updated selected item gradient
                        gradient: isSelected
                            ? LinearGradient(
                          colors: [Color(0xFF6C11FF), Color(0xFFAA49FA)],
                          begin: Alignment.centerLeft,
                          end: Alignment.centerRight,
                        )
                            : null,
                        color: isSelected ? null : Colors.transparent,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: ListTile(
                        selected: isSelected,
                        onTap: () {
                          setState(() {
                            selectedIndex = index;
                            selectedCategory = itemLabels[index];
                          });
                        },
                        title: Text(
                          itemLabels[index],
                          style: TextStyle(
                            color: isSelected ? Colors.white : Colors.black87,
                            fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                            fontSize: 15,
                          ),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),

          Expanded(
            child: Column(
              children: [
                if (!isDesktop)
                  AnimatedBuilder(
                    animation: _animationController,
                    builder: (context, child) {
                      return Transform.translate(
                        offset: Offset(0, 30 * (1 - _animationController.value)),
                        child: Opacity(
                          opacity: _animationController.value,
                          child: child,
                        ),
                      );
                    },
                    child: Container(
                      height: 50,
                      margin: EdgeInsets.only(top: 10),
                      child: ListView.builder(
                        scrollDirection: Axis.horizontal,
                        padding: EdgeInsets.symmetric(horizontal: 15),
                        itemCount: itemLabels.length,
                        itemBuilder: (context, index) {
                          bool isSelected = selectedIndex == index;
                          return Padding(
                            padding: EdgeInsets.only(right: 10),
                            child: GestureDetector(
                              onTap: () {
                                setState(() {
                                  selectedIndex = index;
                                  selectedCategory = itemLabels[index];
                                });
                              },
                              child: Container(
                                padding: EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                                decoration: BoxDecoration(
                                  // Updated mobile category tabs gradient
                                  gradient: isSelected
                                      ? LinearGradient(
                                    colors: [Color(0xFF6C11FF), Color(0xFFFF426F)],
                                    begin: Alignment.topLeft,
                                    end: Alignment.bottomRight,
                                  )
                                      : null,
                                  color: isSelected ? null : Colors.transparent,
                                  border: Border.all(
                                    // Updated border color
                                    color: Color(0xFF6C11FF),
                                    width: 1.5,
                                  ),
                                  borderRadius: BorderRadius.circular(20),
                                  boxShadow: isSelected
                                      ? [
                                    BoxShadow(
                                      // Updated shadow color
                                      color: Color(0xFF6C11FF).withOpacity(0.3),
                                      blurRadius: 8,
                                      offset: Offset(0, 3),
                                    ),
                                  ]
                                      : null,
                                ),
                                child: Text(
                                  itemLabels[index],
                                  style: TextStyle(
                                    color: isSelected ? Colors.white : Colors.black,
                                    fontSize: 14,
                                    fontWeight: FontWeight.w500,
                                    letterSpacing: 0.5,
                                  ),
                                ),
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ),

                TweenAnimationBuilder(
                  tween: Tween<double>(begin: 0.0, end: 1.0),
                  duration: Duration(milliseconds: 600),
                  builder: (context, value, child) {
                    return Opacity(
                      opacity: value,
                      child: Transform.translate(
                        offset: Offset(0, 20 * (1 - value)),
                        child: child,
                      ),
                    );
                  },
                  child: Padding(
                    padding: EdgeInsets.all(16),
                    child: Container(
                      padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      decoration: BoxDecoration(
                        // Updated category title gradient
                        gradient: LinearGradient(
                          colors: [Color(0xFF6C11FF), Color(0xFFFF426F)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(12),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.1),
                            blurRadius: 4,
                            offset: Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Text(
                        selectedCategory.toUpperCase(),
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                          letterSpacing: 1.2,
                        ),
                      ),
                    ),
                  ),
                ),

                Expanded(
                  child: Padding(
                    padding: EdgeInsets.symmetric(horizontal: 15),
                    child: SingleChildScrollView(
                      child: GridView.builder(
                        shrinkWrap: true,
                        physics: NeverScrollableScrollPhysics(),
                        itemCount: categoryData[selectedCategory]?.length ?? 0,
                        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: isDesktop ? 4 : 2,
                          crossAxisSpacing: 15,
                          mainAxisSpacing: 15,
                          childAspectRatio: 1.1,
                        ),
                        itemBuilder: (context, index) {
                          var item = categoryData[selectedCategory]![index];
                          return AnimatedBuilder(
                            animation: _animationController,
                            builder: (context, child) {
                              final delay = index * 0.2;
                              final value = _animationController.value > delay
                                  ? (_animationController.value - delay) / (1 - delay)
                                  : 0.0;

                              return Transform.scale(
                                scale: math.max(0.6, value),
                                child: Opacity(
                                  opacity: value,
                                  child: child,
                                ),
                              );
                            },
                            child: GestureDetector(
                              onTap: () {
                                Navigator.push(
                                  context,
                                  PageRouteBuilder(
                                    pageBuilder: (context, animation, secondaryAnimation) => MyApp(),
                                    transitionsBuilder: (context, animation, secondaryAnimation, child) {
                                      var begin = Offset(1.0, 0.0);
                                      var end = Offset.zero;
                                      var curve = Curves.easeInOut;
                                      var tween = Tween(begin: begin, end: end).chain(CurveTween(curve: curve));
                                      var offsetAnimation = animation.drive(tween);
                                      return SlideTransition(position: offsetAnimation, child: child);
                                    },
                                  ),
                                );
                              },
                              child: Container(
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(15),
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black.withOpacity(0.1),
                                      blurRadius: 8,
                                      offset: Offset(0, 4),
                                    ),
                                  ],
                                ),
                                child: Card(
                                  elevation: 0,
                                  color: Colors.transparent,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(15),
                                  ),
                                  child: Container(
                                    decoration: BoxDecoration(
                                      borderRadius: BorderRadius.circular(15),
                                      gradient: LinearGradient(
                                        begin: Alignment.topLeft,
                                        end: Alignment.bottomRight,
                                        colors: [Colors.white, Color(0xFFF0F4FF)],
                                      ),
                                    ),
                                    child: Column(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        TweenAnimationBuilder(
                                          tween: Tween<double>(begin: 0.0, end: 1.0),
                                          duration: Duration(milliseconds: 500),
                                          builder: (context, value, child) {
                                            return Transform.scale(
                                              scale: value,
                                              child: child,
                                            );
                                          },
                                          child: Container(
                                            padding: EdgeInsets.all(10),
                                            decoration: BoxDecoration(
                                              shape: BoxShape.circle,
                                              // Updated icon circle gradient
                                              gradient: LinearGradient(
                                                begin: Alignment.topLeft,
                                                end: Alignment.bottomRight,
                                                colors: [Color(0xFF6C11FF), Color(0xFFFF426F)],
                                              ),
                                            ),
                                            child: Icon(
                                              item["icon"],
                                              size: 30,
                                              color: Colors.white,
                                            ),
                                          ),
                                        ),
                                        SizedBox(height: 10),
                                        Text(
                                          item["name"]!,
                                          textAlign: TextAlign.center,
                                          style: TextStyle(
                                            fontSize: 14,
                                            fontWeight: FontWeight.w600,
                                            color: Colors.black87,
                                          ),
                                        ),
                                        SizedBox(height: 5),
                                        Container(
                                          height: 3,
                                          width: 40,
                                          decoration: BoxDecoration(
                                            // Updated divider gradient
                                            gradient: LinearGradient(
                                              colors: [Color(0xFF6C11FF), Color(0xFFFF426F)],
                                              begin: Alignment.centerLeft,
                                              end: Alignment.centerRight,
                                            ),
                                            borderRadius: BorderRadius.circular(10),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
