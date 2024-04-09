function main() {
  log('Hello world!','lightgreen');



  const DATA_PREFIX = 'rs1_';


        let test_setting_1='def_val_1';
        let GUITimeout;
        let menuOpen=false;


        // Context
        const responsiveTheme = typeof com_typeracer_redesign_Redesign === "function";
        let universe='play';
        const UNIVERSE_REGEX=/universe=(.+?)(&.+|$)/;
        const CURRENT_URL=window.location.href;
        let universeMatch=UNIVERSE_REGEX.exec(CURRENT_URL);
        if(universeMatch!=null) {
            universe=universeMatch[1];
        }


        // Data/settings menu
        function logSettings() {
            log('[logSetting] test_setting_1 = '+test_setting_1,'#D3D3D3');
        }
        function load_settings() {
            debug=!!+GM_getValue(DATA_PREFIX+'debug');
            test_setting_1=GM_getValue(DATA_PREFIX+'test_setting_1');
            logSettings();
        }
        function addConfig() {
            if (typeof GM_registerMenuCommand !== "undefined") {
                GM_registerMenuCommand("Real speeds settings", config,'D');
            }
        }
        function config() {
            if (typeof GM_setValue !== "undefined")
            {
                if(menuOpen)
                    return;
                menuOpen=true;
                function saveCfg()
                {
                    debug=document.getElementById("RSDebug").checked;
                    test_setting_1=document.getElementById("RSTestSetting1").value;

                    GM_setValue(DATA_PREFIX+"debug", debug ? "1" : "0");
                    GM_setValue(DATA_PREFIX+"test_setting_1", test_setting_1);

                    log('[settings] saved data:','#D3D3D3');
                    logSettings();

                    document.getElementById("RSCfgSave").value = "Saved!";
                    clearTimeout(GUITimeout);
                    GUITimeout = setTimeout(function() {
                        let saveBtn=document.getElementById("RSCfgSave");
                        if(saveBtn==null)
                            return;
                        saveBtn.value = "Save";
                    },1500);
                }

                var div = document.createElement("div");
                div.style = "margin: auto; overflow-y: auto; max-height: 90%; width: fit-content; border-radius:5px; height: fit-content; border: 1px solid black; color:#ffffff; background: #000000; position: fixed; top: 0; right: 0; bottom: 0; left: 0; z-index: 8888888; line-height: 1;";
                div.innerHTML = "<b><br><center>Real speeds</center></b>"
                    + "<center><span style='font-size: 45%'>by <a href='https://data.typeracer.com/pit/profile?user=poem' target='_blank'>poem</a></span></center>"

                    + "<br><br><br><br></div><center><b>General:</b>"
                    + "<br><br><input id='RSDebug' type='checkbox' style='float: left; width:initial; padding: initial; margin: initial;'><span style='float:left;margin-left:1em;'>Debug</span>"

                    + "<br><br><br><br></div><center><b>Other:</b>"
                    + "<div style='margin: 20px;'><br><span id='RSTestSetting1Span'><input id='RSTestSetting1' type='text' size='7' style='display:inline; color: #ffffff; background-color: #000000; width:initial; padding: initial; margin: initial;'>Test setting 1:</span>"

                    + "<br><br><br><input id='RSCfgSave' type='button' value='Save'  style='display:inline; color: #ffffff; background-color: #000000; width:initial; padding: initial; margin: initial;'> <input id='RSCfgClose' type='button' value='Close'  style='display:inline; color: #ffffff; background-color: #000000; width:initial; padding: initial; margin: initial;'></center>";
                document.body.appendChild(div);

                load_settings();
                document.getElementById("RSDebug").checked = debug;
                document.getElementById("RSTestSetting1").value = test_setting_1;

                document.getElementById("RSCfgSave").addEventListener("click", saveCfg, true);
                document.getElementById("RSCfgClose").addEventListener("click", function(){div.remove();clearTimeout();menuOpen=false;}, true);
            }
            else
            {
                alert("Sorry, Chrome userscripts in native mode can't have configurations! Install TamperMonkey userscript-manager extension");
            }
        }


        async function endpoints() {
            // Compatibility with other TR mods (pacemaker...)
            if (!XMLHttpRequest.prototype.oldSend) {
                XMLHttpRequest.prototype.oldSend = XMLHttpRequest.prototype.send;
            }

            XMLHttpRequest.prototype.send = function (body) {
                if (body) {
                    const splitBody = body.split("|");
                    const endpoint = splitBody[6];
                    // const payload = splitBody[13];
                    log('[endpoints] endpoint='+endpoint+'; body='+splitBody.toString(),'#d3d3d3');

                    const join_game_endpoints = ["joinStandaloneGame", "joinSinglePlayerGame", "joinSameReplayGame", "joinRecordedReplayGame", "joinInstantReplayGame"];
                    const join_room_endpoints = ["createAndJoinCustomRoom","joinRoom","joinGameInRoom"]
                    const leave_game_endpoint = "leaveGame";
                    const leave_room_endpoint = "leaveRoom";
                    const navigation_endpoints = join_game_endpoints+join_room_endpoints+[leave_game_endpoint,leave_room_endpoint];

                    /*if (endpoint === "updatePlayerProgress" && payload.startsWith("TLv1")) { //catch and store log
                        // let typingLog = payload.substring(0, payload.indexOf("\\!")).substringAfterNth(",", 3);
                        // let newTypingLog = payload.substring(payload.indexOf("\\!")+2);
                        // log('[endpoints] log:\n'+typingLog+'\nNew log:\n'+newTypingLog,'#D3D3D3');
                        this.addEventListener("load", function() {
                            try {
                                const responseJSON = JSON.parse(this.responseText.substring(this.responseText.indexOf("[")));
                                let resp_len = responseJSON.length;
                                let gameStatus = ((document.getElementsByClassName('gameStatusLabel') || [])[0] || {}).innerHTML || '';
                                if (gameStatus == 'The race has ended.' || gameStatus.startsWith('You finished')) {
                                    registered_speed = responseJSON[resp_len-19];
                                    log('full response JSON:\n'+responseJSON);
                                    log('[endpoints] caught registered_speed='+registered_speed,'#D3D3D3');
                                    // displayResult(registered_speed);
                                }
                                // registered_id = responseJSON[resp_len-17];
                                // let points = responseJSON[resp_len-15];
                                // let accuracy = responseJSON[resp_len-10];
                                // log('[endpoints] registered speed='+registered_speed+'; points='+points+'; accuracy='+accuracy+'; id='+id,'#D3D3D3');
                            }
                            catch(error){
                                log("[endpoints] error while getting log "+endpoint+" response: "+error+'\nResponse text: '+this.responseText,'#ff0000');
                            }
                        });
                    }*/
                    /*this.addEventListener("load", function() {
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
                                    registered_speed=null;
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
                                    log('New status standby: no longer waiting for updatePlayerProgress');
                                    await_updatePlayerProgress=false;
                                }
                            }


                            const responseJSON = JSON.parse(this.responseText.substring(this.responseText.indexOf("[")));
                            if(endpoint=='updatePlayerProgress'&&await_updatePlayerProgress) {
                                if(responseJSON[0]=='0') {
                                    text_id=responseJSON[responseJSON.length-21];
                                    log('[endpoints] (private track new race) text id='+text_id,'#D3D3D3');
                                    await_updatePlayerProgress=false;
                                    makeDisplay();
                                    pbPace=null;
                                    registered_speed=null;
                                    rankPace=null;
                                    pickPace();
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
                            if(endpoint!='getSponsoredNotice')
                                log("[endpoints] error while getting "+endpoint+" response: "+error+'\nResponse text: '+this.responseText,'#ff0000');
                        }
                    });*/
                }
                return XMLHttpRequest.prototype.oldSend.call(this, body);
            }
        }


        log('current universe: '+universe);
        load_settings();
        addConfig();
        // endpoints();
}
main();
