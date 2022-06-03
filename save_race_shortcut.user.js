// ==UserScript==
// @name         Typeracer: Save Practice Race Shortcut
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  Pressing Ctrl Alt S in typeracer will attempt to click the "Save" button, for use with typeracer practice mode
// @author       TR community
// @match        https://play.typeracer.com/*
// @icon         https://www.google.com/s2/favicons?domain=typeracer.com
// ==/UserScript==


const DEBUG = false;
function log(msg,isError=false){
    if(!DEBUG&&!isError)
        return;
    if(isError)
        console.log('[Save Shortcut] %cError: '+msg, 'background: black; color: red');
    else
        console.log('[Save Shortcut] '+msg)
}


// Keyboard Shortcut (Ctrl + Alt + S)
const MAC_PLATFORMS = ['Mac68K','MacPPC','MacIntel'];
var ctrl_key=false;
var opt_key=false;
if(MAC_PLATFORMS.includes(navigator.platform)) { // Mac
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
        else if(keyCode==83&&ctrl_key&&opt_key&&(inMaintrack||inRacetrack)) {
            savePracticeRace()
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
else { // Windows
    document.addEventListener ("keydown", function (zEvent) {
        if (zEvent.ctrlKey  &&  zEvent.altKey  &&  zEvent.key === "s") {
            savePracticeRace();
        }
    });
}


function savePracticeRace() {
    let linksArray = Array.from(document.getElementsByClassName('gwt-Anchor'));
    let saveLink = linksArray.find(elem => elem.innerHTML =='Save');
    if(saveLink==undefined) {
        log('Save button not found', true);
        return;
    }

    // Reading registered speed
    let statsNumbers=document.getElementsByClassName('tblOwnStatsNumber');
    if(statsNumbers.length==0) {
        log('Could not find registered speed statsNumber',true);
        return;
    }
    let firstStatsNumber = statsNumbers[0].innerHTML.split(' wpm');
    if(firstStatsNumber.length==1) {
        log('Unexpected registered speed statsNumber format ('+firstStatsNumber.innerHTML+')',true);
        return;
    }
    let registeredSpeed=firstStatsNumber[0];

    // Reading unlagged speed
    let imageButtons = Array.from(document.getElementsByClassName('ImageButton'));
    let fastForwardButton = imageButtons.find(elem => elem.title == 'Fast forward to the end');
    if(fastForwardButton==undefined) {
        log('Could not check for reverse lag (Replay not found)',true);
        return;
    }
    fastForwardButton.click();
    let unlaggedSpeedTag = ((document.getElementsByClassName('statusIndicator')[1] || {}).title || '');
    if(!unlaggedSpeedTag.includes('WPM')) {
        log('Wrong unlagged speed statusIndicator format ('+unlaggedSpeedTag+')',true);
        return;
    }
    let unlaggedSpeed=unlaggedSpeedTag.split(' WPM')[0];

    // Checking for reverse lag & clicking Save button
    log('registered='+registeredSpeed+' ; unlagged='+unlaggedSpeed+' ; reverse lag = '+(registeredSpeed > unlaggedSpeed+1));
    if (registeredSpeed > unlaggedSpeed+1) {
        alert('[Save Shortcut] Reverse lag detected! Score not saved.');
    }
    else {
        saveLink.click();
    }
}
