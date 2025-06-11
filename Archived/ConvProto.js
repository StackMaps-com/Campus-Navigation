const canvas = document.getElementById("floorCanvas");
const ctx = canvas.getContext("2d");

let scale = 1;
let offsetX = 0, offsetY = 0;
let isDragging = false;
let lastX, lastY;
let roomsData = [];
let graphNodes = [];
let graphEdges = [];

function updateCanvasSize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight - 120;
  adjustScaleToFit();
  if (roomsData.length > 0) {
    drawRooms(roomsData);
  }
}

function adjustScaleToFit() {
  if (roomsData.length === 0) return;
  const maxWidth = Math.max(...roomsData.flatMap(room => room.points.map(p => p.x)));
  const maxHeight = Math.max(...roomsData.flatMap(room => room.points.map(p => p.y)));

  if (!maxWidth || !maxHeight) {
    scale = 1;
    offsetX = 0;
    offsetY = 0;
    return;
  }

  const scaleX = canvas.width / maxWidth;
  const scaleY = canvas.height / maxHeight;
  scale = Math.min(scaleX, scaleY) * 0.85;
  offsetX = 0;
  offsetY = 0;
}

function clearCanvas() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawRooms(rooms) {
  clearCanvas();
  ctx.save();
  ctx.translate(canvas.width / 2 + offsetX, canvas.height / 2 + offsetY);
  ctx.scale(scale, scale);
  ctx.translate(-canvas.width / 2, -canvas.height / 2);
  rooms.forEach(drawRoom);
  ctx.restore();
}

function drawRoom(room) {
  ctx.beginPath();
  const firstPoint = room.points[0];
  ctx.moveTo(firstPoint.x, firstPoint.y);
  room.points.forEach(point => {
    ctx.lineTo(point.x, point.y);
  });
  ctx.closePath();
  ctx.fillStyle = room.highlightColor ? room.highlightColor : (room.color || getRandomColor());
  ctx.fill();
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 2;
  ctx.stroke();

  drawRoomLabel(room);
}

function drawRoomLabel(room) {
  const minX = Math.min(...room.points.map(p => p.x));
  const maxX = Math.max(...room.points.map(p => p.x));
  const minY = Math.min(...room.points.map(p => p.y));
  const maxY = Math.max(...room.points.map(p => p.y));

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const roomWidth = maxX - minX;
  const roomHeight = maxY - minY;

  const fontSize = Math.max(6, Math.min(roomWidth, roomHeight) / 6);
  ctx.font = `${fontSize}px Arial`;
  ctx.fillStyle = "black";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillText(room.name, centerX, centerY);
}

function getRandomColor() {
  return `hsl(${Math.random() * 360}, 70%, 70%)`;
}

async function loadJson() {
  try {
    const response = await fetch('./new.json');
    const jsonData = await response.json();

    // Normalize rooms
    let loadedRoomsData = jsonData.rooms.map(room => ({
      name: room.name,
      type: room.type,
      points: room.coordinates,
      color: getRandomColor(),
      highlightColor: null // Initialize highlightColor to null
    }));

    // Load graph data
    graphNodes = jsonData.nodes || [];
    graphEdges = jsonData.edges || [];

    // Apply scale factors *before* adjusting scale to fit
    if (jsonData.originalScaleFactor && jsonData.referenceScaleFactor) {
      const factor = jsonData.originalScaleFactor / jsonData.referenceScaleFactor; // REVERSED THE DIVISION
      // Apply this factor to all points (rooms + nodes)
      loadedRoomsData.forEach(room => {
        room.points = room.points.map(p => ({
          x: p.x * factor,
          y: p.y * factor
        }));
      });

      graphNodes = graphNodes.map(node => ({
        ...node,
        coordinates: {
          x: node.coordinates.x * factor,
          y: node.coordinates.y * factor
        }
      }));
    }

    roomsData = loadedRoomsData; // Assign the scaled data back to roomsData

    adjustScaleToFit();
    drawRooms(roomsData);
  } catch (error) {
    console.error('Error loading JSON:', error);
  }
}

function getRoomCentroid(room) {
  let sumX = 0;
  let sumY = 0;
  room.points.forEach(point => {
    sumX += point.x;
    sumY += point.y;
  });
  return {
    x: sumX / room.points.length,
    y: sumY / room.points.length
  };
}

function findClosestHallwayPoint(room) {
  const centroid = getRoomCentroid(room);
  let closestPoint = null;
  let minDistance = Infinity;
  const tolerance = 1e-6; // Small value for floating-point comparisons

  graphEdges.forEach(edge => {
    const node1 = graphNodes.find(node => node.id === edge.source);
    const node2 = graphNodes.find(node => node.id === edge.target);

    if (!node1 || !node2 || !node1.coordinates || !node2.coordinates) {
      return; // Skip if node data is missing
    }

    const p1 = node1.coordinates;
    const p2 = node2.coordinates;

    // Check if the edge is horizontal
    if (Math.abs(p1.y - p2.y) < tolerance) {
      // Check if the centroid's y is aligned with the edge's y
      if (Math.abs(centroid.y - p1.y) < tolerance) {
        // Project the centroid's x onto the edge
        const projectedX = Math.max(Math.min(centroid.x, Math.max(p1.x, p2.x)), Math.min(p1.x, p2.x));
        const projectedPoint = { x: projectedX, y: p1.y };
        const distance = Math.sqrt((centroid.x - projectedPoint.x) ** 2 + (centroid.y - projectedPoint.y) ** 2);

        if (distance < minDistance) {
          minDistance = distance;
          closestPoint = projectedPoint;
        }
      }
    }
    // Check if the edge is vertical
    else if (Math.abs(p1.x - p2.x) < tolerance) {
      // Check if the centroid's x is aligned with the edge's x
      if (Math.abs(centroid.x - p1.x) < tolerance) {
        // Project the centroid's y onto the edge
        const projectedY = Math.max(Math.min(centroid.y, Math.max(p1.y, p2.y)), Math.min(p1.y, p2.y));
        const projectedPoint = { x: p1.x, y: projectedY };
        const distance = Math.sqrt((centroid.x - projectedPoint.x) ** 2 + (centroid.y - projectedPoint.y) ** 2);

        if (distance < minDistance) {
          minDistance = distance;
          closestPoint = projectedPoint;
        }
      }
    }
  });

  return closestPoint;
}

function findClosestNode(point) {
  if (!point || !graphNodes || graphNodes.length === 0) {
    return null;
  }
  let closestNode = null;
  let minDistance = Infinity;

  graphNodes.forEach(node => {
    if (node.coordinates) {
      const distance = Math.sqrt((point.x - node.coordinates.x) ** 2 + (point.y - node.coordinates.y) ** 2);
      if (distance < minDistance) {
        minDistance = distance;
        closestNode = node;
      }
    }
  });
  return closestNode;
}

function findPath(startNodeId, endNodeId) {
  if (!startNodeId || !endNodeId || startNodeId === endNodeId) {
    return null;
  }

  const queue = [{ node: startNodeId, path: [startNodeId] }];
  const visited = new Set();

  while (queue.length > 0) {
    const { node, path } = queue.shift();

    if (node === endNodeId) {
      return path;
    }

    visited.add(node);

    const neighbors = graphEdges
      .filter(edge => edge.source === node || edge.target === node)
      .map(edge => (edge.source === node ? edge.target : edge.source))
      .filter(neighbor => !visited.has(neighbor));

    neighbors.forEach(neighbor => {
      queue.push({ node: neighbor, path: [...path, neighbor] });
    });
  }

  return null; // No path found
}

function drawPath(path) {
  if (!path || path.length < 2) {
    return;
  }

  ctx.save();
  ctx.translate(canvas.width / 2 + offsetX, canvas.height / 2 + offsetY);
  ctx.scale(scale, scale);
  ctx.translate(-canvas.width / 2, -canvas.height / 2);

  ctx.beginPath();
  ctx.strokeStyle = "blue";
  ctx.lineWidth = 5;

  const startNode = graphNodes.find(node => node.id === path[0]);
  if (startNode && startNode.coordinates) {
    ctx.moveTo(startNode.coordinates.x, startNode.coordinates.y);
  }

  for (let i = 1; i < path.length; i++) {
    const node = graphNodes.find(n => n.id === path[i]);
    if (node && node.coordinates) {
      ctx.lineTo(node.coordinates.x, node.coordinates.y);
    }
  }

  ctx.stroke();
  ctx.restore();
}

canvas.addEventListener('mousedown', (e) => {
  isDragging = true;
  lastX = e.clientX;
  lastY = e.clientY;
});

canvas.addEventListener('mousemove', (e) => {
  if (isDragging) {
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    offsetX += dx;
    offsetY += dy;
    lastX = e.clientX;
    lastY = e.clientY;
    drawRooms(roomsData);
  }
});

canvas.addEventListener('mouseup', () => {
  isDragging = false;
});

canvas.addEventListener('mouseleave', () => {
  isDragging = false;
});

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
  const newScale = scale * scaleFactor;
  scale = Math.min(Math.max(0.5, newScale), 5);

  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  const scaleRatio = newScale / scale;
  offsetX = mouseX - (mouseX - offsetX) * scaleRatio;
  offsetY = mouseY - (mouseY - offsetY) * scaleRatio;

  drawRooms(roomsData);
});

window.addEventListener("resize", updateCanvasSize);
updateCanvasSize();
loadJson();

function resetPosition() {
  scale = 1;
  offsetX = 0;
  offsetY = 0;
  adjustScaleToFit();
  drawRooms(roomsData);
}

function applyRoomHighlights(currentLocation, destination) {
  const current = currentLocation ? currentLocation.toLowerCase() : null;
  const dest = destination ? destination.toLowerCase() : null;

  roomsData.forEach(room => {
    room.highlightColor = "grey"; // Default color
  });

  let startPoint = null;
  let endPoint = null;
  let startRoomName = null;
  let endRoomName = null;

  let startNode = null;
  let endNode = null;

  roomsData.forEach(room => {
    const roomNameLower = room.name.toLowerCase();
    if (current && roomNameLower === current) {
      room.highlightColor = "green";
      startPoint = findClosestHallwayPoint(room);
      startRoomName = room.name;
      console.log("Start Room:", room.name, "Closest Hallway Point:", startPoint);
    }
    if (dest && roomNameLower === dest) {
      room.highlightColor = "lightcoral";
      endPoint = findClosestHallwayPoint(room);
      endRoomName = room.name;
      console.log("End Room:", room.name, "Closest Hallway Point:", endPoint);
    }
  });

  if (startPoint) {
    startNode = findClosestNode(startPoint);
    console.log("Closest Start Node:", startNode);
  }
  if (endPoint) {
    endNode = findClosestNode(endPoint);
    console.log("Closest End Node:", endNode);
  }

  if (startNode && endNode) {
    const path = findPath(startNode.id, endNode.id);
    console.log("Found Path:", path);
    drawPath(path);
  } else {
    // If no start or end room is selected or found, redraw rooms without path
    drawRooms(roomsData);
  }
}

function findRoute() {
  const currentLocationInput = document.getElementById("currentLocation").value.trim();
  const finalDestinationInput = document.getElementById("finalDestination").value.trim();

  if (!currentLocationInput && !finalDestinationInput) {
    roomsData.forEach(room => {
      room.highlightColor = room.color;
    });
    drawRooms(roomsData);
    return;
  }

  applyRoomHighlights(currentLocationInput, finalDestinationInput);
}