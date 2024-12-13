// ==UserScript==
// @name         TypeRacer Pacemaker
// @namespace    http://tampermonkey.net/
// @version      1.28
// @downloadURL  https://raw.githubusercontent.com/PoemOnTyperacer/tampermonkey/master/pacemaker.user.js
// @updateURL    https://raw.githubusercontent.com/PoemOnTyperacer/tampermonkey/master/pacemaker.user.js
// @description  Helps you set the pace on TypeRacer!
// @author       poem#3305
// @match        https://play.typeracer.com/*
// @match        https://staging.typeracer.com/*
// @icon         https://www.google.com/s2/favicons?domain=typeracer.com
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      typeracerdata.com
// @noframes
// ==/UserScript==


/*SETTINGS/VARIABLES*/
// Debug settings
let DEBUG,
    DECIMAL_PLACES=2,
    start_time=0, //ms
    showDebugRectangles=false,
    GUI_INTERVAL = 100;

// Context
const responsiveTheme = typeof com_typeracer_redesign_Redesign === "function";
let universe='play';
const UNIVERSE_REGEX=/universe=(.+?)(&.+|$)/;
const CURRENT_URL=window.location.href;
let universeMatch=UNIVERSE_REGEX.exec(CURRENT_URL);
if(universeMatch!=null) {
    universe=universeMatch[1];
}

// User settings
let targetPace,useTb,targetRank,targetUsername,caretColor,showPb,showRank,showCount,showCaret,usePb,useRank,showId,showSource,showDefault,showFinal,showDate,showSelfRank,showTotalRanked,ginoo75Mode;
function setDefaultSettings() {
    targetPace=100;
    useTb=true;
    targetRank=10;
    targetUsername='';
    caretColor='255,0,0';
    showId=false;
    showSource=true;
    showDefault=true;
    showPb=true;
    showDate=true;
    showSelfRank=true;
    showTotalRanked=false;
    showCount=true;
    showRank=true;
    showCaret=true;
    usePb=true;
    useRank=false;
    ginoo75Mode=false;
}

let GUITimeout,GUITimeout2; // Button animations
let menuOpen=false; // Settings menu status
let displayDiv; // Custom HTML container

// Pace logic variables
let pbPace;
let rankPace;
let pace=targetPace;

// Status logic variables
let username=null;
let isGuest=null;
let racing=false;
let awaitRacing=false;
let status='standby';
let await_updatePlayerProgress=false;
let update_tb_line=false;

// Race data variables
let text_id=null;
let registered_speed = null;
let text_best_average=null;
let tba_username=null;

// Rendered text layout
let lineList=[];
let rectList=[];

// Pace caret settings
let pCaret;
let blinkDuration = 1;
let caretThickness = 0.3;
let maxOpacity = 0.7;
let minOpacity = 0.3;
let caretType=0;
let caretOffset=[];


/*MAIN*/
load_settings();
log('current universe: '+universe);
addConfig();
setInterval(clock, GUI_INTERVAL);
addStyles();
createPCaret();
endpoints();


/*LOG & UTILITY*/
function log(msg, color='#7DF9FF') {
    if(DEBUG) console.log('%c [Pacemaker] '+msg, 'color: '+color);
}
function logSettings() {
    log('[logSetting] targetPace='+targetPace+'; useTb='+useTb+'; targetUsername='+targetUsername+'; targetRank='+targetRank+'; caretColor='+caretColor+'; showId='+showId+'; showSource='+showSource+'; debug='+DEBUG+'; ginoo75 mode='+ginoo75Mode+'; showDefault='+showDefault+'; showPb='+showPb+'; showDate='+showDate+'; showSelfRank='+showSelfRank+'; showTotalRanked='+showTotalRanked+'; showCount='+showCount+'; showRank='+showRank+'; showFinal='+showFinal+'; showCaret='+showCaret+'; usePb='+usePb+'; useRank='+useRank,'#D3D3D3');
}
function sleep(x) { // Wait for x ms
    return new Promise(resolve => setTimeout(resolve, x));
}
function capitalizeFirstLetter(string) {
    if(ginoo75Mode) {
        return string;
    }
    return string.charAt(0).toUpperCase() + string.slice(1);
}
function componentToHex(c) { //where c is a string
  var hex = parseInt(c).toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}
function RGBToHex(rgbString) {
    let [red,green,blue]=rgbString.replace(/\s/g, '').split(',');
    return "#" + componentToHex(red) + componentToHex(green) + componentToHex(blue);
}
function hexToRGB(hex) {
    let red = parseInt(hex[1]+hex[2],16);
    let green = parseInt(hex[3]+hex[4],16);
    let blue = parseInt(hex[5]+hex[6],16);
    return [red,green,blue].join(',');
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
function timeSince(dateTimeString) {
    const inputDate = new Date(dateTimeString + ' GMT+0000');
    const currentDate = new Date();
    const differenceInMs = currentDate - inputDate;

    const differenceInMinutes = Math.round(differenceInMs / 60000);
    if (differenceInMinutes <= 59) {
        return `${differenceInMinutes} minute${differenceInMinutes > 1 ? 's' : ''} ago`;
    }
    const differenceInHours = Math.round(differenceInMinutes / 60);
    if (differenceInHours <= 23) {
        return `${differenceInHours} hour${differenceInHours > 1 ? 's' : ''} ago`;
    }
    const differenceInDays = Math.round(differenceInHours / 24);
    if (differenceInDays <= 30) {
        return `${differenceInDays} day${differenceInDays > 1 ? 's' : ''} ago`;
    }
    const differenceInMonths = Math.round(differenceInDays / 30);
    if (differenceInMonths <= 11) {
        return `${differenceInMonths} month${differenceInMonths > 1 ? 's' : ''} ago`;
    }
    const differenceInYears = Math.round(differenceInMonths / 12);
    return `${differenceInYears} year${differenceInYears > 1 ? 's' : ''} ago`;
}
const prependEmoji = type => ({
    book: '\u{1F4DA}',
    movie: '\u{1F3AC}',
    poem: '\u{1F4DC}',
    song: '\u{1F3B5}',
    software: '\u{1F4BB}',
    game: '\u{1F3AE}',
    other: '\u{1F516}'
}[type] || '\u{1F516}') + ` ${type}`;
function decodeHtml(html) {
    var txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
}
function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}


/*SETTINGS MENU, LOAD/SAVE DATA*/
function load_settings(refreshTb=true) {
    targetPace=GM_getValue("targetPace");
    if(targetPace==undefined) {
        setDefaultSettings();
        log('[settings] no saved data. Using default:','#D3D3D3');
        logSettings();
        return;
    }
    targetUsername=GM_getValue("targetUsername");
    if(targetUsername!=''&&refreshTb) getTextBestAverage(targetUsername);
    useTb=!!+GM_getValue("useTb");
    targetRank=GM_getValue("targetRank");
    caretColor=GM_getValue("caretColor");
    showId=!!+GM_getValue("showId");
    showSource=!!+GM_getValue("showSource");
    DEBUG=!!+GM_getValue("DEBUG");
    ginoo75Mode=!!+GM_getValue("ginoo75Mode");
    showDefault=!!+GM_getValue("showDefault");
    showPb=!!+GM_getValue("showPb");
    showDate=!!+GM_getValue("showDate");
    showSelfRank = GM_getValue("showSelfRank");
    if (showSelfRank === undefined) {
        showSelfRank = true;
    } else {
        showSelfRank = !!+showSelfRank;
    }
    showTotalRanked=!!+GM_getValue("showTotalRanked");
    showCount=!!+GM_getValue("showCount");
    showRank=!!+GM_getValue("showRank");
    showFinal=!!+GM_getValue("showFinal");
    showCaret=!!+GM_getValue("showCaret");
    usePb=!!+GM_getValue("usePb");
    useRank=!!+GM_getValue("useRank", useRank);
    log('[settings] loaded data:','#D3D3D3');
    logSettings();
}
function addConfig() {
    if (typeof GM_registerMenuCommand !== "undefined") {
        GM_registerMenuCommand("Pacemaker settings", config,'D');
    }
}
function config() {
    if (typeof GM_setValue !== "undefined")
    {
        if(menuOpen) return;
        menuOpen=true;
        function saveCfg()
        {
            targetPace=document.getElementById("targetPace").value;
            useTb=document.getElementById("useTb").checked;
            targetUsername=document.getElementById("targetUsername").value;
            update_tb_line=true;
            if(targetUsername=='') {
                if(username!=tba_username) getTextBestAverage(username);
            }
            else if(targetUsername!=tba_username) getTextBestAverage(targetUsername);
            else update_tb_line=false;
            targetRank=document.getElementById("targetRank").value;
            caretColor=hexToRGB(document.getElementById("caretColor").value);
            setCaretRGB(caretColor);
            showId=document.getElementById("showId").checked;
            showSource=document.getElementById("showSource").checked;
            DEBUG=document.getElementById("DEBUG").checked;
            ginoo75Mode=document.getElementById("ginoo75Mode").checked;
            showDefault=document.getElementById("showDefault").checked;
            showPb=document.getElementById("showPb").checked;
            showDate=document.getElementById("showDate").checked;
            showSelfRank=document.getElementById("showSelfRank").checked;
            showTotalRanked=document.getElementById("showTotalRanked").checked;
            showCount=document.getElementById("showCount").checked;
            showRank=document.getElementById("showRank").checked;
            showFinal=document.getElementById("showFinal").checked;
            showCaret=document.getElementById("showCaret").checked;
            usePb=document.getElementById("usePb").checked;
            useRank=document.getElementById("useRank").checked;

            GM_setValue("targetPace", targetPace);
            GM_setValue("useTb", useTb ? "1" : "0");
            GM_setValue("targetUsername", targetUsername);
            GM_setValue("targetRank", targetRank);
            GM_setValue("caretColor", caretColor);
            GM_setValue("showId", showId ? "1" : "0");
            GM_setValue("showSource", showSource ? "1" : "0");
            GM_setValue("DEBUG", DEBUG ? "1" : "0");
            GM_setValue("ginoo75Mode", ginoo75Mode ? "1" : "0");
            GM_setValue("showDefault", showDefault ? "1" : "0");
            GM_setValue("showPb", showPb ? "1" : "0");
            GM_setValue("showDate", showDate ? "1" : "0");
            GM_setValue("showSelfRank", showSelfRank ? "1" : "0");
            GM_setValue("showTotalRanked", showTotalRanked ? "1" : "0");
            GM_setValue("showCount", showCount ? "1" : "0");
            GM_setValue("showRank", showRank ? "1" : "0");
            GM_setValue("showFinal", showFinal ? "1" : "0");
            GM_setValue("showCaret", showCaret ? "1" : "0");
            GM_setValue("usePb", usePb ? "1" : "0");
            GM_setValue("useRank", useRank ? "1" : "0");

            log('[settings] saved data:','#D3D3D3');
            logSettings();
            document.getElementById("cfg_save").value = "Saved!";
            clearTimeout(GUITimeout);
            GUITimeout = setTimeout(function() {
                let wowsers=document.getElementById("cfg_save");
                if(wowsers==null) return;
                wowsers.value = "Save";
            },1500);
        }
        var div = document.createElement("div");
        div.style = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            color: #fff;
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        div.innerHTML = `
<div style='margin: auto; overflow-y: auto; max-height: 90%; width: fit-content; border-radius:5px; height: fit-content; border: 1px solid black; color:#ffffff; background: #000000; position: fixed; top: 0; right: 0; bottom: 0; left: 0; z-index: 8888888; line-height: 1;'>
  <b>
    <br>
    <center>Pacemaker</center>
  </b>
  <center>
    <span style='font-size: 45%'>powered by <a href='https://typeracerdata.com/' target='_blank'>typeracerdata.com</a>
    </span>
  </center>
  <div style='margin: 20px;'>
    <center>
      <div id='targetPaceSpan' style='float:left;'>
        <input id='targetPace' type='text' size='7'>
        <span style='margin-left:1em;'>Minimum pace (WPM)</span>
      </div>
      <br>
      <br>
      <div id='useTbSpan' style='float: left; opacity:0.5;pointer-events:none;'>
        <input id='useTb' type='checkbox'>
        <span id='useTbDisplay' style='margin-left:1em;'>Use text best average as minimum pace: unknown</span>
      </div>
      <br>
      <br>
      <div style='float: left;'>
        <input id='targetUsername' type='text' size='7' style='color: #ffffff; background-color: #000000;'>
        <span style='margin-left:1em;'>Target username (empty=current)</span>
      </div>
      <br>
      <br>
      <div style='float: left;'>
        <input id='targetRank' type='text' size='7' style='color: #ffffff; background-color: #000000;'>
        <span style='margin-left:1em;'>Target rank (eg: 10)</span>
      </div>
      <br>
      <br>
      <div style='float: left;'>
        <input id='caretColor' type='color' width='69px' style='color: #ffffff; background-color: #000000; height:20px; padding: initial; margin: initial;'>
        <span style='margin-left:1em;'>Caret color (r,g,b)</span>
      </div>
      <br>
      <br>
      <br>
      <br>
      <b>Show:</b>
      <br>
      <br>
      <input id='showId' type='checkbox' style='float: left; width:initial; padding: initial; margin: initial;'>
      <span style='float:left;margin-left:1em;'>Text ID</span>
      <br>
      <br>
      <input id='showSource' type='checkbox' style='float: left; width:initial; padding: initial; margin: initial;'>
      <span style='float:left;margin-left:1em;'>Source</span>
      <br>
      <br>
      <input id='showDefault' type='checkbox' style='float: left; width:initial; padding: initial; margin: initial;'>
      <span style='float:left;margin-left:1em;'>Minimum pace/Text best average</span>
      <br>
      <br>
      <input id='showPb' type='checkbox' style='float: left; width:initial; padding: initial; margin: initial;'>
      <span style='float:left;margin-left:1em;'>Personal best</span>
      <br>
      <br>
      <input id='showDate' type='checkbox' style='float: left; width:initial; padding: initial; margin: initial;'>
      <span style='float:left;margin-left:1em;'>Personal best date</span>
      <br>
      <br>
      <input id='showSelfRank' type='checkbox' style='float: left; width:initial; padding: initial; margin: initial;'>
      <span style='float:left;margin-left:1em;'>Personal best rank</span>
      <br>
      <br>
      <input id='showTotalRanked' type='checkbox' style='float: left; width:initial; padding: initial; margin: initial;'>
      <span style='float:left;margin-left:1em;'>Total players ranked</span>
      <br>
      <br>
      <input id='showCount' type='checkbox' style='float: left; width:initial; padding: initial; margin: initial;'>
      <span style='float:left;margin-left:1em;'>Total times completed</span>
      <br>
      <br>
      <input id='showRank' type='checkbox' style='float: left; width:initial; padding: initial; margin: initial;'>
      <span style='float:left;margin-left:1em;'>Nth fastest (rank selected above)</span>
      <br>
      <br>
      <input id='showFinal' type='checkbox' style='float: left; width:initial; padding: initial; margin: initial;'>
      <span style='float:left;margin-left:1em;'>Pace to beat</span>
      <br>
      <br>
      <input id='showCaret' type='checkbox' style='float: left; width:initial; padding: initial; margin: initial;'>
      <span style='float:left;margin-left:1em;'>Pace caret</span>
      <br>
      <br>
      <br>
      <br>
      <b>Set pace to the fastest of:</b>
      <br>
      <br>
      <input id='usePb' type='checkbox' style='float: left; width:initial; padding: initial; margin: initial;'>
      <span style='float:left;margin-left:1em;'>Personal best</span>
      <br>
      <br>
      <input id='useRank' type='checkbox' style='float: left; width:initial; padding: initial; margin: initial;'>
      <span style='float:left;margin-left:1em;'>Nth fastest</span>
      <br>
      <br>
      <br>
      <br>
      <b>Other settings:</b>
      <br>
      <br>
      <input id='DEBUG' type='checkbox' style='float: left; width:initial; padding: initial; margin: initial;'>
      <span style='float:left;margin-left:1em;'>Debug</span>
      <br>
      <br>
      <input id='ginoo75Mode' type='checkbox' style='float: left; width:initial; padding: initial; margin: initial;'>
      <span style='float:left;margin-left:1em;'>ginoo75 mode</span>
      <br>
      <br>
      <br>
      <input id='cfg_save' type='button' value='Save' style='display:inline; color: #ffffff; background-color: #000000; width:initial; padding: initial; margin: initial;'>
      <input id='cfg_close' type='button' value='Close' style='display:inline; color: #ffffff; background-color: #000000; width:initial; padding: initial; margin: initial;'>
    </center>
  </div>
</div>
        `;
        document.body.appendChild(div);

        load_settings(false);
        document.getElementById("targetPace").value = targetPace;
        let tbCheckbox=document.getElementById("useTb");
        tbCheckbox.onchange = toggleTb;
        function toggleTb() {
            let targetPaceSpan=document.getElementById('targetPaceSpan');
            if(tbCheckbox.checked) {
                targetPaceSpan.style.opacity='0.5';
                targetPaceSpan.style.pointerEvents='none';
            }
            else {
                targetPaceSpan.style.opacity='1';
                targetPaceSpan.style.pointerEvents='';
            }
        }
        if(text_best_average!=null&&tba_username!=null) {
            document.getElementById('useTbDisplay').innerText='Use text best average as minimum pace: '+text_best_average.toFixed(DECIMAL_PLACES)+' WPM';
            let useTbSpan=document.getElementById('useTbSpan');
            useTbSpan.style.opacity='1';
            useTbSpan.style.pointerEvents='';
            if(useTb) {
                tbCheckbox.click();
            }
        }
        else {
            tbCheckbox.checked = useTb;
        }
        let targetUsernameInput=document.getElementById("targetUsername");
        targetUsernameInput.value = targetUsername;
        if(username!=null) {
            targetUsernameInput.placeholder=username;
        }
        else targetUsernameInput.placeholder='unknown';
        if(targetUsername=='') {
            if(!isGuest) {
                if(username!=tba_username) getTextBestAverage(username);
            }
            else tba_username=null;
        }
        document.getElementById("targetRank").value = targetRank;
        document.getElementById("caretColor").value = RGBToHex(caretColor);
        document.getElementById("showId").checked = showId;
        document.getElementById("showSource").checked = showSource;
        document.getElementById("DEBUG").checked = DEBUG;
        document.getElementById("ginoo75Mode").checked = ginoo75Mode;
        document.getElementById("showDefault").checked = showDefault;
        document.getElementById("showPb").checked = showPb;
        document.getElementById("showDate").checked = showDate;
        document.getElementById("showSelfRank").checked = showSelfRank;
        document.getElementById("showTotalRanked").checked = showTotalRanked;
        document.getElementById("showCount").checked = showCount;
        document.getElementById("showRank").checked = showRank;
        document.getElementById("showFinal").checked = showFinal;
        document.getElementById("showCaret").checked = showCaret;
        document.getElementById("usePb").checked = usePb;
        document.getElementById("useRank").checked = useRank;
        document.getElementById("cfg_save").addEventListener("click", saveCfg, true);
        document.getElementById("cfg_close").addEventListener("click", function(){div.remove();clearTimeout();menuOpen=false;}, true);
    }
    else
    {
        alert("Sorry, Chrome userscripts in native mode can't have configurations! Install TamperMonkey userscript-manager extension");
    }
}


/*MONITORING TR UI*/
function clock() {
    // Check for race start
    let gameStatusLabels = document.getElementsByClassName('gameStatusLabel');
    let gameStatus = ((gameStatusLabels || [])[0] || {}).innerHTML || '';
    if(!racing&&(gameStatusLabels.length>0 && ( gameStatus == 'Go!' || gameStatus.startsWith('The race is on') ))) {
        let practiceTitleEl = document.getElementsByClassName('roomSection')[0];
        if(practiceTitleEl&&practiceTitleEl.innerText.startsWith('Practice')) {
            if(!awaitRacing) {
                awaitRacing=true;
                log('waiting for user to begin practice race');
            }
        }
        else {
            racing=true;
            raceStart();
        }
    }
    // Check for race end
    if(racing&&((gameStatusLabels.length==0) || (document.getElementsByClassName('rank')[0].innerText=='Done!'||document.getElementsByClassName('rank')[0].innerText.includes('Place')))){
        racing = false;
        log('no longer racing (UI)');
        raceEnd();
    }

    // Logged in status/username
    let current_username;
    if(responsiveTheme) {
        let loginButtons=document.getElementsByClassName('signIn');
        if(loginButtons.length==0) {
            let username_tag=document.getElementsByClassName('userNameLabel')[0];
            if(!username_tag) /*not done loading*/ return;
            if(username_tag.parentNode.classList=='') { /*wrong username tag*/ return;
            }
            if(isGuest||isGuest==null) {
                isGuest=false;
                log('logged in');
            }
            onLoginCommon(username_tag);
        }
        else {
            if(isGuest) return;
            onLogoutCommon();
        }
    }
    else { //classic theme
        let usernameLabel= document.querySelector('.mainUserInfoBox .userNameLabel');
        if(!usernameLabel) /* not done loading*/ return;
        if(usernameLabel.innerText=='Guest') {
            if(isGuest) return;
            onLogoutCommon();
        }
        else {
            if(isGuest||isGuest==null) {
                isGuest=false;
                log('logged in');
            }
            onLoginCommon(usernameLabel);
        }
    }
    function onLogoutCommon() {
        log('logged out');
        if(targetUsername=='') {
            text_best_average=null;
            tba_username=null;
        }
        username=null;
        isGuest=true;
    }
    function onLoginCommon(label) {
        current_username=label.innerText;
        if(current_username.includes('(')) current_username=/.*\((.*)\)$/.exec(current_username)[1];
        if(username!=current_username) {
            log('username: '+current_username);
            username=current_username;
            if(text_best_average==null&&tba_username==null) getTextBestAverage(username);
        }
    }
}

// To position the pace caret, detect the exact shape of the rendered race text
//Thanks Ben Nadel for this helpful article on detecting rendered line breaks: https://www.bennadel.com/blog/4310-detecting-rendered-line-breaks-in-a-text-node-in-javascript.htm
function getRenderedTextData() {
    let textDivContainer = document.querySelector('.inputPanel tbody tr td table tbody tr td div');
    textDivContainer.style.position='relative';
    let [lines, rects]=extractLinesFromDiv(textDivContainer);
    logLines(lines);

    function logLines(lines) {
        if(!DEBUG) return;
        console.group('%c [Pacemaker] rendered lines of text', 'color: #7DF9FF');
        lines.forEach(
            function iterator(line, i) {
                console.log(i, line);
            }
        );
        console.groupEnd();
    }

    function getTextNodes(node) {
        var textNodes = [];
        if (node.nodeType == 3) {
            textNodes.push(node);
        } else {
            var children = node.childNodes;
            for (var i = 0; i < children.length; i++) {
                textNodes.push.apply(textNodes, getTextNodes(children[i]));
            }
        }
        return textNodes;
    }

    function collapseWhiteSpace(value) {
        return (value.trim().replace(/\s+/g, " "));
    }

    function arrayFrom(arrayLike) {
        return (Array.prototype.slice.call(arrayLike));
    }

    function extractLinesFromDiv(div) {
        var range = document.createRange();
        var lines = [];
        var rects = [];
        var lineCharacters = [];
        var textNodes = getTextNodes(div);
        var lastTop = null;
        var combinedRects = [];
        textNodes.forEach(textNode => {
            for (var i = 0; i < textNode.textContent.length; i++) {
                range.setStart(textNode, i);
                range.setEnd(textNode, (i + 1));
                var clientRect = range.getBoundingClientRect();
                if (lastTop === null) {
                    lastTop = clientRect.top;
                }
                if (clientRect.top !== lastTop) {
                    lines.push(lineCharacters.join(""));
                    lineCharacters = [];
                    rects.push(drawRectBox(combinedRects, div));
                    combinedRects = [];
                    lastTop = clientRect.top;
                }
                combinedRects.push(clientRect);
                lineCharacters.push(textNode.textContent.charAt(i));
            }
        });

        // Push last line and draw its box
        if (lineCharacters.length) {
            lines.push(lineCharacters.join(""));
            rects.push(drawRectBox(combinedRects, div));
        }
        return [lines,rects];
    }

    function drawRectBox(rects, parent) {
        if (rects.length === 0) return;
        let parentRect=parent.getBoundingClientRect();
        let parentTop=parentRect.top;
        let parentLeft=parentRect.left;
        let gameView=document.getElementsByClassName('gameView')[0];
        var top = rects[0].top-parentTop;
        var left = rects[0].left-parentLeft;
        var right = rects[rects.length - 1].right-parentLeft;
        var bottom = rects[0].bottom-parentTop;
        var box = document.createElement("span");
        box.classList.add("box");
        box.style.top = top + "px";
        box.style.left = left + "px";
        box.style.width = (right - left) + "px";
        box.style.height = (bottom - top) + "px";
        box.style.background= 'transparent';
        if(DEBUG&&showDebugRectangles) box.style.background = 'rgba(76, 175, 80, 0.1)';
        parent.appendChild(box);
        return [top,left,(bottom-top),(right-left),box];
    }
    lineList=lines;
    rectList=rects;
}


/*MONITORING TYPERACER REQUESTS*/
async function endpoints() {
    //ensure compatibility with Adjusted Speed 1.7.0 and further
    if (!XMLHttpRequest.prototype.oldSend3) {
        XMLHttpRequest.prototype.oldSend3 = XMLHttpRequest.prototype.send;
    }
    XMLHttpRequest.prototype.send = function (body) {


        if (body&&typeof body==='string') {
            const splitBody = body.split("|");
            const endpoint = splitBody[6];
            const payload = splitBody[13];

            const join_game_endpoints = ["joinStandaloneGame", "joinSinglePlayerGame", "joinSameReplayGame", "joinRecordedReplayGame", "joinInstantReplayGame"];
            const join_room_endpoints = ["createAndJoinCustomRoom","joinRoom","joinGameInRoom"];
            const leave_game_endpoint = "leaveGame";
            const leave_room_endpoint = "leaveRoom";
            const navigation_endpoints = join_game_endpoints+join_room_endpoints+[leave_game_endpoint,leave_room_endpoint];

            // Practice race: detected by the UI clock. startGameTask marks the actual race start.
            if(endpoint=="startGameTask"&&awaitRacing) {
                awaitRacing=false;
                racing=true;
                log('user started practice race');
                raceStart();
            }

            // Monitor updatePlayerProgress requests and responses, for typing logs and race result data
            if (endpoint === "updatePlayerProgress" && payload.startsWith("TLv1")) {
                // Catch and store log from the request
                let typingLog = payload.substring(0, payload.indexOf("\\!")).substringAfterNth(",", 3);
                let newTypingLog = payload.substring(payload.indexOf("\\!")+2);

                log('[endpoints] log:\n'+typingLog,'#D3D3D3');
                log('[endpoints] New log:\n'+newTypingLog,'#D3D3D3');

                // Wait for response, then read and store registered speed
                this.addEventListener("load", function() {
                    try {
                        const responseJSON = JSON.parse(this.responseText.substring(this.responseText.indexOf("[")));
                        let resp_len = responseJSON.length;

                        // Only look for registered speed if the race has ended
                        let gameStatus = ((document.getElementsByClassName('gameStatusLabel') || [])[0] || {}).innerHTML || '';
                        if (gameStatus == 'The race has ended.' || gameStatus.startsWith('You finished')) {
                            registered_speed = responseJSON[resp_len-19];
                            log('[endpoints] caught registered_speed='+registered_speed,'#D3D3D3');
                        }
                        // registered_id = responseJSON[resp_len-17];
                        // let points = responseJSON[resp_len-15];
                        // let accuracy = responseJSON[resp_len-10];
                    }
                    catch(error){
                        log("[endpoints] error while getting log "+endpoint+" response: "+error+'\nResponse text: '+this.responseText,'#ff0000');
                    }
                });
            }
            // Monitor other endpoints (contained in the request) to follow as user navigates the game
            this.addEventListener("load", function() {
                try {
                    let entered_new_game=false;
                    if (navigation_endpoints.includes(endpoint)) {
                        // Updating UI nav status
                        let new_status="standby";
                        if(endpoint==="joinStandaloneGame") new_status="public";
                        else if(endpoint==="joinSinglePlayerGame") new_status="practice";
                        else if(endpoint==="joinRecordedReplayGame"||endpoint==="joinInstantReplayGame") new_status="ghost";
                        else if(endpoint==="joinSameReplayGame") new_status="SameReplayGame";
                        else if(endpoint=='createAndJoinCustomRoom'||endpoint=='joinRoom') new_status='customRoom';
                        else if(endpoint=='joinGameInRoom') {
                            log("[endpoints] joined room game",'#D3D3D3');
                            new_status='customRoomGame';
                            // Joining game in private track: getting rendered text shape
                            log("[endpoints] getting rendered text data",'#D3D3D3');
                            getRenderedTextData();
                        }
                        //Leaving game while still in private track
                        else if(endpoint=='leaveGame'&&status=='customRoomGame') {
                            new_status='customRoom';
                            log("[endpoints] left custom room race, still in custom room.",'#D3D3D3');
                        }
                        // WIP (private track logic is annoying)
                        else if(endpoint=='stopGameInRoom') {
                            log('[endpoint] stopgameinroom actions here','red');
                        }
                        log("[endpoints] new_status="+new_status,'#D3D3D3');

                        // Joining game (other than private track (except initial private track join (FML)))
                        if(new_status!="standby"&&!(endpoint=='leaveGame'&&status=='customRoomGame')&&new_status!='customRoomGame') {
                            log("[endpoints] entered new game",'#D3D3D3');
                            pbPace=null;
                            rankPace=null;
                            registered_speed=null;
                            makeDisplay();
                            entered_new_game=true;
                            pickPace();
                            log("[endpoints] getting rendered text data",'#D3D3D3');
                            getRenderedTextData();
                        }
                        // If back to standby, remove custom container if necessary
                        if(new_status=='standby') {
                            if(displayDiv) {
                                displayDiv.remove();
                                log('removed display div','#D3D3D3');
                            }
                        }
                        status=new_status;
                        // If back to standby, stop waiting for the updatePlayerProgress that contains the next private track text ID, if necessary
                        if(new_status=='standby'&&await_updatePlayerProgress) {
                            log('New status standby: no longer waiting for updatePlayerProgress');
                            await_updatePlayerProgress=false;
                        }
                    }

                    // When in private track, the next text ID is contained in some random updatePlayerProgress
                    // To catch it, we need to await_updatePlayerProgress until the right one arrives
                    const responseJSON = JSON.parse(this.responseText.substring(this.responseText.indexOf("[")));
                    if(endpoint=='updatePlayerProgress'&&await_updatePlayerProgress) {
                        if(responseJSON[0]=='0') {
                            // Catch ID
                            text_id=responseJSON[responseJSON.length-21];
                            log('[endpoints] (private track new race) text id='+text_id,'#D3D3D3');
                            await_updatePlayerProgress=false;
                            // Start custom HTML actions
                            makeDisplay();
                            pbPace=null;
                            registered_speed=null;
                            rankPace=null;
                            pickPace();
                            getTextData(text_id); // From TRData
                        }
                    }
                    // On entering a game (other than non-initial private track), retrieve the text ID from response
                    if(entered_new_game) {
                        if(endpoint=='createAndJoinCustomRoom'||endpoint=='joinRoom') {
                            if(responseJSON.length>50) {
                                text_id=responseJSON[responseJSON.length-26];
                            }
                            else {
                                text_id=responseJSON[responseJSON.length-20];
                            }
                            log('[endpoints] (private track) text id='+text_id,'#D3D3D3');
                        }

                        else {
                            text_id=responseJSON[12];
                            log('[endpoints] text id='+text_id,'#D3D3D3');
                        }
                        getTextData(text_id); // From TRData
                    }
                }
                catch(error){
                    if(endpoint!='getSponsoredNotice') log("[endpoints] error while getting "+endpoint+" response: "+error+'\nResponse text: '+this.responseText,'#ff0000');
                }
            });
        }
        return XMLHttpRequest.prototype.oldSend3.call(this, body);
    }
}


/*STYLES*/
function addStyles() {
    document.body.insertAdjacentHTML("beforeend",
`<style>
.glint-text {
  position: relative;
  display: inline-block;
}

.glint-text::after {
  content: attr(data-text);
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;

  /* Align text exactly with the original */
  font-size: inherit;
  line-height: inherit;
  font-weight: inherit;
  font-family: inherit; /* match all text properties if needed */

  color: transparent;

  /* The shining gradient overlay, clipped by text */
  background: linear-gradient(
    120deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.8) 50%,
    rgba(255, 255, 255, 0) 100%
  );
  background-size: 200% auto;
  background-clip: text;
  -webkit-background-clip: text; /* for Safari */

  /* Blend mode ensures the highlight "mixes" with underlying text colors */
  mix-blend-mode: screen;

  animation: shine 2s linear infinite;
}

/* Animation moves the gradient across the text */
@keyframes shine {
  0% {
    background-position: 0% center;
  }
  100% {
    background-position: 200% center;
  }
}



#displayPb1 {
	margin-left: 1.5em;
}

.import-button {
	position: absolute;
	border-radius: 15%;
	height: 2.2em;
	width: 2.2em;
	background-color: transparent;
	border: 2px solid;
	font-size: 9px;
	text-align: center;
	cursor: pointer;
	font-family: Lato, sans-serif;
}

.import-button:hover {
	-webkit-filter: brightness(50%);
	-webkit-transition: all 0.5s ease;
	-moz-transition: all 0.5s ease;
	-o-transition: all 0.5s ease;
	-ms-transition: all 0.5s ease;
	transition: all 0.5s ease;
}

#pCaretDisplay {
	position: relative;
	display: inline-block;
}

.heart-icon {
	position: absolute;
	top: 5px;
	left: 5px;
	opacity: 0.6;
	font-size: 16px;
	cursor: pointer;
	animation: heartbeat 2s infinite;
}

.heart-icon:hover {
	opacity: 1;
}

@keyframes heartbeat {
	0% {
		transform: scale(1);
	}

	20% {
		transform: scale(1.05);
	}

	40% {
		transform: scale(1);
	}

	60% {
		transform: scale(1.05);
	}

	80% {
		transform: scale(1);
	}

	100% {
		transform: scale(1);
	}
}

#pCaretDisplay {
	background-color: transparent
		/*rgba(0,0,0,0.7)*/
		 !important;
	padding: 5px;
	border-radius: 5px;
	margin-bottom: 10px;
	border: 3px solid transparent;
}

#pCaret {
	background-color: white;
	position: absolute;
	z-index: 1000;
	border-radius: 15%;
}

.box {
	position: absolute !important;
}
</style>
<style id='pCaretBlinkStyle'></style>
<style id='pCaretThicknessStyle'></style>
<style id='pCaretAnimationStyle'></style>
`);
    function setBlinkDuration() {
        let caretAnimationStyle=document.getElementById('pCaretAnimationStyle');
        caretAnimationStyle.innerHTML = `
#pCaret {
	-moz-transition: all `+blinkDuration+`s ease-in-out;
	-webkit-transition: all `+blinkDuration+`s ease-in-out;
	-o-transition: all `+blinkDuration+`s ease-in-out;
	-ms-transition: all `+blinkDuration+`s ease-in-out;

	transition: all `+blinkDuration+`s ease-in-out;
	-moz-animation: blink2 normal `+(3*blinkDuration)+`s infinite ease-in-out;

	/* Firefox */
	-webkit-animation: blink2 normal `+(3*blinkDuration)+`s infinite ease-in-out;
	/* Webkit */
	-ms-animation: blink2 normal `+(3*blinkDuration)+`s infinite ease-in-out;
	/* IE */
	animation: blink2 normal `+(3*blinkDuration)+`s infinite ease-in-out;
	/* Opera */
	-webkit-transition: background-color `+(2000*blinkDuration)+`ms linear;
	-moz-transition: background-color `+(2000*blinkDuration)+`ms linear;
	-o-transition: background-color `+(2000*blinkDuration)+`ms linear;
	-ms-transition: background-color `+(2000*blinkDuration)+`ms linear;
	transition: background-color `+(2000*blinkDuration)+`ms linear;
}
        `;
    }
    setBlinkDuration();
    setCaretRGB(caretColor);
    function setCaretDimensions() {
        let caretThicknessStyle = document.getElementById('pCaretThicknessStyle');
        let outputStyle;
        if(caretType===0) {
            outputStyle=`#pCaret {width: `+caretThickness+`ch;height: 1.5em;}`;
            caretOffset=[0,0];
            if(!responsiveTheme) caretOffset=[0,2];
        }
        else if(caretType===1) {
            outputStyle=`#pCaret {width: 1.2ch;height: `+caretThickness+`em;`;
            caretOffset=[0,20];
        }
        caretThicknessStyle.innerHTML = outputStyle;
    }
    setCaretDimensions();
}
function setCaretRGB(color) {
    let caretBlinkStyle = document.getElementById('pCaretBlinkStyle');
    let maxOpacity = 0.7;
    let minOpacity = 0.3;
    caretBlinkStyle.innerHTML = `
@keyframes blink2 {
	0% {
		background-color: rgba(`+color+`, `+maxOpacity+`)
	}

	50% {
		background-color: rgba(`+color+`, `+minOpacity+`)
	}

	100% {
		background-color: rgba(`+color+`, `+maxOpacity+`)
	}
}

@-webkit-keyframes blink2 {
	0% {
		background-color: rgba(`+color+`, `+maxOpacity+`)
	}

	50% {
		background-color: rgba(`+color+`, `+minOpacity+`)
	}

	100% {
		background-color: rgba(`+color+`, `+maxOpacity+`)
	}
}
    `
}


/*CREATING/ANIMATING PACE CARET*/
function createPCaret() {
    pCaret=document.createElement('div');
    pCaret.style.visibility='hidden';
    pCaret.id='pCaret';
}
async function animateCaret(lines, rects) {
    if(lines.length!=rects.length) {
        log('[animation] error: '+lines.length+' lines but '+rects.length+' rects', '#ff0000');
        return;
    }
    let textDivContainer = document.querySelector('.inputPanel tbody tr td table tbody tr td div');
    textDivContainer.appendChild(pCaret);
    await sleep(start_time); // Configurable pace caret "reaction time" after race start

    // Animate each pace caret line individually
    for(let i=0;i<lines.length;i++) {
        if(!racing) break;
        let line=lines[i];
        let character_count = line.length;
        let [top, left, height, width]=rects[i];
        let line_time = 12*character_count/pace-start_time/(1000*lines.length); //in s
        log('[animation] Animating line (len='+character_count+'): "'+line+'"\nFrom top='+parseInt(top)+', left='+parseInt(left)+' over width='+parseInt(width)+' at pace='+pace+'wpm\nTime to line completion at pace = '+line_time.toFixed(2)+' seconds','#D3D3D3');
        pCaret.style.transition='none';
        pCaret.style.visibility='hidden';
        pCaret.style.left=left+'px';
        pCaret.style.top=top+'px';
        pCaret.style.height=height+'px';
        pCaret.style.visibility='visible';
        await sleep(100);
        pCaret.style.transition=(line_time-0.200).toString()+'s linear';
        pCaret.style.left=(left+width).toString()+'px';
        await sleep(1000*line_time-100);
    }
    log('[animation] done','#D3D3D3');
}

function resetCaretAnimation() {
    pCaret.style.transition='0s linear';
    pCaret.style.visibility='hidden';
    log('stopped pCaret transition');
}



/*MAIN LOGIC*/
function raceStart() {
    log('racing');
    // CharlieOG mode soon:tm:?
    // if(!isGuest)
    //     backgroundImportTyperacerData(username);
    pickPace(true);
    if(showCaret) animateCaret(lineList, rectList);
}

function raceEnd() {
    resetCaretAnimation();
    let rankPanelEl = document.querySelector('.rankPanelWpm-self');
    if(!rankPanelEl) {
        log('[raceEnd] no rank panel found. Ending function');
        return;
    }

    // Fetch and display the registered speed user got on the race, either from the UI, or from endpoints with better precision
    let temp_registered_speed = parseInt(rankPanelEl.innerText);
    log('[raceEnd] read UI registered speed = '+temp_registered_speed+'; latest known endpoint registered speed = '+registered_speed,'#D3D3D3');
    if(Math.round(registered_speed)==temp_registered_speed&&(registered_speed%1!=0)) {
        temp_registered_speed=registered_speed;
        log('[raceEnd] replaced UI registered speed with more accurate log registered speed','#D3D3D3');
    }
    else {
        log('[raceEnd] using UI registered speed','#D3D3D3');
    }
    displayResult(temp_registered_speed);

    // Private room non-initial race end: start waiting for the updatePlayerProgress that will contain the next text ID
    if(status=='customRoomGame'||status=='customRoom') {
        await_updatePlayerProgress=true;
        log('end of a private track race. Awaiting updatePlayerProgress with next text ID');
    }
}

// Pace picking logic
function pickPace(forced=false){
    log('[pickpace] starting (forced='+forced+')','#D3D3D3');
    // Forced will be set to "true" when the race starts, if no pace has been picked yet
    // When forced, this function will no longer wait for potential rank or pb speed data

    // Begin with default pace
    let tempPace=targetPace;

    // Replace with tba if wanted, and if available
    if(useTb&&text_best_average!=null&&tba_username!=null) {
        log('[pickpace] replacing minimum pace ('+targetPace+') with tba ('+text_best_average+')','#D3D3D3');
        tempPace=text_best_average;
    }
    else {
        log('[pickpace] continuing with minimum pace ('+targetPace+')\nuseTb='+useTb+'; text_best_average='+text_best_average+'; tba_username='+tba_username,'#D3D3D3');
    }

    // If rank wanted as pace
    if(useRank) {
        // If rank speed not yet available, wait some more
        if(rankPace==null&&!forced) {
            log('[pickpace] failed: useRank=true, but no rankPace yet','#D3D3D3');
            return;
        }
        // Replace with rank speed if available and if higher
        if(rankPace>tempPace) tempPace=rankPace;
    }

    // If pb wanted as pace
    if(usePb) {
        // If pb speed not yet available, wait some more
        if(pbPace==null&&!forced) {
            log('[pickpace] failed: usePb=true, but no pbPace yet','#D3D3D3');
            return;
        }
        // Replace with pb speed if available and if higher
        if(pbPace>tempPace&&pbPace!='none') {
            tempPace=pbPace;
        }
    }
    pace=tempPace;
    log('[pickpace] Success: (forced='+forced+') : '+pace+' pace was picked','#D3D3D3');

    // Display final picked pace if necessary
    if(showFinal) document.querySelector('#displayPace').innerText=parseFloat(pace).toFixed(DECIMAL_PLACES)+' WPM';
}


/*GETTING, AND DISPLAYING, TYPERACER DATA FROM TYPERACERDATA*/
function getTextBestAverage(user) {
    log('[getTextBestAverage] getting tba for user '+user,'#D3D3D3');
    let text_best_url = 'https://www.typeracerdata.com/profile?last=1&universe='+universe+'&username='+user;
    log('[getTextBestAverage] text_best_url = '+text_best_url);
    tba_username=user;
    GM_xmlhttpRequest ( {
        method: 'GET',
        url: text_best_url,
        onload: function (response) {
            let responseHTML=response.responseText;
			textBestProcess(responseHTML);
        }
    });

    function textBestProcess(responseHTML) {
        const tbRegex=/<td>(.*) wpm \(.+total texts raced\)<\/td>/;
        let tbMatch=tbRegex.exec(responseHTML);
        if(tbMatch==null) {
            log("[getTextBestAverage] couldn't find text best data for user="+user+", universe="+universe+" (match==null)",'#ff0000');
            tba_username=null;
            text_best_average=null;
            if(update_tb_line) {
                let useTbDisplay=document.getElementById('useTbDisplay');
                if(useTbDisplay) useTbDisplay.innerText='Use text best average as minimum pace: unknown';
                update_tb_line=false;
            }
            return;
        }
        text_best_average=parseFloat(tbMatch[1]);
        log('[getTextBestAverage] retrieved tba = '+text_best_average+' for user '+user,'#D3D3D3');
        if(update_tb_line) {
            let useTbDisplay=document.getElementById('useTbDisplay');
            if(useTbDisplay) useTbDisplay.innerText='Use text best average as minimum pace: '+text_best_average.toFixed(DECIMAL_PLACES)+' WPM';
            update_tb_line=false;
        }
    }
}

async function getTextData(id) {
    log('[getdata] getting text data with id='+id,'#D3D3D3');
    if(showId) document.querySelector('#displayId').innerText='#'+id;

    // top N data
    let text_leaderboard_url = 'https://typeracerdata.com/text?universe='+universe+'&id='+id+'&rank_start='+targetRank+'&rank_end='+targetRank;
    log('[getdata] text_leaderboard_url = '+text_leaderboard_url);
    GM_xmlhttpRequest ( {
        method: 'GET',
        url: text_leaderboard_url,
        onload: function (response) {
            let responseHTML=response.responseText;
			leaderboardProcess(responseHTML);
        }
    });

    function leaderboardProcess(responseHTML) {
        const rankRegex=/<td>(.*)<\/td>/;
        const usernameAndWPMRegex=/<a href="\/race\?username=(.+)&amp;game=.+?>(.+)<\/a/;
        const sourceRegex=/<em\>(.+?)<\/em>, a (.+?) by (.+?)</;
        let rankMatch=rankRegex.exec(responseHTML);
        let usernameAndWPMMatch=usernameAndWPMRegex.exec(responseHTML);
        let sourceMatch=sourceRegex.exec(responseHTML);
        if(rankMatch==null||usernameAndWPMMatch==null||sourceMatch==null) {
            log("[getdata] couldn't find text leaderboard data for targetRank="+targetRank+", id="+id+" (match==null)",'#ff0000');
            return;
        }
        let rank=parseInt(rankMatch[1]);
        if(rank!=targetRank) {
            log('[getdata] requested rank ('+targetRank+') not found on typeracer data (received '+rank+' instead)','#ff0000');
        }
        let username=usernameAndWPMMatch[1];
        let top_WPM=parseFloat(usernameAndWPMMatch[2]);
        let sourceTitle = decodeHtml(sourceMatch[1]);
        let sourceType = decodeHtml(sourceMatch[2]);
        let sourceAuthor = decodeHtml(sourceMatch[3]);
        log('[getdata] rank='+rank+'; username='+username+'; WPM='+top_WPM+'; title='+sourceTitle+'; type='+sourceType+'; author='+sourceAuthor,'#D3D3D3');
        if(showSource) {
            document.querySelector('#displaySource1').innerText=sourceTitle;
            document.querySelector('#displaySource2').innerText=`(${prependEmoji(sourceType)}),`;
            document.querySelector('#displaySource3').innerText=`by ${sourceAuthor}`;
        }
        if(showRank){
            document.querySelector('#displayRank1').innerText='#'+rank+':';
            document.querySelector('#displayRank3').innerText=username;
            document.querySelector('#displayRank2').innerText=top_WPM.toFixed(DECIMAL_PLACES)+' WPM';
        }
        rankPace=top_WPM;
        pickPace();
    }

    // determine target username, update UI if necessary, end function if necessary
    let tempUsername;
    if(targetUsername=='') {
        if(isGuest) {
            log('[getdata] no target user selected, not logged in = no PB data available','#ff0000');
            if(showPb) {
                let displayPb1El=document.querySelector('#displayPb1');
                displayPb1El.innerText='Personal best:';
                displayPb1El.style.marginLeft='0px';
                document.querySelector('#displayPb2').innerText='No user selected!';
                document.getElementById('queueButton').remove();
                let blockCountEl=document.querySelector('#blockCount');
                if(blockCountEl) blockCountEl.remove();
                pbPace='none';
            }
            return;
        }
        else {
            tempUsername=username;
            log('[getdata] no target user selected, defaulting to logged in username='+tempUsername,'#D3D3D3');
        }
    }
    else {
        tempUsername=targetUsername;
    }
    let text_history_url = 'https://typeracerdata.com/text.races?universe='+universe+'&text='+id+'&username='+tempUsername;
    log('[getdata] text_history_url = '+text_history_url);


    let displayDate=document.querySelector('#displayDate');
    if(showDate) displayDate.style.display='';

    GM_xmlhttpRequest ( {
        method: 'GET',
        url: text_history_url,
        onload: function (response) {
            let responseHTML=response.responseText;
			pbProcess(responseHTML);
        }
    });
    function pbProcess(responseHTML) {
        let displayCount=document.querySelector('#displayCount');
        let displayDate=document.querySelector('#displayDate');

        const emptyRegex=/(Sorry, that username has not yet completed any races on that text.)/;
        let emptyMatch=emptyRegex.exec(responseHTML);
        if(emptyMatch!=null) {
            log('[getdata] user '+tempUsername+' has not yet completed text ID='+id+'; setting pace to '+targetPace,'#ff0000');
            if(showPb) {
                document.querySelector('#displayPb1').innerText=capitalizeFirstLetter(tempUsername);
                document.querySelector('#displayPb2').innerText="hasn't completed this text yet!";
                let blockCountEl = document.querySelector('#blockCount');
                if(blockCountEl) blockCountEl.style.display = 'none';
                displayDate.style.display='none';
            }
            pbPace='none';
            pace=targetPace;

            if(showCount) {
                log('[getdata] setting times typed to 0','#ff0000');
                displayCount.innerText='0';
            }
            return;
        }

        // if text has already been completed, find personal best
        responseHTML=responseHTML.replace(/(\r\n|\n|\r)/gm, "");
        const dateAndWPMRegex=/.+?#ddd;">.+?<\/td>  <td>(.+?)<.+?">(.+?)<\/a/;
        let dateAndWPMMatch=dateAndWPMRegex.exec(responseHTML);
        if(dateAndWPMMatch==null) {
            log("[getdata] couldn't find text history data for username="+tempUsername+", id="+id+" (match==null)",'#ff0000');
            rankPace=targetPace;
            return;
        }
        let date=dateAndWPMMatch[1];
        let pb_WPM=parseFloat(dateAndWPMMatch[2]);
        log('[getdata] pb for username='+tempUsername+' set at date='+date+', WPM='+pb_WPM,'#D3D3D3');

        let outputDate;

        /* GINOO75 MODE*/
        if(ginoo75Mode) outputDate=date.split(' ')[0];
        /* END OF GINOO75 MODE*/

        else outputDate=timeSince(date);

        if(showPb) {
            document.querySelector('#displayPb1').innerText=capitalizeFirstLetter(tempUsername)+"'s best:";//'Pb:';
            document.querySelector('#displayPb2').innerText=pb_WPM.toFixed(DECIMAL_PLACES)+' WPM';
            if(showDate) {
                displayDate.innerText=` ${outputDate}`;
            }
            if(showCount&&displayCount) {
                let outputCount = 0;
                displayCount.innerText=outputCount;
            }
            else {
                let blockCountEl = document.querySelector('#blockCount');
                if(blockCountEl) blockCountEl.style.display = 'none';
            }
        }
        pbPace=pb_WPM;
        pickPace();

        // if text has already been completed, count total times typed
        const parser = new DOMParser();
        const doc = parser.parseFromString(responseHTML, "text/html");
        const table = doc.querySelector('table.profile');
        const rows = table.querySelectorAll('tr');
        const rowCount = rows.length-1;
        log('[getdata] setting times typed to '+rowCount,'#D3D3D3');
        let displayCountEl = document.querySelector('#displayCount');
        if(displayCountEl) displayCountEl.innerText=rowCount;
    }

    // self rank data
    if(!showSelfRank) return;
    let rank_url = 'https://typeracerdata.com/text?universe='+universe+'&id='+id+'&highlight='+tempUsername;
    log('[getdata] rank_url = '+text_history_url);
    GM_xmlhttpRequest ( {
        method: 'GET',
        url: rank_url,
        onload: function (response) {
            let rankResponseHTML=response.responseText;
            if(showTotalRanked) {
                let total_ranked_url = 'https://typeracerdata.com/text?universe='+universe+'&id='+id+'&rank_start=1000000&rank_end=1000000';
                log('[getdata] total_ranked_url = '+total_ranked_url);
                GM_xmlhttpRequest ( {
                    method: 'GET',
                    url: total_ranked_url,
                    onload: function (response2) {
                        let totalRankedHTML=response2.responseText;
                        rankProcess(rankResponseHTML,totalRankedHTML);
                    }
                });
            }
            else rankProcess(rankResponseHTML);
        }
    });
    function rankProcess(responseHTML,totalRankedHTML='') {
        let totalRanked='';
        if(showTotalRanked) {
            const totalRankedParser = new DOMParser();
            const totalRankedDoc = totalRankedParser.parseFromString(totalRankedHTML, "text/html");
            const totalRankedTargetRow = totalRankedDoc.querySelector('td');
            if(totalRankedTargetRow) {
                totalRanked = parseInt(totalRankedTargetRow.innerText);
                log(`[getdata] Found total ranked: #${totalRanked}`);
            }
        }

        const parser = new DOMParser();
        const doc = parser.parseFromString(responseHTML, "text/html");
        const targetRow = doc.querySelector('tr[style*="background-color: #ff0"]');
        if (targetRow) {
            const rankStr = targetRow.querySelector('tr[style*="background-color: #ff0"] > td:first-child').innerText;
            const rank = parseInt(rankStr);
            log(`[getdata] Found self rank: #${rank}`);
            let displaySelfRank = document.getElementById('displaySelfRank');
            if(!displaySelfRank) return;
            let displaySelfRankBr = document.getElementById('displaySelfRankBr');
            displaySelfRank.style.display='';
            let outputStr='';
            let outputColor='';
            if(rank===1) {
                outputStr=`\u{1F947}`;
                outputColor='#FFD700'
            }
            else if(rank===2) {
                outputStr=`\u{1F948}`;
                outputColor='#C0C0C0';
            }
            else if(rank<=10) {
                if(rank===3) outputStr = `\u{1F949}`;
                else outputStr = `\u{1F3C5}`;
                outputColor='#CD7F32';
            }
            if(outputColor!='') {
                displaySelfRank.classList.add('glint-text');
                displaySelfRank.style.color=outputColor;
            }

            displaySelfRankBr.style.display='';
            outputStr+=` #${numberWithCommas(rank)}`
            if(showTotalRanked) outputStr+=` / ${numberWithCommas(totalRanked)}`
            displaySelfRank.innerText=outputStr;
            displaySelfRank.setAttribute('data-text', outputStr);
        } else {
            console.log("[getdata] No self rank found.",'#ff0000');
        }
    }
}
function backgroundImportTyperacerData(username) {
    const importUrl = `https://www.typeracerdata.com/import?username=${username}`;

    GM_xmlhttpRequest({
        method: "GET",
        url: importUrl,
        onload: function(response) {
            log('[bgImportTRData] successfully added '+username+' to the typeracerdata import queue','#D3D3D3');
        },
        onerror: function(response) {
            log('[bgImportTRData] error when adding '+username+' to the typeracerdata import queue: '+response.statusText,'#D3D3D3');
        }
    });
}


/*CREATE AND UPDATE CUSTOM HTML*/
let displayHTML = `
<table id='displayTable'>
  <tr>

    <!-- Block 1 (ID) -->
    <td id='blockId' style='vertical-align: top; padding-left: 25px;'>
      <div>
        <span style='font-weight:bold;'>Text ID:</span>
        <br>
        <div style="height:7px;font-size:1px;">&nbsp;</div>
        <span id='displayId'>loading...</span>
      </div>
    </td>

    <!-- Block 2 (Source) -->
    <td id='blockSource' style='vertical-align: top; padding-left: 25px; max-width: 180px; white-space: normal; overflow-wrap: break-word;'>
      <div>
        <span style='font-weight:bold;'>Source:</span>
        <br>
        <div style="height:7px;font-size:1px;">&nbsp;</div>
        <span id='displaySource1'>loading...</span>
        <br>
        <span id='displaySource2'>loading...</span>
        <br>
        <span id='displaySource3'>loading...</span>
      </div>
    </td>

    <!-- Block 3 (Default pace/TBA) -->
    <td id='blockDefault' style='vertical-align: top; padding-left: 25px; max-width: 130px; white-space: normal; overflow-wrap: break-word;'>
      <div>
        <span id='defaultSpan' style='font-weight:bold;'>Minimum pace:</span>
        <br>
        <div style="height:7px;font-size:1px;">&nbsp;</div>
        <div style="height:7px;font-size:1px;">&nbsp;</div>
        <span id='displayDefault'>`+targetPace+` WPM</span>
      </div>
    </td>

    <!-- Block 4 (PB & related) -->
    <td id='blockPb' style='vertical-align: top; padding-left: 25px; max-width: 180px; white-space: normal; overflow-wrap: break-word;'>
      <div>
        <button class='import-button' id='queueButton' title='Import your latest races to Typeracerdata'>\u{1F845}</button>
        <span id='displayPb1' style='font-weight:bold;'>Loading...</span>
        <br>
        <div style="height:7px;font-size:1px;">&nbsp;</div>
        <span id='displayPb2'></span>
        <br>
        <span id='displayLagged' style='display:none;'>Lag details...</span>
        <br id='displayLaggedBr' style='display:none;'>
        <span id='displayDate' style='display:none;'>loading...\n</span>
        <br id='displaySelfRankBr' style='display:none;'>
        <span id='displaySelfRank' style='display:none;'>loading...\n</span>
      </div>
    </td>

    <!-- Block 5 (Count) - only shown if requested -->
    <td id='blockCount' style='vertical-align: top; display:none; padding-left: 25px;'>
      <div>
        <span style='font-weight:bold;'>Times typed:</span>
        <br>
        <div style="height:7px;font-size:1px;">&nbsp;</div>
        <span id='displayCount'>loading...</span>
      </div>
    </td>

    <!-- Block 6 (Rank) -->
    <td id='blockRank' style='vertical-align: top; padding-left: 25px; max-width: 130; white-space: normal; overflow-wrap: break-word;'>
      <div>
        <span id='displayRank1' style='font-weight:bold;'>#`+targetRank+`:</span>
        <br>
        <div style="height:7px;font-size:1px;">&nbsp;</div>
        <span id='displayRank3'>loading...</span>
        <br>
        <span id='displayRank2'>loading...</span>
      </div>
    </td>

    <!-- Block 7 (Recap) -->
    <td id='blockFinal' style='vertical-align: top; font-weight:bold; padding-left: 25px;'>
      <div> Pace to beat: <br>
        <div style="height:7px;font-size:1px;">&nbsp;</div>
        <span id='displayPace'>loading...</span>
      </div>
    </td>
  </tr>

  <!--Alternative approach: show Source as a line at the bottom-->
  <!--<tr><td colspan='7'><div style="height:7px;font-size:1px;">&nbsp;</div></td></tr><tr id='blockSource'><td style='padding-left: 25px;'><span style='font-weight:bold;'>Source: </span></td><td colspan='6' style='padding-left: 25px;'><div ><div><span id='displaySource1'>loading...</span><span id='displaySource2'>loading...</span><span id='displaySource3'>loading...</span></div></div></td></tr>-->

  <tr>
    <td>
      <span class='heart-icon' title='Pacemaker by poem' style='cursor:pointer;' onclick="window.open('https://github.com/PoemOnTyperacer/tampermonkey','_blank')">\u{1F493}</span>
    </td>
  </tr>
</table>
`;

function makeDisplay() {
    let section=document.querySelector('.gameStatusLabel').parentNode;
    displayDiv = document.createElement('div');
    displayDiv.id='pCaretDisplay';
    displayDiv.innerHTML = displayHTML;
    section.appendChild(displayDiv);
    let timerTd=document.querySelector('table.podContainer > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(1) > table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(1) > table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(2)');
    timerTd.parentNode.style.position='relative';
    timerTd.style.position='absolute';
    timerTd.style.left='800px';
    log('[makeDisplay] added display div','#D3D3D3');

    // Find background color
    let target = displayDiv;
    while (target !== document.body && window.getComputedStyle(target).backgroundColor === 'rgba(0, 0, 0, 0)') {
        target = target.parentElement;
    }
    const bgColor = window.getComputedStyle(target).backgroundColor;
    let rgb = bgColor.match(/\d+/g).map(Number);
    log('[makeDisplay] background color = '+rgb,'#D3D3D3');

    // Set display color for highest contrast
    let luminance = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
    let d = luminance > 128 ? 0 : 255;
    let contrastColor= `rgb(${d}, ${d}, ${d})`;
    log('[makeDisplay] contrast color = '+contrastColor,'#D3D3D3');
    displayDiv.style.color = contrastColor;
    displayDiv.style.borderColor = contrastColor;
    let queueButtonEl = document.getElementById('queueButton');
    queueButtonEl.style.color = contrastColor;
    queueButtonEl.style.borderColor = contrastColor;

    // Trdata queue button
    let queueButton = document.querySelector('#queueButton');
    queueButton.addEventListener("click", function() {
        if(!isGuest) backgroundImportTyperacerData(username);
        queueButton.style.opacity='10%';
        clearTimeout(GUITimeout2);
        GUITimeout2 = setTimeout(function() {
            queueButton=document.getElementById("queueButton");
            if(queueButton==null) return;
            queueButton.style.opacity='100%';
        },1500);
    }, true);

    // Fill display and remove sections according to settings
    let blockCountEl = document.querySelector('#displayCount');
    if(blockCountEl&&(!showCount||(targetUsername===''&&isGuest))) {
        blockCountEl.remove();
        log('removing block count; showCount='+showCount+'; targetUsername='+targetUsername+'; isGuest='+isGuest);
    }
    document.querySelector('#displayDefault').innerText=targetPace+' WPM';
    if(useTb&&text_best_average!=null&&tba_username!=null) {
        document.querySelector('#displayDefault').innerText=text_best_average.toFixed(DECIMAL_PLACES)+' WPM';
        let tempUsername=targetUsername;
        if(tempUsername=='') tempUsername=username;
        document.querySelector('#defaultSpan').innerText=capitalizeFirstLetter(tempUsername)+"'s TBA:";//'TBA:';
    }
    if (!showId) {
        document.querySelector('#blockId').remove();
    }
    if (!showSource) {
        document.querySelector('#blockSource').remove();
    }
    if (!showDefault) {
        document.querySelector('#blockDefault').remove();
    }
    if (!showPb) {
        document.querySelector('#blockPb').remove();
    }
    else {
        if (!showCount) {
            document.querySelector('#blockCount').remove();
        } else {
            document.querySelector('#blockCount').style.display = '';
        }
    }
    if (!showRank) {
        document.querySelector('#blockRank').remove();
    }
    if (!showFinal) {
        document.querySelector('#blockFinal').remove();
    }
    // If all blocks are removed, remove the table
    if (!showId && !showSource && !showDefault && !showPb && !showRank && !showFinal) {
        document.querySelector('#pCaretDisplay').remove();
        log('No elements selected, removing table');
    }
}

function displayResult(lagged_speed) {
    // CharlieOG mode? Question mark?
    /*log('[displayResult] adding '+username+' to the typeracerdata import queue','#D3D3D3');
    backgroundImportTyperacerData(username);*/

    log('[displayResult] displaying lagged result = '+lagged_speed,'#D3D3D3');
    let displayLagged=document.querySelector('#displayLagged');
    let displayLaggedBr=document.querySelector('#displayLaggedBr');
    let displayPb1 = document.querySelector('#displayPb1');
    let displayPb2 = document.querySelector('#displayPb2');
    if(!displayLagged) return;
    if(pbPace=='none') {
        if(isGuest) return;
        log('[displayResult] first known quote completion. New pb = lagged = '+lagged_speed+'; username='+capitalizeFirstLetter(username),'#D3D3D3');
        displayPb1.innerHTML=capitalizeFirstLetter(username)+"'s best:";
        displayPb2.innerHTML='&rarr; '+lagged_speed.toFixed(DECIMAL_PLACES)+' WPM';
    }
    else {
        log('[displayResult] new quote completion. Previous pb = '+pbPace+'; lagged = '+lagged_speed,'#D3D3D3');
        let output='';
        if(lagged_speed>pbPace) {
            displayLagged.style.display='';
            displayLaggedBr.style.display='';
            output+="<span style='color: green'>+ "+(lagged_speed-pbPace).toFixed(DECIMAL_PLACES)+'</span>';
            document.getElementById('pCaretDisplay').style.borderLeft='3px solid green';
        }
        displayLagged.innerHTML=' '+output;
    }
}
