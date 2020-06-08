// ==UserScript==
// @name         Typeracer: tournament officiating tool
// @namespace    http://tampermonkey.net/
// @version      0.0.1
// @updateURL    https://raw.githubusercontent.com/PoemOnTyperacer/tampermonkey/master/officiator.js
// @downloadURL  https://raw.githubusercontent.com/PoemOnTyperacer/tampermonkey/master/officiator.js
// @description  Show unlagged speeds for opponents in private racetracks
// @author       poem
// @match        https://play.typeracer.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      data.typeracer.com
// ==/UserScript==


GM_addStyle (`
#mydiv {
    border-radius: 3px;
    background-color: #5a5a5a;
padding: 10px;
  box-shadow:
        0 0 2px 2px #000000; /* #f0f; */
}

#mydivheader {
font-weight: bold;
}`);

const debugging = true;

var inRacetrack = false;
var areRacing = false;

var trackedPlayers = [];
var trackedPlayersData = [];

const accountDataUrlBase = "https://data.typeracer.com/users?id=tr:";

let displayHTML = '<div id="mydiv" style="position: absolute; top: 150px; left: 50px;"><div id="mydivheader">Latest unlagged results</div><div><table cellspacing="10" cellpadding="0" style="width: 100%;"><tbody id="displayBody"></tbody></table></div>';
document.body.innerHTML += displayHTML;
dragElement(document.getElementById("mydiv"));
toggleDisplayWindow();

function dragElement(elmnt) {
  var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  if (document.getElementById(elmnt.id + "header")) {
    // if present, the header is where you move the DIV from:
    document.getElementById(elmnt.id + "header").onmousedown = dragMouseDown;
  } else {
    // otherwise, move the DIV from anywhere inside the DIV:
    elmnt.onmousedown = dragMouseDown;
  }

  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    // get the mouse cursor position at startup:
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    // call a function whenever the cursor moves:
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    // calculate the new cursor position:
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // set the element's new position:
    elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
    elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
  }

  function closeDragElement() {
    // stop moving when mouse button is released:
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

function toggleDisplayWindow()
{
    let x = document.getElementById('mydiv');
    if (x.style.display === "none") {
    x.style.display = "block";
  } else {
    x.style.display = "none";
  }
}

function getUsernameFromDisplayName(displayName) {
    let match = /.*\((.*)\)$/.exec(displayName);
    if (match != null)
        return match[1];
    return displayName;
}

function isEmpty(obj) {
    for(var prop in obj) {
        if(obj.hasOwnProperty(prop))
            return false;
    }

    return true;
}

function mainClock() {
    let roomTitle = ((document.getElementsByClassName('room-title') || [])[0] || {}).innerText || '';
    if(roomTitle.endsWith("'s Racetrack"))
    {
        if(!inRacetrack)
        {
            inRacetrack = true;
            log("joined a racetrack");
            toggleDisplayWindow();
        }
    }
    else if(inRacetrack)
    {
        inRacetrack=false;
        log("left the racetrack");
        toggleDisplayWindow();
    }
    if(inRacetrack)
    {
        let gameStatus = ((document.getElementsByClassName('gameStatusLabel') || [])[0] || {}).innerHTML || '';
        if((gameStatus=='Go!'||gameStatus=='The race is on!')&&!areRacing)
        {
            log("a racetrack race started");
            areRacing=true;
        }
        else if ((gameStatus.startsWith('You finished') || gameStatus.startsWith('The race has ended'))&&areRacing)
        {
            areRacing=false;
            log("a racetrack race finished");
        }
        let raceParticipants = document.getElementsByClassName('lblUsername');
        for(let i=1; i<raceParticipants.length ; i++)
        {
            let ith_participant_username = getUsernameFromDisplayName(raceParticipants[i].innerText);
            if(!trackedPlayers.includes(ith_participant_username)&&ith_participant_username!='')
            {
                trackedPlayers.push(ith_participant_username);
                trackedPlayersData.push([-1]);
                log('added a player: '+ith_participant_username+'; currently tracked players are '+trackedPlayers);
            }
        }
    }
    for(let i=0;i<trackedPlayers.length;i++)
    {
        let username = trackedPlayers[i];
//         get player's race count
        let accountDataUrl = accountDataUrlBase + username;
        GM_xmlhttpRequest ( {
		method: 'GET',
		url: accountDataUrl,
		onload: function (response) {
            let raceCount = JSON.parse(response.responseText).tstats.cg;
                if(raceCount!=trackedPlayersData[i][0])
                {
                    log('new race count for '+username+': '+raceCount);
                    trackedPlayersData[i][0]=raceCount;
                    displayIthPlayerData(i);
                }
		}
        });
    }
}

setInterval(mainClock,500);

function displayIthPlayerData(i)
{
    let username = trackedPlayers[i];
    let data = trackedPlayersData[i];
    let raceCount = data[0];
    let displayObject = document.getElementById('display_'+i);
    let displayTable = document.getElementById('displayBody');

    if(!displayObject)
    {
        log('display_'+i+' doesn\'t exist yet. Creating it');
        displayTable.innerHTML+='<tr><td>'+username+': </td><td id="display_'+i+'"></td></tr>';
        log('added new display line for user '+username);
    }
    getAndDisplayLatestResult(i);
}

function getAndDisplayLatestResult(i)
{
    log('retrieving and displaying latest result (#'+trackedPlayersData[i][0]+') for '+i+'th player');
    getRaceSpeeds(trackedPlayers[i],trackedPlayersData[i][0],i);
}


//get result

var universe = 'play';

function getRaceSpeeds(username,race_number,index)
{
    let race_details_url = 'https://data.typeracer.com/pit/result?allowDisqualified=1&id='+universe+'|tr:'+username+'|'+race_number;
	GM_xmlhttpRequest ( {
		method: 'GET',
		url: race_details_url,
		onload: function (response) {
            getSpeedsFromHtml(username, race_number, response.responseText,index);
		}
	});
}

function getSpeedsFromHtml(username, race_number, html,index) {
//     Grab log from html
    let match = /var typingLog = ".*?,.*?,.*?,(.*?)\|/.exec(html);
    if(match==null)
    {
        alert("Couldn't retrieve "+universe+' universe race #'+race_number+' data for '+username);
        return;
    }
    let log = match[1];

//     The contents of the quote don't matter, so long as we don't lose the quote length information.
//     So, let's turn any log into a series of non-digit characters separated by delays
    log = log.replace(/(\\b.)/g,'N'); //numbers
    log = log.replace(/(\\u....)/g,'S'); //special characters
    log = log.replace(/(\\)\D/g,'E'); //excepted characters

    log = log.replace(/^./,'');
    let start = parseInt(/(\d*)?/.exec(log)[1]);

    let quote_length=1;
    let total_time=0;

//     Count non-digits and add up delays
    let i=0;
    let num='';
    while(log[i])
    {
		num+=log[i];
		if(i==log.length-1)
		{
			total_time+=parseInt(num);
		}
		else if(!log[i+1].match(/\d/i))
		{
			total_time+=parseInt(num);
			num='';
			quote_length++;
			i=i+2;
			continue;
		}
		i++;
    }

    let unlagged_speed = 12000*quote_length/total_time;
    var adjusted_speed = 12000*(quote_length-1)/(total_time-start);

//     Get a more accurate registered score using the timespan API
    let race_date = /<td>Date<\/td>\s*<td>\s*(.*)\s*/.exec(html)[1];
    let date_obj = new Date(race_date);
	let race_unix_num = parseInt((date_obj.getTime()/1000).toFixed(0));
	let unix_start = (race_unix_num-1).toString();
	let unix_end = (race_unix_num+1).toString();
    let race_data_url = 'https://data.typeracer.com/games?playerId=tr:'+username+'&universe='+universe+'&startDate='+unix_start+'&endDate='+unix_end;
    GM_xmlhttpRequest ( {
	method: 'GET',
	url: race_data_url,
	onload: function (response) {
        let data = JSON.parse(response.responseText);
        	for(var j=0;j<data.length;i++)
			{
        		if(data[j].gn==race_number)
				{
                    let registered_speed = parseFloat(data[j].wpm);
                    let total_time_lagged = quote_length/registered_speed*12000;
                    let ping = Math.round(total_time_lagged-total_time);

//                     printSpeeds(registered_speed,ping,unlagged_speed,start,adjusted_speed);
                    document.getElementById('display_'+index).innerHTML = unlagged_speed.toFixed(2)+' WPM';
                    break;
                }
			}
	}
	});
}

function printSpeeds(registered_speed,ping,unlagged_speed,start,adjusted_speed)
{
    log('Registered: '+registered_speed+'\nUnlagged: '+unlagged_speed+' (ping='+ping+')\nAdjusted: '+adjusted_speed+' (start='+start+')');
}


function log(msg)
{
    if(debugging)
        console.log("[officiating tool] "+msg);
}
