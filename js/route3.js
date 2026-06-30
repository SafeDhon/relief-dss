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
  webMercatorUtils
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
  let handledStopIds = new Set();
  let lastBoatLaunchPoint = null;
  let isPlacingAddBoatLaunch = false;
  let launchPointHistory = [];
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
    2: "รถยูริม็อก",
    3: "เรือ",
    4: "เฮลิคอปเตอร์",
  };

  const vehicleName = vehicleMap[v] || "ไม่ทราบยานพาหนะ";
  document.title = `${vehicleName} รอบที่ ${lap}`;

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

  // สร้าง Map และ MapView (ยังจำเป็นสำหรับการเริ่มต้น API แม้จะไม่ได้แสดงผลแผนที่)
  const map = new Map({
    basemap: "arcgis-navigation",
  });

  const customPolylineBarriers = [];
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

    const barrierFeatures = useBarriers
      ? customPolylineBarriers.map((geom) => new Graphic({ geometry: geom, attributes: { Barrier_Type: 0 } }))
      : [];

    console.log(`[solveRoute] from=${startPoint.address ?? startPoint.id} to=${endPoint.address ?? endPoint.id} | useBarriers=${useBarriers} | barriers=${barrierFeatures.length}`);

    const routeParams = new RouteParameters({
      stops: new FeatureSet({
        features: stops,
      }),
      polygonBarriers: new FeatureSet({
        features: barrierFeatures,
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
      console.error(
        `เกิดข้อผิดพลาดในการคำนวณเส้นทางจาก ${startPoint.id} ถึง ${endPoint.id}:`,
        error.message || "ไม่ทราบสาเหตุ"
      );
      return { distance: null, time: null };
    }
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
  view.ui.add(document.getElementById("buttonDiv7"), "top-trailing");
view.ui.add(document.getElementById("buttonDiv1"), "bottom-trailing");

  const sketchVM = new SketchViewModel({
    view: view,
    layer: drawnPolylineBarrierLayer,
    polygonSymbol: {
      type: "simple-fill",
      color: [255, 0, 0, 0.3],
      outline: { color: [255, 0, 0, 0.9], width: 2 },
    },
  });

  document
    .getElementById("drawPolylineBarrier")
    .addEventListener("click", () => {
      sketchVM.create("polygon");
    });

  sketchVM.on("create", (event) => {
    if (event.state === "complete") {
      const geom = event.graphic.geometry;
      // แปลงจาก Web Mercator (102100) → WGS84 (4326) ให้ตรงกับ SR ของ stops ที่ส่งให้ route service
      const geoGeom = webMercatorUtils.webMercatorToGeographic(geom);
      console.log("[Barrier] SR after convert:", geoGeom?.spatialReference?.wkid, "| rings:", geoGeom?.rings?.length);
      if (geoGeom?.rings?.length > 0) {
        customPolylineBarriers.push(geoGeom);
        console.log("[Barrier] stored. total:", customPolylineBarriers.length);
      } else {
        console.warn("[Barrier] geometry ว่าง ไม่ได้เก็บ");
      }
    }
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

    console.log("=== ระยะทางจุดปล่อยเรือ ↔ ชุมชน ===");
    console.table(
      targetStops.map((stop) => ({
        ชุมชน: stop.address,
        "ถุงยังชีพ (ถุง)": stop.bags,
        "ระยะทาง (กม.)": bestRoute[stop.id]?.distance ?? "Error",
      }))
    );

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
              (isOver ? `<br><b style="color:#d32f2f">ห่างเกิน 5 กม. — ให้เลือกจุดปล่อยเรือจุดต่อไป</b>` : ""),
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

    // บันทึกชุมชนที่จะถูกจัดการในรอบนี้เข้า handledStopIds ทันที
    okStops.forEach((s) => handledStopIds.add(s.id));

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
          distToStop = stopToStop[`${lastStop.id}-${stop.id}`]?.distance ?? Infinity;
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

    console.log("=== แผนการเดินทางเรือ ===");
    console.table(planTable);

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
          : stopToStop[`${lastStop.id}-${stop.id}`]?.geometry;
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

    console.log(`=== แผนการส่งเรือ: ${rounds.length} รอบ ===`);
    console.table(cumulativeRouteArray);
  }

  function renderExpandTable() {
    const container = document.getElementById("routeTableContainer");
    if (!container) return;
    let html = "";

    if (vehicleRouteArray.length > 0) {
      html += "<p class='route-section-title'>แผนการเดินทางรถ</p>";
      html += "<table id='vehicleTable'><thead><tr>" +
        "<th>ลำดับ</th><th>ต้นทาง</th><th>ปลายทาง</th><th>ระยะทาง รถ (กม.)</th><th>ระยะทางสะสม รถ (กม.)</th>" +
        "</tr></thead><tbody>";
      vehicleRouteArray.forEach((row, idx) => {
        html += `<tr><td>${idx + 1}</td><td>${row.ต้นทาง}</td><td>${row.ปลายทาง}</td><td>${row["ระยะทาง (กม.)"]}</td><td>${row["ระยะทางสะสม (กม.)"]}</td></tr>`;
      });
      html += "</tbody></table>";
    }

    if (cumulativeRouteArray.length > 0) {
      html += "<p class='route-section-title'>แผนการเดินทางเรือ</p>";
      html += "<table id='boatTable'><thead><tr>" +
        "<th>ลำดับ</th><th>ต้นทาง</th><th>ปลายทาง</th>" +
        "<th>ถุงยังชีพที่ขน</th><th>ระยะทาง เรือ (กม.)</th><th>ระยะทางสะสม เรือ (กม.)</th>" +
        "</tr></thead><tbody>";
      cumulativeRouteArray.forEach((row) => {
        html += `<tr><td>${row.ลำดับ}</td><td>${row.ต้นทาง}</td><td>${row.ปลายทาง}</td><td>${row["ถุงยังชีพที่ขน"] || "-"}</td><td>${row["ระยะทาง (กม.)"]}</td><td>${row["ระยะทางสะสม (กม.)"]}</td></tr>`;
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

  document.getElementById("setBoatLaunchPoint").addEventListener("click", () => {
    isPlacingBoatLaunch = !isPlacingBoatLaunch;
    const btn = document.getElementById("setBoatLaunchPoint");
    if (isPlacingBoatLaunch) {
      btn.textContent = "กำลังเลือกจุด... (คลิกเพื่อยกเลิก)";
      btn.style.backgroundColor = "#0088bb";
      view.container.style.cursor = "crosshair";
    } else {
      btn.textContent = "กำหนดจุดปล่อยเรือ";
      btn.style.backgroundColor = "#00b0f0";
      view.container.style.cursor = "default";
    }
  });

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
      boatLaunchCount,
      lastBoatLaunchPoint: lastBoatLaunchPoint ? { ...lastBoatLaunchPoint } : null,
      boatLaunchPoint: boatLaunchPoint ? { ...boatLaunchPoint } : null,
    };
  }

  document.getElementById("undoBoatLaunch").addEventListener("click", () => {
    if (launchPointHistory.length === 0) return;
    const snap = launchPointHistory.pop();

    boatLaunchLayer.removeAll();
    snap.boatLaunchGraphics.forEach((g) => boatLaunchLayer.add(g));

    boatLaunchLineLayer.removeAll();
    snap.boatLaunchLineGraphics.forEach((g) => boatLaunchLineLayer.add(g));

    routesLayer.removeAll();
    snap.routesGraphics.forEach((g) => routesLayer.add(g));

    stopsLayer.removeAll();
    snap.stopsGraphics.forEach((g) => stopsLayer.add(g));

    cumulativeRouteArray = snap.cumulativeRouteArray;
    vehicleRouteArray = snap.vehicleRouteArray;
    handledStopIds = snap.handledStopIds;
    totalBoatDist = snap.totalBoatDist;
    boatLaunchCount = snap.boatLaunchCount;
    lastBoatLaunchPoint = snap.lastBoatLaunchPoint;
    boatLaunchPoint = snap.boatLaunchPoint;

    renderExpandTable();
  });

  view.on("click", async (event) => {
    const placingFirst = isPlacingBoatLaunch;
    const placingAdd = isPlacingAddBoatLaunch;
    if (!placingFirst && !placingAdd) return;

    // บันทึก snapshot ก่อนทำการเปลี่ยนแปลงใด ๆ
    launchPointHistory.push(takeSnapshot());

    // ออกจากโหมดทันที
    isPlacingBoatLaunch = false;
    isPlacingAddBoatLaunch = false;
    view.container.style.cursor = "default";
    document.getElementById("setBoatLaunchPoint").textContent = "กำหนดจุดปล่อยเรือ";
    document.getElementById("setBoatLaunchPoint").style.backgroundColor = "#00b0f0";
    document.getElementById("addBoatLaunchPoint").textContent = "เพิ่มจุดปล่อยเรือ";
    document.getElementById("addBoatLaunchPoint").style.backgroundColor = "#00b0f0";

    const newPoint = {
      id: "boat",
      address: placingFirst ? "จุดปล่อยเรือ" : `จุดปล่อยเรือ ${2}`,
      lat: event.mapPoint.latitude,
      long: event.mapPoint.longitude,
    };

    if (placingFirst) {
      // รีเซ็ตสถานะทั้งหมด
      boatLaunchLayer.removeAll();
      boatLaunchLineLayer.removeAll();
      routesLayer.removeAll();
      stopsLayer.removeAll();
      cumulativeRouteArray = [];
      vehicleRouteArray = [];
      totalBoatDist = 0;
      handledStopIds = new Set();

      boatLaunchPoint = newPoint;
      lastBoatLaunchPoint = newPoint;
      boatLaunchCount = 1;

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

      const result = await solveRoute(stopData[0], newPoint);
      if (result?.geometry) {
        boatLaunchLineLayer.add(new Graphic({ geometry: result.geometry, symbol: { type: "simple-line", color: [0, 176, 240, 1], width: 5 } }));
      }
      const d1 = result?.distance ?? null;
      vehicleRouteArray.push({
        ต้นทาง: stopData[0].address,
        ปลายทาง: `จุดปล่อยเรือ ${boatLaunchCount}`,
        "ระยะทาง (กม.)": d1 !== null ? parseFloat(d1.toFixed(2)) : "-",
        "ระยะทางสะสม (กม.)": d1 !== null ? parseFloat(d1.toFixed(2)) : "-",
      });
      renderExpandTable();

      const allCommunities = stopData.filter((s) => s.id !== 1);
      await calculateBoatRoutes(newPoint, allCommunities, false, boatLaunchCount);
      await drawReturnToBaseIfComplete();

    } else {
      // เพิ่มจุดปล่อยเรือ — วาดเส้นแดงจากจุดก่อนหน้ามายังจุดใหม่
      boatLaunchCount++;
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

      if (lastBoatLaunchPoint) {
        const link = await solveRoute(lastBoatLaunchPoint, newPoint);
        if (link?.geometry) {
          boatLaunchLineLayer.add(new Graphic({ geometry: link.geometry, symbol: { type: "simple-line", color: [0, 176, 240, 1], width: 5 } }));
        }
        const prevDist = vehicleRouteArray.reduce((s, r) => s + (parseFloat(r["ระยะทาง (กม.)"]) || 0), 0);
        const ld = link?.distance ?? null;
        vehicleRouteArray.push({
          ต้นทาง: `จุดปล่อยเรือ ${boatLaunchCount - 1}`,
          ปลายทาง: `จุดปล่อยเรือ ${boatLaunchCount}`,
          "ระยะทาง (กม.)": ld !== null ? parseFloat(ld.toFixed(2)) : "-",
          "ระยะทางสะสม (กม.)": ld !== null ? parseFloat((prevDist + ld).toFixed(2)) : "-",
        });
        renderExpandTable();
      }

      lastBoatLaunchPoint = newPoint;

      const remaining = stopData.filter((s) => s.id !== 1 && !handledStopIds.has(s.id));
      await calculateBoatRoutes(newPoint, remaining, true, boatLaunchCount);
      await drawReturnToBaseIfComplete();
    }
  });

  document.getElementById("addBoatLaunchPoint").addEventListener("click", () => {
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

  document.getElementById("saveRoute").addEventListener("click", async () => {
    console.log("Save Route");
    console.log(`Vehicle : ${v} ,Index ${i}`);
    console.log(`Ref ID : ${r}`);

    const allCommunities = stopData.filter((s) => s.id !== 1);
    const allServed =
      allCommunities.length > 0 &&
      allCommunities.every((s) => handledStopIds.has(s.id));
    if (!allServed) {
      alert("กรุณาสร้างเส้นทางการจัดส่งให้ครบทุกชุมชน");
      return;
    }

    if (!cumulativeRouteArray || cumulativeRouteArray.length === 0) {
      console.warn("❌ ยังไม่มีข้อมูลเส้นทางคำนวณ");
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
          จัดส่ง: 0,
          ถุงยังชีพ: 0,
          ขนโดย: 0,
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
          จัดส่ง: 0,
          ถุงยังชีพ: row["ถุงยังชีพที่ขน"] ?? 0,
          ขนโดย: 1,
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

      console.log("✅ บันทึกลง Firestore สำเร็จ");

      // ✅ แจ้งเตือนแล้วปิดแท็บ
      alert("บันทึกแล้ว");
      window.close();
    } catch (error) {
      console.error("❌ Error saving to Firestore:", error);
    }
  });
});
