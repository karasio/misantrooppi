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

function placeMarker(lat, lng) {
  var marker = L.marker([lat, lng]).addTo(map);
}

placeMarker(60.192059,24.945831);

// Käynnistetään paikkatietojen haku
navigator.geolocation.getCurrentPosition(success, error, options);
