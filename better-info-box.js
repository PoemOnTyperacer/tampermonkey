// ==UserScript==
// @name         Typeracer: Better Info Box Data
// @namespace    http://tampermonkey.net/
// @version      0.6
// @updateURL    https://raw.githubusercontent.com/PoemOnTyperacer/tampermonkey/master/better-info-box.js
// @downloadURL  https://raw.githubusercontent.com/PoemOnTyperacer/tampermonkey/master/better-info-box.js
// @description  Last 10 avg to two decimal places & add commas to point and race counts
// @author       poem
// @match        https://play.typeracer.com/*
// @match        https://data.typeracer.com/pit/*
// @grant        GM_xmlhttpRequest
// @connect      data.typeracer.com
// ==/UserScript==

/*Changelog:
=======================================
0.5.0 (04-17-20):   Guest support
0.6.0 (04-18-20):   Pit Stop support
=======================================*/

// Global text boxes variables
var avgDisplay;
var racesDisplay;
var pointsDisplay;

const numberCommasRegex = /\B(?=(\d{3})+(?!\d))/g;
const displayNameRegex = /.*\((.*)\)$/;

function $$(selector, context) {
  context = context || document;
  var elements = context.querySelectorAll(selector);
  return Array.prototype.slice.call(elements);
}

function numberWithCommas(x) {
    return x.replace(numberCommasRegex, ",");
}

// Get username from display name (eg. "Keegan Tournay (keegant)" > "keegant", or "poem" > "poem")
function getUsernameFromDisplayName(displayName) {
    let match = displayNameRegex.exec(displayName);
    if (match != null)
        return match[1];
    return displayName;
}

// Get and display exact last 10 average
function exactAvg(displayNameClass,pitStopAppendix='')
{
    let displayName = document.getElementsByClassName(displayNameClass)[0].innerText;
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
            avgDisplay.innerHTML=current_avg.toFixed(2)+pitStopAppendix;
		}
	});
}

function addCommas(dataRowClass)
{
    racesDisplay.innerText = numberWithCommas(document.querySelector("."+dataRowClass+" > td:nth-child(4)").innerText);
    pointsDisplay.innerText = numberWithCommas(document.querySelector("."+dataRowClass+" > td:nth-child(5)").innerText);
}


// Delaying the code's execution, to give the page time to load
window.addEventListener('load', function()
{
    setTimeout(function(){
        let originalAvgList = document.getElementsByClassName('mainUserInfoBoxWpm');

        if(originalAvgList.length==0) //Pit Stop: using the original average boxes to display data. No need for new boxes, or to refresh them later.
        {
            if(document.getElementsByClassName('mainUserName')[0].innerText=="You are not signed in")
                return;

            avgDisplay = document.querySelector(".dataRow > td:nth-child(3)");
            exactAvg('mainUserName',' <a href="http://wikipedia.org/wiki/Wpm" target="_blank">WPM</a>');

            racesDisplay = document.querySelector(".dataRow > td:nth-child(4)");
            pointsDisplay = document.querySelector(".dataRow > td:nth-child(5)");
            addCommas('dataRow');
        }
        else //Main page: using intervals to refresh values. Creating new boxes to display them, and hiding the original ones.
        {
            let originalAvg = document.getElementsByClassName('mainUserInfoBoxWpm')[0];
            originalAvg.style.display = 'none';

            avgDisplay = document.createElement('div');
            avgDisplay.style.paddingRight = '4px';
            originalAvg.parentNode.appendChild(avgDisplay);

            exactAvg('userNameLabel'); //Initial refresh
            setInterval(function(){exactAvg('userNameLabel')},5000); //5 seconds for data.typeracer's sake

            let dataRow = document.getElementsByClassName('datarow')[0];

            racesDisplay = document.createElement('td');
            dataRow.appendChild(racesDisplay);

            pointsDisplay = document.createElement('td');
            pointsDisplay.title = "number of words typed multiplied by typing speed in words-per-second";
            pointsDisplay.style = "cursor: help;";
            dataRow.appendChild(pointsDisplay);

            document.querySelector(".datarow > td:nth-child(4)").style.display = "none";
            document.querySelector(".datarow > td:nth-child(5)").style.display = "none";

            setInterval(function(){addCommas('datarow')},10);
        }
    },2000);
}, false);
