/*
 * DASHttp.js
 *****************************************************************************
 * Copyright (C) 2012 - 2013 Alpen-Adria-Universität Klagenfurt
 *
 * Created on: Feb 13, 2012
 * Authors: Benjamin Rainer <benjamin.rainer@itec.aau.at>
 *          Stefan Lederer  <stefan.lederer@itec.aau.at>
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published
 * by the Free Software Foundation; either version 2.1 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston MA 02110-1301, USA.
 *****************************************************************************/
 
 var _timeID = 0;
 var _tmpvideo;
 var _cacheControl;  // cache control is merely a string here. written in http header. 
 
function DASHttp()
{	
	
}


/* *********************************************************************************************************
 *  this method is used by the mediaSourceBuffer class's bufferStateListener prototype, to feed mediasource api with data
 **********************************************************************************************************/
function _push_segment_to_media_source_api(buffer, data)
{
    console.log("DASH-JS client: appending data of length: " + data.length + " to the Media Source Buffer with id: "+ buffer.id); //$$$$$$$$$$$$$$$$$$$$$$$$$$ step 4
    sourceBufferAppend(dashPlayer.MSE, buffer.id, data);
   
}

/* *********************************************************************************************************
 *  this method is used by _dashSourceOpen to fetch initialization segment 
 * and put the data directly into mediasource api,rather than the overlay buffer.
 * overlaybuffer is a instance of mediasourcebuffer, which is a ring buffer that holds video segments
 * overlaybuffer do not hold initialization segment.
 **********************************************************************************************************/
function _fetch_segment(presentation, url, video, range, buffer)
{
	console.log('DASH JS Client fetching segment: ' + url);
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
    
	//_tmpvideo = video;
	xhr.onload = function(e)
   		 {
        
     			    data = new Uint8Array(this.response);
    			    mybps = endBitrateMeasurementByID(this.timeID,data.length);
    			    myBandwidth.calcWeightedBandwidth(parseInt(mybps));
    			    adaptation.switchRepresentation(); //&& need not be moved downward, because the first push is directly into mediasource api's internal buffer, rather than the overlay, my algorithm would not benefit if I perform switching after the push. 
    			    
			    _push_segment_to_media_source_api(buffer, data); //&& this line pushes the responded data, which is the initialization segment, directly into media source api.			    
    			    
			    if(presentation.curSegment >= presentation.segmentList.segments-1) video.webkitSourceEndOfStream(HTMLMediaElement.EOS_NO_ERROR);
        
   		 };
	
	beginBitrateMeasurementByID(this._timeID);
	_timeID++;
	xhr.send();
}


/* *********************************************************************************************************
 *  the process of requesting the next media segment and feed it to the overlay buffer
 **********************************************************************************************************/
function _fetch_segment_for_buffer(presentation, url, video, range, buffer) //&& in my experiment, range dose not matter, we are using second instead of range.  //&& switchrepresentation happens here.
{
  console.log('DASH JS Client fetching segment: ' + url);//$$ Step1
	var xhr = new XMLHttpRequest();
	xhr.timeID = _timeID;          //$$ a global in Dashttp.js
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
	xhr.onload = function(e) //&& a handler, will be executed after xhr.send(), when response reached
	{
		
		data = new Uint8Array(this.response);
		
/* *********************************************************************************************************
 *  added code to log cache hit and miss. 
 **********************************************************************************************************/				
		//++ console.log("!!Responsed data is  " + data); //++ //&& test, to see what's in data!! if the http response header is within!!  -- result: no, this.response only holds responsed data. header is read by this.getResponseHeader
		var lastMod = this.getResponseHeader ("X-Cache"); //++ 
		//++ console.log("X-Cache: " + lastMod); //++ 
		if (lastMod != null){		
			//&&console.log(lastMod + "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");
			var cachechecktime =	(new Date().getTime()/1000).toFixed(2);
			var n = lastMod.search("HIT from UbuntuProxyL2_157"); //++ 
			var m = lastMod.search("HIT from UbuntuProxyL1_158"); //++ string.search returns -1 if no match found
			//++console.log("the return valuse of lastMod.search(HIT) is "+ n);//++
			if (n >= 0){ //++ when HIT, write 1, when Miss, write 0
				CacheInfoStr = CacheInfoStr + cachechecktime + "\t" + 1 + "\n";
				HitCount += 1;	//++				
			}else{
				CacheInfoStr = CacheInfoStr + cachechecktime + "\t" + 0 + "\n";
			}
			if (m >= 0){ //++ when HIT, write 1, when Miss, write 0
				CacheInfoStrFar = CacheInfoStrFar + cachechecktime + "\t" + 2 + "\n";
				HitCountFar += 1;	//++				
			}else{
				CacheInfoStrFar = CacheInfoStrFar + cachechecktime + "\t" + 0 + "\n";
			}		
		}

		SegmentCount += 1;	//++		
		
		mybps = endBitrateMeasurementByID(this.timeID,data.length);
		myBandwidth.calcWeightedBandwidth(parseInt(mybps));
        
		// adaptation.switchRepresentation();      // <--- mod this, if you wanna change the adaptation behavior ... (e. g., include buffer state, ...)
        
     		   /************************************************
     		   * push the data into our buffer       		
       		 * original line: buffer.push(data, seglength);
       		 * push data into ring buffer, the refill process
     		   ************************************************/
    var pushdone = buffer.push(data, seglength); //++    
    adaptation.switchRepresentation(); //&& switch Rep after data's been pushed to the buffer   , before callback  
     		
			/******************************************************************************************************************
			* what if pushdone is -1, what I can do at this point? ? ?
    	* it's obviously better way to write the flow control algorithm at mediasourcebuffer.proto.refill,
    	* before fetching segment and refill, decide if ring buffer is full!! rather than mending things when push fail!
    	*
    	* 	var flag = 1;
      *		while (pushdone == -1){
			*			if (flag == 1){
			*   		window.setTimeout(function(){pushdone = buffer.push(data, seglength);},50);
			* 		}			  
			* 	flag = 0;
      *		}
      *
    	*  these lines are logically wrong, as the timeout is being set constantly, and the loop goes on and on, a dead loop
			*****************************************************************************************************************/
    if (pushdone == 0){ //&&pushdone == 0 indicate the data is successfully added to the overlay buffer
    	if(presentation.curSegment >= presentation.segmentList.segments-1) buffer.streamEnded = true;
    	buffer.callback();//$$ mediaSourceBuffer.prototype.callback; continue refilling... (make a refilling loop) 
    }	    
	};	
	beginBitrateMeasurementByID(this._timeID);
	_timeID++;
	xhr.send();	
}


 /* *********************************************************************************************************
 * called by eventHandler onOpenSource(e); fetch the initialization seg and push to medias source api, to initialize
 * no matter what representation would be chose on playing, no more initialization is needed. 
 * initialization segment with all different bit rate contains the required info for initialization, it appears 
 * confirmed by setting a breakpoint in this function and run
 **********************************************************************************************************/				
function _dashSourceOpen(buffer, presentation, video, mediaSource) //&& passed in argument: overlayBuffer, adaptation.currentRepresentation, dashPlayer.videoTag, e.target
{
	// check the parsed mpd
	// fetch a representation and check whether selfinitialized or ...
			
	video.width = presentation.width;
	video.height = presentation.height;

	console.log("DASJ-JS: content type: " + presentation.mimeType + '; codecs="' + presentation.codecs + '"');
	addSourceBuffer(mediaSource, buffer.id, presentation.mimeType + '; codecs="' + presentation.codecs + '"');
	
	
	if(presentation.hasInitialSegment == false)//&& WTF, it cannot be false if things are properly parsed and pointed by presentation object.
	{
        	baseURL = presentation.baseURL;
		_fetch_segment(presentation, (baseURL != 'undefined' ? presentation.baseURL : '') + adaptation._getNextChunkP(presentation, presentation.curSegment).src, video, adaptation._getNextChunk(presentation.curSegment).range, buffer);
	
		if(presentation.curSegment > 0 ) presentation.curSegment = 1;
		presentation.curSegment++;
				
	}else{//&& on dash source open, only fetch the initializationSegment !! so, there is no need to increment the curSegment index, which marks the playback time line.
		baseURL = presentation.baseURL;
		_fetch_segment(presentation, (baseURL != 'undefined' ? presentation.baseURL : '') + adaptation.getInitialChunk(presentation).src, video, adaptation.getInitialChunk(presentation).range, buffer);
		//presentation.curSegment++;

	}
			
}

 /**********************************************************************************************************
 *  this is the function called by _dashFetchSegmentAsynchron and by mediaSourceBuffer.prototype.refill
 **********************************************************************************************************/
function _dashFetchSegmentBuffer(presentation, video, buffer)//&&  presentation.curSegment++ happens here, when fetch segment for overlay buffer. 
{
	if(presentation.curSegment >= presentation.segmentList.segments-1) { //&& if reach the end of the segmentlist index, we are done and return.
        return; 
    }
    baseURL = presentation.baseURL;
	_fetch_segment_for_buffer(presentation, (baseURL != 'undefined' ? presentation.baseURL : '') + adaptation._getNextChunkP(presentation, presentation.curSegment).src, video, adaptation._getNextChunk(presentation.curSegment).range, buffer);
	presentation.curSegment++; //&& increment the segment list index, so that the next dash video segment will be requested next time
	
}

 /**********************************************************************************************************
 * originally designed so that a callback function would be passed in.
 * the implementation avoid this trouble, by directly call buffer.callback, which is defined in mediaSourceBuffer.js
 * the defined callback actually calls refill()
 **********************************************************************************************************/
function _dashFetchSegmentAsynchron(buffer, callback)
{
	_dashFetchSegmentBuffer(adaptation.currentRepresentation, adaptation.mediaElement, buffer);
}
 
 
function initDASHttp(cacheControl)
{
	_timeID = 0;
	_cacheControl = cacheControl;	
}