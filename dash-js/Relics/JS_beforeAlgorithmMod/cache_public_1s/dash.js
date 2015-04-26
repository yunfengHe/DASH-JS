var DASHJS_VERSION = "0.5a";
var dashInstance;
var playbackTimePlot;

function updatePlaybackTime()
{
    playbackTimePlot.update(dashInstance.videoTag.currentTime, 2);// this comes from fplot.prototype.update, 2 is a type, not 'second'
    window.setTimeout(function () { updatePlaybackTime(); },100);
    
}

function DASH_MPD_loaded()
{

	  myBandwidth = new bandwidth(bps, 1.1, 0.9);
   
	  adaptation = init_rateBasedAdaptation(dashInstance.mpdLoader.mpdparser.pmpd, dashInstance.videoTag, myBandwidth);
	
   	myFplot = new fPlot(document.getElementById("graph").getContext("2d"),parsePT(dashInstance.mpdLoader.mpdparser.pmpd.mediaPresentationDuration),document.getElementById("graph").width,document.getElementById("graph").height);
 	  myFplot.initNewFunction(0);//$$ type 0 and 1 might represent the blue and red line, type 2 the vertical line marking current time
	  myFplot.initNewFunction(1);
    myFplot.initNewFunction(2); // the current playback time
    playbackTimePlot = myFplot;
	  myBandwidth.addObserver(myFplot);
	
	  adaptation.addObserver(myFplot);//$$chosen representation bw is also broadcast to fplot
	  adaptation.switchRepresentation(); // try to get a better representation at the beginning
	
	  //&& overlayBuffer = init_mediaSourceBuffer("0", 40,60,0,dashInstance.videoTag); //##this is of importance!! 20: startlevel, 30 maximum level, in seconds
	  overlayBuffer = init_mediaSourceBuffer("0", 20,30,0,dashInstance.videoTag);
	  //$$ function init_mediaSourceBuffer(bufferId, criticalLevel,buffersize, mediaAPI, videoElement, playbackTimePlot)    it turns out the start level may also be the refill level, minimum level !! $$// 
	  dashInstance.overlayBuffer = overlayBuffer;
 	
    /* new MSE ... */
    var URL = window.URL || window.wekitURL;
    if(window.WebKitMediaSource != null){
        window.MediaSource = window.WebKitMediaSource;
    }
    var MSE = new window.MediaSource();
    dashInstance.MSE = MSE;
    dashInstance.videoTag.src = URL.createObjectURL(MSE);

	

  dashInstance.MSE.addEventListener('webkitsourceopen', onOpenSource, false);
	dashInstance.MSE.addEventListener('sourceopen', onOpenSource, false);

	dashInstance.MSE.addEventListener('webkitsourceended', onSourceEnded);
	dashInstance.MSE.addEventListener('sourceended', onOpenSource, false);
     
	
	overlayBuffer.addEventHandler(function(fillpercent, fillinsecs, max){ console.log("Event got called from overlay buffer, fillstate(%) = " + fillpercent + ", fillstate(s) = " + fillinsecs + ", max(s) = " + max); 
	bufferstr = bufferstr + (new Date().getTime()/1000).toFixed(2) + "  " + fillpercent.toFixed(2)  + "\n"; });
  // consider modify  overlayBuffer.addEventHandler

   	window.setTimeout(function () { updatePlaybackTime(); },100);
    
}

function DASHPlayer(videoTag, URLtoMPD)
{
	console.log("DASH-JS Version: " + DASHJS_VERSION);
	dashInstance = this;
	this.videoTag = videoTag;
	//initDASHttp('no-cache'); //$$ defined in DASHttp.js, setting cache control
	initDASHttp('public'); //$$ defined in DASHttp.js, setting cache control
	this.mpdLoader = new MPDLoader(DASH_MPD_loaded);//$$ install the call back function??? when the mpd file is responded, parse and callback
	this.mpdLoader.loadMPD(URLtoMPD);//$$ pass url of the mpd to the loader and send request fetching the mpd
	//myBuffer = init_timeBuffer(2,1,0,video);
	//video.addEventListener('progress', , false);
}

