// ==UserScript==
// @name         Typeracer: Adjusted speed
// @namespace    http://tampermonkey.net/
// @version      1.6.6
// @downloadURL  https://raw.githubusercontent.com/PoemOnTyperacer/tampermonkey/master/adjusted_speed.user.js
// @description  Adds the Adjusted speed metric (among other things) to race end and race details pages
// @author       poem & ph0t0shop
// @match        https://data.typeracer.com/pit/text_info*
// @match        https://data.typeracer.com/pit/result*
// @match        https://play.typeracer.com/*
// @match        https://staging.typeracer.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      data.typeracer.com
// @connect      typeracerdata.com
// @noframes
// ==/UserScript==

/*=========SETTINGS=============*/
const SHOW_DESSLEJUSTED = false;
/*==============================*/

// What is the difficulty metric? http://bit.ly/typeracertextdifficulty

if (window.top != window.self) { // skip IFrame stuff
    return;
}

let status = {
    url: window.location.href,
    responsiveTheme: typeof com_typeracer_redesign_Redesign === "function",
    room: 'other',
    race: 'none',
    latestPartialAdjusteds: [],
    delays: [],
    maximumAdjustedIndex: 0,
    maximumAdjustedValue: 'undefined',
    reverseLag: false,
    averageDifficulty: 'undefined',
    isGuest: true
}

if (status.responsiveTheme)
    GM_addStyle(`
.mainViewport table.textInfoView>tbody>tr .tblOwnStats tr:nth-child(3) td:nth-child(1),
.mainViewport table.textInfoView>tbody>tr .tblOwnStats tr:nth-child(4) td:nth-child(1),
.mainViewport table.textInfoView>tbody>tr .tblOwnStats tr:nth-child(5) td:nth-child(1) {
    background-image: none;
}
.mainViewport table.textInfoView>tbody>tr .tblOwnStats tr:nth-child(9) td:nth-child(1) {
    background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACMAAAAiCAYAAADVhWD8AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyxpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMDY3IDc5LjE1Nzc0NywgMjAxNS8wMy8zMC0yMzo0MDo0MiAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIEVsZW1lbnRzIDE0LjAgKFdpbmRvd3MpIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOjI0N0MxREYzRkE5MDExRTdBQ0ZERUNFOEE1RjgyN0IxIiB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOjI0N0MxREY0RkE5MDExRTdBQ0ZERUNFOEE1RjgyN0IxIj4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6MjQ3QzFERjFGQTkwMTFFN0FDRkRFQ0U4QTVGODI3QjEiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6MjQ3QzFERjJGQTkwMTFFN0FDRkRFQ0U4QTVGODI3QjEiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz7A+ZXiAAAIVElE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);
}
.mainViewport table.textInfoView>tbody>tr .tblOwnStats tr:nth-child(12) td:nth-child(1) {
    background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACMAAAAiCAYAAADVhWD8AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyxpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMDY3IDc5LjE1Nzc0NywgMjAxNS8wMy8zMC0yMzo0MDo0MiAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIEVsZW1lbnRzIDE0LjAgKFdpbmRvd3MpIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOjM0OUQyNTMzRkE5MDExRTc4QjJDRDM2RkVBMEZGREU5IiB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOjM0OUQyNTM0RkE5MDExRTc4QjJDRDM2RkVBMEZGREU5Ij4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6MzQ5RDI1MzFGQTkwMTFFNzhCMkNEMzZGRUEwRkZERTkiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6MzQ5RDI1MzJGQTkwMTFFNzhCMkNEMzZGRUEwRkZERTkiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz6CL7G2AAAJNElE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);
}
`);

Array.prototype.partialSum = function (initial, final) {
    let result = 0;
    for (let n = initial; n < final + 1; n++) {
        result += parseInt(this[n]);
    }
    return result;
}

String.prototype.replaceAt = function (index, replacement) {
    return this.substr(0, index) + replacement + this.substr(index + replacement.length);
}

String.prototype.removeAt = function (indices) {
    if (typeof (indices) == 'number') {
        if (indices < this.length)
            return this.slice(0, indices) + this.slice(indices + 1);
        else
            console.log("error: can't remove character at index " + indices + " (out of bounds)");
    }
    else {
        let sub = 0;
        let ans = this;
        for (let n = 0; n < indices.length; n++) {
            if (indices[n - sub] < this.length) {
                ans = this.slice(0, indices[n - sub]) + this.slice(indices[n + 1 - sub]);
                sub++;
            }
            else
                console.log("error: can't remove character at index " + indices[n] + " (out of bounds)");
        }
        return ans;
    }
}

String.prototype.substringAfterNth = function (needle, n) {
    let counter = 0;
    let index = 0;
    for (let i = 0; i < this.length; i++) {
        if (this[i] === needle) {
            counter++;
            if (counter === n) {
                index = i + 1;
                break;
            }
        }
    }
    return this.substring(index);
}

function insertAfter(newNode, existingNode) {
    existingNode.parentNode.insertBefore(newNode, existingNode.nextSibling);
}

function getElementFromString(tag, string) {
    let element = document.createElement(tag);
    element.innerHTML = string;
    return element;
}

function sleep(x) { // Wait for x ms
    return new Promise(resolve => setTimeout(resolve, x));
}

async function waitFor(awaitable, interval = 50) {
    let result = awaitable();

    while (!result) {
        await sleep(interval);
        result = awaitable();
    }

    return result;
}

function repairLog(log_contents,isNew=false) {
    let x = 0;
    while (x < log_contents.length) {
        if (log_contents.charCodeAt(x) == 8) { // should never be the last character
            //             corrupted numbers and dashes
            log_contents = log_contents.replaceAt(x + 1, 'X');
            log_contents = log_contents.removeAt(x);
            if(isNew) {
                //window.alert('Found corrupted char at i='+x+' in log: '+log_contents);
                console.log('window.alert : Found corrupted char at i='+x+' in log: '+log_contents);
            }
        }
        x++;
    }
    return log_contents;
}

function findAll(exp,string) {
    var rx = new RegExp(exp, "g");
    var matches = new Array();
    let match;
    while((match = rx.exec(string)) !== null){
        matches.push(match[0]);
    }
    return matches;
}

function createAdjustedReplay() { // assumption: replay window exists
    let accuracyTag = document.querySelector('.TypingLogReplayPlayer > tbody > tr:nth-child(3) > td > table > tbody > tr > td:nth-child(5)');
    let displayLine = accuracyTag.parentNode;

    let displayTagTitle = getElementFromString('td', '<div class="lblStatusIndicator">Adjusted:</div>');
    displayTagTitle.style.textAlign = "left";
    displayTagTitle.style.verticalAlign = "top";

    let displayTag = getElementFromString('td', '<div class="statusIndicator" style=""><span class="adjusted" id="adjustedReplayDisplay"></span></div>');
    displayTag.style.textAlign = "left";
    displayTag.style.verticalAlign = "top";

    displayLine.insertBefore(displayTagTitle, accuracyTag);
    displayLine.insertBefore(displayTag, accuracyTag);

    let buttonsLine = document.querySelector('.TypingLogReplayPlayer > tbody > tr:nth-child(4) > td > table > tbody > tr');

    let maxAdjButton = getElementFromString('td', '<img src="https://raw.githubusercontent.com/PoemOnTyperacer/tampermonkey/master/resources/peak_button_2.png" style="width: 15px; height: 20px;" border="0" class="ImageButton" title="Go to peak adjusted speed: ' + status.maximumAdjustedValue + '">');
    maxAdjButton.style.position = 'relative';
    maxAdjButton.id = 'maxAdjButton';

    buttonsLine.appendChild(maxAdjButton);
    maxAdjButton.onclick = function () { navigateLogTo(status.maximumAdjustedIndex) };

    const adjustedReplayDisplay = document.getElementById("adjustedReplayDisplay");
    const acceptedCharsElem = document.getElementsByClassName('acceptedChars')[0];
    const observer = new MutationObserver(() => {
        const replayCursor = acceptedCharsElem.innerText.length;
        const partialAdjusted = status.latestPartialAdjusteds[replayCursor];
        const resultStr = partialAdjusted.toFixed(2) + ' WPM'
        const titleStr = partialAdjusted.toFixed(8) + ' WPM';

        adjustedReplayDisplay.innerText = resultStr;
        adjustedReplayDisplay.title = titleStr;
    });
    observer.observe(acceptedCharsElem, { characterData: true, childList: true });
}

function navigateLogTo(index) { // assumption: replay window exists
    let play = document.querySelector('.TypingLogReplayPlayer > tbody > tr:nth-child(4) > td > table > tbody > tr > td:nth-child(1) > img');
    let beginning = document.querySelector('.TypingLogReplayPlayer > tbody > tr:nth-child(4) > td > table > tbody > tr > td:nth-child(3) > img');
    let nextFrame = document.querySelector('.TypingLogReplayPlayer > tbody > tr:nth-child(7) > td > table > tbody > tr > td:nth-child(2) > img');

    if (play.title == 'Pause')
        play.click();
    beginning.click();

    const acceptedCharsElem = document.getElementsByClassName('acceptedChars')[0];
    const max_increm = 10000;
    let increm;
    for (increm = 0; acceptedCharsElem.innerText.length != index && increm < max_increm; increm++) {
        nextFrame.click();
    }

    if (increm == max_increm) {
        console.log('[log navigator] error : log navigator reached max increment');
        let maxAdjButton = document.getElementById('maxAdjButton');
        maxAdjButton.style.display = 'none';
    }
}

function eugeneIsSmart(new_log_contents) {
    let actions = new Array();
    let regex_stroke = "\\d+,(?:\\d+[\\+\\-$].?)+,";
    let regex_char = '(?:\\d+[\\+\\-$].?)';
    let matches = findAll(regex_stroke,new_log_contents);
    for(let i=0; i<matches.length; i++) {
        let keystroke = matches[i];
        //console.log('typeof keystroke: '+typeof keystroke+'; keystroke: '+keystroke+'; len: '+keystroke.length);
        let chars = findAll(regex_char,keystroke);
        let delay = parseInt(keystroke.split(',')[0])
        if(chars[0][chars[0].length-2]=='$') {
            let new_el = ['0-k',chars[0]]
            chars.shift();
            chars.push(new_el);
        }
        for(let j=0; j<chars.length; j++) {
            let char = chars[j];
            if(j>0) {
                actions.push([char[char.length-2], 0]);
            }
            else {
                actions.push([char[char.length-2], delay]);
            }
        }
    }
    //console.log('actions: '+actions);

    let tot_time=0;
    let raw_times=[]
    for(let i=0; i<actions.length; i++) {
        let action = actions[i];
        tot_time += action[1];
        if(action[0]=='+'|| action[0]=='$') {
            raw_times.push(action[1]);
        }
        else {
            raw_times.pop();
        }
    }
    let raw_time = raw_times.reduce((a, b) => a + b, 0);
    let correction_time = tot_time-raw_time;

    return [tot_time,correction_time,raw_time];
}

(async () => {
    // AFTER-RACE ADJUSTED
    if (!status.url.startsWith('https://data.typeracer.com/')) {
        XMLHttpRequest.prototype.oldSend = XMLHttpRequest.prototype.send;

        XMLHttpRequest.prototype.send = function (body) { // intercept XMLHttpRequests which contain data we need
            if (body) {
                const splitBody = body.split("|");
                const endpoint = splitBody[6];
                const payload = splitBody[13];
                console.log('endpoint='+endpoint+' ; logPayload='+payload+' ; body='+body.toString());

                const join_game_endpoints = ["joinStandaloneGame", "joinSinglePlayerGame", "joinSameReplayGame", "joinRecordedReplayGame", "joinInstantReplayGame"];
                const join_room_endpoints = ["createAndJoinCustomRoom","joinRoom"]
                const leave_game_endpoint = "leaveGame";
                const leave_room_endpoint = "leaveRoom";
                const navigation_endpoints = join_game_endpoints+join_room_endpoints+[leave_game_endpoint,leave_room_endpoint];

                if (endpoint === "updatePlayerProgress" && payload.startsWith("TLv1")) { //catch and store log
                    let typingLog = payload.substring(0, payload.indexOf("\\!")).substringAfterNth(",", 3);
                    let newTypingLog = payload.substring(payload.indexOf("\\!")+2);
                    window.localStorage.setItem('latestTypingLog', btoa(typingLog));
                    window.localStorage.setItem('latestNewTypingLog', btoa(newTypingLog));
                    this.addEventListener("load", function() {
                        try {
                        const responseJSON = JSON.parse(this.responseText.substring(this.responseText.indexOf("[")));
                            console.log("Typing log response JSON: " + responseJSON.toString());
                            console.log('21='+responseJSON[21]+', 27='+responseJSON[27]+', 33='+responseJSON[33]+', 39='+responseJSON[39]+', 45='+responseJSON[45]+', 51='+responseJSON[51]+'; total length ='+responseJSON.length.toString());
                        let resp_len = responseJSON.length;
                        let registered_speed = responseJSON[resp_len-19];
                            let id = responseJSON[resp_len-17];
                        let points = responseJSON[resp_len-15];
                        let accuracy = responseJSON[resp_len-10];
                        console.log('registered speed='+registered_speed+'; points='+points+'; accuracy='+accuracy+'; id='+id);
                            window.localStorage.setItem('latestRegisteredSpeed', registered_speed);
                        window.localStorage.setItem('latestPoints', points);
                            window.localStorage.setItem('latestId', id);
                        window.localStorage.setItem('latestAccuracy', accuracy);
                        }
                        catch(error){
                            //window.alert("error while getting response: "+error);
                            console.log("window.alert : error while getting response: "+error+'\nResponse text: '+this.responseText);
                        }
                    });
                } else if (navigation_endpoints.includes(endpoint)) { //update navigation status
                    let new_status="";
                    if(endpoint==="joinStandaloneGame")
                        new_status="public";
                    else if(endpoint==="joinSinglePlayerGame")
                        new_status="practice";
                    else if(endpoint==="joinRecordedReplayGame"||endpoint==="joinInstantReplayGame")
                        new_status="ghost";
                    else if(endpoint==="joinSameReplayGame")
                        new_status="SameReplayGame";
                    console.log("new_status="+new_status);

                    /*this.addEventListener("load", function() {
                        const responseJSON = JSON.parse(this.responseText.substring(this.responseText.indexOf("[")));
                        console.log("Text ID: " + responseJSON[12]);
                    });*/
                }
            }
            return this.oldSend(body);
        }

        function logToSpeeds(log_contents,new_log_contents,registered_speed) {
            log_contents = repairLog(log_contents);
            new_log_contents = repairLog(new_log_contents,true);

            //initial test new_log_contents = "0,2,452,0+I,102,1+ ,2,4,136,0+w,193,1+a,38,2+s,73,3+ ,6,10,41,0+o,159,1+p,128,1+p,84,3+r,36,4+e,154,5+s,166,5+s,73,7+e,113,8+d,59,9+ ,16,5,91,0+w,81,1+i,48,2+t,97,3+h,6,4+ ,21,2,50,0+a,96,1+ ,23,6,96,0+s,54,1+e,83,2+n,63,3+s,49,4+e,53,5+ ,29,3,42,0+o,56,1+f,55,2+ ,32,6,154,0+v,119,1+a,81,2+g,103,3+u,56,4+e,97,5+ ,38,23,79,0+d,97,1+i,53,2+s,64,3+t,90,4+o,62,5+c,8,6+n,107,7+t,87,8+e,192,8-e,136,7-t,152,6-n,144,5-c,144,4-o,152,3-t,89,3+c,80,4+o,39,5+n,54,6+t,66,7+e,46,8+n,83,9+t,103,10+ ,49,4,33,0+a,95,1+n,55,2+d,66,3+ ,53,16,87,0+d,65,1+i,104,2+s,207,2+s,169,4+a,127,5+t,104,6+i,80,7+s,97,8+f,64,9+a,129,10+c,78,11+t,65,12+i,15,13+o,30,14+n,40,15+ ,69,5,43,0+w,90,1+i,46,2+t,135,3+h,48,4+ ,74,3,80,0+m,46,1+y,41,2+ ,77,4,105,0+o,113,1+w,48,2+n,29,3+ ,81,6,34,0+l,47,1+i,55,2+f,58,3+e,72,4+,,24,5+ ,87,6,107,0+w,51,1+h,34,2+i,81,3+c,13,4+h,76,5+ ,93,4,95,0+w,159,1+a,42,2+s,45,3+ ,97,8,33,0+p,209,1+a,23,2+s,185,2+s,69,4+i,43,5+n,21,6+g,104,7+ ,105,9,75,0+q,48,1+o,48,2+ ,287,2- ,144,1-o,145,0-q,95,0+s,62,1+o,34,2+ ,108,22,62,0+q,56,1+u,47,2+i,75,3+c,32,4+k,49,5+y,8,6+l,63,7+ ,72,8+a,104,9+n,40,10+d,45,11+ ,347,11- ,159,10-d,170,9-n,151,8-a,136,7- ,160,6-l,153,5-y,183,5+l,46,6+y,34,7+ ,116,4,130,0+a,94,1+n,88,2+d,40,3+ ,120,17,53,0+u,147,1+n,31,2+i,142,3+n,205,4+t,103,5+e,96,6+r,79,7+e,71,8+s,33,9+t,129,10+i,38,11+n,33,12+g,104,13+l,45,14+y,180,15+,,12,16+ ,137,4,60,0+a,79,1+n,40,2+d,48,3+ ,141,2,112,0+I,48,1+ ,143,5,128,0+k,72,1+e,120,2+p,144,3+t,138,4+ ,148,9,39,0+t,71,1+h,54,2+i,90,3+n,136,4+k,160,5+i,30,6+n,82,7+g,54,8+ ,157,3,47,0+i,59,1+t,112,2+ ,160,6,62,0+w,40,1+o,32,2+u,122,3+l,22,4+d,40,5+ ,166,3,92,0+b,111,1+e,21,2+ ,169,2,82,0+a,112,1+ ,171,5,61,0+g,91,1+o,136,1+o,13,3+d,50,4+ ,176,6,106,0+t,63,1+h,22,2+i,34,3+n,46,4+g,105,5+ ,182,3,14,0+i,59,1+f,88,2+ ,185,2,128,0+I,48,1+ ,187,6,72,0+c,48,1+o,22,2+u,106,3+l,53,4+d,109,5+ ,193,12,222,0+t,7,1+g,48,2+e,73,3+a,13,4+r,91,5+ ,88,6+m,440,1-g1-e1-a1-r1- 1-m,96,1+e,32,2+a,6,3+r,90,4+ ,198,3,71,0+m,23,1+y,66,2+ ,201,6,81,0+h,71,1+e,25,2+a,29,3+r,122,4+t,54,5+ ,207,4,42,0+o,49,1+u,29,2+t,90,3+ ,211,3,14,0+o,58,1+f,72,2+ ,214,3,56,0+m,62,1+y,47,2+ ,217,18,43,0+b,137,1+e,55,2+s,80,3+t,216,3-t,168,2-s,136,1-e,72,1+e,62,2+a,298,2-a,112,1-e,8,1+r,56,2+e,48,3+a,88,4+s,80,5+t,22,6+,,16,7+ ,225,5,106,0+t,40,1+h,80,2+a,40,3+t,32,4+ ,230,6,40,0+h,103,1+e,22,2+a,9,3+r,146,4+t,54,5+ ,236,6,96,0+w,16,1+h,34,2+i,76,3+c,35,4+h,33,5+ ,242,4,120,0+h,14,1+a,82,2+d,87,3+ ,246,6,48,0+g,129,1+r,13,2+o,131,3+w,11,4+n,27,5+ ,252,3,170,0+s,216,1+o,40,2+ ,255,6,96,0+w,120,1+e,54,2+a,11,3+r,48,4+y,39,5+ ,261,3,48,0+o,74,1+f,39,2+ ,264,5,47,0+l,30,1+i,40,2+f,50,3+e,79,4+.,";

            //$ glitch test new_log_contents = "0,2,347,0+I,47,1+ ,2,9,139,0+t,28,1+h,113,2+o,49,3+u,62,4+g,82,5+h,111,6+t,91,7+:,13,8+ ,11,5,160,0+T,42,1+h,95,2+a,40,3+t,35,4+ ,16,3,53,0+i,71,1+s,44,2+ ,19,4,92,0+t,64,1+h,80,2+e,40,3+ ,23,6,72,0+f,86,1+e,18,2+a,41,3+r,253,4+.,26,5+ ,29,2,106,0+I,40,1+ ,31,5,54,0+h,58,1+a,14,2+v,90,3+e,32,4+ ,36,5,97,0+l,144,1+o,72,2+s,29,3+t,75,4+ ,41,10,71,0+s,41,1+o,28,2+m,43,3+e,10,4+t,103,5+h,7,6+i,54,7+n,16,8+g,123,9+ ,51,11,95,0+i,10,1+m,158,2+p,56,3+o,54,4+r,114,5+t,72,6+a,55,7+n,55,8+t,99,9+,,13,10+ ,62,4,26,0+a,97,1+n,71,2+d,64,3+ ,66,2,144,0+I,21,1+ ,68,7,76,0+c,32,1+a,56,2+n,136,2+n,48,4+o,39,5+t,97,6+ ,75,5,53,0+f,57,1+i,39,2+n,44,3+d,47,4+ ,80,4,31,0+i,64,1+t,72,2+,,23,3+ ,84,4,42,0+a,89,1+n,46,2+d,89,3+ ,88,2,135,0+I,49,1+ ,90,5,126,0+n,98,1+e,150,1+e,81,3+d,32,4+ ,95,4,22,0+i,75,1+t,111,2+.,25,3+ ,99,11,127,0+i,72,1+t,51,2+ ,19,3+i,66,4+s,65,5+ ,60,6+f,93,7+e,438,0$I1-t1- 1-i1-s1- 1-f1-e,88,1+t,54,2+ ,102,3,35,0+i,63,1+s,45,2+ ,105,5,85,0+f,70,1+e,42,2+a,39,3+r,39,4+ ,110,5,22,0+l,26,1+i,58,2+k,30,3+e,73,4+ ,115,3,80,0+i,72,1+f,79,2+ ,118,8,56,0+s,48,1+o,31,2+m,65,3+e,57,4+o,16,5+n,79,6+e,49,7+ ,126,5,68,0+l,132,1+o,79,2+s,11,3+t,12,4+ ,131,4,74,0+h,31,1+i,22,2+s,99,3+ ,135,8,31,0+g,127,1+l,55,2+a,47,3+s,171,3+s,113,5+e,95,6+s,72,7+ ,143,4,81,0+a,50,1+n,37,2+d,80,3+ ,147,5,72,0+w,40,1+e,96,2+n,54,3+t,98,4+ ,152,3,46,0+t,34,1+o,54,2+ ,155,4,73,0+t,55,1+h,68,2+e,39,3+ ,159,8,71,0+g,88,1+l,64,2+a,22,3+s,169,3+s,81,5+e,73,6+s,207,7+ ,167,12,70,0+s,90,0+s,102,2+t,67,3+o,280,3-o,135,2-t,136,0-s,88,1+t,46,2+o,90,3+r,55,4+e,15,5+ ,173,4,106,0+a,233,1+n,119,2+d,48,3+ ,177,5,63,0+t,66,1+h,31,2+e,88,3+y,22,4+ ,182,5,42,0+t,89,1+o,79,2+l,54,3+d,58,4+ ,187,26,72,0+h,22,1+i,34,2+m,8,3+h,64,4+ ,40,5+t,120,6+h,40,7+a,64,8+t,46,9+ ,66,10+t,377,1-i1-m1-h1- 1-t1-h1-a1-t1- 1-t,39,1+i,22,2+m,34,3+h,40,4+ ,49,5+t,79,6+h,65,7+a,22,8+t,66,9+ ,79,10+t,400,1-i1-m1-h1- 1-t1-h1-a1-t1- 1-t,33,1+i,12,2+m,97,3+ ,191,5,49,0+t,113,1+h,57,2+a,48,3+t,39,4+ ,196,4,89,0+t,45,1+h,59,2+e,39,3+ ,200,6,104,0+w,46,1+o,49,2+r,23,3+l,91,4+d,30,5+ ,206,4,25,0+h,94,1+a,24,2+d,99,3+ ,210,4,87,0+r,72,1+u,104,2+n,41,3+ ,214,4,71,0+o,40,1+u,40,2+t,96,3+ ,218,3,13,0+o,44,1+f,55,2+ ,221,8,88,0+g,54,1+l,100,2+a,23,3+s,159,3+s,64,5+e,96,6+s,81,7+ ,229,4,87,0+a,64,1+n,49,2+d,61,3+ ,233,3,106,0+h,40,1+e,123,2+ ,236,6,149,0+w,272,1+o,40,2+u,112,3+l,72,4+d,65,5+ ,242,5,31,0+j,121,1+u,41,2+s,19,3+t,84,4+ ,247,5,31,0+h,48,1+a,22,2+v,66,3+e,48,4+ ,252,3,94,0+t,48,1+o,26,2+ ,255,3,46,0+d,90,1+o,13,2+ ,258,8,57,0+w,98,1+i,40,2+t,43,3+h,109,4+o,81,5+u,8,6+t,103,7+.,";


            let [tot_time,correction_time,raw_time] = eugeneIsSmart(new_log_contents);
            console.log('Total time: '+tot_time+'; correction time: '+correction_time+'; raw time: '+raw_time);


            //     The contents of the quote don't matter, so long as we don't lose the quote length information.
            //     So, let's turn any log into a series of non-digit characters separated by delays
            log_contents = log_contents.replace(/(\\b.)/g, 'N'); //numbers and dashes
            log_contents = log_contents.replace(/(\\u....)/g, 'S'); //special characters
            log_contents = log_contents.replace(/(\\)\D/g, 'E'); //excepted characters

            console.log('repaired and simplified log: '+log_contents);
            console.log('repaired new log: '+new_log_contents);

            log_contents = log_contents.replace(/^./, '');
            let start = parseInt(/(\d*)?/.exec(log_contents)[1]);

            let quote_length = 1;
            let total_time = 0;

            //     Count non-digits and add up delays
            let i = 0;
            let num = '';
            let partialAdjusteds = [0];
            let delays = [];
            let maxAdj = [0, 0]; //maximum partial adjusted speed [index, value]
            while (log_contents[i]) {
                num += log_contents[i];
                if (i == log_contents.length - 1) {
                    total_time += parseInt(num);
                    delays.push(num);
                }
                else if (!log_contents[i + 1].match(/\d/i)) {
                    total_time += parseInt(num);
                    delays.push(num);
                    num = '';
                    let partialAdjusted = 12000 * (quote_length - 1) / (total_time - start) || Infinity;
                    partialAdjusteds.push(partialAdjusted);
                    if (partialAdjusted > maxAdj[1] && partialAdjusted != Infinity) {
                        maxAdj = [quote_length, partialAdjusted];
                    }
                    quote_length++;
                    i = i + 2;
                    continue;
                }
                i++;
            }

            let lagged_time = Math.round(12000 * quote_length/registered_speed);
            let ping = lagged_time-total_time;
            console.log('lagged time = '+lagged_time+' ms; ping = '+ping+' ms');
            let verif = tot_time-total_time;
            if(verif!=0) {
                //window.alert('verif; tot_time-total_time = '+(tot_time-total_time).toString());
                console.log('window.alert: verif; tot_time-total_time = '+(tot_time-total_time).toString());
            }
            let raw_speed = 12000 * quote_length / raw_time;
            let raw_desslejusted_speed = 12000 * quote_length / (raw_time - start);
            let raw_adjusted_speed = 12000 * (quote_length - 1) / (raw_time - start);
            let correction_ratio = correction_time / tot_time;
            console.log('raw speed: '+raw_speed+'; raw adjusted speed: '+raw_adjusted_speed+'; raw desslejusted speed: '+raw_desslejusted_speed+'; correction ratio: '+correction_ratio);
            let unlagged_speed = 12000 * quote_length / total_time;
            let adjusted_speed = 12000 * (quote_length - 1) / (total_time - start);
            let lagged_speed_str = (((document.getElementsByClassName('tblOwnStatsNumber') || [])[0] || {}).innerText || ' wpm').split(' wpm')[0];
            let lagged_speed = parseInt(lagged_speed_str);
            if ((lagged_speed_str == '' || lagged_speed > unlagged_speed + 1)) { //only approximate lagged wpm available before saving
                status.reverseLag = true;
            }

            partialAdjusteds.push(adjusted_speed);
            if (adjusted_speed > maxAdj[1]) {
                maxAdj = [quote_length - 1, adjusted_speed];
            }
            status.latestPartialAdjusteds = partialAdjusteds;
            status.delays = delays;
            status.maximumAdjustedIndex = maxAdj[0];
            status.maximumAdjustedValue = maxAdj[1].toFixed(3);
            //console.log('delays: '+delays);
            //     console.log('partial adjusteds: '+partialAdjusteds);
            //console.log('max adj: '+maxAdj);

            let data = {
                unlagged: unlagged_speed,
                adjusted: adjusted_speed,
                start: start,
                rawUnlagged: raw_speed,
                rawAdjusted: raw_adjusted_speed,
                correctionTime: correction_time,
                correctionRatio: correction_ratio,
                ping: ping
            }
            return data;
        }

        // the script needs to know where it is, because one can leave a ghost, navigate, join a practice racetrack without reloading the page

        function guiClock() {

            let roomTitle = ((document.getElementsByClassName('room-title') || [])[0] || {}).innerText || '';
            let ghost_warning = ((document.getElementsByClassName('gwt-InlineHTML') || [])[0] || {}).innerHTML || '';
            let gameStatus = ((document.getElementsByClassName('gameStatusLabel') || [])[0] || {}).innerHTML || '';

            if(status.room == 'other') {
                if(!!document.getElementsByClassName('signIn')[0]) {

                if(!status.isGuest) {
                    status.isGuest=true;
                    console.log('logged out as guest')
                }
            }

            else {
                if(status.isGuest) {
                    status.isGuest=false;
                    console.log('logged in');
                }
            }
            }


            if (roomTitle == "Practice Racetrack") {
                if (ghost_warning.includes('You are racing against')) {
                    if (status.room != 'ghost') {
                        console.log('new GUI status=ghost');
                        status.room = 'ghost';
                    }
                }
                else {
                    if (status.room != 'practice') {
                        console.log('new GUI status=practice');
                        status.room = 'practice';
                    }
                }
            }
            else if (gameStatus != '') {
                if (status.room != 'public') {
                    console.log('new GUI status=public');
                    status.room = 'public';
                }
            }
            else {
                if (status.room != 'other') {
                    status.room = 'other';
                    status.race = 'none';
                    console.log('new GUI status=other\nGUI race=none');
                }
            }
            if (status.room != 'other') {
                if (gameStatus == 'The race is about to start!') {
                    if (status.race != 'waiting') {
                        console.log('GUI race=waiting');
                        status.race = 'waiting';
                    }
                }
                else if (gameStatus == 'Go!' || gameStatus.startsWith('The race is on')) {
                    status.reverseLag = false;
                    if (status.race != 'racing') {
                        console.log('GUI race=racing');
                        status.race = 'racing';
                    }
                }
                else if (gameStatus == 'The race has ended.' || gameStatus.startsWith('You finished')) {
                    if (status.race != 'finished') {
                        console.log('GUI race=finished');
                        status.race = 'finished';
                        if(!status.isGuest)
                            getPracticeRaceData();
                    }
                }
            }
        }
        setInterval(guiClock, 1);

        function getPracticeRaceData() {
            let latestTypingLog = atob(window.localStorage.getItem('latestTypingLog'));
            let latestNewTypingLog = atob(window.localStorage.getItem('latestNewTypingLog'));
            let latestRegisteredSpeed = window.localStorage.getItem('latestRegisteredSpeed');
            let latestPoints = window.localStorage.getItem('latestPoints');
            let latestId = window.localStorage.getItem('latestId');
            let latestAccuracy = window.localStorage.getItem('latestAccuracy');
            if(latestTypingLog==undefined||latestNewTypingLog==undefined||latestRegisteredSpeed==undefined||latestAccuracy==undefined||latestPoints==undefined)
                return;
            let latestSpeeds = logToSpeeds(latestTypingLog,latestNewTypingLog,latestRegisteredSpeed);
            showPracticeRaceData(latestSpeeds,latestRegisteredSpeed,latestAccuracy,latestPoints,latestId);
        }

        async function showPracticeRaceData(speeds,registered_speed,accuracy,points,id) {
            if(status.isGuest) {
                console.log("This script doesn't support guests racers at the moment. Cancelling additional metrics");
                return;
            }
            if(id==8&&accuracy==3) {
                console.log("Current race is a SameReplayGame, which this script doesn't support at the moment. Cancelling additional metrics");
                return;
            }
            const DEC_PLACES=2;

            let timeLine = document.querySelector('.tblOwnStats > tbody > tr:nth-child(2)');

            let tblOwnStatsBody = timeLine.parentNode;
            let unlaggedResult = speeds.unlagged.toFixed(DEC_PLACES) + ' wpm';
            let adjustedResult = speeds.adjusted.toFixed(DEC_PLACES+1) + ' wpm';
            let startResult = speeds.start + 'ms';

            let rawUnlaggedResult = speeds.rawUnlagged.toFixed(DEC_PLACES) + ' raw';
            let rawAdjustedResult = speeds.rawAdjusted.toFixed(DEC_PLACES+1) + ' raw';

            let registeredTitle = registered_speed.toString() + ' wpm';
            let registeredResult = parseFloat(registered_speed).toFixed(DEC_PLACES) + ' wpm';

            let oldAccuracyResult = (Math.round(accuracy*Math.pow(10,DEC_PLACES+2))/100).toString()+' %';
            /*if(accuracy>1) {
                window.alert('Wrong accuracy endpoint (got '+(parseFloat(accuracy)*100).toFixed(DEC_PLACES)+' % value)');
                console.log('window.alert: Wrong accuracy endpoint (got '+(parseFloat(accuracy)*100).toFixed(DEC_PLACES)+' % value)');
                oldAccuracyResult='Error';
            }*/


            let accuracyTag = document.getElementsByClassName('tblOwnStatsNumber')[2];
            
            let loadTick=0;
            while(accuracyTag==undefined&&loadTick<30) {
                await sleep(200);
                loadTick++;
                console.log("showPracticeRaceData: waited for accuracy tag for 1 tick");
                accuracyTag = document.getElementsByClassName('tblOwnStatsNumber')[2];
            }
            if(loadTick==30){
                console.log("showPracticeRaceData error: accuracy tag timed out");
                return;
            }
            
            let displayed_accuracy = parseFloat(accuracyTag.innerHTML.slice(0,-1));
            let rounded_accuracy = Math.round(accuracy*1000)/10;
            let accuracyResult;
            let accuracyTitle;
            if(displayed_accuracy!=rounded_accuracy) {
                let alert_msg = 'Wrong accuracy endpoint (got '+(parseFloat(accuracy)*100).toFixed(DEC_PLACES)+' % value instead of '+displayed_accuracy.toString()+'%)';
                //window.alert(alert_msg);
                console.log(alert_msg);
                oldAccuracyResult='Error';


            accuracy = Math.min(1.0, parseFloat(accuracy));
            let correctionResult = (speeds.correctionTime/1000).toString()+'s correction time = '+(Math.round(speeds.correctionRatio*Math.pow(10,DEC_PLACES+2))/100).toString()+' %';
            //let allAccuracyResult = (Math.round(accuracy*Math.pow(10,DEC_PLACES+2))/100).toString()+' % ('+correctionResult+')';

            accuracyResult = (Math.round(speeds.correctionRatio*Math.pow(10,DEC_PLACES+2))/100).toString()+' %';
            accuracyTitle = document.querySelector('.tblOwnStats > tbody > tr:nth-child(3) > td:first-child');
            accuracyTitle.innerHTML = 'Correction time:';
}

            else{
                let ratioAccuracy = (Math.round(speeds.correctionRatio*Math.pow(10,DEC_PLACES+2))/100).toString()+' %';
            let ratioAndOldAccuracy = ratioAccuracy+' ('+(Math.round(accuracy*Math.pow(10,DEC_PLACES+2))/100).toString()+' % TR accuracy)';

            accuracyResult = ratioAndOldAccuracy;
            accuracyTitle = document.querySelector('.tblOwnStats > tbody > tr:nth-child(3) > td:first-child');
            accuracyTitle.innerHTML = 'Correction time:';
            }



            let laggedTag = document.getElementsByClassName('tblOwnStatsNumber')[0];
            let pointsTag = document.getElementsByClassName('tblOwnStatsNumber')[3];
            laggedTag.innerHTML = registeredResult;
            laggedTag.title = registeredTitle;
            accuracyTag.innerHTML = accuracyResult;
            accuracyTag.style.cursor = 'help';
            accuracyTag.title = 'Original TypeRacer accuracy: '+oldAccuracyResult;
            //accuracyTag.style.fontWeight = 'normal';

            pointsTag.innerHTML = parseFloat(points).toFixed(DEC_PLACES);

            let pingResult = speeds.ping.toString()+' ms';

            let unlaggedLine = getElementFromString('tr', '<td>Unlagged:</td><td><div class="unlaggedDisplay tblOwnStatsNumber" style=""><span class="unlagged">' + unlaggedResult + '</span></div></td>');
            let rawUnlaggedLine = getElementFromString('tr', '<td></td><td><div class="rawUnlaggedDisplay tblOwnStatsNumber" style=""><span class="rawUnlagged" style="font-weight:normal;">' + rawUnlaggedResult + '</span></div></td>');
            let startLine = getElementFromString('tr', '<td>Start:</td><td><div class="startDisplay tblOwnStatsNumber" style=""><span class="start">' + startResult + '</span></div></td>');
            let pingLine = getElementFromString('tr', '<td>Ping:</td><td><div class="pingDisplay tblOwnStatsNumber" style=""><span class="ping">' + pingResult + '</span></div></td>');

            let difficultyLine=null;
                try {
                    let relative_average = await getLatestDifficulty(id); // TODO: try/catch
                    //                     console.log("relative average: "+relative_average);
                    let [difficulty, delta_diff] = relativeAverageToDifficulty(relative_average);
                    console.log('DIFF='+difficulty+'; DELTA_DIFF='+delta_diff);
                    difficultyLine = getElementFromString('tr', '<td>Difficulty:</td><td><div class="difficultyDisplay tblOwnStatsNumber" style=""><span class="difficulty">' + difficulty +' ('+delta_diff+')</span></div></td>');
                    insertAfter(difficultyLine,pointsTag.parentNode.parentNode.parentNode);
                }
                catch(e) {
                    console.log(e);
                }


            let adjustedStyle = '';
            if (speeds.adjusted >= 400) {
                adjustedStyle = ' style="color: #ff2ee0;"'; // 400 club
            }
            else if (speeds.adjusted >= 300) {
                adjustedStyle = ' style="color: #ffc22a;"'; // 300 club
            }
            if (status.reverseLag)
                laggedTag.style.color = '#ff0000';
            let adjustedLine = getElementFromString('tr', '<td' + adjustedStyle + '>Adjusted:</td><td><div class="adjustedDisplay tblOwnStatsNumber" style=""><span class="adjusted"' + adjustedStyle + '>' + adjustedResult + '</span></div></td>');
            let rawAdjustedLine = getElementFromString('tr', '<td></td><td><div class="rawAdjustedDisplay tblOwnStatsNumber" style=""><span class="rawAdjusted" style = "font-weight:normal;">' + rawAdjustedResult + '</span></div></td>');


            insertAfter(pingLine,timeLine);

            tblOwnStatsBody.insertBefore(document.createElement('br'), timeLine);
            tblOwnStatsBody.insertBefore(unlaggedLine, timeLine);
            if(speeds.unlagged!=speeds.rawUnlagged)
                tblOwnStatsBody.insertBefore(rawUnlaggedLine, timeLine);
            tblOwnStatsBody.insertBefore(adjustedLine, timeLine);
            if(speeds.unlagged!=speeds.rawUnlagged)
                tblOwnStatsBody.insertBefore(rawAdjustedLine, timeLine);
            tblOwnStatsBody.insertBefore(startLine, timeLine);
            tblOwnStatsBody.insertBefore(document.createElement('br'), timeLine);
            unlaggedLine.style.backgroundImage = 'none';
            adjustedLine.style.backgroundImage = 'none';

            createAdjustedReplay();
        }
    }

    //DIFFICULTY ON TEXT DETAILS PAGES
    else if (status.url.startsWith('https://data.typeracer.com/pit/text_info')) {
        try {
        let match = /id=(.*)/.exec(status.url)
        if (match == null)
            return;
        let text_id = match[1];
        let relative_average = await getLatestDifficulty(text_id); // TODO: try/catch
        let [difficulty,delta_diff] = relativeAverageToDifficulty(relative_average);

        let difficultyLine = getElementFromString('tr', '<th>Difficulty:</th><td>' + difficulty + ' ('+delta_diff+')</td>');
        document.querySelector('.avgStatsTable > tbody').appendChild(difficultyLine);
        }
        catch(e) {
            console.log(e);
        }
    }

    // MORE VALUES ON RACE DETAILS PAGE
    else {
        status.room = 'race_details';

        // Wait for replay to have loaded
        await waitFor(() => document.querySelector(".acceptedChars"))

        //Cleaner detail
        document.querySelector('.raceDetails > tbody > tr:nth-child(2) > td').innerText = "Race";

        // typingLog is declared in page script
        let log_contents = typingLog.substring(0, typingLog.indexOf('|'))
        log_contents = log_contents.substringAfterNth(',', 3);
        log_contents = repairLog(log_contents)
        console.log(log_contents);

        let new_log_contents = repairLog(typingLog.substringAfterNth('|',1),true);
        console.log('NEW LOG BUILD - '+new_log_contents);
        let [tot_time,correction_time,raw_time] = eugeneIsSmart(new_log_contents);
        console.log('Total time: '+tot_time+'; correction time: '+correction_time+'; raw time: '+raw_time);

        // log_contents = 'D268o270n161\'240t79 64m113a62k98e79 49a96s143s143u82m223p401t256i80o160n143s65 96-448 303f191i81n159d3 77t98h294e42 46c113o31u146r31a97g128e191 49t128o35 107a49s111k97 128q112u113e78s210t159i64o128n161s79 81a79n111d65 81e240t479o64 128e112x208p97r110e178s159s145 62w80h98a80t111 79y97o31u177 65r64e191a95l98l95y63 80w145a81n88t86.160 96C193o191m161m113u176n158i146c224a94t202e184 79w64i66t93h192 81o576t84h172e176r160s176 80a47s179 94c241l63e127a96r112l464;2y48l672y62 98a207y928 96a208s112 80y175o66u143 48c31a112n65 112t81o94t1026o48 143a80v145o78i145d160 81m127i193s287u207n161d112e113r128s191t177a111n97d110i129n145g95s193,111 239s161a113d807n113e128s175s129 65a63n95d97 63d113r160e241a110a546m62a97.160 208W160i193t94h194 48t127h176i112j1377u160s48t160 63t113h159i64s161 47o96n145e80 47a63g161g145r216e167r1329e143e177m367e111n97t112,897 351y1184o48u159 82c79a79n161 159c225o97m159p207l128e98t110e113l512y111 225t143r337a208n96s127f273o111r112m81 97y79o64u128r65 48l62i146f48e47.96';
        //     Parsing the log to access partial adjusted speeds
        log_contents = log_contents.replace(/(\\b.)/g, 'N'); //numbers and dashes
        log_contents = log_contents.replace(/(\\u....)/g, 'S'); //special characters
        log_contents = log_contents.replace(/(\\)\D/g, 'E'); //excepted characters
        log_contents = log_contents.replace(/^./, '');
        let start = parseInt(/(\d*)?/.exec(log_contents)[1]);
        let quote_length = 1;
        let total_time = 0;
        //     Count non-digits and add up delays
        let i = 0;
        let num = '';
        let partialAdjusteds = [0];
        let delays = [];
        let maxAdj = [0, 0]; //maximum partial adjusted speed [index, value]
        while (log_contents[i]) {
            num += log_contents[i];
            if (i == log_contents.length - 1) {
                total_time += parseInt(num);
                delays.push(num);
            }
            else if (!log_contents[i + 1].match(/\d/i)) {
                total_time += parseInt(num);
                delays.push(num);
                num = '';
                let partialAdjusted = 12000 * (quote_length - 1) / (total_time - start) || Infinity;
                partialAdjusteds.push(partialAdjusted);
                if (partialAdjusted > maxAdj[1] && partialAdjusted != Infinity) {
                    maxAdj = [quote_length, partialAdjusted];
                }
                quote_length++;
                i = i + 2;
                continue;
            }
            i++;
        }

        let unlagged_speed = 12000 * quote_length / total_time;
        let adjusted_speed = 12000 * (quote_length - 1) / (total_time - start);
        let desslejusted = 12000 * ((quote_length) / (total_time - start))
        partialAdjusteds.push(adjusted_speed);

        console.log('Partial Adjusted speeds: ' + partialAdjusteds);


        let raw_speed = 12000 * quote_length / raw_time;
        let raw_desslejusted_speed = 12000 * quote_length / (raw_time - start);
        let raw_adjusted_speed = 12000 * (quote_length - 1) / (raw_time - start);
        let correction_ratio = correction_time / tot_time;
        console.log('raw speed: '+raw_speed+'; raw adjusted speed: '+raw_adjusted_speed+'; raw desslejusted speed: '+raw_desslejusted_speed+'; correction ratio: '+correction_ratio);


        status.latestPartialAdjusteds = partialAdjusteds;
        status.delays = delays;
        status.maximumAdjustedIndex = maxAdj[0];
        status.maximumAdjustedValue = maxAdj[1].toFixed(3);

        createAdjustedReplay();

        let t_total = total_time;
        let start_time_ms = start;

        // Race context
        let [race_universe, univ_index] = ["play", 4];
        if (document.querySelector('.raceDetails > tbody > tr:nth-child(4) > td:nth-child(1)').innerText == "Universe") {
            race_universe = document.querySelector('.raceDetails > tbody > tr:nth-child(4) > td:nth-child(2)').innerText;
            univ_index++;
        }
        let player_name = /.*\((.*)\)$/.exec(document.querySelector('.raceDetails > tbody > tr:nth-child(1) > td:nth-child(2)').innerText)[1];
        let race_number = document.querySelector('.raceDetails > tbody > tr:nth-child(2) > td:nth-child(2)').innerText;
        let date_str = document.querySelector('.raceDetails > tbody > tr:nth-child(3) > td:nth-child(2)').innerText;

        // Race timespan
        let date_obj = new Date(date_str);
        let race_unix_num = parseInt((date_obj.getTime() / 1000).toFixed(0));
        let unix_start = (race_unix_num - 1).toString();
        let unix_end = (race_unix_num + 1).toString();

        // Fetch race data from timespan API (exact lagged speed, points)
        let race_data_url = 'https://data.typeracer.com/games?playerId=tr:' + player_name + '&universe=' + race_universe + '&startDate=' + unix_start + '&endDate=' + unix_end;
        console.log('2-second-range timespan API url for this race: ' + race_data_url);

        let response;
        try {
            response = await fetch(race_data_url);
        } catch (err) {
            console.log("[D.TR-P] error: " + err);
            return;
        }
        if (response.status !== 200) {
            console.log("[D.TR-P] received non-200 status code when requesting data");
            return;
        }

        const data = await response.json();
        const raceData = data.find(race => race.gn == race_number);

        if (!raceData) {
            console.log("[D.TR-P] couldn't find race data");
            return;
        }

        // Display values
        let registered_speed = parseFloat(raceData.wpm);
        //                     registered_speed = 69.79;

        let t_total_lagged = quote_length / registered_speed; // s/12
        let ping = Math.round((t_total_lagged - t_total / 12000) * 12000); // ms

        let reverse_lag_style = '';
        if (unlagged_speed < registered_speed)
            reverse_lag_style = ' color:red; font-weight: 1000;';
        registered_speed = registered_speed.toFixed(2);
        unlagged_speed = unlagged_speed.toFixed(2);
        adjusted_speed = adjusted_speed.toFixed(3);
        desslejusted = desslejusted.toFixed(2);

        raw_speed = raw_speed.toFixed(2);
        raw_adjusted_speed = raw_adjusted_speed.toFixed(3);
        raw_desslejusted_speed = raw_desslejusted_speed.toFixed(2);
        let correction_percentage = (100*correction_ratio).toFixed(2);

        let text_id = raceData.tid;

        let points = raceData.pts.toFixed(2);

        document.querySelector('.raceDetails > tbody > tr:nth-child(1) > td:nth-child(2)').colSpan="2";
        if(document.querySelector('.raceDetails > tbody > tr:nth-child(' + (univ_index+3) + ') > td:nth-child(1)')) {
            if(document.querySelector('.raceDetails > tbody > tr:nth-child(' + (univ_index+3) + ') > td:nth-child(1)').innerText=="Opponents")
                document.querySelector('.raceDetails > tbody > tr:nth-child(' + (univ_index+3) + ') > td:nth-child(2)').colSpan="2";
        }

        let ghost_button_html = document.querySelector('.raceDetails > tbody > tr:nth-child(' + univ_index + ') > td:nth-child(2) > a').outerHTML.split('<a').join('<a style="margin-left: 0ch !important;"');

        let date_td = document.querySelector('.raceDetails > tbody > tr:nth-child(3) > td:nth-child(2)');
        let date_contents = date_td.innerText.split(' ');
        date_td.parentNode.innerHTML = '<td>Date</td><td>'+date_contents.slice(0,4).join(' ')+'</td><td>'+date_contents.slice(4).join(' ')+'</td>';

        let accuracy_row = document.querySelector('.raceDetails > tbody > tr:nth-child('+(univ_index + 1)+')');
        let accuracy_row_contents = accuracy_row.innerHTML.replace(/[\r\n]/gm, '');
        const ACCURACY_REGEX = /.<\/td>        <td>(.+)</;
        let match = ACCURACY_REGEX.exec(accuracy_row_contents);
        let tr_accuracy = match[1];
        accuracy_row.innerHTML = '<td>Correction time:</td><td>'+correction_percentage+'%</td><td>(TR accuracy: '+tr_accuracy+')</td>';

        let pointsRow = document.createElement("tr");
        pointsRow.innerHTML = '<td>Points</td><td>' + points + '</td>';
        document.querySelector('.raceDetails > tbody').appendChild(pointsRow);

        try {
        let relative_average = await getLatestDifficulty(text_id); // TODO: try/catch
        //                     console.log("relative average: "+relative_average);
        let [difficulty, delta_diff] = relativeAverageToDifficulty(relative_average);
            let avgDifficultyRow = document.createElement("tr");
        avgDifficultyRow.innerHTML = '<td>Difficulty</td><td>' + difficulty + '</td><td>('+delta_diff+')</td>';
        document.querySelector('.raceDetails > tbody').appendChild(avgDifficultyRow);
        }
        catch(e) {
            console.log(e);
        }

        let ds_html = '';
        if (SHOW_DESSLEJUSTED) {
            ds_html = '<tr><td>Desslejusted</td><td>' + desslejusted + ' WPM</td></tr><tr><td></td><td>' + raw_desslejusted_speed + ' raw</td></tr>';
        }
        document.querySelector('.raceDetails > tbody > tr:nth-child(' + univ_index + ')').outerHTML = '<br><tr><td>Registered</td><td style="position: relative;' + reverse_lag_style + '"><span>' + registered_speed + ' WPM</span><td>' + ghost_button_html + '</td></tr><tr><td>Unlagged</td><td>' + unlagged_speed + ' WPM</td><td>(ping: ' + ping + 'ms)</td></tr><tr><td></td><td>' + raw_speed + ' raw</td></tr><tr><td>Adjusted</td><td>' + adjusted_speed + ' WPM</td><td>(start: ' + start_time_ms + 'ms)</td></tr><tr><td></td><td>' + raw_adjusted_speed + ' raw</td></tr>' + ds_html + '<br>';
    }
})();

function getLatestDifficulty(id) {
    const apiPromise = new Promise((resolve, reject) => {
        // grabbing typeracerdata's relative average value, which may be used as an indicator of its difficulty
        // Thanks to noah for promptly building this api at my request, to make this feature possible!
        let api_text_url = 'http://typeracerdata.com/api_text?id=' + id;
        GM_xmlhttpRequest({
            method: 'GET',
            url: api_text_url,
            onload: function (response) {
                try {
                    let response_text = response.responseText;
                    let data = JSON.parse(response_text);
                    resolve(data.text_stats.relative_average);
                }
                catch (error) {
                    reject(new Error("[getQuoteDifficulty] error when accessing typeracerdata api: " + error));
                }
            }
        });
    });
    const timeoutPromise = new Promise(async (resolve, reject) => {
        await sleep(3000);
        reject(new Error("[getLatestDifficulty] Error: request to typeracerdata timed out (3s)"));
    });
    return Promise.race([apiPromise, timeoutPromise]);
}

// This function converts typeracerdata's Relative Average into a 0%-100% difficulty
// The average difficulty is around 66.1% -- because the easiest quotes on typeracer are easier than the hardest quotes are hard
function relativeAverageToDifficulty(str) {
    const relative_average = parseFloat(str);

    //     This function assumes that the extreme relative average values on typeracerdata don't change, in order to convert relative_average into an absolute percentage
    const min_d = 1.3936;
    const max_d = 0.5808;
    const span = min_d - max_d;

    //     bring the value between 0 and 1, 0 being the easiest-rated quote
    let original_index = (min_d - relative_average) / span;

    //     bring the final value between 0 and 100
    let difficulty = original_index * 100;

    //     In reality, typeracerdata's relative average value isn't bound between min_d and max_d. They will need some updating occasionally.
    //     In the meantime, the next lines account for this to avoid displaying percentages above 100 or below 0
    if (difficulty > 100 || difficulty < 0) {
        if (difficulty > 100)
            difficulty = 100;
        else if (difficulty < 0)
            difficulty = 0;
        console.log('[relativeAverageToDifficulty] Warning: difficulty for this quote was out of bounds. Please update max and min relative average values with the latest on typeracerdata.');
    }

    //     store the current average difficulty in the console, for comparing purposes
    let averageDifficulty = ((min_d - 1) / span * 100);
    status.averageDifficulty = averageDifficulty.toFixed(2) + '%';

    //     return a percentage string
    //     return (difficulty/10).toFixed(3)+'⭐';
    // return difficulty.toFixed(2).toString() + '%';
    let difficulty_delta = (difficulty-averageDifficulty);
    let output;
    if(difficulty_delta>=0) {
        output = difficulty_delta.toFixed(2) + '% above avg';
    }
    else {
        output = (-1*difficulty_delta).toFixed(2) + '% under avg';
    }
    return [difficulty.toFixed(2) + '%',output];
}
