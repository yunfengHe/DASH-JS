var video;
var dashPlayer;
var currentRep, curSegment=0;
var lastCall = 0;
var myBandwidth;
var myFplot;	
//var myRecord;
var overlayBuffer;
var myBuffer;
var bps; //&& the latest measured bps is saved here, as global 
var timeID = 0;
var adaptation;
var xmlHttp;
var myzip;
var downloadcontent;
var bufferstr = ""; //if the variable is not initiated, then NaN problem happens
var Gearstr = "";
var seglength = 1;  //&& the global variable for changing segment length!!



/**********************************************************************
Legends:
//XX 	 test, interchangeable. 
//&&	 my in line comments
// 	   original comments
//++ 	 my added lines
//-- 	 original lines but reserved as reference
Quick Reference:
//&& when use var, it means the variable is the local one, 
* otherwise, javascript traverse the scope chain to find one. either global or local.
* parseInt( ,10) for base 10, this is a safe way. 
* javascript only has functional scope. it does not have block scope
* the original repo is down below
* https://github.com/dazedsheep/DASH-JS
**********************************************************************/
