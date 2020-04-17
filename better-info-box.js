// ==UserScript==
// @name         Typeracer: Better Info Box Data
// @namespace    http://tampermonkey.net/
// @version      0.5
// @updateURL    https://raw.githubusercontent.com/PoemOnTyperacer/tampermonkey/master/better-info-box.js
// @downloadURL  https://raw.githubusercontent.com/PoemOnTyperacer/tampermonkey/master/better-info-box.js
// @description  Last 10 avg to two decimal places & add commas to point and race counts
// @author       poem
// @match        https://play.typeracer.com/*
// @grant        GM_xmlhttpRequest
// @connect      data.typeracer.com
// ==/UserScript==

// Global text boxes variables
var avgDisplay;
var racesDisplay;
var pointsDisplay;

function $$(selector, context) {
  context = context || document;
  var elements = context.querySelectorAll(selector);
  return Array.prototype.slice.call(elements);
}

function numberWithCommas(x) {
    return x.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Get username from display name (eg. "Keegan Tournay (keegant)" > "keegant", or "poem" > "poem")
function getUsernameFromDisplayName(displayName) {
    let match = /.*\((.*)\)$/.exec(displayName);
    if (match != null)
        return match[1];
    return displayName;
}

// Get and display exact last 10 average
function exactAvg()
{
    let displayName = document.getElementsByClassName('userNameLabel')[0].innerText;
    let playerName = getUsernameFromDisplayName(displayName);
    if(playerName=='Guest')
    {
        avgDisplay.innerText=document.getElementsByClassName('mainUserInfoBoxWpm')[0].innerText;
        return;
    }
	GM_xmlhttpRequest ( {
		method: "GET",
		url: "https://data.typeracer.com/users?id=tr:"+playerName,
		onload: function (response) {
			let data = JSON.parse(response.responseText);
			let current_avg = data.tstats.recentAvgWpm;
            avgDisplay.innerText=current_avg.toFixed(2);
		}
	});
}

function addCommas()
{
//     Select the original boxes' new contents, & refresh displays
    let dataRow=document.getElementsByClassName('datarow')[0];
    racesDisplay.innerText = numberWithCommas(dataRow.childNodes[3].innerText);
    pointsDisplay.innerText = numberWithCommas(dataRow.childNodes[4].innerText);
}


// Delaying the code's execution, to give the page time to load
window.addEventListener('load', function()
{
    setTimeout(function(){

//         Create copies of boxes, and hide originals
        let originalAvg = document.getElementsByClassName('mainUserInfoBoxWpm')[0];
        originalAvg.style.display = 'none';
        avgDisplay = document.createElement('div');
        avgDisplay.style.paddingRight = '4px';
        originalAvg.parentNode.appendChild(avgDisplay);

        let dataRow=document.getElementsByClassName('datarow')[0];

        racesDisplay = document.createElement('td');
        dataRow.appendChild(racesDisplay);

        pointsDisplay = document.createElement('td');
        pointsDisplay.title = "number of words typed multiplied by typing speed in words-per-second";
        pointsDisplay.style = "cursor: help;";
        dataRow.appendChild(pointsDisplay);

        dataRow.childNodes[3].style.display = "none";
        dataRow.childNodes[4].style.display = "none";

//         initial refresh then intervals
        exactAvg();
        setInterval(exactAvg,5000); //5 seconds for data.typeracer's sake
        setInterval(addCommas,10);

    },2000);
}, false);
