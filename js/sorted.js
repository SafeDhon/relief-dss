function getData() {
  var addedDataJson = sessionStorage.getItem("addedData");
  let addedData = null;
  if (addedDataJson) {
    try {
      addedData = JSON.parse(addedDataJson);
    } catch (e) {
      console.error("Error parsing sortedData from sessionStorage:", e);
    }
  }

  if (addedData) {
    console.log("ข้อมูล Sorted ที่ได้รับ (Array of Objects):", addedData);
    return addedData;
  } else {
    console.log("ไม่พบข้อมูลที่ส่งมา หรือเกิดข้อผิดพลาดในการดึงข้อมูล.");
    return null;
  }
}

function getOrigin() {
  const selectedWing = parseInt(sessionStorage.getItem("originData"), 10);
  return selectedWing;
}

function prepairData(data) {
  const wing = getOrigin();
  const wingData = wings.find((w) => w.id === wing);
  const points = [];
  if (wingData) {
    points.push({
      id: 1,
      address: `กองบิน ${wingData.id}`,
      lat: wingData.latitude,
      long: wingData.longitude,
      victim: 0,
      bags: 0,
    });
  } else {
    console.log("ไม่พบกองบินที่เลือก");
  }
  for (let i = 0; i < data.length; i++) {
    points.push({
      id: i + 2,
      address: data[i].address,
      lat: data[i].latitude,
      long: data[i].longitude,
      victim: data[i].victim,
      bags: data[i].survivalBag,
    });
  }
  return points;
}

console.log(getData());

const communities = getData();

// const communities = [
//   {
//     address: "ชุมชน บ้านตลาดขวัญ",
//     longitude: 100.506042,
//     latitude: 13.841556,
//     id: 1,
//     score: 0.4507983633567712,
//     victim: 500,
//     survivalBag: 125,
//     vehicle: 2,
//   },
//   {
//     address: "ชุมชน เกาะหลัก",
//     longitude: 99.802142,
//     latitude: 11.796024,
//     id: 2,
//     score: 0.3987924750643096,
//     victim: 200,
//     survivalBag: 50,
//     vehicle: 2,
//   },
//   {
//     address: "ชุมชน ทับสะแก",
//     longitude: 99.612759,
//     latitude: 11.49773,
//     id: 3,
//     score: 0.39856813239088296,
//     victim: 300,
//     survivalBag: 75,
//     vehicle: 2,
//   },
//   {
//     address: "ชุมชน ไทยบ้านท่าหวี",
//     longitude: 99.408125,
//     latitude: 14.09826,
//     id: 4,
//     score: 0.3862964839005582,
//     victim: 100,
//     survivalBag: 25,
//     vehicle: 2,
//   },
//   {
//     address: "ชุมชน เมืองคลองท่อม",
//     longitude: 99.14008,
//     latitude: 7.933056,
//     id: 5,
//     score: 0.2517108744171783,
//     victim: 150,
//     survivalBag: 38,
//     vehicle: 2,
//   },
//   {
//     address: "ชุมชน 1",
//     longitude: 103.055707,
//     latitude: 15.41102,
//     id: 6,
//     score: 0.22895742177631578,
//     victim: 250,
//     survivalBag: 63,
//     vehicle: 2,
//   },
//   {
//     address: "ชุมชน 2",
//     longitude: 103.055707,
//     latitude: 15.41102,
//     id: 7,
//     score: 0.22895742177631578,
//     victim: 250,
//     survivalBag: 63,
//     vehicle: 2,
//   },
//   {
//     address: "ชุมชน 3",
//     longitude: 103.055707,
//     latitude: 15.41102,
//     id: 8,
//     score: 0.22895742177631578,
//     victim: 250,
//     survivalBag: 63,
//     vehicle: 1,
//   },
//   {
//     address: "ชุมชน 4",
//     longitude: 103.055707,
//     latitude: 15.41102,
//     id: 9,
//     score: 0.22895742177631578,
//     victim: 250,
//     survivalBag: 40,
//     vehicle: 3,
//   },
//   {
//     address: "ชุมชน 5",
//     longitude: 103.055707,
//     latitude: 15.41102,
//     id: 10,
//     score: 0.22895742177631578,
//     victim: 250,
//     survivalBag: 20,
//     vehicle: 4,
//   },
//   {
//     address: "ชุมชน 6",
//     longitude: 103.055707,
//     latitude: 15.41102,
//     id: 11,
//     score: 0.22895742177631578,
//     victim: 250,
//     survivalBag: 63,
//     vehicle: 1,
//   },
//   {
//     address: "ชุมชน 7",
//     longitude: 103.055707,
//     latitude: 15.41102,
//     id: 12,
//     score: 0.22895742177631578,
//     victim: 250,
//     survivalBag: 63,
//     vehicle: 4,
//   },
// ];

const vehicles = _vehicles;

const communityTableContainer = document.getElementById(
  "community-table-container"
);
const navButtons = document.querySelectorAll(".nav-button");

let currentDisplayedCommunities = [];
let _vehicleCode = "1";

function splitCommunitiesByCapacity(communities, capacity) {
  const result = [];
  communities.forEach((c) => {
    let remaining = c.survivalBag;
    let parts = Math.ceil(remaining / capacity); // ✅ จำนวน part ทั้งหมด
    let part = 1;

    while (remaining > 0) {
      const take = Math.min(remaining, capacity);

      result.push({
        ...c,
        address:
          parts > 1 ? `${c.address} (รอบที่ ${part})` : c.address, // ✅ ใส่ label เฉพาะถ้ามีหลาย part
        survivalBag: take,
        victim: Math.round((c.victim * take) / c.survivalBag),
      });

      remaining -= take;
      part++;
    }
  });
  return result;
}



// แสดงกลุ่มของชุมชนตาม capacity
function displayGroupedTable(filteredCommunities, vehicle) {
  const capacity = vehicle.capacity;
  const groups = [];
  let currentGroup = [];
  let currentSum = 0;

  filteredCommunities.forEach((community) => {
    if (currentSum + community.survivalBag > capacity) {
      groups.push(currentGroup);
      currentGroup = [];
      currentSum = 0;
    }
    currentGroup.push(community);
    currentSum += community.survivalBag;
  });

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  groups.forEach((group, groupIndex) => {
    const groupTitle = document.createElement("h4");
    groupTitle.textContent = `${vehicle.name} – กลุ่มที่ ${
      groupIndex + 1
    } (ไม่เกิน ${capacity} ถุง)`;
    communityTableContainer.appendChild(groupTitle);

    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const tbody = document.createElement("tbody");
    const tfoot = document.createElement("tfoot");

    const headerRow = document.createElement("tr");
    headerRow.innerHTML = `
      <th>ลำดับ</th>
      <th>ที่อยู่</th>
      <th>ละติจูด</th>
      <th>ลองจิจูด</th>
      <th>ผู้ประสบภัย (คน)</th>
      <th>ถุงยังชีพ (ถุง)</th>
    `;
    thead.appendChild(headerRow);
    table.appendChild(thead);

    group.forEach((community, index) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${index + 1}.</td>
        <td>${community.address}</td>
        <td>${community.latitude.toFixed(8)}</td>
        <td>${community.longitude.toFixed(8)}</td>
        <td>${community.victim}</td>
        <td>${community.survivalBag}</td>
      `;
      tbody.appendChild(row);
    });

    const footerRow = document.createElement("tr");
    const footerCell = document.createElement("td");
    footerCell.colSpan = 6;
    footerCell.style.textAlign = "right";

    const sortButton = document.createElement("button");
    sortButton.textContent = "คำนวณเส้นทาง";
    sortButton.classList.add("route-button");
    sortButton.addEventListener("click", () => {
      const _points = prepairData(group);
      sessionStorage.setItem("pointsData", JSON.stringify(_points));
      console.log(_points);
      // console.log(_points);
      if (vehicle.id != 4) {
        window.location.href = "route1.html";
      } else {
        window.location.href = "route2.html";
      }

      // console.log(group.length);
    });

    footerCell.appendChild(sortButton);
    footerRow.appendChild(footerCell);
    tfoot.appendChild(footerRow);

    table.appendChild(tbody);
    table.appendChild(tfoot);
    communityTableContainer.appendChild(table);
  });
}

// แสดงข้อมูลตาม vehicle หรือ all
function displayCommunities(filterVehicleCode) {
  communityTableContainer.innerHTML = "";
  _vehicleCode = filterVehicleCode;

  if (filterVehicleCode === "all") {
    currentDisplayedCommunities = communities;
    displayAllCommunitiesInOneTable(communities);
  } else {
    const filtered = communities.filter(
      (community) => community.vehicle === parseInt(filterVehicleCode)
    );
    currentDisplayedCommunities = filtered;

    const vehicle = vehicles.find((v) => v.id === parseInt(filterVehicleCode));
    if (!vehicle) {
      communityTableContainer.innerHTML =
        '<p style="text-align: center; color: red;">ไม่พบข้อมูล vehicle</p>';
      return;
    }

    if (filtered.length === 0) {
      communityTableContainer.innerHTML =
        '<p style="text-align: center; color: #666;">ไม่พบข้อมูลชุมชนสำหรับยานพาหนะประเภทนี้</p>';
      return;
    }

    const splitted = splitCommunitiesByCapacity(filtered, vehicle.capacity);
    displayGroupedTable(splitted, vehicle);

    // displayGroupedTable(filtered, vehicle);
  }
}

function displayAllCommunitiesInOneTable(communityList) {
  const groupTitle = document.createElement("h4");
  groupTitle.textContent = `📋 ข้อมูลชุมชนทั้งหมด (${communityList.length} รายการ)`;
  communityTableContainer.appendChild(groupTitle);

  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const tbody = document.createElement("tbody");
  const tfoot = document.createElement("tfoot");

  const headerRow = document.createElement("tr");
  headerRow.innerHTML = `
    <th>ลำดับ</th>
    <th>ที่อยู่</th>
    <th>ละติจูด</th>
    <th>ลองจิจูด</th>
    <th>ผู้ประสบภัย (คน)</th>
    <th>ถุงยังชีพ (ถุง)</th>
    <th>พาหนะ</th>
  `;
  thead.appendChild(headerRow);
  table.appendChild(thead);

  communityList.forEach((community, index) => {
    const vehicleName =
      vehicles.find((v) => v.id === community.vehicle)?.name || "ไม่ทราบ";

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${index + 1}.</td>
      <td>${community.address}</td>
      <td>${community.latitude.toFixed(8)}</td>
      <td>${community.longitude.toFixed(8)}</td>
      <td>${community.victim}</td>
      <td>${community.survivalBag}</td>
      <td>${vehicleName}</td>
    `;
    tbody.appendChild(row);
  });

  const footerRow = document.createElement("tr");
  const footerCell = document.createElement("td");
  footerCell.colSpan = 7;
  footerCell.style.textAlign = "right";

  footerRow.appendChild(footerCell);
  tfoot.appendChild(footerRow);

  table.appendChild(tbody);
  table.appendChild(tfoot);
  communityTableContainer.appendChild(table);
}

// เพิ่ม Event ให้ปุ่ม nav
navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    navButtons.forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");

    const code = button.dataset.vehicleCode;
    displayCommunities(code);
  });
});

// โหลดเริ่มต้น
displayCommunities("all");

// ปุ่มรวมทั้งหมด
// const btnCal = document.getElementById("btnCal");
// if (btnCal) {
//   btnCal.addEventListener("click", () => {
//     console.log("ข้อมูลชุมชนที่แสดงอยู่:", currentDisplayedCommunities);
//     console.log("vehicleCode ที่เลือก:", _vehicleCode);
//   });
// } else {
//   console.warn("ไม่พบปุ่มที่มี id='btnCal'");
// }
