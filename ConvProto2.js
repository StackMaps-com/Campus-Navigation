/// <reference types="leaflet" />

// const { bounds, bounds } = require("leaflet");

// const { polygon } = require("leaflet"); 

// const poly = [[162100,191000],
// [162100,181000],
// [156000,181000],
// [156000,173000], 
// [162000,173000],
// [162000,171000],
// [179000,171000],
// [179000,171000],
// [179000,181000], 
// [174000,181000], 
// [174000,191000]];

var map = L.map('map', {
    crs: L.CRS.Simple,
    minZoom: -100,
    maxZoom: 5
});

async function loadMapData() {
    try {
        const response = await fetch("new.json");
        const json = await response.json();

        const rooms = json.rooms || [];
        const nodes = json.nodes || [];
        const edges = json.edges || [];
        drawRooms(rooms);
        findPoint(rooms, nodes, edges)
        console.log("rooms :", rooms);
        console.log("nodes ;", nodes);
        console.log("edges :", edges);
        return { rooms, nodes, edges };
    } catch (err) {
        console.error("Failed to load JSON : ", err);
    }
}

loadMapData();

// var room = L.polygon(poly,{color : 'green'}).addTo(map);
// const bounds = room.getBounds();
// map.fitBounds(bounds);

// map.whenReady(() => {
//     const bounds = room.getBounds(); 
//     console.log(bounds)
//     map.fitBounds("polygon points: ", bounds);
//   });

function drawRooms(rooms) {
    const allpoints = [];

    rooms.forEach((room) => {
        const converted = room.coordinates.map((point) => [point.x, point.y]);
        //   console.log(`Room: ${room.name}`, converted);
        allpoints.push(...converted);
        const polygon = L.polygon(converted, { color: 'green', weight: 2 }).addTo(map);
        polygon.bindPopup(room.name || "Unnamed Room");
    });

    // Also log all points
    console.log("All points combined:", allpoints);
    if (allpoints.length) {
        const bounds = L.latLngBounds(allpoints)
        map.fitBounds(bounds); // to get bounds of map of flattened array
    }
}

//function to find cetroid and parlell point on path;

function findPoint(rooms, nodes, edges) {
    let source = "A-202";
    let dest = "C - 214";
    const sRoom = rooms.find((room) => { return room.name === source });
    const dRoom = rooms.find((room) => { return room.name === dest });
    console.log(sRoom, dRoom)
    if (!sRoom || !dRoom) {
        console.log("Source or Destination not found!");
        return;
    }

    const centroid1 = sRoom.coordinates.reduce((acc, point) => {
        acc.x += point.x;
        acc.y += point.y;
        return acc;
    }, { x: 0, y: 0 });
    centroid1.x /= sRoom.coordinates.length;
    centroid1.y /= sRoom.coordinates.length;
    console.log(centroid1.x, centroid1.y)

    const centroid2 = dRoom.coordinates.reduce((acc, point) => {
        acc.x += point.x;
        acc.y += point.y;
        return acc;
    }, { x: 0, y: 0 });
    centroid2.x /= dRoom.coordinates.length;
    centroid2.y /= dRoom.coordinates.length;
    console.log(centroid2.x, centroid2.y)

    L.circleMarker([centroid1.x, centroid1.y], {
        radius: 6,
        color: 'red',
        fillOpacity: 1
    }).addTo(map);

    L.circleMarker([centroid2.x, centroid2.y], {
        radius: 6,
        color: 'blue',
        fillOpacity: 1
    }).addTo(map);

    edges.forEach((edge) => {
        const nodeA = nodes.find(n => n.id === edge.sourceNodeId);
        const nodeB = nodes.find(n => n.id === edge.targetNodeId);
        if (!nodeA || !nodeB) return;
    });

}
