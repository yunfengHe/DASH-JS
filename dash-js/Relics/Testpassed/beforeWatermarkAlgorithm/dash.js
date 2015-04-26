var DASHJS_VERSION = "0.5a";
var dashInstance;
var playbackTimePlot;

function updatePlaybackTime()
{
    playbackTimePlot.update(dashInstance.videoTag.currentTime, 2);// this comes from fplot.prototype.update, 2 is a type, not 'second'
    window.setTimeout(function () { updatePlaybackTime(); },100); //&&disable this temperary to see what happens , this is uneccessary code for the experiment. 
    
}

function DASH_MPD_loaded()
{

	  myBandwidth = new bandwidth(bps, 1.1, 0.9);
   
	  adaptation = init_rateBasedAdaptation(dashInstance.mpdLoader.mpdparser.pmpd, dashInstance.videoTag, myBandwidth);//&& pmpd is the parsed and saved MPD data,this is confirmed
	
   	myFplot = new fPlot(document.getElementById("graph").getContext("2d"),parsePT(dashInstance.mpdLoader.mpdparser.pmpd.mediaPresentationDuration),document.getElementById("graph").width,document.getElementById("graph").height);
 	  myFplot.initNewFunction(0);//$$ type 0 and 1 might represent the blue and red line, type 2 the vertical line marking current time
	  myFplot.initNewFunction(1);
    myFplot.initNewFunction(2); // the current playback time
    playbackTimePlot = myFplot;
	  myBandwidth.addObserver(myFplot); //&& both bandwidth and adaptationlogic added the myFplot obbserver.
	
	  adaptation.addObserver(myFplot);//$$chosen representation bw is also broadcast to fplot
	  adaptation.switchRepresentation(); // try to get a better representation at the beginning //&& switchRepresentation controls the adaptation logic!!
	
	  //&& overlayBuffer = init_mediaSourceBuffer("0", 40,60,0,dashInstance.videoTag); //##this is of importance!! 20: startlevel, 30 maximum level, in seconds
	  
	  //$$ overlayBuffer is the dash-JS made intermediate buffer that we can actually monitor and react on(request, refill, algorithm change(may based on bandwidth change, can modify it.) based on buffer state.) May19
	  overlayBuffer = init_mediaSourceBuffer("0", 20,30,0,dashInstance.videoTag); //$$ the third argument buffersize, is passed as maxseconds defined in basebuffer.
	  //$$ function init_mediaSourceBuffer(bufferId, criticalLevel,buffersize, mediaAPI, videoElement, playbackTimePlot)    it turns out the start level may also be the refill level, minimum level !!(now it's fixed.may,19,2014) $$// 
	  dashInstance.overlayBuffer = overlayBuffer;
 	
    /* new MSE ... media source extension*/ //$$ try modify this part to use the new media source extension. 
    var URL = window.URL || window.wekitURL; //$$ https://developer.mozilla.org/zh-CN/docs/DOM/window.URL.createObjectURL
    if(window.WebKitMediaSource != null){
        window.MediaSource = window.WebKitMediaSource;
    }
    var MSE = new window.MediaSource();
    dashInstance.MSE = MSE;
    dashInstance.videoTag.src = URL.createObjectURL(MSE); //$$ Attach the mediasource object to the html video element(which is defined in the html file - the video display screen).

	

  dashInstance.MSE.addEventListener('webkitsourceopen', onOpenSource, false);//$$ MSE is the target object. the events such as webkitcourceopen and sourceopen are mse events. the thrid argument, just leave it to false. doesn't matter.
	dashInstance.MSE.addEventListener('sourceopen', onOpenSource, false);//&&  addEventListener is a javascript standard method. not user defined.

	dashInstance.MSE.addEventListener('webkitsourceended', onSourceEnded);//$$ by default, if the thrid argument is not presented, useCapture is set to false.
	dashInstance.MSE.addEventListener('sourceended', onOpenSource, false);//$$  MSE is an html element, that needed by observed and react upon. whether this element is supported is determined by the browser(javascript interpretor)
     
	
	overlayBuffer.addEventHandler(function(fillpercent, fillinsecs, max){ console.log("Event got called from overlay buffer, fillstate(%) = " + fillpercent + ", fillstate(s) = " + fillinsecs + ", max(s) = " + max); 
	bufferstr = bufferstr + (new Date().getTime()/1000).toFixed(2) + "  " + fillpercent.toFixed(2)  + "\n"; });
  // consider modify  overlayBuffer.addEventHandler   
  //$$ addEventhandler is a method of mediaSourceBuffer, check the prototype. this is a handler called right before buffer refilling, more like a debugging log generator.

   	window.setTimeout(function () { updatePlaybackTime(); },100);
   	    
}

function DASHPlayer(videoTag, URLtoMPD)//$$ this is the player event handler object
{
	console.log("DASH-JS Version: " + DASHJS_VERSION);
	dashInstance = this;//$$ assign the global dashInstance pointer to this object(dashplayer) so that we can refer to it outside(without using a factory and return the object).
	this.videoTag = videoTag;
	//initDASHttp('no-cache'); //$$ defined in DASHttp.js, setting cache control
	initDASHttp('public'); //$$ defined in DASHttp.js, setting cache control
	this.mpdLoader = new MPDLoader(DASH_MPD_loaded);//$$ install the call back function. when the mpd file is responded, parse and callback(after DASH_MPD_loaded successfully, hand over the job to function DASH_MPD_loaded(), it will proceed based on the MPD file- One MPD, all needed info within!!)
	this.mpdLoader.loadMPD(URLtoMPD);//$$ pass url of the mpd(parsed from original video URL) to the loader and send request fetching the mpd
	//myBuffer = init_timeBuffer(2,seglength,0,video);
	//video.addEventListener('progress', , false);
}

