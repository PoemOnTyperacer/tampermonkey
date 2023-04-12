// ==UserScript==
// @name         Monkeytype: Hotlist
// @namespace    http://tampermonkey.net/
// @version      0.1.0
// @updateURL    https://raw.githubusercontent.com/PoemOnTyperacer/tampermonkey/master/mt_hotlist.user.js
// @downloadURL  https://raw.githubusercontent.com/PoemOnTyperacer/tampermonkey/master/mt_hotlist.user.js
// @description  Highlight words of your choosing in monkeytype tests
// @author       poem#3305
// @match        https://monkeytype.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=monkeytype.com
// @grant        GM_addStyle
// @noframes
// ==/UserScript==

const DEBUG = false;
const THEME='var(--main-color)';
const SEPARATOR=';'
const HL_DATA_ITEM='HotlistDataItemV2'
const WELCOME_MESSAGE='Customize your highlighted words list in the "behavior" settings.';
const GLOW_MULTIPLIER = 1.3; // overflow hidden over 1.3
const GLOW_MULTIPLIER_BIS = 0.6;
let createdMenu=false;
let HIGHLIGHT_LIST = [];
function log(msg){
    if(DEBUG)
        console.log('[Hotlist] '+msg)
}

function storeData(data) {
    log("Storing settings data: "+data);
    window.localStorage.setItem(HL_DATA_ITEM,data);
}

function loadData() {
    let data = window.localStorage.getItem(HL_DATA_ITEM);
    let message="Welcome to poem#3305's Hotlist mod\n===========================\n\n"+WELCOME_MESSAGE+"\n\n(This message won't show again.)";
    if(data===null) {
        log('No existing settings data found -- creating default');
        storeData('');
        window.alert(message);
        return;
    }

    if(data=='') {
        log('loaded data: highlight list is empty');
        HIGHLIGHT_LIST=[];
        return;
    }
    else {
        HIGHLIGHT_LIST=data.split(';').map(function(e) {return e.trim();});
        log('loaded highlight list: '+HIGHLIGHT_LIST);
    }
}
loadData();

GM_addStyle(`
.glow {
  -webkit-animation: glow 1s ease-in-out infinite alternate;
  -moz-animation: glow 1s ease-in-out infinite alternate;
  animation: glow 1s ease-in-out infinite alternate;
  z-index:-2;
}

@-webkit-keyframes glow {
  from {
    text-shadow: 0 0 `+(GLOW_MULTIPLIER)+`px #fff, 0 0 `+(2*GLOW_MULTIPLIER)+`px #fff, 0 0 `+(3*GLOW_MULTIPLIER)+`px `+THEME+`, 0 0 `+(4*GLOW_MULTIPLIER)+`px `+THEME+`, 0 0 `+(5*GLOW_MULTIPLIER)+`px `+THEME+`, 0 0 `+(6*GLOW_MULTIPLIER)+`px `+THEME+`, 0 0 `+(7*GLOW_MULTIPLIER)+`px `+THEME+`;
  }
  to {
      text-shadow: 0 0 `+(2*GLOW_MULTIPLIER_BIS)+`px #fff, 0 0 `+(3*GLOW_MULTIPLIER_BIS)+`px `+THEME+`, 0 0 `+(4*GLOW_MULTIPLIER_BIS)+`px `+THEME+`, 0 0 `+(5*GLOW_MULTIPLIER_BIS)+`px `+THEME+`, 0 0 `+(6*GLOW_MULTIPLIER_BIS)+`px `+THEME+`, 0 0 `+(7*GLOW_MULTIPLIER_BIS)+`px `+THEME+`, 0 0 `+(8*GLOW_MULTIPLIER_BIS)+`px `+THEME+`;
  }
}
`);
const SETTINGS_HTML=`
   <div class="groupTitle"><i class="fas fa-exclamation"></i> <span>hotlist</span></div>
   <div class="text">Custom list of words to be highlighted during tests.</div>
   <div class="inputs">
      <div class="inputAndButton">
         <input id="hotlistInputField" type="text" placeholder="placeholder; word; list" class="input customHotlist" value="`+HIGHLIGHT_LIST.join('; ')+`">
         <div id="hotlistSaveButton" class="button save" tabindex="0" ><i class="fas fa-save fa-fw"></i></div>
      </div>
   </div>`;

const ELEMENT_CONFIG = {childList: true, subtree: true, attributes: true, characterData: false};
function elementMutate(mutations_list) {
    for(let j=0;j<mutations_list.length;j++) {
        let mutation=mutations_list[j];
        for(let i=0;i<mutation.addedNodes.length;i++) {
            let added_node=mutation.addedNodes[i];
            let classList=added_node.classList;
            if(classList==undefined)
                continue;
            if(classList.contains('pageSettings')) {
                insertCustomHTML();
            }
            if(classList.contains('word'))
                onNewWord(added_node);
        }
    }
}
const elementObserver = new MutationObserver(elementMutate);
elementObserver.observe(document.body, ELEMENT_CONFIG);

function insertCustomHTML() {
    if(createdMenu)
        return;
    let sections=document.getElementsByClassName('behavior');
    if(sections.length==0)
        return;
    let section=sections[0];
    let customDiv=document.createElement('div');
    customDiv.classList.add('section');
    customDiv.classList.add('hotlist');
    customDiv.innerHTML=SETTINGS_HTML;
    section.insertBefore(customDiv, section.firstChild);

    let saveButton=document.getElementById('hotlistSaveButton');
    saveButton.onclick = function() {
        let hotlistInputField=document.getElementById('hotlistInputField');
        log('save button clicked ; loading and saving input field value='+hotlistInputField.value);
        storeData(hotlistInputField.value);
        loadData();
        this.blur();
    };
    createdMenu=true;
}

function onNewWord(word) {
    if(word.parentNode.id!='words')
        return;
    if(!word.classList.contains('glow')) {
        let wordContent='';
        let letters=word.childNodes;
        for(let j=0;j<letters.length;j++) {
            wordContent+=letters[j].innerText;
        }
        if(HIGHLIGHT_LIST.includes(wordContent)) {
            word.classList.add('glow');
        }
    }
}
