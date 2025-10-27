buildTable(getArray());

function getArray() {
  const selectedLocationsData = sessionStorage.getItem("communityArray");
  let selectedLocations = [];
  if (selectedLocationsData) {
    selectedLocations = JSON.parse(selectedLocationsData);
  }
  return selectedLocations;
}

function getArrayWithVictim(data) {
  const ids = data.map((item) => item.id);
  const rows = document.querySelectorAll("tbody tr");
  const victimArray = [];

  rows.forEach((row) => {
    const input = row.querySelector('td:nth-child(3) input[type="number"]');
    if (input) {
      const value = parseInt(input.value);
      if (!isNaN(value)) {
        victimArray.push(value);
      }
    }
  });

  const result = ids.map((id, index) => ({
    id: id,
    victim: victimArray[index], // ดึงค่าจาก array victim ตาม index
  }));

  return result;
}

function getOrigin() {
  const selectedWing = sessionStorage.getItem("selectedWing");
  return selectedWing;
}

function buildTable(data) {
  var table = document.getElementById("myTable");
  for (var i = 0; i < data.length; i++) {
    var row = `<tr>
                  <td>${i + 1}.</td>
                  <td>${data[i].address}</td>
              
                  <td><input type="number" class="number-input" min="0" autocomplete="new-password"></td>
                  <td><input type="number" class="number-input" min="0" autocomplete="new-password"></td>
                  <td>
                    <select name="level" class="level-select">
                      <option value="1">น้อยกว่า 30%</option>
                      <option value="2">31% - 70%</option>
                      <option value="3">มากกว่า 70%</option>
                    </select>
                  </td>
                  <td>
                    <select name="level" class="level-select">
                      <option value="1">จัดหาเองได้</option>
                      <option value="2">จัดหาได้บ้าง</option>
                      <option value="3">ไม่มีทรัพยากร</option>
                    </select>
                  </td>
                  <td>
                    <select name="level" class="level-select">
                      <option value="1">เข้าถึงได้ปกติ</option>
                      <option value="2">เข้าถึงได้บ้าง</option>
                      <option value="3">เข้าถึงไม่ได้</option>
                    </select>
                  </td>
                  <td>
                    <select name="level" class="level-select">
                      <option value="1">ไม่จำเป็น</option>
                
                      <option value="3">จำเป็น</option>
                    </select>
                  </td>
                 
                  <td>
                    <select name="level" class="level-select">
                      <option value="1">น้อยกว่า 24 ชม.</option>
                      <option value="2">24 ชม. - 48 ชม.</option>
                      <option value="3">มากกว่า 48 ชม.</option>
                    </select>
                  </td>
                  
                  <td>
                    <select name="level" class="level-select">
                      <option value="1">เสียหายเล็กน้อย</option>
                      <option value="2">เสียหายบางจุด</option>
                      <option value="3">เสียหายทั้งหมด</option>
                    </select>
                  </td>
                  <td>
                    <select name="level" class="level-select">
                      <option value="1">น้อย</option>
                      <option value="2">ปานกลาง</option>
                      <option value="3">มาก</option>
                    </select>
                  </td>
                
              </tr>`;
    table.innerHTML += row;
  }
}

function getAllRowValues(data) {
  const table = document.getElementById("myTable");
  const rows = table.getElementsByTagName("tr");
  const allData = [];

  for (let i = 0; i < rows.length; i++) {
    const inputs = rows[i].querySelectorAll("input[type='number']");
    const selects = rows[i].querySelectorAll("select");

    const rowData = [];

    rowData.push(data[i].id);

    inputs.forEach((input) => {
      const value = parseFloat(input.value);
      rowData.push(isNaN(value) ? 0 : value);
    });

    selects.forEach((select) => {
      const value = parseInt(select.value);
      rowData.push(isNaN(value) ? 0 : value);
    });

    allData.push(rowData);
  }

  return allData;
}
var butt = document.getElementById("btnCal");
butt.addEventListener("click", function () {
  const inputs = document.querySelectorAll("input, select");
  let hasEmpty = false;

  inputs.forEach((el) => {
    if (el.disabled) return; // ข้าม input ที่ disabled
    if (el.type === "checkbox" || el.type === "radio") return; // ข้าม checkbox/radio
    if (el.value.trim() === "") {
      hasEmpty = true;
      el.classList.add("input-error"); // เพิ่มคลาสเพื่อเน้นช่องที่ว่าง (ถ้ามี CSS)
    } else {
      el.classList.remove("input-error");
    }
  });

  if (hasEmpty) {
    alert("กรุณากรอกข้อมูลให้ครบทุกช่อง");
    return;
  }

  var _origin = getOrigin();
  var _data = calData();
  var _victim = getArrayWithVictim(getArray());
  var _sorted = addDataAfterSort(getArray(), _data, _victim);
  var _dataNewID = updateIdsWithIndex(_sorted);

  sessionStorage.setItem("originData", _origin);
  sessionStorage.setItem("sortedData", JSON.stringify(_dataNewID));

  console.log(_origin);
  console.log(_dataNewID);

  window.location.href = "../pages/vehicle.html";
});

// function addDataAfterSort(data, sorted, victims) {
//   const detailsMap = new Map();
//   data.forEach((item) => {
//     detailsMap.set(item.id, item);
//   });
//   const victimsMap = new Map();
//   victims.forEach((item) => {
//     victimsMap.set(item.id, item.victim);
//   });
//   const orderedCommunities = sorted.map((sortedItem) => {
//     const detail = detailsMap.get(sortedItem.id);
//     const victimCount = victimsMap.get(sortedItem.id);
//     return {
//       ...detail,
//       score: sortedItem.score,
//       victim: victimCount || 0,
//     };
//   });
//   console.log(orderedCommunities);
//   return orderedCommunities;
// }

function addDataAfterSort(data, sorted, victims) {
  const detailsMap = new Map();
  data.forEach((item) => {
    detailsMap.set(item.id, item);
  });

  const victimsMap = new Map();
  victims.forEach((item) => {
    victimsMap.set(item.id, item.victim);
  });

  // ดึงค่าทุก parameter ที่กรอกในตาราง
  const rawValues = getAllRowValues(data);
  const paramMap = new Map();
  rawValues.forEach((row) => {
    const [id, ...params] = row;
    paramMap.set(id, params);
  });

  const orderedCommunities = sorted.map((sortedItem) => {
    const detail = detailsMap.get(sortedItem.id);
    const victimCount = victimsMap.get(sortedItem.id);
    const parameters = paramMap.get(sortedItem.id) || [];

    return {
      ...detail,
      score: sortedItem.score,
      parameter: parameters,
      victim: victimCount || 0,
      vulnerable: parameters[1] || 0,
    };
  });

  console.log(orderedCommunities);
  return orderedCommunities;
}

function updateIdsWithIndex(data) {
  if (!Array.isArray(data)) {
    console.error("Input must be an array.");
    return data;
  }
  return data.map((item, index) => {
    return {
      ...item,
      id: index + 1,
    };
  });
}

// ปุ่มไปหน้า History
const historyBtn = document.getElementById("historyBtn");
historyBtn.addEventListener("click", () => {
  window.location.href = "../pages/history.html";
});

// var testData = [
//   [1, 3, 5, 3, 3, 3, 3, 3, 3, 3],
//   [2, 1, 4, 3, 3, 3, 3, 3, 3, 3],
//   [3, 4, 4, 3, 3, 3, 3, 3, 3, 3],
//   [4, 3, 3, 2, 3, 2, 1, 2, 3, 1],
//   [5, 3, 3, 2, 3, 2, 1, 2, 3, 1],
//   [6, 4, 3, 2, 3, 2, 1, 2, 2, 1],
//   [7, 5, 3, 3, 3, 2, 1, 2, 2, 1],
//   [8, 4, 5, 2, 3, 2, 1, 2, 2, 1],
//   [9, 3, 3, 2, 3, 2, 1, 2, 2, 1],
//   [10, 5, 3, 3, 3, 3, 3, 3, 3, 3],
//   [11, 5, 2, 3, 3, 2, 1, 2, 2, 1],
//   [12, 5, 3, 3, 2, 2, 1, 2, 2, 1],
//   [13, 4, 3, 3, 2, 2, 1, 2, 2, 1],
//   [14, 4, 3, 3, 2, 2, 1, 2, 2, 1],
//   [15, 5, 3, 2, 2, 2, 1, 2, 2, 1],
//   [16, 4, 3, 3, 3, 3, 3, 3, 3, 3],
//   [17, 4, 3, 2, 2, 2, 1, 2, 2, 1],
//   [18, 2, 4, 3, 3, 3, 3, 3, 3, 3],
//   [19, 3, 4, 3, 3, 3, 3, 3, 3, 3],
//   [20, 3, 4, 3, 3, 3, 3, 3, 3, 3],
//   [21, 4, 3, 3, 2, 2, 1, 2, 2, 1],
//   [22, 2, 3, 1, 2, 2, 1, 2, 2, 1],
//   [23, 3, 3, 2, 2, 2, 1, 2, 2, 1],
//   [24, 3, 4, 1, 2, 2, 1, 2, 2, 1],
//   [25, 3, 3, 1, 2, 2, 1, 2, 2, 1],
//   [26, 2, 4, 1, 2, 2, 1, 2, 2, 1],
//   [27, 3, 4, 1, 2, 2, 1, 2, 2, 1],
//   [28, 1, 4, 1, 2, 2, 1, 2, 2, 1],
//   [29, 2, 4, 1, 2, 2, 1, 2, 2, 1],
//   [30, 5, 3, 2, 2, 2, 1, 2, 2, 1],
//   [31, 5, 3, 3, 3, 3, 3, 1, 3, 1],
//   [32, 4, 3, 3, 3, 3, 3, 1, 3, 1],
//   [33, 5, 3, 3, 3, 3, 3, 1, 3, 1],
// ];

function calData() {
  var rawdata = getAllRowValues(getArray());

  // Transform Data
  for (let i = 0; i < rawdata.length; i++) {
    // Cal Data 2
    var per = (rawdata[i][2] / rawdata[i][1]) * 100;

    if (per > 25) {
      rawdata[i][2] = 5;
    } else if (per > 20) {
      rawdata[i][2] = 4;
    } else if (per > 15) {
      rawdata[i][2] = 3;
    } else if (per > 10) {
      rawdata[i][2] = 2;
    } else {
      rawdata[i][2] = 1;
    }

    // Cal Data 1
    if (rawdata[i][1] > 500) {
      rawdata[i][1] = 5;
    } else if (rawdata[i][1] > 200) {
      rawdata[i][1] = 4;
    } else if (rawdata[i][1] > 50) {
      rawdata[i][1] = 3;
    } else if (rawdata[i][1] > 10) {
      rawdata[i][1] = 2;
    } else {
      rawdata[i][1] = 1;
    }

    // Cal Data 3
    // if (rawdata[i][3] >= 48) {
    //   rawdata[i][3] = 3;
    // } else if (rawdata[i][3] >= 24) {
    //   rawdata[i][3] = 2;
    // } else {
    //   rawdata[i][3] = 1;
    // }
  }

  // Test Data
  // rawdata = JSON.parse(JSON.stringify(testData));

  // ยกกำลัง 2
  var cal1 = square(JSON.parse(JSON.stringify(rawdata)));

  // หาค่า A
  var listA = [];
  for (let j = 1; j < 10; j++) {
    var sum = 0;
    for (let i = 0; i < cal1.length; i++) {
      sum = sum + cal1[i][j];
    }
    listA.push(Math.sqrt(sum));
  }

  // หารแนวตั้งด้วย A
  var cal3 = divideByA(JSON.parse(JSON.stringify(rawdata)), listA);
  // console.log(cal3);

  // คูณค่าถ่วงน้ำหนัก
  var cal4 = weight(JSON.parse(JSON.stringify(cal3)));
  // console.log(cal4);

  // หาค่า max min
  var calMax = findMaxs(JSON.parse(JSON.stringify(cal4)));
  // console.log(calMax);

  var calMin = findMins(JSON.parse(JSON.stringify(cal4)));
  // console.log(calMin);

  // หาค่า Si
  var si_list = findSi(
    JSON.parse(JSON.stringify(cal4)),
    JSON.parse(JSON.stringify(calMax))
  );
  // console.log(si_list);

  // หาค่า Sn
  var sn_list = findSn(
    JSON.parse(JSON.stringify(cal4)),
    JSON.parse(JSON.stringify(calMin))
  );
  // console.log(sn_list);

  // จัดลำดับ
  var rank_score = calRank(
    JSON.parse(JSON.stringify(si_list)),
    JSON.parse(JSON.stringify(sn_list))
  );
  // console.log(rank_score);

  // ใส่ Id ก่อนจัดลำดับ
  var object = mapId(
    JSON.parse(JSON.stringify(rawdata)),
    JSON.parse(JSON.stringify(rank_score))
  );

  // จัดลำดับด้วย score
  const sortedData = JSON.parse(JSON.stringify(object)).sort(
    (a, b) => b.score - a.score
  );
  // console.log(sortedData);
  return sortedData;
}

function mapId(data, score) {
  var list_id = [];
  for (let i = 0; i < data.length; i++) {
    list_id.push(data[i][0]);
  }
  const result = list_id.map((id, index) => ({
    id: id,
    score: score[index],
  }));
  return result;
}

function calRank(si, sn) {
  var piority = [];
  for (let i = 0; i < si.length; i++) {
    var cal = 0;
    cal = sn[i] / (si[i] + sn[i]);
    piority.push(cal);
  }
  return piority;
}

function findSi(list, maxs) {
  var sis = [];
  var new_list = [];
  for (let i = 0; i < list.length; i++) {
    var nums = list[i];
    for (let j = 1; j < 10; j++) {
      nums[j] = (maxs[j - 1] - nums[j]) * (maxs[j - 1] - nums[j]);
    }
    new_list.push(nums);
  }

  for (let i = 0; i < new_list.length; i++) {
    var sum = 0;
    for (let j = 1; j < 10; j++) {
      sum = sum + new_list[i][j];
    }
    sis.push(Math.sqrt(sum));
  }

  return sis;
}

function findSn(list, mins) {
  var sns = [];
  var new_list = [];
  for (let i = 0; i < list.length; i++) {
    var nums = list[i];
    for (let j = 1; j < 10; j++) {
      nums[j] = (mins[j - 1] - nums[j]) * (mins[j - 1] - nums[j]);
    }
    new_list.push(nums);
  }

  for (let i = 0; i < new_list.length; i++) {
    var sum = 0;
    for (let j = 1; j < 10; j++) {
      sum = sum + new_list[i][j];
    }
    sns.push(Math.sqrt(sum));
  }

  return sns;
}

function findMaxs(list) {
  var maxs = [];
  for (let j = 1; j < 10; j++) {
    var num_pre = 0;
    for (let i = 0; i < list.length; i++) {
      var num = list[i][j];
      if (num > num_pre) {
        num_pre = num;
      }
    }
    maxs.push(num_pre);
  }
  return maxs;
}

function findMins(list) {
  var mins = [];
  for (let j = 1; j < 10; j++) {
    var num_pre = 1000;
    for (let i = 0; i < list.length; i++) {
      var num = list[i][j];
      if (num < num_pre) {
        num_pre = num;
      }
    }
    mins.push(num_pre);
  }
  return mins;
}

function weight(list) {
  var weights = [
    0.035, 0.261, 0.0435, 0.2745, 0.0044, 0.0312, 0.2445, 0.0849, 0.021,
  ];
  var weighted = [];
  for (let i = 0; i < list.length; i++) {
    var nums = list[i];
    for (let j = 1; j < 10; j++) {
      nums[j] = nums[j] * weights[j - 1];
    }
    weighted.push(nums);
  }
  return weighted;
}

function divideByA(list, a) {
  var divided = [];
  for (let i = 0; i < list.length; i++) {
    var nums = list[i];
    for (let j = 1; j < 10; j++) {
      nums[j] = nums[j] / a[j - 1];
    }
    divided.push(nums);
  }
  return divided;
}

function square(list) {
  var arrayCal = [];
  for (let i = 0; i < list.length; i++) {
    var nums = list[i];
    for (let j = 1; j < nums.length; j++) {
      nums[j] = nums[j] * nums[j];
    }
    arrayCal.push(nums);
  }
  return arrayCal;
}
