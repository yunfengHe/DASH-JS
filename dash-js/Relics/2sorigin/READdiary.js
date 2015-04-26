DASHPlayer

tweak log:

1. gzip 
2. buffersize Dash.js: overlayBuffer = init_mediaSourceBuffer("0", 20,30,0,dashInstance.videoTag); //##this is of importance!! 20: startlevel, 30 maximum level, in seconds
3. eventlistener: callback functions
//**********************************************************//
One of the most common implementations of a callback that you are likely to encounter is found in the standard JavaScript addEventListener function which you can be attach to many different targets. 
This function has the general syntax:
target.addEventListener(event-type, callback);
Here event-type is a string representing the type of event to listen for,
callback is the callback function that will receive a notification when an event of the specified type occurs, and target is the JavaScript object that you want to receive the event from.
//**********************************************************//
about buffer monitoring :
basebuffer is the buffer used for store the fetched segment
mediasourcebuffer is the play out buffer.

在BUFFERjs里面定义addobserver 和notify, 在dashjs里注册fplot, 在fplot的update里面定义buffer的update. 但是这样的问题在于，update 参数不同，且两种update（带宽和bufferstate）不能同步
直接的解决办法是，不用obbserver,直接写入文件即可。把jzip的download放在外面。

re-design: modify fplot, when the value is 0 or 1 or 2, plot, otherwise, record and do not plot. in this way, buffer state files will be included. only that I have to consider if the buffer state notify will overlap with the bandwidth notify, think this through.

addEventlistenr是javascript提供的内置的obbserver接口模型

minimum level and critical level, see to the difference. the critical level may be the start up level and minumum level the refill level, or they are simply the same.

buffer log:  dash.js  overlayBuffer.addEventHandler  this is the buffer log and before logging,  dash js client fetches new segment. 






//**********************************************************// 

XMLHttpRequest found in mpdparser.js and DASHttp.js

1: DASHPlayer called from dash.js

MPDLoader.prototype.loadMPD and MPDLoader.prototype._loadMPD is a function pair, one parse the mpdurl and send request, the other receive mpd file from the server and parse it,
 then serve as a callback function

//**********************************************************// 

js global variable and header file

http://stackoverflow.com/questions/1167202/using-a-global-variable-in-javascript

when it comes to the header file, there is no including in JS. since it is the browser who will interpret the js source files. js source files are included in the html file.   e.g. : 	<script src="./dashcpJS/dashPlayerVars.js"></script>



//**********************************************************//

how observer work: example of the Fplot case

the subject - the event that is listened and notified to the listeners - is calcWeightedBandwidth(or when). bandwidth calcW occurs, notify is  called. and this is defined in bandwidth.js. so whenever calcW is called the notify occurs. and all listeners that had been registered shall be told of this.  in the case of DASH-JS, calcW is called in DASHttp.js, when the fetching request is sent.

solutions possible:
1 update happens in Fplot.  
2 modify overlayBuffer.addEventHandler in dash.js
3 write to file as console.log happens in basebuffer.js




//**********************************************************// 

//**********************************************************// 



 
//**********************************************************// 
at subject side, addobbserver is defined. notify is also defined in the subject definition. update is defined by the observer. the subject notify at certain point and update method of the observer is called when notified.
//**********************************************************// 

program design: callback and observer-listener mode differences 

http://programmers.stackexchange.com/questions/84732/what-is-the-difference-between-callbacks-and-listeners

http://dean.edwards.name/weblog/2009/03/callbacks-vs-events/

http://stackoverflow.com/questions/8951276/callback-command-vs-eventlistener-observer-pattern

In blackberry we can override keyChar() method and capture the keypress event or we can register onKeyPressListener. i know, onKeyListener is observer pattern.

In android also there is a KeyEvent.callback and onKeyListener

Both are events why we no need to register for keyChar event. what is the difference between both pattern?
 
//**********************************************************//




Dash_Js code explanation:


//*********************************************************//


Dash.js: initiate eventlisteners and dashplayer. 

1. in dash.js, the obbserver of bandwidth(the subject) is installed, the ploting function defined in myFplot is added as the obbserver. 

2. the buffer length is passed as parameters in the following code
overlayBuffer = init_mediaSourceBuffer("0", 20,30,0,dashInstance.videoTag); //##this is of importance!! 20: startlevel, 30 maximum level, in seconds
	  //$$ function init_mediaSourceBuffer(bufferId, criticalLevel,buffersize, mediaAPI, videoElement, playbackTimePlot)    it turns out the start level may also be the refill level, minimum level !! $$// 
	  dashInstance.overlayBuffer = overlayBuffer;



3. when dash fetches new segement, a event handler is also called to log the buffer state. this is do in the following code. the code is modified so that a string would hold the needed log and later written to a file which I use for analysis. 

overlayBuffer.addEventHandler(function(fillpercent, fillinsecs, max){ console.log("Event got called from overlay buffer, fillstate(%) = " + fillpercent + ", fillstate(s) = " + fillinsecs + ", max(s) = " + max); 
	bufferstr = bufferstr + (new Date().getTime()/1000).toFixed(2) + "  " + fillpercent.toFixed(2)  + "\n"; });

4.fplot.js
whenever the fplot obbserver is notified, the fplot.update method would log the bandwidth and time, then call plot to plot the chart. I modified fplot.prototype.update, so that the related data is written to two files, namely estimatedV.txt and displayedV.txt. the two files will be jziped when the dash playback is done. 


//*********************************************************//
MediaSource API   https://dvcs.w3.org/hg/html-media/raw-file/tip/media-source/media-source.html#goals

components: media source api   worked with HTML MediaElement

sourcebuffer is the buffer for media source api to deal with(mind this in dash js)
//*********************************************************//



























































*********************************************************** the looped procedure is as follow ************************************************************************************

********************************************************************************
DASHttp.js: 
function _fetch_segment_for_buffer(presentation, url, video, range, buffer)
{
    console.log('DASH JS Client fetching segment: ' + url);//$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$ step1
    var xhr = new XMLHttpRequest();
	xhr.timeID = _timeID;
	xhr.open('GET', url, true);
	xhr.setRequestHeader('Cache-Control', _cacheControl);
	if(range != null)
	{
		xhr.setRequestHeader('Range', 'bytes='+range);
		console.log('DASH JS Client fetching byte range: ' + range);
	}
	
	xhr.responseType = 'arraybuffer';
	xhr.buffer = buffer;
	//_tmpvideo = video;
	xhr.onload = function(e)
	{
		
		data = new Uint8Array(this.response);
		mybps = endBitrateMeasurementByID(this.timeID,data.length);
		myBandwidth.calcWeightedBandwidth(parseInt(mybps));
        
		adaptation.switchRepresentation();      // <--- mod this, if you wanna change the adaptation behavior ... (e. g., include buffer state, ...)
        
     		   // push the data into our buffer
       		buffer.push(data, 2);
        
        	if(presentation.curSegment >= presentation.segmentList.segments-1) buffer.streamEnded = true;
        
       		buffer.callback();
		
	};
	
	beginBitrateMeasurementByID(this._timeID);
	_timeID++;
	xhr.send();
	
}

********************************************************************************
dash.js:
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
	
	adaptation.addObserver(myFplot);
	adaptation.switchRepresentation(); // try to get a better representation at the beginning
	
	overlayBuffer = init_mediaSourceBuffer("0", 20,30,0,dashInstance.videoTag);
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
     
	
	overlayBuffer.addEventHandler(function(fillpercent, fillinsecs, max){ console.log("Event got called from overlay buffer, fillstate(%) = " + fillpercent + ", fillstate(s) = " + fillinsecs + ", max(s) = " + max); });
  //$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$ step2

   	window.setTimeout(function () { updatePlaybackTime(); },100);
    
}

********************************************************************************
basebuffer.js:
baseBuffer.prototype.get = function()
{
	console.log("Getting chunk: " + this.buffer.first % this.buffer.size);
	console.log("Fill state: " + this.fillState.seconds);
	//$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$ step3
	return this.buffer.array[this.buffer.first++ % this.buffer.size];
}

********************************************************************************
DASHttp.js:
function _push_segment_to_media_source_api(buffer, data)
{
    console.log("DASH-JS client: appending data of length: " + data.length + " to the Media Source Buffer with id: "+ buffer.id);
    //$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$ step4
    sourceBufferAppend(dashPlayer.MSE, buffer.id, data);
   
}


********************************************************************************
bandwidth.js:
bandwidth.prototype.calcWeightedBandwidth = function(_bps) {
	
	// check whether the bitrate has changed dramatically otherwise we won't search a new representation
	console.log("Bitrate measured with last segment: " + _bps + " bps");
	//$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$ step5
	this.bps = parseInt(((this.weight_f * this.bps) + (this.weight_s * _bps)) / 2) * 0.9;  // the weights are used to mimic optmistic or pessimistic behavior
	// check if we exceed the set bandwidth ..
    if( this.bps > maxBandwidth && maxBandwidth > 0) this.bps = maxBandwidth;
    
    console.log("Cummulative bitrate: " + this.bps + " bps");
	//$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$ step5
    
    
	// inform the observers
	this.notify();//$$notify happens here in calcWeightedBandwidth
	return this.bps;
}


********************************************************************************
adaptationlogic.js:
function init_rateBasedAdaptation(_mpd, video, bandwidth)
{
	rateBasedAdaptation.prototype = new adaptationLogic(_mpd, video);
	rateBasedAdaptation.prototype.switchRepresentation = function (){
				
			
			// select a matching bandwidth ...
			var i=0, n=parseInt(this.lowestRepresentation.bandwidth), m=this.representationID, _mybps = this.bandwidth.getBps();
			
			this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if(parseInt(_rel.bandwidth) < _mybps && n <= parseInt(_rel.bandwidth))
				{
					console.log("n: " + n + ", m:" + m);//$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
					n = parseInt(_rel.bandwidth);
					m = i;
				}
				i++;
		
			});
			
			// return the segment	
			if( m != this.representationID) 
			{
				// check if we should perform a resolution switch
				if (parseInt(this.currentRepresentation.width) != parseInt(this.mpd.period[0].group[0].representation[m].width) || parseInt(this.currentRepresentation.height) != parseInt(this.mpd.period[0].group[0].representation[m].height))
				{
					if(this.resolutionSwitch != 0) console.log("Doing nothing because a resolution switch is already ongoing");
						else
						{
							console.log("Resolution switch NYI");
							// force a new media source with the new resolution but don't hook it in, wait until enough data has been downloaded
							// only swith the bitrate within the given resolution
							
						}
				}else{		
					// well, switching the bitrate is not that problem ...
					console.log("DASH rate based adaptation: SWITCHING STREAM TO BITRATE = " + this.mpd.period[0].group[0].representation[m].bandwidth);
					//$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
					this.representationID = m;
					this.mpd.period[0].group[0].representation[m].curSegment = this.currentRepresentation.curSegment;
					this.currentRepresentation = this.mpd.period[0].group[0].representation[m];
					if(this.currentRepresentation.baseURL == false) this.currentRepresentation.baseURL = _mpd.baseURL;
					
				}
			}
			this.notify();//$$ when switchRepresentation hapens, the subject would notify the observer
		}

	ratebased = new rateBasedAdaptation(bandwidth);
	
	return ratebased;
}


********************************************************************************
basebuffer.js:
baseBuffer.prototype.add = function(data)
{
	console.log("Adding chunk: " + this.buffer.last % this.buffer.size);
	console.log("Fill state: " + this.fillState.seconds);
	//$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
	this.buffer.array[this.buffer.last++ % this.buffer.size] = data
}


********************************************************************************
mediaSourceBuffer.js:
mediaSourceBuffer.prototype.refill = function(object){
		
        if(object.doRefill == true){
        
            if(object.fillState.seconds < object.bufferSize.maxseconds){
        
                console.log("Overlay buffer...");//$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
                console.log(object);//$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
                console.log("Fill state of overlay buffer: " + object.fillState.seconds);
		            //$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
		
                _dashFetchSegmentAsynchron(object);	
		
                object.callEventHandlers();
            }else{
                object.doRefill = false;
            }
		}
	}
	
	
	

>>the original********************************************************************************
function init_mediaSourceBuffer(bufferId, criticalLevel,buffersize, mediaAPI, videoElement, playbackTimePlot)
{
	mediaSourceBuffer.prototype = new baseBuffer();
	
	mediaSourceBuffer.prototype.addEventHandler = function (fn)
	{
		// handlers will get the fillstate ...
		
		this._eventHandlers.handlers[this._eventHandlers.cnt] = new Object();
		this._eventHandlers.handlers[this._eventHandlers.cnt++].fn = fn;
	}
	
	
	mediaSourceBuffer.prototype.callEventHandlers = function ()
	{
		
		for(i=0;i<this._eventHandlers.cnt; i++) 
		{
			this._eventHandlers.handlers[i].fn(this.getFillLevel(),this.fillState.seconds, this.bufferSize.maxseconds);
        }
	}
	
	mediaSourceBuffer.prototype.bufferStateListener = function(object){
		
        object.mediaElementBuffered -= dashPlayer.videoTag.currentTime - object.lastTime;
        
        
        if(object.mediaElementBuffered < 2) {
           
            rc = object.drain("seconds",2);
            
            if (rc == -1)
            {
                // signal that we are done!
                
                dashPlayer.videoTag.webkitSourceEndOfStream(HTMLMediaElement.EOS_NO_ERROR);
                return;
            }
            
            if (rc != 0)
            {
              
                _push_segment_to_media_source_api(_mediaSourceBuffer, rc);		// the new MediaAPI allows to have more than one source buffer for the separate decoding chains (really nice) so we may support resolution switching in the future
                this.mediaElementBuffered += 2;

            }
            
            
            
            
        } 
        object.lastTime = dashPlayer.videoTag.currentTime;
      
        window.setTimeout(function () {_mediaSourceBuffer.bufferStateListener(_mediaSourceBuffer);},100);
			
	}
    
    // this is the callback method, called by the AJAX xmlhttp call
   	mediaSourceBuffer.prototype.callback = function(){
        
        	window.setTimeout(function () {_mediaSourceBuffer.refill(_mediaSourceBuffer);},0,true);
        
        
    	}
    
	mediaSourceBuffer.prototype.signalRefill = function()
	{
        
		if(_mediaSourceBuffer.doRefill == false)
        {   
            console.log("signaling refill");
            _mediaSourceBuffer.doRefill = true;
            _mediaSourceBuffer.refill(_mediaSourceBuffer);  // asynch ... we will only dive once into this method
        }
	}
	
	mediaSourceBuffer.prototype.getFillLevel = function()
	{
		return this.state("seconds");
	}
	
	mediaSourceBuffer.prototype.push = function(data,segmentDuration)
	{
		
       		_mediaSourceBuffer.fillState.seconds += segmentDuration;
        	_mediaSourceBuffer.add(data);
	
	}	
	
    
	
	mediaSourceBuffer.prototype.refill = function(object){
		
        if(object.doRefill == true){
        
            if(object.fillState.seconds < object.bufferSize.maxseconds){
        
                console.log("Overlay buffer...");
                console.log(object);
                console.log("Fill state of overlay buffer: " + object.fillState.seconds);
		
		
                _dashFetchSegmentAsynchron(object);	
		
                object.callEventHandlers();
            }else{
                object.doRefill = false;
            }
		}
	}
	
	
	
	
	_mediaSourceBuffer = new mediaSourceBuffer(bufferId);
	_mediaSourceBuffer.isOverlayBuffer = true;
	_mediaSourceBuffer.criticalState.seconds = criticalLevel;
	_mediaSourceBuffer.bufferSize.maxseconds = buffersize;
  _mediaSourceBuffer.initBufferArray("seconds",2);
	_mediaSourceBuffer.mediaAPI = mediaAPI;
	_mediaSourceBuffer.videoElement = videoElement;
	_mediaSourceBuffer.lastTime = 0;
	_mediaSourceBuffer.id = bufferId;
  _mediaSourceBuffer.playbackTimePlot = playbackTimePlot;
	_mediaSourceBuffer.registerEventHandler("minimumLevel", _mediaSourceBuffer.signalRefill);

		
	
	return _mediaSourceBuffer;
}

****************************************************************************************************************************************************************
