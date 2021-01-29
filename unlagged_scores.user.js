// ==UserScript==
// @name         Typeracer: Unlagged scores window
// @namespace    http://tampermonkey.net/
// @version      0.4.0
// @updateURL    https://github.com/PoemOnTyperacer/tampermonkey/raw/master/unlagged_scores.user.js
// @downloadURL  https://github.com/PoemOnTyperacer/tampermonkey/raw/master/unlagged_scores.user.js
// @description  Show competitors' latest unlagged scores in a floating window.
// @author       poem
// @match        https://play.typeracer.com/*
// @match        https://staging.typeracer.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      data.typeracer.com
// ==/UserScript==

//Note: Whatever the settings below, manually show/hide the window by hitting Ctrl + Alt + U when in maintrack or in a private track

/*SETTINGS*/
const showInRacetracks = true; //should the window appear when you join a private racetrack?
const showSelf = true; //should your own results be displayed on line 1?
const showOnMaintrack = true; //should the window appear when you join a maintrack race?
const autoCopy = false; //should the latest result of any currently tracked players be copied to your clipboard automatically?
const lightTheme = true;

const debugging = false;
const advancedDebugging = false;
/*========*/

let bg_color= '#000000';
let text_color = '#ffffff'; //D3D3D3
if(lightTheme)
    [bg_color,text_color]=[text_color,bg_color];
GM_addStyle (`
#cstDisplay {
    color: 	`+text_color+`;
    border-radius: 3px;
    background-color: `+bg_color+`; /*#1e232d;*/
    padding: 10px;
    box-shadow: 0px 0px 2.5px 2.5px `+text_color+`/*#D3D3D3; #000000; #f0f;*/
}
#cstDisplayheader {
    cursor: move;
    font-weight: 800;
    font-size: 1.1em;
}`);

function log(msg, priority=4,advanced=false)
{
    let priorityColorCode=["red","purple","blue","black","gray"];
    if(!advanced||advancedDebugging)
    {
    if(priority==0)
        console.log(("%c[officiator] "+msg),"color:red;");
    else if(debugging)
    {
        if(priority==-1)
            console.log(("%c[officiator] "+msg),"color:#CCCC00;");
        else
            console.log(("%c[officiator] "+msg),"color:"+priorityColorCode[priority]+";");
    }
    }
}

if(debugging)
    log("UNLAGGED SCORES IN AN OFF-WINDOW DEBUGGING MODE (DEFAULT)\nyou may set 'debugging' to false in the settings at the beginning of the code",0);

var inRacetrack = false;
var inMaintrack = false;
var inMaintrackRace=false;
var inRacetrackRace=false;
var latestTop10s=[];
var self_username = '';
var logged_in = false;
var trackedPlayers = [''];
var trackedPlayersData = [[-1, showSelf]];
const accountDataUrlBase = "https://data.typeracer.com/users?id=tr:";
const color_filter = 'invert(87%) sepia(0%) saturate(1%) hue-rotate(168deg) brightness(106%) contrast(77%)';
let showSelfStyle='';
let displayHTML = '<div id="cstDisplay" style="position: absolute; top: 150px; left: 50px;"><div id="cstDisplayheader" style="color: #FF5722;"><td align="left">Latest unlagged results</td><td align="right"><img src="https://play.typeracer.com/com.typeracer.guest.Guest/clear.cache.gif" style="width: 24px; height: 24px; margin-left:20px; background: url(&quot;https://play.typeracer.com/com.typeracer.guest.Guest/B7496B103318F476B179891EF1D2ED36.cache.png&quot;) -232px 0px no-repeat;" border="0" class="btnPin"></div><div><hr style="border:none;margin: 10px;height:2px;background-color:'+text_color+';"></div><div><table cellspacing="10" cellpadding="0" style="width: 100%;"><tbody id="displayBody"><tr id="line_0" style="display:none;"><td id="tag_0" style="font-weight:600;">myself :</td><td id="display_0">logged out</td><td><button id="copy_0" onclick="copyResult(0)" onmouseout="this.style.filter=\''+color_filter+' opacity(100%)\';" onmouseover="this.style.filter=\''+color_filter+' opacity(50%)\';" style="background: url(https://i.imgur.com/h0MQ1WT.png); height:20px; width:20px; border:none; outline:none; filter: '+color_filter+'; display:none;"></button></td></tr></tbody></table></div>';

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
    {
        x.style.display = "block";
        log('displaying window',-1);
    }
    else
    {
        x.style.display = "none";
        log('hiding window',-1);
    }
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
    log('forgetting tracked players ('+(trackedPlayers.length-1)+")",3);
    for(var k=1;k<trackedPlayers.length;k++)
    {
        document.getElementById('line_'+k).remove();
    }
    trackedPlayers=[trackedPlayers[0]];
    trackedPlayersData=[trackedPlayersData[0]];
}

function guiClock() {
    try{

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
        log('user just logged out of '+self_username+' account.',1);
    }
    else if(logged_in_current)
    {
        let self_username_current = getUsernameFromDisplayName(document.getElementsByClassName('userNameLabel')[0].innerText);
        if(!logged_in)
        {
            log('user just logged in to '+self_username_current+' account.',1);
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
            log("joined a racetrack",1);
            if(showInRacetracks)
                toggleDisplayWindow();
        }
        if(gameStatus=="Go!"&&!inRacetrackRace)
        {
            inRacetrackRace=true;
            latestTop10s=[];
            log('joined racetrack race',2);
        }
        else if((gameStatus.startsWith('The race is on') || gameStatus.startsWith('You finished') || gameStatus.startsWith('The race has ended'))&&inRacetrackRace)
        {
            inRacetrackRace=false;
            log('finished racetrack race',2);
        }
    }
    else if(inRacetrack)
    {
        inRacetrack=false;
        log("left the racetrack",1);
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
                log('joined maintrack',1);
                if(showOnMaintrack)
                    toggleDisplayWindow();
            }
            else if(!inMaintrackRace)
            {
                latestTop10s=[];
                log('joined maintrack race',2);
                clearDisplay();
                inMaintrackRace=true;
            }
        }
        else if((gameStatus.startsWith('You finished') || gameStatus.startsWith('The race has ended'))&&inMaintrackRace)
        {
            inMaintrackRace=false;
            log('finished maintrack race',2);
        }
        else if(inMaintrack&&gameStatus=='')
        {
            inMaintrackRace = false;
            inMaintrack=false;
            log('left maintrack',1);
            clearDisplay();
//             log("is display on:"+isDisplayWindowOn());
            if(isDisplayWindowOn())
                toggleDisplayWindow();
        }
    }
    }
    catch(error){
        log("gui clock error: "+error,0);
    }
}

function mainClock() {
    try {
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
                log('now tracking '+ith_participant_username+' (total: '+trackedPlayers.length+')',3);
                log('currently tracked players are '+trackedPlayers,3,true);
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
                    try{
                    let raceCount = JSON.parse(response.responseText).tstats.cg;
                    if(raceCount!=trackedPlayersData[i][0])
                    {
                        log('new race count for '+username+': '+raceCount,4,true);
                        trackedPlayersData[i][0]=raceCount;
                        displayIthPlayerData(i);
                    }
                    }
                    catch(err){
                        log("interrupting data collection for "+username+", "+universe+" universe",0,true);
                    }
                }
            });
        }
    }
    }
    catch(error){
        log("main clock error: "+error,0);
    }
}
setInterval(mainClock,1000); //1s between each set of race count checks -- should not be too heavy on data.typeracer, and an acceptable latency for the user
setInterval(guiClock,1); // faster than the requests to data.typeracer, so the script can keep up with quick navigation

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
        log('added new \'display_'+i+'\' line for user '+username,4,true);
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
    log('retrieving and displaying latest result (#'+trackedPlayersData[i][0]+') for player #'+i,4,true);
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

function getSpeedsFromHtml(username, race_number, html,index,rank,is_pb) { // process the race details page html
//     Grab log from html
    let match = /var typingLog = ".*?,.*?,.*?,(.*?)\|/.exec(html);
    if(match==null)
    {
        log("[Error] Couldn't retrieve "+universe+' universe race #'+race_number+' data for '+username+': no log found',0);
        trackedPlayersData[index][0]--; // if the request was made too fast and the data isn't yet available/ the page loaded too slow, reset the loading process (doesn't seem to loop as far as our tests went)
        return;
    }
    let log_contents = match[1];

//     The contents of the quote don't matter, so long as we don't lose the quote length information.
//     So, let's turn any log into a series of non-digit characters separated by delays
    log_contents = log_contents.replace(/(\\b.)/g,'N'); //numbers and dashes
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
    if(document.getElementById('display_'+index))
        document.getElementById('display_'+index).innerHTML = unlagged_speed.toFixed(2)+' WPM';
    else
        return

    let logReport = "retrieved "+username+"'s latest result ("+universe+" universe, race #"+race_number+", "+unlagged_speed.toFixed(2)+" WPM unlagged, ";

//     The document should have reloaded during the time the request was made. Time to activate the delete player button
    if(index!=0)
    {
        let origOnclick=document.getElementById('tag_'+index).onclick;
        document.getElementById('tag_'+index).onclick= function(){origOnclick();trackedPlayersData[index][1] = false;log('deleted tracked user '+index+' ('+username+')')};
    }
    if(autoCopy&&!inMaintrack&&!inRacetrackRace)
    {
        copyResult(index);
        if(inRacetrack)
            document.getElementsByClassName("txtChatMsgInput")[0].select();
        log('auto-copied last result for user '+username,-1);
    }
    if(trackedPlayersData[index][1])
       document.getElementById('line_'+index).style.display='';
    let copy_index=document.getElementById('copy_'+index);
    if(copy_index.style.display='none') //two cases: logged out self or no races previously
        copy_index.style.display='';

//     not useful for ttm or anything but adjusted speed is easily available too
//     var adjusted_speed = 12000*(quote_length-1)/(total_time-start);

//     Getting accurate registered speed (and ping) values
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

                    logReport+=""+registered_speed+" WPM registered ("+ping+"ms ping), ";
//                     printSpeeds(registered_speed,ping,unlagged_speed,start,adjusted_speed);
//                     check top 10
                    getRankFromHtml(username,race_number,html,index,registered_speed,logReport);
                    break;
                }
			}
	}
	});
}

function getRankFromHtml(username,race_number,html,index,registered_speed,logReport)
{
//     get text id
    let rank = -1;
    let is_top10=true; //only significant if the score is a top 10
    let topdata=[];
    let is_pb=true; //same remark
    let id_match = /.*?text_info\?id=(.*?)">see stats/.exec(html);
    if(id_match==null)
        log('couldn\'t find text id for user '+username+', race '+race_number);
    else
    {
        let text_id = id_match[1];
//         check top 10
        let leaderboard_data_url = 'https://data.typeracer.com/textstats?textId='+text_id+'&distinct=1&universe='+universe+'&playerId=tr:'+username;
        log(leaderboard_data_url,4,true);
        GM_xmlhttpRequest ( {
            method: 'GET',
            url: leaderboard_data_url,
            onload: function (response) {
                let data = JSON.parse(response.responseText);
                let top_10_data = data[1];
                for(let n=0;n<top_10_data.length;n++)
                {
                    let nth_username=top_10_data[n][1].id.substring(3); // nth fastest player on the quote
                    let nth_speed=top_10_data[n][0].wpm; // nth fastest player's best speed on that quote
                    topdata+=[nth_username,nth_speed];
//                     Enable for Top 10 detection debugging
                    log('#'+(n+1)+' player on '+username+'\'s last quote ('+text_id+', race #'+race_number+') : '+nth_username+', '+nth_speed,0,true)

                    if(nth_username==username&&rank==-1&&registered_speed<nth_speed)
                        is_pb=false;
                    if(registered_speed>=nth_speed&&rank<0)
                        rank=n+1;
                }
                if(top_10_data.length<10&&rank<0)
                {
                    rank=top_10_data.length+1;
                }

//                 compare rank with latest awarded top 10s [id, rank, speed, username]
                for(let m=0;m<latestTop10s.length;m++)
                {
                    let mthRank=latestTop10s[m];
                    log('pot. conf. top score number: '+latestTop10s.length+', rank: '+mthRank[1]+', id: '+mthRank[0]+'; current score rank: '+rank+', id: '+text_id,4,true);
                    if(text_id==mthRank[0]&&mthRank[1]<=rank&&rank>0)
                    {
                        if(registered_speed<mthRank[2]&&!topdata.includes([mthRank[3],mthRank[2]]))
                        {
                            rank++;
                            log('user '+username+', universe '+universe+', race '+race_number+', id '+text_id+': adding 1 to rank due to another top 10 in the same race',0,true);
                        }
                    }
                }

//                 display results
                if(rank==-1||rank>10)
                    is_top10 = false;

                if(is_top10)
                {
                    latestTop10s.push([text_id,rank,registered_speed]);
                    log('added top 10 score. Latest top 10s: '+latestTop10s+' (total: '+latestTop10s.length+')',4,true);
                    logReport += 'id '+text_id+', #'+rank+', is_pb: '+is_pb+')';
                    let display_el=document.getElementById('display_'+index);
                    let content=display_el.innerHTML;
                    let new_content=' (#'+rank;
                    if(is_pb)
                        new_content+=', pb)';
                    else
                        new_content+=')';
                    display_el.innerHTML=content+new_content;
                }
                else
                    logReport +='id '+text_id+', not a top 10)';

//                 Log a summary of all the informations gathered about the race under scrutiny
                log(logReport);
            }
        });
    }
}

function printSpeeds(registered_speed,ping,unlagged_speed,start,adjusted_speed)
{
    log('Registered: '+registered_speed+'\nUnlagged: '+unlagged_speed+' (ping='+ping+')\nAdjusted: '+adjusted_speed+' (start='+start+')');
}

const MAC_PLATFORMS = ['Mac68K','MacPPC','MacIntel'];
var ctrl_key=false;
var opt_key=false;
if(MAC_PLATFORMS.includes(navigator.platform)) {
    document.addEventListener ("keydown", function (zEvent) {
        let keyCode = zEvent.keyCode || zEvent.which;
        if(keyCode==17&&!ctrl_key) {
            ctrl_key=true;
            return;
        }
        else if(keyCode==18&&!opt_key) {
            opt_key=true;
            return;
        }
        else if(keyCode==85&&ctrl_key&&opt_key&&(inMaintrack||inRacetrack)) {
            toggleDisplayWindow();
        }
    });
    document.addEventListener ("keyup", function (zEvent) {
        let keyCode = zEvent.keyCode || zEvent.which;
        if(keyCode==17&&ctrl_key) {
            ctrl_key=false;
            return;
        }
        else if(keyCode==18&&opt_key) {
            opt_key=false;
            return;
        }
    });
}
else {
    document.addEventListener ("keydown", function (zEvent) {
        if (zEvent.ctrlKey  &&  zEvent.altKey  &&  zEvent.key === "u" && (inMaintrack||inRacetrack)) {
            toggleDisplayWindow();
        }
    });
}
