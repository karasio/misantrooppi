'use strict';

// getting coordinates according to address
let inputFrom = document.getElementById('fromInput');
let inputTo = document.getElementById('whereInput');

// trigger searchButton with return key stroke
document.getElementById("whereInput")
.addEventListener("keyup", function(event) {
  event.preventDefault();
  if (event.keyCode === 13) {
    document.getElementById("searchButton").click();
  }
});

// setting up locationing
let map = L.map('map').setView([60.192059,24.945831], 13);

let normalTiles = L.tileLayer('https://cdn.digitransit.fi/map/v1/{id}/{z}/{x}/{y}.png', {
  attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
      '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
  maxZoom: 19,
  tileSize: 512,
  zoomOffset: -1,
  id: 'hsl-map'}).addTo(map);

const options = {
  enableHighAccuracy: true,
  timeout: 5000,
  maximumAge: 0
};

// Funktio, joka ajetaan, kun paikkatiedot on haettu
function success(pos) {
  const crd = pos.coords;

  // Tulostetaan paikkatiedot konsoliin
  console.log('Your current position is:');
  console.log(`Latitude : ${crd.latitude}`);
  console.log(`Longitude: ${crd.longitude}`);
  console.log(`More or less ${crd.accuracy} meters.`);
  let coordinates =
      {
        lat: crd.latitude,
        lon: crd.longitude
      };
  localStorage.setItem('coordinates',
      JSON.stringify(coordinates));

}

// Funktio, joka ajetaan, jos paikkatietojen hakemisessa tapahtuu virhe
function error(err) {
  console.warn(`ERROR(${err.code}): ${err.message}`);
}

// Käynnistetään paikkatietojen haku
navigator.geolocation.getCurrentPosition(success, error, options);

let searchBtn = document.getElementById('searchButton');
let locateBtn = document.getElementById('locateButton');
let coordinates = {};

locateBtn.addEventListener('click', function() {
  inputFrom.value = 'Oma sijainti';
});

searchBtn.addEventListener('click', getCoordinates);

// get nousijamaara.geojson
let boardings;
fetch('nousijamaara.geojson').then(function(response) {
  return response.json();
}).
    then(function(json) {
      boardings = json;
    });

function getCoordinates() {
  coordinates = {};
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
  let coordinate
  console.log(json);
  if(inputType === 'from' && inputFrom.value === 'Oma sijainti'){
    let coordinatesStr = localStorage.getItem('coordinates');
    let coordinates = JSON.parse(coordinatesStr);
    coordinate = {
      lat: coordinates.lat,
      lon: coordinates.lon
    };
  }else {
    coordinate = {
      lat: json[0].lat,
      lon: json[0].lon
    };
  }
  console.log(coordinate);

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
  markers = L.layerGroup().addTo(map);

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
    printResults(stopInfo, stopsOnRoute, json);
  }).catch(function(error) {
    console.log(error);
    document.getElementById('errorMsg').innerHTML = 'Jotain meni pieleen. Kokeile kirjoittaa osoitteen perään kaupunki.';
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
    let startingStop;
    for (let j = 0; j < itinerary.legs.length; j++) {
      let boarderAmount = ' ei tiedossa';
      let leg = itinerary.legs[j];
      if (leg.from.stopId && noStopAdded === true) {
        for (let k = 0; k < boardingFeatures.length; k++) {
          let boardingFeature = boardingFeatures[k];
          if (!leg.from.stopCode) {
            startingStop = ' ei tiedossa';
          } else {
            startingStop = leg.from.stopCode;
          }
          if (boardingFeature.properties.Lyhyt_tunn === leg.from.stopCode ||
              (boardingFeature.geometry.coordinates[0]).toFixed(4) ===
              leg.from.lon.toFixed(4) &&
              boardingFeature.geometry.coordinates[1].toFixed(4) ===
              leg.from.lat.toFixed(4)) {
            boarderAmount = boardingFeature.properties.Nousijamaa;
            noStopAdded = false;
            break;
          }
        }
        stopData = {
          name: leg.from.name,
          code: startingStop,
          boarderCount: boarderAmount,
          lon: leg.from.lon,
          lat: leg.from.lat,
          startTime: leg.startTime,
          endTime: itinerary.endTime
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
      let nameFrom = leg.from.name;
      let nameTo = leg.to.name;

      if(leg.mode === 'FERRY' || leg.mode === 'WALK') {
        vehicle = '';
      } else {
        vehicle = ' [' + leg.routeShortName + ']';
      }

      // change origin and destination value name to input values
      if (j === 0) {
        nameFrom = 'Lähtöpaikka';
      } else if ( j === (itinerary.legs.length-1)) {
        nameTo = 'Määränpää';
      }

      //'from' value
      coordinate = {
        name: nameFrom,
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
        name: nameTo,
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
  drawRoute(json, 0);
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

function printResults(stopInfo, stopsOnRoute, json) {
  // get intermediate stop information to string (to be printed)
  let start = stopInfo[0].startTime; //bussin lähtöaika
  let end = stopInfo[0].endTime; // millon perillä kävelyineen
  console.log("Bussi lähtee: " + getTimes(start));
  console.log("Perillä: "+ getTimes(end));
  let amountOfPeople = numberOfPeople(stopInfo[0].boarderCount);
  let stopsOnRouteList =
      '<div id="lower">' +
      '<ul class="option">' +
      '<li class="virtahepo">'+
      '<ul class ="innerOption">' +
      '<li>Vaihtoehto 1 </li>' +
      '<li> Pysäkki: '+ stopInfo[0].code+'</li>' +
      '<li>Ihmismäärä: '+ amountOfPeople +'</li>' +
      '<li>Lähtöaika: '+ getTimes(start) +'</li>';
  for (let j=0; j < stopsOnRoute.length; j++) {
    let vehicleClass = '';
    let stopsOnOneRoute = stopsOnRoute[j];
    for (let k = 0; k < stopsOnOneRoute.length; k++) {
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
      if((k > 0) && (x < stopsOnOneRoute.length) && (stopsOnOneRoute[k].name === stopsOnOneRoute[x].name)) {
        continue;
      } else if (k === stopsOnOneRoute.length-1) {
        if (stopsOnOneRoute[k].vehicle != stopsOnOneRoute[k-1].vehicle) {
          stopsOnRouteList += '<li>----</li>';
        }
        stopsOnRouteList += '<li class="'+ vehicleClass +'">' + stopsOnOneRoute[k].name + stopsOnOneRoute[k].vehicle +'</li>';
      } else {
        if ((k > 0) && (stopsOnOneRoute[k].vehicle != stopsOnOneRoute[k-1].vehicle)) {
          stopsOnRouteList += '<li>----</li>';
        }
        stopsOnRouteList += '<li class ="' +vehicleClass +'">' + stopsOnOneRoute[k].name + stopsOnOneRoute[k].vehicle + '</li>';
      }
    }
    if (j < stopsOnRoute.length-1) {
      start = stopInfo[j+1].startTime; //bussin lähtöaika
      end = stopInfo[j+1].endTime; //millon perillä kävelyineen
      //console.log("Bussi lähtee: " + getTimes(start));
      //console.log("Perillä: "+ getTimes(end));
      amountOfPeople = numberOfPeople(stopInfo[j+1].boarderCount);
      stopsOnRouteList +=
          '<li>Perillä: ' + getTimes(stopInfo[j+1].endTime) + '</li>' +
          '</ul>' +
          '</li>' +
          '</li>' +
          '<li class="virtahepo">' +
          '<ul class="innerOption">' +
          '<li>Vaihtoehto ' + (j+2) + '</li>' +
          '<li>Pysäkki ' + stopInfo[j+1].code + '</li>' +
          '<li>Ihmismäärä: '+ amountOfPeople +'</li>' +
          '<li>Lähtöaika: ' + getTimes(stopInfo[j+1].startTime) + '</li>';
    }
  }
  stopsOnRouteList +=
      '<li>Perillä: ' + getTimes(end) + '</li>' +
      '</ul>' +
      '</div>';

  let inputFromValue = toTitleCase(inputFrom.value);
  let inputToValue = toTitleCase(inputTo.value);

  let aside;
  if (document.getElementById("results") != null) {
    aside = document.getElementById('results');
  }else {
    aside = document.getElementById('bigResults');
  }

  let headerText = document.getElementById('headerText');
  headerText.innerHTML = '';

  let info = document.getElementById('info');
  let moreInfo = document.getElementById('moreInfo');
  info.innerHTML = '<div class="upper"><h3>Matkan tiedot</h3>' +
      'Kohteesta: ' + inputFromValue + '<br>' +
      'Kohteeseen: ' + inputToValue + '<br>' +
      '<p id="showText" >Näytä pysäkit</p></div>';

  moreInfo.innerHTML = '<div class="upper"><h3>Matkan tiedot</h3>' +
      'Kohteesta: ' + inputFromValue + '<br>' +
      'Kohteeseen: ' + inputToValue + '<br>' +
      '<div id="hideText" >Piilota pysäkit<img id=hideTextIcon src="media/closesmall.png"></div></div>' + stopsOnRouteList;

  getRouteOptionElements(json);

  let showStopText = document.getElementById('showText');
  showStopText.addEventListener('click', function() {
    aside.setAttribute('id', 'bigResults');
    info.setAttribute('class', 'hidden');
    moreInfo.setAttribute('class', 'visible');
  });

  let hideStopText = document.getElementById('hideText');
  hideStopText.addEventListener('click', function() {
    aside.setAttribute('id', 'results');
    info.setAttribute('class', 'visible');
    moreInfo.setAttribute('class', 'hidden');
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
function numberOfPeople(peoplePerDay){
  let time = getTime();
  let hour = time.hours;
  if (peoplePerDay === " ei tiedossa"){
    return " ei tiedossa"
  }
  peoplePerDay /=24;
  if (hour < 6){ //00-05:59
    return Math.floor(peoplePerDay/10)
  }else if (hour < 10 || hour >= 14 && hour < 18){ //6:00-9:59 & 14:00-17:59
    return Math.floor(peoplePerDay/2)
  }else if (hour < 14 || hour >= 18 && hour < 21){ //10:00-13:59 & 18:00-20:59
    return Math.floor(peoplePerDay/3)
  }else{ // 21-23:59
    return Math.floor(peoplePerDay/5)
  }
}
function getTimes(time) {
  let date = new Date(time);
  let hours = date.getHours();
  let minutes = date.getMinutes();
  if (hours < 10) {
    hours = '0' + hours;
  }
  if (minutes < 10) {
    minutes = '0' + minutes;
  }
  let timeString = hours + ':' + minutes;
  return timeString;
}

let routeLayer;

function drawRoute(json, index) {
  if (routeLayer) { // check
    map.removeLayer(routeLayer); // remove
  }
  routeLayer = L.layerGroup().addTo(map);

  console.log(json);
  //MUISTA VAIHTAA MUUTTUJAKSI
  let legs = json.plan.itineraries[index].legs;
  for (let i = 0; i < legs.length; i++) {
    let fromCrd = {
      lat: legs[i].from.lat,
      lon: legs[i].from.lon,
    };

    let toCrd = {
      lat: legs[i].to.lat,
      lon: legs[i].to.lon,
    };

    routeMarkers(toCrd);

    if (legs[i].mode == 'WALK') {
      routeWalks(fromCrd, toCrd);
    } else {
      routePub(legs[i].intermediateStops, fromCrd, toCrd);
    }
  }
}

function routeWalks(fromCrd, toCrd) {
  let router = L.Routing.mapbox(
      'pk.eyJ1IjoiZWxlYW4iLCJhIjoiY2p2ODMwZWR1MDMzajQ0bXRlMXYwbnpreSJ9.IWZKqC-mBbnFZbd2jqxFHw',
      {
        profile: 'mapbox/walking',
      }), waypoints = [], line;
  waypoints.push({latLng: L.latLng(fromCrd)});
  waypoints.push({latLng: L.latLng(toCrd)});

  router.route(waypoints, function(err, routes) {
    if (line) {
      map.removeLayer(line);
    }
    if (err) {
      alert(err);
    } else {
      line = L.Routing.line(routes[0]).addTo(map);
      routeLayer.addLayer(line);
    }
  });
}

function routePub(stops, fromCrd, toCrd) {
  let crds = [fromCrd];
  for (let i = 0; i < stops.length; i++) {
    crds.push([stops[i].lat, stops[i].lon]);
  }
  crds.push(toCrd);
  let line = L.polyline(crds, {color: 'blue'}).addTo(map);
  routeLayer.addLayer(line);
}

function routeMarkers(toCrd) {
  let marker = L.marker(toCrd).addTo(map);
  routeLayer.addLayer(marker);
}

//routeWalks actually just draws lines, no need for routing control for now. Maybe later if we add route instructions
function routeWalksControl(fromCrd, toCrd) {
  // L.Routing.control({
  //   waypoints: [
  //     L.latLng(fromCrd),
  //     L.latLng(toCrd),
  //   ],
  //   show: false,
  //   routeWhileDragging: false,
  //   fitSelectedRoutes: false,
  //   draggableWaypoints: false,
  //   addWaypoints: false,
  //   router: L.Routing.mapbox(
  //       'pk.eyJ1IjoiZWxlYW4iLCJhIjoiY2p2ODMwZWR1MDMzajQ0bXRlMXYwbnpreSJ9.IWZKqC-mBbnFZbd2jqxFHw',
  //       {
  //         profile: 'mapbox/walking',
  //       }),
  // }).addTo(map);
}

let routeOptions = [];

function getRouteOptionElements(json) {
  routeOptions = document.getElementsByClassName('routeOption');
  console.log(routeOptions);
  for (let i = 0; i < routeOptions.length; i++) {
    routeOptions[i].addEventListener('click', function() {
      console.log('You clicked ' + i);
      darkenSelected(i);
      drawRoute(json, i);
    });
  }
}

function darkenSelected(index) {
  console.log(routeOptions);
  console.log(index);
  console.log(routeOptions[index]);
  console.log(routeOptions[index].classList);
  routeOptions[index].classList.add('routeOptionSelected');
  console.log(routeOptions[index].classList);

  for (let i = 0; i < routeOptions.length; i++) {
    if (i != index) {
      routeOptions[i].classList.remove('routeOptionSelected');
    }
  }
}
