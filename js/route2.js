require([
  "esri/config",
  "esri/geometry/Extent",
  "esri/geometry/Point",
  "esri/Map",
  "esri/views/MapView",
  "esri/Graphic",
  "esri/layers/GraphicsLayer",
  "esri/widgets/Expand",
], function (
  esriConfig,
  Extent,
  Point,
  Map,
  MapView,
  Graphic,
  GraphicsLayer,
  Expand
) {
  // const apiKey =
  // "AAPTxy8BH1VEsoebNVZXo8HurBEwtQ3TZNnChgqbR-VNfayPQ2LL2HzAyWwmz4JkMpHlO8ny01mMiOXu9L4R_5BchZcNTEqcvmJnhFE5OjLaMs0DK0he1Eeil0PyCiqaII0Da7tFc7KKxexFyOzk-ShAp9NzcEJfnylkw0NGQHDAm3prSxAVrG6R_5BchZcNTEqcvmJnhFE5OjLaMs0DK0he1Eeil0PyCiqaII0Da7tFc7KKxexFyOzk-ShAp9NzcEJfnylkw0NGQHDAm3prSxAVrG6RAtu3utx_F8tuzuy74-1yu7UtCF7K6l5AlYIZi3N7XRAA55U9DUzQaLhNsfcE8PGnRW3l64PM0qYgAT1_b6Losegl"; // *** อย่าลืมเปลี่ยนเป็น ArcGIS API Key ของคุณ! ***
  const apiKey =
    "AAPTxy8BH1VEsoebNVZXo8HurKkVHTRC57kXcOyUhu0FRgeHsBnlZmxAL2TXr9hSHt-0qfy83LKeW0vhUYtEKp_Nm3rpKrWvIP4wOZJY_LE6xnmcRPkJK1j3EeHTrp_VDCUexyJK0PEKIDWsn6WAHmuhkWDrtpGqsd5IdKZ48xmh8AKSxiGXgEG2IAywaCGMJNt1HWGxLeP_rlEutsm9HnaIh7WIGoJuMy-FZI0H39ehvDQ.AT1_AeCqLU8e";
  esriConfig.apiKey = apiKey;
  const routeUrl =
    "https://route-api.arcgis.com/arcgis/rest/services/World/Route/NAServer/Route_World";

  const firebaseConfig = {
    apiKey: "AIzaSyB9NIxqa9__0x9JSZplX2PS6ozqyRUPAQQ",
    authDomain: "relief-dss.firebaseapp.com",
    projectId: "relief-dss",
    storageBucket: "relief-dss.firebasestorage.app",
    messagingSenderId: "678196707176",
    appId: "1:678196707176:web:b24a49511e2674f1d1a0dd",
  };

  // Initialize Firebase
  const app = firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore(app);

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

  // const _points = sessionStorage.getItem("pointsData");
  let stopData = [];
  // if (_points) {
  //   stopData = JSON.parse(_points);
  //   console.log(stopData);
  // }

  const params = new URLSearchParams(window.location.search);

  const v = params.get("vehicle");
  const i = params.get("group");
  const r = params.get("ref");
  const lap = Number(i) + 1;
  const vehicleMap = {
    1: "รถบรรทุก",
    2: "รถยูริม็อก",
    3: "เรือ",
    4: "เฮลิคอปเตอร์",
  };

  const vehicleName = vehicleMap[v] || "ไม่ทราบยานพาหนะ";
  document.title = `${vehicleName} รอบที่ ${lap}`;

  // ✅ ดึง wing
  const wing = params.get("wing");

  const wingInfo = wings.find((w) => w.id == wing);

  if (wingInfo) {
    console.log("พิกัดกองบิน:", wingInfo.latitude, wingInfo.longitude);
    const addressName = wing == "100" ? "โรงเรียนการบิน" : `กองบิน ${wing}`;
    stopData.push({
      address: addressName,
      id: 1,
      lat: wingInfo.latitude,
      long: wingInfo.longitude,
      bags: 0,
      victim: 0,
    });
  } else {
    console.warn("ไม่พบข้อมูลกองบิน:", wing);
  }

  // ✅ ดึง data (ต้อง parse กลับจาก JSON string)
  const data = JSON.parse(decodeURIComponent(params.get("data")));

  data.forEach((item, index) => {
    stopData.push({
      id: index + 2, // id เริ่มจาก 2
      address: item.address,
      lat: item.lat,
      long: item.long,
      bags: item.bags,
      victim: item.victim,
    });
  });

  console.log("Wing:", wing);
  console.log("Data:", data);
  console.log(stopData);

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

  const titleInfo = document.createElement("div");
  titleInfo.style.padding = "8px 12px";
  titleInfo.style.background = "rgba(0,0,0,0.5)";
  titleInfo.style.color = "white";
  titleInfo.style.borderRadius = "6px";
  titleInfo.style.fontSize = "14px";
  titleInfo.innerHTML = `จัดส่งโดย ${vehicleName} รอบที่ ${lap}`;

  view.ui.add(titleInfo, "top-left");

  const tableDiv = document.createElement("div"); // สร้าง div
  tableDiv.id = "routeTableContainer"; // ตั้ง id

  const expand = new Expand({
    view: view,
    content: tableDiv, // ใช้ div ที่สร้างเป็น content
    expanded: false,
  });
  view.ui.add(expand, "bottom-left");
  view.ui.add(document.getElementById("buttonDiv1"), "bottom-trailing");

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

  // ---------- สร้าง array ลำดับเส้นทาง (ใช้ address + km) ----------
  const routeIds = minRoute.route.split(" → ").map(Number);

  const vehicleSpeed = { 1: 100, 2: 80, 3: 60, 4: 150 }[Number(v)] ?? 80;
  const unloadMin = { 1: 10, 2: 15, 3: 5, 4: 10 }[Number(v)] ?? 10;

  const routeSteps = [];
  let cumulative = 0;
  let cumulativeTimeMin = 0;

  for (let i = 0; i < routeIds.length - 1; i++) {
    const fromId = routeIds[i];
    const toId = routeIds[i + 1];

    const fromStop = stopData.find((s) => s.id === fromId);
    const toStop = stopData.find((s) => s.id === toId);

    const dist = distanceBetween(fromId, toId); // เมตร
    cumulative += dist;
    const distKm = dist / 1000;
    const travelMin = (distKm / vehicleSpeed) * 60;
    const isReturn = toId === 1;
    const segMin = travelMin + (isReturn ? 0 : unloadMin);
    cumulativeTimeMin += segMin;

    routeSteps.push({
      ลำดับ: i + 1,
      ต้นทาง: fromStop.address,
      ปลายทาง: toStop.address,
      "ระยะทาง (กม.)": distKm.toFixed(2),
      "ระยะทางสะสม (กม.)": (cumulative / 1000).toFixed(2),
      ถุงยังชีพ: toStop.bags ?? 0,
      "เวลาเดินทาง (ชม:นาที)": formatTime(segMin),
      "เวลาสะสม (ชม:นาที)": formatTime(cumulativeTimeMin),
    });
  }

  console.log("📊 Route Steps Table");
  console.table(routeSteps);
  renderRouteTable(routeSteps);

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

  function formatTime(minutes) {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return `${h}:${String(m).padStart(2, "0")}`;
  }

  function renderRouteTable(steps) {
    const container = tableDiv;
    container.innerHTML = "";

    const table = document.createElement("table");
    table.id = "route2Table";

    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    [
      "ลำดับ",
      "ต้นทาง",
      "ปลายทาง",
      "ระยะทาง (กม.)",
      "ระยะทางสะสม (กม.)",
      "ถุงยังชีพ",
      "เวลาเดินทาง (ชม:นาที)",
      "เวลาสะสม (ชม:นาที)",
    ].forEach((text) => {
      const th = document.createElement("th");
      th.innerText = text;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    steps.forEach((step) => {
      const row = document.createElement("tr");
      [
        step.ลำดับ,
        step.ต้นทาง,
        step.ปลายทาง,
        step["ระยะทาง (กม.)"],
        step["ระยะทางสะสม (กม.)"],
        step.ถุงยังชีพ,
        step["เวลาเดินทาง (ชม:นาที)"],
        step["เวลาสะสม (ชม:นาที)"],
      ].forEach((val) => {
        const td = document.createElement("td");
        td.innerText = val;
        row.appendChild(td);
      });
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    container.appendChild(table);
  }
  document.getElementById("saveRoute").addEventListener("click", async () => {
    console.log("Save Route");
    console.log(`Vehicle : ${v} ,Index ${i}`);
    console.log(`Ref ID : ${r}`);

    if (!routeSteps || routeSteps.length === 0) {
      console.warn("❌ ยังไม่มีข้อมูลเส้นทางคำนวณ");
      return;
    }

    try {
      const saveArray = routeSteps.map((o) => ({
        ...o,
        จัดส่ง: 0,
      }));

      // ✅ ไปที่ collection rescueData > doc(r) > subcollection checkList > doc(v)
      const docRef = db
        .collection("rescueData")
        .doc(r)
        .collection("checkList")
        .doc(v);

      // ✅ เซ็ต field ตามชื่อ index i
      await docRef.set(
        {
          [i]: saveArray,
        },
        { merge: true } // ไม่ overwrite field อื่น
      );

      console.log("✅ บันทึกลง Firestore สำเร็จ");

      // ✅ แจ้งเตือนแล้วปิดแท็บ
      alert("บันทึกแล้ว");
      window.close();
    } catch (error) {
      console.error("❌ Error saving to Firestore:", error);
    }
  });
});

