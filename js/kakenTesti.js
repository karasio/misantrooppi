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


  // MUOKATAAN DATAA STRINGIKSI, JOTTA SEN VOI SYÖTTÄÄ API-HAUN URLIN OSAKSI
  let start ='fromPlace=' ${crd.latitude} + ', ' + ${crd.longitude} + '';       // JOS TULEE TIEDOT SELAIMEN PAIKANNUKSESTA..
  //let end = '&toPlace=' + JOTAKIN latitude + ', ' + JOTAKIN longitude + '';
  // let maxWalk = '&maxWalkDistance=' + KÄYTTÄJÄN SYÖTE;



  searchAdd += start + end +'mode=TRANSIT,WALK'+ maxWalk;
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
    let stopID = json.plan.itineraries.legs.to.stopId;
   */
}