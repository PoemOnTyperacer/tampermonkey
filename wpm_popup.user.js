// ==UserScript==
// @name         TR: Floating wpm
// @namespace    http://tampermonkey.net/
// @version      0.0.3
// @description  For use with Smooth Caret. Floating WPM popup that follows the smooth caret
// @author       poem#3305
// @match        https://play.typeracer.com/*
// @match        https://staging.typeracer.com/*
// @icon         https://www.google.com/s2/favicons?domain=typeracer.com
// @noframes
// ==/UserScript==

const fullFollow=true;

const RANKPANEL_CLASS = 'rankPanelWpm rankPanelWpm-self';
const ELEMENT_CONFIG = { subtree: false, childList: true };
const DATA_LABEL = 'floatingWPM2';
const DEBUG = false;
let lagTime=500;

document.body.insertAdjacentHTML("beforeend",`<style>
#floating_wpm {
position:absolute;
left: 100px;
top: 200px;
background: #303030;
color: white;
z-index:10000;
font-size: 140%;
font-weight: bold;
border-radius: 10px;
padding: 10px;
opacity: 0.8;
transition: `+lagTime+`ms ease-out;
}
</style>
`);

document.body.insertAdjacentHTML("afterbegin", `<div id="floating_wpm">hello world</div>`);
let floating_element=document.getElementById('floating_wpm');
restoreFormat(floating_element);
dragElement(floating_element);
floating_element.innerText='test';
floating_element.style.visibility='hidden';


function log(msg){
    if(DEBUG)
        console.log('[Floating wpm] '+msg)
}



//Make element draggable
function dragElement(element)
{
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    if (document.getElementById(element.id + "header"))
        document.getElementById(element.id + "header").onpointerdown = dragMouseDown;
    else
        element.onpointerdown = dragMouseDown;

    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onpointerup = closeDragElement;
        document.onpointermove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        element.style.top = (element.offsetTop - pos2) + "px";
        element.style.left = (element.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
        document.onpointerup = null;
        document.onpointermove = null;
        storeFormat(element);
    }
}

// Read and write latest countdown position
function storeFormat(element) {
    let top = element.style.top;
    let left = element.style.left;
    log('storing top='+top+', left='+left);
    window.localStorage.setItem(DATA_LABEL, [top,left].join(','));
}

function restoreFormat(element) {
    let data = window.localStorage.getItem(DATA_LABEL);
    if(data===null) {
        data= [element.style.top,element.style.left].join(',');
        log('No data found. Storing current position');
        storeFormat(element);
        return;
    }
    data=data.split(',');
    element.style.top = data[0];
    element.style.left = data[1];
    log('restoring top='+data[0]+', left='+data[1]);
}


//Refresh live wpm
function updateWPM() {
    let rankPanels=document.getElementsByClassName(RANKPANEL_CLASS);
    if(rankPanels.length==0)
        return;
    else if(floating_element.style.visibility=='hidden')
        floating_element.style.visibility='visible';
    let rankPanel=rankPanels[0];
    floating_element.innerText=rankPanel.innerText;
    let caret=document.getElementById('caret');
    if(caret==null)
        return;
    let top_pos=parseFloat(floating_element.style.top);
    let new_top_pos=parseFloat(caret.style.top)-35-50;

    if(Math.abs(new_top_pos-top_pos)>200) {
            floating_element.style.transition='0s ease-out';
            floating_element.style.top=new_top_pos+'px';
            setTimeout(function(){floating_element.style.transition=lagTime+'ms ease-out';},100);
            log('moving popup far, cancelled animation');
        }
        else {
            floating_element.style.top=new_top_pos+'px';
        }

    floating_element.style.top=(parseFloat(caret.style.top)-35-50).toString()+'px';
    let left_pos=parseFloat(floating_element.style.left);
    let new_left_pos=parseFloat(caret.style.left)-40;
    if(fullFollow) {
        if(new_left_pos<left_pos) {
            floating_element.style.transition='0s ease-out';
            floating_element.style.left=new_left_pos+'px';
            setTimeout(function(){floating_element.style.transition=lagTime+'ms ease-out';},100);
            log('line break');
        }
        else {
            floating_element.style.left=new_left_pos+'px';
        }
    }
}
setInterval(updateWPM,100);
