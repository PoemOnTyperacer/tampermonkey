// ==UserScript==
// @name         Typeracer: No spacebar scroll
// @namespace    http://tampermonkey.net/
// @version      0.0.1
// @description  Typeracer: No spacebar scroll
// @author       poem#3305
// @match        https://play.typeracer.com/*
// @match        https://staging.typeracer.com/*
// @noframes
// ==/UserScript==

window.addEventListener('keydown', function(e) {
  if(e.keyCode == 32 && e.target == document.body) {
    e.preventDefault();
  }
});
