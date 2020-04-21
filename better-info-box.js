// ==UserScript==
// @name         Typeracer: Better Info Box Data
// @namespace    http://tampermonkey.net/
// @version      0.10.0
// @updateURL    https://raw.githubusercontent.com/PoemOnTyperacer/tampermonkey/master/better-info-box.js
// @downloadURL  https://raw.githubusercontent.com/PoemOnTyperacer/tampermonkey/master/better-info-box.js
// @description  Last 10 avg to two decimal places, & proper thousands separator formatting, in the User Info Box
// @author       poem
// @match        https://play.typeracer.com/*
// @match        https://data.typeracer.com/pit/*
// @grant        GM_xmlhttpRequest
// @connect      data.typeracer.com
// ==/UserScript==

/*Changelog:
====================================================================================
0.5.0  (04-17-20):   Guest support
0.6.0  (04-18-20):   Pit Stop support
0.7.0  (04-18-20):   CPM support
0.8.0  (04-18-20):   All universes support
                     Proper commas formatting in avg (for 1000+cpm/wpm typists)
0.9.0  (04-20-20):   Fixed history
0.10.0 (04-21-20):   Removed refreshing latency (for "normal", single-tab racing)
====================================================================================*/

// Global text boxes variables
var avgDisplay;
var racesDisplay;
var pointsDisplay;

const integerCommasRegex = /\B(?=(\d{3})+(?!\d))/g;
const displayNameRegex = /.*\((.*)\)$/;

var isRacing=false;

var accountDataUrlBase = 'https://data.typeracer.com/users?id=tr:';
let match = /.*(universe=)([^&]*)/.exec(window.location.href);
if(match!=null&&match[2]!='')
    accountDataUrlBase = 'https://data.typeracer.com/users?'+match[1]+match[2]+'&id=tr:';

// Adds proper thousands separators to an int
function formatInteger(n) {
    return n.replace(integerCommasRegex, ",");
}

// Add thousands separators to and trim an exact speed to two decimal places
function formatSpeed(x) {
    let integerPartStr = Math.trunc(x).toString();
    let decimalPart = x%1;
    return formatInteger(integerPartStr)+decimalPart.toFixed(2).substring(1);
}

// Convert WPM if CPM mode is used
function wpmOrCpm(wpm,isPitStop)
{
    if(isPitStop)
        return wpm;
    else
    {
        if(document.querySelector('[title="average speed info"]').innerText=='CPM')
            return wpm*5;
        return wpm;
    }
}

// Get username from display name (eg. "Keegan Tournay (keegant)" > "keegant", or "poem" > "poem")
function getUsernameFromDisplayName(displayName) {
    let match = displayNameRegex.exec(displayName);
    if (match != null)
        return match[1];
    return displayName;
}

// Get, format and display exact last 10 average
function exactAvg(displayNameClass,pitStopAppendix='')
{
    let playerName = getUsernameFromDisplayName(document.getElementsByClassName(displayNameClass)[0].innerText); // Check username everytime to support logging in and out without refreshing

//     If logged out as guest: can't access exact average
    if(playerName=='Guest')
    {
        avgDisplay.innerText=document.getElementsByClassName('mainUserInfoBoxWpm')[0].innerText;
        return;
    }

//     If logged into an account
	GM_xmlhttpRequest ( {
		method: "GET",
		url: accountDataUrlBase+playerName,
		onload: function (response) {
			let data = JSON.parse(response.responseText);
			let current_avg = data.tstats.recentAvgWpm;
            avgDisplay.innerHTML=formatSpeed(wpmOrCpm(current_avg,!pitStopAppendix==''))+pitStopAppendix;
		}
	});
}

// Get, format and display latest race and point counts
function addCommas(dataRowClass)
{
    racesDisplay.innerText = formatInteger(document.querySelector("."+dataRowClass+" > td:nth-child(4)").innerText);
    pointsDisplay.innerText = formatInteger(document.querySelector("."+dataRowClass+" > td:nth-child(5)").innerText);
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
            setInterval(function(){exactAvg('userNameLabel')},10000); // Refresh avg regularly in case player uses multiple tabs (10-second interval for data.typeracer's sake)

            let dataRow = document.getElementsByClassName('datarow')[0];

            racesDisplay = document.createElement('td');
            dataRow.appendChild(racesDisplay);

            pointsDisplay = document.createElement('td');
            pointsDisplay.title = "number of words typed multiplied by typing speed in words-per-second";
            pointsDisplay.style = "cursor: help;";
            dataRow.appendChild(pointsDisplay);

            document.querySelector(".datarow > td:nth-child(4)").style.display = "none";
            document.querySelector(".datarow > td:nth-child(5)").style.display = "none";

            setInterval(function(){addCommas('datarow')},100);
        }
    },2000);
}, false);

// Refresh average on race end
function detectRaceEnding() {
    var gameStatus = ((document.getElementsByClassName('gameStatusLabel') || [])[0] || {}).innerHTML || '';
    if ((gameStatus.startsWith('You finished') || gameStatus.startsWith('The race has ended'))&&isRacing)
    {
        isRacing=false;
        exactAvg('userNameLabel');
    }
    else if(gameStatus=='Go!'&&!isRacing)
        isRacing=true;
}
setInterval(detectRaceEnding,100);
