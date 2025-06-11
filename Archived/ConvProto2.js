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
let nearest1ResultGlobal, nearest2ResultGlobal;

// --- Original Initialization and Utility Functions ---
async function loadMapData() {
    try {
        const floorNames = ["E-Block Ground Floor.json", "E-Block First Floor.json"];
        for (const floorFile of floorNames) {
            const response = await fetch(`${floorFile}?v=${new Date().getTime()}`); // Cache busting
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} for file ${floorFile}`);
            }
            const json = await response.json();
            const floorplanName = json.name || floorFile.replace('.json', '');
            json.level = inferFloorLevel(floorplanName);
            allMapData[floorplanName] = json;
            console.log(`Loaded: ${floorplanName} with rooms:`, json.rooms.map(r => r.name));

            if (json.orientation) {
                let angle;
                if (json.orientation.toLowerCase() === "right") angle = 90;
                else if (json.orientation.toLowerCase() === "left") angle = -90;
                if (angle) rotateMap(floorplanName, angle);
            }
        }

        const firstFloorName = Object.keys(allMapData)[0];
        if (firstFloorName) {
            currentFloor = firstFloorName;
            const currentFloorData = allMapData[currentFloor];
            mapRooms = currentFloorData.rooms || [];
            mapNodes = currentFloorData.nodes || [];
            mapEdges = currentFloorData.edges || [];
            drawRooms(mapRooms, mapNodes, currentFloor);
            updateFloorSelector(); // Populate dropdown after initial load
        } else {
            console.error("No floor plans loaded.");
        }

        addEnterKeyListener();
        return { rooms: mapRooms, nodes: mapNodes, edges: mapEdges };
    } catch (err) {
        console.error("Failed to load or parse JSON:", err);
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
    if (!coord || typeof coord.x !== 'number' || typeof coord.y !== 'number') {
        console.warn("Invalid coordinate object passed to scaleCoordinates:", coord);
        return { x: 0, y: 0 };
    }
    const factor = scaleFactor > 0 ? scaleFactor : 100;
    return {
        x: coord.x / factor,
        y: coord.y / factor
    };
}

// Calculate centroid (Keep original)
function calculateCentroid(coordinates) {
    let centroidX = 0, centroidY = 0;
    if (!coordinates || coordinates.length === 0) return { x: 0, y: 0 };
    coordinates.forEach(coord => {
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

// --- Original Map Drawing and Interaction Functions ---
function drawRooms(rooms, nodes, floorplanName) {
    map.eachLayer(layer => {
        if (!(layer instanceof L.TileLayer)) {
            map.removeLayer(layer);
        }
    });

    const scaleFactor = allMapData[floorplanName]?.referenceScaleFactor || 100;
    const allpoints = [];
    const entranceIcon = L.divIcon({
        className: 'entrance-icon',
        html: '<svg style="width:24px;height:24px;" viewBox="0 0 24 24"><path fill="currentColor" d="M13 13V17H11V13H13M13 9V11H11V9H13M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2M12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20M12 6C10.9 6 10 6.9 10 8C10 9.1 10.9 10 12 10C13.1 10 14 9.1 14 8C14 6.9 13.1 6 12 6Z" /></svg>',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });

    rooms.forEach(room => {
        if (room.name && room.name.toUpperCase() === "LOBBY") return;

        const scaledCoords = room.coordinates.map(coord => {
            const scaled = scaleCoordinates(coord, scaleFactor);
            return [scaled.x, scaled.y];
        });
        allpoints.push(...scaledCoords);

        let polygonColor = 'green';
        let isEntrance = (room.name || "").toLowerCase().includes("entrance") || (room.name || "").toLowerCase().includes("lobby");
        if (isEntrance) polygonColor = 'lightgreen';
        if ((room.name || "").toLowerCase().includes("lift")) polygonColor = 'purple';

        const polygon = L.polygon(scaledCoords, { color: polygonColor, weight: 1.3, fillOpacity: 0.1 }).addTo(map);
        polygon.bindPopup(room.name || "Unnamed Room");

        const centroid = calculateCentroid(room.coordinates);
        const scaledCentroid = scaleCoordinates(centroid, scaleFactor);

        const label = L.divIcon({
            className: 'room-label',
            html: `<div style="font-size: 12px; color: #333; background-color: rgba(255, 255, 255, 0.23); padding: 3px 10px; border-radius: 10px; text-align: center;">${room.name}</div>`,
            iconSize: [80, 20],
            iconAnchor: [40, 10]
        });
        L.marker([scaledCentroid.x, scaledCentroid.y], { icon: label, interactive: false }).addTo(map);

        if (isEntrance) {
            L.marker([scaledCentroid.x, scaledCentroid.y], { icon: entranceIcon }).addTo(map);
        }
    });

    if (allpoints.length) {
        const bounds = L.latLngBounds(allpoints);
        if (bounds.isValid()) {
            map.fitBounds(bounds.pad(0.1));
        } else {
            console.warn("Could not calculate valid bounds for floor plan.");
            map.setView([0, 0], -2);
        }
    } else {
        map.setView([0, 0], -2);
    }

    const mapTitleDiv = document.getElementById('map-title');
    const floorplanNameInstructionSpan = document.getElementById('floorplan-name-instruction');
    if (mapTitleDiv && floorplanNameInstructionSpan) {
        const formattedName = floorplanName.split(/[\s_-]+/).map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
        mapTitleDiv.textContent = `${formattedName} Map`;
        floorplanNameInstructionSpan.textContent = formattedName;
    }
}

function updateFloorSelector() {
    const floorSelector = document.getElementById('floor-selector');
    if (!floorSelector) {
        console.warn("Floor selector element not found. Please add <select id='floor-selector'> to your HTML.");
        return;
    }

    floorSelector.innerHTML = '';

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

    floorSelector.onchange = function() {
        const selectedFloor = this.value;
        if (selectedFloor !== currentFloor) {
            switchFloorTo(selectedFloor);
        }
    };
}

function switchFloorTo(floorName) {
    if (floorName && allMapData[floorName]) {
        console.log(`Switching map to: ${floorName}`);
        currentFloor = floorName;
        const currentFloorData = allMapData[currentFloor];
        mapRooms = currentFloorData.rooms || [];
        mapNodes = currentFloorData.nodes || [];
        mapEdges = currentFloorData.edges || [];

        redrawMap(mapRooms, mapNodes, currentFloor);

        const floorSelector = document.getElementById('floor-selector');
        if (floorSelector) floorSelector.value = currentFloor;
    } else {
        console.warn(`Attempted to switch to invalid floor: ${floorName}`);
    }
}

function addEnterKeyListener() {
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

// --- Rotation Functions ---
function getMapCenter(rooms, scaleFactor) {
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

function rotatePoint(point, center, angleRad) {
    const s = Math.sin(angleRad);
    const c = Math.cos(angleRad);
    const px = point.x - center.x;
    const py = point.y - center.y;
    const newX = px * c - py * s;
    const newY = px * s + py * c;
    return { x: newX + center.x, y: newY + center.y };
}

function rotateMap(floorName, angleDegrees) {
    if (!allMapData[floorName]) return;
    const scaleFactor = allMapData[floorName].referenceScaleFactor || 100;
    const angleRad = angleDegrees * Math.PI / 180;
    const currentMapData = allMapData[floorName];
    const center = getMapCenter(currentMapData.rooms, scaleFactor);

    const rotatedRooms = currentMapData.rooms.map(room => ({
        ...room,
        coordinates: room.coordinates.map(coord => {
            const scaled = scaleCoordinates(coord, scaleFactor);
            const rotated = rotatePoint(scaled, center, angleRad);
            return { x: rotated.x * scaleFactor, y: rotated.y * scaleFactor };
        })
    }));

    const rotatedNodes = currentMapData.nodes.map(node => ({
        ...node,
        coordinates: node.coordinates ? (() => {
            const scaled = scaleCoordinates(node.coordinates, scaleFactor);
            const rotated = rotatePoint(scaled, center, angleRad);
            return { x: rotated.x * scaleFactor, y: rotated.y * scaleFactor };
        })() : null
    }));

    allMapData[floorName] = { ...currentMapData, rooms: rotatedRooms, nodes: rotatedNodes };
    if (floorName === currentFloor) {
        mapRooms = rotatedRooms;
        mapNodes = rotatedNodes;
        redrawMap(mapRooms, mapNodes, currentFloor);
    }
}

function rotateLeft() { rotateMap(-90); }
function rotateRight() { rotateMap(90); }

function redrawMap(roomsToDraw, nodesToDraw, floorName) {
    console.log("Redrawing map for", floorName);
    if (routeLayer) map.removeLayer(routeLayer);
    if (movingCircle) map.removeLayer(movingCircle);
    if (sourceCentroidMarker) map.removeLayer(sourceCentroidMarker);
    if (destCentroidMarker) map.removeLayer(destCentroidMarker);
    if (sourceParallelMarker) map.removeLayer(sourceParallelMarker);
    if (destParallelMarker) map.removeLayer(destParallelMarker);

    routeLayer = null;
    movingCircle = null;
    sourceCentroidMarker = null;
    destCentroidMarker = null;
    sourceParallelMarker = null;
    destParallelMarker = null;

    drawRooms(roomsToDraw, nodesToDraw, floorName);
}

// --- Pathfinding Logic ---
function findTransitionRooms(floorData) {
    if (!floorData || !floorData.rooms) return [];
    const lifts = floorData.rooms.filter(room =>
        room.name && room.name.toUpperCase().includes("LIFT")
    );
    console.log(`findTransitionRooms: floor=${floorData.name}, found lifts=${lifts.map(r => r.name).join(", ") || 'None'}`);
    return lifts;
}

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

    if (routeLayer) map.removeLayer(routeLayer);
    if (movingCircle) map.removeLayer(movingCircle);
    if (sourceCentroidMarker) map.removeLayer(sourceCentroidMarker);
    if (destCentroidMarker) map.removeLayer(destCentroidMarker);
    if (sourceParallelMarker) map.removeLayer(sourceParallelMarker);
    if (destParallelMarker) map.removeLayer(destParallelMarker);
    routeLayer = null; movingCircle = null; sourceCentroidMarker = null; destCentroidMarker = null;
    sourceParallelMarker = null; destParallelMarker = null;
    multiFloorPath = null; currentPathSegmentIndex = 0;
    const reachedButton = document.getElementById('reached-button');
    if (reachedButton) reachedButton.remove();

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

    const findRoomOnFloor = (name, floorData) => floorData.rooms.find(room => normalizeRoomName(room.name) === normalizeRoomName(name));
    const sourceRoom = findRoomOnFloor(sourceRoomName, sourceFloorData);
    const destRoom = findRoomOnFloor(destRoomName, destFloorData);

    if (!sourceRoom || !destRoom) {
        alert("Could not find source or destination room object.");
        return;
    }

    const sourceCentroidUnscaled = calculateCentroid(sourceRoom.coordinates);
    const destCentroidUnscaled = calculateCentroid(destRoom.coordinates);
    const sourceCentroidScaled = scaleCoordinates(sourceCentroidUnscaled, scaleFactorSource);
    const destCentroidScaled = scaleCoordinates(destCentroidUnscaled, scaleFactorDest);

    if (sourceFloor === destFloor) {
        console.log("Same floor navigation.");
        if (currentFloor !== sourceFloor) {
            switchFloorTo(sourceFloor);
        }
        const currentFloorData = allMapData[currentFloor];
        const scaleFactor = currentFloorData.referenceScaleFactor || 100;
        const nearest1Result = findNearestEdgeAndParallelPoint(sourceCentroidScaled, currentFloorData.edges || [], currentFloorData.nodes || [], scaleFactor);
        const nearest2Result = findNearestEdgeAndParallelPoint(destCentroidScaled, currentFloorData.edges || [], currentFloorData.nodes || [], scaleFactor);

        if (nearest1Result.parallelPoint && nearest2Result.parallelPoint) {
            nearest1ResultGlobal = nearest1Result;
            nearest2ResultGlobal = nearest2Result;

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

            sourceCentroidMarker = L.marker([sourceCentroidScaled.x, sourceCentroidScaled.y], { icon: sourceIcon })
                .addTo(map).bindPopup("Starting Point");
            destCentroidMarker = L.marker([destCentroidScaled.x, destCentroidScaled.y], { icon: destinationIcon })
                .addTo(map).bindPopup("Destination");

            if (nearest1Result.parallelPoint) {
                sourceParallelMarker = L.circleMarker([nearest1Result.parallelPoint.x, nearest1Result.parallelPoint.y], {
                    radius: 4, color: 'lime', fillOpacity: 0.7, weight: 1
                }).addTo(map);
            }
            if (nearest2Result.parallelPoint) {
                destParallelMarker = L.circleMarker([nearest2Result.parallelPoint.x, nearest2Result.parallelPoint.y], {
                    radius: 4, color: 'cyan', fillOpacity: 0.7, weight: 1
                }).addTo(map);
            }

            const pathResult = findShortestPathBetweenParallelPoints(currentFloorData.nodes || [], currentFloorData.edges || [], nearest1Result, nearest2Result);
            if (pathResult && pathResult.pathNodeIds) {
                drawPathFromCentroids(
                    sourceCentroidScaled, destCentroidScaled,
                    nearest1Result.parallelPoint, nearest2Result.parallelPoint,
                    pathResult.pathNodeIds, currentFloorData.nodes || [],
                    pathResult.bestStartNode, pathResult.bestEndNode
                );
            } else {
                alert("Unable to calculate a route on this floor.");
            }
        } else {
            alert("Unable to find a connection to the path network for source or destination.");
        }
    } else {
        console.log("Multi-floor navigation required.");

        const sourceLifts = findTransitionRooms(sourceFloorData);
        const destLifts = findTransitionRooms(destFloorData);

        if (!sourceLifts.length || !destLifts.length) {
            alert("No 'LIFT' rooms found on source or destination floor.");
            return;
        }

        // Simulate "Lift 8" as unavailable (for prototype, you can replace this with dynamic data)
        const unavailableLiftName = "Lift 8";
        const findLiftByNumber = (liftName) => liftName.toUpperCase().includes(unavailableLiftName.toUpperCase());

        let nearestSourceLift = null;
        let minDistance = Infinity;
        sourceLifts.forEach(lift => {
            if (!findLiftByNumber(lift.name)) { // Skip unavailable lift
                const liftCentroidUnscaled = calculateCentroid(lift.coordinates);
                const liftCentroidScaled = scaleCoordinates(liftCentroidUnscaled, scaleFactorSource);
                const dist = distance(sourceCentroidScaled, liftCentroidScaled);
                if (dist < minDistance) {
                    minDistance = dist;
                    nearestSourceLift = lift;
                }
            }
        });

        // If no available lift found, try adjacent numbers (e.g., Lift 7, Lift 9)
        if (!nearestSourceLift) {
            const tryLiftNumbers = (baseNumber) => {
                for (let i = 1; i <= 2; i++) {
                    const lowerLiftName = `Lift ${baseNumber - i}`;
                    const upperLiftName = `Lift ${baseNumber + i}`;
                    const lowerLift = sourceLifts.find(lift => lift.name.toUpperCase().includes(lowerLiftName.toUpperCase()));
                    const upperLift = sourceLifts.find(lift => lift.name.toUpperCase().includes(upperLiftName.toUpperCase()));

                    if (lowerLift) {
                        const liftCentroidUnscaled = calculateCentroid(lowerLift.coordinates);
                        const liftCentroidScaled = scaleCoordinates(liftCentroidUnscaled, scaleFactorSource);
                        const dist = distance(sourceCentroidScaled, liftCentroidScaled);
                        if (dist < minDistance) {
                            minDistance = dist;
                            nearestSourceLift = lowerLift;
                        }
                    }
                    if (upperLift) {
                        const liftCentroidUnscaled = calculateCentroid(upperLift.coordinates);
                        const liftCentroidScaled = scaleCoordinates(liftCentroidUnscaled, scaleFactorSource);
                        const dist = distance(sourceCentroidScaled, liftCentroidScaled);
                        if (dist < minDistance) {
                            minDistance = dist;
                            nearestSourceLift = upperLift;
                        }
                    }
                    if (nearestSourceLift) break; // Exit if a lift is found
                }
            };

            // Assume "Lift 8" as the base if unavailable, try adjacent lifts
            tryLiftNumbers(8);
        }

        if (!nearestSourceLift) {
            alert("Could not find a suitable 'LIFT' on source floor after checking alternatives.");
            return;
        }

        let correspondingDestLift = destLifts.find(lift => lift.name === nearestSourceLift.name);
        if (!correspondingDestLift) {
            // If exact match not found, try adjacent lift numbers on destination floor
            const baseNumber = parseInt(nearestSourceLift.name.match(/\d+/)?.[0] || 8);
            for (let i = 1; i <= 2; i++) {
                const lowerLiftName = `Lift ${baseNumber - i}`;
                const upperLiftName = `Lift ${baseNumber + i}`;
                const lowerLift = destLifts.find(lift => lift.name.toUpperCase().includes(lowerLiftName.toUpperCase()));
                const upperLift = destLifts.find(lift => lift.name.toUpperCase().includes(upperLiftName.toUpperCase()));

                if (lowerLift) {
                    correspondingDestLift = lowerLift;
                    break;
                }
                if (upperLift) {
                    correspondingDestLift = upperLift;
                    break;
                }
            }
        }

        if (!correspondingDestLift) {
            alert(`Could not find corresponding 'LIFT' near "${nearestSourceLift.name}" on destination floor.`);
            return;
        }

        multiFloorPath = [];

        const sourceLiftCentroidUnscaled = calculateCentroid(nearestSourceLift.coordinates);
        const sourceLiftCentroidScaled = scaleCoordinates(sourceLiftCentroidUnscaled, scaleFactorSource);
        const nearestSource = findNearestEdgeAndParallelPoint(sourceCentroidScaled, sourceFloorData.edges || [], sourceFloorData.nodes || [], scaleFactorSource);
        const nearestLiftSource = findNearestEdgeAndParallelPoint(sourceLiftCentroidScaled, sourceFloorData.edges || [], sourceFloorData.nodes || [], scaleFactorSource);

        if (!nearestSource.parallelPoint || !nearestLiftSource.parallelPoint) {
            alert("Error connecting source or LIFT to path network on source floor.");
            return;
        }
        multiFloorPath.push({
            floor: sourceFloor,
            startCentroid: sourceCentroidScaled,
            endCentroid: sourceLiftCentroidScaled,
            startNearest: nearestSource,
            endNearest: nearestLiftSource,
            transitionType: "LIFT",
            transitionName: nearestSourceLift.name
        });

        const destLiftCentroidUnscaled = calculateCentroid(correspondingDestLift.coordinates);
        const destLiftCentroidScaled = scaleCoordinates(destLiftCentroidUnscaled, scaleFactorDest);
        const nearestLiftDest = findNearestEdgeAndParallelPoint(destLiftCentroidScaled, destFloorData.edges || [], destFloorData.nodes || [], scaleFactorDest);
        const nearestDest = findNearestEdgeAndParallelPoint(destCentroidScaled, destFloorData.edges || [], destFloorData.nodes || [], scaleFactorDest);

        if (!nearestLiftDest.parallelPoint || !nearestDest.parallelPoint) {
            alert("Error connecting LIFT or destination to path network on destination floor.");
            return;
        }
        multiFloorPath.push({
            floor: destFloor,
            startCentroid: destLiftCentroidScaled,
            endCentroid: destCentroidScaled,
            startNearest: nearestLiftDest,
            endNearest: nearestDest,
            transitionType: null,
            transitionName: null
        });

        if (multiFloorPath.length > 0) {
            currentPathSegmentIndex = 0;
            displayPathSegment(currentPathSegmentIndex);
        } else {
            alert("Failed to create navigation segments.");
        }
    }
}

function displayPathSegment(segmentIndex) {
    if (!multiFloorPath || segmentIndex < 0 || segmentIndex >= multiFloorPath.length) {
        console.log("Invalid segment index or no multi-floor path.", segmentIndex);
        return;
    }

    const segment = multiFloorPath[segmentIndex];
    console.log(`Displaying Segment ${segmentIndex + 1}/${multiFloorPath.length} on floor ${segment.floor}`);

    if (currentFloor !== segment.floor) {
        switchFloorTo(segment.floor);
    } else {
        redrawMap(mapRooms, mapNodes, currentFloor);
    }

    const currentFloorData = allMapData[segment.floor];
    const scaleFactor = currentFloorData.referenceScaleFactor || 100;

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
    const liftMarkerIcon = destinationIcon;

    console.log("Start Centroid Coords:", segment.startCentroid);
    console.log("End Centroid Coords:", segment.endCentroid);
    console.log("Start Parallel Coords:", segment.startNearest.parallelPoint);
    console.log("End Parallel Coords:", segment.endNearest.parallelPoint);
    sourceCentroidMarker = L.marker([segment.startCentroid.x, segment.startCentroid.y], { icon: sourceIcon })
        .addTo(map).bindPopup(segmentIndex === 0 ? "Starting Point" : `Continue from ${segment.transitionName || 'Previous Point'}`);
    destCentroidMarker = L.marker([segment.endCentroid.x, segment.endCentroid.y], { icon: segment.transitionType ? liftMarkerIcon : destinationIcon })
        .addTo(map).bindPopup(segment.transitionType ? `Go to ${segment.transitionName}` : "Final Destination");

    if (segment.startNearest.parallelPoint) {
        sourceParallelMarker = L.circleMarker([segment.startNearest.parallelPoint.x, segment.startNearest.parallelPoint.y], {
            radius: 4, color: 'lime', fillOpacity: 0.7, weight: 1
        }).addTo(map);
    }
    if (segment.endNearest.parallelPoint) {
        destParallelMarker = L.circleMarker([segment.endNearest.parallelPoint.x, segment.endNearest.parallelPoint.y], {
            radius: 4, color: 'cyan', fillOpacity: 0.7, weight: 1
        }).addTo(map);
    }

    const pathResult = findShortestPathBetweenParallelPoints(
        currentFloorData.nodes || [],
        currentFloorData.edges || [],
        segment.startNearest,
        segment.endNearest
    );

    if (pathResult && pathResult.pathNodeIds) {
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
        multiFloorPath = null;
        return;
    }

    if (segment.transitionType && segmentIndex < multiFloorPath.length - 1) {
        const nextFloorName = multiFloorPath[segmentIndex + 1].floor;
        showReachedButton(segment.transitionType, segment.transitionName, nextFloorName);
    } else if (segmentIndex === multiFloorPath.length - 1) {
        console.log("Last segment displayed.");
    }
}

function showReachedButton(transitionType, transitionName, nextFloor) {
    let reachedButton = document.getElementById('reached-button');
    if (reachedButton) reachedButton.remove();

    reachedButton = document.createElement('button');
    reachedButton.id = 'reached-button';
    reachedButton.style.cssText = `
        position: fixed; bottom: 20px; right: 20px; padding: 10px 20px;
        background-color: #007bff; color: white; border: none; border-radius: 5px;
        font-size: 14px; cursor: pointer; z-index: 1001; box-shadow: 0 2px 5px rgba(0,0,0,0.2);`;
    reachedButton.textContent = `Reached ${transitionType} - Go to ${nextFloor.split(" ")[1]} Floor`;

    document.body.appendChild(reachedButton);

    reachedButton.onclick = () => {
        console.log(`"${transitionName}" reached button clicked. Moving to next segment on ${nextFloor}.`);
        reachedButton.remove();

        currentPathSegmentIndex++;

        if (currentPathSegmentIndex < multiFloorPath.length) {
            displayPathSegment(currentPathSegmentIndex);
        } else {
            console.log("All segments completed.");
            alert("You have arrived at your destination!");
            multiFloorPath = null;
            currentPathSegmentIndex = 0;
        }
    };
}

function findNearestEdgeAndParallelPoint(scaledCentroid, edges, nodes, scaleFactor) {
    let nearestEdge = null;
    let minDistanceSq = Infinity;
    let parallelPoint = null;
    let nearestNodes = null;

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
            nearestNodes = { source: nodeA, target: nodeB };

            const l2 = distanceSq(pointA, pointB);
            if (l2 === 0) {
                parallelPoint = pointA;
            } else {
                let t = ((scaledCentroid.x - pointA.x) * (pointB.x - pointA.x) + (scaledCentroid.y - pointA.y) * (pointB.y - pointA.y)) / l2;
                t = Math.max(0, Math.min(1, t));
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
        nodes: nearestNodes
    };
}

function findShortestPathBetweenParallelPoints(allNodes, allEdges, startNearestResult, endNearestResult) {
    const startParallelPoint = startNearestResult.parallelPoint;
    const endParallelPoint = endNearestResult.parallelPoint;
    const startEdgeNodes = startNearestResult.nodes;
    const endEdgeNodes = endNearestResult.nodes;

    if (!startParallelPoint || !endParallelPoint || !startEdgeNodes || !endEdgeNodes || !startEdgeNodes.source || !startEdgeNodes.target || !endEdgeNodes.source || !endEdgeNodes.target) {
        console.error("Missing data for shortest path calculation:", startNearestResult, endNearestResult);
        return null;
    }

    const scaleFactor = allMapData[currentFloor]?.referenceScaleFactor || 100;
    const potentialStartNodeIds = [startEdgeNodes.source.id, startEdgeNodes.target.id];
    const potentialEndNodeIds = [endEdgeNodes.source.id, endEdgeNodes.target.id];

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

    let shortestOverallPathIds = null;
    let minOverallPathLength = Infinity;
    let bestStartNode = null;
    let bestEndNode = null;

    for (const startNodeId of potentialStartNodeIds) {
        for (const endNodeId of potentialEndNodeIds) {
            const distances = {};
            const predecessors = {};
            const pq = new Map();
            allNodes.forEach(node => { distances[node.id] = Infinity; predecessors[node.id] = null; });
            distances[startNodeId] = 0;
            pq.set(startNodeId, 0);

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

            if (distances[endNodeId] !== Infinity) {
                const pathNodes = []; let currentId = endNodeId;
                while (currentId !== null) { pathNodes.unshift(currentId); if (currentId === startNodeId) break; currentId = predecessors[currentId]; if (!currentId && pathNodes[0] !== startNodeId) { pathNodes.length = 0; break; } }

                if (pathNodes.length > 0 && pathNodes[0] === startNodeId) {
                    const startNodeObj = allNodes.find(n => n.id === startNodeId);
                    const endNodeObj = allNodes.find(n => n.id === endNodeId);
                    if (startNodeObj && endNodeObj && startNodeObj.coordinates && endNodeObj.coordinates) {
                        const scaledStartNodeCoords = scaleCoordinates(startNodeObj.coordinates, scaleFactor);
                        const scaledEndNodeCoords = scaleCoordinates(endNodeObj.coordinates, scaleFactor);
                        const distFromStartParallel = distance(startParallelPoint, scaledStartNodeCoords);
                        const distFromEndParallel = distance(endParallelPoint, scaledEndNodeCoords);
                        const graphPathDist = distances[endNodeId];
                        const currentTotalLength = distFromStartParallel + graphPathDist + distFromEndParallel;

                        if (currentTotalLength < minOverallPathLength) {
                            minOverallPathLength = currentTotalLength;
                            shortestOverallPathIds = pathNodes;
                            bestStartNode = startNodeObj;
                            bestEndNode = endNodeObj;
                        }
                    }
                }
            }
        }
    }

    if (shortestOverallPathIds) {
        return {
            pathNodeIds: shortestOverallPathIds,
            pathLength: minOverallPathLength,
            bestStartNode: bestStartNode,
            bestEndNode: bestEndNode
        };
    } else {
        console.error("No path found between any combination of start/end edge nodes.");
        return null;
    }
}

function drawPathFromCentroids(
    startCentroid, endCentroid,
    startParallelPoint, endParallelPoint,
    pathNodeIds, allNodes,
    startNode, endNode
) {
    if (!pathNodeIds || !startCentroid || !endCentroid || !startParallelPoint || !endParallelPoint || !startNode || !endNode) {
        console.error("Invalid data provided to drawPathFromCentroids.");
        return;
    }

    if (routeLayer) map.removeLayer(routeLayer);

    const scaleFactor = allMapData[currentFloor]?.referenceScaleFactor || 100;
    const pathCoordinates = [];

    pathCoordinates.push([startCentroid.x, startCentroid.y]);

    if (distanceSq(startCentroid, startParallelPoint) > 1e-9) {
        pathCoordinates.push([startParallelPoint.x, startParallelPoint.y]);
    }

    const scaledStartNodeCoord = scaleCoordinates(startNode.coordinates, scaleFactor);
    if (distanceSq(startParallelPoint, scaledStartNodeCoord) > 1e-9) {
        pathCoordinates.push([scaledStartNodeCoord.x, scaledStartNodeCoord.y]);
    }

    for (let i = 1; i < pathNodeIds.length - 1; i++) {
        const nodeId = pathNodeIds[i];
        const node = allNodes.find(n => n.id === nodeId);
        if (node && node.coordinates) {
            const scaledCoord = scaleCoordinates(node.coordinates, scaleFactor);
            if (pathCoordinates.length === 0 || distanceSq(scaledCoord, { x: pathCoordinates[pathCoordinates.length - 1][0], y: pathCoordinates[pathCoordinates.length - 1][1] }) > 1e-9) {
                pathCoordinates.push([scaledCoord.x, scaledCoord.y]);
            }
        }
    }

    const scaledEndNodeCoord = scaleCoordinates(endNode.coordinates, scaleFactor);
    if (pathNodeIds.length > 1) {
        if (pathCoordinates.length === 0 || distanceSq(scaledEndNodeCoord, { x: pathCoordinates[pathCoordinates.length - 1][0], y: pathCoordinates[pathCoordinates.length - 1][1] }) > 1e-9) {
            pathCoordinates.push([scaledEndNodeCoord.x, scaledEndNodeCoord.y]);
        }
    } else if (pathNodeIds.length === 1 && startNode.id !== endNode.id) {
        if (pathCoordinates.length === 0 || distanceSq(scaledEndNodeCoord, { x: pathCoordinates[pathCoordinates.length - 1][0], y: pathCoordinates[pathCoordinates.length - 1][1] }) > 1e-9) {
            pathCoordinates.push([scaledEndNodeCoord.x, scaledEndNodeCoord.y]);
        }
    }

    if (distanceSq(scaledEndNodeCoord, endParallelPoint) > 1e-9) {
        pathCoordinates.push([endParallelPoint.x, endParallelPoint.y]);
    }

    if (distanceSq(endParallelPoint, endCentroid) > 1e-9) {
        pathCoordinates.push([endCentroid.x, endCentroid.y]);
    }

    const pathPolyline = L.polyline(pathCoordinates, {
        color: 'blue',
        weight: 3,
        opacity: 0.7
    });

    routeLayer = L.layerGroup([pathPolyline]);
    routeLayer.addTo(map);

    if (pathCoordinates.length > 1) {
        try {
            map.fitBounds(pathPolyline.getBounds().pad(0.2));
        } catch (e) {
            console.error("Error fitting bounds to route:", e);
        }
    }

    console.log("Path polyline drawn from centroid to centroid via network.");
}