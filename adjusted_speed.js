// ==UserScript==
// @name         Typeracer: Adjusted speed
// @namespace    http://tampermonkey.net/
// @version      1.4.0
// @updateURL    https://raw.githubusercontent.com/PoemOnTyperacer/tampermonkey/master/adjusted_speed.js
// @downloadURL  https://raw.githubusercontent.com/PoemOnTyperacer/tampermonkey/master/adjusted_speed.js
// @description  Adds the Adjusted speed metric (among other things) to race end and race details pages
// @author       poem & xX0t1Xx
// @match        https://data.typeracer.com/pit/result*
// @match        https://play.typeracer.com/*
// @match        https://staging.typeracer.com/*
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// ==/UserScript==



/*=========SETTINGS=============*/
const SHOW_DESSLEJUSTED = false;
/*==============================*/



/*=========================================CHANGELOG=======================================================
1.1.0 (04-08-20):   Initial release
1.2.1 (04-12-20):   Added unlagged and adjusted speed values
                    Forced 2 decimals for speed/3 for adjusted/none for points
                    Changed name "to Typeracer: More Race Details"
1.2.4 (04-12-20):   Fixed replay button & margins
                    Reverse lag is now highlighted (eg. https://data.typeracer.com/pit/result?id=%7Ctr:poem%7C69527)
1.2.5 (04-13-20):   Fixed reverse lag detection
1.2.6 (04-13-20):   Fixed non-play universes
                    Moved error messages to console
1.2.7 (04-20-20):   Added Ping value
1.3.0 (08-19-20):   Added support for quotes starting with a special character, which is escaped in the log (like ")
                    Added a setting to display the "desslejusted"
                    (DISCLAIMER: this speed metric does not accurately represent the speed you typed a quote at, but inflates your score.
                    Therefore, it is not actually in use within the community. I only included it as a meme, and it is disabled by default.)
1.4.0 (08-31-29):   Added adjusted speed on race end screens
                    Added adjusted speed on race end replays
                    Added speed highlights for 300 and 400 club scores
                    Might be unstable on Firefox

Coming up: Firefox support, adjusted on race detail pages replays, reverse lag highlighting on race end pages 
=================================================================================================================*/


// AFTER-GHOST ADJUSTED

let current_url = window.location.href;
Array.prototype.partialSum = function(initial, final) {
    let result=0;
    for(let n=initial;n<final+1;n++) {
        result+=parseInt(this[n]);
    }
    return result;
}
String.prototype.replaceAt = function(index, replacement) {
    return this.substr(0, index) + replacement + this.substr(index + replacement.length);
}
String.prototype.removeAt = function(indices) {
    if(typeof(indices)=='number') {
        if(indices<this.length)
            return this.slice(0, indices) + this.slice(indices+1);
        else
            console.log("error: can't remove character at index "+indices+" (out of bounds)");
    }
    else {
        let sub=0;
        let ans=this;
        for(let n=0;n<indices.length;n++) {
            if(indices[n-sub]<this.length) {
                ans = this.slice(0, indices[n-sub]) + this.slice(indices[n+1-sub]);
                sub++;
            }
            else
                console.log("error: can't remove character at index "+indices[n]+" (out of bounds)");
        }
        return ans;
    }
}
// expected output: 'tEt'
if(!current_url.startsWith('https://data.typeracer.com/')) {

    // Modified RB function:
// The RB function is an obfuscated function in the TypeRacer code to perform requests in game
// This modified version includes new code to catch and store the typingLog
var newRB = function RB(b, c, d) {
    var e, f, g, h;
    h = new $wnd.XMLHttpRequest;
    try {
        Jsb(h, b.c, b.g)
    } catch (a) {
        a = j8(a);
        if (vG(a, 228)) {
            e = a;
            g = new _B(b.g);
            xl(g, new $B(e.lc()));
            throw k8(g)
        } else throw k8(a)
    }
    TB(b, h);
    b.d && (h.withCredentials = true, undefined);
    f = new MB(h, b.f, d);
    Ksb(h, new WB(f, d));
    try {
        h.send(c) // This is where the POST data is sent
        /* ----- Start NEW CODE ----- */
        if (c.search("TLv1")!=-1) {
            let typingLog = /^.*?,.*?,.*?,(.*?)\\!/.exec(c)[1];
//             console.log('caught log: '+typingLog);
            window.localStorage.setItem('latestTypingLog',typingLog);
        }
        /* ------ END NEW CODE ------ */
    } catch (a) {
        a = j8(a);
        if (vG(a, 228)) {
            e = a;
            throw k8(new $B(e.lc()))
        } else throw k8(a)
    }
    return f
}
function replaceJs() {
    com_typeracer_guest_Guest.onScriptDownloaded(newRB.toString());
}

function logToSpeeds(log_contents) {
    let x=0;
    while(x<log_contents.length) {
        if(log_contents.charCodeAt(x)==8) { //should never be the last character

//             numbers and dashes
            log_contents = log_contents.replaceAt(x+1,'X');
            log_contents = log_contents.removeAt(x);
        }
        x++;
    }

    //     The contents of the quote don't matter, so long as we don't lose the quote length information.
//     So, let's turn any log into a series of non-digit characters separated by delays
    log_contents = log_contents.replace(/(\\u....)/g,'S'); //special characters
    log_contents = log_contents.replace(/(\\)\D/g,'E'); //excepted characters

    console.log('repaired and simplified log: '+log_contents);

    log_contents = log_contents.replace(/^./,'');
    let start = parseInt(/(\d*)?/.exec(log_contents)[1]);

    let quote_length=1;
    let total_time=0;

//     Count non-digits and add up delays
    let i=0;
    let num='';
    let partialAdjusteds = [0];
    let delays=[];
    let maxAdj = [0,0]; //maximum partial adjusted speed [index, value]
    while(log_contents[i])
    {
		num+=log_contents[i];
		if(i==log_contents.length-1)
		{
			total_time+=parseInt(num);
            delays.push(num);
		}
		else if(!log_contents[i+1].match(/\d/i))
		{
			total_time+=parseInt(num);
            delays.push(num);
			num='';
            let partialAdjusted=12000*(quote_length-1)/(total_time-start) || Infinity;
            partialAdjusteds.push(partialAdjusted);
            if(partialAdjusted>maxAdj[1]&&partialAdjusted!=Infinity) {
                maxAdj=[quote_length,partialAdjusted];
            }
			quote_length++;
			i=i+2;
			continue;
		}
		i++;
    }

    let unlagged_speed = 12000*quote_length/total_time;
    let adjusted_speed = 12000*(quote_length-1)/(total_time-start);
    let lagged_speed_str = (((document.getElementsByClassName('tblOwnStatsNumber') || [])[0] || {}).innerText || ' wpm').split(' wpm')[0];
    let lagged_speed = parseInt(lagged_speed_str);
    if((lagged_speed_str==''||lagged_speed>unlagged_speed+1)) { //only approximate lagged wpm available before saving
        status.reverseLag=true;
    }

    partialAdjusteds.push(adjusted_speed);
    if(adjusted_speed>maxAdj[1]) {
        maxAdj=[quote_length-1,adjusted_speed];
    }
    status.latestPartialAdjusteds = partialAdjusteds;
    status.delays=delays;
    status.maximumAdjustedIndex=maxAdj[0];
    console.log('delays: '+delays);
    console.log('partial adjusteds: '+partialAdjusteds);
    console.log('max adj: '+maxAdj);

    let data = {
        unlagged:unlagged_speed,
        adjusted:adjusted_speed,
        start:start,
    }
    return data;
}

// the script needs to know where it is, because one can leave a ghost, navigate, join a practice racetrack without reloading the page
var status={
    room:'other',
    race:'none',
    createdDisplayTag:false,
    displayTag:null,
    latestPartialAdjusteds:[],
    delays:[],
    maximumAdjustedIndex:0,
    replayCursor:-1,
    reverseLag:false
}

function guiClock() {
    let roomTitle = ((document.getElementsByClassName('room-title') || [])[0] || {}).innerText || '';
    let ghost_warning = ((document.getElementsByClassName('gwt-InlineHTML') || [])[0] || {}).innerHTML || '';
    let gameStatus = ((document.getElementsByClassName('gameStatusLabel') || [])[0] || {}).innerHTML || '';

    if(roomTitle=="Practice Racetrack") {
        if(ghost_warning.includes('You are racing against')) {
            if(status.room!='ghost')
                status.room='ghost';
        }
        else {
            if(status.room!='practice')
                status.room='practice';
        }
    }
    else if(gameStatus!='') {
        if(status.room!='public')
            status.room='public';
    }
    else {
        if(status.room!='other') {
            status.room='other';
            status.race='none';
            status.createdDisplayTag=false;
            status.replayCursor=-1;
        }
    }
    if(status.room!='other') {
        if(gameStatus=='The race is about to start!') {
            if(status.race!='waiting')
                status.race='waiting';
        }
        else if(gameStatus=='Go!'||gameStatus.startsWith('The race is on')) {
            replaceJs();
            status.createdDisplayTag=false;
            status.replayCursor=-1;
            status.reverseLag=false;
            if(status.race!='racing')
                status.race='racing';
        }
        else if(gameStatus=='The race has ended.'||gameStatus.startsWith('You finished')) {
            if(status.race!='finished') {
                status.race='finished';
                getPracticeRaceData();
            }
        }
    }
}
setInterval(guiClock,1);

function getPracticeRaceData() {
    let latestTypingLog = window.localStorage.getItem('latestTypingLog');
    let latestSpeeds = logToSpeeds(latestTypingLog);
    showPracticeRaceData(latestSpeeds);
}

function showPracticeRaceData(speeds) {
    let timeLine = document.querySelector('.tblOwnStats > tbody > tr:nth-child(2)');
    let tblOwnStatsBody = timeLine.parentNode;
    let unlaggedResult = speeds.unlagged.toFixed(2)+' wpm';
    let adjustedResult = speeds.adjusted.toFixed(2)+' wpm';
    let startResult = speeds.start+'ms';
    let unlaggedLine = getElementFromString('tr','<td>Unlagged:</td><td><div class="unlaggedDisplay tblOwnStatsNumber" style=""><span class="unlagged">'+unlaggedResult+'</span></div></td>');
    let startLine = getElementFromString('tr','<td>Start:</td><td><div class="startDisplay tblOwnStatsNumber" style=""><span class="start">'+startResult+'</span></div></td>');
    let adjustedStyle='';
    if(speeds.adjusted>=400) {
        adjustedStyle=' style="color: #ff2ee0;"'; // 400 club
    }
    else if(speeds.adjusted>=300) {
        adjustedStyle=' style="color: #ffc22a;"'; // 300 club
    }
    let adjustedLine = getElementFromString('tr','<td'+adjustedStyle+'>Adjusted:</td><td><div class="adjustedDisplay tblOwnStatsNumber" style=""><span class="adjusted"'+adjustedStyle+'>'+adjustedResult+'</span></div></td>');
    let warningLine=getElementFromString('tr',status.latestWarning);

    tblOwnStatsBody.insertBefore(document.createElement('br'),timeLine);
    tblOwnStatsBody.insertBefore(unlaggedLine,timeLine);
    tblOwnStatsBody.insertBefore(startLine,timeLine);
    tblOwnStatsBody.insertBefore(adjustedLine,timeLine);
    tblOwnStatsBody.insertBefore(document.createElement('br'),timeLine);

    let accuracyTag = document.querySelector('.TypingLogReplayPlayer > tbody > tr:nth-child(3) > td > table > tbody > tr > td:nth-child(5)');
    let displayLine = accuracyTag.parentNode;
    let displayTagTitle = getElementFromString('td','<div class="lblStatusIndicator">Adjusted:</div>');
    displayTagTitle.style.textAlign="left";
    displayTagTitle.style.verticalAlign="top";
    let displayTag = getElementFromString('td','<div class="statusIndicator" style=""><span class="adjusted" id="adjustedReplayDisplay"></span></div>');
    displayTag.style.textAlign="left";
    displayTag.style.verticalAlign="top";
    displayLine.insertBefore(displayTagTitle,accuracyTag);
    displayLine.insertBefore(displayTag,accuracyTag);
    status.displayTag=document.getElementById('adjustedReplayDisplay');
    status.createdDisplayTag = true;

    let buttonsLine = document.querySelector('.TypingLogReplayPlayer > tbody > tr:nth-child(4) > td > table > tbody > tr');
//     let maxAdjButton = getElementFromString('td','<div style="position:absolute; top: 2px; right: 5px; color:black; font-weight: bold;"> </div><img src="https://play.typeracer.com/com.typeracer.guest.Guest/clear.cache.gif" style="width: 15px; height: 20px;" border="0" class="ImageButton" title="Go to peak adjusted speed (experimental)">');
    let maxAdjButton = getElementFromString('td','<img src="https://github.com/PoemOnTyperacer/tampermonkey/blob/master/peak_button_2.png?raw=true" style="width: 15px; height: 20px;" border="0" class="ImageButton" title="Go to peak adjusted speed (experimental)">');

    maxAdjButton.style.position='relative';
    buttonsLine.appendChild(maxAdjButton);
    maxAdjButton.onclick=function() {navigateLogTo(status.maximumAdjustedIndex)};
}


function sleep(x) { // Wait for x ms
  return new Promise(resolve => setTimeout(resolve, x));
}

async function navigateLogTo(index) {
    console.log('navigating to '+index);
    let cursor = status.replayCursor;
    if(cursor==-1) {
        window.alert("can't navigate (no replay)");
    }
    let navigationLine=document.querySelector('.TypingLogReplayPlayer > tbody > tr:nth-child(4) > td');
    navigationLine.style.filter = "brightness(50%)";
    navigationLine.style.pointerEvents="none";
    let play = document.querySelector('.TypingLogReplayPlayer > tbody > tr:nth-child(4) > td > table > tbody > tr > td:nth-child(1) > img');
    let backward = document.querySelector('.TypingLogReplayPlayer > tbody > tr:nth-child(4) > td > table > tbody > tr > td:nth-child(4) > img');
    let forward=document.querySelector('.TypingLogReplayPlayer > tbody > tr:nth-child(4) > td > table > tbody > tr > td:nth-child(5) > img');
    let gonePast = false;
    while(cursor>-1&&cursor!=index) {
        if(cursor<index&&!gonePast) {
            console.log('going forward (not passed yet)');
            forward.click();
        }
        else if(cursor>index) {
            console.log('going backwards');
            backward.click();
            if(!gonePast) {
                gonePast=true;
                console.log('first time');
            }
        }
        else { //cursor<index & gonePast
            let timeTillPeak = status.delays.partialSum(cursor,index-1)+parseInt(status.delays[index])/4;
            console.log('playing replay for '+timeTillPeak+' ms');
            play.click();
            await sleep(timeTillPeak);
            play.click();
            break;
        }
        await sleep(1);
        cursor=status.replayCursor;
    }
    navigationLine.style.pointerEvents="";
    navigationLine.style.filter = "brightness(100%)";
    console.log('done!');
}

// async function navigateLogTo(index,passedBefore=false,watching=false,iterations=0) {
//     console.log('navigating log to index '+index);
//     let cursor = status.replayCursor;
//     if(cursor==-1) {
//         console.log('replay player not found');
//         return;
//     }
//     let play = document.querySelector('.TypingLogReplayPlayer > tbody > tr:nth-child(4) > td > table > tbody > tr > td:nth-child(1) > img');
//     if(cursor==index) {
//         if(watching) {
//             console.log('attained target index. Pausing replay');
//             play.click();
//         }
//         console.log('success!');
//         return;
//     }
//     let backward = document.querySelector('.TypingLogReplayPlayer > tbody > tr:nth-child(4) > td > table > tbody > tr > td:nth-child(4) > img');
//     let forward=document.querySelector('.TypingLogReplayPlayer > tbody > tr:nth-child(4) > td > table > tbody > tr > td:nth-child(5) > img');
//     if(iterations==0){
//         passedBefore=cursor>index;
//         if(passedBefore)
//             console.log('started after the target index');
//     }
//     if(cursor<index) {
//         if(passedBefore) {
//             if(!watching) {
//                 console.log('optimal previous fast position reached. Watching replay...');
//                 play.click();
//                 watching=true;
//             }
//             else {
//                 console.log('failure!');
//                 return;
//             }
//         }
//         else {
//             forward.click();
//             console.log('position is before target index. Fast-forwarding...');
//         }
//     }
//     else if(cursor>index) {
//         backward.click();
//         console.log('fast-"backwarding"...');
//         if(!passedBefore) {
//             passedBefore=true;
//             console.log('(passed target index for the first time)');
//         }
//     }
//     await sleep(1000);
//     navigateLogTo(index,passedBefore,watching,iterations+1);
// }

function getElementFromString(tag, string) {
    let element = document.createElement(tag);
    element.innerHTML = string;
    return element;
}

function refreshCursor() {
    let replayExists=!!document.getElementsByClassName('acceptedChars')[0];
    if(!replayExists) {
        status.replayCursor=-1;
        return;
    }
    else {
        status.replayCursor = document.getElementsByClassName('acceptedChars')[0].innerText.length;
    }
}
setInterval(refreshCursor,1);

function adjustedReplay() {
    if((status.room=='practice'||status.room=='ghost'||status.room=='public')&&status.race=='finished') {
        let replayCursor = status.replayCursor;
        if(status.replayCursor==-1) {
            return;
        }

        let currentUnlagged = (document.querySelector('.TypingLogReplayPlayer > tbody > tr:nth-child(3) > td > table > tbody > tr > td:nth-child(4) > span').innerText || '0 WPM').split(' WPM')[0]
        let previousUnlagged= status.latestUnlagged;
        let previousCursor = status.latestCursor;
        let previousAdjusted=status.previousAdjusted;

        let partialAdjusted = status.latestPartialAdjusteds[replayCursor];
        let resultStr = partialAdjusted.toFixed(2)+' WPM'
        let titleStr = partialAdjusted.toFixed(8)+' WPM';
        if(status.createdDisplayTag==true) {
            if(status.displayTag.innerText!=resultStr) {
                status.displayTag.innerText=resultStr;
                status.displayTag.title=titleStr;
            }
        }
    }
}
setInterval(adjustedReplay,1);

}

// MORE VALUES ON RACE DETAILS PAGE
else{

var race_log = '';
function consecutiveLogNumbersAfter(k)
{
    let ofTheJedi='';
    while(k<race_log.length&&/^\d+$/.test(race_log[k]))
    {
        ofTheJedi+=race_log[k++]
    }
    return ofTheJedi;
}

// Wait for page loading to access replay
window.addEventListener('load', function() {
    setTimeout(function(){

    //Cleaner detail
    document.querySelector('.raceDetails > tbody > tr:nth-child(2) > td').innerText = "Race";

    //find and grab log
    let script=document.getElementsByTagName('script');
    for(let m=0; m<script.length;m++)
    {
        if(script[m].innerText.includes("var typingLog"))
            race_log = script[m].innerText.split(',')[3].split('\|')[0];
    }

	// Unlagged speed
	document.getElementsByClassName('ImageButton')[4].click();
	var unlagged_speed = parseFloat(document.getElementsByClassName('statusIndicator')[1].title.split(' WPM')[0]);
	document.getElementsByClassName('ImageButton')[1].click();

	// Adjusted speed
	var quote_length = $('.fullTextStr')[0].innerText.split('').length;
	var t_total = quote_length/unlagged_speed; // in seconds/12
    var start_time_ms;
    if(race_log[0]=='\\')
    {
        if(race_log[1]=='b') //numbers
            start_time_ms=consecutiveLogNumbersAfter(3);
        else if(race_log[1]=='u') //unicode characters
            start_time_ms=consecutiveLogNumbersAfter(6);
        else //escaped characters
            start_time_ms=consecutiveLogNumbersAfter(2);
    }
    else
        start_time_ms=consecutiveLogNumbersAfter(1);
    var t_start=parseInt(start_time_ms)/12000; // s/12
    var adjusted_speed = ((quote_length-1)/(t_total-t_start)).toFixed(3);
    var desslejusted = ((quote_length)/(t_total-t_start)).toFixed(3);

	var points = 0;
	var lagged_speed = 0;

	// Race context
	var [race_universe,univ_index] = ["play",4];
	if($('.raceDetails > tbody > tr:nth-child(4) > td:nth-child(1)')[0].innerText=="Universe")
    {
		race_universe = $('.raceDetails > tbody > tr:nth-child(4) > td:nth-child(2)')[0].innerText;
        univ_index++;
    }
	var player_name = /.*\((.*)\)$/.exec($('.raceDetails > tbody > tr:nth-child(1) > td:nth-child(2)')[0].innerText)[1];
	var race_number = $('.raceDetails > tbody > tr:nth-child(2) > td:nth-child(2)')[0].innerText;
	var date_str = $('.raceDetails > tbody > tr:nth-child(3) > td:nth-child(2)')[0].innerText;

	// Race timespan
	var date_obj = new Date(date_str);
	var race_unix_num = parseInt((date_obj.getTime()/1000).toFixed(0));
	var unix_start = (race_unix_num-1).toString();
	var unix_end = (race_unix_num+1).toString();

	// Fetch race data from timespan API (exact lagged speed, points)
	var race_data_url = 'https://data.typeracer.com/games?playerId=tr:'+player_name+'&universe='+race_universe+'&startDate='+unix_start+'&endDate='+unix_end;
	console.log(race_data_url);
    fetch(race_data_url)
		.then(response => {
		if (response.status !== 200)
			return;
		response.json().then(data => {
			for(var i=0;i<data.length;i++)
			{
				if(data[i].gn==race_number) // In case timespan contained multiple races
				{
					// Display values
                    var registered_speed = parseFloat(data[i].wpm);

                    var t_total_lagged = quote_length/registered_speed; // s/12
                    var ping = Math.round((t_total_lagged-t_total)*12000); // ms

                    var reverse_lag_style = '';
                    if(unlagged_speed < registered_speed)
                        reverse_lag_style=' color:red; font-weight: 1000;';
                    registered_speed = registered_speed.toFixed(2);
                    unlagged_speed = unlagged_speed.toFixed(8);
                    var points = Math.round(data[i].pts);
                    var ghost_button_html = $('.raceDetails > tbody > tr:nth-child('+univ_index+') > td:nth-child(2) > a')[0].outerHTML.split('<a').join('<a style="position: absolute;left: 100px;"');
					$('.raceDetails > tbody').append($('<tr><td>Points</td><td>'+points+'</td></tr>'));
                    let ds_html='';
                    if(SHOW_DESSLEJUSTED)
                        ds_html='<tr><td>Desslejusted</td><td>'+desslejusted+' WPM</td></tr>'
					$('.raceDetails > tbody > tr:nth-child('+univ_index+')')[0].outerHTML = '<br><tr><td>Registered</td><td style="position: relative;'+reverse_lag_style+'"><span>'+registered_speed+' WPM</span>'+ghost_button_html+'</td></tr><tr><td>Unlagged</td><td>'+unlagged_speed+' WPM (ping: '+ping+'ms)</td></tr><tr><td>Adjusted</td><td>'+adjusted_speed+' WPM (start: '+start_time_ms+'ms)</td></tr>'+ds_html+'<br>';
				}
			}
			});
		})
		.catch(err => {
			console.log("[D.TR-P] error: "+err);
		});
    },100);
}, false);
}
