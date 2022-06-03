// ==UserScript==
// @name         TR: Move countdown popup
// @namespace    http://tampermonkey.net/
// @version      0.0.1
// @description  Enables drag and drop on the countdown popup in Typeracer
// @author       poem#3305
// @match        https://play.typeracer.com/*
// @match        https://staging.typeracer.com/*
// @icon         https://www.google.com/s2/favicons?domain=typeracer.com
// ==/UserScript==

const COUNTDOWNPOPUP_CLASS = 'countdownPopup horizontalCountdownPopup';
const ELEMENT_CONFIG = { subtree: false, childList: true };
const DATA_LABEL = 'dragNDropCountdownPopup2';
const DEBUG = false;

function log(msg){
    if(DEBUG)
        console.log('[Drag N Drop Countdown] '+msg)
}


// Observe page for new countdown popup
const elementObserver = new MutationObserver(elementMutate);
elementObserver.observe(document.body, ELEMENT_CONFIG);

function elementMutate(mutations_list) {
	mutations_list.forEach(function(mutation) {
		mutation.addedNodes.forEach(function(added_node) {
			if(added_node.className == COUNTDOWNPOPUP_CLASS) {
				onNewCountdownPopup(added_node);
			}
		});
	});
}

function onNewCountdownPopup(element) {
    restoreFormat(element);
    dragElement(element);
    element.style.cursor='move';
}

//Make countdown draggable
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
