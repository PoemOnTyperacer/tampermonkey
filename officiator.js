// ==UserScript==
// @name         Typeracer: tournament officiator tool
// @namespace    http://tampermonkey.net/
// @version      0.1.0
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
#cstDisplay {
    color: 	#D3D3D3;
    border-radius: 3px;
    background-color: #5a5a5a;
    padding: 10px;
    box-shadow: 0 0 2px 2px #000000; /*#f0f;*/
}
#cstDisplayheader {
    cursor: move;
    font-weight: bold;
}`);


const debugging = false;
function log(msg)
{
    if(debugging)
        console.log("[officiating tool] "+msg);
}

var inRacetrack = false;
var areRacing = false;
var trackedPlayers = [];
var trackedPlayersData = [];
const accountDataUrlBase = "https://data.typeracer.com/users?id=tr:";
let displayHTML = '<div id="cstDisplay" style="position: absolute; top: 150px; left: 50px;"><div id="cstDisplayheader">Latest unlagged results</div><div><table cellspacing="10" cellpadding="0" style="width: 100%;"><tbody id="displayBody"></tbody></table></div>';
//probably overkill for ttm, but this allows support for non-play universe racetracks
var universe = (/.*(universe=)([^&]*)/.exec(window.location.href) || [])[2] || 'play';


// Create the display window, make it draggable, and vanish it initially
document.body.innerHTML += displayHTML;
dragElement(document.getElementById("cstDisplay"));
toggleDisplayWindow();

function dragElement(elmnt)
{
    var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    if (document.getElementById(elmnt.id + "header"))
    {
//         if present, the header is where you move the DIV from:
        document.getElementById(elmnt.id + "header").onmousedown = dragMouseDown;
    }
    else
    {
//         otherwise, move the DIV from anywhere inside the DIV:
        elmnt.onmousedown = dragMouseDown;
    }

    function dragMouseDown(e)
    {
        e = e || window.event;
        e.preventDefault();
//         get the mouse cursor position at startup:
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
//         call a function whenever the cursor moves:
        document.onmousemove = elementDrag;
    }

    function elementDrag(e)
    {
        e = e || window.event;
        e.preventDefault();
//         calculate the new cursor position:
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
//         set the element's new position:
        elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
        elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
    }

    function closeDragElement()
    {
//         stop moving when mouse button is released:
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

function toggleDisplayWindow()
{
    let x = document.getElementById('cstDisplay');
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
//         detect participants and add them to the list of tracked players
        let raceParticipants = document.getElementsByClassName('lblUsername');
        for(let i=1; i<raceParticipants.length ; i++)
        {
            let ith_participant_username = getUsernameFromDisplayName(raceParticipants[i].innerText);
            if(!trackedPlayers.includes(ith_participant_username)&&ith_participant_username!='') //don't track Guest '' players
            {
                trackedPlayers.push(ith_participant_username);
                trackedPlayersData.push([-1]);
                log('added a player: '+ith_participant_username+'; currently tracked players are '+trackedPlayers);
            }
        }
    }

//     check tracked players' race count for a new race completed
    for(let i=0;i<trackedPlayers.length;i++)
    {
        let username = trackedPlayers[i];
        let accountDataUrl = accountDataUrlBase + username +'&universe='+universe;
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
setInterval(mainClock,1000); //1s between each set of race count checks -- should not be too heavy on typeracerdata, and an acceptable latency for the user

function displayIthPlayerData(i)
{
    let username = trackedPlayers[i];
    let data = trackedPlayersData[i];
    let raceCount = data[0];
    let displayObject = document.getElementById('display_'+i);
    let displayTable = document.getElementById('displayBody');

    if(!displayObject) //if the tracked player was just added to the list, create a table line on which to show his latest score
    {
        displayTable.innerHTML+='<tr><td>'+username+': </td><td id="display_'+i+'"></td></tr>';
        log('added new \'display_'+i+'\' line for user '+username);
    }
//     get and display tracked player's latest result
    log('retrieving and displaying latest result (#'+trackedPlayersData[i][0]+') for '+i+'th player');
    getRaceSpeeds(username,raceCount,i);
}

//grab the result from the player's latest race details page
function getRaceSpeeds(username,race_number,index) // get the race details page html
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

function getSpeedsFromHtml(username, race_number, html,index) { // process the race details page html
//     Grab log from html
    let match = /var typingLog = ".*?,.*?,.*?,(.*?)\|/.exec(html);
    if(match==null)
    {
        log("[Error] Couldn't retrieve "+universe+' universe race #'+race_number+' data for '+username+': no log found');
        trackedPlayersData[index][0]--; // if the request was made too fast and the data isn't yet available/ the page loaded too slow, reset the loading process (doesn't seem to loop as far as our tests went)
        return;
    }
    let log_contents = match[1];

//     The contents of the quote don't matter, so long as we don't lose the quote length information.
//     So, let's turn any log into a series of non-digit characters separated by delays
    log_contents = log_contents.replace(/(\\b.)/g,'N'); //numbers
    log_contents = log_contents.replace(/(\\u....)/g,'S'); //special characters
    log_contents = log_contents.replace(/(\\)\D/g,'E'); //excepted characters

    log_contents = log_contents.replace(/^./,'');
    let start = parseInt(/(\d*)?/.exec(log_contents)[1]);

    let quote_length=1;
    let total_time=0;

//     Count non-digits and add up delays
    let i=0;
    let num='';
    while(log_contents[i])
    {
		num+=log_contents[i];
		if(i==log_contents.length-1)
		{
			total_time+=parseInt(num);
		}
		else if(!log_contents[i+1].match(/\d/i))
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

//     Display the calculated unlagged score with 2 decimal places
    document.getElementById('display_'+index).innerHTML = unlagged_speed.toFixed(2)+' WPM';

//     not useful for ttm or anything but adjusted speed is easily available too
//     var adjusted_speed = 12000*(quote_length-1)/(total_time-start);

//     And for any future evolution of this script, this is how to remotely grab accurate registered speed and ping values
//     let race_date = /<td>Date<\/td>\s*<td>\s*(.*)\s*/.exec(html)[1];
//     let date_obj = new Date(race_date);
// 	let race_unix_num = parseInt((date_obj.getTime()/1000).toFixed(0));
// 	let unix_start = (race_unix_num-1).toString();
// 	let unix_end = (race_unix_num+1).toString();
//     let race_data_url = 'https://data.typeracer.com/games?playerId=tr:'+username+'&universe='+universe+'&startDate='+unix_start+'&endDate='+unix_end;
//     GM_xmlhttpRequest ( {
// 	method: 'GET',
// 	url: race_data_url,
// 	onload: function (response) {
//         let data = JSON.parse(response.responseText);
//         	for(var j=0;j<data.length;i++)
// 			{
//         		if(data[j].gn==race_number)
// 				{
//                     let registered_speed = parseFloat(data[j].wpm);
//                     let total_time_lagged = quote_length/registered_speed*12000;
//                     let ping = Math.round(total_time_lagged-total_time);
//                     printSpeeds(registered_speed,ping,unlagged_speed,start,adjusted_speed);
//                     break;
//                 }
// 			}
// 	}
// 	});
}
function printSpeeds(registered_speed,ping,unlagged_speed,start,adjusted_speed)
{
    log('Registered: '+registered_speed+'\nUnlagged: '+unlagged_speed+' (ping='+ping+')\nAdjusted: '+adjusted_speed+' (start='+start+')');
}
