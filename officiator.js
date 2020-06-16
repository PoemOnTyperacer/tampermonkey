// ==UserScript==
// @name         Typeracer: tournament officiator tool
// @namespace    http://tampermonkey.net/
// @version      0.2.2
// @updateURL    https://raw.githubusercontent.com/PoemOnTyperacer/tampermonkey/master/officiator.js
// @downloadURL  https://raw.githubusercontent.com/PoemOnTyperacer/tampermonkey/master/officiator.js
// @description  Show competitors' latest unlagged scores in a floating window.
// @author       poem
// @match        https://play.typeracer.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      data.typeracer.com
// ==/UserScript==

//Note: Whatever the settings below, manually show/hide the window by hitting Ctrl + Alt + U when in maintrack or in a private track

/*SETTINGS*/
const showInRacetracks = true; //should the window appear when you join a private racetrack?
const showSelf = true; //should your own results be displayed on line 1?
const showOnMaintrack = false; //should the window appear when you join a maintrack race?
const autoCopy = false; //should the latest result of any currently tracked players be copied to your clipboard automatically?

const debugging = false;
/*========*/

GM_addStyle (`
#cstDisplay {
    color: 	#D3D3D3;
    border-radius: 3px;
    background-color: #1e232d;
    padding: 10px;
    box-shadow: 0px 0px 2px 2px #D3D3D3/*#D3D3D3; #000000; #f0f;*/
}
#cstDisplayheader {
    cursor: move;
    font-weight: 800;
    font-size: 1.1em;
}`);

function log(msg)
{
    if(debugging)
        console.log("[officiating tool] "+msg);
}

var inRacetrack = false;
var inMaintrack = false;
var inMaintrackRace=false;
var self_username = '';
var logged_in = false;
var trackedPlayers = [''];
var trackedPlayersData = [[-1, showSelf]];
const accountDataUrlBase = "https://data.typeracer.com/users?id=tr:";
const color_filter = 'invert(87%) sepia(0%) saturate(1%) hue-rotate(168deg) brightness(106%) contrast(77%)';
let showSelfStyle='';
let displayHTML = '<div id="cstDisplay" style="position: absolute; top: 150px; left: 50px;"><div id="cstDisplayheader"><td align="left">Latest unlagged results</td><td align="right"><img src="https://play.typeracer.com/com.typeracer.guest.Guest/clear.cache.gif" style="width: 24px; height: 24px; margin-left:20px; background: url(&quot;https://play.typeracer.com/com.typeracer.guest.Guest/B7496B103318F476B179891EF1D2ED36.cache.png&quot;) -232px 0px no-repeat;" border="0" class="btnPin"></div><div><hr style="border:none;margin: 10px;height:2px;background-color:#D3D3D3;"></div><div><table cellspacing="10" cellpadding="0" style="width: 100%;"><tbody id="displayBody"><tr id="line_0" style="display:none;"><td id="tag_0" style="font-weight:600;">myself :</td><td id="display_0">logged out</td><td><button id="copy_0" onclick="copyResult(0)" onmouseout="this.style.filter=\''+color_filter+' opacity(100%)\';" onmouseover="this.style.filter=\''+color_filter+' opacity(50%)\';" style="background: url(https://i.imgur.com/h0MQ1WT.png); height:20px; width:20px; border:none; outline:none; filter: '+color_filter+'; display:none;"></button></td></tr></tbody></table></div>';

// injecting the scripts that run the buttons
const gui_scripts = `function copyResult(i)
{
    let result=/(.+?) WPM/.exec(document.getElementById("display_"+i).innerText)[1];
    let el=document.getElementById("copyArea");
    el.value=result;
    el.select();
    document.execCommand("copy")
}

function hideTrackedPlayer(i)
{
    document.getElementById("line_"+i).style.display="none";
}`;
var scr = document.createElement('script');
scr.type="text/javascript";
scr.innerHTML = gui_scripts;
document.getElementsByTagName('head')[0].appendChild(scr);

//create element which we'll use to copy text to clipboard
const el = document.createElement('textarea');
document.body.appendChild(el);
el.id='copyArea';
el.setAttribute('readonly', '');
el.style.position = 'absolute';
el.style.left = '-9999px';

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
    if (x.style.display === "none")
        x.style.display = "block";
    else
        x.style.display = "none";
}

function isDisplayWindowOn() {
    let x = document.getElementById('cstDisplay');
    if (x.style.display === "none")
        return false;
    return true;
}

function getUsernameFromDisplayName(displayName) {
    let match = /.*\((.*)\)$/.exec(displayName);
    if (match != null)
        return match[1];
    return displayName;
}

function clearDisplay() {
    for(var k=1;k<trackedPlayers.length;k++)
    {
        document.getElementById('line_'+k).remove();
    }
    trackedPlayers=[trackedPlayers[0]];
    trackedPlayersData=[trackedPlayersData[0]];
    log('resetting non-self tracked players');
}

function mainClock() {
//     check for user's own account (might not be set initially, or might have changed)
    let potential_self_username = (document.querySelector('.MainUserInfoEditor > tbody > tr > td > a') || {}).innerText || '';
    if(potential_self_username!='')// check that the page is done loading
    {
    let logged_in_current = potential_self_username=='Sign Out';

    if(logged_in&&!logged_in_current)
    {
        document.getElementById('tag_0').innerText = 'myself :';
        document.getElementById('display_0').innerText = 'logged out';
        document.getElementById('copy_0').style.display='none';
        self_username='';
        trackedPlayers[0]='';
        logged_in=false;
        log('user just logged out of '+self_username+' account.');
    }
    else if(logged_in_current)
    {
        let self_username_current = getUsernameFromDisplayName(document.getElementsByClassName('userNameLabel')[0].innerText);
        if(!logged_in)
        {
            log('user just logged in to '+self_username_current+' account.');
            logged_in=true;
            self_username = self_username_current;
            trackedPlayers[0]=self_username;
            trackedPlayersData[0][0]=-1;
            document.getElementById('tag_0').innerText = self_username+' :';
            document.getElementById('display_0').innerText = ''; //cosmetic. Should last 500ms statistically
        }
//         no need to treat the case where self_username_current!=self_username assuming the user can't change accounts instantly
    }
    }


    let gameStatus = ((document.getElementsByClassName('gameStatusLabel') || [])[0] || {}).innerHTML || '';
    let roomTitle = ((document.getElementsByClassName('room-title') || [])[0] || {}).innerText || '';
    if(roomTitle.endsWith("'s Racetrack"))
    {
        if(!inRacetrack)
        {
            inRacetrack = true;
            log("joined a racetrack");
            if(showInRacetracks)
                toggleDisplayWindow();
        }
    }
    else if(inRacetrack)
    {
        inRacetrack=false;
        log("left the racetrack");
        if(isDisplayWindowOn())
            toggleDisplayWindow();
        clearDisplay();
    }
    else if(roomTitle!="Practice Racetrack")
    {
        if (gameStatus=="The race is about to start!"||gameStatus=="Waiting for more people...")
        {
            if(!inMaintrack)
            {
                inMaintrack=true;
                log('joined maintrack');
                if(showOnMaintrack)
                    toggleDisplayWindow();
            }
            else if(!inMaintrackRace)
            {
                inMaintrackRace=true;
                log('joined maintrack race');
                clearDisplay();
            }
        }
        else if((gameStatus.startsWith('You finished') || gameStatus.startsWith('The race has ended'))&&inMaintrackRace)
        {
            inMaintrackRace=false;
            log('finished maintrack race');
        }
        else if(inMaintrack&&gameStatus=='')
        {
            inMaintrackRace = false;
            inMaintrack=false;
            log('left maintrack');
            clearDisplay();
            log("is display on:"+isDisplayWindowOn());
            if(isDisplayWindowOn())
                toggleDisplayWindow();
        }
    }

    if(inRacetrack||inMaintrack)
    {
//         detect participants and add them to the list of tracked players
        let raceParticipants = document.getElementsByClassName('lblUsername');
        for(let i=1; i<raceParticipants.length ; i++)
        {
            let ith_participant_username = getUsernameFromDisplayName(raceParticipants[i].innerText);
            if(!trackedPlayers.includes(ith_participant_username)&&ith_participant_username!='') //don't track Guest '' players
            {
                trackedPlayers.push(ith_participant_username);
                trackedPlayersData.push([-1, true]);
                log('added a player: '+ith_participant_username+'; currently tracked players are '+trackedPlayers);
            }
        }
    }

//     check tracked players' race count for a new race completed
    for(let i=0;i<trackedPlayers.length;i++)
    {
        let username = trackedPlayers[i];
        if(username=='')
        {
            let self_line = document.getElementById('line_0');
            if(showSelf&&self_line.style.display=='none')
                self_line.style.display='';
        }
        else //exclude case where self is a guest, and his username set to ''
        {
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
}
setInterval(mainClock,1000); //1s between each set of race count checks -- should not be too heavy on typeracerdata, and an acceptable latency for the user

function displayIthPlayerData(i)
{
    let username = trackedPlayers[i];
    let data = trackedPlayersData[i];
    let raceCount = data[0];
    let showLine = data[1];
    let displayObject = document.getElementById('display_'+i);
    let displayTable = document.getElementById('displayBody');

    if(!displayObject) //if the tracked player was just added to the list, create a table line on which to show his latest score
    {
        displayTable.innerHTML+='<tr id="line_'+i+'" style="display:none;"><td style="font-weight:600;"><div id="tag_'+i+'" onclick="hideTrackedPlayer('+i+')">'+username+' :</div></td><td id="display_'+i+'"></td><td><button id="copy_'+i+'" onclick="copyResult('+i+')" onmouseout="this.style.filter=\''+color_filter+' opacity(100%)\';" onmouseover="this.style.filter=\''+color_filter+' opacity(50%)\';" style="background: url(https://i.imgur.com/h0MQ1WT.png); height:20px; width:20px; border:none; outline:none; filter: '+color_filter+';"></button></td></tr>';
        log('added new \'display_'+i+'\' line for user '+username);
    }

    if(parseInt(raceCount)==0)
    {
        document.getElementById('display_'+i).innerHTML = "no race yet";
        if(trackedPlayersData[i][1])
            document.getElementById('line_'+i).style.display='';
        document.getElementById('copy_'+i).style.display='none';
        return;
    }

//     get and display tracked player's latest result
    log('retrieving and displaying latest result (#'+trackedPlayersData[i][0]+') for player #'+i);
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
//     The document should have reloaded during the time the request was made. Time to activate the quick copy button
//     document.getElementById('copy_'+index).onclick = function(){copyResult(index);};
//     if(index!=0)
//         document.getElementById('tag_'+index).onclick = function(){hideTrackePlayer(index);};
    if(index!=0)
    {
        let origOnclick=document.getElementById('tag_'+index).onclick;
        document.getElementById('tag_'+index).onclick= function(){origOnclick();trackedPlayersData[index][1] = false;log('deleted tracked user '+index+' ('+username+')')};
    }
    if(autoCopy)
        copyResult(index);
    if(trackedPlayersData[index][1])
       document.getElementById('line_'+index).style.display='';
    let copy_index=document.getElementById('copy_'+index);
    if(copy_index.style.display='none') //two cases: logged out self or no races previously
        copy_index.style.display='';

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

document.addEventListener ("keydown", function (zEvent) {
    if (zEvent.ctrlKey  &&  zEvent.altKey  &&  zEvent.key === "u") {
        toggleDisplayWindow();
    }
} );
