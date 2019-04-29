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
}

// Funktio, joka ajetaan, jos paikkatietojen hakemisessa tapahtuu virhe
function error(err) {
  console.warn(`ERROR(${err.code}): ${err.message}`);
}

// Käynnistetään paikkatietojen haku
navigator.geolocation.getCurrentPosition(success, error, options);

let startAddress = document.getElementById('searchButton');
startAddress.addEventListener('click', getAddressJson);

function getAddressJson() {
  let input = document.getElementById('fromInput');
  console.log('Haettu tiedolla ' + input.value);
  console.log('https://nominatim.openstreetmap.org/search.php?q=' + input.value);
  fetch(' https://nominatim.openstreetmap.org/search/' + input.value + '?format=json&addressdetails=1&limit=1&polygon_svg=1').
      then(function(response) {
        return response.json();
      }).
      then(function(json) {
        printJson(json);
      }).
      catch(function(error) {
        console.log(error);
      });
}

function printJson(json) {
  console.log(json);
  console.log(json[0].boundingbox[0])
}

let haku = document.getElementById('searchButton');
haku.addEventListener('click', getCoordinates);
let coordinates = {};
let boardings;

fetch('nousijamaara.geojson')
.then(function(response) {
  return response.json();
}).
    then(function(json) {
      boardings = json;
    });

const inputFrom = document.getElementById('fromInput')
const inputTo = document.getElementById('whereInput')

function getCoordinates() {
  let inputFromValue = inputFrom.value;
  let inputToValue = inputTo.value;

  console.log('From ' + inputFromValue);
  console.log('To ' + inputToValue);

  fetchCoordinates(inputFromValue, 'from');
  fetchCoordinates(inputToValue, 'to');
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
    placeMarkers();
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

let markers;

function placeMarkers() {
  if (markers) { // check
    map.removeLayer(markers); // remove
  }
  markers   = L.layerGroup().addTo(map);
  let crdSepFrom = [];
  crdSepFrom = coordinates.from.split(',');
  console.log(crdSepFrom);

  let markerStart = new L.marker([crdSepFrom[0], crdSepFrom[1]]).addTo(map);

  let crdSepTo = [];
  crdSepTo = coordinates.to.split(',');
  console.log(crdSepTo);

  let markerEnd = new L.marker([crdSepTo[0], crdSepTo[1]]).addTo(map);

  markers.addLayer(markerStart);
  markers.addLayer(markerEnd);

  let group = new L.featureGroup([markerStart, markerEnd]);
  map.fitBounds(group.getBounds());
}