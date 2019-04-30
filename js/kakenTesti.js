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
        tulosta(inputType, json);
      }).
      catch(function(error) {
        console.log(error);
      });
}

function tulosta(inputType, json) {
  console.log(json);

  coordinates[inputType] = json[0].lat + ',' +
      json[0].lon;
  if (coordinates.from && coordinates.to) {
    console.log(coordinates);
    search();
  }
}

function search() {
  let time = getTime();
  let searchAdd = 'http://api.digitransit.fi/routing/v1/routers/hsl/plan?fromPlace=' +
      coordinates.from + '&toPlace=' + coordinates.to + '&time=' + time.time +
      '&date=' +
      time.date +
      '&mode=TRANSIT,WALK&maxWalkDistance=500&arriveBy=false&showIntermediateStops=true';
  console.log(searchAdd);

  fetch(searchAdd).then(function(response) {
    return response.json();
  }).then(function(json) {
    sortByPeople(json);
    routeCoordinates(json);
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
  let boarderCount;
  let leg;
  const boarderCountNotFound = 999999999999;

  for (let i = 0; i < itineraries.length; i++) {
    let itinerary = itineraries[i];
    for (let j = 0; j < itinerary.legs.length; j++) {
      let legTry = itinerary.legs[j];
      if (legTry.mode != 'WALK') {
        leg = legTry;
        break;
      }
    }
    for (let k = 0; k < boardingFeatures.length; k++) {
      let boardingFeature = boardingFeatures[k];
      if (boardingFeature.properties.Lyhyt_tunn === leg.from.stopCode ||
          (boardingFeature.geometry.coordinates[0]).toFixed(4) ===
          leg.from.lon.toFixed(4) &&
          boardingFeature.geometry.coordinates[1].toFixed(4) ===
          leg.from.lat.toFixed(4)) {
        //jos täsmää, halutaan nousijamäärä
        boarderCount = boardingFeature.properties.Nousijamaa;
        console.log(
            boarderCount + ' pysäkki: ' + boardingFeature.properties.Lyhyt_tunn + ' nimi: ' + boardingFeature.properties.Nimi);
      } else {
        boarderCount = boarderCountNotFound;
      }
    }
  }
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
      console.log(stopsPerLeg.length);
    }
    stopsPerItinerary[i] = stopsPerLeg;
  }
  console.log(stopsPerItinerary);
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