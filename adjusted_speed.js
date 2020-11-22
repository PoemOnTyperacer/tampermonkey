// ==UserScript==
// @name         Typeracer: Adjusted speed
// @namespace    http://tampermonkey.net/
// @version      1.4.6
// @updateURL    https://raw.githubusercontent.com/PoemOnTyperacer/tampermonkey/master/adjusted_speed.js
// @downloadURL  https://raw.githubusercontent.com/PoemOnTyperacer/tampermonkey/master/adjusted_speed.js
// @description  Adds the Adjusted speed metric (among other things) to race end and race details pages
// @author       poem & xX0t1Xx
// @match        https://data.typeracer.com/pit/text_info*
// @match        https://data.typeracer.com/pit/result*
// @match        https://play.typeracer.com/*
// @match        https://staging.typeracer.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @connect      data.typeracer.com
// @connect      typeracerdata.com
// ==/UserScript==



/*=========SETTINGS=============*/
const SHOW_DESSLEJUSTED = false;
/*==============================*/

// What is the difficulty metric? http://bit.ly/typeracertextdifficulty

/*=========================================CHANGELOG=======================================================
1.1.0 (04-08-20):   Initial release
1.2.1 (04-12-20):   Added unlagged and adjusted speed values
                    Forced 2 decimals for speed/3 for adjusted/none for points
                    Changed name "to Typeracer: More Race Details"
1.2.4 (04-12-20):   Fixed replay button & margins
                    Reverse lag is now highlighted (eg. https://data.typeracer.com/pit/result?id=%7Ctr:poem%7C69527)
1.2.5 (04-13-20):   Fixed reverse lag detection
1.2.6 (04-13-20):   Fixed non-play universes
                    Moved error messages to console
1.2.7 (04-20-20):   Added Ping value
1.3.0 (08-19-20):   Added support for quotes starting with a special character, which is escaped in the log (like ")
                    Added a setting to display the "desslejusted"
                    (DISCLAIMER: this speed metric does not accurately represent the speed you typed a quote at, but inflates your score.
                    Therefore, it is not actually in use within the community. I only included it as a meme, and it is disabled by default.)
1.4.0 (08-31-20):   Added adjusted speed on race end screens
                    Added adjusted speed on race end replays
                    Added speed highlights for 300 and 400 club scores
                    Might be unstable on Firefox (working on it)
1.4.1 (09-01-20):   Added adjusted replays on race detail pages
                    Reverse lagged scores are now highlighted in red at the end of races
1.4.2 (09-07-20):   Added a Difficulty value on race and text details pages
1.4.4 (11-18-20):   Typeracer responsive theme update support
                    Fixed the Peak adjusted button "P" under race replays
		    Fixed crashing on Firefox (no after-race adjusted value yet)
                    Updated max and min relative average values
1.4.6 (11-22-20):   Fixed error that occasionally caused an error popup when finishing a race or starting a new one
                    Added back staging.typeracer.com support
=================================================================================================================*/

var status={
    url: window.location.href,
    isFirefox: navigator.userAgent.indexOf("Firefox")!=-1,
    responsiveTheme: !!document.getElementsByClassName('teachme').length,
    room:'other',
    race:'none',
    createdDisplayTag:false,
    displayTag:null,
    latestPartialAdjusteds:[],
    delays:[],
    maximumAdjustedIndex:0,
    maximumAdjustedValue:'undefined',
    replayCursor:-1,
    reverseLag:false,
    waiting:false,
    waitingCounter:0,
    latestDifficulty:'undefined',
    averageDifficulty:'undefined'
}

if(status.responsiveTheme&&!status.isFirefox)
    GM_addStyle (`
.mainViewport table.textInfoView>tbody>tr .tblOwnStats tr:nth-child(3) td:nth-child(1),
.mainViewport table.textInfoView>tbody>tr .tblOwnStats tr:nth-child(4) td:nth-child(1),
.mainViewport table.textInfoView>tbody>tr .tblOwnStats tr:nth-child(5) td:nth-child(1) {
    background-image: none;
}
.mainViewport table.textInfoView>tbody>tr .tblOwnStats tr:nth-child(7) td:nth-child(1) {
    background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACMAAAAiCAYAAADVhWD8AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyxpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMDY3IDc5LjE1Nzc0NywgMjAxNS8wMy8zMC0yMzo0MDo0MiAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIEVsZW1lbnRzIDE0LjAgKFdpbmRvd3MpIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOjI0N0MxREYzRkE5MDExRTdBQ0ZERUNFOEE1RjgyN0IxIiB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOjI0N0MxREY0RkE5MDExRTdBQ0ZERUNFOEE1RjgyN0IxIj4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6MjQ3QzFERjFGQTkwMTFFN0FDRkRFQ0U4QTVGODI3QjEiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6MjQ3QzFERjJGQTkwMTFFN0FDRkRFQ0U4QTVGODI3QjEiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz7A+ZXiAAAIVElEQVR42pRYDWxXVxU/977X0kKlfJRRoGFuQBnWdix/2b9iMjWkSxdXWJqNFWN0KroPKEQxUbEOQ5BpNkXCuuCGbkbDGCFN+Bppmy2WgvIhAhukwNhClwLtErCltED/793juefe+96ra9f60vd/X/ee+zvn/M7HrUBEEN98BQYd9A4EnejTVdEfAkoBUsnsHy6c/lBFyefTZfcVzZ81Y9JcAVAECvJBQE8oVIeH8nzfrYFTh09/dPTMpWsH/3iobeDCtQx9VoDCI7EZukpaxNML0fMAnT6Eb62g65BgJHgYQCgE30sRTn3psfmPf6vi/iUFkz5XIaJx9EcP7llBCBI980mwHs39d4Ldbzad2PVi4/td5/9zh0Fo2aQijVFGZ+EDvvns0GAkKh4MBGblg/c+WfftL3/vrol5Dwutjcan5wgRA4L4Gfk3oGHS3ksNqqkvM/DnHU2n31q+/Rh/Yfl0ByJky6sdteDDEAcZFDwhJmytSf1o+eIFqxFkvtbAmUBorVRAsqwbSSjJIwtqED6711rGzBHw8Ngxfvq7VV/6QsnMKZu+s7W5+0L3gKWCR2MDC3uoQ2QV7lu1aMP3F6efp6d8rWJAGmiNeVVWSjIPGAgNkIJ/7XxlTawcGH3k04zny8tmbjhQV11YPDHXcFPLQDksmHEHVn11bWV58QrhzEy/vtZAn0RkdCS3ftEj2HDoxEmjdCTeLIjMJbni3umT1x74xZJxxROy2WWxQ1mRkBknQwGvLluwurJ8Xu0gnFY7zQthAQiKDFAxT4wtwojIxk3uixxEdBBBLQFavfPHj5IISYHiJyzDIRzC0tLCqh9UpWphhMNwVXNGGH9jSBEiOXSRhXrsQv7OS6iEXhoqL15bNmda1Ws1qcitxjKS42vs2ifTT9HkwpHAMG9IYKgpQYroKHNhKtCNkdHiiMaiOgpN2tBGxUJ691RNRWrs7PHZgzmzsnxmdemcwmqtJYzCNEiW8YT1keOPMPmF41EGMX8EGlYIEbmcmYhhdV6urH7hiQUxGB0Hy75euthM9EbEwguiiDOfjNOewSfZcjcDZT0kY76gMsB0Vme3ysXf+MoXXeZHWPSzv6VQYS9iiOb87CPQY5T+C6NTP0cH3dedJec0Iu5qd59onFKJYRkno5fepzQOtswj86eXE/Q8Ex1yRMt4iCY6UHKeES7iLFHXnQH4dYcx3tJzAM1XYndFntUk5mwu8yhKyyM3ldw97QE0dcDl8xE4E7sSB1FPQt1ZgPWdKuKOjp2/dBgquIzCRNfAlUmWdDwQSZkxefw8w/ZkMjD+Td7eChB2tpurKQ8qyju62tS9TxbptMlPW4Guc7M92FRmWCNs8la2GBvADGEe66h9RbzvIKPNiDuIkImM4DQQcJPuH/2ngJZ+gK+NA9j7IEKeL6Ki+cszCBs7NWh6RxaWpPWsbAmHyQEFOSpmPrtK2jUMLWidy7oVYVg+qILBkStMS6OBoImW5ccFHOwzpm/pU1B1TEB/hlMx/Epz5GqiLSBAGkjLQoApOdqA0gIRUTVPANH4CgwOa7K4NUBb2o3bhG6E6NXkbDtMGfMe7AWoOiJg4USEDZ3aBVlcVoT0YA6NbSWLTNG5TGVIXBbYQkKidKOVxfwRlknGrcK46dbtoCM3x5/hcgUkfGqsI6GPcuFP3wuh/rqZCEqROMkUBQZsrsW+BZKjjEWkLhwB+MqPshqwQlrx0NnjMjg3nevoak+0Vp/q+rSrxvkKflPqwbMFBoipwkawQJNti7NCOERA7spxFDGxxkBEIvKkMj2Ra6cQ2qOVP+jobousgnGlNrJCDnlt1rwsBS+VKFg5mYB4NqLYoz7MJpccSntsEdsruIrKY1ygoq3iTr4pE6otAnP24tWTn7IGy1M2p8R5ZCwVpN+WIjw3iRwojdBZBPJwWsKUMbYUCLBRYzgSl4m4r7Gh6groyagcFD+zLXXz9h2dlqO0ruwZPauA7wObzG9QNl9xQuGiVsSufjduYFBVGO6IywNfe+mSMhVd/yyrh/1H2naagck6Y2sQ15QwlhSq/y1F8ZzRoGG5gZu38+q1axDVJhki/K7h33tMnyIjsnF9FWDDMmQzo+aQ6/j4ObDbDcfFUbQgHBSezeKwZ98/Pkq0EMSDv7ffaGg8fqHBFRwd0rpjswTjPAKcdzyb09Fyy0+UhWBULQgrSxEVCGzoun6j4cX9JxNxrDQZVX/t6y1v9N3OdDJxIdGpOfZbk2ndQyliAtrWUo2myDo8KDtJ1Tc2/LWl/+L1gQQY3rpm4GJvuPfnW5u38OtEMy1sk60toN3h0TcPXZOHESApfPg/ji273mnb+8qRdvKMSmY4qiuUxomp8PKxS5s37Wjdwt2bSnZwcYhjwiqCbZexOSMc1Hx/FpDGY+c3L93WaoPeSzTkoVtIX1Xfmt2nNv5+R2u92SOZchBtUeyeCV0CY75kRVsZHLk5q288em5j5ebmPqErN+UqHUARGJ1N452gfiU71+w5XbfqD2+vv90f9qBpWDgJorWG6U1iXkFiw4e2Qcdoo8cW66Fh6/+093hd5eZ3O7liS9OCKE8Mv7319H8SUHS/fPTjdWVrXn+6+fiFJlddhQMtYgCIIvHfFFf5IdoV0Nn03sVPnq55oWHd8u0nuocn9VD/ErHacJHXpMRw6qKZEx//SXV6SWX6noqR+mTXWtL05lMfXt69bf+ZXfVHPuwyFpJxzUrO2f7cMGA0cT2aGEizwafJHrUIgQyzi8fnPlSTujtdMnva/DlFE+beVzS1KHeMn0+W6glAdrR9cOV8z607p/517srRfSfaD757qWeAo5C7P1+nkKEVIDD/FWAApUAkdW035TgAAAAASUVORK5CYII=);
}
.mainViewport table.textInfoView>tbody>tr .tblOwnStats tr:nth-child(8) td:nth-child(1) {
    background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACMAAAAiCAYAAADVhWD8AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyxpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMDY3IDc5LjE1Nzc0NywgMjAxNS8wMy8zMC0yMzo0MDo0MiAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIEVsZW1lbnRzIDE0LjAgKFdpbmRvd3MpIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOjM0OUQyNTMzRkE5MDExRTc4QjJDRDM2RkVBMEZGREU5IiB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOjM0OUQyNTM0RkE5MDExRTc4QjJDRDM2RkVBMEZGREU5Ij4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6MzQ5RDI1MzFGQTkwMTFFNzhCMkNEMzZGRUEwRkZERTkiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6MzQ5RDI1MzJGQTkwMTFFNzhCMkNEMzZGRUEwRkZERTkiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz6CL7G2AAAJNElEQVR42pRYfWyW1RU/9z5PC1WKpVgR7KDyUeiglIFdKc7ZjWFY5+gi4cPFdSHD/TFcExf+WWciJKb+4dRJLMFN0oQlCJuYMaEEG12JKKwTpNql8AK1bOgGhQprsfR93+eenXvOvc/zMsVkT/p+Pc/9OOd3fud3zq1CRFA/3Aqfu+g+KHphSJ+G/hBQK9BGV/10yZTaZXPLFs6fU1ox467iMgVQAobmKBiIlOkPUPdeG0kff6e770hP/+Xulw73Qupyhh4bQBXQshn61DQhsBvR7zS9Qnrd1BgNAWYhUsp+V1pFK3/9gwUNjyyrqr+9uLBYxePoT1k75DIQgcZAHikYJD/aPxvN7n3ljWN7njn4IZ76dJSNsGuTizTGiM/qS4zRaHgwKFX32Nenr3uisbbxjgnj6E7AO/M8pRKDIPmN/J6lYdp91xbcHdcy6bZdb3R3rt/ZxU94ffoGKmLkvwSZCAKlN2xbe0/T+hXV5WgXREggsAaQd6BDxsNuTOuBVnQPwgQxk8whFFK025au7nOtP97WAakraeusDCTjNXzxlQ8qb9O+pqXP/2RFTbnfPEse2Em8KzulmQdsCA3Qit9lBbbCjjEyVgwqpxnPL54/ddOBJx7KL59QINy0axAtbmZM84Gm+59cvrg8T3mYrb/EBbQvIjJ6kjtD7QgGDv2SgmRsnNuQbuUReZ+cPmVi84FfNUB5UT6HTMcjbahMxHDpSG347cPVzcsXV7glxHL0noIQjp3nZ1pQzjEOMR4QR9WPUw5UUNlmMmjDH37xIBjKrIgIzMbw4pzCUd3qyjubHv3+ojxwXmn0KCgxmggs2WPhDwUNNtn+DnKIbByTTUxqhYlTEYR59NE0f9bkut+tXcRh1ZLFtADvqtY1r6lhskLsgdUYxRvY8HAmQcSpP0T0+fd1hMHrGi5eV3Axg3BpVMFw1rgsEYnwFLKu+DAGtL5RWE5D1q1dtkjNHJ9vae+8Blj52OKpjZWz7iQAIloj4E1ZM5R3jTyzoSQEtvcBrP/Iz3V8cGFAIvaaQoDt9wDcotkEekbpa5FDwdKCx0zEqHFcgX796VXVr2qxkoFuePhblUI8VkmeEqeoBVaeWc8R1vfFguLuO/ct3HR/9zDAvn8aTl1WFE7hiH9732xWIodWN3zv3nmCTKSyVUvLJtYvqSyLYxxD7Lz94IqGU1dFFoYzQksxOMvc4VmG0CH8rfM2ow9/qm32y336ePArAAWBlQZy1oZcR1wGiEf1Y8foqlAWDWq/u2BKMRtg7CAHvUryadUHClKjrGrsubVEwim1S2fFcGP5RXNshrReMrB1QMuSNOUVmrN6GvAaAmoomoe6mG7VOgKrhXOnTZYBGh2GOVJOr9NEzN2zaZvvEGnvAyZ1oEKX7dr+0Ssba4uN2P55hPoDdH+ZQ5HjHeagajhUWjJsoVekirsmjpfIuKpnC16sETT2m7ca6BmW6BWPZWlPKJMTVjvd1jUb4duUONQ3JBI0boyBnCXj8YIbVDhjTFnFrCmypit2NosMOqbRqJ+Vanj6Y4Q/9iOn5ZoiC7/xvGaO2C9U3TlE9tGMIoSPhhEe7QaoKzRQV2KNy8iSTiKUU1B6L3M4Q4lQMKkO4mHSIqyiWPcMK1h9GuDbZNSkUElIRDAoRFaPNGuJvWblGXiqV8OLlxDm5FNmzVNQYHfDPFlTe8e1E0QoicuBFyf0hcsRFywPXAnY/FWEwwvEq11Xk7qj0DOL7lkC05dUpKGDxmyfjtD1DYSyIiXVgqo6ej3kGcaJKIJHZmBkNFtaMDZ01qJYS1hnSf5DFmch4JISgI4SZMXtG0L4UQ/AWcuxKMvlgNoO2DkTYRG1XzMKYz44rdGSQRjXB1cGQjtswLkW9J88fyG3teLYWDKH6BumKNYc69EdROKa2w289jUaZyxaedxS7KRismoawvRC33R5uiY1ipe0YeVSG/rK3+9j03v6/JWE5wKLKLDNGtaJgJ9Jr5R1YwKovI04RJlmCGaNVkcUByyua3E7Ed5Q8X3tUt5gZXq1y5zjfz/zL/jfTJUGyS2Mwi3WQwjFOxK9i9TSnk9r7q0t3/qHbiwT3kGjEl7aeRiXcscfxONaNMsc2XXs3OC10bTojBtnQOVMMqyk/mon2ysOBTDpMMCZtGHsbYtw91Ea+ibCsydde4NeODHu/hCCuBuU1scMEspHvOndqauj7YdO9Emr4Dp27YVPQaw99vosA7CCiJtKS49idcWCYGgTzbxE2PiPCDou4OdQ4pAryVY5DrH4tV8YHOwO/bFEm2jvs68df6S+ejYTEV04cju1BHKA+26h/lEpdwYwIvVjFYeKjaPrVvEoCTtIz+z3THom2Lvv3T5fKDJUSIM9nef+s+Pg31KND9TMhtxzkevsOTWpqME4mvWXeyEmIyoVL4xKOY3ScU8uORLFrQb6T8VFZ8flwaE9z+x/39sdcNtF3Gn7eduh1LXrmdgIk5MVhltKf9O4rg/j5h9zqhUbpOUI4jPPKEHOO0oNWYq6mbanfn8IzwymfSAjaQ1MpvPMULTll9s6MrK6YeGTNlQzP3hxJacADjm7mBGDlco5EWhHTi+3EdPWNm7OG5oEW159s7dz69FzFBnjjQl5E2NbTWNaX+zqb3lu19t8HvabShcXuMbdoaC8iOW5zW2RjJLTg4+T8UY4wCXFWw52nWpd/fLb7mQp5KcPWiAKHEnZ8paNfzqx+bld72TQNUaxRigp1HZHhZ43xoUwYHFEL72o4iMK+ggQIsSIzQf/erJl+QsdNJ/2poTRkat0kZZ2MTkJ6jShsmnjn99/vOk37amRkYxwA6XG6NzDmhMtncsX7nvlyCJncuBN6UuKln+87fX3Ni1/4a00z9IuAwN187N2YOzBynoS1M0s0uta193fuKy63JWI5DwU60fOPwLku2uEwHMu2vHh2YG2lt3vdu7uuQg3pFpM6Jsd/B2srAyKmheMVi6dOqFh40M19ctr7i6Gm56MIefQBqSs0H7i7Md7X97fs6f16FkEl+Kg1P9hjFW2gCbaRlvLESWgbMrqqKp8fEHt2kXTFs6dObliVmlR2ZzSSSUFY7gxH8iC7u89/Unv1ZHR4++d/OTIvmPnut/qvyrST92aNiE3Yl90/VeAAQB5z33LQrMfnAAAAABJRU5ErkJggg==);
}
`);

Array.prototype.partialSum = function(initial, final) {
    let result=0;
    for(let n=initial;n<final+1;n++) {
        result+=parseInt(this[n]);
    }
    return result;
}

String.prototype.replaceAt = function(index, replacement) {
    return this.substr(0, index) + replacement + this.substr(index + replacement.length);
}

String.prototype.removeAt = function(indices) {
    if(typeof(indices)=='number') {
        if(indices<this.length)
            return this.slice(0, indices) + this.slice(indices+1);
        else
            console.log("error: can't remove character at index "+indices+" (out of bounds)");
    }
    else {
        let sub=0;
        let ans=this;
        for(let n=0;n<indices.length;n++) {
            if(indices[n-sub]<this.length) {
                ans = this.slice(0, indices[n-sub]) + this.slice(indices[n+1-sub]);
                sub++;
            }
            else
                console.log("error: can't remove character at index "+indices[n]+" (out of bounds)");
        }
        return ans;
    }
}

function getElementFromString(tag, string) {
    let element = document.createElement(tag);
    element.innerHTML = string;
    return element;
}

function sleep(x) { // Wait for x ms
  return new Promise(resolve => setTimeout(resolve, x));
}

function refreshCursor() {
    let replayExists=!!document.getElementsByClassName('acceptedChars')[0];
    if(!replayExists) {
        status.replayCursor=-1;
        return;
    }
    else {
        status.replayCursor = document.getElementsByClassName('acceptedChars')[0].innerText.length;
    }
}
setInterval(refreshCursor,1);

function createAdjustedReplay() {
    let accuracyTag = document.querySelector('.TypingLogReplayPlayer > tbody > tr:nth-child(3) > td > table > tbody > tr > td:nth-child(5)');
    let displayLine = accuracyTag.parentNode;
    let displayTagTitle = getElementFromString('td','<div class="lblStatusIndicator">Adjusted:</div>');
    displayTagTitle.style.textAlign="left";
    displayTagTitle.style.verticalAlign="top";
    let displayTag = getElementFromString('td','<div class="statusIndicator" style=""><span class="adjusted" id="adjustedReplayDisplay"></span></div>');
    displayTag.style.textAlign="left";
    displayTag.style.verticalAlign="top";
    displayLine.insertBefore(displayTagTitle,accuracyTag);
    displayLine.insertBefore(displayTag,accuracyTag);
    status.displayTag=document.getElementById('adjustedReplayDisplay');
    status.createdDisplayTag = true;
    let buttonsLine = document.querySelector('.TypingLogReplayPlayer > tbody > tr:nth-child(4) > td > table > tbody > tr');
    let maxAdjButton = getElementFromString('td','<img src="https://github.com/PoemOnTyperacer/tampermonkey/blob/master/peak_button_2.png?raw=true" style="width: 15px; height: 20px;" border="0" class="ImageButton" title="Go to peak adjusted speed: '+status.maximumAdjustedValue+'">');
    maxAdjButton.style.position='relative';
    maxAdjButton.id = 'maxAdjButton';
    buttonsLine.appendChild(maxAdjButton);
    maxAdjButton.onclick=function() {navigateLogTo(status.maximumAdjustedIndex)};
}

function adjustedReplay() {
    if(((status.room=='practice'||status.room=='ghost'||status.room=='public')&&status.race=='finished')||status.room=='race_details') {
        let replayCursor = status.replayCursor;
        if(status.replayCursor==-1||!status.createdDisplayTag) {
            return;
        }

        let unlaggedTag = document.querySelector('.TypingLogReplayPlayer > tbody > tr:nth-child(3) > td > table > tbody > tr > td:nth-child(4) > span');
        if(!!!unlaggedTag)
            return;

        let currentUnlagged = (unlaggedTag.innerText || '0 WPM').split(' WPM')[0]
        let partialAdjusted = status.latestPartialAdjusteds[replayCursor];
        let resultStr = partialAdjusted.toFixed(2)+' WPM'
        let titleStr = partialAdjusted.toFixed(8)+' WPM';

            if(status.displayTag.innerText!=resultStr) {
                status.displayTag.innerText=resultStr;
                status.displayTag.title=titleStr;
            }

    }
}
setInterval(adjustedReplay,1);

function navigateLogTo(index) {
    let cursor = status.replayCursor;
    if(cursor==-1) {
        window.alert("can't navigate (no replay)");
    }
    let navigationLine=document.querySelector('.TypingLogReplayPlayer > tbody > tr:nth-child(4) > td');
    navigationLine.style.filter = "brightness(50%)";
    navigationLine.style.pointerEvents="none";
    let play = document.querySelector('.TypingLogReplayPlayer > tbody > tr:nth-child(4) > td > table > tbody > tr > td:nth-child(1) > img');
    let beginning = document.querySelector('.TypingLogReplayPlayer > tbody > tr:nth-child(4) > td > table > tbody > tr > td:nth-child(3) > img');
    let nextFrame = document.querySelector('.TypingLogReplayPlayer > tbody > tr:nth-child(7) > td > table > tbody > tr > td:nth-child(2) > img');

    if(play.title=='Pause')
        play.click();
    beginning.click();

    let increm = 0;
    const max_increm = 10000;
    while(cursor>-1&&cursor!=index&&increm<max_increm) {
        nextFrame.click();
        refreshCursor();
        cursor = status.replayCursor;
        increm++;
    }
    navigationLine.style.pointerEvents="";
    navigationLine.style.filter = "brightness(100%)";

    if(increm==max_increm) {
        console.log('[log navigator] error : log navigator reached max increment');
        let maxAdjButton = document.getElementById('maxAdjButton');
        maxAdjButton.style.display='none';
    }
}

// AFTER-RACE ADJUSTED

if(!status.url.startsWith('https://data.typeracer.com/')&&!status.isFirefox) {

    // Modified log sender function:
// in the obsfucated new classic theme chromium code, the log sender function is called RB
var newRB = function RB(b, c, d) {
    var e, f, g, h;
    h = new $wnd.XMLHttpRequest;
    try {
        Nsb(h, b.c, b.g)
    } catch (a) {
        a = n8(a);
        if (vG(a, 229)) {
            e = a;
            g = new _B(b.g);
            xl(g, new $B(e.lc()));
            throw o8(g)
        } else
            throw o8(a)
    }
    TB(b, h);
    b.d && (h.withCredentials = true,
    undefined);
    f = new MB(h,b.f,d);
    Osb(h, new WB(f,d));
    try {
        h.send(c) //This is where the POST data is sent
        /* ----- Start NEW CODE ----- */
        if (c.search("TLv1")!=-1) {
            let typingLog = /^.*?,.*?,.*?,(.*?)\\!/.exec(c)[1];
//             console.log('caught log: '+typingLog);
            window.localStorage.setItem('latestTypingLog',typingLog);
        }
        /* ------ END NEW CODE ------ */
    } catch (a) {
        a = n8(a);
        if (vG(a, 229)) {
            e = a;
            throw o8(new $B(e.lc()))
        } else
            throw o8(a)
    }
    return f
}
// In the obsfucated Responsive theme chromium code, the log sender function is called XF
var newXF = function XF(b, c, d) {
    var e, f, g, h;
    h = new $wnd.XMLHttpRequest;
    try {
        sxb(h, b.c, b.g)
    } catch (a) {
        a = Dcb(a);
        if (DK(a, 233)) {
            e = a;
            g = new fG(b.g);
            Gp(g, new eG(e.lc()));
            throw Ecb(g)
        } else
            throw Ecb(a)
    }
    ZF(b, h);
    b.d && (h.withCredentials = true,
    undefined);
    f = new SF(h,b.f,d);
    txb(h, new aG(f,d));
    try {
        h.send(c)  //This is where the POST data is sent
        /* ----- Start NEW CODE ----- */
        if (c.search("TLv1")!=-1) {
            let typingLog = /^.*?,.*?,.*?,(.*?)\\!/.exec(c)[1];
//             console.log('caught log: '+typingLog);
            window.localStorage.setItem('latestTypingLog',typingLog);
        }
        /* ------ END NEW CODE ------ */
    } catch (a) {
        a = Dcb(a);
        if (DK(a, 233)) {
            e = a;
            throw Ecb(new eG(e.lc()))
        } else
            throw Ecb(a)
    }
    return f
}

function replaceJs() {
    if(status.isFirefox) {
        console.log('[Adjusted speed] warning: log catcher not yet firefox-compatible');
        return;
    }
    if(status.responsiveTheme) {
        com_typeracer_redesign_Redesign.onScriptDownloaded(newXF.toString());
    }
    else {
        com_typeracer_guest_Guest.onScriptDownloaded(newRB.toString());
    }
}

function logToSpeeds(log_contents) {
    let x=0;
    while(x<log_contents.length) {
        if(log_contents.charCodeAt(x)==8) { // should never be the last character
//             corrupted numbers and dashes
            log_contents = log_contents.replaceAt(x+1,'X');
            log_contents = log_contents.removeAt(x);
        }
        x++;
    }

    //     The contents of the quote don't matter, so long as we don't lose the quote length information.
//     So, let's turn any log into a series of non-digit characters separated by delays
    log_contents = log_contents.replace(/(\\b.)/g,'N'); //numbers and dashes
    log_contents = log_contents.replace(/(\\u....)/g,'S'); //special characters
    log_contents = log_contents.replace(/(\\)\D/g,'E'); //excepted characters

//     console.log('repaired and simplified log: '+log_contents);

    log_contents = log_contents.replace(/^./,'');
    let start = parseInt(/(\d*)?/.exec(log_contents)[1]);

    let quote_length=1;
    let total_time=0;

//     Count non-digits and add up delays
    let i=0;
    let num='';
    let partialAdjusteds = [0];
    let delays=[];
    let maxAdj = [0,0]; //maximum partial adjusted speed [index, value]
    while(log_contents[i])
    {
		num+=log_contents[i];
		if(i==log_contents.length-1)
		{
			total_time+=parseInt(num);
            delays.push(num);
		}
		else if(!log_contents[i+1].match(/\d/i))
		{
			total_time+=parseInt(num);
            delays.push(num);
			num='';
            let partialAdjusted=12000*(quote_length-1)/(total_time-start) || Infinity;
            partialAdjusteds.push(partialAdjusted);
            if(partialAdjusted>maxAdj[1]&&partialAdjusted!=Infinity) {
                maxAdj=[quote_length,partialAdjusted];
            }
			quote_length++;
			i=i+2;
			continue;
		}
		i++;
    }

    let unlagged_speed = 12000*quote_length/total_time;
    let adjusted_speed = 12000*(quote_length-1)/(total_time-start);
    let lagged_speed_str = (((document.getElementsByClassName('tblOwnStatsNumber') || [])[0] || {}).innerText || ' wpm').split(' wpm')[0];
    let lagged_speed = parseInt(lagged_speed_str);
    if((lagged_speed_str==''||lagged_speed>unlagged_speed+1)) { //only approximate lagged wpm available before saving
        status.reverseLag=true;
    }

    partialAdjusteds.push(adjusted_speed);
    if(adjusted_speed>maxAdj[1]) {
        maxAdj=[quote_length-1,adjusted_speed];
    }
    status.latestPartialAdjusteds = partialAdjusteds;
    status.delays=delays;
    status.maximumAdjustedIndex=maxAdj[0];
    status.maximumAdjustedValue=maxAdj[1].toFixed(3);
    //console.log('delays: '+delays);
//     console.log('partial adjusteds: '+partialAdjusteds);
    //console.log('max adj: '+maxAdj);

    let data = {
        unlagged:unlagged_speed,
        adjusted:adjusted_speed,
        start:start,
    }
    return data;
}

// the script needs to know where it is, because one can leave a ghost, navigate, join a practice racetrack without reloading the page

function guiClock() {
    let roomTitle = ((document.getElementsByClassName('room-title') || [])[0] || {}).innerText || '';
    let ghost_warning = ((document.getElementsByClassName('gwt-InlineHTML') || [])[0] || {}).innerHTML || '';
    let gameStatus = ((document.getElementsByClassName('gameStatusLabel') || [])[0] || {}).innerHTML || '';

    if(roomTitle=="Practice Racetrack") {
        if(ghost_warning.includes('You are racing against')) {
            if(status.room!='ghost')
                status.room='ghost';
        }
        else {
            if(status.room!='practice')
                status.room='practice';
        }
    }
    else if(gameStatus!='') {
        if(status.room!='public')
            status.room='public';
    }
    else {
        if(status.room!='other') {
            status.room='other';
            status.race='none';
            status.createdDisplayTag=false;
            status.replayCursor=-1;
        }
    }
    if(status.room!='other') {
        if(gameStatus=='The race is about to start!') {
            if(status.race!='waiting')
                status.race='waiting';
        }
        else if(gameStatus=='Go!'||gameStatus.startsWith('The race is on')) {
            replaceJs();
            status.createdDisplayTag=false;
            status.replayCursor=-1;
            status.reverseLag=false;
            if(status.race!='racing')
                status.race='racing';
        }
        else if(gameStatus=='The race has ended.'||gameStatus.startsWith('You finished')) {
            if(status.race!='finished') {
                status.race='finished';
                getPracticeRaceData();
            }
        }
    }
}
setInterval(guiClock,1);

function getPracticeRaceData() {
    let latestTypingLog = window.localStorage.getItem('latestTypingLog');
    let latestSpeeds = logToSpeeds(latestTypingLog);
    showPracticeRaceData(latestSpeeds);
}

async function showPracticeRaceData(speeds) {
    let timeLine = document.querySelector('.tblOwnStats > tbody > tr:nth-child(2)');
    let tblOwnStatsBody = timeLine.parentNode;
    let unlaggedResult = speeds.unlagged.toFixed(2)+' wpm';
    let adjustedResult = speeds.adjusted.toFixed(2)+' wpm';
    let startResult = speeds.start+'ms';
    let unlaggedLine = getElementFromString('tr','<td>Unlagged:</td><td><div class="unlaggedDisplay tblOwnStatsNumber" style=""><span class="unlagged">'+unlaggedResult+'</span></div></td>');
    let startLine = getElementFromString('tr','<td>Start:</td><td><div class="startDisplay tblOwnStatsNumber" style=""><span class="start">'+startResult+'</span></div></td>');

//     if i eventually figure out a way to find the quote id:
//     await refreshLatestDifficulty(id);
//     let difficultyLine = getElementFromString('tr','<td>Difficulty:</td><td><div class="diffDisplay tblOwnStatsNumber" style=""><span class="diff">'+status.latestDifficulty+'</span></div></td>');

    let adjustedStyle='';
    if(speeds.adjusted>=400) {
        adjustedStyle=' style="color: #ff2ee0;"'; // 400 club
    }
    else if(speeds.adjusted>=300) {
        adjustedStyle=' style="color: #ffc22a;"'; // 300 club
    }
    let laggedTag=document.getElementsByClassName('tblOwnStatsNumber')[0];
    if(status.reverseLag)
        laggedTag.style.color='#ff0000';
    let adjustedLine = getElementFromString('tr','<td'+adjustedStyle+'>Adjusted:</td><td><div class="adjustedDisplay tblOwnStatsNumber" style=""><span class="adjusted"'+adjustedStyle+'>'+adjustedResult+'</span></div></td>');
    let warningLine=getElementFromString('tr',status.latestWarning);

    tblOwnStatsBody.insertBefore(document.createElement('br'),timeLine);
    tblOwnStatsBody.insertBefore(unlaggedLine,timeLine);
    tblOwnStatsBody.insertBefore(adjustedLine,timeLine);
    tblOwnStatsBody.insertBefore(startLine,timeLine);
//     tblOwnStatsBody.insertBefore(difficultyLine,timeLine);
    tblOwnStatsBody.insertBefore(document.createElement('br'),timeLine);
    unlaggedLine.style.backgroundImage = 'none';
    adjustedLine.style.backgroundImage = 'none';

    createAdjustedReplay();
}
}

//DIFFICULTY ON TEXT DETAILS PAGES
else if(status.url.startsWith('https://data.typeracer.com/pit/text_info')) {
    async function main(){
        let match = /id=(.*)/.exec(status.url)
        if(match==null)
            return;
        let text_id = match[1];
        await refreshLatestDifficulty(text_id);
        let relative_average=status.latestDifficulty;
        let difficulty=relativeAverageToDifficulty(relative_average);

        let difficultyLine = getElementFromString('tr','<th title="Average difficulty: '+status.averageDifficulty+'">Difficulty:</th><td>'+difficulty+'</td>');
        document.querySelector('.avgStatsTable > tbody').appendChild(difficultyLine);
    }
    main();
}

// MORE VALUES ON RACE DETAILS PAGE
else {
status.room='race_details';

var race_log = '';

// Wait for page loading to access replay
window.addEventListener('load', function() {
    setTimeout(async function(){

    //Cleaner detail
    document.querySelector('.raceDetails > tbody > tr:nth-child(2) > td').innerText = "Race";

    //find and grab log
    let script=document.getElementsByTagName('script');
    let log_contents;
    for(let m=0; m<script.length;m++)
    {
        if(script[m].innerText.includes("var typingLog")) {
            let script_contents = script[m].innerText;
            script_contents = script_contents.split(',');
            script_contents.splice(0,3);
            let script_contents_trimmed_start = script_contents.join(',');
            log_contents = script_contents_trimmed_start.split('\|')[0];
        }
    }


// log_contents = 'D268o270n161\'240t79 64m113a62k98e79 49a96s143s143u82m223p401t256i80o160n143s65 96-448 303f191i81n159d3 77t98h294e42 46c113o31u146r31a97g128e191 49t128o35 107a49s111k97 128q112u113e78s210t159i64o128n161s79 81a79n111d65 81e240t479o64 128e112x208p97r110e178s159s145 62w80h98a80t111 79y97o31u177 65r64e191a95l98l95y63 80w145a81n88t86.160 96C193o191m161m113u176n158i146c224a94t202e184 79w64i66t93h192 81o576t84h172e176r160s176 80a47s179 94c241l63e127a96r112l464;2y48l672y62 98a207y928 96a208s112 80y175o66u143 48c31a112n65 112t81o94t1026o48 143a80v145o78i145d160 81m127i193s287u207n161d112e113r128s191t177a111n97d110i129n145g95s193,111 239s161a113d807n113e128s175s129 65a63n95d97 63d113r160e241a110a546m62a97.160 208W160i193t94h194 48t127h176i112j1377u160s48t160 63t113h159i64s161 47o96n145e80 47a63g161g145r216e167r1329e143e177m367e111n97t112,897 351y1184o48u159 82c79a79n161 159c225o97m159p207l128e98t110e113l512y111 225t143r337a208n96s127f273o111r112m81 97y79o64u128r65 48l62i146f48e47.96';
        //     Parsing the log to access partial adjusted speeds
    log_contents = log_contents.replace(/(\\b.)/g,'N'); //numbers and dashes
    log_contents = log_contents.replace(/(\\u....)/g,'S'); //special characters
    log_contents = log_contents.replace(/(\\)\D/g,'E'); //excepted characters
    log_contents = log_contents.replace(/^./,'');
    let start = parseInt(/(\d*)?/.exec(log_contents)[1]);
    let quote_length=1;
    let total_time=0;
//     Count non-digits and add up delays
    let i=0;
    let num='';
    let partialAdjusteds = [0];
    let delays=[];
    let maxAdj = [0,0]; //maximum partial adjusted speed [index, value]
    while(log_contents[i])
    {
		num+=log_contents[i];
		if(i==log_contents.length-1)
		{
			total_time+=parseInt(num);
            delays.push(num);
		}
		else if(!log_contents[i+1].match(/\d/i))
		{
			total_time+=parseInt(num);
            delays.push(num);
			num='';
            let partialAdjusted=12000*(quote_length-1)/(total_time-start) || Infinity;
            partialAdjusteds.push(partialAdjusted);
            if(partialAdjusted>maxAdj[1]&&partialAdjusted!=Infinity) {
                maxAdj=[quote_length,partialAdjusted];
            }
			quote_length++;
			i=i+2;
			continue;
		}
		i++;
    }

    let unlagged_speed = 12000*quote_length/total_time;
    let adjusted_speed = 12000*(quote_length-1)/(total_time-start);
    let desslejusted = 12000*((quote_length)/(total_time-start))
    partialAdjusteds.push(adjusted_speed);

    console.log('Partial Adjusted speeds: '+partialAdjusteds);

    status.latestPartialAdjusteds = partialAdjusteds;
    status.delays=delays;
    status.maximumAdjustedIndex=maxAdj[0];
    status.maximumAdjustedValue=maxAdj[1].toFixed(3);

    createAdjustedReplay();

    let t_total = total_time;
    let start_time_ms = start;

	var points = 0;
	var lagged_speed = 0;

	// Race context
	var [race_universe,univ_index] = ["play",4];
	if($('.raceDetails > tbody > tr:nth-child(4) > td:nth-child(1)')[0].innerText=="Universe")
    {
		race_universe = $('.raceDetails > tbody > tr:nth-child(4) > td:nth-child(2)')[0].innerText;
        univ_index++;
    }
	var player_name = /.*\((.*)\)$/.exec($('.raceDetails > tbody > tr:nth-child(1) > td:nth-child(2)')[0].innerText)[1];
	var race_number = $('.raceDetails > tbody > tr:nth-child(2) > td:nth-child(2)')[0].innerText;
	var date_str = $('.raceDetails > tbody > tr:nth-child(3) > td:nth-child(2)')[0].innerText;

	// Race timespan
	var date_obj = new Date(date_str);
	var race_unix_num = parseInt((date_obj.getTime()/1000).toFixed(0));
	var unix_start = (race_unix_num-1).toString();
	var unix_end = (race_unix_num+1).toString();

	// Fetch race data from timespan API (exact lagged speed, points)
	var race_data_url = 'https://data.typeracer.com/games?playerId=tr:'+player_name+'&universe='+race_universe+'&startDate='+unix_start+'&endDate='+unix_end;
	console.log('2-second-range timespan API url for this race: '+race_data_url);
    fetch(race_data_url)
		.then(response => {
		if (response.status !== 200)
			return;
		response.json().then(async data => {
			for(var i=0;i<data.length;i++)
			{
				if(data[i].gn==race_number) // In case timespan contained multiple races
				{
					// Display values
                    var registered_speed = parseFloat(data[i].wpm);
//                     registered_speed = 69.79;

                    var t_total_lagged = quote_length/registered_speed; // s/12
                    var ping = Math.round((t_total_lagged-t_total/12000)*12000); // ms

                    var reverse_lag_style = '';
                    if(unlagged_speed < registered_speed)
                        reverse_lag_style=' color:red; font-weight: 1000;';
                    registered_speed = registered_speed.toFixed(2);
                    unlagged_speed = unlagged_speed.toFixed(2);
                    adjusted_speed = adjusted_speed.toFixed(3);
                    desslejusted = desslejusted.toFixed(2);


                    let text_id=data[i].tid;
                    await refreshLatestDifficulty(text_id);
                    let relative_average=status.latestDifficulty;
//                     console.log("relative average: "+relative_average);
                    let difficulty=relativeAverageToDifficulty(relative_average);

                    var points = Math.round(data[i].pts);
                    var ghost_button_html = $('.raceDetails > tbody > tr:nth-child('+univ_index+') > td:nth-child(2) > a')[0].outerHTML.split('<a').join('<a style="position: absolute;left: 100px;"');
					$('.raceDetails > tbody').append($('<tr><td>Points</td><td>'+points+'</td></tr>'));
                    $('.raceDetails > tbody').append($('<tr><td title="Average difficulty: '+status.averageDifficulty+'">Difficulty</td><td>'+difficulty+'</td></tr>'));
                    let ds_html='';
                    if(SHOW_DESSLEJUSTED)
                        ds_html='<tr><td>Desslejusted</td><td>'+desslejusted+' WPM</td></tr>'
					$('.raceDetails > tbody > tr:nth-child('+univ_index+')')[0].outerHTML = '<br><tr><td>Registered</td><td style="position: relative;'+reverse_lag_style+'"><span>'+registered_speed+' WPM</span>'+ghost_button_html+'</td></tr><tr><td>Unlagged</td><td>'+unlagged_speed+' WPM (ping: '+ping+'ms)</td></tr><tr><td>Adjusted</td><td>'+adjusted_speed+' WPM (start: '+start_time_ms+'ms)</td></tr>'+ds_html+'<br>';
				}
			}
			});
		})
		.catch(err => {
			console.log("[D.TR-P] error: "+err);
		});
    },100);
}, false);
}

async function refreshLatestDifficulty(id) {
    // grabbing typeracerdata's relative average value, which may be used as an indicator of its difficulty
    // Thanks to noah for promptly building this api at my request, to make this feature possible!
    let api_text_url = 'http://typeracerdata.com/api_text?id='+id;
    GM_xmlhttpRequest ( {
        method: 'GET',
        url: api_text_url,
        onload: function (response) {
            try{
                let response_text = response.responseText;
                let data = JSON.parse(response_text);
                status.latestDifficulty=data.text_stats.relative_average;
            }
            catch(error){
                console.log('[getQuoteDifficulty] error when accessing typeracerdata api: '+error);
            }
            status.waiting=false;
        }
    });
    status.waiting = true;
    status.waiting_counter = 0;
    while(status.waiting) {
        if(status.waitingCounter>=300) {
            console.log('[getQuoteDifficulty] Error: request to typeracerdata timed out (3s)');
            status.waiting=false;
            status.latestDifficulty= 'error';
            break;
        }
        status.waitingCounter++;
        await sleep(10);
    }
}

// This function converts typeracerdata's Relative Average into a 0%-100% difficulty
// The average difficulty is around 66.1% -- because the easiest quotes on typeracer are easier than the hardest quotes are hard
function relativeAverageToDifficulty(str) {
    const relative_average=parseFloat(str);

//     This function assumes that the extreme relative average values on typeracerdata don't change, in order to convert relative_average into an absolute percentage
    const min_d = 1.5933;
    const max_d = 0.5819;
    const span = min_d-max_d;

//     bring the value between 0 and 1, 0 being the easiest-rated quote
    let original_index=(min_d-relative_average)/span;

//     bring the final value between 0 and 100
    let difficulty = original_index*100;

//     In reality, typeracerdata's relative average value isn't bound between min_d and max_d. They will need some updating occasionally.
//     In the meantime, the next lines account for this to avoid displaying percentages above 100 or below 0
    if(difficulty>100||difficulty<0) {
        if(difficulty>100)
            difficulty=100;
        else if(difficulty<0)
            difficulty=0;
        console.log('[relativeAverageToDifficulty] Warning: difficulty for this quote was out of bounds. Please update max and min relative average values with the latest on typeracerdata.');
    }

//     store the current average difficulty in the console, for comparing purposes
    status.averageDifficulty=((min_d-1)/span*100).toFixed(2)+'%';

//     return a percentage string
//     return (difficulty/10).toFixed(3)+'⭐';
    return difficulty.toFixed(2).toString()+'%';
}
