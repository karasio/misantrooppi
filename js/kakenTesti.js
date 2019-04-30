'use strict';

/*
POHDINTAOSIO
http://api.digitransit.fi/routing/v1/routers/hsl/
 */

// getting coordinates according to address
let haku = document.getElementById('searchButton');
let inputFrom = document.getElementById('fromInput');
let inputTo = document.getElementById('whereInput')

haku.addEventListener('click', getCoordinates);
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
  }
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
      let boarderAmount;
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
            noStopAdded = false;
            break;
          }
        }
        stopData = {
          name: leg.from.name,
          code: leg.from.stopCode,
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

      //'from' value
      coordinate = {
        name: leg.from.name,
        lon: leg.from.lon,
        lat: leg.from.lat
      };
      stopsPerLeg.push(coordinate);

      // intermediate stops if they exist
      for (let k = 0; k < leg.intermediateStops.length; k++) {
        coordinate = {
          name: leg.intermediateStops[k].name,
          lon: leg.intermediateStops[k].lon,
          lat: leg.intermediateStops[k].lat
        };
        stopsPerLeg.push(coordinate);
      }

      // 'to' value
      coordinate = {
        name: leg.to.name,
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
  let stopInfoString = '';
  for (let i = 0; i < stopInfo.length; i++) {
    if (stopInfoString.includes(stopInfo[i].name)) {
      continue;
    } else {
      if (i === stopInfo.length-1) {
        stopInfoString += stopInfo[i].name + ' - ' + stopInfo[i].boarderCount + ' ihmistä pysäkillä';
      } else {
        stopInfoString += stopInfo[i].name + ' - ' + stopInfo[i].boarderCount + ' ihmistä pysäkillä<br>';
      }
    }
  }

  const aside = document.getElementById('results');
  aside.innerHTML = '<p><h2>Matkan tiedot</h2><br>' +
      'Kohteesta: ' + inputFrom.value.charAt(0).toUpperCase() + inputFrom.value.slice(1) + '<br>' +
      ' kohteeseen ' + inputTo.value.charAt(0).toUpperCase() + inputTo.value.slice(1) + '<br>' +
      ' voit kulkea käyttämällä seuraavia pysäkkejä:' + '<br>' +
      stopInfoString +
      '</p>';
}
