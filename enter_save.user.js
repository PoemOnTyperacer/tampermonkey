// ==UserScript==
// @name         Typeracer: Enter = save ghost race
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Pressing Enter in typeracer will attempt to click the "Save" button, for use with typeracer practice mode
// @author       poem
// @match        https://play.typeracer.com/*
// @icon         https://www.google.com/s2/favicons?domain=typeracer.com
// ==/UserScript==


//monitor Enter keypress
document.addEventListener ("keydown", function (zEvent) {
        if (zEvent.key === "Enter") {
            //check for score menu buttons
            let selection = document.querySelector(".ScoreMenuButton");
            if(selection!=null) {
                //press Save
                let scoreMenuButtons = document.getElementsByClassName('ScoreMenuButton');
                let saveButton = scoreMenuButtons[1].firstChild.firstChild.firstChild;
                saveButton.click();
            }
        }
    });
