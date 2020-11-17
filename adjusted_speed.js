// ==UserScript==
// @name         Typeracer: Adjusted speed
// @namespace    http://tampermonkey.net/
// @version      1.4.3
// @updateURL    https://raw.githubusercontent.com/PoemOnTyperacer/tampermonkey/master/adjusted_speed.js
// @downloadURL  https://raw.githubusercontent.com/PoemOnTyperacer/tampermonkey/master/adjusted_speed.js
// @description  Adds the Adjusted speed metric (among other things) to race end and race details pages
// @author       poem & xX0t1Xx
// @match        https://data.typeracer.com/pit/text_info*
// @match        https://data.typeracer.com/pit/result*
// @match        https://play.typeracer.com/*
// @grant        GM_xmlhttpRequest
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @connect      data.typeracer.com
// @connect      typeracerdata.com
// ==/UserScript==

// TEMPORARY VERSION -- DISABLED ON STAGING WHERE IT WAS CAUSING BUGS

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
1.4.0 (08-31-20):   Added adjusted speed on race end screens
                    Added adjusted speed on race end replays
                    Added speed highlights for 300 and 400 club scores
                    Might be unstable on Firefox (working on it)
1.4.1 (09-01-20):   Added adjusted replays on race detail pages
                    Reverse lagged scores are now highlighted in red at the end of races
1.4.2 (09-07-20):   Added a Difficulty value on race and text details pages
                    (What is the difficulty metric? http://bit.ly/typeracertextdifficulty)
=================================================================================================================*/

var status={
    url: window.location.href,
    room:'other',
    race:'none',
    createdDisplayTag:false,
    displayTag:null,
    latestPartialAdjusteds:[],
    delays:[],
    maximumAdjustedIndex:0,
    maximumAdjustedValue:'undefined',
    replayCursor:-1,
    reverseLag:false,
    waiting:false,
    waitingCounter:0,
    latestDifficulty:'undefined',
    averageDifficulty:'undefined'
}

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

function getElementFromString(tag, string) {
    let element = document.createElement(tag);
    element.innerHTML = string;
    return element;
}

function sleep(x) { // Wait for x ms
  return new Promise(resolve => setTimeout(resolve, x));
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

function createAdjustedReplay() {
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
    let maxAdjButton = getElementFromString('td','<img src="https://github.com/PoemOnTyperacer/tampermonkey/blob/master/peak_button_2.png?raw=true" style="width: 15px; height: 20px;" border="0" class="ImageButton" title="Go to peak adjusted speed: '+status.maximumAdjustedValue+' (experimental)">');
    maxAdjButton.style.position='relative';
    buttonsLine.appendChild(maxAdjButton);
    maxAdjButton.onclick=function() {navigateLogTo(status.maximumAdjustedIndex)};
}

function adjustedReplay() {
    if(((status.room=='practice'||status.room=='ghost'||status.room=='public')&&status.race=='finished')||status.room=='race_details') {
        let replayCursor = status.replayCursor;
        if(status.replayCursor==-1||!status.createdDisplayTag) {
            return;
        }

        let currentUnlagged = (document.querySelector('.TypingLogReplayPlayer > tbody > tr:nth-child(3) > td > table > tbody > tr > td:nth-child(4) > span').innerText || '0 WPM').split(' WPM')[0]
        let partialAdjusted = status.latestPartialAdjusteds[replayCursor];
        let resultStr = partialAdjusted.toFixed(2)+' WPM'
        let titleStr = partialAdjusted.toFixed(8)+' WPM';

            if(status.displayTag.innerText!=resultStr) {
                status.displayTag.innerText=resultStr;
                status.displayTag.title=titleStr;
            }

    }
}
setInterval(adjustedReplay,1);

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

    if(play.title=='Pause')
        play.click();

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






// AFTER-GHOST ADJUSTED

if(!status.url.startsWith('https://data.typeracer.com/')) {

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
        if(log_contents.charCodeAt(x)==8) { // should never be the last character
//             corrupted numbers and dashes
            log_contents = log_contents.replaceAt(x+1,'X');
            log_contents = log_contents.removeAt(x);
        }
        x++;
    }

    //     The contents of the quote don't matter, so long as we don't lose the quote length information.
//     So, let's turn any log into a series of non-digit characters separated by delays
    log_contents = log_contents.replace(/(\\b.)/g,'N'); //numbers and dashes
    log_contents = log_contents.replace(/(\\u....)/g,'S'); //special characters
    log_contents = log_contents.replace(/(\\)\D/g,'E'); //excepted characters

//     console.log('repaired and simplified log: '+log_contents);

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
    status.maximumAdjustedValue=maxAdj[1].toFixed(3);
    //console.log('delays: '+delays);
    console.log('partial adjusteds: '+partialAdjusteds);
    //console.log('max adj: '+maxAdj);

    let data = {
        unlagged:unlagged_speed,
        adjusted:adjusted_speed,
        start:start,
    }
    return data;
}

// the script needs to know where it is, because one can leave a ghost, navigate, join a practice racetrack without reloading the page

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

async function showPracticeRaceData(speeds) {
    let timeLine = document.querySelector('.tblOwnStats > tbody > tr:nth-child(2)');
    let tblOwnStatsBody = timeLine.parentNode;
    let unlaggedResult = speeds.unlagged.toFixed(2)+' wpm';
    let adjustedResult = speeds.adjusted.toFixed(2)+' wpm';
    let startResult = speeds.start+'ms';
    let unlaggedLine = getElementFromString('tr','<td>Unlagged:</td><td><div class="unlaggedDisplay tblOwnStatsNumber" style=""><span class="unlagged">'+unlaggedResult+'</span></div></td>');
    let startLine = getElementFromString('tr','<td>Start:</td><td><div class="startDisplay tblOwnStatsNumber" style=""><span class="start">'+startResult+'</span></div></td>');

//     if i eventually figure out a way to find the quote id:
//     await refreshLatestDifficulty(id);
//     let difficultyLine = getElementFromString('tr','<td>Difficulty:</td><td><div class="diffDisplay tblOwnStatsNumber" style=""><span class="diff">'+status.latestDifficulty+'</span></div></td>');

    let adjustedStyle='';
    if(speeds.adjusted>=400) {
        adjustedStyle=' style="color: #ff2ee0;"'; // 400 club
    }
    else if(speeds.adjusted>=300) {
        adjustedStyle=' style="color: #ffc22a;"'; // 300 club
    }
    let laggedTag=document.getElementsByClassName('tblOwnStatsNumber')[0];
    if(status.reverseLag)
        laggedTag.style.color='#ff0000';
    let adjustedLine = getElementFromString('tr','<td'+adjustedStyle+'>Adjusted:</td><td><div class="adjustedDisplay tblOwnStatsNumber" style=""><span class="adjusted"'+adjustedStyle+'>'+adjustedResult+'</span></div></td>');
    let warningLine=getElementFromString('tr',status.latestWarning);

    tblOwnStatsBody.insertBefore(document.createElement('br'),timeLine);
    tblOwnStatsBody.insertBefore(unlaggedLine,timeLine);
    tblOwnStatsBody.insertBefore(adjustedLine,timeLine);
    tblOwnStatsBody.insertBefore(startLine,timeLine);
//     tblOwnStatsBody.insertBefore(difficultyLine,timeLine);
    tblOwnStatsBody.insertBefore(document.createElement('br'),timeLine);

    createAdjustedReplay();
}
}

//DIFFICULTY ON TEXT DETAILS PAGES
else if(status.url.startsWith('https://data.typeracer.com/pit/text_info')) {
    async function main(){
        let match = /id=(.*)/.exec(status.url)
        if(match==null)
            return;
        let text_id = match[1];
        await refreshLatestDifficulty(text_id);
        let relative_average=status.latestDifficulty;
        let difficulty=relativeAverageToDifficulty(relative_average);

        let difficultyLine = getElementFromString('tr','<th title="Average difficulty: '+status.averageDifficulty+'">Difficulty:</th><td>'+difficulty+'</td>');
        document.querySelector('.avgStatsTable > tbody').appendChild(difficultyLine);
    }
    main();
}

// MORE VALUES ON RACE DETAILS PAGE
else {
status.room='race_details';

var race_log = '';

// Wait for page loading to access replay
window.addEventListener('load', function() {
    setTimeout(async function(){

    //Cleaner detail
    document.querySelector('.raceDetails > tbody > tr:nth-child(2) > td').innerText = "Race";

    //find and grab log
    let script=document.getElementsByTagName('script');
    let log_contents;
    for(let m=0; m<script.length;m++)
    {
        if(script[m].innerText.includes("var typingLog")) {
            let script_contents = script[m].innerText;
            script_contents = script_contents.split(',');
            script_contents.splice(0,3);
            let script_contents_trimmed_start = script_contents.join(',');
            log_contents = script_contents_trimmed_start.split('\|')[0];
        }
    }

//     Parsing the log to access partial adjusted speeds
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
    let desslejusted = 12000*((quote_length)/(total_time-start))
    partialAdjusteds.push(adjusted_speed);

    console.log('Partial Adjusted speeds: '+partialAdjusteds);

    status.latestPartialAdjusteds = partialAdjusteds;
    status.delays=delays;
    status.maximumAdjustedIndex=maxAdj[0];
    status.maximumAdjustedValue=maxAdj[1].toFixed(3);

    createAdjustedReplay();

    let t_total = total_time;
    let start_time_ms = start;

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
	console.log('2-second-range timespan API url for this race: '+race_data_url);
    fetch(race_data_url)
		.then(response => {
		if (response.status !== 200)
			return;
		response.json().then(async data => {
			for(var i=0;i<data.length;i++)
			{
				if(data[i].gn==race_number) // In case timespan contained multiple races
				{
					// Display values
                    var registered_speed = parseFloat(data[i].wpm);

                    var t_total_lagged = quote_length/registered_speed; // s/12
                    var ping = Math.round((t_total_lagged-t_total/12000)*12000); // ms

                    var reverse_lag_style = '';
                    if(unlagged_speed < registered_speed)
                        reverse_lag_style=' color:red; font-weight: 1000;';
                    registered_speed = registered_speed.toFixed(2);
                    unlagged_speed = unlagged_speed.toFixed(2);
                    adjusted_speed = adjusted_speed.toFixed(3);
                    desslejusted = desslejusted.toFixed(2);


                    let text_id=data[i].tid;
                    await refreshLatestDifficulty(text_id);
                    let relative_average=status.latestDifficulty;
//                     console.log("relative average: "+relative_average);
                    let difficulty=relativeAverageToDifficulty(relative_average);

                    var points = Math.round(data[i].pts);
                    var ghost_button_html = $('.raceDetails > tbody > tr:nth-child('+univ_index+') > td:nth-child(2) > a')[0].outerHTML.split('<a').join('<a style="position: absolute;left: 100px;"');
					$('.raceDetails > tbody').append($('<tr><td>Points</td><td>'+points+'</td></tr>'));
                    $('.raceDetails > tbody').append($('<tr><td title="Average difficulty: '+status.averageDifficulty+'">Difficulty</td><td>'+difficulty+'</td></tr>'));
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

async function refreshLatestDifficulty(id) {
    // grabbing typeracerdata's relative average value, which may be used as an indicator of its difficulty
    // Thanks to noah for promptly building this api at my request, to make this feature possible!
    let api_text_url = 'http://typeracerdata.com/api_text?id='+id;
    GM_xmlhttpRequest ( {
        method: 'GET',
        url: api_text_url,
        onload: function (response) {
            try{
                let response_text = response.responseText;
                let data = JSON.parse(response_text);
                status.latestDifficulty=data.text_stats.relative_average;
            }
            catch(error){
                console.log('[getQuoteDifficulty] error when accessing typeracerdata api: '+error);
            }
            status.waiting=false;
        }
    });
    status.waiting = true;
    status.waiting_counter = 0;
    while(status.waiting) {
        if(status.waitingCounter>=300) {
            console.log('[getQuoteDifficulty] Error: request to typeracerdata timed out (3s)');
            status.waiting=false;
            status.latestDifficulty= 'error';
            break;
        }
        status.waitingCounter++;
        await sleep(10);
    }
}

// This function converts typeracerdata's Relative Average into a 0%-100% difficulty
// The average difficulty is around 66.1% -- because the easiest quotes on typeracer are easier than the hardest quotes are hard
function relativeAverageToDifficulty(str) {
    const relative_average=parseFloat(str);

//     This function assumes that the extreme relative average values on typeracerdata don't change, in order to convert relative_average into an absolute percentage
    const min_d = 1.6576;
    const max_d = 0.5819;
    const span = min_d-max_d;

//     bring the value between 0 and 1, 0 being the easiest-rated quote
    let original_index=(min_d-relative_average)/span;

//     bring the final value between 0 and 100
    let difficulty = original_index*100;

//     In reality, typeracerdata's relative average value isn't bound between min_d and max_d. They will need some updating occasionally.
//     In the meantime, the next lines account for this to avoid displaying percentages above 100 or below 0
    if(difficulty>100||difficulty<0) {
        if(difficulty>100)
            difficulty=100;
        else if(difficulty<0)
            difficulty=0;
        console.log('[relativeAverageToDifficulty] Warning: difficulty for this quote was out of bounds. Please update max and min relative average values with the latest on typeracerdata.');
    }

//     store the current average difficulty in the console, for comparing purposes
    status.averageDifficulty=((min_d-1)/span*100).toFixed(2)+'%';

//     return a percentage string
    return difficulty.toFixed(2).toString()+'%';
}
