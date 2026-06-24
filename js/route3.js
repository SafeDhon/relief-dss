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
  "esri/rest/support/PolylineBarrier",
  "esri/widgets/Expand",
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
  PolylineBarrier,
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

  // ข้อมูลจุดทั้ง 4 จุด
  // const _points = sessionStorage.getItem("pointsData");
  let stopData = [];
  let cumulativeRouteArray = [];
  let handledStopIds = new Set();
  let lastBoatLaunchPoint = null;
  let isPlacingAddBoatLaunch = false;
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
  const boatLaunchLayer = new GraphicsLayer();
  map.add(routesLayer);
  map.add(drawnPolylineBarrierLayer);
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
  async function solveRoute(startPoint, endPoint) {
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

    const routeParams = new RouteParameters({
      stops: new FeatureSet({
        features: stops,
      }),
      // polylineBarriers: new FeatureSet({
      //   features: customPolylineBarriers.map(
      //     (b) => new Graphic({ geometry: b.geometry })
      //   ),
      // }),
      polylineBarriers: new FeatureSet({
        features: customPolylineBarriers.map(
          (b) =>
            new PolylineBarrier({
              geometry: b.geometry,
              barrierType: "restriction", // 🚫 ห้ามผ่าน
            })
        ),
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
    view.ui.add(expand, "bottom-left");
  });

  view.ui.add(document.getElementById("buttonDiv5"), "top-trailing");
  view.ui.add(document.getElementById("buttonDiv6"), "top-trailing");
  view.ui.add(document.getElementById("buttonDiv4"), "top-trailing");
view.ui.add(document.getElementById("buttonDiv1"), "bottom-trailing");

  const sketchVM = new SketchViewModel({
    view: view,
    layer: drawnPolylineBarrierLayer,
    polylineSymbol: {
      type: "simple-line",
      color: [255, 0, 0, 0.7], // สีแดง
      width: "4px",
    },
  });

  document
    .getElementById("drawPolylineBarrier")
    .addEventListener("click", () => {
      sketchVM.create("polyline");
    });

  sketchVM.on("create", async (event) => {
    if (event.state === "complete") {
      const newGraphic = event.graphic;
      drawnPolylineBarrierLayer.add(newGraphic);
      customPolylineBarriers.push(newGraphic);
      await calculateAndDisplayAllRoutes();
    }
  });

let isPlacingBoatLaunch = false;
  let boatLaunchPoint = null;

  function getPolylineMidpoint(geom) {
    if (!geom?.paths?.[0]?.length) return null;
    const path = geom.paths[0];
    const mid = path[Math.floor(path.length / 2)];
    return { longitude: mid[0], latitude: mid[1] };
  }

  async function calculateBoatRoutes(launchPt, targetStops, isAdditional = false) {
    if (!launchPt || targetStops.length === 0) return;

    // Step 1: ระยะทางจาก/ถึงจุดปล่อยเรือ เลือกทิศที่สั้นกว่าเป็นเส้นทางหลัก
    const launchToStop = {};
    const stopToLaunch = {};
    for (const stop of targetStops) {
      launchToStop[stop.id] = await solveRoute(launchPt, stop);
      stopToLaunch[stop.id] = await solveRoute(stop, launchPt);
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
      if (!isOver) {
        okIdx++;
        stopsLayer.add(
          new Graphic({
            geometry: { type: "point", longitude: stop.long, latitude: stop.lat },
            attributes: { stopId: stop.id },
            symbol: {
              type: "text",
              text: String(okIdx),
              color: "white",
              font: { size: 10, weight: "bold" },
              yoffset: -2,
            },
          })
        );
      }
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
        stopToStop[`${a.id}-${b.id}`] = await solveRoute(a, b);
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
      });

    const roundColors = [
      [0, 122, 255, 0.9],
      [255, 87, 34, 0.9],
      [76, 175, 80, 0.9],
      [156, 39, 176, 0.9],
      [255, 193, 7, 0.9],
    ];

    let globalOrder = cumulativeRouteArray.length + 1;

    for (let ri = 0; ri < rounds.length; ri++) {
      const { entries } = rounds[ri];
      const color = roundColors[ri % roundColors.length];
      let lastStop = null;
      let cumulDist = 0;
      let isFirstSeg = true;

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

          // วาดป้ายหมายเลขรอบที่กึ่งกลางเส้นแรกของรอบ
          if (isFirstSeg) {
            const mid = getPolylineMidpoint(geom);
            if (mid) {
              routesLayer.add(
                new Graphic({
                  geometry: { type: "point", ...mid },
                  symbol: {
                    type: "simple-marker",
                    color,
                    size: "22px",
                    outline: { color: [255, 255, 255], width: 2 },
                  },
                })
              );
              routesLayer.add(
                new Graphic({
                  geometry: { type: "point", ...mid },
                  symbol: {
                    type: "text",
                    text: String(ri + 1),
                    color: "white",
                    font: { size: 10, weight: "bold" },
                    yoffset: -2,
                  },
                })
              );
            }
            isFirstSeg = false;
          }
        }

        cumulDist += distFromPrev;

        cumulativeRouteArray.push({
          รอบ: ri + 1,
          ลำดับ: globalOrder,
          ปลายทาง: stop.address,
          "ถุงยังชีพ (ถุง)": task.bags,
          "ระยะทาง (กม.)": parseFloat(distFromPrev.toFixed(2)),
          "ระยะทางสะสม (กม.)": parseFloat(cumulDist.toFixed(2)),
        });

        // วาด marker ชุมชน
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

        // วาดลำดับการส่งที่จุดชุมชน
        stopsLayer.add(
          new Graphic({
            geometry: { type: "point", longitude: stop.long, latitude: stop.lat },
            symbol: {
              type: "text",
              text: String(globalOrder),
              color: "white",
              font: { size: 10, weight: "bold" },
              yoffset: -2,
            },
          })
        );

        lastStop = stop;
        globalOrder++;
      }

      // วาดเส้นขากลับ (เส้นประ)
      if (lastStop) {
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

    // Step 7: แสดงตารางสรุปเส้นทาง
    const container = document.getElementById("routeTableContainer");
    if (container && cumulativeRouteArray.length > 0) {
      let html =
        "<table><colgroup>" +
        "<col style='width:8%'><col style='width:8%'><col style='width:32%'>" +
        "<col style='width:16%'><col style='width:18%'><col style='width:18%'>" +
        "</colgroup><thead><tr>" +
        "<th>รอบ</th><th>ลำดับ</th><th>ปลายทาง</th>" +
        "<th>ถุงยังชีพ (ถุง)</th><th>ระยะทาง (กม.)</th><th>ระยะทางสะสม (กม.)</th>" +
        "</tr></thead><tbody>";
      cumulativeRouteArray.forEach((row) => {
        html += `<tr><td>${row.รอบ}</td><td>${row.ลำดับ}</td><td>${row.ปลายทาง}</td><td>${row["ถุงยังชีพ (ถุง)"]}</td><td>${row["ระยะทาง (กม.)"]}</td><td>${row["ระยะทางสะสม (กม.)"]}</td></tr>`;
      });
      html += "</tbody></table>";
      container.innerHTML = html;
    }

    console.log(`=== แผนการส่งเรือ: ${rounds.length} รอบ ===`);
    console.table(cumulativeRouteArray);
  }

  async function drawReturnToBaseIfComplete() {
    const allCommunities = stopData.filter((s) => s.id !== 1);
    const allServed = allCommunities.every((s) => handledStopIds.has(s.id));
    if (!allServed || !lastBoatLaunchPoint) return;

    const result = await solveRoute(lastBoatLaunchPoint, stopData[0]);
    if (result?.geometry) {
      boatLaunchLayer.add(
        new Graphic({
          geometry: result.geometry,
          symbol: { type: "simple-line", color: [211, 47, 47, 1], width: 3 },
        })
      );
    }
  }

  document.getElementById("setBoatLaunchPoint").addEventListener("click", () => {
    isPlacingBoatLaunch = !isPlacingBoatLaunch;
    const btn = document.getElementById("setBoatLaunchPoint");
    if (isPlacingBoatLaunch) {
      btn.textContent = "กำลังเลือกจุด... (คลิกเพื่อยกเลิก)";
      btn.style.backgroundColor = "#7f0000";
      view.container.style.cursor = "crosshair";
    } else {
      btn.textContent = "กำหนดจุดปล่อยเรือ";
      btn.style.backgroundColor = "#d32f2f";
      view.container.style.cursor = "default";
    }
  });

  view.on("click", async (event) => {
    const placingFirst = isPlacingBoatLaunch;
    const placingAdd = isPlacingAddBoatLaunch;
    if (!placingFirst && !placingAdd) return;

    // ออกจากโหมดทันที
    isPlacingBoatLaunch = false;
    isPlacingAddBoatLaunch = false;
    view.container.style.cursor = "default";
    document.getElementById("setBoatLaunchPoint").textContent = "กำหนดจุดปล่อยเรือ";
    document.getElementById("setBoatLaunchPoint").style.backgroundColor = "#d32f2f";
    document.getElementById("addBoatLaunchPoint").textContent = "เพิ่มจุดปล่อยเรือ";
    document.getElementById("addBoatLaunchPoint").style.backgroundColor = "#1565c0";

    const newPoint = {
      id: "boat",
      address: placingFirst ? "จุดปล่อยเรือ" : `จุดปล่อยเรือ ${2}`,
      lat: event.mapPoint.latitude,
      long: event.mapPoint.longitude,
    };

    if (placingFirst) {
      // รีเซ็ตสถานะทั้งหมด
      boatLaunchLayer.removeAll();
      routesLayer.removeAll();
      stopsLayer.removeAll();
      cumulativeRouteArray = [];
      handledStopIds = new Set();

      boatLaunchPoint = newPoint;
      lastBoatLaunchPoint = newPoint;

      boatLaunchLayer.add(
        new Graphic({
          geometry: event.mapPoint,
          symbol: { type: "simple-marker", color: [211, 47, 47, 1], size: "25px", style: "diamond", outline: { color: [255, 255, 255], width: 2 } },
          popupTemplate: { title: "จุดปล่อยเรือ", content: `ละติจูด: ${event.mapPoint.latitude.toFixed(5)}<br>ลองจิจูด: ${event.mapPoint.longitude.toFixed(5)}` },
        })
      );

      const result = await solveRoute(stopData[0], newPoint);
      if (result?.geometry) {
        boatLaunchLayer.add(new Graphic({ geometry: result.geometry, symbol: { type: "simple-line", color: [211, 47, 47, 1], width: 3 } }));
      }

      const allCommunities = stopData.filter((s) => s.id !== 1);
      await calculateBoatRoutes(newPoint, allCommunities, false);
      await drawReturnToBaseIfComplete();

    } else {
      // เพิ่มจุดปล่อยเรือ — วาดเส้นแดงจากจุดก่อนหน้ามายังจุดใหม่
      boatLaunchLayer.add(
        new Graphic({
          geometry: event.mapPoint,
          symbol: { type: "simple-marker", color: [211, 47, 47, 1], size: "25px", style: "diamond", outline: { color: [255, 255, 255], width: 2 } },
          popupTemplate: { title: "จุดปล่อยเรือเพิ่มเติม", content: `ละติจูด: ${event.mapPoint.latitude.toFixed(5)}<br>ลองจิจูด: ${event.mapPoint.longitude.toFixed(5)}` },
        })
      );

      if (lastBoatLaunchPoint) {
        const link = await solveRoute(lastBoatLaunchPoint, newPoint);
        if (link?.geometry) {
          boatLaunchLayer.add(new Graphic({ geometry: link.geometry, symbol: { type: "simple-line", color: [211, 47, 47, 1], width: 3 } }));
        }
      }

      lastBoatLaunchPoint = newPoint;

      const remaining = stopData.filter((s) => s.id !== 1 && !handledStopIds.has(s.id));
      await calculateBoatRoutes(newPoint, remaining, true);
      await drawReturnToBaseIfComplete();
    }
  });

  document.getElementById("addBoatLaunchPoint").addEventListener("click", () => {
    isPlacingAddBoatLaunch = !isPlacingAddBoatLaunch;
    const btn = document.getElementById("addBoatLaunchPoint");
    if (isPlacingAddBoatLaunch) {
      btn.textContent = "กำลังเลือกจุด... (คลิกเพื่อยกเลิก)";
      btn.style.backgroundColor = "#0d3b7a";
      view.container.style.cursor = "crosshair";
      isPlacingBoatLaunch = false;
    } else {
      btn.textContent = "เพิ่มจุดปล่อยเรือ";
      btn.style.backgroundColor = "#1565c0";
      view.container.style.cursor = "default";
    }
  });

  document.getElementById("saveRoute").addEventListener("click", async () => {
    console.log("Save Route");
    console.log(`Vehicle : ${v} ,Index ${i}`);
    console.log(`Ref ID : ${r}`);

    if (!cumulativeRouteArray || cumulativeRouteArray.length === 0) {
      console.warn("❌ ยังไม่มีข้อมูลเส้นทางคำนวณ");
      return;
    }

    try {
      const saveArray = cumulativeRouteArray.map((o) => ({
        ...o,
        จัดส่ง: 0,
      }));

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
