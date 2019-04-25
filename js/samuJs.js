let haku = document.getElementById('searchButton');
haku.addEventListener('click', haeTiedot);

function haeTiedot() {
  let input = document.getElementById('fromInput');
  console.log('Haettu tiedolla ' + input.value);
  console.log('https://nominatim.openstreetmap.org/search.php?q=' + input.value);
  fetch(' https://nominatim.openstreetmap.org/search/' + input.value + '?format=json&addressdetails=1&limit=1&polygon_svg=1').
      then(function(response) {
        return response.json();
      }).
      then(function(json) {
        tulosta(json);
      }).
      catch(function(error) {
        console.log(error);
      });
}

function tulosta(json) {
  console.log(json);
  console.log(json[0].boundingbox[0]);

}