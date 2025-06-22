import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

void main() => runApp(const MyApp());

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Geofencing Demo',
      theme: ThemeData(primarySwatch: Colors.deepPurple),
      home: const GeoFenceHomePage(),
    );
  }
}

class GeoFenceHomePage extends StatefulWidget {
  const GeoFenceHomePage({super.key});

  @override
  State<GeoFenceHomePage> createState() => _GeoFenceHomePageState();
}

class _GeoFenceHomePageState extends State<GeoFenceHomePage> {
  bool isInsideHome = false;
  final double radius = 30;
  final LatLng homeCenter = const LatLng(17.391549, 78.541145);

  @override
  void initState() {
    super.initState();
    _checkPermissionAndTrack();
  }

  void _checkPermissionAndTrack() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) return;

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      permission = await Geolocator.requestPermission();
    }

    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      return;
    }

    Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.best,
        distanceFilter: 10,
      ),
    ).listen((Position position) {
      double distance = Geolocator.distanceBetween(
        position.latitude,
        position.longitude,
        homeCenter.latitude,
        homeCenter.longitude,
      );

      bool isNowInside = distance <= radius;

      if (isNowInside != isInsideHome) {
        setState(() {
          isInsideHome = isNowInside;
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Geofencing Demo")),
      body: isInsideHome
          ? const DummyIndoorScreen()
          : const GoogleMapWrapper(),
    );
  }
}

class DummyIndoorScreen extends StatelessWidget {
  const DummyIndoorScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Text(
        "🏠 You're inside your home!",
        style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
      ),
    );
  }
}

class GoogleMapWrapper extends StatefulWidget {
  const GoogleMapWrapper({super.key});

  @override
  State<GoogleMapWrapper> createState() => _GoogleMapWrapperState();
}

class _GoogleMapWrapperState extends State<GoogleMapWrapper> {
  LatLng? _currentLatLng;
  GoogleMapController? _mapController;

  @override
  void initState() {
    super.initState();
    _loadCurrentLocation();
  }

  Future<void> _loadCurrentLocation() async {
    try {
      Position position = await Geolocator.getCurrentPosition();
      setState(() {
        _currentLatLng = LatLng(position.latitude, position.longitude);
      });
    } catch (e) {
      print("Error getting current location: $e");
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_currentLatLng == null) {
      return const Center(child: CircularProgressIndicator());
    }

    return GoogleMap(
      initialCameraPosition: CameraPosition(
        target: _currentLatLng!,
        zoom: 18,
      ),
      onMapCreated: (controller) {
        _mapController = controller;
      },
      myLocationEnabled: true,
      myLocationButtonEnabled: true,
    );
  }
}
