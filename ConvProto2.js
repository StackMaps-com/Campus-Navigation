/// <reference types="leaflet" />

var map = L.map('map', {
    crs: L.CRS.Simple,
    minZoom: -100,
    maxZoom: 1
});

let mapRooms = [], mapNodes = [], mapEdges = [];
let routeLayer = null;
let sourceCentroidMarker; // To store the source centroid marker
let destCentroidMarker;   // To store the destination centroid marker
let sourceParallelMarker; // To store the source parallel point marker
let destParallelMarker;   // To store the destination parallel point marker

async function loadMapData() {
    try {
        const response = await fetch("new.json");
        const json = await response.json();
        mapRooms = json.rooms || [];
        mapNodes = json.nodes || [];
        mapEdges = json.edges || [];
        drawRooms(mapRooms);
        // findPoint(mapRooms, mapNodes, mapEdges, "A - 213", "C - 210"); // Initial call removed
        return { rooms: mapRooms, nodes: mapNodes, edges: mapEdges };
    } catch (err) {
        console.error("Failed to load JSON : ", err);
    }
}

loadMapData();

function drawRooms(rooms) {
    const allpoints = [];

    rooms.forEach((room) => {
        const converted = room.coordinates.map((point) => [point.x, point.y]);
        allpoints.push(...converted);
        const polygon = L.polygon(converted, { color: 'green', weight: 2 }).addTo(map);
        polygon.bindPopup(room.name || "Unnamed Room");

        // Calculate centroid for label position
        let centroidX = 0;
        let centroidY = 0;
        room.coordinates.forEach(coord => {
            centroidX += coord.x;
            centroidY += coord.y;
        });
        centroidX /= room.coordinates.length;
        centroidY /= room.coordinates.length;

        // Create a label with adjusted styling
        const label = L.divIcon({
            className: 'room-label',
            html: `<div style="font-size: 12px; color: #333; background-color: rgba(255, 255, 255, 0.23); padding: 3px 10px; border: 0px solid #999; border-radius: 10px; text-align: center;">${room.name}</div>`,
            iconSize: [80, 20], // Adjust size as needed
            iconAnchor: [40, 10] // Center the label
        });

        // Add the label to the map
        L.marker([centroidX, centroidY], { icon: label }).addTo(map);
    });

    if (allpoints.length) {
        const bounds = L.latLngBounds(allpoints)
        map.fitBounds(bounds);
    }
}
function distanceSq(p1, p2) {
    return (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2;
}

function pointToSegmentDistanceSq(point, a, b) {
    const l2 = distanceSq(a, b);
    if (l2 === 0) return distanceSq(point, a);
    let t = ((point.x - a.x) * (b.x - a.x) + (point.y - a.y) * (b.y - a.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return distanceSq(point, { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
}

function pointToSegmentDistance(point, a, b) {
    return Math.sqrt(pointToSegmentDistanceSq(point, a, b));
}

let sourceNearestNodes;
let destNearestNodes;
let sourceParallelPoint;
let destParallelPoint;
let nearest1ResultGlobal;
let nearest2ResultGlobal;

function findPoint(rooms, nodes, edges, sourceRoomName, destRoomName) {
    // Remove previous markers if they exist
    if (sourceCentroidMarker) {
        map.removeLayer(sourceCentroidMarker);
    }
    if (destCentroidMarker) {
        map.removeLayer(destCentroidMarker);
    }
    if (sourceParallelMarker) {
        map.removeLayer(sourceParallelMarker);
    }
    if (destParallelMarker) {
        map.removeLayer(destParallelMarker);
    }

    const sRoom = rooms.find((room) => { return room.name === sourceRoomName });
    const dRoom = rooms.find((room) => { return room.name === destRoomName });
    // console.log("Source Room:", sRoom, "Destination Room:", dRoom);
    if (!sRoom || !dRoom) {
        alert("Source or Destination room not found!");
        return;
    }

    const centroid1 = sRoom.coordinates.reduce((acc, point) => {
        acc.x += point.x;
        acc.y += point.y;
        return acc;
    }, { x: 0, y: 0 });
    centroid1.x /= sRoom.coordinates.length;
    centroid1.y /= sRoom.coordinates.length;
    // console.log("Centroid 1:", centroid1.x, centroid1.y);

    const centroid2 = dRoom.coordinates.reduce((acc, point) => {
        acc.x += point.x;
        acc.y += point.y;
        return acc;
    }, { x: 0, y: 0 });
    centroid2.x /= dRoom.coordinates.length;
    centroid2.y /= dRoom.coordinates.length;
    // console.log("Centroid 2:", centroid2.x, centroid2.y);

    sourceCentroidMarker = L.circleMarker([centroid1.x, centroid1.y], {
        radius: 6,
        color: 'red',
        fillOpacity: 1
    }).addTo(map);

    destCentroidMarker = L.circleMarker([centroid2.x, centroid2.y], {
        radius: 6,
        color: 'blue',
        fillOpacity: 1
    }).addTo(map);

    const findNearestEdgeAndParallelPoint = (centroid) => {
        let nearestEdge = null;
        let minDistance = Infinity;
        let parallelPoint = null;
        let nearestNodes = null;

        edges.forEach((edge) => {
            const nodeA = nodes.find(n => n.id === edge.sourceNodeId);
            const nodeB = nodes.find(n => n.id === edge.targetNodeId);
            if (!nodeA || !nodeB || !nodeA.coordinates || !nodeB.coordinates) return;

            const pointA = nodeA.coordinates;
            const pointB = nodeB.coordinates;

            const dist = pointToSegmentDistance(centroid, pointA, pointB);

            if (dist < minDistance) {
                minDistance = dist;
                nearestEdge = edge;
                nearestNodes = { source: nodeA, target: nodeB };

                const isHorizontal = Math.abs(pointA.y - pointB.y) < 1e-6;
                const isVertical = Math.abs(pointA.x - pointB.x) < 1e-6;

                if (isHorizontal) {
                    if (centroid.x >= Math.min(pointA.x, pointB.x) && centroid.x <= Math.max(pointA.x, pointB.x)) {
                        parallelPoint = { x: centroid.x, y: pointA.y };
                    } else if (Math.abs(centroid.x - pointA.x) < Math.abs(centroid.x - pointB.x)) {
                        parallelPoint = { x: pointA.x, y: pointA.y };
                    } else {
                        parallelPoint = { x: pointB.x, y: pointB.y };
                    }
                } else if (isVertical) {
                    if (centroid.y >= Math.min(pointA.y, pointB.y) && centroid.y <= Math.max(pointA.y, pointB.y)) {
                        parallelPoint = { x: pointA.x, y: centroid.y };
                    } else if (Math.abs(centroid.y - pointA.y) < Math.abs(centroid.y - pointB.y)) {
                        parallelPoint = { x: pointA.x, y: pointA.y };
                    } else {
                        parallelPoint = { x: pointB.x, y: pointB.y };
                    }
                } else {
                    const l2 = distanceSq(pointA, pointB);
                    if (l2 !== 0) {
                        let t = ((centroid.x - pointA.x) * (pointB.x - pointA.x) + (centroid.y - pointA.y) * (pointB.y - pointA.y)) / l2;
                        t = Math.max(0, Math.min(1, t));
                        parallelPoint = { x: pointA.x + t * (pointB.x - pointA.x), y: pointA.y + t * (pointB.y - pointA.y) };
                    } else {
                        parallelPoint = pointA;
                    }
                }
            }
        });
        return { edge: nearestEdge, distance: minDistance, parallelPoint: parallelPoint, nodes: nearestNodes };
    };

    nearest1ResultGlobal = findNearestEdgeAndParallelPoint(centroid1);
    // console.log("Nearest to Centroid 1:", nearest1ResultGlobal);
    if (nearest1ResultGlobal.edge && nearest1ResultGlobal.nodes && nearest1ResultGlobal.parallelPoint) {
        // console.log("Nearest Edge Nodes (Centroid 1):", nearest1ResultGlobal.nodes.source.id, nearest1ResultGlobal.nodes.target.id);
        // console.log("Parallel Point (Centroid 1):", nearest1ResultGlobal.parallelPoint);
        sourceParallelMarker = L.circleMarker([nearest1ResultGlobal.parallelPoint.x, nearest1ResultGlobal.parallelPoint.y], {
            radius: 4,
            color: 'lime',
            fillOpacity: 1
        }).addTo(map);
        // .bindPopup(`Parallel point to ${sourceRoomName}`);
        sourceNearestNodes = nearest1ResultGlobal.nodes;
        sourceParallelPoint = nearest1ResultGlobal.parallelPoint;
    }

    nearest2ResultGlobal = findNearestEdgeAndParallelPoint(centroid2);
    // console.log("Nearest to Centroid 2:", nearest2ResultGlobal);
    if (nearest2ResultGlobal.edge && nearest2ResultGlobal.nodes && nearest2ResultGlobal.parallelPoint) {
        // console.log("Nearest Edge Nodes (Centroid 2):", nearest2ResultGlobal.nodes.source.id, nearest2ResultGlobal.nodes.target.id);
        // console.log("Parallel Point (Centroid 2):", nearest2ResultGlobal.parallelPoint);
        destParallelMarker = L.circleMarker([nearest2ResultGlobal.parallelPoint.x, nearest2ResultGlobal.parallelPoint.y], {
            radius: 4,
            color: 'cyan',
            fillOpacity: 1
        }).addTo(map);
        // .bindPopup(`Parallel point to ${destRoomName}`);
        destNearestNodes = nearest2ResultGlobal.nodes;
        destParallelPoint = nearest2ResultGlobal.parallelPoint;
    }

    if (nearest1ResultGlobal && nearest2ResultGlobal && nearest1ResultGlobal.parallelPoint && nearest2ResultGlobal.parallelPoint && nodes && edges) {
        findShortestPathBetweenParallelPoints(nodes, edges, nearest1ResultGlobal, nearest2ResultGlobal);
    }
}

function distance(p1, p2) {
    return Math.sqrt(distanceSq(p1, p2));
}

function findNearestNode(nodes, point) {
    let nearestNode = null;
    let minDistance = Infinity;

    for (const node of nodes) {
        if (node.coordinates) {
            const dist = distanceSq(point, node.coordinates);
            if (dist < minDistance) {
                minDistance = dist;
                nearestNode = node;
            }
        }
    }
    return nearestNode;
}

function findShortestPathBetweenParallelPoints(allNodes, allEdges, startNearestResult, endNearestResult) {
    const nodes = [...allNodes];
    const edges = [...allEdges];
    const startPoint = startNearestResult.parallelPoint;
    const endPoint = endNearestResult.parallelPoint;

    // Use the nodes of the nearest edge as potential starting/ending points
    const potentialStartNodes = [
        nodes.find(n => n.id === startNearestResult.nodes.source.id),
        nodes.find(n => n.id === startNearestResult.nodes.target.id)
    ].filter(Boolean);

    const potentialEndNodes = [
        nodes.find(n => n.id === endNearestResult.nodes.source.id),
        nodes.find(n => n.id === endNearestResult.nodes.target.id)
    ].filter(Boolean);

    let shortestPath = null;
    let minPathLength = Infinity;
    let bestStartNode = null;
    let bestEndNode = null;

    for (const startNode of potentialStartNodes) {
        for (const endNode of potentialEndNodes) {
            const adjacencyList = {};
            for (const node of nodes) {
                adjacencyList[node.id] = [];
            }

            for (const edge of edges) {
                const sourceId = edge.sourceNodeId;
                const targetId = edge.targetNodeId;
                const source = nodes.find(n => n.id === sourceId);
                const target = nodes.find(n => n.id === targetId);
                if (source && target && source.coordinates && target.coordinates) {
                    const weight = edge.weight !== undefined ? edge.weight : distance(source.coordinates, target.coordinates);
                    adjacencyList[sourceId].push({ node: targetId, weight: weight });
                    adjacencyList[targetId].push({ node: sourceId, weight: weight }); // Assuming undirected graph
                }
            }

            const distances = {};
            const predecessors = {};
            const priorityQueue = [];

            for (const node of nodes) {
                distances[node.id] = Infinity;
                predecessors[node.id] = null;
            }

            distances[startNode.id] = 0;
            priorityQueue.push({ node: startNode.id, distance: 0 });
            priorityQueue.sort((a, b) => a.distance - b.distance);

            while (priorityQueue.length > 0) {
                const current = priorityQueue.shift();
                const currentNodeId = current.node;
                const currentDistance = current.distance;

                if (currentDistance > distances[currentNodeId]) {
                    continue;
                }

                if (currentNodeId === endNode.id) {
                    break;
                }

                if (!adjacencyList[currentNodeId]) continue;

                for (const neighborInfo of adjacencyList[currentNodeId]) {
                    const neighborId = neighborInfo.node;
                    const weight = neighborInfo.weight;
                    const newDistance = distances[currentNodeId] + weight;

                    if (newDistance < distances[neighborId]) {
                        distances[neighborId] = newDistance;
                        predecessors[neighborId] = currentNodeId;
                        priorityQueue.push({ node: neighborId, distance: newDistance });
                        priorityQueue.sort((a, b) => a.distance - b.distance);
                    }
                }
            }

            if (distances[endNode.id] !== Infinity) {
                let currentId = endNode.id;
                const currentPathNodes = [];
                while (currentId && currentId !== startNode.id) {
                    currentPathNodes.unshift(currentId);
                    currentId = predecessors[currentId];
                }
                if (currentId === startNode.id) {
                    currentPathNodes.unshift(currentId);
                    const currentPathLength = distances[endNode.id] + distance(startPoint, startNode.coordinates) + distance(endPoint, endNode.coordinates);
                    if (currentPathLength < minPathLength) {
                        minPathLength = currentPathLength;
                        shortestPath = currentPathNodes;
                        bestStartNode = startNode;
                        bestEndNode = endNode;
                    }
                }
            }
        }
    }

    if (shortestPath && bestStartNode && bestEndNode) {
        // console.log("Shortest Path Nodes between parallel points:", shortestPath);
        drawPathFromParallelPoints(startPoint, shortestPath, endPoint, nodes, bestStartNode, bestEndNode);
    } else {
        console.log("No path found between the nearest edge nodes.");
    }
}

function drawPathFromParallelPoints(startPoint, pathNodes, endPoint, allNodes, startNode, endNode) {
    if (!pathNodes) {
        console.log("No path to draw.");
        return;
    }

    if (routeLayer) {
        map.removeLayer(routeLayer);
    }

    const pathCoordinates = [];
    pathCoordinates.push([startPoint.x, startPoint.y]);
    pathCoordinates.push([startNode.coordinates.x, startNode.coordinates.y]);

    for (const nodeId of pathNodes) {
        const node = allNodes.find(n => n.id === nodeId);
        if (node && node.coordinates) {
            pathCoordinates.push([node.coordinates.x, node.coordinates.y]);
        }
    }

    pathCoordinates.push([endNode.coordinates.x, endNode.coordinates.y]);
    pathCoordinates.push([endPoint.x, endPoint.y]);

    if (pathCoordinates.length > 1) {
        routeLayer = L.polyline(pathCoordinates, { color: 'red', weight: 5 }).addTo(map);
        // .bindPopup("Shortest Path");
    } else {
        console.log("Not enough coordinates to draw the path.");
    }
}

function handleGo() {
    const sourceRoomName = document.getElementById("sourceRoomInput").value.trim();
    const destRoomName = document.getElementById("destinationRoomInput").value.trim();

    if (!sourceRoomName || !destRoomName) {
        alert("Please enter both source and destination room names.");
        return;
    }

    findPoint(mapRooms, mapNodes, mapEdges, sourceRoomName, destRoomName);
}