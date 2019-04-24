'use strict';

/*
http://api.digitransit.fi/routing/v1/routers/hsl/


http://api.digitransit.fi/routing/v1/routers/hsl/plan?
tällä esmes löytyy asioita:
http://api.digitransit.fi/routing/v1/routers/hsl/plan?
TÄMÄ MUUTTUVANA PALASENA:
fromPlace=60.17036, 24.93768&toPlace=60.191058, 24.914124&time=1:02pm&date=05-01-2019&mode=TRANSIT,WALK&maxWalkDistance=500&arriveBy=false
 */

button.addEventListener('click', search)


function search(evt) {
  let searchAdd = 'http://api.digitransit.fi/routing/v1/routers/hsl/plan?';
  let fromAddress = document.querySelector('#fromInput').value;
  let whereAddress = document.querySelector('#WhereInput').value;
  let maxWalkValue = document.querySelector('#maxWalkInput').value;

  searchAdd += fromAddress + whereAddress + maxWalkValue;     // plus mahdollisesti muita muuttujia?

  // MUOKATAAN DATAA STRINGIKSI, JOTTA SEN VOI SYÖTTÄÄ API-HAUN URLIN OSAKSI
  let start ='fromPlace=' ${crd.latitude} + ', ' + ${crd.longitude} + '';       // JOS TULEE TIEDOT SELAIMEN PAIKANNUKSESTA..
  //let end = '&toPlace=' + JOTAKIN latitude + ', ' + JOTAKIN longitude + '';
  // let maxWalk = '&maxWalkDistance=' + KÄYTTÄJÄN SYÖTE;

  fetch(searchAdd)                              // Käynnistetään haku. Vakiometodi on GET.
      .then(function(vastaus){        // Sitten kun haku on valmis,
        return vastaus.json();                  // muutetaan ladattu tekstimuotoinen JSON JavaScript-olioksi
      }).then(function(json){         // Sitten otetaan ladattu data vastaan ja
    sortByPeople(json);                        // kutsutaan showProg-funktiota ja lähetetään ladattu data siihen parametrinä.
  }).catch(function(error){           // Jos tapahtuu virhe,
    console.log(error);                         // kirjoitetaan virhe konsoliin.
  });
}

function sortByPeople(json) {
  /*
    let stopName = json.plan.itineraries.legs.to.name;
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