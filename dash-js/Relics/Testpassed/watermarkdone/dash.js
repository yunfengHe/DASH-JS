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
   //&& adaptation is a global variable that will be used by the eventhandler. 
   //&& adaptation object do this: it takes the pmpd and bandwidth object, then decide which segment will be downloaded next time
	  adaptation = init_rateBasedAdaptation(dashInstance.mpdLoader.mpdparser.pmpd, dashInstance.videoTag, myBandwidth);//&& pmpd is the parsed and saved MPD data,this is confirmed;  returns a rateBasedAdaptation object, which has the prototype set right, and pointers points to initial values
	
   	myFplot = new fPlot(document.getElementById("graph").getContext("2d"),parsePT(dashInstance.mpdLoader.mpdparser.pmpd.mediaPresentationDuration),document.getElementById("graph").width,document.getElementById("graph").height);
 	  myFplot.initNewFunction(0);//$$ type 0 and 1 might represent the blue and red line, type 2 the vertical line marking current time
	  myFplot.initNewFunction(1);
    myFplot.initNewFunction(2); // the current playback time, the vertical line
    playbackTimePlot = myFplot;
	  myBandwidth.addObserver(myFplot); //&& both bandwidth and adaptationlogic added the myFplot obbserver.
	
	  adaptation.addObserver(myFplot);//$$chosen representation bw is also broadcast to fplot
	  adaptation.switchRepresentation(); // try to get a better representation at the beginning //&& switchRepresentation controls the adaptation logic!!
	
	  //&& overlayBuffer = init_mediaSourceBuffer("0", 40,60,0,dashInstance.videoTag); //##this is of importance!! 20: startlevel, 30 maximum level, in seconds	  
	  //$$ overlayBuffer is the dash-JS made intermediate buffer that we can actually monitor and react on(request, refill, algorithm change(may based on bandwidth change, can modify it.) based on buffer state.) May19
	  
	  overlayBuffer = init_mediaSourceBuffer("0", 10, 25, 30, 0,dashInstance.videoTag); //$$ the third argument buffersize, is passed as maxseconds defined in basebuffer.
	  //&& playback start at low watermark 10, buffer is refilled at high watermark 20. at the begining when no data in overlaybuffer, buffer refilling is also signaled  
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

   	window.setTimeout(function () { updatePlaybackTime(); },100); //&& this is merely for plotting the vertical playbacktime line, no big deal.
   	    
}


function DASHPlayer(videoTag, URLtoMPD)//$$ this is the player event handler object
{
	console.log("DASH-JS Version: " + DASHJS_VERSION);
	dashInstance = this;//$$ point the global dashInstance pointer to this object(dashplayer) so that we can refer to it outside(without using a factory and return the object).
	this.videoTag = videoTag;
	//initDASHttp('no-cache'); //$$ defined in DASHttp.js, setting cache control
	initDASHttp('public'); //$$ defined in DASHttp.js, setting cache control
	this.mpdLoader = new MPDLoader(DASH_MPD_loaded);//$$ initialize mpdLoader, install the call back function.
	
	this.mpdLoader.loadMPD(URLtoMPD);//$$ pass url of the mpd(parsed from original video URL) to the loader and send request fetching the mpd. the registered callback function DASH_MPD_loaded() will take control after mpd's info saved in a structured file, which is 'dashInstance.mpdLoader.mpdparser.pmpd' 
	//myBuffer = init_timeBuffer(2,seglength,0,video);
	//video.addEventListener('progress', , false);
}

