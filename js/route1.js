require([
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
  // if (_points) {
  //   stopData = JSON.parse(_points);
  //   // console.log(stopData);
  // }

  // ดึง query string จาก URL เช่น ?wing=21&data=%5B...%5D
  const params = new URLSearchParams(window.location.search);

  const v = params.get("vehicle");
  const i = params.get("group");
  const r = params.get("ref");

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

  // สร้าง Map และ MapView (ยังจำเป็นสำหรับการเริ่มต้น API แม้จะไม่ได้แสดงผลแผนที่)
  const map = new Map({
    basemap: "arcgis-navigation",
  });

  const customPolylineBarriers = [];
  const drawnPolylineBarrierLayer = new GraphicsLayer();
  const stopsLayer = new GraphicsLayer();
  const routesLayer = new GraphicsLayer();
  map.add(routesLayer);
  map.add(drawnPolylineBarrierLayer);
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

  // เก็บผลลัพธ์ของระยะทางและเวลาสำหรับทุกคู่จุด
  // เปลี่ยนจาก Object ธรรมดาเป็น Array เพื่อให้ console.table แสดงผลดีขึ้น
  const allPairwiseResultsArray = [];

  function getRouteWithCumulativeDistance(
    fastestRouteArray,
    tempPairwiseResults,
    stopData = []
  ) {
    const resultArray = [];
    let cumulativeDistance = 0;

    for (let i = 0; i < fastestRouteArray.length - 1; i++) {
      const fromId = fastestRouteArray[i];
      const toId = fastestRouteArray[i + 1];
      const key = `${fromId}-${toId}`;
      const segment = tempPairwiseResults[key];

      // เช็ค stopData ก่อนใช้ .find
      const fromStop = stopData.find?.((s) => s.id === fromId);
      const toStop = stopData.find?.((s) => s.id === toId);

      const fromAddress = fromStop ? fromStop.address : fromId;
      const toAddress = toStop ? toStop.address : toId;

      if (segment && segment.distance !== null) {
        cumulativeDistance += segment.distance;
        resultArray.push({
          ลำดับ: i + 1,
          ต้นทาง: fromAddress,
          ปลายทาง: toAddress,
          "ระยะทาง (กม.)": segment.distance,
          "ระยะทางสะสม (กม.)": cumulativeDistance.toFixed(2),
        });
      } else {
        resultArray.push({
          ลำดับ: i + 1,
          ต้นทาง: fromAddress,
          ปลายทาง: toAddress,
          "ระยะทาง (กม.)": "Error",
          "ระยะทางรวมสะสม (กม.)": "Error",
        });
      }
    }

    return resultArray;
  }

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
      polylineBarriers: new FeatureSet({
        features: customPolylineBarriers.map(
          (b) => new Graphic({ geometry: b.geometry })
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

  // ฟังก์ชันหลักสำหรับคำนวณและแสดงผลลัพธ์
  async function calculateAndDisplayAllRoutes() {
    // ตรวจสอบ API Key
    if (!apiKey || apiKey === "YOUR_API_KEY_HERE") {
      console.error(
        "โปรดระบุ ArcGIS API Key ของคุณในโค้ด JavaScript ก่อนใช้งาน"
      );
      return;
    }

    // ขั้นที่ 1: คำนวณระยะทางและเวลาสำหรับทุกคู่จุดที่เป็นไปได้
    const tempPairwiseResults = {}; // ใช้ Object ชั่วคราวเพื่อเก็บผลลัพธ์ตาม key ก่อน
    for (let i = 0; i < stopData.length; i++) {
      for (let j = 0; j < stopData.length; j++) {
        if (i === j) continue; // ไม่คำนวณจากจุดตัวเองไปจุดตัวเอง
        const startPoint = stopData[i];
        const endPoint = stopData[j];
        const key = `${startPoint.id}-${endPoint.id}`;
        console.log(
          `กำลังคำนวณเส้นทางจาก ${startPoint.id} ถึง ${endPoint.id}...`
        );
        const result = await solveRoute(startPoint, endPoint);
        tempPairwiseResults[key] = result;

        // เพิ่มข้อมูลเข้า Array เพื่อนำไปแสดงผลใน console.table
        allPairwiseResultsArray.push({
          จากจุด: startPoint.id,
          ไปยังจุด: endPoint.id,
          "ระยะทาง (กม.)": result.distance !== null ? result.distance : "Error",
          "เวลา (นาที)": result.time !== null ? result.time : "Error",
        });
      }
    }

    console.table(allPairwiseResultsArray); // แสดงผลในรูปแบบตาราง!

    // ขั้นที่ 2: สร้างรายการเส้นทางทั้งหมดที่เป็นไปได้ (TSP จากจุด 1)
    const pointsToVisit = stopData.filter((p) => p.id !== 1); // จุด 2, 3, 4
    const permutations = getPermutations(pointsToVisit.map((p) => p.id)); // สร้าง permutations ของ ID

    const finalRoutesData = [];

    for (const p of permutations) {
      const fullRouteIds = [1, ...p, 1]; // เช่น [1, 2, 3, 4, 1]
      let totalDistance = 0;
      let totalTime = 0;
      let routePath = "";
      let hasError = false;

      for (let i = 0; i < fullRouteIds.length - 1; i++) {
        const fromId = fullRouteIds[i];
        const toId = fullRouteIds[i + 1];
        const key = `${fromId}-${toId}`;
        const pairResult = tempPairwiseResults[key]; // ใช้ tempPairwiseResults ที่เก็บ key-value

        if (
          pairResult &&
          pairResult.distance !== null &&
          pairResult.time !== null
        ) {
          totalDistance += pairResult.distance;
          totalTime += pairResult.time;
        } else {
          hasError = true;
          break; // ถ้ามีข้อผิดพลาดใน segment ใด ให้ข้ามเส้นทางนี้
        }

        routePath += `${fromId} -> `;
      }

      if (hasError) {
        finalRoutesData.push({
          เส้นทาง: `${fullRouteIds.join(" -> ")} (มีข้อผิดพลาดบางส่วน)`,
          "ระยะทาง (กม.)": "Error",
          "เวลา (นาที)": "Error",
        });
      } else {
        routePath += "1"; // เพิ่มจุดสุดท้าย
        finalRoutesData.push({
          เส้นทาง: routePath,
          "ระยะทาง (กม.)": totalDistance.toFixed(2),
          "เวลา (นาที)": totalTime.toFixed(3),
        });
      }
    }

    console.table(finalRoutesData); // ยังคงแสดงใน console เพื่อตรวจสอบ

    // หาเส้นทางที่ใช้เวลาน้อยที่สุด
    const validRoutes = finalRoutesData.filter(
      (r) => r["เวลา (นาที)"] !== "Error"
    );

    // แปลงเวลาเป็นตัวเลขสำหรับเปรียบเทียบ
    const sortedByTime = validRoutes.sort(
      (a, b) => parseFloat(a["เวลา (นาที)"]) - parseFloat(b["เวลา (นาที)"])
    );

    if (sortedByTime.length > 0) {
      const fastestRoute = sortedByTime[0];
      const fastestRouteArray = fastestRoute.เส้นทาง
        .split(" -> ")
        .map((s) => parseInt(s));

      console.log("\n✅ เส้นทางที่ใช้เวลาน้อยที่สุด:");
      console.log(`เส้นทาง (array):`, fastestRouteArray);
      console.log(
        `เวลา: ${fastestRoute["เวลา (นาที)"]} นาที, ระยะทาง: ${fastestRoute["ระยะทาง (กม.)"]} กม.`
      );

      cumulativeRouteArray = getRouteWithCumulativeDistance(
        fastestRouteArray,
        tempPairwiseResults,
        stopData
      );
      console.table(cumulativeRouteArray);

      const container = document.getElementById("routeTableContainer");
      if (container) {
        container.innerHTML = ""; // ล้างตารางเก่า

        let html = `
  <table>
    <colgroup>
      <col style="width:8%">
      <col style="width:32%">
      <col style="width:32%">
      <col style="width:14%">
      <col style="width:14%">
    </colgroup>
    <thead><tr>
`;
        Object.keys(cumulativeRouteArray[0]).forEach((key) => {
          html += `<th>${key}</th>`;
        });
        html += "</tr></thead><tbody>";

        cumulativeRouteArray.forEach((row) => {
          html += "<tr>";
          Object.values(row).forEach((val) => {
            html += `<td>${val}</td>`;
          });
          html += "</tr>";
        });

        html += "</tbody></table>";
        container.innerHTML = html;
      }

      // วาดเส้นทางเดินรถจริง
      view.graphics.removeAll(); // ล้างกราฟิกเดิม

      let routeGeometries = []; // เก็บ geometry ของแต่ละ segment

      for (let i = 0; i < fastestRouteArray.length - 1; i++) {
        const fromId = fastestRouteArray[i];
        const toId = fastestRouteArray[i + 1];
        const key = `${fromId}-${toId}`;
        const segment = tempPairwiseResults[key];

        if (segment && segment.geometry) {
          routeGeometries.push(segment.geometry);
        }
      }

      // วาดแต่ละ segment แยกกัน (ง่ายและชัด)
      routeGeometries.forEach((geom) => {
        routesLayer.add(
          new Graphic({
            geometry: geom,
            symbol: {
              type: "simple-line",
              color: [0, 122, 255, 0.8],
              width: 4,
            },
          })
        );
      });

      fastestRouteArray.forEach((id, index) => {
        // ข้ามจุดสุดท้ายถ้าไม่อยากให้ซ้ำ
        if (index === fastestRouteArray.length - 1) return;

        const stop = stopData.find((s) => s.id === id);
        if (!stop) return;

        const isFirst = index === 0;
        const color = isFirst ? [0, 128, 0, 1] : [255, 165, 0, 1];

        // วาด marker
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
              outline: {
                color: [255, 255, 255],
                width: 1,
              },
            },
            attributes: {
              id: stop.id,
            },
            popupTemplate: {
              title: `${stop.address}`,
              content:
                stop.id !== 1
                  ? `
        <b>ผู้ประสบภัย:</b> ${stop.victim} ราย<br>
        <b>ถุงยังชีพ:</b> ${stop.bags} ถุง
      `
                  : "",
            },
          })
        );

        // ถ้าไม่ใช่จุดแรก ให้เพิ่มตัวเลข (index+1) ในวงกลมสีฟ้า
        if (!isFirst) {
          stopsLayer.add(
            new Graphic({
              geometry: {
                type: "point",
                longitude: stop.long,
                latitude: stop.lat,
              },
              symbol: {
                type: "text",
                text: index.toString(), // เริ่มจาก index=1 จะได้ "1", "2", ...
                color: "white",
                font: {
                  size: 10,
                  weight: "bold",
                },
                yoffset: -2, // ปรับให้ตัวเลขอยู่ตรงกลาง
              },
            })
          );
        }
      });
    } else {
      console.log("❌ ไม่พบเส้นทางที่คำนวณเวลาสำเร็จ");
    }
  }

  // Helper function เพื่อสร้าง permutation (จาก Stack Overflow)
  function getPermutations(arr) {
    const result = [];
    function permute(arr, l, r) {
      if (l === r) {
        result.push([...arr]);
      } else {
        for (let i = l; i <= r; i++) {
          [arr[l], arr[i]] = [arr[i], arr[l]]; // Swap
          permute(arr, l + 1, r);
          [arr[l], arr[i]] = [arr[i], arr[l]]; // Backtrack
        }
      }
    }
    permute(arr, 0, arr.length - 1);
    return result;
  }

  // เรียกใช้ฟังก์ชันคำนวณเส้นทางเมื่อ MapView พร้อมใช้งาน
  view.when(function () {
    calculateAndDisplayAllRoutes();
    const expand = new Expand({
      view: view,
      content: document.createElement("div"),
      expanded: false,
    });
    expand.content.id = "routeTableContainer";
    view.ui.add(expand, "bottom-left");
  });

  view.ui.add(document.getElementById("buttonDiv4"), "top-trailing"); // ปุ่มวาด
  view.ui.add(document.getElementById("buttonDiv3"), "top-trailing");
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
      // calculateAndDisplayAllRoutes();
    }
  });

  document.getElementById("recalculateRoute").addEventListener("click", () => {
    routesLayer.removeAll();
    // stopsLayer.removeAll();
    calculateAndDisplayAllRoutes();
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
