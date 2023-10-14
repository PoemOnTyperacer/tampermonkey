// ==UserScript==
// @name         TypeRacer Pacemaker
// @namespace    http://tampermonkey.net/
// @version      1.1
// @downloadURL  https://raw.githubusercontent.com/PoemOnTyperacer/tampermonkey/master/pacemaker.user.js
// @updateURL    https://raw.githubusercontent.com/PoemOnTyperacer/tampermonkey/master/pacemaker.user.js
// @description  Helps you set the pace on TypeRacer!
// @author       poem#3305
// @match        https://play.typeracer.com/*
// @match        https://staging.typeracer.com/*
// @icon         https://www.google.com/s2/favicons?domain=typeracer.com
// @grant        GM_xmlhttpRequest
// @grant		 GM_registerMenuCommand
// @grant		 GM_getValue
// @grant		 GM_setValue
// @connect      typeracerdata.com
// @noframes
// ==/UserScript==


let DEBUG = false;
let targetPace,targetRank,targetUsername,caretColor,showPb,showRank,showCaret,usePb,useRank,showId,showDefault,showFinal,showDate;
function setDefaultSettings() {
    targetPace=140;
    targetRank=10;
    targetUsername='';
    caretColor='255,0,0';
    showId=true;
    showDefault=true;
    showPb=true;
    showDate=false;
    showRank=true;
    showCaret=true;
    usePb=true;
    useRank=true;
}
load_settings();

if (typeof GM_registerMenuCommand !== "undefined") {
    GM_registerMenuCommand("Pacemaker settings", config,'D');
}

let t;
function config() {
    if (typeof GM_setValue !== "undefined")
    {
        if(menuOpen)
            return;
        menuOpen=true;
        function saveCfg()
        {
            targetPace=document.getElementById("targetPace").value;
            targetUsername=document.getElementById("targetUsername").value;
            targetRank=document.getElementById("targetRank").value;
            caretColor=document.getElementById("caretColor").value;
            showId=document.getElementById("showId").checked;
            showDefault=document.getElementById("showDefault").checked;
            showPb=document.getElementById("showPb").checked;
            showDate=document.getElementById("showDate").checked;
            showRank=document.getElementById("showRank").checked;
            showFinal=document.getElementById("showFinal").checked;
            showCaret=document.getElementById("showCaret").checked;
            usePb=document.getElementById("usePb").checked;
            useRank=document.getElementById("useRank").checked;


            GM_setValue("targetPace", targetPace);
            GM_setValue("targetUsername", targetUsername);
            GM_setValue("targetRank", targetRank);
            GM_setValue("caretColor", caretColor);
            GM_setValue("showId", showId ? "1" : "0");
            GM_setValue("showDefault", showDefault ? "1" : "0");
            GM_setValue("showPb", showPb ? "1" : "0");
            GM_setValue("showDate", showDate ? "1" : "0");
            GM_setValue("showRank", showRank ? "1" : "0");
            GM_setValue("showFinal", showFinal ? "1" : "0");
            GM_setValue("showCaret", showCaret ? "1" : "0");
            GM_setValue("usePb", usePb ? "1" : "0");
            GM_setValue("useRank", useRank ? "1" : "0");

            log('[settings] saved data:\ntargetPace='+targetPace+'; targetUsername='+targetUsername+'; targetRank='+targetRank+'; caretColor='+caretColor+'; showId='+showId+'; showDefault='+showDefault+'; showPb='+showPb+'; showDate='+showDate+'; showRank='+showRank+'; showFinal='+showFinal+'; showCaret='+showCaret+'; usePb='+usePb+'; useRank='+useRank,'#D3D3D3');
            document.getElementById("cfg_save").value = "SAVED! WOW!";
            clearTimeout(t);
            t = setTimeout(function() {
                let wowsers=document.getElementById("cfg_save");
                if(wowsers==null)
                    return;
                wowsers.value = "Save configuration";
            },1500);
        }
        var div = document.createElement("div");
        div.style = "margin: auto; overflow-y: auto; max-height: 90%; width: fit-content; border-radius:5px; height: fit-content; border: 1px solid black; color:#ffffff; background: #000000; position: fixed; top: 0; right: 0; bottom: 0; left: 0; z-index: 8888888; line-height: 1;";
        div.innerHTML = "<b><br><center>Pacemaker Settings</center></b>"
            + "<div style='margin: 20px;'><br><input id='targetPace' type='text' size='7' style='display:inline; color: #ffffff; background-color: #000000; width:initial; padding: initial; margin: initial;'> Default pace in WPM (eg: 100)"
            + "<div style='margin: auto;'><br><input id='targetUsername' type='text' size='7' style='display:inline; color: #ffffff; background-color: #000000; width:initial; padding: initial; margin: initial;'> Target username (eg: mako640; empty = account you're logged in)"
            + "<div style='margin: auto;'><br><input id='targetRank' type='text' size='7' style='display:inline; color: #ffffff; background-color: #000000; width:initial; padding: initial; margin: initial;'> Target rank (eg: 10)"
            + "<div style='margin: auto;'><br><input id='caretColor' type='text' size='7' style='display:inline; color: #ffffff; background-color: #000000; width:initial; padding: initial; margin: initial;'> Pace caret color in r,g,b (eg. 255,0,0)"
            + "<br><br><br><br></div><center><b>Display (show data about the text you're about to type):</b>"
            + "<br><br><input id='showId' type='checkbox' style='float: left; width:initial; padding: initial; margin: initial;'><span style='float:left;margin-left:1em;'>Text ID</span>"
            + "<br><br><input id='showDefault' type='checkbox' style='float: left; width:initial; padding: initial; margin: initial;'><span style='float:left;margin-left:1em;'>Default pace</span>"
            + "<br><br><input id='showPb' type='checkbox' style='float: left; width:initial; padding: initial; margin: initial;'><span style='float:left;margin-left:1em;'>Selected user's PB on this text</span>"
            + "<br><br><input id='showDate' type='checkbox' style='float: left; width:initial; padding: initial; margin: initial;'><span style='float:left;margin-left:1em;'>Include PB date</span>"
            + "<br><br><input id='showRank' type='checkbox' style='float: left; width:initial; padding: initial; margin: initial;'><span style='float:left;margin-left:1em;'>WPM for selected rank on this text (eg. top 10)</span>"
            + "<br><br><input id='showFinal' type='checkbox' style='float: left; width:initial; padding: initial; margin: initial;'><span style='float:left;margin-left:1em;'>Pace to beat</span>"
            + "<br><br><br><br></div><center><b>Pace caret (speed will be set to the fastest option selected):</b>"
            + "<br><br><input id='showCaret' type='checkbox' style='float: left; width:initial; padding: initial; margin: initial;'><span style='float:left;margin-left:1em;'>Show pace caret</span>"
            + "<br><br><input id='usePb' type='checkbox' style='float: left; width:initial; padding: initial; margin: initial;'><span style='float:left;margin-left:1em;'>Selected user's PB on this text</span>"
            + "<br><br><input id='useRank' type='checkbox' style='float: left; width:initial; padding: initial; margin: initial;'><span style='float:left;margin-left:1em;'>WPM for selected rank on this text</span>"
            + "<br><br><br><input id='cfg_save' type='button' value='Save configuration'  style='display:inline; color: #ffffff; background-color: #000000; width:initial; padding: initial; margin: initial;'> <input id='cfg_close' type='button' value='Close'  style='display:inline; color: #ffffff; background-color: #000000; width:initial; padding: initial; margin: initial;'></center>";
        document.body.appendChild(div);
        load_settings();
        document.getElementById("targetPace").value = targetPace;
        document.getElementById("targetUsername").value = targetUsername;
        document.getElementById("targetRank").value = targetRank;
        document.getElementById("caretColor").value = caretColor;
        document.getElementById("showId").checked = showId;
        document.getElementById("showDefault").checked = showDefault;
        document.getElementById("showPb").checked = showPb;
        document.getElementById("showDate").checked = showDate;
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
function load_settings() {
    targetPace=GM_getValue("targetPace");
    if(targetPace==undefined) {
        setDefaultSettings();
        log('[settings] no saved data. Using default:\ntargetPace='+targetPace+'; targetUsername='+targetUsername+'; targetRank='+targetRank+'; caretColor='+caretColor+'; showId='+showId+'; showDefault='+showDefault+'; showPb='+showPb+'; showDate='+showDate+'; showRank='+showRank+'; showBiden; showFinal='+showFinal+'; showCaret='+showCaret+'; usePb='+usePb+'; useRank='+useRank,'#D3D3D3');
        return;
    }
    targetUsername=GM_getValue("targetUsername");
    targetRank=GM_getValue("targetRank");
    caretColor=GM_getValue("caretColor");
    showId=!!+GM_getValue("showId");
    showDefault=!!+GM_getValue("showDefault");
    showPb=!!+GM_getValue("showPb");
    showDate=!!+GM_getValue("showDate");
    showRank=!!+GM_getValue("showRank");
    showFinal=!!+GM_getValue("showFinal");
    showCaret=!!+GM_getValue("showCaret");
    usePb=!!+GM_getValue("usePb");
    useRank=!!+GM_getValue("useRank", useRank);
    log('[settings] loaded data:\ntargetPace='+targetPace+'; targetUsername='+targetUsername+'; targetRank='+targetRank+'; caretColor='+caretColor+'; showId='+showId+'; showDefault='+showDefault+'; showPb='+showPb+'; showDate='+showDate+'; showRank='+showRank+'; showFinal='+showFinal+'; showCaret='+showCaret+'; usePb='+usePb+'; useRank='+useRank,'#D3D3D3');
}

let displayDiv;
let menuOpen=false;
let pbPace;
let rankPace;
let pace=targetPace;
let start_time=300; //ms
const showDebugRectangles=false;
const GUI_INTERVAL = 100;
const offset = 0;
const responsiveTheme = typeof com_typeracer_redesign_Redesign === "function";
let isGuest=null;
let racing=false;
let username=null;
let pCaret;
let caretOffset=[];
let status='standby';
let text_id=null;
let await_updatePlayerProgress=false;
let lineList=[];
let rectList=[];

//for debugging
function log(msg, color='#7DF9FF') {
    if(DEBUG)
        console.log('%c [Pace caret] '+msg, 'color: '+color);
}

// Determine: is guest/username/is racing
function clock() {
    //Check for race start
    let gameStatusLabels = document.getElementsByClassName('gameStatusLabel');
    let gameStatus = ((gameStatusLabels || [])[0] || {}).innerHTML || '';
    if(!racing&&(gameStatusLabels.length>0 && ( gameStatus == 'Go!' || gameStatus.startsWith('The race is on') ))) {
        racing = true;
        raceStart();
    }
    if(racing&&((gameStatusLabels.length==0) || ( gameStatus == 'The race has ended.' || gameStatus.startsWith('You finished')))){
        racing = false;
        raceEnd();
    }

    let current_username;
    //Refresh username
    if(responsiveTheme) {
        let loginButtons=document.getElementsByClassName('signIn');

        if(loginButtons.length==0) {
            let username_tag=document.getElementsByClassName('userNameLabel')[0];
            if(!username_tag) //not done loading
                return;
            if(username_tag.parentNode.classList=='') { //wrong username tag
                return;
            }
            if(isGuest||isGuest==null) {
                isGuest=false;
                log('logged in');
            }
            current_username=username_tag.innerText;
            if(current_username.includes('('))
                current_username=/.*\((.*)\)$/.exec(current_username)[1];
            if(username!=current_username) {
                log('username: '+current_username);
                username=current_username;
            }
        }
        else {
            if(isGuest)
                return;
            log('logged out');
            username=null;
            isGuest=true;
        }
    }
    else {//classic theme
        let usernameLabel= document.querySelector('.mainUserInfoBox .userNameLabel');
        if(!usernameLabel)// not done loading
            return;
        if(usernameLabel.innerText=='Guest') {
            if(isGuest)
                return;
            log('logged out');
            username=null;
            isGuest=true;
        }
        else {
            if(isGuest||isGuest==null) {
                isGuest=false;
                log('logged in');
            }
            current_username=usernameLabel.innerText;
            if(current_username.includes('('))
                current_username=/.*\((.*)\)$/.exec(current_username)[1];
            if(username!=current_username) {
                log('username: '+current_username);
                username=current_username;
            }
        }
    }
}
setInterval(clock, GUI_INTERVAL);

//create caret
function createPCaret() {
    let blinkDuration = 1;
    let caretThickness = 0.3;
    let maxOpacity = 0.7;
    let minOpacity = 0.3;
    let caretType=0;


    pCaret=document.createElement('div');
    pCaret.style.visibility='hidden';
    pCaret.id='pCaret';
    document.body.insertAdjacentHTML("beforeend",`<style>
 #pCaret {
  background-color: white;
  position: absolute;
  z-index:1000;
  border-radius: 15%;
}
.box {
  position: absolute !important;
}
#pCaretDisplay {
background-color: rgba(0,0,0,0.7)!important;
margin:5px;
border-radius:5px;
color: #ffffff!important;
}
</style>


<style id='pCaretBlinkStyle'></style>
<style id='pCaretThicknessStyle'></style>
<style id='pCaretAnimationStyle'></style>`);
    function setBlinkDuration() {
        let caretAnimationStyle=document.getElementById('pCaretAnimationStyle');
        caretAnimationStyle.innerHTML = `#pCaret{
    -moz-transition:all `+blinkDuration+`s ease-in-out;
    -webkit-transition:all `+blinkDuration+`s ease-in-out;
    -o-transition:all `+blinkDuration+`s ease-in-out;
    -ms-transition:all `+blinkDuration+`s ease-in-out;

    transition:all `+blinkDuration+`s ease-in-out;
    -moz-animation:blink2 normal `+(3*blinkDuration)+`s infinite ease-in-out;

    /* Firefox */
    -webkit-animation:blink2 normal `+(3*blinkDuration)+`s infinite ease-in-out;
    /* Webkit */
    -ms-animation:blink2 normal `+(3*blinkDuration)+`s infinite ease-in-out;
    /* IE */
    animation:blink2 normal `+(3*blinkDuration)+`s infinite ease-in-out;
    /* Opera */
    -webkit-transition: background-color `+(2000*blinkDuration)+`ms linear;
    -moz-transition: background-color `+(2000*blinkDuration)+`ms linear;
    -o-transition: background-color `+(2000*blinkDuration)+`ms linear;
    -ms-transition: background-color `+(2000*blinkDuration)+`ms linear;
    transition: background-color `+(2000*blinkDuration)+`ms linear;
    }`;
    }
    setBlinkDuration();
    function setCaretRGB(color) {
        let caretBlinkStyle = document.getElementById('pCaretBlinkStyle');
        caretBlinkStyle.innerHTML = `
    @keyframes blink2 {
    0% {
           background-color: rgba(`+color+`,`+maxOpacity+`)
    }
    50% {
           background-color: rgba(`+color+`,`+minOpacity+`)
    }
    100% {
           background-color: rgba(`+color+`,`+maxOpacity+`)
    }
}
@-webkit-keyframes blink2 {
    0% {
           background-color: rgba(`+color+`,`+maxOpacity+`)
    }
    50% {
           background-color: rgba(`+color+`,`+minOpacity+`)
    }
    100% {
           background-color: rgba(`+color+`,`+maxOpacity+`)
    }
}
    `
    }
    setCaretRGB(caretColor);
    function setCaretDimensions() {
        let caretThicknessStyle = document.getElementById('pCaretThicknessStyle');
        let outputStyle;
        if(caretType===0) {
            outputStyle=`#pCaret {width: `+caretThickness+`ch;height: 1.5em;}`;
            caretOffset=[0,0];
            if(!responsiveTheme)
                caretOffset=[0,2+offset];
        }
        else if(caretType===1) {
            outputStyle=`#pCaret {width: 1.2ch;height: `+caretThickness+`em;`;
            caretOffset=[0,20];
        }
        caretThicknessStyle.innerHTML = outputStyle;
    }
    setCaretDimensions();
}
createPCaret();


function sleep(x) { // Wait for x ms
    return new Promise(resolve => setTimeout(resolve, x));
}

async function animateCaret(lines, rects) {
    if(lines.length!=rects.length) {
        log('[animation] error: '+lines.length+' lines but '+rects.length+' rects', '#ff0000');
        return;
    }
    let textDivContainer = document.querySelector('.inputPanel tbody tr td table tbody tr td div');
    textDivContainer.appendChild(pCaret);
    await sleep(start_time);
    for(let i=0;i<lines.length;i++) {
        if(!racing)
            break;
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

function getRenderedTextData() {
    let textDivContainer = document.querySelector('.inputPanel tbody tr td table tbody tr td div');
    textDivContainer.style.position='relative';
    let [lines, rects]=extractLinesFromDiv(textDivContainer);
    logLines(lines);

    //Thanks Ben Nadel for this helpful article on detecting rendered line breaks: https://www.bennadel.com/blog/4310-detecting-rendered-line-breaks-in-a-text-node-in-javascript.htm
    function logLines(lines) {
        if(!DEBUG)
            return;
        console.group('%c [Pace Caret] rendered lines of text', 'color: #7DF9FF');
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
        if(DEBUG&&showDebugRectangles)
            box.style.background = 'rgba(76, 175, 80, 0.1)';
        parent.appendChild(box);
        return [top,left,(bottom-top),(right-left),box];
    }
    lineList=lines;
    rectList=rects;
}

function raceStart() {
    log('racing');


    pickPace(true);
    if(showCaret)
        animateCaret(lineList, rectList);
}


function pickPace(forced=false){
    log('[pickpace] starting (forced='+forced+')','#D3D3D3');
    let tempPace=targetPace;
    if(useRank) {
        if(rankPace==null&&!forced) {
            log('[pickpace] failed: useRank=true, but no rankPace yet','#D3D3D3');
            return;
        }
        if(rankPace>tempPace)
            tempPace=rankPace;
    }
    if(usePb) {
        if(pbPace==null&&!forced) {
            log('[pickpace] failed: usePb=true, but no pbPace yet','#D3D3D3');
            return;
        }
        if(pbPace>tempPace)
            tempPace=pbPace;
    }
    pace=tempPace;
    if(showFinal)
        document.querySelector('#displayPace').innerText='Pace to beat this race = '+pace+' WPM';
}

//WIP
function raceEnd() {
    log('no longer racing');
    if(status=='customRoomGame'||status=='customRoom') {
        await_updatePlayerProgress=true;
        log('end of a private track race. Awaiting updatePlayerProgress with next text ID');
    }
    resetCaretAnimation();
}

function resetCaretAnimation() {
    pCaret.style.transition='0s linear';
    pCaret.style.visibility='hidden';
    log('stopped pCaret transition');
}

async function endpoints() {
    //ensure compatibility with Adjusted Speed 1.7.0 and further
    if (!XMLHttpRequest.prototype.oldSend) {
        XMLHttpRequest.prototype.oldSend = XMLHttpRequest.prototype.send;
    }

    XMLHttpRequest.prototype.send = function (body) {


        if (body) {
            const splitBody = body.split("|");
            const endpoint = splitBody[6];
            const payload = splitBody[13];
            // log('[endpoints] endpoint='+endpoint+' ; logPayload='+payload+' ; body='+body.toString(),'##5A5A5A');

            const join_game_endpoints = ["joinStandaloneGame", "joinSinglePlayerGame", "joinSameReplayGame", "joinRecordedReplayGame", "joinInstantReplayGame"];
            const join_room_endpoints = ["createAndJoinCustomRoom","joinRoom","joinGameInRoom"]
            const leave_game_endpoint = "leaveGame";
            const leave_room_endpoint = "leaveRoom";
            const navigation_endpoints = join_game_endpoints+join_room_endpoints+[leave_game_endpoint,leave_room_endpoint];

            this.addEventListener("load", function() {
                try {
                    let entered_new_game=false;
                    if (navigation_endpoints.includes(endpoint)) { //navigation
                        let new_status="standby";
                        if(endpoint==="joinStandaloneGame")
                            new_status="public";
                        else if(endpoint==="joinSinglePlayerGame")
                            new_status="practice";
                        else if(endpoint==="joinRecordedReplayGame"||endpoint==="joinInstantReplayGame")
                            new_status="ghost";
                        else if(endpoint==="joinSameReplayGame")
                            new_status="SameReplayGame";
                        else if(endpoint=='createAndJoinCustomRoom'||endpoint=='joinRoom')
                            new_status='customRoom';
                        else if(endpoint=='joinGameInRoom') {
                            log("[endpoints] joined room game",'#D3D3D3');
                            new_status='customRoomGame';
                            log("[endpoints] getting rendered text data",'#D3D3D3');
                            getRenderedTextData();
                        }
                        else if(endpoint=='leaveGame'&&status=='customRoomGame') {
                            new_status='customRoom';
                            log("[endpoints] left custom room race, still in custom room.",'#D3D3D3');
                        }
                        log("[endpoints] new_status="+new_status,'#D3D3D3');
                        if(new_status!="standby"&&!(endpoint=='leaveGame'&&status=='customRoomGame')&&new_status!='customRoomGame') {
                            log("[endpoints] entered new game",'#D3D3D3');
                            pbPace=null;
                            rankPace=null;
                            makeDisplay();
                            entered_new_game=true;
                            pickPace();
                            log("[endpoints] getting rendered text data",'#D3D3D3');
                            getRenderedTextData();
                        }
                        if(new_status=='standby') {
                            if(displayDiv) {
                                displayDiv.remove();
                                log('removed display div','#D3D3D3');
                            }
                        }
                        status=new_status;
                        if(new_status=='standby'&&await_updatePlayerProgress) {
                            log('No longer waiting for updatePlayerProgress');
                            await_updatePlayerProgress=false;
                        }
                    }


                    const responseJSON = JSON.parse(this.responseText.substring(this.responseText.indexOf("[")));
                    if(endpoint=='updatePlayerProgress'&&await_updatePlayerProgress) {
                        /*console.group('%c [Pace Caret] [endpoints] Breakdown of updatePlayerProgress values:', 'color: #5A5A5A');
                            responseJSON.forEach(
                                function iterator(value, i) {
                                    console.log(i, value);
                                }
                            );
                            console.groupEnd();*/
                        if(responseJSON[0]=='0') {
                            text_id=responseJSON[responseJSON.length-21];
                            log('[endpoints] (private track new race) text id='+text_id,'#D3D3D3');
                            await_updatePlayerProgress=false;
                            getTextData(text_id);
                        }
                    }
                    if(entered_new_game) {
                        //log the whole thing:
                        // log("[endpoints] "+endpoint+" response JSON: " + responseJSON.toString(),'#5A5A5A');

                        if(endpoint=='createAndJoinCustomRoom'||endpoint=='joinRoom') {
                            text_id=responseJSON[responseJSON.length-20];
                            log('[endpoints] (private track) text id='+text_id,'#D3D3D3');
                        }

                        else {
                            text_id=responseJSON[12];
                            log('[endpoints] text id='+text_id,'#D3D3D3');
                        }
                        getTextData(text_id);
                    }
                }
                catch(error){
                    log("[endpoints] error while getting "+endpoint+"response: "+error+'\nResponse text: '+this.responseText,'#ff0000');
                }
            });
        }
        return XMLHttpRequest.prototype.oldSend.call(this, body);
    }
}
endpoints();



async function getTextData(id) {
    log('[getdata] getting text data with id='+id,'#D3D3D3');
    if(showId)
        document.querySelector('#displayId').innerText='Text #'+id;

    // top N data
    let text_leaderboard_url = 'https://typeracerdata.com/text?id='+id+'&rank_start='+targetRank+'&rank_end='+targetRank;

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
        let rankMatch=rankRegex.exec(responseHTML);
        let usernameAndWPMMatch=usernameAndWPMRegex.exec(responseHTML);
        if(rankMatch==null||usernameAndWPMMatch==null) {
            log("[getdata] couldn't find text leaderboard data for targetRank="+targetRank+", id="+id+" (match==null)",'#ff0000');
            return;
        }
        let rank=parseInt(rankMatch[1]);
        if(rank!=targetRank) {
            log('[getdata] requested rank ('+targetRank+') not found on typeracer data (received '+rank+' instead)','#ff0000');
        }
        let username=usernameAndWPMMatch[1];
        let top_WPM=parseFloat(usernameAndWPMMatch[2]);
        log('[getdata] rank='+rank+'; username='+username+'; WPM='+top_WPM,'#D3D3D3');
        if(showRank)
            document.querySelector('#displayRank').innerText='#'+rank+' = '+top_WPM.toFixed(2)+' WPM by '+username;
        rankPace=top_WPM;
        pickPace();
    }

    // account PB data
    let tempUsername;
    if(targetUsername=='') {
        if(isGuest) {
            log('[getdata] no target user selected, not logged in = no PB data available','#ff0000');
            if(showPb)
                document.querySelector('#displayPb').innerText='Pb: no user selected';
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
    let text_history_url = 'https://typeracerdata.com/text.races?text='+id+'&username='+tempUsername;

    /*fetch(text_history_url)
        .then(response => response.text())
        .then(responseHTML => {
        pbProcess(responseHTML);
    })
        .catch(error => {
        console.error("[getdata] Error fetching data:", error);
    });*/

    GM_xmlhttpRequest ( {
        method: 'GET',
        url: text_history_url,
        onload: function (response) {
            let responseHTML=response.responseText;
			pbProcess(responseHTML);
        }
    });
    function pbProcess(responseHTML) {
        // log('[getdata] text history response text:\n'+responseHTML,'#D3D3D3');
        const emptyRegex=/(Sorry, that username has not yet completed any races on that text.)/;
        let emptyMatch=emptyRegex.exec(responseHTML);
        if(emptyMatch!=null) {
            log('[getdata] user '+tempUsername+' has not yet completed text ID='+id+'; setting pace to '+targetPace,'#ff0000');
            if(showPb)
                document.querySelector('#displayPb').innerText=tempUsername+' has not completed this text yet!';
            pbPace=targetPace;
            pace=targetPace;
            return;
        }
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
        if(showPb) {
            document.querySelector('#displayPb').innerText=tempUsername+"'s pb = "+pb_WPM+' WPM';
            if(showDate)
                document.querySelector('#displayDate').innerText=', achieved '+date;
        }
        pbPace=pb_WPM;
        pickPace();
    }
}

let displayHTML=`<tbody><tr><td><span id='displayId'>ID: loading...</span></td></tr><tr><td><span id='displayDefault'>Default pace = `+targetPace+` WPM</span></td></tr><tr><td><span id='displayPb'>Pb: loading...</span><span id='displayDate'></span></td></tr><tr><td><span id='displayRank'>Top 10: loading...</span></td></tr><tr><td><span id='displayPace' style='font-weight:bold;'>Pace to beat this race:</span></td></tr></tbody>`;
function makeDisplay() {
    let section=document.querySelector('.gameStatusLabel').parentNode;
    displayDiv = document.createElement('table');
    displayDiv.id='pCaretDisplay';
    displayDiv.innerHTML = displayHTML;
    log('added display div','#D3D3D3');
    section.appendChild(displayDiv);
    if(!showId)
        document.querySelector('#displayId').parentNode.parentNode.remove();
    if(!showDefault)
        document.querySelector('#displayDefault').parentNode.parentNode.remove();
    if(!showPb)
        document.querySelector('#displayPb').parentNode.parentNode.remove();
    if(showPb&&!showDate)
        document.querySelector('#displayDate').remove();
    if(!showRank)
        document.querySelector('#displayRank').parentNode.parentNode.remove();
    if(!showFinal)
        document.querySelector('#displayPace').parentNode.parentNode.remove();
}
