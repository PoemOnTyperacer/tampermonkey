// ==UserScript==
// @name         Keymash tournament history
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  See the last 20 races in keymash tournaments
// @updateURL    https://raw.githubusercontent.com/PoemOnTyperacer/tampermonkey/master/km_tournament_history.user.js
// @downloadURL  https://raw.githubusercontent.com/PoemOnTyperacer/tampermonkey/master/km_tournament_history.user.js
// @author       nullchilly
// @match        https://keymash.io/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=keymash.io
// @grant GM_setValue
// @grant GM_getValue
// ==/UserScript==

function waitForElm(selector) {
  return new Promise(resolve => {
    if (document.querySelector(selector)) {
      return resolve(document.querySelector(selector));
    }

    const observer = new MutationObserver(mutations => {
      if (document.querySelector(selector)) {
        resolve(document.querySelector(selector));
        observer.disconnect();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  });
}

(function() {
  let playerId = 0
  let preMatchId = 0
  let preProfile = 0

  // Hook into POST request to get player & match id
  let oldOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function() {
    let viewProfile = window.location.href.startsWith("https://keymash.io/profile")
    if (preProfile != viewProfile) {
      playerId = 0
      preProfile = viewProfile
    }
    this.addEventListener('load', function() {
      let response = null
      try {
        response = JSON.parse(this.responseText)
      } catch (err) {
        return
      }
      if (playerId == 0 && response.playerId) {
        playerId = response.playerId
        console.log(playerId)
        if (viewProfile) {
          waitForElm('.leaderboards--row').then((elm) => {
            let matches = document.querySelector(".leaderboards--row").parentElement
            let matchesHistory = JSON.parse(localStorage.getItem('keymashMatchesHistory')) || []
            let dict = {}
            for (let i = 0; i < matchesHistory.length; i++) {
              let matchId = matchesHistory[i]
              console.log(matchId)
              let h = new XMLHttpRequest();
              let race = null
              h.onreadystatechange = function() {
                if (this.readyState == 4 && this.status == 200) {
                  race = JSON.parse(h.responseText)
                  let matchId = matchesHistory[i]
                  // console.dir(matchId, race)
                  // matchesHistory.push(race);
                  matchesHistory[matchesHistory.length - 1] = race
                  // localStorage.setItem('keymashMatchesHistory', JSON.stringify(matchesHistory))
                  let newMatch = matches.lastChild.cloneNode(true)
                  // console.log(race)
                  newMatch.children[0].innerHTML = race.finished ? i + 1 : "QUIT"
                  newMatch.children[1].innerHTML = "Keymasters 2023"
                  newMatch.children[2].innerHTML = `${race.exp} EXP`
                  newMatch.children[3].innerHTML = `${race.accuracy}%`
                  newMatch.children[4].innerHTML = `${race.wpm} WPM`
                  let date = new Date(race ? race.created * 1000 : 0)
                  newMatch.children[5].innerHTML = `${date.toLocaleTimeString()} ${date.toLocaleDateString()}`
                  try {
                    newMatch.children[6].children[0].href = `https://keymash.io/replay/${playerId}/${matchId}/`
                    newMatch.children[6].children[1].remove()
                  } catch (err) {
                    // console.log("NOOOOOOO does this error exists", err)
                    // console.log(newMatch.children[6].children[0])
                  }
                  dict[i] = newMatch
                  // console.log(Object.keys(dict).length)
                  if (Object.keys(dict).length == matchesHistory.length) {
                    // console.log("done!")
                    for (let j = 0; j < matchesHistory.length; j++) {
                      matches.insertBefore(dict[j], matches.children[1])
                    }
                  }
                }
              };
              console.log(`https://keymash.io/replay/${playerId}/${matchId}/`)
              h.open("GET", `https://api.keymash.io/api/v2/player/matches?playerId=${playerId}&matchId=${matchId}`, true);
              h.send();
            }
          });
        }
      }
      if (!viewProfile && typeof (response.matchId) == 'string' && response.matchId != preMatchId) {
        if (response.tournamentId == "keymasters-2023") {
          let matchesHistory = JSON.parse(localStorage.getItem('keymashMatchesHistory')) || []
          if (matchesHistory.length >= 20) {
            matchesHistory.shift()
          }
          matchesHistory.push(response.matchId)
          localStorage.setItem('keymashMatchesHistory', JSON.stringify(matchesHistory))
          preMatchId = response.matchId
          console.log(response)
          console.log("MFUCKING matchid", response.matchId)
        }
      }
    });
    oldOpen.apply(this, arguments);
  };

})();
