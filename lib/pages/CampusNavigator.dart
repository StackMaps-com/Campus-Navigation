
import 'dart:convert';
import 'dart:math';
import 'dart:collection';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show rootBundle;
import 'package:stack_map/pages/student_page.dart';
class CampusMapNavigator extends StatefulWidget {
  final String fromRoom;
  final String toRoom;

  const CampusMapNavigator({super.key, required this.fromRoom, required this.toRoom});

  @override
  State<CampusMapNavigator> createState() => _CampusMapNavigatorState();
}

class _CampusMapNavigatorState extends State<CampusMapNavigator> {
  List<FloorPlanObject>? floor1Objects;
  List<FloorPlanObject>? floor2Objects;
  int currentFloor = 1;

  List<Offset>? routePoints;
  bool isLoading = true;

  bool waitingForReached = false;
  List<Offset>? pendingRoutePoints;
  int? pendingFloor;

  final TransformationController _transformationController = TransformationController();

  Grid? floor1Grid;
  DijkstraPathfinder? floor1Pathfinder;
  Grid? floor2Grid;
  DijkstraPathfinder? floor2Pathfinder;

  static const double _cellSize = 15.0;
  static const IconData locationIcon = Icons.location_on_rounded;

  @override
  void initState() {
    super.initState();
    loadFloorPlansAndSetupPathfinding();
  }

  Future<void> loadFloorPlansAndSetupPathfinding() async {
    floor1Objects = await loadFloorPlan('assets/ABC2.json');
    floor2Objects = await loadFloorPlan('assets/ABC_4.json');

    if (floor1Objects != null && floor1Objects!.isNotEmpty) {
      floor1Grid = Grid(width: 1, height: 1, cellSize: _cellSize, bounds: Rect.zero);
      floor1Grid!.populateGrid(floor1Objects!);
      floor1Pathfinder = DijkstraPathfinder(floor1Grid!);
    }
    if (floor2Objects != null && floor2Objects!.isNotEmpty) {
      floor2Grid = Grid(width: 1, height: 1, cellSize: _cellSize, bounds: Rect.zero);
      floor2Grid!.populateGrid(floor2Objects!);
      floor2Pathfinder = DijkstraPathfinder(floor2Grid!);
    }

    WidgetsBinding.instance.addPostFrameCallback((_) => navigate());
    setState(() => isLoading = false);
  }

  FloorPlanObject? searchRoom(List<FloorPlanObject> objects, String query) {
    String normalizedQuery = query.trim().toLowerCase();
    for (var obj in objects) {
      String normalizedName = obj.name.trim().toLowerCase();
      if (normalizedName.contains(normalizedQuery)) return obj;
    }
    return null;
  }

  Offset computeCenter(FloorPlanObject obj) {
    double sumX = 0, sumY = 0;
    for (var point in obj.points) {
      sumX += point.dx;
      sumY += point.dy;
    }
    return Offset(sumX / obj.points.length, sumY / obj.points.length);
  }

  void navigate() {
    final currentQuery = widget.fromRoom.trim();
    final destQuery = widget.toRoom.trim();

    if (currentQuery.isEmpty || destQuery.isEmpty) return;

    FloorPlanObject? currentObj1 = searchRoom(floor1Objects!, currentQuery);
    FloorPlanObject? currentObj2 = searchRoom(floor2Objects!, currentQuery);
    FloorPlanObject? destObj1 = searchRoom(floor1Objects!, destQuery);
    FloorPlanObject? destObj2 = searchRoom(floor2Objects!, destQuery);

    int currentRoomFloor;
    FloorPlanObject? currentObj;
    if (currentObj1 != null) {
      currentRoomFloor = 1;
      currentObj = currentObj1;
    } else if (currentObj2 != null) {
      currentRoomFloor = 2;
      currentObj = currentObj2;
    } else {
      return;
    }

    int destRoomFloor;
    FloorPlanObject? destObj;
    if (destObj1 != null) {
      destRoomFloor = 1;
      destObj = destObj1;
    } else if (destObj2 != null) {
      destRoomFloor = 2;
      destObj = destObj2;
    } else {
      return;
    }

    Offset currentCenter = computeCenter(currentObj);
    Offset destCenter = computeCenter(destObj);

    final pathfinder = (currentRoomFloor == 1) ? floor1Pathfinder : floor2Pathfinder;
    final grid = (currentRoomFloor == 1) ? floor1Grid : floor2Grid;

    if (pathfinder == null || grid == null) return;

    if (currentRoomFloor == destRoomFloor) {
      List<Node>? pathNodes = pathfinder.findPath(currentCenter, destCenter);
      if (pathNodes != null) {
        setState(() {
          currentFloor = currentRoomFloor;
          routePoints = pathNodes.map((node) => grid.toPixelCoords(node.x, node.y)).toList();
          routePoints!.insert(0, currentCenter);
          routePoints!.add(destCenter);
          routePoints = routePoints!.toSet().toList();
          waitingForReached = false;
        });
      }
    } else {
      FloorPlanObject? connectorCurrent = (currentRoomFloor == 1)
          ? (searchRoom(floor1Objects!, "stairs") ?? searchRoom(floor1Objects!, "lift"))
          : (searchRoom(floor2Objects!, "stairs") ?? searchRoom(floor2Objects!, "lift"));

      FloorPlanObject? connectorDest = (destRoomFloor == 1)
          ? (searchRoom(floor1Objects!, "stairs") ?? searchRoom(floor1Objects!, "lift"))
          : (searchRoom(floor2Objects!, "stairs") ?? searchRoom(floor2Objects!, "lift"));

      if (connectorCurrent == null || connectorDest == null) return;

      Offset connectorCurrentCenter = computeCenter(connectorCurrent);
      Offset connectorDestCenter = computeCenter(connectorDest);

      List<Node>? pathNodesToConnector = pathfinder.findPath(currentCenter, connectorCurrentCenter);
      if (pathNodesToConnector != null) {
        setState(() {
          currentFloor = currentRoomFloor;
          routePoints = pathNodesToConnector.map((node) => grid.toPixelCoords(node.x, node.y)).toList();
          routePoints!.insert(0, currentCenter);
          routePoints = routePoints!.toSet().toList();
          waitingForReached = true;

          final nextGrid = (destRoomFloor == 1) ? floor1Grid : floor2Grid;
          final nextPathfinder = (destRoomFloor == 1) ? floor1Pathfinder : floor2Pathfinder;

          List<Node>? pathNodesFromConnector = nextPathfinder?.findPath(connectorDestCenter, destCenter);
          if (pathNodesFromConnector != null) {
            pendingRoutePoints = pathNodesFromConnector.map((node) => nextGrid!.toPixelCoords(node.x, node.y)).toList();
            pendingRoutePoints!.add(destCenter);
            pendingRoutePoints = pendingRoutePoints!.toSet().toList();
            pendingFloor = destRoomFloor;
          }
        });
      }
    }
  }

  void reachedPressed() {
    if (pendingRoutePoints != null && pendingFloor != null) {
      setState(() {
        currentFloor = pendingFloor!;
        routePoints = pendingRoutePoints;
        waitingForReached = false;
        pendingRoutePoints = null;
        pendingFloor = null;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    List<FloorPlanObject> currentFloorPlan = (currentFloor == 1) ? floor1Objects! : floor2Objects!;
    Grid? currentGrid = (currentFloor == 1) ? floor1Grid : floor2Grid;

    return Column(
      children: [
        Expanded(
          child: Container(
            margin: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.grey.shade200.withOpacity(0.7),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.deepPurple, width: 2),
            ),
            child: LayoutBuilder(
              builder: (context, constraints) {
                double initialScale = 0.5;
                _transformationController.value = Matrix4.identity()..scale(initialScale);
                return InteractiveViewer(
                  transformationController: _transformationController,
                  minScale: 0.4 * initialScale,
                  maxScale: 2.0 * initialScale,
                  constrained: false,
                  child: SizedBox(
                    width: currentGrid?.bounds.width ?? constraints.maxWidth,
                    height: currentGrid?.bounds.height ?? constraints.maxHeight,
                    child: CustomPaint(
                      painter: FloorPlanPainter(
                        objects: currentFloorPlan,
                        route: routePoints,
                        grid: currentGrid,
                        locationIcon: locationIcon,
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ),
        if (waitingForReached)
          Align(
            alignment: Alignment.bottomRight,
            child: Padding(
              padding: const EdgeInsets.only(right:60,bottom: 24),
              child: FloatingActionButton(
                onPressed: reachedPressed,
                backgroundColor: Colors.deepPurple,
                child: const Icon(Icons.check, size: 32),
              ),
            ),
          ),
      ],
    );
  }
}
class FloorPlanObject {
  final String name;
  final List<Offset> points;

  FloorPlanObject({required this.name, required this.points});

  factory FloorPlanObject.fromJson(Map<String, dynamic> json) {
    List<dynamic> pointsJson = json['points'];
    List<Offset> points = pointsJson.map((p) {
      return Offset((p['x'] as num).toDouble(), (p['y'] as num).toDouble());
    }).toList();
    return FloorPlanObject(name: json['name'], points: points);
  }

  // Helper to check if a point is inside this polygon
  bool contains(Offset point) {
    bool inside = false;
    for (int i = 0, j = points.length - 1; i < points.length; j = i++) {
      final pi = points[i];
      final pj = points[j];
      // Check if point is on the horizontal line of the segment (to handle edge cases)
      if (point.dy == pi.dy && point.dy == pj.dy) {
        if ((point.dx >= min(pi.dx, pj.dx) && point.dx <= max(pi.dx, pj.dx))) {
          return true; // Point is on a horizontal edge
        }
      }
      // Standard ray-casting algorithm for polygon containment
      if (((pi.dy > point.dy) != (pj.dy > point.dy)) &&
          (point.dx < (pj.dx - pi.dx) * (point.dy - pi.dy) / (pj.dy - pi.dy) + pi.dx)) {
        inside = !inside;
      }
    }
    return inside;
  }
}

Future<List<FloorPlanObject>> loadFloorPlan(String path) async {
  try {
    String jsonString = await rootBundle.loadString(path);
    final dynamic decodedJson = jsonDecode(jsonString);
    List<dynamic> shapesJson;

    if (decodedJson is Map<String, dynamic>) {
      shapesJson = decodedJson["shapes"];
    } else if (decodedJson is List) {
      shapesJson = decodedJson;
    } else {
      throw Exception("Unexpected JSON format");
    }

    return shapesJson.map((obj) => FloorPlanObject.fromJson(obj)).toList();
  } catch (e) {
    print("Error loading floor plan from $path: $e");
    return [];
  }
}

String extractBlock(String roomName) {
  if (roomName.isNotEmpty) {
    return roomName.substring(0, 1).toUpperCase();
  }
  return '';
}

int extractFloorFromName(String roomName) {
  for (int i = 0; i < roomName.length; i++) {
    if (RegExp(r'\d').hasMatch(roomName[i])) {
      return int.tryParse(roomName[i]) ?? 1;
    }
  }
  return 1;
}

// --- Pathfinding Classes (Dijkstra) ---

class Node {
  int x, y;
  double gCost; // Cost from start node
  Node? parent;

  Node(this.x, this.y, {this.gCost = double.infinity, this.parent});

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
          other is Node && runtimeType == other.runtimeType && x == other.x && y == other.y;

  @override
  int get hashCode => Object.hash(x, y);

  // Converts grid coordinates to an Offset (center of the cell relative to grid origin)
  Offset toOffset(double cellSize) => Offset(x * cellSize + cellSize / 2, y * cellSize + cellSize / 2);
}

class Grid {
  late List<List<bool>> walkable; // true if walkable, false if blocked
  int width;
  int height;
  double cellSize;
  late Rect bounds; // Actual pixel bounds of the grid, calculated from map objects

  Grid({required this.width, required this.height, required this.cellSize, required this.bounds}) {
    walkable = List.generate(width, (_) => List.filled(height, true));
  }

  bool isWalkable(int x, int y) {
    if (x < 0 || x >= width || y < 0 || y >= height) return false;
    return walkable[x][y];
  }

  // Convert pixel offset to grid coordinates
  Point<int> toGridCoords(Offset pixelPoint) {
    // Ensure the pixelPoint is clamped within the grid's effective bounds
    // Subtract a small epsilon (0.01) from right/bottom to prevent going out of bounds
    // if pixelPoint is exactly on the boundary max.
    double clampedX = pixelPoint.dx.clamp(bounds.left, bounds.right - 0.01);
    double clampedY = pixelPoint.dy.clamp(bounds.top, bounds.bottom - 0.01);

    int gridX = ((clampedX - bounds.left) / cellSize).floor();
    int gridY = ((clampedY - bounds.top) / cellSize).floor();

    return Point<int>(gridX.clamp(0, width - 1), gridY.clamp(0, height - 1));
  }


  // Convert grid coordinates to pixel offset (center of the cell, relative to global canvas)
  Offset toPixelCoords(int x, int y) {
    return Offset(x * cellSize + bounds.left + cellSize / 2, y * cellSize + bounds.top + cellSize / 2);
  }

  // Populate grid with obstacles based on floor plan objects
  void populateGrid(List<FloorPlanObject> objects) {
    // Find the overall boundary to define the grid's effective area
    double minX = double.infinity, minY = double.infinity;
    double maxX = double.negativeInfinity, maxY = double.negativeInfinity;

    // First pass: Determine the overall bounds of all objects
    if (objects.isEmpty) {
      bounds = Rect.zero;
      width = 1;
      height = 1;
      walkable = List.generate(width, (_) => List.filled(height, true));
      return;
    }

    for (var obj in objects) {
      for (var p in obj.points) {
        if (p.dx < minX) minX = p.dx;
        if (p.dy < minY) minY = p.dy;
        if (p.dx > maxX) maxX = p.dx;
        if (p.dy > maxY) maxY = p.dy;
      }
    }

    // Add a small buffer to the bounds to ensure all objects are contained
    // and there's some padding for pathfinding along edges.
    const double boundsBuffer = 20.0; // Example buffer
    bounds = Rect.fromLTRB(
      minX - boundsBuffer,
      minY - boundsBuffer,
      maxX + boundsBuffer,
      maxY + boundsBuffer,
    );

    // Calculate grid dimensions based on the calculated bounds and cell size
    width = ((bounds.width / cellSize)).ceil();
    height = ((bounds.height / cellSize)).ceil();

    // Ensure minimum dimensions
    if (width < 1) width = 1;
    if (height < 1) height = 1;

    // Initialize all cells as walkable by default
    walkable = List.generate(width, (_) => List.filled(height, true));

    // Mark non-walkable areas (rooms, walls, boundaries)
    for (int x = 0; x < width; x++) {
      for (int y = 0; y < height; y++) {
        Offset cellCenter = toPixelCoords(x, y);

        bool cellIsBlockedByObject = false;
        for (var obj in objects) {
          String objNameLower = obj.name.toLowerCase();

          // Rule 1: Boundary/Wall objects always block
          if (objNameLower.contains("boundary") || objNameLower.contains("wall")) {
            if (obj.contains(cellCenter)) {
              cellIsBlockedByObject = true;
              break;
            }
          }
          // Rule 2: Other named polygons (like rooms) block unless explicitly walkable or a connector
          else if (obj.contains(cellCenter)) {
            // Check if this object is a known walkable type (e.g., corridor, hallway)
            if (objNameLower.contains("corridor") ||
                objNameLower.contains("hallway") ||
                objNameLower.contains("walkway") ||
                objNameLower.contains("stairs") || // Stairs/lifts are connection points, usually walkable
                objNameLower.contains("lift") ||
                objNameLower.contains("elevator")) {
              // This object is in the cell, but it's a walkable type. Do NOT block.
              // (default is true, so no action needed here unless explicitly setting to false in other rule)
            } else {
              // It's a room or other non-explicitly walkable object, block it.
              cellIsBlockedByObject = true;
              break;
            }
          }
        }
        walkable[x][y] = !cellIsBlockedByObject; // Set cell walkability
      }
    }
    print("Grid populated. Bounds: $bounds, Dimensions: ${width}x$height, Cell Size: $cellSize");
  }

  List<Node> getNeighbors(Node node) {
    List<Node> neighbors = [];
    // 8-directional movement (including diagonals)
    List<Point<int>> directions = [
      Point<int>(0, 1), Point<int>(0, -1), // Up, Down
      Point<int>(1, 0), Point<int>(-1, 0), // Right, Left
      Point<int>(1, 1), Point<int>(1, -1), // Diagonals
      Point<int>(-1, 1), Point<int>(-1, -1),
    ];

    for (var dir in directions) {
      int newX = node.x + dir.x;
      int newY = node.y + dir.y;
      if (isWalkable(newX, newY)) {
        // Create new Node instances, gCost is initialized to infinity by default
        neighbors.add(Node(newX, newY));
      }
    }
    return neighbors;
  }
}

// Dijkstra's Pathfinding Algorithm (Corrected)
class DijkstraPathfinder {
  final Grid grid;

  DijkstraPathfinder(this.grid);

  List<Node>? findPath(Offset startPixel, Offset endPixel) {
    Point<int> startGridCoords = grid.toGridCoords(startPixel);
    Point<int> endGridCoords = grid.toGridCoords(endPixel);

    Node initialStartNode = Node(startGridCoords.x, startGridCoords.y);
    Node initialEndNode = Node(endGridCoords.x, endGridCoords.y);

    Node? resolvedStartNode = _findNearestWalkableNode(initialStartNode, 5);
    Node? resolvedEndNode = _findNearestWalkableNode(initialEndNode, 5);

    if (resolvedStartNode == null || resolvedEndNode == null) {
      print("Dijkstra Pathfinding Error: Start or End point is not walkable and no nearby walkable cell found within radius.");
      if (resolvedStartNode == null) print("  Start node at (${initialStartNode.x}, ${initialStartNode.y}) failed to resolve (pixel: $startPixel).");
      if (resolvedEndNode == null) print("  End node at (${initialEndNode.x}, ${initialEndNode.y}) failed to resolve (pixel: $endPixel).");
      return null;
    }

    Node startNode = resolvedStartNode;
    Node endNode = resolvedEndNode;

    if (startNode == endNode) {
      print("Start and end nodes are the same after resolution. Returning direct path.");
      return [startNode];
    }

    List<Node> openSet = []; // Acts as a min-priority queue by sorting
    Map<Node, double> gScore = {startNode: 0.0}; // Stores the current shortest distance from start to node
    Map<Node, Node> cameFrom = {}; // Stores the parent node for path reconstruction

    startNode.gCost = 0.0; // Initialize start node's gCost
    openSet.add(startNode);

    int iteration = 0;
    final int maxIterations = grid.width * grid.height * 2;

    while (openSet.isNotEmpty) {
      iteration++;
      if (iteration > maxIterations) {
        print("Dijkstra Pathfinding Debug: Max iterations ($maxIterations) reached. Path might be too long or complex, or grid is too large/dense. Breaking.");
        return null;
      }

      // Sort by gCost to get the node with the lowest current known distance from the start
      openSet.sort((a, b) => gScore[a]!.compareTo(gScore[b]!));
      Node currentNode = openSet.removeAt(0);

      if (currentNode == endNode) {
        print("Dijkstra Pathfinding Debug: Path found in $iteration iterations.");
        return _reconstructPath(currentNode, cameFrom);
      }

      for (Node neighbor in grid.getNeighbors(currentNode)) {
        double moveCost = _getDistance(currentNode, neighbor);
        double tentativeGCost = gScore[currentNode]! + moveCost;

        // If this path to neighbor is better than any previous path
        if (tentativeGCost < (gScore[neighbor] ?? double.infinity)) {
          cameFrom[neighbor] = currentNode; // Update parent
          gScore[neighbor] = tentativeGCost; // Update gCost

          // Add to openSet if not already there
          if (!openSet.contains(neighbor)) {
            openSet.add(neighbor);
          }
          // If already in openSet, its gCost is updated in the map,
          // and it will be correctly re-sorted in the next iteration due to its gCost value.
        }
      }
    }
    print("Dijkstra Pathfinding Debug: No path found after exhausting open set.");
    return null; // No path found
  }

  // Cost function (Euclidean distance between grid cells)
  double _getDistance(Node nodeA, Node nodeB) {
    double dx = (nodeA.x - nodeB.x).abs().toDouble();
    double dy = (nodeA.y - nodeB.y).abs().toDouble();
    return sqrt(dx * dx + dy * dy);
  }

  // Finds the nearest walkable node to an initial (potentially blocked) node
  // using a Breadth-First Search (BFS) within a given radius.
  Node? _findNearestWalkableNode(Node initialNode, int searchRadius) {
    if (grid.isWalkable(initialNode.x, initialNode.y)) {
      return initialNode;
    }

    Queue<Node> queue = Queue();
    Set<Node> visited = {};

    queue.add(initialNode);
    visited.add(initialNode);

    int currentRadius = 0;
    while(queue.isNotEmpty && currentRadius <= searchRadius) {
      int levelSize = queue.length;
      for(int i = 0; i < levelSize; i++) {
        Node current = queue.removeFirst();

        if (grid.isWalkable(current.x, current.y)) {
          return current;
        }

        for (int dx = -1; dx <= 1; dx++) {
          for (int dy = -1; dy <= 1; dy++) {
            if (dx == 0 && dy == 0) continue;

            int newX = current.x + dx;
            int newY = current.y + dy;

            if (newX >= 0 && newX < grid.width && newY >= 0 && newY < grid.height) {
              Node neighbor = Node(newX, newY); // Create new node instance for neighbor
              if (!visited.contains(neighbor)) {
                visited.add(neighbor);
                queue.add(neighbor);
              }
            }
          }
        }
      }
      currentRadius++;
    }
    print("  No walkable node found for (${initialNode.x},${initialNode.y}) within radius $searchRadius.");
    return null;
  }

  // Reconstructs the path from the end node by following parent pointers
  List<Node> _reconstructPath(Node endNode, Map<Node, Node> cameFrom) {
    List<Node> path = [];
    Node? current = endNode;
    while (current != null && cameFrom.containsKey(current)) { // Ensure current is in cameFrom map
      path.add(current);
      current = cameFrom[current];
    }
    // Add the start node, which won't have a parent in cameFrom
    if (current != null) {
      path.add(current);
    }
    return path.reversed.toList();
  }
}

// --- End Pathfinding Classes (Dijkstra) ---

class NavigationScreen extends StatefulWidget {
  const NavigationScreen({super.key});

  @override
  _NavigationScreenState createState() => _NavigationScreenState();
}

class _NavigationScreenState extends State<NavigationScreen> {
  List<FloorPlanObject>? floor1Objects;
  List<FloorPlanObject>? floor2Objects;
  int currentFloor = 1;

  final TextEditingController currentRoomController = TextEditingController();
  final TextEditingController destinationRoomController = TextEditingController();

  List<Offset>? routePoints;
  bool isLoading = true;

  bool waitingForReached = false;
  List<Offset>? pendingRoutePoints;
  int? pendingFloor;

  final TransformationController _transformationController = TransformationController();

  // Grid and Pathfinder for each floor
  Grid? floor1Grid;
  DijkstraPathfinder? floor1Pathfinder;
  Grid? floor2Grid;
  DijkstraPathfinder? floor2Pathfinder;

  static const double _cellSize = 15.0;

  static const IconData locationIcon = Icons.location_on_rounded;

  @override
  void initState() {
    super.initState();
    loadFloorPlansAndSetupPathfinding();
  }

  Future<void> loadFloorPlansAndSetupPathfinding() async {
    floor1Objects = await loadFloorPlan('assets/ABC2.json');
    floor2Objects = await loadFloorPlan('assets/ABC_4.json');

    if (floor1Objects != null && floor1Objects!.isNotEmpty) {
      floor1Grid = Grid(width: 1, height: 1, cellSize: _cellSize, bounds: Rect.zero);
      floor1Grid!.populateGrid(floor1Objects!);
      floor1Pathfinder = DijkstraPathfinder(floor1Grid!);
    } else {
      print("Warning: Floor 1 objects not loaded or empty.");
    }

    if (floor2Objects != null && floor2Objects!.isNotEmpty) {
      floor2Grid = Grid(width: 1, height: 1, cellSize: _cellSize, bounds: Rect.zero);
      floor2Grid!.populateGrid(floor2Objects!);
      floor2Pathfinder = DijkstraPathfinder(floor2Grid!);
    } else {
      print("Warning: Floor 2 objects not loaded or empty.");
    }

    setState(() => isLoading = false);
  }

  FloorPlanObject? searchRoom(List<FloorPlanObject> objects, String query) {
    String normalizedQuery = query.trim().toLowerCase();
    for (var obj in objects) {
      String normalizedName = obj.name.trim().toLowerCase();
      if (normalizedName.contains(normalizedQuery)) {
        print("Found room: '${obj.name}' for query: '$query'");
        return obj;
      }
    }
    print("Room not found: '$query'");
    return null;
  }

  Offset computeCenter(FloorPlanObject obj) {
    double sumX = 0, sumY = 0;
    for (var point in obj.points) {
      sumX += point.dx;
      sumY += point.dy;
    }
    return Offset(sumX / obj.points.length, sumY / obj.points.length);
  }

  void navigate() {
    String currentQuery = currentRoomController.text.trim();
    String destQuery = destinationRoomController.text.trim();

    if (currentQuery.isEmpty || destQuery.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Please enter both room names")));
      return;
    }

    FloorPlanObject? currentObj1 = searchRoom(floor1Objects!, currentQuery);
    FloorPlanObject? currentObj2 = searchRoom(floor2Objects!, currentQuery);
    FloorPlanObject? destObj1 = searchRoom(floor1Objects!, destQuery);
    FloorPlanObject? destObj2 = searchRoom(floor2Objects!, destQuery);

    int currentRoomFloor;
    FloorPlanObject? currentObj;
    if (currentObj1 != null) {
      currentRoomFloor = 1;
      currentObj = currentObj1;
    } else if (currentObj2 != null) {
      currentRoomFloor = 2;
      currentObj = currentObj2;
    } else {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Current room not found: '$currentQuery'")));
      return;
    }

    int destRoomFloor;
    FloorPlanObject? destObj;
    if (destObj1 != null) {
      destRoomFloor = 1;
      destObj = destObj1;
    } else if (destObj2 != null) {
      destRoomFloor = 2;
      destObj = destObj2;
    } else {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Destination room not found: '$destQuery'")));
      return;
    }

    String currentBlock = extractBlock(currentObj.name);
    String destBlock = extractBlock(destObj.name);

    Offset currentCenter = computeCenter(currentObj);
    Offset destCenter = computeCenter(destObj);

    DijkstraPathfinder? activePathfinder = (currentRoomFloor == 1) ? floor1Pathfinder : floor2Pathfinder;
    Grid? activeGrid = (currentRoomFloor == 1) ? floor1Grid : floor2Grid;

    if (activePathfinder == null || activeGrid == null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Floor plan data not initialized for pathfinding. (Internal Error)")));
      return;
    }


    if (currentRoomFloor == destRoomFloor && ['A', 'B', 'C'].contains(currentBlock) && ['A', 'B', 'C'].contains(destBlock)) {
      List<Node>? pathNodes = activePathfinder.findPath(currentCenter, destCenter);
      if (pathNodes != null) {
        setState(() {
          currentFloor = currentRoomFloor;
          routePoints = pathNodes.map((node) => activeGrid.toPixelCoords(node.x, node.y)).toList();
          if (routePoints!.isNotEmpty) {
            routePoints!.insert(0, currentCenter);
            routePoints!.add(destCenter);
            routePoints = routePoints!.toSet().toList();
          }
          waitingForReached = false;
          pendingRoutePoints = null;
          pendingFloor = null;
        });
      } else {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("No path found on the same floor!")));
      }
    } else {
      FloorPlanObject? connectorCurrent = (currentRoomFloor == 1)
          ? (searchRoom(floor1Objects!, "stairs") ?? searchRoom(floor1Objects!, "lift") ?? searchRoom(floor1Objects!, "elevator"))
          : (searchRoom(floor2Objects!, "stairs") ?? searchRoom(floor2Objects!, "lift") ?? searchRoom(floor2Objects!, "elevator"));

      FloorPlanObject? connectorDest = (destRoomFloor == 1)
          ? (searchRoom(floor1Objects!, "stairs") ?? searchRoom(floor1Objects!, "lift") ?? searchRoom(floor1Objects!, "elevator"))
          : (searchRoom(floor2Objects!, "stairs") ?? searchRoom(floor2Objects!, "lift") ?? searchRoom(floor2Objects!, "elevator"));

      if (connectorCurrent == null || connectorDest == null) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Connector (stairs/lift/elevator) not found on relevant floors.")));
        return;
      }

      Offset connectorCurrentCenter = computeCenter(connectorCurrent);
      Offset connectorDestCenter = computeCenter(connectorDest);

      List<Node>? pathNodesToConnector = activePathfinder.findPath(currentCenter, connectorCurrentCenter);
      if (pathNodesToConnector != null) {
        setState(() {
          currentFloor = currentRoomFloor;
          routePoints = pathNodesToConnector.map((node) => activeGrid.toPixelCoords(node.x, node.y)).toList();
          if (routePoints!.isNotEmpty) {
            routePoints!.insert(0, currentCenter);
            routePoints = routePoints!.toSet().toList();
          }

          waitingForReached = true;

          DijkstraPathfinder? pendingPathfinder = (destRoomFloor == 1) ? floor1Pathfinder : floor2Pathfinder;
          Grid? pendingGrid = (destRoomFloor == 1) ? floor1Grid : floor2Grid;

          if (pendingPathfinder != null && pendingGrid != null) {
            List<Node>? pathNodesFromConnector = pendingPathfinder.findPath(connectorDestCenter, destCenter);
            if (pathNodesFromConnector != null) {
              pendingRoutePoints = pathNodesFromConnector.map((node) => pendingGrid.toPixelCoords(node.x, node.y)).toList();
              if (pendingRoutePoints!.isNotEmpty) {
                pendingRoutePoints!.add(destCenter);
                pendingRoutePoints = pendingRoutePoints!.toSet().toList();
              }
              pendingFloor = destRoomFloor;
            } else {
              ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("No path found to destination from connector!")));
              waitingForReached = false;
              routePoints = null;
            }
          } else {
            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Pathfinding not ready for destination floor.")));
            waitingForReached = false;
            routePoints = null;
          }
        });
      } else {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("No path found to connector on current floor!")));
      }
    }
  }


  void reachedPressed() {
    if (pendingRoutePoints != null && pendingFloor != null) {
      setState(() {
        currentFloor = pendingFloor!;
        routePoints = pendingRoutePoints;
        waitingForReached = false;
        pendingRoutePoints = null;
        pendingFloor = null;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    List<FloorPlanObject> currentFloorPlan = (currentFloor == 1) ? floor1Objects! : floor2Objects!;
    Grid? currentGrid = (currentFloor == 1) ? floor1Grid : floor2Grid;


    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            Container(
              padding: EdgeInsets.symmetric(vertical: 20, horizontal: 20),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [Colors.deepPurple, Colors.purple],
                ),
              ),
              child: Row(
                children: [
                  IconButton(
                    icon: Icon(Icons.arrow_back, color: Colors.white, size: 28),
                    onPressed: () {
                      Navigator.pushReplacement(
                        context,
                        MaterialPageRoute(builder: (context) => StudentPage()),
                      );
                    },
                  ),
                  Expanded(
                    child: Center(
                      child: Text(
                        'Campus Navigation',
                        style: TextStyle(
                          fontSize: 24,
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Card(
                elevation: 8,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                  child: Column(
                    children: [
                      TextField(
                        controller: currentRoomController,
                        decoration: InputDecoration(
                          labelText: 'Current Room (e.g., "A-101")',
                          prefixIcon: Icon(Icons.location_on, color: Colors.deepPurple),
                        ),
                      ),
                      SizedBox(height: 16),
                      TextField(
                        controller: destinationRoomController,
                        decoration: InputDecoration(
                          labelText: 'Destination Room (e.g., "B-201")',
                          prefixIcon: Icon(Icons.flag, color: Colors.deepPurple),
                        ),
                      ),
                      SizedBox(height: 20),
                      ElevatedButton(
                        onPressed: navigate,
                        child: Text('Navigate', style: TextStyle(fontSize: 18)),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            Expanded(
              child: Container(
                margin: EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.grey.shade200.withOpacity(0.7),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.deepPurple, width: 2),
                ),
                child: LayoutBuilder(
                  builder: (context, constraints) {
                    double initialScale = 0.5;
                    _transformationController.value = Matrix4.identity()..scale(initialScale);
                    return InteractiveViewer(
                      transformationController: _transformationController,
                      minScale: 0.4 * initialScale,
                      maxScale: 2.0 * initialScale,
                      constrained: false,
                      child: SizedBox(
                        width: currentGrid?.bounds.width ?? constraints.maxWidth,
                        height: currentGrid?.bounds.height ?? constraints.maxHeight,
                        child: CustomPaint(
                          painter: FloorPlanPainter(
                            objects: currentFloorPlan,
                            route: routePoints,
                            grid: currentGrid,
                            locationIcon: locationIcon,
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
            ),
          ],
        ),
      ),
      floatingActionButton: waitingForReached
          ? FloatingActionButton(
        onPressed: reachedPressed,
        backgroundColor: Colors.deepPurple,
        child: Icon(Icons.check, size: 32),
      )
          : null,
    );
  }
}

class FloorPlanPainter extends CustomPainter {
  final List<FloorPlanObject> objects;
  final List<Offset>? route;
  final Grid? grid;
  final IconData locationIcon;

  FloorPlanPainter({required this.objects, this.route, this.grid, required this.locationIcon});

  @override
  void paint(Canvas canvas, Size size) {
    Paint boundaryPaint = Paint()
      ..color = Colors.deepPurple.shade700
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke;

    Paint polygonFillPaint = Paint()
      ..color = Colors.lightBlueAccent.withOpacity(0.4)
      ..style = PaintingStyle.fill;

    /*
    if (grid != null) {
      Paint gridLinePaint = Paint()
        ..color = Colors.grey.withOpacity(0.2)
        ..strokeWidth = 0.5
        ..style = PaintingStyle.stroke;

      Paint walkableCellPaint = Paint()
        ..color = Colors.green.withOpacity(0.1)
        ..style = PaintingStyle.fill;

      Paint blockedCellPaint = Paint()
        ..color = Colors.red.withOpacity(0.3)
        ..style = PaintingStyle.fill;

      for (int x = 0; x < grid!.width; x++) {
        for (int y = 0; y < grid!.height; y++) {
          Rect cellRect = Rect.fromLTWH(
            x * grid!.cellSize + grid!.bounds.left,
            y * grid!.cellSize + grid!.bounds.top,
            grid!.cellSize,
            grid!.cellSize,
          );
          canvas.drawRect(cellRect, grid!.isWalkable(x, y) ? walkableCellPaint : blockedCellPaint);
          canvas.drawRect(cellRect, gridLinePaint);
        }
      }
    }
    */

    for (var obj in objects) {
      if (obj.points.isEmpty) continue;
      Path path = Path();
      path.moveTo(obj.points.first.dx, obj.points.first.dy);
      for (int i = 1; i < obj.points.length; i++) {
        path.lineTo(obj.points[i].dx, obj.points[i].dy);
      }
      if (!obj.name.toLowerCase().contains("boundary")) {
        path.close();
        canvas.drawPath(path, polygonFillPaint);
      }
      canvas.drawPath(path, boundaryPaint);

      Offset center = _computeCenter(obj.points);
      if (obj.name.toLowerCase().contains("stairs")) {
        _drawLabel(canvas, "Stairs", center, Colors.orange, fontSize: 16);
      } else if (obj.name.toLowerCase().contains("lift") ||
          obj.name.toLowerCase().contains("elevator")) {
        _drawLabel(canvas, "Lift", center, Colors.green, fontSize: 16);
      } else {
        _drawLabel(canvas, obj.name, center, Colors.deepPurple.shade900, fontSize: 14);
      }
    }

    if (route != null && route!.length >= 2) {
      Path routePath = Path();

      routePath.moveTo(route![0].dx, route![0].dy);
      for (int i = 1; i < route!.length; i++) {
        routePath.lineTo(route![i].dx, route![i].dy);
      }
      Paint routePaint = Paint()
        ..color = Colors.redAccent
        ..strokeWidth = 5
        ..style = PaintingStyle.stroke
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round;
      canvas.drawPath(routePath, routePaint);

      _drawIcon(canvas, route![0], locationIcon, iconColor: Colors.green.shade700, iconSize: 32.0);
      _drawIcon(canvas, route!.last, locationIcon, iconColor: Colors.blue.shade700, iconSize: 32.0);
    }
  }

  Offset _computeCenter(List<Offset> points) {
    double sumX = 0, sumY = 0;
    for (var p in points) {
      sumX += p.dx;
      sumY += p.dy;
    }
    return Offset(sumX / points.length, sumY / points.length);
  }

  void _drawLabel(Canvas canvas, String text, Offset offset, Color color, {double fontSize = 14}) {
    final TextSpan span = TextSpan(
      text: text,
      style: TextStyle(
        color: Colors.white,
        fontSize: fontSize,
        fontWeight: FontWeight.bold,
      ),
    );
    final TextPainter tp = TextPainter(
      text: span,
      textAlign: TextAlign.center,
      textDirection: TextDirection.ltr,
    );
    tp.layout();
    Rect bgRect = Rect.fromCenter(
      center: offset,
      width: tp.width + 12,
      height: tp.height + 8,
    );
    Paint bgPaint = Paint()
      ..color = color
      ..style = PaintingStyle.fill;
    Paint borderPaint = Paint()
      ..color = Colors.white
      ..strokeWidth = 2.5
      ..style = PaintingStyle.stroke;
    canvas.drawRRect(
      RRect.fromRectAndRadius(bgRect, Radius.circular(6)),
      bgPaint,
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(bgRect, Radius.circular(6)),
      borderPaint,
    );
    tp.paint(canvas, Offset(offset.dx - tp.width / 2, offset.dy - tp.height / 2));
  }

  void _drawIcon(Canvas canvas, Offset position, IconData icon,
      {Color iconColor = Colors.black, double iconSize = 20.0}) {
    TextPainter textPainter = TextPainter(
      text: TextSpan(
        text: String.fromCharCode(icon.codePoint),
        style: TextStyle(
          fontSize: iconSize,
          fontFamily: icon.fontFamily,
          color: iconColor,
          package: icon.fontPackage,
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();

    textPainter.paint(canvas, position - Offset(iconSize / 2, iconSize / 2));
  }

  @override
  bool shouldRepaint(covariant FloorPlanPainter oldDelegate) {
    return oldDelegate.objects != objects ||
        oldDelegate.route != route ||
        oldDelegate.grid != grid ||
        oldDelegate.locationIcon != locationIcon;
  }
}
