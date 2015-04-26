var video;
var dashPlayer;
var currentRep, curSegment=0;
var lastCall = 0;
var myBandwidth;
var myFplot;	
//var myRecord;
var overlayBuffer;
var myBuffer;
var bps;
var timeID = 0;
var adaptation;
var xmlHttp;
var myzip;
var downloadcontent;
var bufferstr = ""; //if the variable is not initiated, then NaN problem happens
var seglength = 1;  //&& the global variable for changing segment length!!