// ==UserScript==
// @name         Typeracer: Smooth Caret
// @namespace    http://tampermonkey.net/
// @version      0.1.5
// @updateURL    https://raw.githubusercontent.com/PoemOnTyperacer/tampermonkey/master/smooth_caret.user.js
// @downloadURL  https://raw.githubusercontent.com/PoemOnTyperacer/tampermonkey/master/smooth_caret.user.js
// @description  Customizable, smooth caret for TypeRacer
// @author       poem#3305
// @match        https://play.typeracer.com/*
// @match        https://staging.typeracer.com/*
// @noframes
// ==/UserScript==


const defaultSettings = {
    caretColor: "153,204,0", //"255, 124, 28" previously
    caretReactivity: 0.07,
    caretThickness: 0.3,
    blinkDuration: 1,
    maxOpacity: 1,
    minOpacity: 0.5,
    caretType: 0,
    hideInputField: false,
    debugMode: false,
    highlighting: true
}


//--------------- SETTINGS----------------------//
let caretColor = defaultSettings.caretColor;
let caretReactivity=defaultSettings.caretReactivity;
let caretThickness=defaultSettings.caretThickness;
let blinkDuration = defaultSettings.blinkDuration;
let maxOpacity = defaultSettings.maxOpacity;
let minOpacity = defaultSettings.minOpacity;
let caretType=defaultSettings.caretType;
let hideInputField =defaultSettings.hideInputField;
let debugMode=defaultSettings.debugMode;
let highlighting=defaultSettings.highlighting;
//---------------------------------------------//


/*GLOBAL*/
const version="0.1.5";
const offset = 0;
const settingsItem="smoothCaretSettingsv0-1-3";
const changelog=[];
let versionItem="smoothCaretVersion";
const separator='|';
const welcomeMessage='Click the gear wheel in the top right to customize the appearance and animation of the caret. This is an unofficial extension: if you notice any glitch after installing, disable it. Feel free to report any bugs in DMs @poem#3305. Enjoy!';
const caretNames=['vertical line', 'underscore']
const inputErrorBg='rgb(208, 131, 131)';
const thicknessNames=["hair","slim","bar","solid","thick","block"];
const thicknessValues=[0.01,0.1,0.3,0.4,0.5,1];
const reactivityNames=["extinct","asleep","glide","smoother","smooth","fast","lightning","instant"];
const reactivityValues=[0.0001,0.001,0.02,0.045,0.07,0.1,1,10];
const responsiveTheme = typeof com_typeracer_redesign_Redesign === "function";


let caretErrorColor='240,163,163';
//Same as text error highlighting (DEFAULT): '240,163,163'
//Bright red: '210, 4, 45'
let highlightErrorsInText = true;
let lagDistance=0;
let lagTime=999;
let targetClass='';
let ctrlA=false;
let caret;
let isCaretHidden=true;
let inputField;
let areSettingsHidden=true;
let settingsTitle;
let accountTab;
let appearanceTab;
let closeButton;
let isAppearanceTabHidden=false;
let settingsPopup;
let typo = false;
let checkedDisplayFormat=false;
let scrollX;
let scrollY;

function getThicknessIndex(thickness) {
    let currentThicknessIndex=0;
    while(thicknessValues[currentThicknessIndex]!=thickness) {
        currentThicknessIndex+=1;
    }
    return currentThicknessIndex;
}
function getReactivityIndex(reactivity) {
    let currentReactivityIndex=0;
    while(reactivityValues[currentReactivityIndex]!=reactivity) {
        currentReactivityIndex+=1;
    }
    return currentReactivityIndex;
}
function getOptionsHTML(type) {
    let options = `<option value="0">line</option>
    <option value="1">underscore</option>`;
    if(type===1) {
        options = `<option value="0">line</option>
    <option value="1" selected="selected">underscore</option>`;
    }
    return options;
}

function log(msg){
    if(debugMode)
        console.log('[Smooth caret] '+msg)
}

/*Data storing/loading*/
function storeSettings() {
    let data=[caretColor,caretErrorColor,caretReactivity,caretThickness,blinkDuration,maxOpacity,minOpacity,caretType,hideInputField,debugMode,highlighting];
    let output=data.join(separator);
    log("Storing settings data: "+output);
    window.localStorage.setItem(settingsItem,output);
    storeVersion();
}
function storeVersion() {
    log("Storing version number: "+version);
    window.localStorage.setItem(versionItem,version);
}

function loadSettings() {
    let data = window.localStorage.getItem(settingsItem);
    let message="Welcome to poem#3305's Smooth Caret\n===========================\n\n"+welcomeMessage+"\n\n(This message won't show again.)";
    if(data===null) {
        log('No existing settings data found -- creating default');
        storeSettings();
        window.alert(message);
        return;
    }

    let changelogLines=[];
    let installedVersion=window.localStorage.getItem(versionItem);
    let resetSettings=false;
    if(installedVersion==null)
        installedVersion="0.1.3";
    let i=0;
    while(i<changelog.length&&changelog[i][0]>installedVersion) {
        resetSettings=resetSettings||changelog[i][2];
        changelogLines.unshift(changelog[i][1]);
        i+=1;
    }
    if(changelogLines.length!=0) {
        let updateMessage="poem#3305's Smooth Caret update ("+version+")!\n===========================\n\n"+changelogLines.join('\n\n');
        let updateMessageEnd="\n\n(This message won't show again.)";
        log('Script upgrade detected: '+installedVersion+' -> '+version);
        if(resetSettings){
            log('Update requires new setting format -- resetting to default');
            storeSettings();
            updateMessage=updateMessage+"\n\nThis update requires your caret settings to be reset to default -- sorry for the inconvenience."+updateMessageEnd;
            window.alert(updateMessage)
            return;
        }
        storeVersion();
        updateMessage=updateMessage+updateMessageEnd;
        window.alert(updateMessage)
    }

    try{
    data=data.split(separator);
    caretColor=data[0];
    caretErrorColor=data[1];
    caretReactivity=parseFloat(data[2]);
    caretThickness=parseFloat(data[3]);
    blinkDuration=parseFloat(data[4]);
    maxOpacity=parseFloat(data[5]);
    minOpacity=parseFloat(data[6]);
    caretType=parseInt(data[7]);
    hideInputField=(data[8]==='true');
    //debugMode=(data[9]==='true');
    highlighting=(data[10]==='true');
    }
    catch(e){
        storeSettings();
        window.alert(message);
        return;
    }
    let log_data=[caretColor,caretErrorColor,caretReactivity,caretThickness,blinkDuration,maxOpacity,minOpacity,caretType,hideInputField,debugMode,highlighting];
    let log_output=log_data.join(separator);
    log("Loaded settings data: "+log_output);
}
loadSettings();


/*STYLES*/
let noTextErrHighStyle=`
.inputPanel > tbody > tr:nth-child(1) > td > table > tbody > tr:nth-child(1) > td > div > div > span {
text-decoration: none;

background-color: transparent;
}
`;//color: inherit;
if(highlightErrorsInText)
    noTextErrHighStyle='';
let caretOffset=[];


document.body.insertAdjacentHTML("afterbegin", `<div id="caret" style="visibility:hidden;"></div>`);
document.body.insertAdjacentHTML("beforeend",'<style>'+noTextErrHighStyle+`

.inputPanel > tbody > tr:nth-child(1) > td > table > tbody > tr:nth-child(2) {
position:absolute;
top:-500%;
}

.inputPanel > tbody > tr:nth-child(3) > td > table > tbody > tr {
display:none;
}
.inputPanel > tbody > tr > td > table > tbody > tr > td > div > div {
margin-top:1em !important;
margin-bottom: 1em !important;
}

.inputPanel > tbody > tr:nth-child(1) > td > table > tbody > tr:nth-child(1) > td > div > div > span {
    text-decoration: none;
    background-image:none;
}


 #caret {
  background-color: white;
  position: absolute;
  z-index:1000;
  left: 0px;
  top: 0px;
  border-radius: 15%;
}
</style>
<style id='caretBlinkStyle'></style>
<style id='caretThicknessStyle'></style>
<style id='caretAnimationStyle'></style>
<style id='inputFieldStyle'></style>
<style id='highlightingFieldStyle'></style>
`);

function setHighlightingStyle() {
    let highlightingFieldStyle=document.getElementById('highlightingFieldStyle');
    let outputStyle=`
    .inputPanel > tbody > tr:nth-child(1) > td > table > tbody > tr:nth-child(1) > td > div > div > span {
    color: inherit;
    }
    `;
    if(highlighting)
        outputStyle='';
    highlightingFieldStyle.innerHTML=outputStyle;
}
setHighlightingStyle();

function setInputFieldStyle() {
    let inputFieldStyle=document.getElementById('inputFieldStyle');
    let outputStyle=`
.mainViewport table.inputPanel .txtInput {
position:absolute;
z-index: -1;
left:0px;
}
`;
    if(!hideInputField) {
        outputStyle='';
    }
    inputFieldStyle.innerHTML=outputStyle;
}
setInputFieldStyle();

function setBlinkDuration() {
    let caretAnimationStyle=document.getElementById('caretAnimationStyle');
    caretAnimationStyle.innerHTML = `
    #caret{
    -moz-transition:all `+blinkDuration+`s ease-in-out;
    -webkit-transition:all `+blinkDuration+`s ease-in-out;
    -o-transition:all `+blinkDuration+`s ease-in-out;
    -ms-transition:all `+blinkDuration+`s ease-in-out;

    transition:all `+blinkDuration+`s ease-in-out;
    -moz-animation:blink normal `+(3*blinkDuration)+`s infinite ease-in-out;

    /* Firefox */
    -webkit-animation:blink normal `+(3*blinkDuration)+`s infinite ease-in-out;
    /* Webkit */
    -ms-animation:blink normal `+(3*blinkDuration)+`s infinite ease-in-out;
    /* IE */
    animation:blink normal `+(3*blinkDuration)+`s infinite ease-in-out;
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
    let caretBlinkStyle = document.getElementById('caretBlinkStyle');
    caretBlinkStyle.innerHTML = `
    @keyframes blink {
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
@-webkit-keyframes blink {
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
    let caretThicknessStyle = document.getElementById('caretThicknessStyle');
    let outputStyle;
    if(caretType===0) {
        outputStyle=`#caret {width: `+caretThickness+`ch;height: 1.5em;}`;
        caretOffset=[0,0];
        if(!responsiveTheme)
            caretOffset=[0,2+offset];
    }
    else if(caretType===1) {
        outputStyle=`#caret {width: 1.2ch;height: `+caretThickness+`em;`;
        caretOffset=[0,20];
    }
    caretThicknessStyle.innerHTML = outputStyle;
}
setCaretDimensions();




/*CLOCKS*/

function moveCaretToTarget() {
    caret = document.getElementById('caret');
    let targetEls = document.getElementsByClassName(targetClass);
    let target=null;
        for(let i=targetEls.length-1;i>=0;i--){
            if(targetEls[i].className.split(" ")[0]==targetClass) {
                target=targetEls[i];
            }
        }
    monitorClock();
    if(targetEls.length==0||target==null||ctrlA||typo) {
        let inputFields=document.getElementsByClassName('txtInput');
        if(inputFields.length==0)
            return;
        inputField=inputFields[0];
        let contents = document.querySelector('.inputPanel > tbody > tr:nth-child(1) > td > table > tbody');
        if(contents.onclick==null&&!isCaretHidden) {
            contents.onclick = function() { inputField.focus() };
            log('Restored input field focus on text click');
        }
        if(inputField != document.activeElement &&!isCaretHidden){
            isCaretHidden = true;
            caret.style.visibility='hidden';
            target=null;
            caret.style.left = '0px';
            caret.style.top = '0px';
            log('Input field out of focus. Hiding and resetting caret, resetting target');
        }
        return;
    }

    // store the x,y coordinates of the target
    let rect = target.getBoundingClientRect();
    let xT = rect.left+window.scrollX+caretOffset[0];
    let yT = rect.top+window.scrollY+caretOffset[1];

        // store the elements coordinate
    let xC = caret.offsetLeft;
    let yC = caret.offsetTop;

    let inputFields=document.getElementsByClassName('txtInput');
    if(inputFields.length==0)
        return;
    inputField=inputFields[0];


    if(hideInputField) {
        let computedCaretHeight=parseInt(getComputedStyle(caret).height);
        let inputPanelEls=document.getElementsByClassName('inputPanel');
        if(inputPanelEls.length>0) {
            inputField.style.left = getComputedStyle(inputPanelEls[0]).left;
        }
        inputField.style.top = (yT+computedCaretHeight) + 'px';
    }

    if(inputField === document.activeElement) {
        if(caret.style.visibility=='hidden') {
            caret.style.visibility='visible';
            caret.style.transition='left 0s ease-out, top 0s ease-out';
            caret.style.left = xT + 'px';
            caret.style.top = yT + 'px';
            log('Showing caret');
            isCaretHidden = false;
        return;
        }
    }
    inputField.setAttribute( "autocomplete", "chrome-off");
    let em_in_px = parseFloat(getComputedStyle(target).fontSize);
    if(yT-yC>em_in_px) {
        caret.style.transition='left 0s ease-out, top 0s ease-out';
        caret.style.left = xT + 'px';
        caret.style.top = yT + 'px';
        log('line break');
        return;
    }

    let distance = Math.sqrt(Math.pow(xT-xC,2)+Math.pow(yT-yC,2));
    if(distance==0) {
            return;
    }
    if(lagTime==0&&caretReactivity<10) {
        lagDistance=0;
        lagTime=999;
        log('stuck?');
    }

    if(distance<=lagDistance&&lagTime<1000) {
        lagTime=Math.round(lagTime*(1+0.1*caretReactivity));
    }
    else if(distance>lagDistance&&lagTime>50) {
        lagTime=Math.round(lagTime*(1-0.1*caretReactivity));
    }
    // log('animation= '+'left '+lagTime+'ms ease-out, top '+lagTime+'ms ease-out');
    caret.style.transition = 'left '+lagTime+'ms ease-out, top '+lagTime+'ms ease-out';

    // set the elements position to their position for a smooth animation
    caret.style.left = xC + 'px';
    caret.style.top = yC + 'px';
    // set their position to the target position
    // the animation is a simple css transition
    caret.style.left = xT + 'px';
    caret.style.top = yT + 'px';
}

function targetClock() {
    let textContainer = document.querySelector(".inputPanel > tbody > tr:nth-child(1) > td > table > tbody > tr:nth-child(1) > td > div > div");
    if(textContainer==null)
        return;
    let textNodes=textContainer.childNodes;
    for(let i=0; i<textNodes.length; i++) {
        let node = textNodes[i];
        try {
        let style = getComputedStyle(node);
        //if(style.backgroundImage=='url("data:image/gif;base64,R0lGODdhAQAoAIABAERmZv///ywAAAAAAQAoAAACBYSPqctYADs=")') {
        if(style.backgroundRepeat=='repeat-y') {
            node.style.backgroundImage="none";
            targetClass=node.className.split(" ")[0];
        }
        }
        catch(e)
        {
            log("couldn't access text fragment styles");
        }
    }
}


function isHighlighting() {
    ctrlA = window.getSelection && window.getSelection().type === 'Range';
}

function monitorClock() {

    //check if there's currently a typo in the input field
    if(!isCaretHidden) {
        let inputBg = window.getComputedStyle(inputField).getPropertyValue('background-color');
        if(inputBg===inputErrorBg) {
            if(!typo) {
                typo=true;
                log("typo");
                setCaretRGB(caretErrorColor);
            }
        }
        else if(typo) {
            typo=false;
            log("no more typo");
            setCaretRGB(caretColor);
        }
    }
    else if(typo) {
        typo=false;
        log("no more typo cuz hidden");
        setCaretRGB(caretColor);
    }

    //Also in this function: check that the display format is the one we want (new style 1) when user joins their first race
    let navElements = document.getElementsByClassName("navControls");
    if(navElements.length>0&&!checkedDisplayFormat) {
        document.getElementsByClassName('gwt-Anchor display-format-trigger')[0].click();
        let newStyle1Span =document.getElementsByClassName('gwt-RadioButton NEW')[0].firstElementChild;
        newStyle1Span.click();
        let styleParent=newStyle1Span.parentElement;
        while(!styleParent.classList.contains('DialogBox')){
            styleParent=styleParent.parentElement;
        }
        let xButton=styleParent.firstElementChild.firstElementChild.firstElementChild;
        xButton.click();
        checkedDisplayFormat=true;
        log('set display format to new style 1');
    }

    let labels=document.getElementsByClassName('gameStatusLabel');
    if(labels.length!=0) {
        if(labels[0].innerText==="The race has ended."&&!isCaretHidden) {
            isCaretHidden = true;
            caret.style.visibility='hidden';
            caret.style.left = '0px';
            caret.style.top = '0px';
            log('Ran out of time. Hiding and resetting caret, resetting target');
        }
    }

    let editPopups=document.getElementsByClassName("DialogBox trPopupDialog editUserPopup");
    if(editPopups.length==0&&!areSettingsHidden) {
        areSettingsHidden=true;
        log('Settings popup closed');
    }
    else if(editPopups.length!=0&&areSettingsHidden) {
        settingsPopup=editPopups[0];
        areSettingsHidden=false;
        showCustomSettings();
        log('New settings popup');
    }
}

const INTERVAL=10;
setInterval(isHighlighting,INTERVAL);
setInterval(targetClock,INTERVAL);
setInterval(moveCaretToTarget,INTERVAL);
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

/*CUSTOM SETTINGS*/
function showCustomSettings() {
    settingsTitle=settingsPopup.getElementsByClassName('Caption CaptionWithIcon')[0];
    accountTab=settingsPopup.getElementsByClassName('dialogContent')[0];
    closeButton=settingsPopup.getElementsByClassName('xButton')[0];

    //Tab links
    settingsTitle.innerHTML=`<a id="appearanceTabLink" style="margin-right:1ch;">Caret</a>|<a id="accountTabLink" style="margin-left:1ch;">Account</a>`;
    let appearanceTabLink=document.getElementById('appearanceTabLink');
    let accountTabLink=document.getElementById('accountTabLink');
    appearanceTabLink.onclick=function(){
        if(isAppearanceTabHidden) {
            isAppearanceTabHidden=false;
            appearanceTab.style.display="";
            accountTab.style.display="none";
            log('Showing appearance tab');
        }
    };
    accountTabLink.onclick=function(){
        if(!isAppearanceTabHidden) {
            isAppearanceTabHidden=true;
            appearanceTab.style.display="none";
            accountTab.style.display="";
            log('Showing account tab');
        }
    };

    //create the caret settings tab
    let appearanceTab= document.createElement('div');
    appearanceTab.classList.add("dialogContent");
    accountTab.style.display='none';
    isAppearanceTabHidden=false;

    let options=getOptionsHTML(caretType);
    let currentThicknessIndex=getThicknessIndex(caretThickness);
    let currentReactivityIndex=getReactivityIndex(caretReactivity);
    let isInputChecked='';
    if(hideInputField)
        isInputChecked=' checked';
    let isHighlightingChecked='';
    if(highlighting)
        isHighlightingChecked=' checked';
    //let titleStyle="font-weight: bold; border-bottom: 1px solid #3b5998; padding: 0.3em 0;";
    appearanceTab.innerHTML = `
<table class="signUpForm editAccountForm">
  <colgroup>
    <col width="50%">
  </colgroup>
  <tbody>
    <tr>
      <td colspan="2" class="sectionHeaderRow">1. Appearance</td>
    </tr>
        <tr>
      <td>Color:</td>
      <td>
        <div>
          <input autocomplete="off" type="color" value="`+RGBToHex(caretColor)+`" style="width:85%" id="caretColorInput2">
        </div>
      </td>
    </tr>
    <tr>
      <td> Thickness: </td>
      <td>
        <div>
          <input autocomplete="off" type="range" min="0" max="5" value="`+currentThicknessIndex+`" class="slider" id="caretThicknessInput">
        </div>
        <span class="gwt-InlineHTML" id="caretThicknessOutput">`+thicknessNames[currentThicknessIndex]+`</span>
      </td>
    </tr>
    <tr>
      <td>Type:</td>
      <td>
        <div>
          <select class="DirtyComboBox DirtyComboBox-unfocused" size="1" id="caretTypeInput">
`+options+`
          </select>
        </div>
      </td>
    </tr>
        <tr>
      <td>
        <div>
          <input autocomplete="off" type="checkbox" id="highlightingInput" `+isHighlightingChecked+` style="margin-top: 0.5em; margin-bottom: 0.5em">
        </div>
      </td>
      <td>
        <div>
          <label for="highlightingInput">Highlight typed letters (green)</label>
        </div>
      </td>
    </tr>
    <tr>
      <td colspan="2" class="sectionHeaderRow">2. Animation</td>
    </tr>
    <tr>
      <td> Reactivity: </td>
      <td>
        <div>
          <input autocomplete="off" type="range" min="0" max="7" value="`+currentReactivityIndex+`" class="slider" id="caretReactivityInput">
        </div>
        <span class="gwt-InlineHTML" id="caretReactivityOutput">`+reactivityNames[currentReactivityIndex]+`</span>
      </td>
    </tr>
    <tr>
      <td>Blink time (seconds):</td>
      <td>
        <div>
          <input autocomplete="off" type="text" value="`+blinkDuration+`" placeHolder="1" class="AdvancedTextBox" size="13" maxlength="5" id="caretBlinkDurationInput">
        </div>
      </td>
    </tr>
    <tr>
      <td> Opacity 1: </td>
      <td>
        <div>
          <input autocomplete="off" type="range" min="0" max="100" value="`+parseInt(100*maxOpacity)+`" class="slider" id="caretMaxOpacityInput">
        </div>
        <span class="gwt-InlineHTML" id="caretMaxOpacityOutput">`+parseInt(100*maxOpacity)+`%</span>
      </td>
    </tr>
    <tr>
      <td> Opacity 2: </td>
      <td>
        <div>
          <input autocomplete="off" type="range" min="0" max="100" value="`+parseInt(100*minOpacity)+`" class="slider" id="caretMinOpacityInput">
        </div>
        <span class="gwt-InlineHTML" id="caretMinOpacityOutput">`+parseInt(100*minOpacity)+`%</span>
      </td>
    </tr>
    <tr>
      <td colspan="2" class="sectionHeaderRow">3. Experimental</td>
    </tr>
    <tr>
      <td>
        <div>
          <input autocomplete="off" type="checkbox" id="hideFieldInput" `+isInputChecked+` style="margin-top: 0.5em; margin-bottom: 0.5em">
        </div>
      </td>
      <td>
        <div>
          <label for="hideFieldInput">Hide input field</label>
        </div>
      </td>
    </tr>
    <tr>
      <td style="margin: 10px; padding: 5px;"></td>
    </tr>
    <tr>
      <td>
          <button type="button" class="gwt-Button" id="caretSubmitButton">Submit</button>
      </td>
      <td>
        <a class="gwt-Anchor" href="javascript:;" title="reset values to default" id="caretResetLink" style="margin-right:1ch">Default</a><a class="gwt-Anchor" href="javascript:;" title="close this popup" id="caretCancelLink" style="margin-left:1ch">Cancel</a>
      </td>
    </tr>
  </tbody>
</table>
`;
    let settingsContainer=settingsPopup.firstChild.firstChild;
    settingsContainer.insertBefore(appearanceTab,accountTab);

    //make the settings alive
    document.getElementById("caretThicknessInput").addEventListener('input', function(e){
        document.getElementById('caretThicknessOutput').innerHTML=thicknessNames[e.target.value];
    });
    document.getElementById("caretReactivityInput").addEventListener('input', function(e){
        document.getElementById('caretReactivityOutput').innerHTML=reactivityNames[e.target.value];
    });
    document.getElementById("caretMaxOpacityInput").addEventListener('input', function(e){
        document.getElementById('caretMaxOpacityOutput').innerHTML=e.target.value+"%";
    });
    document.getElementById("caretMinOpacityInput").addEventListener('input', function(e){
        document.getElementById('caretMinOpacityOutput').innerHTML=e.target.value+"%";
    });
    document.getElementById("caretCancelLink").onclick=function(){closeButton.click();}

    //submit settings
    document.getElementById("caretSubmitButton").onclick=function(){
        caretColor=hexToRGB(document.getElementById('caretColorInput2').value);
        maxOpacity=document.getElementById('caretMaxOpacityInput').value/100;
        minOpacity=document.getElementById('caretMinOpacityInput').value/100;
        setCaretRGB(caretColor);

        caretThickness=thicknessValues[document.getElementById('caretThicknessInput').value];
        caretType=parseInt(document.getElementById('caretTypeInput').value);
        setCaretDimensions();

        caretReactivity=reactivityValues[document.getElementById('caretReactivityInput').value];

        blinkDuration=parseFloat(document.getElementById('caretBlinkDurationInput').value);
        setBlinkDuration();

        hideInputField=document.getElementById('hideFieldInput').checked;
        setInputFieldStyle();


        highlighting=document.getElementById('highlightingInput').checked;
        setHighlightingStyle();

        storeSettings();
        lagDistance=0;
        lagTime=999;

        //debugMode,caretErrorColor (not in the UI yet)
        closeButton.click();
    }

    // reset settings
    document.getElementById("caretResetLink").onclick=function(){
        document.getElementById('caretColorInput2').value=RGBToHex(defaultSettings.caretColor);
        document.getElementById('caretBlinkDurationInput').value=blinkDuration;
        document.getElementById('hideFieldInput').checked=defaultSettings.hideInputField;
        document.getElementById('highlightingInput').checked=defaultSettings.highlighting;
        document.getElementById('caretBlinkDurationInput').value=defaultSettings.blinkDuration;

        document.getElementById('caretTypeInput').innerHTML=getOptionsHTML(defaultSettings.caretType);

        let maxOpacityPercent = parseInt(100*defaultSettings.maxOpacity);
        document.getElementById('caretMaxOpacityInput').value=maxOpacityPercent;
        document.getElementById('caretMaxOpacityOutput').innerHTML=maxOpacityPercent+"%";

        let minOpacityPercent = parseInt(100*defaultSettings.minOpacity);
        document.getElementById('caretMinOpacityInput').value=minOpacityPercent;
        document.getElementById('caretMinOpacityOutput').innerHTML=minOpacityPercent+"%";

        let defaultThicknessIndex=getThicknessIndex(defaultSettings.caretThickness);
        document.getElementById('caretThicknessInput').value=defaultThicknessIndex;
        document.getElementById('caretThicknessOutput').innerHTML=thicknessNames[defaultThicknessIndex]


        let defaultReactivityIndex=getReactivityIndex(defaultSettings.caretReactivity);
        document.getElementById('caretReactivityInput').value=defaultReactivityIndex;
        document.getElementById('caretReactivityOutput').innerHTML=reactivityNames[defaultReactivityIndex]

        lagDistance=0;
        lagTime=999;

        debugMode=defaultSettings.debugMode;
    }
}
