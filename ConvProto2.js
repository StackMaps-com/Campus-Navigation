/// <reference types="leaflet" />

// --- Original Map Setup ---
var map = L.map('map', {
    crs: L.CRS.Simple,
    minZoom: -100,
    maxZoom: 1,
    attributionControl: false
});

// --- Global Variables (Keeping original structure) ---
let allMapData = {}; // Stores data for all loaded floor plans
let currentFloor = null; // Name of the currently displayed floor plan
let mapRooms = [], mapNodes = [], mapEdges = []; // Data for the current floor
let routeLayer = null; // Layer group for displaying the route polyline
let sourceCentroidMarker, destCentroidMarker, sourceParallelMarker, destParallelMarker; // Markers for visualization
let movingCircle = null; // Animated circle (Keep variable, animation code commented out)

// --- NEW: Multi-Floor Navigation State ---
let multiFloorPath = null; // Array to hold path segments for multi-floor routes
let currentPathSegmentIndex = 0; // Index of the current segment being displayed/navigated
// Global results from nearest point calculations (used by path drawing) - Consider refactoring later if needed
let nearest1ResultGlobal, nearest2ResultGlobal;


// --- Original Initialization and Utility Functions ---
async function loadMapData() {
    try {
        const floorNames = ["ABC Ground Floor.json", "ABC Second Floor.json"]; // Add more floor plans as needed
        for (const floorFile of floorNames) {
            const response = await fetch(floorFile);
             if (!response.ok) { // Basic error check
                throw new Error(`HTTP error! status: ${response.status} for file ${floorFile}`);
            }
            const json = await response.json();
            const floorplanName = json.name || floorFile.replace('.json', ''); // Use filename if name missing
            json.level = inferFloorLevel(floorplanName); // Add inferred level
            allMapData[floorplanName] = json;
            console.log(`Loaded: ${floorplanName}`);
        }

        const firstFloorName = Object.keys(allMapData)[0];
        if (firstFloorName) {
            currentFloor = firstFloorName;
            const currentFloorData = allMapData[currentFloor];
            mapRooms = currentFloorData.rooms || [];
            mapNodes = currentFloorData.nodes || [];
            mapEdges = currentFloorData.edges || [];
            // Initial drawing - using the original drawRooms function
            drawRooms(mapRooms, mapNodes, currentFloor);
            updateFloorSelector(); // Populate dropdown
        } else {
             console.error("No floor plans loaded.");
             // Potentially show an error to the user
        }

        addEnterKeyListener(); // Add event listeners for input fields

        return { rooms: mapRooms, nodes: mapNodes, edges: mapEdges };
    } catch (err) {
        console.error("Failed to load or parse JSON:", err);
        // Show error to user
        alert(`Error loading map data: ${err.message}. Check console for details.`);
    }
}
loadMapData(); // Load data

// Infer floor level (Keep original)
function inferFloorLevel(floorName) {
    const name = floorName.toLowerCase();
    if (name.includes("ground") || name.includes("lobby")) return 0;
    if (name.includes("basement")) return -1;
    const match = name.match(/(\d+)(st|nd|rd|th)?\s*floor/i);
    return match ? parseInt(match[1]) : 0;
}

// Scale coordinates (Keep original)
function scaleCoordinates(coord, scaleFactor) {
     // Added basic validation
    if (!coord || typeof coord.x !== 'number' || typeof coord.y !== 'number') {
        console.warn("Invalid coordinate object passed to scaleCoordinates:", coord);
        return { x: 0, y: 0 };
    }
    const factor = scaleFactor > 0 ? scaleFactor : 100; // Use default if invalid
    return {
        x: coord.x / factor,
        y: coord.y / factor
    };
}

// Calculate centroid (Keep original)
function calculateCentroid(coordinates) {
    let centroidX = 0, centroidY = 0;
    if (!coordinates || coordinates.length === 0) return { x: 0, y: 0 }; // Handle empty/invalid input
    coordinates.forEach(coord => {
        // Ensure coordinates are numbers before adding
        centroidX += (typeof coord.x === 'number' ? coord.x : 0);
        centroidY += (typeof coord.y === 'number' ? coord.y : 0);
    });
    return {
        x: centroidX / coordinates.length,
        y: centroidY / coordinates.length
    };
}

// Distance functions (Keep original)
function distanceSq(p1, p2) {
    return (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2;
}
function distance(p1, p2) {
    return Math.sqrt(distanceSq(p1, p2));
}
function pointToSegmentDistanceSq(point, a, b) {
    const l2 = distanceSq(a, b);
    if (l2 === 0) return distanceSq(point, a);
    let t = ((point.x - a.x) * (b.x - a.x) + (point.y - a.y) * (b.y - a.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    const projection = { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
    return distanceSq(point, projection);
}
function pointToSegmentDistance(point, a, b) {
    return Math.sqrt(pointToSegmentDistanceSq(point, a, b));
}

// Normalize room name (Keep original)
function normalizeRoomName(name) {
    if (!name) return "";
    const parts = name.split('(');
    const baseName = parts[0].trim();
    return baseName.toUpperCase().replace(/[\s-]/g, '');
}


// --- Original Map Drawing and Interaction Functions (Unchanged Look and Feel) ---
function drawRooms(rooms, nodes, floorplanName) {
    // Clear existing layers except tile layers (if any)
    map.eachLayer(layer => {
        if (!(layer instanceof L.TileLayer)) {
            map.removeLayer(layer);
        }
    });

    const scaleFactor = allMapData[floorplanName]?.referenceScaleFactor || 100;
    const allpoints = [];
    const entranceIcon = L.divIcon({ // Keep original icon definition
        className: 'entrance-icon',
        html: '<svg style="width:24px;height:24px;" viewBox="0 0 24 24"><path fill="currentColor" d="M13 13V17H11V13H13M13 9V11H11V9H13M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2M12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20M12 6C10.9 6 10 6.9 10 8C10 9.1 10.9 10 12 10C13.1 10 14 9.1 14 8C14 6.9 13.1 6 12 6Z" /></svg>',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });

    rooms.forEach(room => {
        // Scale coordinates for Leaflet [x, y]
        const scaledCoords = room.coordinates.map(coord => {
            const scaled = scaleCoordinates(coord, scaleFactor);
            return [scaled.x, scaled.y]; // Use [x, y] as per original code
        });
        allpoints.push(...scaledCoords);

        // Determine color based on name - Keep original logic
        let polygonColor = 'green'; // Default
        let isEntrance = (room.name || "").toLowerCase().includes("entrance") || (room.name || "").toLowerCase().includes("lobby");
        if (isEntrance) {
            polygonColor = 'lightgreen';
        }
        // **NEW:** Add specific styling for LIFT if desired, otherwise keeps default 'green'
        if ((room.name || "").toUpperCase() === "LIFT") {
             polygonColor = 'purple'; // Example: Make lifts purple
        }


        // Draw polygon - Keep original style (weight 1.3)
        const polygon = L.polygon(scaledCoords, { color: polygonColor, weight: 1.3, fillOpacity: 0.1 }).addTo(map); // Added fillOpacity for clarity
        polygon.bindPopup(room.name || "Unnamed Room");

        // Calculate centroid using original coordinates for label/icon
        const centroid = calculateCentroid(room.coordinates);
        const scaledCentroid = scaleCoordinates(centroid, scaleFactor);

        // Room label - Keep original style
        const label = L.divIcon({
            className: 'room-label',
            html: `<div style="font-size: 12px; color: #333; background-color: rgba(255, 255, 255, 0.23); padding: 3px 10px; border-radius: 10px; text-align: center;">${room.name}</div>`,
            iconSize: [80, 20],
            iconAnchor: [40, 10]
        });
        L.marker([scaledCentroid.x, scaledCentroid.y], { icon: label, interactive: false }).addTo(map);

        // Entrance icon - Keep original logic
        if (isEntrance) {
            L.marker([scaledCentroid.x, scaledCentroid.y], { icon: entranceIcon }).addTo(map);
        }
    });

    // Fit map bounds - Keep original logic
    if (allpoints.length) {
        const bounds = L.latLngBounds(allpoints); // Leaflet expects [[lat,lng],[lat,lng]] but works with [[x,y],[x,y]] for Simple CRS
         if (bounds.isValid()) {
             map.fitBounds(bounds.pad(0.1)); // Add padding
         } else {
              console.warn("Could not calculate valid bounds for floor plan.");
             map.setView([0, 0], -2); // Default view
         }
    } else {
        map.setView([0, 0], -2); // Default view if no rooms
    }

    // Update map title - Keep original logic
    const mapTitleDiv = document.getElementById('map-title');
    const floorplanNameInstructionSpan = document.getElementById('floorplan-name-instruction');
    if (mapTitleDiv && floorplanNameInstructionSpan) {
        const formattedName = floorplanName.split(/[\s_-]+/).map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
        mapTitleDiv.textContent = `${formattedName} Map`;
        floorplanNameInstructionSpan.textContent = formattedName;
    }
}

function updateFloorSelector() { // Keep original
    const floorSelector = document.getElementById('floor-selector');
    if (floorSelector) {
        floorSelector.innerHTML = '';
         // Sort floor names based on inferred level (optional but good UX)
        const sortedFloorNames = Object.keys(allMapData).sort((a, b) => {
            const levelA = allMapData[a].level !== undefined ? allMapData[a].level : 0;
            const levelB = allMapData[b].level !== undefined ? allMapData[b].level : 0;
            return levelA - levelB;
        });

        sortedFloorNames.forEach(floorName => {
            const option = document.createElement('option');
            option.value = floorName;
            option.textContent = floorName;
            if (floorName === currentFloor) {
                option.selected = true;
            }
            floorSelector.appendChild(option);
        });
        floorSelector.onchange = switchFloorViaSelector; // Use dedicated handler
    }
}

// Renamed original switchFloor to avoid conflict
function switchFloorViaSelector() {
    const floorSelector = document.getElementById('floor-selector');
    if (floorSelector) {
        const selectedFloor = floorSelector.value;
        // Prevent redrawing unnecessarily if already on the floor
        if (selectedFloor !== currentFloor) {
             switchFloorTo(selectedFloor);
        }
    }
}

// NEW: Centralized function to switch floor and update state
function switchFloorTo(floorName) {
    if (floorName && allMapData[floorName]) {
        console.log(`Switching map to: ${floorName}`);
        currentFloor = floorName;
        const currentFloorData = allMapData[currentFloor];
        mapRooms = currentFloorData.rooms || [];
        mapNodes = currentFloorData.nodes || [];
        mapEdges = currentFloorData.edges || [];

        // Redraw map content for the new floor
        // Pass specific data to avoid relying on potentially stale globals
        redrawMap(mapRooms, mapNodes, currentFloor);

        // Update the selector to reflect the change
        const floorSelector = document.getElementById('floor-selector');
        if(floorSelector) floorSelector.value = currentFloor;
    } else {
        console.warn(`Attempted to switch to invalid floor: ${floorName}`);
    }
}


function addEnterKeyListener() { // Keep original
    const sourceInput = document.getElementById("sourceRoomInput");
    const destinationInput = document.getElementById("destinationRoomInput");
    const goButton = document.querySelector('.controls button');

    const handleKeyPress = (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            if (goButton) goButton.click();
        }
    };

    if (sourceInput) sourceInput.addEventListener('keypress', handleKeyPress);
    if (destinationInput) destinationInput.addEventListener('keypress', handleKeyPress);
}

// --- Rotation Functions (Keep original - Assuming user wants to keep this feature) ---
function getMapCenter(rooms, scaleFactor) { // Keep original
    let totalX = 0, totalY = 0, totalPoints = 0;
    rooms.forEach(room => {
        room.coordinates.forEach(coord => {
            const scaled = scaleCoordinates(coord, scaleFactor);
            totalX += scaled.x;
            totalY += scaled.y;
            totalPoints++;
        });
    });
    return totalPoints ? { x: totalX / totalPoints, y: totalY / totalPoints } : { x: 0, y: 0 };
}

function rotatePoint(point, center, angleRad) { // Keep original
    const s = Math.sin(angleRad);
    const c = Math.cos(angleRad);
    const px = point.x - center.x;
    const py = point.y - center.y;
    const newX = px * c - py * s;
    const newY = px * s + py * c;
    return { x: newX + center.x, y: newY + center.y };
}

function rotateMap(angleDegrees) { // Keep original (but check if scaling logic is correct)
    if (!allMapData[currentFloor]) return;
    const scaleFactor = allMapData[currentFloor].referenceScaleFactor || 100;
    const angleRad = angleDegrees * Math.PI / 180;
    const currentMapData = allMapData[currentFloor];
     // Calculate center based on *current* geometry before rotation
    const center = getMapCenter(currentMapData.rooms, scaleFactor);

    // Rotate room coordinates
    const rotatedRooms = currentMapData.rooms.map(room => ({
        ...room,
        // Rotate original coords, store rotated original coords
        coordinates: room.coordinates.map(coord => {
             // Scale -> Rotate -> Unscale to get new base coordinates?
             // OR just store scaled rotated coords? Let's stick to original intent if possible.
             // The original code seemed to overwrite original coords with scaled+rotated coords. Let's try that.
             // If this causes issues, we might need to rethink storing vs displaying rotation.
            const scaled = scaleCoordinates(coord, scaleFactor);
            const rotated = rotatePoint(scaled, center, angleRad);
            // This *changes* the base data, assuming user wants persistent rotation
            return {
                 x: rotated.x * scaleFactor, // Store back in original scale
                 y: rotated.y * scaleFactor
             };
        })
    }));

    // Rotate node coordinates
    const rotatedNodes = currentMapData.nodes.map(node => ({
        ...node,
        coordinates: node.coordinates ? (() => {
            const scaled = scaleCoordinates(node.coordinates, scaleFactor);
            const rotated = rotatePoint(scaled, center, angleRad);
             return {
                 x: rotated.x * scaleFactor, // Store back in original scale
                 y: rotated.y * scaleFactor
             };
        })() : null
    }));

    const rotatedEdges = currentMapData.edges.map(edge => ({ ...edge })); // Edges unaffected directly

    // Update the data in allMapData
    allMapData[currentFloor] = { ...currentMapData, rooms: rotatedRooms, nodes: rotatedNodes, edges: rotatedEdges };

    // Update current variables and redraw
    mapRooms = rotatedRooms;
    mapNodes = rotatedNodes;
    mapEdges = rotatedEdges;
    redrawMap(mapRooms, mapNodes, currentFloor); // Redraw with rotated data
}

function rotateLeft() { rotateMap(-90); } // Keep original
function rotateRight() { rotateMap(90); } // Keep original


// Redraw map: Clears layers and calls drawRooms - Keep original
function redrawMap(roomsToDraw, nodesToDraw, floorName) {
    console.log("Redrawing map for", floorName);
    // Clear existing route and markers FIRST
    if (routeLayer) map.removeLayer(routeLayer);
    if (movingCircle) map.removeLayer(movingCircle);
    if (sourceCentroidMarker) map.removeLayer(sourceCentroidMarker);
    if (destCentroidMarker) map.removeLayer(destCentroidMarker);
    if (sourceParallelMarker) map.removeLayer(sourceParallelMarker);
    if (destParallelMarker) map.removeLayer(destParallelMarker);

    // Reset variables related to the previous route drawing
    routeLayer = null;
    movingCircle = null;
    sourceCentroidMarker = null;
    destCentroidMarker = null;
    sourceParallelMarker = null;
    destParallelMarker = null;

    // THEN draw the base map elements for the specified floor
    drawRooms(roomsToDraw, nodesToDraw, floorName);
}


// --- Pathfinding Logic ---

// NEW: Find the LIFT room object on a floor
function findTransitionRooms(floorData) {
    if (!floorData || !floorData.rooms) return [];
    const lifts = floorData.rooms.filter(room =>
        room.name && room.name.toUpperCase() === "LIFT"
    );
    console.log(`findTransitionRooms: floor=${floorData.name}, found lifts=${lifts.map(r => r.name).join(", ") || 'None'}`);
    // Return only the first found lift room object
    return lifts.length > 0 ? [lifts[0]] : [];
}


// --- MODIFIED: findPoint - Main pathfinding entry point ---
function findPoint() {
    const sourceInput = document.getElementById("sourceRoomInput");
    const destInput = document.getElementById("destinationRoomInput");
    const sourceRoomName = sourceInput ? sourceInput.value : null;
    const destRoomName = destInput ? destInput.value : null;

    if (!sourceRoomName || !destRoomName) {
        alert("Please enter both source and destination room names.");
        return;
    }
    console.log(`Finding path from "${sourceRoomName}" to "${destRoomName}"`);

    // --- Reset previous route state ---
    if (routeLayer) map.removeLayer(routeLayer);
    if (movingCircle) map.removeLayer(movingCircle);
    if (sourceCentroidMarker) map.removeLayer(sourceCentroidMarker);
    if (destCentroidMarker) map.removeLayer(destCentroidMarker);
    if (sourceParallelMarker) map.removeLayer(sourceParallelMarker);
    if (destParallelMarker) map.removeLayer(destParallelMarker);
    routeLayer = null; movingCircle = null; sourceCentroidMarker = null; destCentroidMarker = null; sourceParallelMarker = null; destParallelMarker = null;
    multiFloorPath = null; // Reset multi-floor path
    currentPathSegmentIndex = 0; // Reset index
    const reachedButton = document.getElementById('reached-button');
    if (reachedButton) reachedButton.remove(); // Remove button if exists
    // --- End Reset ---

    // Find source and destination floors
    const sourceFloor = Object.keys(allMapData).find(floorName =>
        allMapData[floorName]?.rooms?.some(room => normalizeRoomName(room.name) === normalizeRoomName(sourceRoomName))
    );
    const destFloor = Object.keys(allMapData).find(floorName =>
        allMapData[floorName]?.rooms?.some(room => normalizeRoomName(room.name) === normalizeRoomName(destRoomName))
    );

    if (!sourceFloor || !destFloor) {
        alert("Source or destination room not found on any floor plan.");
        return;
    }
    console.log(`Source on: ${sourceFloor}, Destination on: ${destFloor}`);

    const sourceFloorData = allMapData[sourceFloor];
    const destFloorData = allMapData[destFloor];
    const scaleFactorSource = sourceFloorData.referenceScaleFactor || 100;
    const scaleFactorDest = destFloorData.referenceScaleFactor || 100;

    // Find room objects
    const findRoomOnFloor = (name, floorData) => floorData.rooms.find(room => normalizeRoomName(room.name) === normalizeRoomName(name));
    const sourceRoom = findRoomOnFloor(sourceRoomName, sourceFloorData);
    const destRoom = findRoomOnFloor(destRoomName, destFloorData);

    if (!sourceRoom || !destRoom) {
        alert("Could not find source or destination room object."); // Should not happen if floor found
        return;
    }

    // Calculate UNSCALED centroids first
    const sourceCentroidUnscaled = calculateCentroid(sourceRoom.coordinates);
    const destCentroidUnscaled = calculateCentroid(destRoom.coordinates);
    // Scale centroids for calculations/display
    const sourceCentroidScaled = scaleCoordinates(sourceCentroidUnscaled, scaleFactorSource);
    const destCentroidScaled = scaleCoordinates(destCentroidUnscaled, scaleFactorDest);


    // --- Pathfinding Logic ---
    if (sourceFloor === destFloor) {
        // === SINGLE-FLOOR NAVIGATION ===
        console.log("Same floor navigation.");
        if (currentFloor !== sourceFloor) {
             switchFloorTo(sourceFloor); // Ensure correct floor is shown
        }

        const currentFloorData = allMapData[currentFloor]; // Use data of the now current floor
        const scaleFactor = currentFloorData.referenceScaleFactor || 100;

        // Find nearest path network connections for source and destination centroids
        const nearest1Result = findNearestEdgeAndParallelPoint(sourceCentroidScaled, currentFloorData.edges || [], currentFloorData.nodes || [], scaleFactor);
        const nearest2Result = findNearestEdgeAndParallelPoint(destCentroidScaled, currentFloorData.edges || [], currentFloorData.nodes || [], scaleFactor);

        if (nearest1Result.parallelPoint && nearest2Result.parallelPoint) {
            nearest1ResultGlobal = nearest1Result; // Store globally for drawing function
            nearest2ResultGlobal = nearest2Result;

            // Calculate the path between the NETWORK connection points
            const pathResult = findShortestPathBetweenParallelPoints(currentFloorData.nodes || [], currentFloorData.edges || [], nearest1Result, nearest2Result);

            if(pathResult && pathResult.pathNodeIds) {
                // Draw the path: Centroid -> ParallelPoint -> Network Path -> ParallelPoint -> Centroid
                drawPathFromCentroids(
                    sourceCentroidScaled,   // Start at source centroid
                    destCentroidScaled,     // End at dest centroid
                    nearest1Result.parallelPoint, // Connection point near source
                    nearest2Result.parallelPoint, // Connection point near dest
                    pathResult.pathNodeIds, // IDs of nodes along network path
                    currentFloorData.nodes || [], // All nodes on this floor
                    pathResult.bestStartNode, // Network node object near source parallel point
                    pathResult.bestEndNode    // Network node object near dest parallel point
                );
            } else {
                 alert("Unable to calculate a route on this floor.");
            }
        } else {
            alert("Unable to find a connection to the path network for source or destination.");
        }

    } else {
        // === MULTI-FLOOR NAVIGATION ===
        console.log("Multi-floor navigation required.");

        // Find LIFT rooms on both floors
        const sourceLiftRoomArr = findTransitionRooms(sourceFloorData);
        const destLiftRoomArr = findTransitionRooms(destFloorData);

        if (!sourceLiftRoomArr.length || !destLiftRoomArr.length) {
            alert("A 'LIFT' room was not found on both the source and destination floors. Cannot calculate multi-floor route.");
            return;
        }
        const sourceLiftRoom = sourceLiftRoomArr[0]; // Assume first found LIFT is the one
        const destLiftRoom = destLiftRoomArr[0];

        // Calculate LIFT centroids (unscaled first)
        const sourceLiftCentroidUnscaled = calculateCentroid(sourceLiftRoom.coordinates);
        const destLiftCentroidUnscaled = calculateCentroid(destLiftRoom.coordinates);
        // Scale LIFT centroids for calculations/display
        const sourceLiftCentroidScaled = scaleCoordinates(sourceLiftCentroidUnscaled, scaleFactorSource);
        const destLiftCentroidScaled = scaleCoordinates(destLiftCentroidUnscaled, scaleFactorDest);


        // --- Plan Segments ---
        multiFloorPath = []; // Reset/initialize segments array

        // Segment 1: Source Room -> Source Floor LIFT
        const nearestSource = findNearestEdgeAndParallelPoint(sourceCentroidScaled, sourceFloorData.edges || [], sourceFloorData.nodes || [], scaleFactorSource);
        const nearestLiftSource = findNearestEdgeAndParallelPoint(sourceLiftCentroidScaled, sourceFloorData.edges || [], sourceFloorData.nodes || [], scaleFactorSource);

        if (!nearestSource.parallelPoint || !nearestLiftSource.parallelPoint) {
            alert("Error connecting source or LIFT to path network on source floor."); return;
        }
        multiFloorPath.push({
            floor: sourceFloor,
            startCentroid: sourceCentroidScaled,    // Actual start for drawing
            endCentroid: sourceLiftCentroidScaled,      // Actual end for drawing
            startNearest: nearestSource,            // Network connection near start
            endNearest: nearestLiftSource,          // Network connection near end
            transitionType: "LIFT",
            transitionName: sourceLiftRoom.name
        });

        // Segment 2: Destination Floor LIFT -> Destination Room
        const nearestLiftDest = findNearestEdgeAndParallelPoint(destLiftCentroidScaled, destFloorData.edges || [], destFloorData.nodes || [], scaleFactorDest);
        const nearestDest = findNearestEdgeAndParallelPoint(destCentroidScaled, destFloorData.edges || [], destFloorData.nodes || [], scaleFactorDest);

         if (!nearestLiftDest.parallelPoint || !nearestDest.parallelPoint) {
            alert("Error connecting LIFT or destination to path network on destination floor."); return;
        }
         multiFloorPath.push({
            floor: destFloor,
            startCentroid: destLiftCentroidScaled,     // Actual start for drawing (from Dest Lift)
            endCentroid: destCentroidScaled,     // Actual end for drawing (to Dest Room)
            startNearest: nearestLiftDest,           // Network connection near start (Dest Lift)
            endNearest: nearestDest,             // Network connection near end (Dest Room)
            transitionType: null,
            transitionName: null
        });

        // Start navigation by displaying the first segment
        if (multiFloorPath.length > 0) {
            currentPathSegmentIndex = 0;
            displayPathSegment(currentPathSegmentIndex);
        } else {
             // This should not happen if planning succeeded, but as a fallback
             alert("Failed to create navigation segments.");
        }
    }
}


// NEW: Display a specific segment of a multi-floor path
function displayPathSegment(segmentIndex) {
    if (!multiFloorPath || segmentIndex < 0 || segmentIndex >= multiFloorPath.length) {
        console.log("Invalid segment index or no multi-floor path.", segmentIndex);
        return;
    }

    const segment = multiFloorPath[segmentIndex];
    console.log(`Displaying Segment ${segmentIndex + 1}/${multiFloorPath.length} on floor ${segment.floor}`);

    // Switch map to the correct floor for this segment
    if (currentFloor !== segment.floor) {
         switchFloorTo(segment.floor); // This now calls redrawMap internally
    } else {
         // If already on the correct floor, still need to clear old route/markers
         redrawMap(mapRooms, mapNodes, currentFloor);
    }

    // --- Render the current segment ---
    const currentFloorData = allMapData[segment.floor];
    const scaleFactor = currentFloorData.referenceScaleFactor || 100;

    // Use original marker icons
    const sourceIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
    });
    const destinationIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
    });
     // Optional: Icon for the lift transition point if needed
     const liftMarkerIcon = destinationIcon; // Use blue marker for lift destination in segment 1 for now

     console.log("Start Centroid Coords:", segment ? segment.startCentroid : sourceCentroidScaled);
     console.log("End Centroid Coords:", segment ? segment.endCentroid : destCentroidScaled);
     console.log("Start Parallel Coords:", segment ? segment.startNearest.parallelPoint : nearest1Result.parallelPoint);
     console.log("End Parallel Coords:", segment ? segment.endNearest.parallelPoint : nearest2Result.parallelPoint);
    // Place markers for the START and END CENTROIDS of THIS SEGMENT
    sourceCentroidMarker = L.marker([segment.startCentroid.x, segment.startCentroid.y], { icon: sourceIcon })
                           .addTo(map).bindPopup(segmentIndex === 0 ? "Starting Point" : `Continue from ${segment.transitionName || 'Previous Point'}`);
    destCentroidMarker = L.marker([segment.endCentroid.x, segment.endCentroid.y], { icon: segment.transitionType ? liftMarkerIcon : destinationIcon })
                          .addTo(map).bindPopup(segment.transitionType ? `Go to ${segment.transitionName}` : "Final Destination");

    // Optional: Display parallel points for debugging (can be commented out)
    if (segment.startNearest.parallelPoint) {
        sourceParallelMarker = L.circleMarker([segment.startNearest.parallelPoint.x, segment.startNearest.parallelPoint.y], {
            radius: 4, color: 'lime', fillOpacity: 0.7, weight: 1
        }).addTo(map); //.bindPopup('Network Connection (Start)');
    }
     if (segment.endNearest.parallelPoint) {
        destParallelMarker = L.circleMarker([segment.endNearest.parallelPoint.x, segment.endNearest.parallelPoint.y], {
            radius: 4, color: 'cyan', fillOpacity: 0.7, weight: 1
        }).addTo(map); //.bindPopup('Network Connection (End)');
    }

    // Calculate the path between the NETWORK connection points for this segment
    const pathResult = findShortestPathBetweenParallelPoints(
        currentFloorData.nodes || [],
        currentFloorData.edges || [],
        segment.startNearest, // Use segment's start connection info
        segment.endNearest    // Use segment's end connection info
    );

    if (pathResult && pathResult.pathNodeIds) {
         // Draw the path connecting the CENTROIDS via the network path
         drawPathFromCentroids(
             segment.startCentroid,
             segment.endCentroid,
             segment.startNearest.parallelPoint,
             segment.endNearest.parallelPoint,
             pathResult.pathNodeIds,
             currentFloorData.nodes || [],
             pathResult.bestStartNode,
             pathResult.bestEndNode
         );
    } else {
         console.error(`Failed to calculate path for segment ${segmentIndex} on floor ${segment.floor}`);
         alert(`Error: Could not calculate route for segment ${segmentIndex + 1}.`);
         // Potentially stop multi-floor navigation here
         multiFloorPath = null;
         return;
    }


    // --- Show "Reached" Button if this segment leads to a transition ---
    if (segment.transitionType && segmentIndex < multiFloorPath.length - 1) {
        const nextFloorName = multiFloorPath[segmentIndex + 1].floor;
        showReachedButton(segment.transitionType, segment.transitionName, nextFloorName);
    } else if (segmentIndex === multiFloorPath.length - 1) {
        console.log("Last segment displayed.");
        // Optional: alert("You are on the final leg of your journey.");
    }
}


// NEW: Show the button prompting user action after reaching a transition point (LIFT)
function showReachedButton(transitionType, transitionName, nextFloor) {
    let reachedButton = document.getElementById('reached-button');
    if (reachedButton) reachedButton.remove(); // Remove existing button

    reachedButton = document.createElement('button');
    reachedButton.id = 'reached-button';
    // Style slightly for visibility - adjust as needed
    reachedButton.style.cssText = `
        position: fixed; bottom: 20px; right: 20px; padding: 10px 20px;
        background-color: #007bff; color: white; border: none; border-radius: 5px;
        font-size: 14px; cursor: pointer; z-index: 1001; box-shadow: 0 2px 5px rgba(0,0,0,0.2);`;
    reachedButton.textContent = `Reached ${transitionType} "${transitionName}" - Go to ${nextFloor.split(" ")[1]} Floor`; // Example text

    document.body.appendChild(reachedButton);

    // Action when the button is clicked
    reachedButton.onclick = () => {
        console.log(`"${transitionName}" reached button clicked. Moving to next segment on ${nextFloor}.`);
        reachedButton.remove(); // Remove the button

        currentPathSegmentIndex++; // Move to the next segment index

        if (currentPathSegmentIndex < multiFloorPath.length) {
             // Display the next segment (displayPathSegment handles floor switch)
             displayPathSegment(currentPathSegmentIndex);
        } else {
             // This case means the button was on the *last* segment somehow (shouldn't happen with current logic)
             // Or more likely, the button was clicked after the last actual segment was displayed.
             console.log("All segments completed.");
             alert("You have arrived at your destination!");
             multiFloorPath = null; // Clear path state
             currentPathSegmentIndex = 0;
        }
    };
}


// Keep original function, slightly adapted for naming consistency
function findNearestEdgeAndParallelPoint(scaledCentroid, edges, nodes, scaleFactor) {
    let nearestEdge = null;
    let minDistanceSq = Infinity;
    let parallelPoint = null;
    let nearestNodes = null; // Store the node objects {source, target}

    if (!edges || !nodes || nodes.length === 0) {
        console.warn("Edges or nodes data is missing for findNearestEdgeAndParallelPoint.");
        return { edge: null, distance: Infinity, parallelPoint: null, nodes: null };
    }

    edges.forEach(edge => {
        const nodeA = nodes.find(n => n.id === edge.sourceNodeId);
        const nodeB = nodes.find(n => n.id === edge.targetNodeId);

        if (!nodeA || !nodeB || !nodeA.coordinates || !nodeB.coordinates) return;

        const pointA = scaleCoordinates(nodeA.coordinates, scaleFactor);
        const pointB = scaleCoordinates(nodeB.coordinates, scaleFactor);
        const distSq = pointToSegmentDistanceSq(scaledCentroid, pointA, pointB);

        if (distSq < minDistanceSq) {
            minDistanceSq = distSq;
            nearestEdge = edge;
            // Store the actual node objects associated with this edge
            nearestNodes = { source: nodeA, target: nodeB };

            // Calculate the parallel point (projection onto the segment)
            const l2 = distanceSq(pointA, pointB);
            if (l2 === 0) {
                parallelPoint = pointA; // Segment is a point
            } else {
                let t = ((scaledCentroid.x - pointA.x) * (pointB.x - pointA.x) + (scaledCentroid.y - pointA.y) * (pointB.y - pointA.y)) / l2;
                t = Math.max(0, Math.min(1, t)); // Clamp t to [0, 1]
                parallelPoint = {
                    x: pointA.x + t * (pointB.x - pointA.x),
                    y: pointA.y + t * (pointB.y - pointA.y)
                };
            }
        }
    });

    return {
        edge: nearestEdge,
        distance: Math.sqrt(minDistanceSq),
        parallelPoint: parallelPoint,
        nodes: nearestNodes // Return the {source, target} node objects
    };
}


// Keep original Dijkstra logic, but return more info
function findShortestPathBetweenParallelPoints(allNodes, allEdges, startNearestResult, endNearestResult) {
    const startParallelPoint = startNearestResult.parallelPoint;
    const endParallelPoint = endNearestResult.parallelPoint;
    const startEdgeNodes = startNearestResult.nodes; // { source: nodeObj, target: nodeObj }
    const endEdgeNodes = endNearestResult.nodes;     // { source: nodeObj, target: nodeObj }

    // Basic check for required data
    if (!startParallelPoint || !endParallelPoint || !startEdgeNodes || !endEdgeNodes || !startEdgeNodes.source || !startEdgeNodes.target || !endEdgeNodes.source || !endEdgeNodes.target) {
        console.error("Missing data for shortest path calculation:", startNearestResult, endNearestResult);
        return null; // Return null if path cannot be calculated
    }

    const scaleFactor = allMapData[currentFloor]?.referenceScaleFactor || 100;
    const potentialStartNodeIds = [startEdgeNodes.source.id, startEdgeNodes.target.id];
    const potentialEndNodeIds = [endEdgeNodes.source.id, endEdgeNodes.target.id];

    // Build Adjacency List (same as before)
    const adjacencyList = {};
    allNodes.forEach(node => { adjacencyList[node.id] = []; });
    allEdges.forEach(edge => {
        const sourceNode = allNodes.find(n => n.id === edge.sourceNodeId);
        const targetNode = allNodes.find(n => n.id === edge.targetNodeId);
        if (sourceNode && targetNode && sourceNode.coordinates && targetNode.coordinates) {
            const weight = edge.weight ?? distance(scaleCoordinates(sourceNode.coordinates, scaleFactor), scaleCoordinates(targetNode.coordinates, scaleFactor));
            adjacencyList[sourceNode.id].push({ node: targetNode.id, weight: weight });
            adjacencyList[targetNode.id].push({ node: sourceNode.id, weight: weight });
        }
    });


    // Run Dijkstra's for multiple start/end combinations (same as before)
    let shortestOverallPathIds = null;
    let minOverallPathLength = Infinity;
    let bestStartNode = null; // Store the best start node *object*
    let bestEndNode = null;   // Store the best end node *object*

    for (const startNodeId of potentialStartNodeIds) {
        for (const endNodeId of potentialEndNodeIds) {
            // Dijkstra initialization
            const distances = {};
            const predecessors = {};
            const pq = new Map(); // Simple priority queue
            allNodes.forEach(node => { distances[node.id] = Infinity; predecessors[node.id] = null; });
            distances[startNodeId] = 0;
            pq.set(startNodeId, 0);

            // Dijkstra main loop
            while (pq.size > 0) {
                let u = null; let minDist = Infinity;
                for (const [nodeId, dist] of pq.entries()) { if (dist < minDist) { minDist = dist; u = nodeId; } }
                if (u === null) break;
                const currentDistance = pq.get(u); pq.delete(u);

                if (adjacencyList[u]) {
                    for (const neighborInfo of adjacencyList[u]) {
                        const v = neighborInfo.node; const weight = neighborInfo.weight;
                        const distanceThroughU = currentDistance + weight;
                        if (distanceThroughU < distances[v]) {
                            distances[v] = distanceThroughU; predecessors[v] = u; pq.set(v, distanceThroughU);
                        }
                    }
                }
            }

            // Path Reconstruction and Length Calculation
            if (distances[endNodeId] !== Infinity) {
                const pathNodes = []; let currentId = endNodeId;
                while (currentId !== null) { pathNodes.unshift(currentId); if (currentId === startNodeId) break; currentId = predecessors[currentId]; if (!currentId && pathNodes[0] !== startNodeId) { pathNodes.length = 0; break; } }

                if (pathNodes.length > 0 && pathNodes[0] === startNodeId) {
                    const startNodeObj = allNodes.find(n => n.id === startNodeId); // Find node objects
                    const endNodeObj = allNodes.find(n => n.id === endNodeId);
                    if(startNodeObj && endNodeObj && startNodeObj.coordinates && endNodeObj.coordinates){
                        const scaledStartNodeCoords = scaleCoordinates(startNodeObj.coordinates, scaleFactor);
                        const scaledEndNodeCoords = scaleCoordinates(endNodeObj.coordinates, scaleFactor);
                        const distFromStartParallel = distance(startParallelPoint, scaledStartNodeCoords);
                        const distFromEndParallel = distance(endParallelPoint, scaledEndNodeCoords);
                        const graphPathDist = distances[endNodeId];
                        const currentTotalLength = distFromStartParallel + graphPathDist + distFromEndParallel;

                        if (currentTotalLength < minOverallPathLength) {
                            minOverallPathLength = currentTotalLength;
                            shortestOverallPathIds = pathNodes; // Store the node IDs
                            bestStartNode = startNodeObj; // Store the best node OBJECT
                            bestEndNode = endNodeObj;     // Store the best node OBJECT
                        }
                    }
                }
            }
        }
    }

    // Return the results needed for drawing
    if (shortestOverallPathIds) {
        return {
            pathNodeIds: shortestOverallPathIds,
            pathLength: minOverallPathLength,
            bestStartNode: bestStartNode, // Return the actual node object
            bestEndNode: bestEndNode     // Return the actual node object
        };
    } else {
        console.error("No path found between any combination of start/end edge nodes.");
        return null; // Indicate failure
    }
}


// --- MODIFIED: drawPathFromCentroids - Draws path Centroid -> Parallel -> Network -> Parallel -> Centroid ---
function drawPathFromCentroids(
    startCentroid, endCentroid,           // The actual start/end points for the segment
    startParallelPoint, endParallelPoint, // Points on network edges nearest to centroids
    pathNodeIds,                          // Array of node IDs from Dijkstra
    allNodes,                             // Array of all node objects for coordinate lookup
    startNode, endNode                    // The specific node objects from the path result
) {
    if (!pathNodeIds || !startCentroid || !endCentroid || !startParallelPoint || !endParallelPoint || !startNode || !endNode) {
        console.error("Invalid data provided to drawPathFromCentroids.");
        return;
    }

    if (routeLayer) map.removeLayer(routeLayer); // Clear previous route drawing

    const scaleFactor = allMapData[currentFloor]?.referenceScaleFactor || 100;
    const pathCoordinates = []; // Array to hold [x, y] pairs for the polyline

    // 1. Start at the segment's starting CENTROID
    pathCoordinates.push([startCentroid.x, startCentroid.y]);

    // 2. Connect to the START parallel point on the network edge
    //    (Only add if significantly different from centroid to avoid zero-length segment)
    if (distanceSq(startCentroid, startParallelPoint) > 1e-9) {
        pathCoordinates.push([startParallelPoint.x, startParallelPoint.y]);
    }

    // 3. Connect the start parallel point to the first node of the Dijkstra path (bestStartNode)
    //    (Only add if significantly different from parallel point)
    const scaledStartNodeCoord = scaleCoordinates(startNode.coordinates, scaleFactor);
     if (distanceSq(startParallelPoint, scaledStartNodeCoord) > 1e-9) {
        pathCoordinates.push([scaledStartNodeCoord.x, scaledStartNodeCoord.y]);
    }


    // 4. Add coordinates for all intermediate nodes in the Dijkstra path sequence
    //    (Skip the very first and very last node as they are startNode/endNode handled above/below)
    for (let i = 1; i < pathNodeIds.length - 1; i++) {
        const nodeId = pathNodeIds[i];
        const node = allNodes.find(n => n.id === nodeId);
        if (node && node.coordinates) {
            const scaledCoord = scaleCoordinates(node.coordinates, scaleFactor);
             // Add check to avoid duplicate consecutive points
             if (pathCoordinates.length === 0 || distanceSq(scaledCoord, {x: pathCoordinates[pathCoordinates.length - 1][0], y: pathCoordinates[pathCoordinates.length - 1][1]}) > 1e-9) {
                pathCoordinates.push([scaledCoord.x, scaledCoord.y]);
             }
        }
    }

    // 5. Connect the last intermediate node to the last node of the Dijkstra path (bestEndNode)
    //    (Only add if significantly different from the previous point)
    const scaledEndNodeCoord = scaleCoordinates(endNode.coordinates, scaleFactor);
    if (pathNodeIds.length > 1) { // Only add if there was more than just the start node
       if (pathCoordinates.length === 0 || distanceSq(scaledEndNodeCoord, {x: pathCoordinates[pathCoordinates.length - 1][0], y: pathCoordinates[pathCoordinates.length - 1][1]}) > 1e-9) {
           pathCoordinates.push([scaledEndNodeCoord.x, scaledEndNodeCoord.y]);
       }
    } else if (pathNodeIds.length === 1 && startNode.id !== endNode.id) {
        // Handle case where path is just startNode -> endNode (no intermediates)
         if (pathCoordinates.length === 0 || distanceSq(scaledEndNodeCoord, {x: pathCoordinates[pathCoordinates.length - 1][0], y: pathCoordinates[pathCoordinates.length - 1][1]}) > 1e-9) {
             pathCoordinates.push([scaledEndNodeCoord.x, scaledEndNodeCoord.y]);
         }
    }


    // 6. Connect the last Dijkstra node (bestEndNode) to the END parallel point on the network edge
    //    (Only add if significantly different)
     if (distanceSq(scaledEndNodeCoord, endParallelPoint) > 1e-9) {
        pathCoordinates.push([endParallelPoint.x, endParallelPoint.y]);
    }

    // 7. Connect the end parallel point to the segment's ending CENTROID
    //    (Only add if significantly different)
     if (distanceSq(endParallelPoint, endCentroid) > 1e-9) {
         pathCoordinates.push([endCentroid.x, endCentroid.y]);
     }


    // Create the polyline using the original style
    const pathPolyline = L.polyline(pathCoordinates, {
        color: 'blue', // Keep original path color
        weight: 3,     // Keep original path weight (or adjust if needed)
        opacity: 0.7   // Keep original path opacity (or adjust)
    });

    // Add to map
    routeLayer = L.layerGroup([pathPolyline]);
    routeLayer.addTo(map);

    // Optional: Fit map bounds to the route
    if (pathCoordinates.length > 1) { // Need at least 2 points for bounds
        try {
            map.fitBounds(pathPolyline.getBounds().pad(0.2)); // Zoom with padding
        } catch(e) {
            console.error("Error fitting bounds to route:", e);
        }
    }

    console.log("Path polyline drawn from centroid to centroid via network.");
}


/* --- Animation Code (Keep commented out as per original structure unless needed) ---
function animatePath(pathCoords) {
    // ... original animation code ...
}
*/