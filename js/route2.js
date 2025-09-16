require([
  "esri/geometry/Extent",
  "esri/geometry/Point",
  "esri/Map",
  "esri/views/MapView",
  "esri/Graphic",
  "esri/layers/GraphicsLayer",
], function (Extent, Point, Map, MapView, Graphic, GraphicsLayer) {
  // const apiKey =
    // "AAPTxy8BH1VEsoebNVZXo8HurBEwtQ3TZNnChgqbR-VNfayPQ2LL2HzAyWwmz4JkMpHlO8ny01mMiOXu9L4R_5BchZcNTEqcvmJnhFE5OjLaMs0DK0he1Eeil0PyCiqaII0Da7tFc7KKxexFyOzk-ShAp9NzcEJfnylkw0NGQHDAm3prSxAVrG6R_5BchZcNTEqcvmJnhFE5OjLaMs0DK0he1Eeil0PyCiqaII0Da7tFc7KKxexFyOzk-ShAp9NzcEJfnylkw0NGQHDAm3prSxAVrG6RAtu3utx_F8tuzuy74-1yu7UtCF7K6l5AlYIZi3N7XRAA55U9DUzQaLhNsfcE8PGnRW3l64PM0qYgAT1_b6Losegl"; // *** อย่าลืมเปลี่ยนเป็น ArcGIS API Key ของคุณ! ***
  const apiKey = "AAPTxy8BH1VEsoebNVZXo8HurKkVHTRC57kXcOyUhu0FRgeHsBnlZmxAL2TXr9hSHt-0qfy83LKeW0vhUYtEKp_Nm3rpKrWvIP4wOZJY_LE6xnmcRPkJK1j3EeHTrp_VDCUexyJK0PEKIDWsn6WAHmuhkWDrtpGqsd5IdKZ48xmh8AKSxiGXgEG2IAywaCGMJNt1HWGxLeP_rlEutsm9HnaIh7WIGoJuMy-FZI0H39ehvDQ.AT1_AeCqLU8e"

  const routeUrl =
    "https://route-api.arcgis.com/arcgis/rest/services/World/Route/NAServer/Route_World";

  //   const stopData = [
  //     {
  //       id: 1,
  //       address: "NKRAFA",
  //       lat: 14.639967668695759,
  //       long: 101.19381875074382,
  //       victim: 0,
  //       bags: 0,
  //     },
  //     {
  //       id: 2,
  //       address: "name 1",
  //       lat: 14.649859507354927,
  //       long: 101.20898396716603,
  //       victim: 300,
  //       bags: 30,
  //     },
  //     {
  //       id: 3,
  //       address: "name 2",
  //       lat: 14.658336688178018,
  //       long: 101.19038522842789,
  //       victim: 220,
  //       bags: 11,
  //     },
  //     {
  //       id: 4,
  //       address: "name 3",
  //       lat: 14.637887339073753,
  //       long: 101.21983319406075,
  //       victim: 100,
  //       bags: 10,
  //     },
  //   ];

  const _points = sessionStorage.getItem("pointsData");
  let stopData = [];
  if (_points) {
    stopData = JSON.parse(_points);
    console.log(stopData);
  }

  const points = stopData.map(
    (p) => new Point({ longitude: p.long, latitude: p.lat })
  );

  // สร้าง Extent จากทุกจุด
  let xmin = points[0].longitude;
  let xmax = points[0].longitude;
  let ymin = points[0].latitude;
  let ymax = points[0].latitude;

  points.forEach((pt) => {
    if (pt.longitude < xmin) xmin = pt.longitude;
    if (pt.longitude > xmax) xmax = pt.longitude;
    if (pt.latitude < ymin) ymin = pt.latitude;
    if (pt.latitude > ymax) ymax = pt.latitude;
  });

  const padding = 0.01;
  const extent = new Extent({
    xmin: xmin - padding,
    ymin: ymin - padding,
    xmax: xmax + padding,
    ymax: ymax + padding,
    spatialReference: { wkid: 4326 },
  });

  const map = new Map({
    basemap: "arcgis-navigation",
  });

  const view = new MapView({
    container: "viewDiv", // div นี้ถูกซ่อนไว้ใน HTML
    map: map,
    extent: extent,
    // center: [
    //   (stopData[0].long + stopData[1].long) / 2,
    //   (stopData[0].lat + stopData[1].lat) / 2,
    // ],
    // zoom: 12,
  });

  // ---------- Haversine ระยะทางหน่วย "เมตร" ----------
  function haversineMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000; // รัศมีโลก (เมตร)
    const toRad = (x) => (x * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // เมตร
  }

  // ---------- Pairwise Distance Table (เมตร, ทศนิยม 2) ----------
  const tableDistances = [];
  for (let i = 0; i < stopData.length; i++) {
    for (let j = i + 1; j < stopData.length; j++) {
      const d = haversineMeters(
        stopData[i].lat,
        stopData[i].long,
        stopData[j].lat,
        stopData[j].long
      ).toFixed(2);

      tableDistances.push({
        from_to: `${stopData[i].id} → ${stopData[j].id}`,
        distance_m: d,
      });
    }
  }
  console.log("📍 Pairwise Distance Table (meters)");
  console.table(tableDistances);

  // ---------- ฟังก์ชันช่วย ----------
  function distanceBetween(id1, id2) {
    const p1 = stopData.find((s) => s.id === id1);
    const p2 = stopData.find((s) => s.id === id2);
    return haversineMeters(p1.lat, p1.long, p2.lat, p2.long); // เมตร
  }

  function permute(arr) {
    if (arr.length <= 1) return [arr];
    const result = [];
    for (let i = 0; i < arr.length; i++) {
      const current = arr[i];
      const remaining = arr.slice(0, i).concat(arr.slice(i + 1));
      for (const p of permute(remaining)) result.push([current, ...p]);
    }
    return result;
  }

  // ---------- คำนวณเส้นทางทั้งหมด (เริ่มและจบที่ 1) ----------
  const otherStops = stopData.filter((s) => s.id !== 1).map((s) => s.id);
  const routes = permute(otherStops);

  const tableRoutes = [];
  routes.forEach((r) => {
    const path = [1, ...r, 1];
    let total = 0;
    for (let i = 0; i < path.length - 1; i++) {
      total += distanceBetween(path[i], path[i + 1]); // เมตร
    }
    tableRoutes.push({
      route: path.join(" → "),
      total_m: total.toFixed(2),
    });
  });

  console.log("🚗 Route Table (start & end at 1) — meters");
  console.table(tableRoutes);

  // ---------- หาค่า route ที่สั้นที่สุด ----------
  let minRoute = tableRoutes[0];
  for (const r of tableRoutes) {
    if (parseFloat(r.total_m) < parseFloat(minRoute.total_m)) {
      minRoute = r;
    }
  }

  console.log("🏆 เส้นทางที่ใช้ระยะทางน้อยที่สุด:");
  console.log(`Route: ${minRoute.route}`);
  console.log(`Total distance (meters): ${minRoute.total_m}`);

  const graphicsLayer = new GraphicsLayer();
  map.add(graphicsLayer);

  const routeIds = minRoute.route.split(" → ").map(Number);

  // ---------- วาดเส้นทางก่อน ----------
  for (let i = 0; i < routeIds.length - 1; i++) {
    const p1 = stopData.find((s) => s.id === routeIds[i]);
    const p2 = stopData.find((s) => s.id === routeIds[i + 1]);

    graphicsLayer.add(
      new Graphic({
        geometry: {
          type: "polyline",
          paths: [
            [
              [p1.long, p1.lat],
              [p2.long, p2.lat],
            ],
          ],
        },
        symbol: {
          type: "simple-line",
          color: [0, 122, 255, 0.8],
          width: 4,
        },
      })
    );
  }

  routeIds.forEach((id, index) => {
    const s = stopData.find((p) => p.id === id);

    const pointGraphic = new Graphic({
      geometry: { type: "point", longitude: s.long, latitude: s.lat },
      symbol: {
        type: "simple-marker",
        color: id === 1 ? [0, 128, 0, 1] : [255, 165, 0, 1],
        size: "25px",
        outline: { color: [255, 255, 255], width: 1 },
      },
      popupTemplate: {
        title: `${s.address}`,
        content:
          id !== 1
            ? `
        <b>ผู้ประสบภัย:</b> ${s.victim} ราย<br>
        <b>ถุงยังชีพ:</b> ${s.bags} ถุง
      `
            : "",
      },
    });

    graphicsLayer.add(pointGraphic);

    // ตัวเลขบนจุด (ไม่ใช้ popup)
    if (id !== 1) {
      graphicsLayer.add(
        new Graphic({
          geometry: { type: "point", longitude: s.long, latitude: s.lat },
          symbol: {
            type: "text",
            color: "white",
            text: index.toString(),
            xoffset: 0,
            yoffset: -2,
            font: { size: 10, weight: "bold" },
          },
        })
      );
    }
  });
});
