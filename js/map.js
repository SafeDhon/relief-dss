let routes = [];
var array = [];
var searchWidget;
var destination = {
  name: "",
  lat: "",
  lon: "",
};

function onFormSubmit() {
  var formData = readFormData();
  insertNewRecord(formData);
  array.push(formData);

  resetForm();
}

function readFormData() {
  var formData = {};
  switch (document.getElementById("origin").value) {
    case "1":
      formData["origin"] = {
        name: "Wing 1",
        lat: "14.933684731379884",
        lon: "102.07947518247819",
      };
      break;
    case "2":
      formData["origin"] = {
        name: "Wing 2",
        lat: "14.87641863564365",
        lon: "100.66157649729531",
      };
      break;
    case "3":
      formData["origin"] = {
        name: "Wing 3",
        lat: "13.767547008210618",
        lon: "102.31492673652411",
      };
      break;
    case "4":
      formData["origin"] = {
        name: "Wing 4",
        lat: "15.272893251884021",
        lon: "100.29383218229158",
      };
      break;
    case "5":
      formData["origin"] = {
        name: "Wing 5",
        lat: "11.788084010661981",
        lon: "99.80205616563349",
      };
      break;
    case "6":
      formData["origin"] = {
        name: "Wing 6",
        lat: "13.917613607969823",
        lon: "100.6116966105257",
      };
    case "7":
      formData["origin"] = {
        name: "Wing 7",
        lat: "9.135717628040357",
        lon: "99.13872913052816",
      };
      break;
    case "21":
      formData["origin"] = {
        name: "Wing 21",
        lat: "15.252518782946817",
        lon: "104.87009591560951",
      };
      break;
    case "23":
      formData["origin"] = {
        name: "Wing 23",
        lat: "17.38607639729809",
        lon: "102.78823970076459",
      };
      break;
    case "41":
      formData["origin"] = {
        name: "Wing 41",
        lat: "18.76791114093809",
        lon: "98.96336883207208",
      };
      break;
    case "46":
      formData["origin"] = {
        name: "Wing 46",
        lat: "16.78408490031579",
        lon: "100.27838864348418",
      };
      break;
    case "56":
      formData["origin"] = {
        name: "Wing 56",
        lat: "6.933180738451383",
        lon: "100.39408599529503",
      };
      break;
    default:
      formData["origin"] = {
        name: "Wing 0",
        lat: "",
        lon: "",
      };
  }

  formData["destination"] = {
    name: destination.name,
    lat: destination.lat,
    lon: destination.lon,
  };
  formData["vehicle"] = document.getElementById("vehicle").value;
  formData["bags"] = document.getElementById("bags").value;
  return formData;
}

function insertNewRecord(data) {
  var table = document
    .getElementById("routeList")
    .getElementsByTagName("tbody")[0];
  var newRow = table.insertRow(table.lenght);
  cell1 = newRow.insertCell(0);
  cell1.innerHTML = data.origin.name;
  cell2 = newRow.insertCell(1);
  cell2.innerHTML = data.destination.name;
  cell3 = newRow.insertCell(2);
  cell3.innerHTML = data.vehicle;
  cell4 = newRow.insertCell(3);
  cell4.innerHTML = data.bags;
  cell4 = newRow.insertCell(4);
  cell4.innerHTML = `<button class="delete-btn" onClick="onDelete(this)">Delete</button>`;
}

function resetForm() {
  document.getElementById("origin").value = "";
  document.getElementById("vehicle").value = "";
  document.getElementById("bags").value = "";
  searchWidget.clear();
  destination = {
    name: "",
    lat: "",
    lon: "",
  };
  // document.getElementById("searchDiv").value = "";
}

function onDelete(td) {
  if (confirm("Are you sure to delete this record ?")) {
    row = td.parentElement.parentElement;
    array.splice(row.rowIndex - 1, 1);
    document.getElementById("routeList").deleteRow(row.rowIndex);
    resetForm();
  }
}

require([
  "esri/config",
  "esri/Map",
  "esri/views/MapView",
  "esri/widgets/Expand",
  "esri/widgets/Search",
  "esri/widgets/BasemapGallery",
  "esri/layers/GraphicsLayer",
  "esri/rest/support/RouteParameters",
  "esri/rest/support/FeatureSet",
], function (
  esriConfig,
  Map,
  MapView,
  Expand,
  Search,
  BasemapGallery,
  GraphicsLayer,
  RouteParameters,
  FeatureSet
) {
  // Insert the API Key here (inside the double quotes) to use it for ArcgGIS JS API Routing services:
  esriConfig.apiKey = "";

  // const routeUrl =
  //   "https://route-api.arcgis.com/arcgis/rest/services/World/Route/NAServer/Route_World";

  const routeLayer = new GraphicsLayer();

  // const routeParams = new RouteParameters({
  //   // An authorization string used to access the routing service
  //   apiKey:
  //     "mzFcMRqhxzPAoRJavp2MJgWaOIwJc62NZPppgw6EjU8vMXGZa7y-20lE1ND9vYP_dLErDS2x5F7lC9F1e6SQeeYBXzqvBTxEoucREiSSXLbWJF-D3OkJ0vQtpJRL3q590e86lp4y9GQeKdKl77DYZn0PuKz4R2qHAVLXhBWyemV7hof8rGUgyZc9slhW1s-M",
  //   stops: new FeatureSet(),
  //   outSpatialReference: {
  //     // autocasts as new SpatialReference()
  //     wkid: 3857,
  //   },
  // });

  const map = new Map({
    basemap: "arcgis-navigation",
    layers: [routeLayer],
  });

  // Create a MapView:
  const view = new MapView({
    center: [101.18711765547901, 14.652250244949958],
    zoom: 13,
    container: "viewDiv",
    map: map,
  });

  let basemapGallery = new BasemapGallery({
    view: view,
  });
  const expandBasemapGallery = new Expand({
    view: view,
    content: basemapGallery,
  });
  view.ui.add(expandBasemapGallery, {
    position: "bottom-left",
  });

  searchWidget = new Search({
    view: view,
    container: "searchDiv",
  });

  const addBoxDiv = document.getElementById("addBoxDiv");
  const expandAddBox = new Expand({
    content: addBoxDiv,
    expanded: true,
  });
  view.when(() => {
    view.ui.add(expandAddBox, "top-right");
  });

  const routeListDiv = document.getElementById("routeListDiv");
  const expandrouteList = new Expand({
    content: routeListDiv,
    expanded: false,
  });
  view.when(() => {
    view.ui.add(expandrouteList, "bottom-right");
  });

  searchWidget.on("search-complete", function (result) {
    var geom = result.results[0].results[0].feature.geometry;
    var desName = result.results[0].results[0].name;
    // json.destination.lat = geom.latitude;
    // json.destination.long = geom.longitude;
    // localStorage.setItem('desLat', geom.latitude)
    // localStorage.setItem('desLon', geom.longitude)
    destination.name = desName;
    destination.lat = geom.latitude;
    destination.lon = geom.longitude;
    // localStorage.setItem(
    //   "myObject",
    //   JSON.stringify({ desLat: geom.latitude, desLon: geom.longitude })
    // );
  });
});
