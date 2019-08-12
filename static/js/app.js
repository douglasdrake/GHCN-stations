// Douglas Drake

// Select the submit button
var submit = d3.select("#filter-btn");

console.log(submit);

submit.on("click", function() {
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

  d3.json(searchUrl).then((filteredData) => {
    console.log("Retrieved search results");
    // console.log(filteredData);
    // pick the table for the filtered results
    var fbody = d3.select("#filter-table");

    fbody.html("");
  
    filteredData.forEach((datum) => {
      // console.log(datum);
      var row = fbody.append("tr");
      Object.entries(datum).forEach(([key, value]) => {
        var cell = row.append("td");
        cell.text(value);
      });
    });
    
    function unpack(rows, key) {
      return rows.map(function(row) { return row[key]; });
    }

    var longitudes = unpack(filteredData, 'longitude');
    var latitudes = unpack(filteredData, 'latitude');
    var ids = unpack(filteredData, 'station_id');
    var names = unpack(filteredData, 'name');
    
    var data = [{
      type: 'scattermapbox',
      mode: 'markers',
      lon: longitudes,
      lat: latitudes,
      marker: {
        color: "red",
        opacity: 0.8,
        size: 10,
      },
      text: ids,
      name: 'GHCN Stations'
    }];

    var layout = {
      dragmode: 'zoom',
      mapbox: {
        center: {
          lat: inputLatitude,
          lon: inputLongitude
        },
        domain: {
          x: [0, 1],
          y: [0, 1]
        },
        style: 'stamen-terrain',
        zoom: 5
      },
      margin: {
        r: 0,
        t: 0,
        b: 0,
        l: 0,
        pad: 0
      },
      showlegend: false
   };
    //console.log(layout);
    Plotly.newPlot('stationmap', data, layout);
  });
});

function transformNumericInputs(userinput) {
  if (!userinput) {
    return userinput
  } else {
    return Number(userinput)
  }
}