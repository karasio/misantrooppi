'use strict';

/*
POHDINTAOSIO
http://api.digitransit.fi/routing/v1/routers/hsl/


http://api.digitransit.fi/routing/v1/routers/hsl/plan?
tällä esmes löytyy asioita:
http://api.digitransit.fi/routing/v1/routers/hsl/plan?
TÄMÄ MUUTTUVANA PALASENA:
fromPlace=60.17036, 24.93768&toPlace=60.191058, 24.914124&time=1:02pm&date=05-01-2019&mode=TRANSIT,WALK&maxWalkDistance=500&arriveBy=false

Reititys JSONissa json.plan.itineraries.legs[].from.stopCode vastaa ehkä
 nousijämäärän Lyhyt_tunn!!

1. vertaile lyhyt_tunn & stopCode
2. vertaile koordinaatit 4 numeron tarkkuudella
else : sori ei löydy.


 */

// getting coordinates according to address
let haku = document.getElementById('searchButton');
haku.addEventListener('click', getCoordinates);
let coordinates = {};
let boardings;

fetch('nousijamaara.geojson')
  .then(function(response) {
    boardings = response.json();
});


function getCoordinates() {
  let inputFrom = document.getElementById('fromInput').value;
  let inputTo = document.getElementById('whereInput').value;

  console.log('From ' + inputFrom);
  console.log('To ' + inputTo);

  fetchCoordinates(inputFrom, 'from');
  fetchCoordinates(inputTo, 'to');

}

function fetchCoordinates(input, inputType) {
  fetch(' https://nominatim.openstreetmap.org/search/' + input + '?format=json&addressdetails=1&limit=1&polygon_svg=1').
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

  coordinates[inputType]=json[0].boundingbox[0] + ',' + json[0].boundingbox[2];
  if (coordinates.from && coordinates.to) {
    console.log('toimii');
    console.log(coordinates);
    search();
  }

}

function search() {
  let time = getTime();
  let searchAdd = 'http://api.digitransit.fi/routing/v1/routers/hsl/plan?fromPlace=' +
  coordinates.from + '&toPlace=' + coordinates.to + '&time=' + time.time + '&date=' +
      time.date + '&mode=TRANSIT,WALK&maxWalkDistance=500&arriveBy=false&showIntermediateStops=false';
  console.log(searchAdd);

  fetch(searchAdd)
      .then(function(response){
        return response.json();
      }).then(function(json){
    sortByPeople(json);
  }).catch(function(error){
    console.log(error);
  });
}

function sortByPeople(json) {
  console.log('sortByPeoplessa!');
  console.log(json);
  const itineraries = json.plan.itineraries;
  const boardingFeatures = boardings.features;
  let boarderCount;

/*  for(let i = 0; i < itineraries.length; i++) {
    let itinerary = itineraries[i];
    for (let j = 0; j < itinerary.legs.length; j++) {
      let leg = itinerary.legs[j];
      for (let k = 0; k < boardingFeatures.length; k++) {
        let boardingFeature = boardingFeatures[k];
        if (boardingFeature.properties.Lyhyt_tunn === leg.from.stopCode || TAI KOORDINAATIT TÄSMÄÄ) {

        }
      }
    }
  }*/


  //let boardingByStop;

  /*
    let stopNames = json.plan.itineraries.legs[].from.stopCode;
   */
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
    time:  timeAsString,
    date: dateAsString,
  };
}