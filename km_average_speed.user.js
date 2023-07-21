// ==UserScript==
// @name         Keymash: Average speed
// @namespace    http://tampermonkey.net/
// @version      0.0.1
// @updateURL    https://raw.githubusercontent.com/PoemOnTyperacer/tampermonkey/master/km_average_speed.user.js
// @downloadURL  https://raw.githubusercontent.com/PoemOnTyperacer/tampermonkey/master/km_average_speed.user.js
// @description  Display users' last X races average on Keymash profiles
// @author       poem#3305
// @match        https://keymash.io/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=keymash.io
// @grant        GM_addStyle
// @noframes
// ==/UserScript==

/*---------SETTINGS---------*/
const SPAN=20; //set this between 1-30
const PUNISH=true; //if set to true, quits will count as 0wpm
const DECIMALS=2; //how many decimal places should be shown
const ALWAYS_SHOW_MATCHES=false; //should the script navigate to Matches tab by default
const DEBUG=false;
/*--------------------------*/




function log(msg){
    if(DEBUG)
        console.log(("%c[KM Average Speed] "+msg),"color:#CCCC00;");
}
/*---------Detect navigation to a profile page and trigger script---------*/
let viewingProfile=false;
let username=null;
let newTag;
const PROFILE_URL_REGEX=/.*keymash.io\/profile\/(.+)\/.*/;
function URLClock() {
    let url=window.location.href;
    let match = PROFILE_URL_REGEX.exec(url);
    if (match==null) {
        if(viewingProfile) {
            log('No longer viewing profile');
            viewingProfile=false;
        }
    }
    else {
        if(!viewingProfile) {
            username = match[1];
            log('Now viewing profile: '+username+'; starting main function');
            viewingProfile=true;
            setTimeout(main,1500);
        }
        else {
            if(username==match[1]) //already viewing same profile
                return;
            else { //viewing new profile
                username=match[1];
                log('Now viewing new profile: '+username+'; starting main function');
                newTag.remove();
                setTimeout(main,1500);
            }
        }
    }
}
setInterval(URLClock,1500);

/*---------Read, calculate and display average on a profile page---------*/
const QUIT_VALUE='N/A';
const VALUE_APPENDIX=' WPM';
const BUTTON_SELECTOR='button.tracking-wider';
const USER_TAG_SELECTOR='.space-x-2 > div:nth-child(1)';
const WPM_CELLS_SELECTOR='div.leaderboards--row > div:nth-child(5)';
const SEPARATOR=' - ';
const DISPLAY_APPENDIX=' last '+SPAN;
function main() {
    if(SPAN<1||SPAN>30) {
        log('Invalid SPAN value: '+SPAN);
        return;
    }

    const BUTTONS=document.querySelectorAll(BUTTON_SELECTOR);
    let MATCHES_BUTTON=null;
    let GENERAL_BUTTON=null;
    BUTTONS.forEach(function(button){
        if(button.innerText=='GENERAL')
            GENERAL_BUTTON=button;
        if(button.innerText=='MATCHES')
            MATCHES_BUTTON=button;
    });
    if(MATCHES_BUTTON==null||GENERAL_BUTTON==null) {
        log('Navigation buttons not found');
        return;
    }
    MATCHES_BUTTON.click()

    const USER_TAG= document.querySelector(USER_TAG_SELECTOR);
    const USER_TAG_CONTENTS=USER_TAG.innerHTML;
    log('user tag contents = '+USER_TAG_CONTENTS);

    let wpmCells = document.querySelectorAll(WPM_CELLS_SELECTOR);
    let wpmCellValues = [];
    wpmCells.forEach(function(singleCell) {
        wpmCellValues.push(singleCell.innerText);
    });

    let output=processAverage(wpmCellValues);
    let output_details=DISPLAY_APPENDIX;
    if(PUNISH)
        output_details+=' nonquit';
    log('output = '+output);
    const CONTAINER=USER_TAG.parentNode.parentNode;
    newTag=document.createElement('div');
    newTag.innerHTML=processAverage(wpmCellValues)+'<span class="text-gray-500">'+output_details+'</span>';
    newTag.className='truncate font-semibold text-white';
    CONTAINER.insertBefore(newTag,CONTAINER.firstChild.nextSibling);

    if(!ALWAYS_SHOW_MATCHES) {
        GENERAL_BUTTON.click();
    }
}


function processAverage(values) {
    console.log(values);
    let total=0;
    let effective_span=SPAN;
    for(let i=0;i<SPAN;i++) {
        let singleValue=values[i];
        if(singleValue==QUIT_VALUE) {
            if(PUNISH) //strike them down with the might of Zeus
                singleValue=0;
            else {
                effective_span--;
                continue;
            }
        }
        else
            singleValue=parseFloat(singleValue.split(VALUE_APPENDIX)[0]);
        total+=singleValue;
    }
    if(effective_span==0) //if all races were quit
        return QUIT_VALUE;
    else {
        let average=total/effective_span;
        return average.toFixed(DECIMALS)+VALUE_APPENDIX;
    }
}
