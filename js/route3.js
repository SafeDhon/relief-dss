require([
  "esri/config",
  "esri/geometry/Extent",
  "esri/geometry/Point",
  "esri/Map",
  "esri/views/MapView",
  "esri/Graphic",
  "esri/rest/route",
  "esri/rest/support/RouteParameters",
  "esri/rest/support/FeatureSet",
  "esri/widgets/Sketch/SketchViewModel",
  "esri/layers/GraphicsLayer",
  "esri/widgets/Expand",
  "esri/geometry/support/webMercatorUtils",
  "esri/geometry/geometryEngine",
], function (
  esriConfig,
  Extent,
  Point,
  Map,
  MapView,
  Graphic,
  route,
  RouteParameters,
  FeatureSet,
  SketchViewModel,
  GraphicsLayer,
  Expand,
  webMercatorUtils,
  geometryEngine
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

  // ข้อมูลจุดทั้ง 4 จุด
  // const _points = sessionStorage.getItem("pointsData");
  let stopData = [];
  let cumulativeRouteArray = [];
  let vehicleRouteArray = [];
  let totalBoatDist = 0;
  let totalBoatTimeMin = 0;
  let handledStopIds = new Set();
  let lastBoatLaunchPoint = null;
  let isPlacingAddBoatLaunch = false;
  let launchPointHistory = [];
  let launchPoints = [];
  // if (_points) {
  //   stopData = JSON.parse(_points);
  //   // console.log(stopData);
  // }

  // ดึง query string จาก URL เช่น ?wing=21&data=%5B...%5D
  const params = new URLSearchParams(window.location.search);

  const v = params.get("vehicle");
  const i = params.get("group");
  const r = params.get("ref");
  const lap = Number(i) + 1;

  const vehicleMap = {
    1: "รถบรรทุก",
    2: "รถยูนิม็อก",
    3: "เรือ",
    4: "เฮลิคอปเตอร์",
  };

  const vehicleName = vehicleMap[v] || "ไม่ทราบยานพาหนะ";
  document.title = `${vehicleName} รอบที่ ${lap}`;

  const wing = params.get("wing");

  const wingInfo = wings.find((w) => w.id == wing);

  if (wingInfo) {
    const addressName = wing == "100" ? "โรงเรียนการบิน" : `กองบิน ${wing}`;
    stopData.push({
      address: addressName,
      id: 1,
      lat: wingInfo.latitude,
      long: wingInfo.longitude,
      bags: 0,
      victim: 0,
    });
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
      dropoint: 0,
    });
  });

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

  // สร้าง Map และ MapView (ยังจำเป็นสำหรับการเริ่มต้น API แม้จะไม่ได้แสดงผลแผนที่)
  const map = new Map({
    basemap: "arcgis-navigation",
  });

  const drawnPolylineBarrierLayer = new GraphicsLayer();
  const stopsLayer = new GraphicsLayer();
  const routesLayer = new GraphicsLayer();
  const boatLaunchLineLayer = new GraphicsLayer(); // เส้นทาง (ล่าง)
  const boatLaunchLayer = new GraphicsLayer();     // จุด + เลข (บน)
  map.add(routesLayer);
  map.add(drawnPolylineBarrierLayer);
  map.add(boatLaunchLineLayer);
  map.add(boatLaunchLayer);
  map.add(stopsLayer);

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

  // ดึง geometry ของสิ่งกีดขวาง (polygon WGS84) — ใช้สำหรับตรวจว่าชุมชนอยู่ในพื้นที่น้ำท่วมมั้ย
  function getBarrierGeometries() {
    return drawnPolylineBarrierLayer.graphics
      .toArray()
      .map((g) => webMercatorUtils.webMercatorToGeographic(g.geometry))
      .filter((g) => g?.rings?.length > 0);
  }

  // แปลง polygon เป็น polyline (เส้นขอบ) สำหรับใช้เป็น barrier ใน routing
  // polylineBarriers บล็อกเฉพาะถนนที่ตัดผ่านเส้นขอบ ไม่ติด limit 2000 road segments เหมือน polygonBarriers
  function getBarrierPolylines() {
    return drawnPolylineBarrierLayer.graphics
      .toArray()
      .map((g) => {
        const poly = webMercatorUtils.webMercatorToGeographic(g.geometry);
        if (!poly?.rings?.length) return null;
        return { type: "polyline", paths: poly.rings, spatialReference: { wkid: 4326 } };
      })
      .filter(Boolean);
  }

  // ฟังก์ชันสำหรับคำนวณเส้นทางระหว่างจุด 2 จุด
  async function solveRoute(startPoint, endPoint, useBarriers = true) {
    const stops = [
      new Graphic({
        geometry: {
          type: "point",
          longitude: startPoint.long,
          latitude: startPoint.lat,
        },
      }),
      new Graphic({
        geometry: {
          type: "point",
          longitude: endPoint.long,
          latitude: endPoint.lat,
        },
      }),
    ];

    const barrierGeoms = useBarriers ? getBarrierPolylines() : [];
    const barrierFeatures = barrierGeoms.map((geom) => new Graphic({ geometry: geom, attributes: { BarrierType: 0 } }));

    const routeParams = new RouteParameters({
      stops: new FeatureSet({
        features: stops,
        geometryType: "point",
        spatialReference: { wkid: 4326 },
      }),
      polylineBarriers: new FeatureSet({
        features: barrierFeatures,
        geometryType: "polyline",
        spatialReference: { wkid: 4326 },
      }),
      returnDirections: false,
      impedanceAttribute: "TravelTime",
    });

    try {
      const data = await route.solve(routeUrl, routeParams, {
        apiKey: apiKey,
      });
      const routeResult = data.routeResults[0].route;
      const totalDistance = routeResult.attributes.Total_Kilometers;
      const totalTime = routeResult.attributes.Total_TravelTime; // หน่วยนาที
      return {
        distance: totalDistance ? parseFloat(totalDistance.toFixed(2)) : null,
        time: totalTime ? parseFloat(totalTime.toFixed(3)) : null,
        geometry: routeResult.geometry,
      };
    } catch (error) {
      console.error("solveRoute error:", error?.details ?? error?.message ?? error);
      return { distance: null, time: null };
    }
  }

  // เลือกเส้นทางที่สั้นกว่าระหว่างสองทิศทาง (ไป vs กลับ) แล้วใช้เส้นทางเดียวกันนั้นทั้งไปและกลับ
  // เพราะสถานการณ์น้ำท่วมไม่สนใจเลนซ้าย-ขวา ต้องการแค่เส้นทางที่เร็วที่สุดถึงเป้าหมาย
  function pickBest(routeA, routeB) {
    const dA = routeA?.distance ?? Infinity;
    const dB = routeB?.distance ?? Infinity;
    return dA <= dB ? routeA : routeB;
  }

  function bestBetween(map, idA, idB) {
    return pickBest(map[`${idA}-${idB}`], map[`${idB}-${idA}`]);
  }

  function drawBaseMarker() {
    const base = stopData[0];
    if (!base) return;
    stopsLayer.add(
      new Graphic({
        geometry: { type: "point", longitude: base.long, latitude: base.lat },
        symbol: { type: "simple-marker", color: [0, 128, 0, 1], size: "25px", outline: { color: [255, 255, 255], width: 1 } },
        attributes: { id: base.id },
        popupTemplate: { title: base.address, content: "" },
      })
    );
  }

  // แสดงเฉพาะจุดบนแผนที่ ยังไม่คำนวณเส้นทาง
  function displayMarkersOnly() {
    stopsLayer.removeAll();
    stopData.forEach((stop) => {
      const isBase = stop.id === 1;
      const color = isBase ? [0, 128, 0, 1] : [255, 165, 0, 1];

      stopsLayer.add(
        new Graphic({
          geometry: {
            type: "point",
            longitude: stop.long,
            latitude: stop.lat,
          },
          symbol: {
            type: "simple-marker",
            color: color,
            size: "25px",
            outline: { color: [255, 255, 255], width: 1 },
          },
          attributes: { id: stop.id },
          popupTemplate: {
            title: `${stop.address}`,
            content:
              stop.id !== 1
                ? `<b>ผู้ประสบภัย:</b> ${stop.victim} ราย<br><b>ถุงยังชีพ:</b> ${stop.bags} ถุง`
                : "",
          },
        })
      );
      if (!isBase) {
        stopsLayer.add(
          new Graphic({
            geometry: { type: "point", longitude: stop.long, latitude: stop.lat },
            symbol: { type: "text", text: String(stop.id - 1), color: "white", font: { size: 10, weight: "bold" }, yoffset: -3 },
          })
        );
      }
    });
  }

  function updateCalcButton() {
    const btn = document.getElementById("calcRoute");
    const allAssigned = stopData.filter((s) => s.id !== 1).every((s) => s.dropoint !== 0);
    btn.disabled = !allAssigned;
    btn.style.opacity = allAssigned ? "1" : "0.5";
    btn.style.cursor = allAssigned ? "pointer" : "not-allowed";
  }

  function redrawCommunityMarkers() {
    stopsLayer.removeAll();
    drawBaseMarker();
    stopData.filter((s) => s.id !== 1).forEach((stop) => {
      const color = stop.dropoint !== 0 ? [255, 165, 0, 1] : [211, 47, 47, 1];
      stopsLayer.add(new Graphic({
        geometry: { type: "point", longitude: stop.long, latitude: stop.lat },
        symbol: { type: "simple-marker", color, size: "25px", outline: { color: [255, 255, 255], width: 1 } },
        popupTemplate: {
          title: stop.address,
          content: stop.dropoint !== 0
            ? `<b>ผู้ประสบภัย:</b> ${stop.victim} ราย<br><b>ถุงยังชีพ:</b> ${stop.bags} ถุง<br><b>จัดส่งจากจุดปล่อยเรือ:</b> ${stop.dropoint}`
            : `<b>ผู้ประสบภัย:</b> ${stop.victim} ราย<br><b>ถุงยังชีพ:</b> ${stop.bags} ถุง<br><b style="color:#d32f2f">ยังไม่ได้กำหนดจุดปล่อยเรือ</b>`,
        },
      }));
      stopsLayer.add(new Graphic({
        geometry: { type: "point", longitude: stop.long, latitude: stop.lat },
        symbol: { type: "text", text: String(stop.id - 1), color: "white", font: { size: 10, weight: "bold" }, yoffset: -3 },
      }));
    });
    updateCalcButton();
  }

  // เรียกใช้ฟังก์ชันคำนวณเส้นทางเมื่อ MapView พร้อมใช้งาน
  view.when(function () {
    displayMarkersOnly(); // แสดงแค่จุด ยังไม่คำนวณเส้นทาง
    const expand = new Expand({
      view: view,
      content: document.createElement("div"),
      expanded: false,
    });
    expand.content.id = "routeTableContainer";
    expand.content.style.maxHeight = "70vh";
    expand.content.style.overflowY = "auto";
    view.ui.add(expand, "bottom-left");
  });

  view.ui.add(document.getElementById("buttonDiv4"), "top-trailing");
  view.ui.add(document.getElementById("buttonDiv5"), "top-trailing");
  view.ui.add(document.getElementById("buttonDiv6"), "top-trailing");
  view.ui.add(document.getElementById("buttonDiv8"), "top-trailing");
  view.ui.add(document.getElementById("buttonDiv9"), "top-trailing");
  view.ui.add(document.getElementById("buttonDiv7"), "top-trailing");
view.ui.add(document.getElementById("buttonDiv1"), "bottom-trailing");

  const barrierDefaultSymbol = {
    type: "simple-fill",
    color: [255, 0, 0, 0.3],
    outline: { color: [255, 0, 0, 0.9], width: 2 },
  };
  const barrierSelectedSymbol = {
    type: "simple-fill",
    color: [255, 0, 0, 0.45],
    outline: { color: [255, 255, 0, 1], width: 3 },
  };
  let selectedBarrierGraphic = null;

  const sketchVM = new SketchViewModel({
    view: view,
    layer: drawnPolylineBarrierLayer,
    polygonSymbol: barrierDefaultSymbol,
  });

  document
    .getElementById("drawPolylineBarrier")
    .addEventListener("click", () => {
      sketchVM.create("polygon");
    });

  sketchVM.on("create", (event) => {});

  function deselectBarrierGraphic() {
    if (!selectedBarrierGraphic) return;
    selectedBarrierGraphic.symbol = barrierDefaultSymbol;
    selectedBarrierGraphic = null;
  }

  function selectBarrierGraphic(graphic) {
    if (selectedBarrierGraphic === graphic) return;
    deselectBarrierGraphic();
    selectedBarrierGraphic = graphic;
    graphic.symbol = barrierSelectedSymbol;
  }

  // คลิกที่ polygon สิ่งกีดขวางเพื่อเลือก (ไฮไลต์เหลือง) แล้วกดปุ่ม Delete บนคีย์บอร์ดเพื่อลบ
  view.on("click", async (event) => {
    if (isPlacingBoatLaunch || isPlacingAddBoatLaunch || sketchVM.state === "active") return;

    const hit = await view.hitTest(event, { include: drawnPolylineBarrierLayer });
    const result = hit.results.find((r) => r.graphic && r.graphic.layer === drawnPolylineBarrierLayer);

    if (result) {
      selectBarrierGraphic(result.graphic);
    } else {
      deselectBarrierGraphic();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Delete" || !selectedBarrierGraphic) return;

    drawnPolylineBarrierLayer.remove(selectedBarrierGraphic);
    selectedBarrierGraphic = null;
  });

let isPlacingBoatLaunch = false;
  let boatLaunchPoint = null;
  let boatLaunchCount = 0;

  function getPolylineMidpoint(geom) {
    if (!geom?.paths?.[0]?.length) return null;
    const path = geom.paths[0];
    const mid = path[Math.floor(path.length / 2)];
    return { longitude: mid[0], latitude: mid[1] };
  }

  async function calculateBoatRoutes(launchPt, targetStops, isAdditional = false, launchNum = 1) {
    if (!launchPt || targetStops.length === 0) return;

    // Step 1: ระยะทางจาก/ถึงจุดปล่อยเรือ เลือกทิศที่สั้นกว่าเป็นเส้นทางหลัก
    const launchToStop = {};
    const stopToLaunch = {};
    for (const stop of targetStops) {
      launchToStop[stop.id] = await solveRoute(launchPt, stop, false);
      stopToLaunch[stop.id] = await solveRoute(stop, launchPt, false);
    }

    const bestRoute = {};
    for (const stop of targetStops) {
      const d1 = launchToStop[stop.id]?.distance ?? Infinity;
      const d2 = stopToLaunch[stop.id]?.distance ?? Infinity;
      bestRoute[stop.id] = d1 <= d2 ? launchToStop[stop.id] : stopToLaunch[stop.id];
    }

    // Step 2: แบ่ง okStops (≤5 กม.) และ tooFar (>5 กม.)
    const tooFarIds = new Set(
      targetStops
        .filter((s) => (bestRoute[s.id]?.distance ?? Infinity) > 5)
        .map((s) => s.id)
    );
    const okStops = targetStops.filter((s) => !tooFarIds.has(s.id));

    // วาด marker ทันที
    if (isAdditional) {
      // ลบเฉพาะ marker ของ targetStops เท่านั้น (ไม่แตะ marker จุดปล่อยเรือก่อนหน้า)
      const targetIds = new Set(targetStops.map((s) => s.id));
      stopsLayer.graphics
        .filter((g) => targetIds.has(g.attributes?.stopId))
        .toArray()
        .forEach((g) => stopsLayer.remove(g));
    } else {
      stopsLayer.removeAll();
      drawBaseMarker();
    }

    let okIdx = 0;
    targetStops.forEach((stop) => {
      const isOver = tooFarIds.has(stop.id);
      const priority = stop.id - 1;
      stopsLayer.add(
        new Graphic({
          geometry: { type: "point", longitude: stop.long, latitude: stop.lat },
          attributes: { stopId: stop.id },
          symbol: {
            type: "simple-marker",
            color: isOver ? [211, 47, 47, 1] : [255, 165, 0, 1],
            size: "25px",
            outline: { color: [255, 255, 255], width: 1 },
          },
          popupTemplate: {
            title: stop.address,
            content:
              `<b>ผู้ประสบภัย:</b> ${stop.victim} ราย<br><b>ถุงยังชีพ:</b> ${stop.bags} ถุง` +
              (isOver
                ? `<br><b style="color:#d32f2f">ห่างเกิน 5 กม. — ให้เลือกจุดปล่อยเรือจุดต่อไป</b>`
                : `<br><b>จัดส่งจากจุดปล่อยเรือ:</b> ${launchNum}`),
          },
        })
      );
      stopsLayer.add(
        new Graphic({
          geometry: { type: "point", longitude: stop.long, latitude: stop.lat },
          attributes: { stopId: stop.id },
          symbol: { type: "text", text: String(priority), color: "white", font: { size: 10, weight: "bold" }, yoffset: -3 },
        })
      );
    });

    if (okStops.length === 0) return;

    // บันทึกชุมชนที่จะถูกจัดการในรอบนี้เข้า handledStopIds ทันที พร้อมเก็บว่าจัดส่งจากจุดปล่อยเรือหมายเลขใด
    okStops.forEach((s) => {
      handledStopIds.add(s.id);
      s.launchPoint = launchNum;
    });

    // Step 3: ระยะทางระหว่างชุมชน okStops ทุกคู่ (ทั้งสองทิศทาง)
    const stopToStop = {};
    for (let i = 0; i < okStops.length; i++) {
      for (let j = 0; j < okStops.length; j++) {
        if (i === j) continue;
        const a = okStops[i];
        const b = okStops[j];
        stopToStop[`${a.id}-${b.id}`] = await solveRoute(a, b, false);
      }
    }

    // Step 4: สร้างรายการงานส่ง — แบ่งชุมชนที่ต้องการ >30 ถุงออกเป็นหลาย task
    const tasks = [];
    for (const stop of okStops) {
      let remaining = stop.bags;
      while (remaining > 0) {
        tasks.push({ stop, bags: Math.min(remaining, 30) });
        remaining -= 30;
      }
    }

    // Step 5: วางแผนรอบส่งแบบ Greedy — ตามลำดับความสำคัญ, ≤30 ถุง + ≤10 กม. ต่อรอบ
    const rounds = [];
    let taskIdx = 0;

    while (taskIdx < tasks.length) {
      const roundEntries = [];
      let totalBags = 0;
      let totalDist = 0;
      let lastStop = null;

      while (taskIdx < tasks.length) {
        const task = tasks[taskIdx];
        const stop = task.stop;
        let distToStop, backDist, oldReturn;

        if (!lastStop) {
          distToStop = bestRoute[stop.id]?.distance ?? Infinity;
          backDist = bestRoute[stop.id]?.distance ?? Infinity;
          oldReturn = 0;
        } else {
          distToStop = bestBetween(stopToStop, lastStop.id, stop.id)?.distance ?? Infinity;
          backDist = bestRoute[stop.id]?.distance ?? Infinity;
          oldReturn = bestRoute[lastStop.id]?.distance ?? Infinity;
        }

        // ระยะรวมรอบนี้ = เส้นทางเดิม - ขากลับเก่า + ขาไปจุดใหม่ + ขากลับจุดใหม่
        const newDist = totalDist - oldReturn + distToStop + backDist;
        const newBags = totalBags + task.bags;

        if (newDist <= 10 && newBags <= 30) {
          roundEntries.push({ task, distFromPrev: distToStop });
          totalDist = newDist;
          totalBags = newBags;
          lastStop = stop;
          taskIdx++;
        } else {
          break;
        }
      }

      if (roundEntries.length > 0) {
        rounds.push({ entries: roundEntries, totalDist, totalBags });
      } else {
        taskIdx++;
      }
    }

    // แสดงตารางแผนการเดินทางใน console
    const visitCount = {};
    for (const round of rounds) {
      for (const { task } of round.entries) {
        visitCount[task.stop.id] = (visitCount[task.stop.id] || 0) + 1;
      }
    }

    const planTable = [];
    let seq = 1;
    for (let ri = 0; ri < rounds.length; ri++) {
      const { entries } = rounds[ri];
      let prevName = "จุดปล่อยเรือ";
      let prevStop = null;

      for (const { task, distFromPrev } of entries) {
        const stop = task.stop;
        const destName =
          visitCount[stop.id] > 1
            ? `${stop.address} (รอบที่ ${ri + 1})`
            : stop.address;

        planTable.push({
          ลำดับ: seq++,
          ต้นทาง: prevName,
          ปลายทาง: destName,
          "ระยะทาง (กม.)": parseFloat(distFromPrev.toFixed(2)),
          "ถุงยังชีพ (ถุง)": task.bags,
        });

        prevName = destName;
        prevStop = stop;
      }

      if (prevStop) {
        const retDist = bestRoute[prevStop.id]?.distance ?? null;
        planTable.push({
          ลำดับ: seq++,
          ต้นทาง: prevName,
          ปลายทาง: "จุดปล่อยเรือ",
          "ระยะทาง (กม.)": retDist !== null ? parseFloat(retDist.toFixed(2)) : "Error",
          "ถุงยังชีพ (ถุง)": "-",
        });
      }
    }

    // Step 6: วาดเส้นทาง (แต่ละรอบต่างสี) และ marker พร้อมลำดับ
    if (!isAdditional) {
      routesLayer.removeAll();
      stopsLayer.removeAll();
      drawBaseMarker();
      cumulativeRouteArray = [];
    } else {
      // ลบ marker ชั่วคราว (ส้ม) ของ okStops ก่อนวาดทับด้วยสีรอบ
      const okIds = new Set(okStops.map((s) => s.id));
      stopsLayer.graphics
        .filter((g) => okIds.has(g.attributes?.stopId))
        .toArray()
        .forEach((g) => stopsLayer.remove(g));
    }

    // วาด marker แดงของชุมชนที่ห่างเกิน (เฉพาะ batch นี้)
    targetStops
      .filter((s) => tooFarIds.has(s.id))
      .forEach((stop) => {
        const priority = stop.id - 1;
        stopsLayer.add(
          new Graphic({
            geometry: { type: "point", longitude: stop.long, latitude: stop.lat },
            attributes: { stopId: stop.id },
            symbol: {
              type: "simple-marker",
              color: [211, 47, 47, 1],
              size: "25px",
              outline: { color: [255, 255, 255], width: 1 },
            },
            popupTemplate: {
              title: stop.address,
              content: `<b>ผู้ประสบภัย:</b> ${stop.victim} ราย<br><b>ถุงยังชีพ:</b> ${stop.bags} ถุง<br><b style="color:#d32f2f">ห่างเกิน 5 กม. — ให้เลือกจุดปล่อยเรือจุดต่อไป</b>`,
            },
          })
        );
        stopsLayer.add(
          new Graphic({
            geometry: { type: "point", longitude: stop.long, latitude: stop.lat },
            attributes: { stopId: stop.id },
            symbol: { type: "text", text: String(priority), color: "white", font: { size: 10, weight: "bold" }, yoffset: -3 },
          })
        );
      });

    const boatColor = [255, 152, 0, 1];

    let globalOrder = cumulativeRouteArray.length + 1;

    for (let ri = 0; ri < rounds.length; ri++) {
      const { entries } = rounds[ri];
      const color = boatColor;
      let lastStop = null;
      let isFirstSeg = true;
      let prevName = `จุดปล่อยเรือ ${launchNum}`;

      for (const { task, distFromPrev } of entries) {
        const stop = task.stop;

        // วาดเส้นทางขาไป
        const geom = !lastStop
          ? bestRoute[stop.id]?.geometry
          : bestBetween(stopToStop, lastStop.id, stop.id)?.geometry;
        if (geom) {
          routesLayer.add(
            new Graphic({
              geometry: geom,
              symbol: { type: "simple-line", color, width: 4 },
            })
          );
          isFirstSeg = false;
        }

        const outDist = parseFloat(distFromPrev.toFixed(2));
        totalBoatDist = parseFloat((totalBoatDist + outDist).toFixed(2));

        cumulativeRouteArray.push({
          รอบ: ri + 1,
          ลำดับ: globalOrder,
          ต้นทาง: prevName,
          ปลายทาง: stop.address,
          "ถุงยังชีพที่ขน": task.bags,
          "ระยะทาง (กม.)": outDist,
          "ระยะทางสะสม (กม.)": totalBoatDist,
          dropoint: launchNum,
        });

        prevName = stop.address;

        // วาด marker ชุมชน
        const priority = stop.id - 1;
        stopsLayer.add(
          new Graphic({
            geometry: { type: "point", longitude: stop.long, latitude: stop.lat },
            symbol: {
              type: "simple-marker",
              color,
              size: "25px",
              outline: { color: [255, 255, 255], width: 1 },
            },
            popupTemplate: {
              title: stop.address,
              content: `<b>ผู้ประสบภัย:</b> ${stop.victim} ราย<br><b>ถุงยังชีพ:</b> ${stop.bags} ถุง<br><b>รอบที่:</b> ${ri + 1}`,
            },
          })
        );
        stopsLayer.add(
          new Graphic({
            geometry: { type: "point", longitude: stop.long, latitude: stop.lat },
            symbol: { type: "text", text: String(priority), color: "white", font: { size: 10, weight: "bold" }, yoffset: -3 },
          })
        );

        lastStop = stop;
        globalOrder++;
      }

      // เพิ่ม row ขากลับ + วาดเส้นประ
      if (lastStop) {
        const retDist = bestRoute[lastStop.id]?.distance ?? null;
        if (retDist !== null) {
          totalBoatDist = parseFloat((totalBoatDist + retDist).toFixed(2));
        }
        cumulativeRouteArray.push({
          รอบ: ri + 1,
          ลำดับ: globalOrder,
          ต้นทาง: prevName,
          ปลายทาง: `จุดปล่อยเรือ ${launchNum}`,
          "ถุงยังชีพที่ขน": 0,
          "ระยะทาง (กม.)": retDist !== null ? parseFloat(retDist.toFixed(2)) : "-",
          "ระยะทางสะสม (กม.)": retDist !== null ? totalBoatDist : "-",
          dropoint: launchNum,
        });
        globalOrder++;

        const retGeom = bestRoute[lastStop.id]?.geometry;
        if (retGeom) {
          routesLayer.add(
            new Graphic({
              geometry: retGeom,
              symbol: { type: "simple-line", color, width: 3, style: "dash" },
            })
          );
        }
      }
    }

    // Step 7: แสดงตาราง
    renderExpandTable();

  }

  function formatTime(minutes) {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return `${h}:${String(m).padStart(2, "0")}`;
  }

  function renderExpandTable() {
    const container = document.getElementById("routeTableContainer");
    if (!container) return;
    let html = "";

    if (vehicleRouteArray.length > 0) {
      html += "<p class='route-section-title'>แผนการเดินทางรถ</p>";
      html += "<table id='vehicleTable'><thead><tr>" +
        "<th>ลำดับ</th><th>ต้นทาง</th><th>ปลายทาง</th><th>ระยะทาง รถ (กม.)</th><th>ระยะทางสะสม รถ (กม.)</th><th>เวลาเดินทาง (ชม:นาที)</th><th>เวลาสะสม (ชม:นาที)</th>" +
        "</tr></thead><tbody>";
      vehicleRouteArray.forEach((row, idx) => {
        html += `<tr><td>${idx + 1}</td><td>${row.ต้นทาง}</td><td>${row.ปลายทาง}</td><td>${row["ระยะทาง (กม.)"]}</td><td>${row["ระยะทางสะสม (กม.)"]}</td><td>${row["เวลาเดินทาง (ชม:นาที)"] ?? "-"}</td><td>${row["เวลาสะสม (ชม:นาที)"] ?? "-"}</td></tr>`;
      });
      html += "</tbody></table>";
    }

    if (cumulativeRouteArray.length > 0) {
      html += "<p class='route-section-title'>แผนการเดินทางเรือ</p>";
      html += "<table id='boatTable'><thead><tr>" +
        "<th>ลำดับ</th><th>ต้นทาง</th><th>ปลายทาง</th>" +
        "<th>ถุงยังชีพที่ขน</th><th>ระยะทาง เรือ (กม.)</th><th>ระยะทางสะสม เรือ (กม.)</th><th>เวลาเดินทาง (ชม:นาที)</th><th>เวลาสะสม (ชม:นาที)</th>" +
        "</tr></thead><tbody>";
      cumulativeRouteArray.forEach((row) => {
        html += `<tr><td>${row.ลำดับ}</td><td>${row.ต้นทาง}</td><td>${row.ปลายทาง}</td><td>${row["ถุงยังชีพที่ขน"] || "-"}</td><td>${row["ระยะทาง (กม.)"]}</td><td>${row["ระยะทางสะสม (กม.)"]}</td><td>${row["เวลาเดินทาง (ชม:นาที)"] ?? "-"}</td><td>${row["เวลาสะสม (ชม:นาที)"] ?? "-"}</td></tr>`;
      });
      html += "</tbody></table>";
    }

    container.innerHTML = html;
  }

  async function drawReturnToBaseIfComplete() {
    const allCommunities = stopData.filter((s) => s.id !== 1);
    const allServed = allCommunities.every((s) => handledStopIds.has(s.id));
    if (!allServed || !lastBoatLaunchPoint) return;

    const result = await solveRoute(lastBoatLaunchPoint, stopData[0]);
    if (result?.geometry) {
      boatLaunchLineLayer.add(
        new Graphic({
          geometry: result.geometry,
          symbol: { type: "simple-line", color: [0, 176, 240, 1], width: 5 },
        })
      );
    }

    const prevDist = vehicleRouteArray.reduce((s, r) => s + (parseFloat(r["ระยะทาง (กม.)"]) || 0), 0);
    const rd = result?.distance ?? null;
    vehicleRouteArray.push({
      ต้นทาง: `จุดปล่อยเรือ ${boatLaunchCount}`,
      ปลายทาง: stopData[0].address,
      "ระยะทาง (กม.)": rd !== null ? parseFloat(rd.toFixed(2)) : "-",
      "ระยะทางสะสม (กม.)": rd !== null ? parseFloat((prevDist + rd).toFixed(2)) : "-",
    });
    renderExpandTable();
  }


  function takeSnapshot() {
    return {
      boatLaunchGraphics: boatLaunchLayer.graphics.toArray().slice(),
      boatLaunchLineGraphics: boatLaunchLineLayer.graphics.toArray().slice(),
      routesGraphics: routesLayer.graphics.toArray().slice(),
      stopsGraphics: stopsLayer.graphics.toArray().slice(),
      cumulativeRouteArray: JSON.parse(JSON.stringify(cumulativeRouteArray)),
      vehicleRouteArray: JSON.parse(JSON.stringify(vehicleRouteArray)),
      handledStopIds: new Set(handledStopIds),
      totalBoatDist,
      totalBoatTimeMin,
      boatLaunchCount,
      lastBoatLaunchPoint: lastBoatLaunchPoint ? { ...lastBoatLaunchPoint } : null,
      boatLaunchPoint: boatLaunchPoint ? { ...boatLaunchPoint } : null,
    };
  }

  // ===== Dialog เลือกชุมชนที่จุดปล่อยเรือนี้จะไปส่ง =====
  let communityModalOverlay = null;
  let communityModalListEl = null;
  let communityModalResolve = null;

  function ensureCommunityModal() {
    if (communityModalOverlay) return;

    communityModalOverlay = document.createElement("div");
    communityModalOverlay.className = "boatModalOverlay";

    const box = document.createElement("div");
    box.className = "boatModalBox";

    const title = document.createElement("h3");
    title.className = "boatModalTitle";
    title.textContent = "เลือกชุมชนที่จุดปล่อยเรือนี้จะไปส่ง";

    communityModalListEl = document.createElement("div");
    communityModalListEl.className = "boatModalList";

    const actions = document.createElement("div");
    actions.className = "boatModalActions";

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "boatModalCancelBtn";
    cancelBtn.textContent = "ยกเลิก";
    cancelBtn.addEventListener("click", () => {
      communityModalOverlay.classList.remove("active");
      if (communityModalResolve) communityModalResolve(null);
    });

    const confirmBtn = document.createElement("button");
    confirmBtn.type = "button";
    confirmBtn.className = "boatModalConfirmBtn";
    confirmBtn.textContent = "ยืนยัน";
    confirmBtn.addEventListener("click", () => {
      const checked = communityModalListEl.querySelectorAll("input[type='checkbox']:checked:not(:disabled)");
      if (checked.length === 0) {
        alert("กรุณาเลือกอย่างน้อย 1 ชุมชน");
        return;
      }
      const selectedIds = Array.from(checked).map((cb) => Number(cb.value));
      communityModalOverlay.classList.remove("active");
      if (communityModalResolve) communityModalResolve(selectedIds);
    });

    actions.append(cancelBtn, confirmBtn);
    box.append(title, communityModalListEl, actions);
    communityModalOverlay.appendChild(box);
    document.body.appendChild(communityModalOverlay);
  }

  // แสดง dialog รายชื่อชุมชนทั้งหมดพร้อมลำดับและ checkbox ให้เลือกว่าจุดปล่อยเรือนี้จะไปส่งชุมชนใดบ้าง
  // ชุมชนที่ถูกจัดส่งไปแล้ว (handledIds) จะขึ้นติ๊กไว้แต่เป็นสีเทากดไม่ได้ ส่วนที่เหลือ default ไม่ติ๊ก
  // คืนค่า array ของชุมชนที่เลือกใหม่ หรือ null ถ้ากดยกเลิก
  function askCommunitySelection(allCommunities, handledIds) {
    ensureCommunityModal();
    communityModalListEl.innerHTML = "";

    allCommunities.forEach((stop) => {
      const isHandled = stop.dropoint !== 0;

      const row = document.createElement("label");
      row.className = "boatModalItem" + (isHandled ? " boatModalItemDisabled" : "");

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = String(stop.id);
      checkbox.checked = isHandled;
      checkbox.disabled = isHandled;

      const text = document.createElement("span");
      text.textContent = `${stop.id - 1}. ${stop.address}` + (isHandled && stop.launchPoint ? ` (จุดปล่อยเรือ ${stop.launchPoint})` : "");

      row.append(checkbox, text);
      communityModalListEl.appendChild(row);
    });

    communityModalOverlay.classList.add("active");

    return new Promise((resolve) => {
      communityModalResolve = (selectedIds) => {
        resolve(selectedIds ? allCommunities.filter((s) => selectedIds.includes(s.id)) : null);
      };
    });
  }

  view.on("click", async (event) => {
    const placingFirst = isPlacingBoatLaunch;
    const placingAdd = isPlacingAddBoatLaunch;
    if (!placingFirst && !placingAdd) return;

    // เช็คซ้ำ ณ ตอนวางจุดจริง เผื่อสิ่งกีดขวางถูกลบ/แก้ไขไปหลังจากกดปุ่มแล้ว
    if (!allCommunitiesCoveredByBarriers()) {
      alert("กรุณาวาดสิ่งกีดขวางให้ครอบคลุมทุกชุมชน");
      isPlacingBoatLaunch = false;
      isPlacingAddBoatLaunch = false;
      view.container.style.cursor = "default";
      document.getElementById("addBoatLaunchPoint").textContent = "เพิ่มจุดปล่อยเรือ";
      document.getElementById("addBoatLaunchPoint").style.backgroundColor = "#00b0f0";
      return;
    }

    const newPoint = {
      id: "boat",
      address: placingFirst ? "จุดปล่อยเรือ" : `จุดปล่อยเรือ ${2}`,
      lat: event.mapPoint.latitude,
      long: event.mapPoint.longitude,
    };

    // ให้ผู้ใช้เลือกว่าจุดปล่อยเรือนี้จะไปส่งชุมชนใดบ้าง — แสดงทุกชุมชน
    // ชุมชนที่จุดก่อนหน้าจัดส่งไปแล้วจะขึ้นติ๊กไว้แต่กดไม่ได้ (handledStopIds)
    const allCommunities = stopData.filter((s) => s.id !== 1);
    const hasRemaining = allCommunities.some((s) => s.dropoint === 0);

    if (!hasRemaining) {
      alert("ทุกชุมชนถูกจัดส่งครบแล้ว ไม่มีชุมชนให้เลือกเพิ่ม");
      isPlacingBoatLaunch = false;
      isPlacingAddBoatLaunch = false;
      view.container.style.cursor = "default";
      document.getElementById("addBoatLaunchPoint").textContent = "เพิ่มจุดปล่อยเรือ";
      document.getElementById("addBoatLaunchPoint").style.backgroundColor = "#00b0f0";
      return;
    }

    const selectedCommunities = await askCommunitySelection(allCommunities, handledStopIds);

    // ออกจากโหมดวางจุดเสมอ ไม่ว่าจะกดยืนยันหรือยกเลิก
    isPlacingBoatLaunch = false;
    isPlacingAddBoatLaunch = false;
    view.container.style.cursor = "default";
    document.getElementById("addBoatLaunchPoint").textContent = "เพิ่มจุดปล่อยเรือ";
    document.getElementById("addBoatLaunchPoint").style.backgroundColor = "#00b0f0";

    if (!selectedCommunities) return; // กดยกเลิก — ไม่วางจุดปล่อยเรือ

    // บันทึก snapshot ก่อนทำการเปลี่ยนแปลงใด ๆ
    launchPointHistory.push(takeSnapshot());

    if (placingFirst) {
      // รีเซ็ตสถานะทั้งหมด
      boatLaunchLayer.removeAll();
      boatLaunchLineLayer.removeAll();
      routesLayer.removeAll();
      stopsLayer.removeAll();
      cumulativeRouteArray = [];
      vehicleRouteArray = [];
      totalBoatDist = 0;
      totalBoatTimeMin = 0;
      handledStopIds = new Set();
      launchPoints = [];
      stopData.forEach((s) => { s.dropoint = 0; });

      boatLaunchPoint = newPoint;
      lastBoatLaunchPoint = newPoint;
      boatLaunchCount = 1;
      launchPoints.push({ num: boatLaunchCount, lat: newPoint.lat, long: newPoint.long });

      boatLaunchLayer.add(
        new Graphic({
          geometry: event.mapPoint,
          symbol: { type: "simple-marker", color: [0, 176, 240, 1], size: "25px", style: "diamond", outline: { color: [255, 255, 255], width: 2 } },
          popupTemplate: { title: "จุดปล่อยเรือ", content: `ละติจูด: ${event.mapPoint.latitude.toFixed(5)}<br>ลองจิจูด: ${event.mapPoint.longitude.toFixed(5)}` },
        })
      );
      boatLaunchLayer.add(
        new Graphic({
          geometry: event.mapPoint,
          symbol: { type: "text", text: String(boatLaunchCount), color: "white", font: { size: 10, weight: "bold" }, yoffset: -3 },
        })
      );

      selectedCommunities.forEach((s) => { s.dropoint = boatLaunchCount; });
      redrawCommunityMarkers();

    } else {
      // เพิ่มจุดปล่อยเรือ — วาดเส้นแดงจากจุดก่อนหน้ามายังจุดใหม่
      boatLaunchCount++;
      launchPoints.push({ num: boatLaunchCount, lat: newPoint.lat, long: newPoint.long });
      boatLaunchLayer.add(
        new Graphic({
          geometry: event.mapPoint,
          symbol: { type: "simple-marker", color: [0, 176, 240, 1], size: "25px", style: "diamond", outline: { color: [255, 255, 255], width: 2 } },
          popupTemplate: { title: "จุดปล่อยเรือเพิ่มเติม", content: `ละติจูด: ${event.mapPoint.latitude.toFixed(5)}<br>ลองจิจูด: ${event.mapPoint.longitude.toFixed(5)}` },
        })
      );
      boatLaunchLayer.add(
        new Graphic({
          geometry: event.mapPoint,
          symbol: { type: "text", text: String(boatLaunchCount), color: "white", font: { size: 10, weight: "bold" }, yoffset: -3 },
        })
      );

      lastBoatLaunchPoint = newPoint;

      selectedCommunities.forEach((s) => { s.dropoint = boatLaunchCount; });
      redrawCommunityMarkers();
    }
  });

  // ตรวจว่าชุมชนทุกจุด (ยกเว้นฐาน) อยู่ในพื้นที่สีแดงของ polygon สิ่งกีดขวางอย่างน้อยหนึ่งรูป
  function allCommunitiesCoveredByBarriers() {
    const communities = stopData.filter((s) => s.id !== 1);
    const barrierGeoms = getBarrierGeometries();

    if (communities.length === 0 || barrierGeoms.length === 0) return false;

    const result = communities.every((c) => {
      const pt = new Point({ longitude: c.long, latitude: c.lat, spatialReference: { wkid: 4326 } });
      return barrierGeoms.some((poly) => {
        try { return geometryEngine.contains(poly, pt); } catch (e) { return false; }
      });
    });

    return result;
  }

  document.getElementById("addBoatLaunchPoint").addEventListener("click", () => {
    if (!isPlacingAddBoatLaunch && !allCommunitiesCoveredByBarriers()) {
      alert("กรุณาวาดสิ่งกีดขวางให้ครอบคลุมทุกชุมชน");
      return;
    }

    isPlacingAddBoatLaunch = !isPlacingAddBoatLaunch;
    const btn = document.getElementById("addBoatLaunchPoint");
    if (isPlacingAddBoatLaunch) {
      btn.textContent = "กำลังเลือกจุด... (คลิกเพื่อยกเลิก)";
      btn.style.backgroundColor = "#0088bb";
      view.container.style.cursor = "crosshair";
      isPlacingBoatLaunch = false;
    } else {
      btn.textContent = "เพิ่มจุดปล่อยเรือ";
      btn.style.backgroundColor = "#00b0f0";
      view.container.style.cursor = "default";
    }
  });

  document.getElementById("resetBoatLaunchPoint").addEventListener("click", () => {
    boatLaunchLayer.removeAll();
    boatLaunchLineLayer.removeAll();
    routesLayer.removeAll();
    cumulativeRouteArray = [];
    vehicleRouteArray = [];
    totalBoatDist = 0;
    totalBoatTimeMin = 0;
    handledStopIds = new Set();
    boatLaunchCount = 0;
    boatLaunchPoint = null;
    lastBoatLaunchPoint = null;
    isPlacingBoatLaunch = false;
    isPlacingAddBoatLaunch = false;
    launchPointHistory = [];
    launchPoints = [];
    stopData.forEach((s) => { s.dropoint = 0; s.launchPoint = undefined; });
    document.getElementById("addBoatLaunchPoint").textContent = "เพิ่มจุดปล่อยเรือ";
    document.getElementById("addBoatLaunchPoint").style.backgroundColor = "#00b0f0";
    view.container.style.cursor = "default";
    displayMarkersOnly();
    updateCalcButton();
  });

  function getPermutations(arr) {
    const result = [];
    function permute(a, l, r) {
      if (l === r) { result.push([...a]); return; }
      for (let i = l; i <= r; i++) {
        [a[l], a[i]] = [a[i], a[l]];
        permute(a, l + 1, r);
        [a[l], a[i]] = [a[i], a[l]];
      }
    }
    permute([...arr], 0, arr.length - 1);
    return result;
  }

  document.getElementById("calcRoute").addEventListener("click", async () => {
    const base = stopData[0];
    const allNodes = [
      { label: base.address, lat: base.lat, long: base.long },
      ...launchPoints.map((lp) => ({ label: `จุดปล่อยเรือ ${lp.num}`, lat: lp.lat, long: lp.long })),
    ];

    if (allNodes.length < 2) return;

    // ===== เส้นทางรถ: base → จุดปล่อยเรือทั้งหมด → base (TSP) =====
    const vehPair = {};
    for (let i = 0; i < allNodes.length; i++) {
      for (let j = 0; j < allNodes.length; j++) {
        if (i === j) continue;
        vehPair[`${i}-${j}`] = await solveRoute(allNodes[i], allNodes[j], true);
      }
    }

    const lpIdxs = launchPoints.map((_, i) => i + 1);
    const vehPerms = getPermutations(lpIdxs);
    let bestVehDist = Infinity;
    let bestVehOrder = null;

    for (const perm of vehPerms) {
      const fullRoute = [0, ...perm, 0];
      let total = 0;
      let valid = true;
      for (let i = 0; i < fullRoute.length - 1; i++) {
        const d = vehPair[`${fullRoute[i]}-${fullRoute[i + 1]}`]?.distance;
        if (d == null) { valid = false; break; }
        total += d;
      }
      if (valid && total < bestVehDist) { bestVehDist = total; bestVehOrder = fullRoute; }
    }

    boatLaunchLineLayer.removeAll();
    vehicleRouteArray = [];

    if (bestVehOrder) {
      const vehicleSpeed = 80;
      // เวลาถ่ายของขึ้นเรือที่จุดปล่อยเรือ (ไม่ใช่เวลาถ่ายของปกติของรถ) จึงใช้ 5 นาทีเท่ากับรอบขนของของเรือ
      const vehUnloadMin = 5;
      let cumDist = 0;
      let cumVehTimeMin = 0;
      for (let i = 0; i < bestVehOrder.length - 1; i++) {
        const from = allNodes[bestVehOrder[i]];
        const to = allNodes[bestVehOrder[i + 1]];
        const result = vehPair[`${bestVehOrder[i]}-${bestVehOrder[i + 1]}`];
        const d = result?.distance ?? 0;
        cumDist = parseFloat((cumDist + d).toFixed(2));
        if (result?.geometry) {
          boatLaunchLineLayer.add(new Graphic({
            geometry: result.geometry,
            symbol: { type: "simple-line", color: [0, 176, 240, 1], width: 5 },
          }));
        }
        const isBaseReturn = bestVehOrder[i + 1] === 0;
        const segVehMin = (d / vehicleSpeed) * 60 + (isBaseReturn ? 0 : vehUnloadMin);
        cumVehTimeMin += segVehMin;
        vehicleRouteArray.push({
          ต้นทาง: from.label,
          ปลายทาง: to.label,
          "ระยะทาง (กม.)": d,
          "ระยะทางสะสม (กม.)": cumDist,
          "เวลาเดินทาง (ชม:นาที)": formatTime(segVehMin),
          "เวลาสะสม (ชม:นาที)": formatTime(cumVehTimeMin),
        });
      }
    }

    // ===== เส้นทางเรือ: จุดปล่อยเรือ → ชุมชน (TSP ต่อรอบ, max 30 ถุง/รอบ) =====
    cumulativeRouteArray = [];
    routesLayer.removeAll();
    totalBoatDist = 0;
    totalBoatTimeMin = 0;
    let globalOrder = 1;
    const boatColor = [255, 152, 0, 1];

    // เรียงลำดับ LP ตามเส้นทางรถที่คำนวณได้ (bestVehOrder ยกเว้น base ต้นและปลาย)
    const orderedLPs = bestVehOrder
      ? bestVehOrder.slice(1, -1).map(idx => launchPoints[idx - 1])
      : launchPoints;

    for (const lp of orderedLPs) {
      const lpPoint = { lat: lp.lat, long: lp.long };
      const lpCommunities = stopData.filter(s => s.id !== 1 && s.dropoint === lp.num);
      if (lpCommunities.length === 0) continue;

      // คำนวณระยะทางทุกคู่สำหรับ LP นี้
      const lpToC = {}, cToLP = {}, cToC = {};
      for (const c of lpCommunities) {
        lpToC[c.id] = await solveRoute(lpPoint, c, false);
        cToLP[c.id] = await solveRoute(c, lpPoint, false);
      }
      for (let i = 0; i < lpCommunities.length; i++) {
        for (let j = 0; j < lpCommunities.length; j++) {
          if (i === j) continue;
          const a = lpCommunities[i], b = lpCommunities[j];
          cToC[`${a.id}-${b.id}`] = await solveRoute(a, b, false);
        }
      }

      // ใช้เส้นทางที่สั้นกว่าเสมอ ไม่ว่าจะเป็นขาไปหรือขากลับระหว่างจุดปล่อยเรือกับชุมชนนั้น
      const bestLpC = {};
      for (const c of lpCommunities) {
        bestLpC[c.id] = pickBest(lpToC[c.id], cToLP[c.id]);
      }

      // วางแผนรอบส่ง
      const remaining = {};
      lpCommunities.forEach(c => remaining[c.id] = c.bags);
      let tripNum = 1;

      while (lpCommunities.some(c => remaining[c.id] > 0)) {
        const pending = lpCommunities.filter(c => remaining[c.id] > 0);
        const tripPerms = getPermutations(pending.map((_, i) => i));

        let bestTripDist = Infinity;
        let bestTripStops = null;

        for (const perm of tripPerms) {
          const ordered = perm.map(i => pending[i]);
          const tripStops = [];
          let capacity = 30;

          // simulate: เติมถุงตามลำดับ perm จนเต็มหรือหมด
          for (const c of ordered) {
            if (capacity <= 0) break;
            const bags = Math.min(remaining[c.id], capacity);
            tripStops.push({ community: c, bags });
            capacity -= bags;
          }
          if (tripStops.length === 0) continue;

          // คำนวณระยะทางรวมของ trip นี้
          let dist = bestLpC[tripStops[0].community.id]?.distance ?? Infinity;
          for (let k = 1; k < tripStops.length; k++) {
            const prev = tripStops[k - 1].community, curr = tripStops[k].community;
            dist += bestBetween(cToC, prev.id, curr.id)?.distance ?? Infinity;
          }
          dist += bestLpC[tripStops[tripStops.length - 1].community.id]?.distance ?? Infinity;

          if (dist < bestTripDist) { bestTripDist = dist; bestTripStops = tripStops; }
        }

        if (!bestTripStops) break;

        // อัปเดต remaining
        bestTripStops.forEach(({ community, bags }) => { remaining[community.id] -= bags; });

        // วาดเส้นทาง + บันทึก cumulativeRouteArray
        let prevName = `จุดปล่อยเรือ ${lp.num}`;
        for (let k = 0; k < bestTripStops.length; k++) {
          const { community, bags } = bestTripStops[k];
          const routeResult = k === 0
            ? bestLpC[community.id]
            : bestBetween(cToC, bestTripStops[k - 1].community.id, community.id);
          const d = routeResult?.distance ?? 0;
          totalBoatDist = parseFloat((totalBoatDist + d).toFixed(2));
          const segBoatMin = (d / 20) * 60 + 5;
          totalBoatTimeMin += segBoatMin;
          if (routeResult?.geometry) {
            routesLayer.add(new Graphic({
              geometry: routeResult.geometry,
              symbol: { type: "simple-line", color: boatColor, width: 4 },
            }));
          }
          cumulativeRouteArray.push({
            รอบ: tripNum,
            ลำดับ: globalOrder++,
            ต้นทาง: prevName,
            ปลายทาง: community.address,
            "ถุงยังชีพที่ขน": bags,
            "ระยะทาง (กม.)": parseFloat(d.toFixed(2)),
            "ระยะทางสะสม (กม.)": totalBoatDist,
            "เวลาเดินทาง (ชม:นาที)": formatTime(segBoatMin),
            "เวลาสะสม (ชม:นาที)": formatTime(totalBoatTimeMin),
            dropoint: lp.num,
          });
          prevName = community.address;
        }

        // ขากลับ LP
        const lastC = bestTripStops[bestTripStops.length - 1].community;
        const retResult = bestLpC[lastC.id];
        const retDist = retResult?.distance ?? 0;
        totalBoatDist = parseFloat((totalBoatDist + retDist).toFixed(2));
        // ถ้ายังมีชุมชนเหลือรอส่งที่ LP นี้ = ต้องขนถุงยังชีพชุดใหม่ลงเรืออีกรอบ +5 นาที
        // ถ้าของหมดแล้ว (จบรอบสุดท้าย) = ไม่มีของให้ขนต่อ ไม่บวก
        const hasNextTrip = lpCommunities.some(c => remaining[c.id] > 0);
        const segRetMin = (retDist / 20) * 60 + (hasNextTrip ? 5 : 0);
        totalBoatTimeMin += segRetMin;
        if (retResult?.geometry) {
          routesLayer.add(new Graphic({
            geometry: retResult.geometry,
            symbol: { type: "simple-line", color: boatColor, width: 3, style: "dash" },
          }));
        }
        cumulativeRouteArray.push({
          รอบ: tripNum,
          ลำดับ: globalOrder++,
          ต้นทาง: prevName,
          ปลายทาง: `จุดปล่อยเรือ ${lp.num}`,
          "ถุงยังชีพที่ขน": 0,
          "ระยะทาง (กม.)": parseFloat(retDist.toFixed(2)),
          "ระยะทางสะสม (กม.)": totalBoatDist,
          "เวลาเดินทาง (ชม:นาที)": formatTime(segRetMin),
          "เวลาสะสม (ชม:นาที)": formatTime(totalBoatTimeMin),
          dropoint: lp.num,
        });
        tripNum++;
      }
    }

    renderExpandTable();
  });

  document.getElementById("saveRoute").addEventListener("click", async () => {
    const allCommunities = stopData.filter((s) => s.id !== 1);
    const allServed =
      allCommunities.length > 0 &&
      allCommunities.every((s) => s.dropoint !== 0) &&
      cumulativeRouteArray.length > 0;
    if (!allServed) {
      alert("กรุณาสร้างเส้นทางการจัดส่งให้ครบทุกชุมชน");
      return;
    }

    try {
      let seq = 1;
      let cumTotal = 0;
      const saveArray = [];

      vehicleRouteArray.forEach((row) => {
        const dist = parseFloat(row["ระยะทาง (กม.)"]) || 0;
        cumTotal = parseFloat((cumTotal + dist).toFixed(2));
        saveArray.push({
          ลำดับ: seq++,
          ต้นทาง: row.ต้นทาง,
          ปลายทาง: row.ปลายทาง,
          "ระยะทาง (กม.)": row["ระยะทาง (กม.)"],
          "ระยะทางสะสม (กม.)": cumTotal,
          "เวลาเดินทาง (ชม:นาที)": row["เวลาเดินทาง (ชม:นาที)"] ?? "-",
          "เวลาสะสม (ชม:นาที)": row["เวลาสะสม (ชม:นาที)"] ?? "-",
          จัดส่ง: 0,
          ถุงยังชีพ: 0,
          ขนโดย: 0,
          dropoint: 0,
        });
      });

      cumulativeRouteArray.forEach((row) => {
        const dist = parseFloat(row["ระยะทาง (กม.)"]) || 0;
        cumTotal = parseFloat((cumTotal + dist).toFixed(2));
        saveArray.push({
          ลำดับ: seq++,
          ต้นทาง: row.ต้นทาง,
          ปลายทาง: row.ปลายทาง,
          "ระยะทาง (กม.)": row["ระยะทาง (กม.)"],
          "ระยะทางสะสม (กม.)": cumTotal,
          "เวลาเดินทาง (ชม:นาที)": row["เวลาเดินทาง (ชม:นาที)"] ?? "-",
          "เวลาสะสม (ชม:นาที)": row["เวลาสะสม (ชม:นาที)"] ?? "-",
          จัดส่ง: 0,
          ถุงยังชีพ: row["ถุงยังชีพที่ขน"] ?? 0,
          ขนโดย: 1,
          dropoint: row.dropoint ?? 0,
        });
      });

      // ✅ ไปที่ collection rescueData > doc(r) > subcollection checkList > doc(v)
      const docRef = db
        .collection("rescueData")
        .doc(r)
        .collection("checkList")
        .doc(v);

      await docRef.set(
        {
          [i]: saveArray,
        },
        { merge: true } // ไม่ overwrite field อื่น
      );

      alert("บันทึกแล้ว");
      window.close();
    } catch (error) {
    }
  });
});

