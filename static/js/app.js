// Douglas Drake

// Select the submit button
var submit = d3.select("#filter-btn");

console.log(submit);

var stationsMap = null;

submit.on("click", function () {
  d3.event.preventDefault();

  // Select the input element and get the raw HTML node
  var weatherElement = d3.select("#weather");
  var firstDateElement = d3.select("#first_date");
  var lastDateElement = d3.select("#last_date");
  var longitudeElement = d3.select("#longitude");
  var latitudeElement = d3.select("#latitude");
  var radiusElement = d3.select("#radius");

  // Get the value property of the input element
  // The original version allowed for empty inputs
  var inputWeather = weatherElement.property("value");
  var inputFirstDate = Number(firstDateElement.property("value"));
  var inputLastDate = Number(lastDateElement.property("value"));
  var inputLongitude = transformNumericInputs(longitudeElement.property("value"));
  var inputLatitude = transformNumericInputs(latitudeElement.property("value"));
  var inputRadius = transformNumericInputs(radiusElement.property("value"));

  let searchUrl = `/find_stations/${inputWeather}+${inputFirstDate}+${inputLastDate}+${inputLongitude}+${inputLatitude}+${inputRadius}`;

  console.log(searchUrl);

  if (stationsMap && stationsMap.remove) {
    stationsMap.off();
    stationsMap.remove();
    // console.log("removed mySnowMap");
  }

  d3.json(searchUrl).then((filteredData) => {
    console.log("Retrieved search results");
    // console.log(filteredData);
    // pick the table for the filtered results
    var fbody = d3.select("#filter-table");

    fbody.html("");

    console.log(filteredData);
    console.log(typeof (filteredData));

    if (filteredData.length === 0) {
      console.log("No stations satisfy the search parameters.");
      var row = fbody.append("tr");
      var cell = row.append("td");
      cell.text("No stations found");
    }

    filteredData.forEach((datum) => {
      // console.log(datum);
      var row = fbody.append("tr");
      Object.entries(datum).forEach(([key, value]) => {
        var cell = row.append("td");
        cell.text(value);
      });
    });

    function unpack(rows, key) {
      return rows.map(function (row) {
        return row[key];
      });
    }

    var longitudes = unpack(filteredData, 'longitude');
    var latitudes = unpack(filteredData, 'latitude');
    var ids = unpack(filteredData, 'station_id');
    var names = unpack(filteredData, 'name');

    var center = [inputLatitude, inputLongitude];
    createFeatures(longitudes, latitudes, ids, names, center, inputRadius);

  });
});

function createFeatures(longitudes, latitudes, ids, names, mapCenter, mapRadius) {

  // create the marker layer of stations:
  var stationMarkers = new L.FeatureGroup();

  //console.log(Math.min(...longitudes), Math.max(...longitudes), Math.min(...latitudes), Math.max(...latitudes));
  //var southWest = L.LatLng(Math.min(...latitudes), Math.min(...longitudes));
  //var northEast = L.LatLng(Math.max(...latitudes), Math.max(...longitudes));
  //var bounds = L.latLngBounds(southWest, northEast);
  // console.log(bounds);

  for (var i = 0; i < longitudes.length; i++) {
    // loop through the arrays, create a new stations marker, and add it to the feature group 
    var stationMarker = L.marker([latitudes[i], longitudes[i]]).bindPopup("<h6>" + ids[i] + "<hr>" + names[i] + "</h6>").addTo(stationMarkers);
    //stationMarkers.push(
    //  L.marker([latitudes[i], longitudes[i]]).bindPopup("<h5>" + ids[i] + names[i] + "</h5>")
    //);
  }

  if (longitudes.length > 0) {
    var bounds = stationMarkers.getBounds();
  } else {
    var delta = mapRadius / 111; // 111 km  / degree of longitude or latitude
    var southWest = L.latLng(mapCenter[0] - delta, mapCenter[1] - delta);
    var northEast = L.latLng(mapCenter[0] + delta, mapCenter[1] + delta);
    var bounds = L.latLngBounds(southWest, northEast);
  }

  console.log(bounds);

  // var stationsLayer = L.layerGroup(stationMarkers);

  // Sending our stations layer to the createMap function
  createMap(stationMarkers, mapCenter, bounds);
}

function createMap(stationsLayer, mapCenter, bounds) {

  var streetMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012'
  });

  /*
  var outdoorsMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Physical_Map/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Source: US National Park Service',
    maxZoom: 8
  });
 */

  var satelliteMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 18
  });

  var grayscaleMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
    maxZoom: 18
  });

  // Define a baseMaps object to hold our base layers
  var baseMaps = {
    "Satellite": satelliteMap,
    "Gray Scale": grayscaleMap,
    "Street": streetMap
  };

  // Create overlay object to hold our overlay layer
  var overlayMaps = {
    'Stations': stationsLayer
  };

  // Create our map, giving it the grayscale and stations layers to display on load
  stationsMap = L.map("stationmap", {
    center: mapCenter,
    layers: [grayscaleMap, stationsLayer]
  });

  stationsMap.fitBounds(bounds);

  // Create a layer control
  // Pass in our baseMaps and overlayMaps
  // Add the layer control to the map
  L.control.layers(baseMaps, overlayMaps, {
    collapsed: false
  }).addTo(stationsMap);
}

function transformNumericInputs(userinput) {
  if (!userinput) {
    return userinput
  } else {
    return Number(userinput)
  }
}