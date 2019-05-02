'use strict';

/*
POHDINTAOSIO
http://api.digitransit.fi/routing/v1/routers/hsl/
 */

// getting coordinates according to address
let inputFrom = document.getElementById('fromInput');
let inputTo = document.getElementById('whereInput');

document.getElementById("whereInput")
.addEventListener("keyup", function(event) {
  event.preventDefault();
  if (event.keyCode === 13) {
    document.getElementById("searchButton").click();
  }
});
let searchBtn = document.getElementById('searchButton');

searchBtn.addEventListener('click', getCoordinates);
let coordinates = {};
let boardings;

fetch('nousijamaara.geojson').then(function(response) {
  return response.json();
}).
    then(function(json) {
      boardings = json;
    });

function getCoordinates() {
  let inputFromValue = inputFrom.value;
  let inputToValue = inputTo.value;

  console.log('From ' + inputFromValue);
  console.log('To ' + inputToValue);

  fetchCoordinates(inputFromValue, 'from');
  fetchCoordinates(inputToValue, 'to');

}

function fetchCoordinates(input, inputType) {
  fetch(' https://nominatim.openstreetmap.org/search/' + input +
      '?format=json&addressdetails=1&limit=1&polygon_svg=1').
      then(function(response) {
        return response.json();
      }).
      then(function(json) {
        formatCoordinates(inputType, json);
      }).
      catch(function(error) {
        console.log(error);
      });
}

function formatCoordinates(inputType, json) {
  console.log(json);
  let coordinate = {
    lat: json[0].lat,
    lon: json[0].lon
  };

  coordinates[inputType] = coordinate;
  if (coordinates.from && coordinates.to) {
    console.log(coordinates);
    searchHSLRouting();
    placeMarkers();
  }
}


let markers;

function placeMarkers() {
  if (markers) { // check
    map.removeLayer(markers); // remove
  }
  markers   = L.layerGroup().addTo(map);

  let markerStart = new L.marker([coordinates.from.lat, coordinates.from.lon]).addTo(map);
  let markerEnd = new L.marker([coordinates.to.lat, coordinates.to.lon]).addTo(map);

  markers.addLayer(markerStart);
  markers.addLayer(markerEnd);

  let group = new L.featureGroup([markerStart, markerEnd]);
  map.fitBounds(group.getBounds());
}

function searchHSLRouting() {
  let time = getTime();
  // coordinates formatted 'lat,lon'
  let searchAdd = 'http://api.digitransit.fi/routing/v1/routers/hsl/plan?fromPlace=' +
      coordinates.from.lat + ',' + coordinates.from.lon + '&toPlace=' +
      coordinates.to.lat + ',' + coordinates.to.lon + '&time=' + time.time +
      '&date=' +
      time.date +
      '&mode=TRANSIT,WALK&maxWalkDistance=500&arriveBy=false&showIntermediateStops=true';
  console.log(searchAdd);

  let stopInfo;
  let stopsOnRoute;

  fetch(searchAdd).then(function(response) {
    return response.json();
  }).then(function(json) {
    stopInfo = sortByPeople(json);
    stopsOnRoute = routeCoordinates(json);
    printResults(stopInfo, stopsOnRoute);
  }).catch(function(error) {
    console.log(error);
    alert('Computer says no! Tarkista syöte');
  });
}

function sortByPeople(json) {
  // debug printing
  console.log('Reititys API ');
  console.log(json);
  console.log('Nousijamaara.geojson ');
  console.log(boardings);

  const itineraries = json.plan.itineraries;
  const boardingFeatures = boardings.features;
  let stopData = {};
  let stopDataForItineraries = [];

  for (let i = 0; i < itineraries.length; i++) {
    let itinerary = itineraries[i];
    let noStopAdded = true;
    for (let j = 0; j < itinerary.legs.length; j++) {
      let boarderAmount = ' ei tiedossa';
      let startingStop= ' ei tiedossa';
      let leg = itinerary.legs[j];
      if (leg.from.stopId && noStopAdded === true) {
        for (let k = 0; k < boardingFeatures.length; k++) {
          let boardingFeature = boardingFeatures[k];
          if (boardingFeature.properties.Lyhyt_tunn === leg.from.stopCode ||
              (boardingFeature.geometry.coordinates[0]).toFixed(4) ===
              leg.from.lon.toFixed(4) &&
              boardingFeature.geometry.coordinates[1].toFixed(4) ===
              leg.from.lat.toFixed(4)) {
            boarderAmount = boardingFeature.properties.Nousijamaa;
            startingStop = leg.from.stopCode;
            noStopAdded = false;
            break;
          }
        }
        stopData = {
          name: leg.from.name,
          code: startingStop,
          boarderCount: boarderAmount,
          lon: leg.from.lon,
          lat: leg.from.lat
        };
        noStopAdded = false;
        //console.log(stopData);
      }
    }
    stopDataForItineraries.push(stopData);
  }
  console.log(stopDataForItineraries);
  return stopDataForItineraries;
}

function routeCoordinates(json) {
  let coordinate = {};
  let stopsPerItinerary = [];

  const itineraries = json.plan.itineraries;

  for (let i = 0; i < itineraries.length; i++) {
    let stopsPerLeg = [];


    let itinerary = itineraries[i];

    for (let j = 0; j < itinerary.legs.length; j++) {

      let leg = itinerary.legs[j];
      let vehicle;

      if(leg.mode === 'FERRY') {
        vehicle = '';
      } else if (leg.mode === 'WALK') {
        vehicle = '';
      } else {
        vehicle = ' [' + leg.routeShortName + ']';
      }

      //'from' value
      coordinate = {
        name: leg.from.name,
        mode: leg.mode,
        vehicle: vehicle,
        lon: leg.from.lon,
        lat: leg.from.lat
      };
      stopsPerLeg.push(coordinate);

      // intermediate stops if they exist
      for (let k = 0; k < leg.intermediateStops.length; k++) {
        coordinate = {
          name: leg.intermediateStops[k].name,
          mode: leg.mode,
          vehicle: vehicle,
          lon: leg.intermediateStops[k].lon,
          lat: leg.intermediateStops[k].lat
        };
        stopsPerLeg.push(coordinate);
      }

      // 'to' value
      coordinate = {
        name: leg.to.name,
        mode: leg.mode,
        vehicle: vehicle,
        lon: leg.to.lon,
        lat: leg.to.lat
      };
      stopsPerLeg.push(coordinate);
    }
    stopsPerItinerary[i] = stopsPerLeg;
  }
  console.log(stopsPerItinerary);
  return stopsPerItinerary;
}


function getTime() {
  let date = new Date();
  let hours = date.getHours();
  let minutes = date.getMinutes();
  let year = date.getFullYear();
  let month = (date.getMonth() + 1);
  let day = date.getDate();

  if (hours < 10) {
    hours = '0' + hours;
  }
  if (minutes < 10) {
    minutes = '0' + minutes;
  }
  if (month < 10) {
    month = '0' + month;
  }
  if (day < 10) {
    day = '0' + day;
  }

  let timeAsString = hours + ':' + minutes;
  let dateAsString = month + '-' + day + '-' + year;

  return {
    time: timeAsString,
    date: dateAsString,
  };
}

function printResults(stopInfo, stopsOnRoute) {
  // get usable stop information to string (to be printed)
  let stopInfoString = '';
  for (let i = 0; i < stopInfo.length; i++) {
    if (stopInfoString.includes(stopInfo[i].code)) {
      continue;
    } else {
      if (isNaN(stopInfo[i].boarderCount)) {
        if (i === stopInfo.length -1) {
          stopInfoString += stopInfo[i].name + ' (' + stopInfo[i].code + ') - pysäkillä olevien ihmisten määrä ei ole tiedossa.';
        } else {
          stopInfoString += stopInfo[i].name + ' (' + stopInfo[i].code + ') - pysäkillä olevien ihmisten määrä ei ole tiedossa. <br>';
        }
      } else {
        if (i === stopInfo.length - 1) {
          stopInfoString += stopInfo[i].name + ' (' + stopInfo[i].code + ') - ' + stopInfo[i].boarderCount + ' ihmistä pysäkillä';
        } else {
          stopInfoString += stopInfo[i].name + ' (' + stopInfo[i].code + ') - ' + stopInfo[i].boarderCount + ' ihmistä pysäkillä<br>';
        }
      }
    }
  }

  // get intermediate stop information to string (to be printed)

  let stopsOnRouteList = '<div id="routes"><ul class="option"><li class="virtahepo"><ul><li>Vaihtoehto 1 </li><li> Pysäkki '+ stopInfo[0].code+'</li><li>Ihmimäärä: '+ stopInfo[0].boarderCount +'</li>' ;
  for (let j=0; j < stopsOnRoute.length; j++) {
    let vehicleClass = '';
    let stopsOnOneRoute = stopsOnRoute[j];
    for (let k = 1; k < stopsOnOneRoute.length-1; k++) {
      switch (stopsOnOneRoute[k].mode) {
        case 'WALK':
          vehicleClass ='walk';
          break;
        case 'BUS':
          vehicleClass ='bus';
          break;
        case 'SUBWAY':
          vehicleClass = 'subway';
          break;
        case 'FERRY':
          vehicleClass = 'ferry';
          break;
        case 'RAIL':
          vehicleClass = 'rail';
          break;
        case 'TRAM':
          vehicleClass = 'tram';
          break;
      }
      let x = k+1;
      if(stopsOnOneRoute[k].name === stopsOnOneRoute[x].name) {
        continue;
      } else if (k === stopsOnOneRoute.length-2) {
        stopsOnRouteList += '<li class="'+ vehicleClass +'">' + stopsOnOneRoute[k].name + stopsOnOneRoute[k].vehicle +'</li>';
      } else {
        stopsOnRouteList += '<li class ="' +vehicleClass +'">' + stopsOnOneRoute[k].name + stopsOnOneRoute[k].vehicle + '</li>';
      }
    }
    if (j < stopsOnRoute.length-1) {
      stopsOnRouteList += '</ul></li></li><li class="virtahepo"><ul><li>Vaihtoehto ' + (j+2) + '</li><li>Pysäkki ' + stopInfo[j+1].code + '</li><li>Ihmismäärä: '+ stopInfo[j+1].boarderCount +'</li>';
    }
  }
  stopsOnRouteList += '</li></ul></div>';

  let inputFromValue = toTitleCase(inputFrom.value);
  let inputToValue = toTitleCase(inputTo.value);

  const aside = document.getElementById('results');
  // render travel info to aside
  aside.innerHTML = '<div id="info"><h3>Matkan tiedot</h3>' +
      'Kohteesta: ' + inputFromValue + '<br>' +
      'Kohteeseen: ' + inputToValue + '<br>' +
      ' voit kulkea käyttämällä seuraavia pysäkkejä:' + '<br>' +
      stopInfoString +
      '<p id="showText" class="visible">Näytä pysäkit</p></div>'+
      '<div id ="showStops"></div>';

  // if user wants more information, show it & make aside bigger
  let showStopText = document.getElementById('showText');
  let showStopDiv = document.getElementById('showStops');
  showStopText.addEventListener('click', function() {
    aside.setAttribute('id', 'bigResults');
    showStopDiv.innerHTML = '<p class="underlined">Piilota pysäkit</p>'+stopsOnRouteList;
    showStopText.setAttribute('class', 'hidden');
  });

  // hide further travel information and make aside regular size again
  showStopDiv.addEventListener('click', function() {
    aside.setAttribute('id', 'results');
    showStopDiv.innerHTML = '';
    showStopText.setAttribute('class', 'visible');
  });
}

// fix all words to start with uppercase letter
// src: https://stackoverflow.com/questions/196972/convert-string-to-proper-case-with-javascript/196991#196991
function toTitleCase(str) {
  return str.replace(
      /\w\S*/g,
      function(txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
      }
  );
}