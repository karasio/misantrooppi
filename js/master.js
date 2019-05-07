'use strict';

// getting user input address / place name
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

// function that gets called after position is located
function success(pos) {
  const crd = pos.coords;

  // Print coordinates to console.
  console.log('Your current position is:');
  console.log(`Latitude : ${crd.latitude}`);
  console.log(`Longitude: ${crd.longitude}`);
  console.log(`More or less ${crd.accuracy} meters.`);
  //Saves coordinates for later use
  let coordinates =
      {
        lat: crd.latitude,
        lon: crd.longitude
      };
  localStorage.setItem('coordinates',
      JSON.stringify(coordinates));

}

// Function that is called when location does not work.
function error(err) {
  document.getElementById('errorMsg').innerHTML = 'Paikannustietojen hakemisessa tapahtui virhe. Kirjoita lähtösijainti';
  console.warn(`ERROR(${err.code}): ${err.message}`);
}

// Starts locating user.
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
  /*
  transforms addresses to coordinates.
   */
  document.getElementById('errorMsg').innerHTML = '<br>';
  coordinates = {};
  let inputFromValue = inputFrom.value;
  let inputToValue = inputTo.value;

  console.log('From ' + inputFromValue);
  console.log('To ' + inputToValue);

  fetchCoordinates(inputFromValue, 'from');
  fetchCoordinates(inputToValue, 'to');
}

function fetchCoordinates(input, inputType) {

  //Sends locations to nominatim

  fetch(' https://nominatim.openstreetmap.org/search/' + input +
      '?format=json&addressdetails=1&limit=1&polygon_svg=1').
      then(function(response) {
        return response.json();
      }).
      then(function(json) {
        formatCoordinates(inputType, json);
      }).
      catch(function(error) {
        document.getElementById('errorMsg').innerHTML = 'Sijaintia ei löydy';
        console.log(error);
      });
}

function formatCoordinates(inputType, json) {
  //Transforms locations to coordinates, places markers and starts routing
  let coordinate;
  console.log(json);
  if(inputType === 'from' && inputFrom.value === 'Oma sijainti'){
    // if user wants to use own location, gets located coordinates
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
  //Places markers on starting and end position of the selected route.
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
  // Sends coordinates to digitransit and handles routing.
  let time = getTime();
  // coordinates formatted 'lat,lon'
  let searchAdd = 'https://api.digitransit.fi/routing/v1/routers/hsl/plan?fromPlace=' +
      coordinates.from.lat + ',' + coordinates.from.lon + '&toPlace=' +
      coordinates.to.lat + ',' + coordinates.to.lon + '&time=' + time.time +
      '&date=' +
      time.date +
      '&mode=TRANSIT,WALK&maxWalkDistance=1000&arriveBy=false&showIntermediateStops=true';
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
  // Gets amount of people at stops
  // debug printing
  console.log('Reititys API ');
  console.log(json);
  console.log('Nousijamaara.geojson ');
  console.log(boardings);

  const itineraries = json.plan.itineraries;
  const boardingFeatures = boardings.features;
  let stopData = {};
  let stopDataForItineraries = [];

  for (let i = 0; i < itineraries.length; i++) {                      // iterate through different route options
    let itinerary = itineraries[i];
    let noStopAdded = true;
    let startingStop;
    for (let j = 0; j < itinerary.legs.length; j++) {                 // iterate through intermediate stops on one route
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
  /*
  intermediate stops on route to one file
   */
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
  //returns current time (hh:mm and mm-dd-yyyy)
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
  let start = stopInfo[0].startTime; // time when bus is on your stop (ms from 1970)
  let end = stopInfo[0].endTime; // arrival time (ms from 1970)
  console.log("Bussi lähtee: " + getTimes(start));
  console.log("Perillä: "+ getTimes(end));
  let amountOfPeople = numberOfPeople(stopInfo[0].boarderCount); // calculates amount of people at your stop currently.

  //Prints first options information.
  let stopsOnRouteList =
      '<div id="lower">' +
      '<ul class="option">' +
      '<li class="virtahepo">'+
      '<ul class ="innerOption">' +
      '<li class="routeOption routeOptionSelected" id="routeOption0">Vaihtoehto 1 </li>' +
      '<li> Pysäkki: '+ stopInfo[0].code+'</li>' +
      '<li>Ihmismäärä: '+ amountOfPeople +'</li>' +
      '<li>Lähtöaika: '+ getTimes(start) +'</li>';

  // Goes through all of the stops, prints those and vehicles used etc.
  for (let j=0; j < stopsOnRoute.length; j++) {
    let vehicleClass = '';
    let stopsOnOneRoute = stopsOnRoute[j];
    for (let k = 0; k < stopsOnOneRoute.length; k++) {
      // determines vechileClass which is used to get correct image infront of legs.
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
      // prints "----" every time you change vehicle or start walking again.
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
      start = stopInfo[j+1].startTime; // when bus is at your stop (ms from 1970)
      end = stopInfo[j+1].endTime; // arrival time (ms from 1970)
      amountOfPeople = numberOfPeople(stopInfo[j+1].boarderCount);
      stopsOnRouteList +=
          // prints infos for options 2-3 if needed.
          '<li>Perillä: ' + getTimes(stopInfo[j+1].endTime) + '</li>' +
          '</ul>' +
          '</li>' +
          '</li>' +
          '<li class="virtahepo">' +
          '<ul class="innerOption">' +
          '<li class="routeOption" id="routeOption">Vaihtoehto ' + (j+2) + '</li>' +
          '<li>Pysäkki ' + stopInfo[j+1].code + '</li>' +
          '<li>Ihmismäärä: '+ amountOfPeople +'</li>' +
          '<li>Lähtöaika: ' + getTimes(stopInfo[j+1].startTime) + '</li>';
    }
  }
  stopsOnRouteList +=
      // prints when you will arrive to your destination
      '<li>Perillä: ' + getTimes(end) + '</li>' +
      '</ul>' +
      '</div>';

  let inputFromValue = toTitleCase(inputFrom.value);
  let inputToValue = toTitleCase(inputTo.value);

  let aside;
  // makes sure that correct result is visible when user searches again.
  if (document.getElementById("results") != null) {
    aside = document.getElementById('results');
  }else {
    aside = document.getElementById('bigResults');
  }

  let headerText = document.getElementById('headerText');
  headerText.innerHTML = '';

  let info = document.getElementById('info');
  let moreInfo = document.getElementById('moreInfo');
  // prints some information above results like what locations you used to get results.
  info.innerHTML = '<div class="upper"><h3>Matkan tiedot</h3>' +
      'Kohteesta: ' + inputFromValue + '<br>' +
      'Kohteeseen: ' + inputToValue + '<br>' +
      '<p id="showText" >Näytä pysäkit</p></div>';

  moreInfo.innerHTML = '<div class="upper"><h3>Matkan tiedot</h3>' +
      'Kohteesta: ' + inputFromValue + '<br>' +
      'Kohteeseen: ' + inputToValue + '<br>' +
      '<div id="hideText" >Piilota pysäkit<img id=hideTextIcon src="media/closesmall.png"></div></div>' + stopsOnRouteList;

  getRouteOptionElements(json);
  // Determines if "result" or "bigresult" should be visible.
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
  // Calculates how many people are waiting at stop currently and returns it.
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
  //take milliseconds as an argument and returns time (hh:mm) for arrival and leaving times.
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

let routeLayer; //Layer to contain all the polylines of route. Required so one
//can remove them later


//Removes the old polylines and draws new polylines between every stop of the
//route
function drawRoute(json, index) {
  if (routeLayer) { // check
    map.removeLayer(routeLayer); // remove
  }
  routeLayer = L.layerGroup().addTo(map);

  console.log(json);
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

    routeMarkers(toCrd); //add marker at the end of the leg

    if (legs[i].mode == 'WALK') {
      routeWalks(fromCrd, toCrd);
    } else {
      routePub(legs[i].intermediateStops, fromCrd, toCrd);
    }
  }
}

//Routes walking portions of the route utilizing mapobox and leaflet routing machine
function routeWalks(fromCrd, toCrd) {
  //set router
  let router = L.Routing.mapbox(
      'pk.eyJ1IjoiZWxlYW4iLCJhIjoiY2p2ODMwZWR1MDMzajQ0bXRlMXYwbnpreSJ9.IWZKqC-mBbnFZbd2jqxFHw',
      {
        profile: 'mapbox/walking',
      }), waypoints = [], line;
  //add starting and end coordinates of the walk
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

//Routes public transport portions
function routePub(stops, fromCrd, toCrd) {
  let crds = [fromCrd];
  for (let i = 0; i < stops.length; i++) {
    crds.push([stops[i].lat, stops[i].lon]);
  }
  crds.push(toCrd);
  let line = L.polyline(crds, {color: 'blue'}).addTo(map);
  routeLayer.addLayer(line);
}

//adds marker to wanted coordinate
function routeMarkers(toCrd) {
  let marker = L.marker(toCrd).addTo(map);
  routeLayer.addLayer(marker);
}

let routeOptions = [];

//adds clicking to route options so you can select which route to draw on screen
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

//darkens the selected route in the route options menu to indicate which route
//is being shown on screen
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

let closeButton = document.getElementById('closeInput');
let searchInput = document.getElementById('searchInput');

closeButton.addEventListener('click', openClose);

//Adds menu for mobile in which you can expand and collapse the search fuction
function openClose(evt) {
  if (searchInput.classList.contains('hidden')) {
    searchInput.setAttribute('class', 'visible');
     closeButton.setAttribute('class', 'collapse');
  } else  {
    searchInput.setAttribute('class', 'hidden');
    closeButton.setAttribute('class', 'expand');
  }
}
