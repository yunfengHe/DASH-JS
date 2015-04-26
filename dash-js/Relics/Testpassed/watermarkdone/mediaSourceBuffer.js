/*
 * mediaSourceBuffer.js
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
var _mediaSourceBuffer;



function mediaSourceBuffer(id)
{
	this._eventHandlers = new Object();//$$ this object contains two variables, cnt and handlers. and handler is an array.
	this._eventHandlers.cnt = 0;
	this._eventHandlers.handlers = new Array();
  this.mediaElementBuffered = 0;
  this.lastTime = 0;
  this.fill = false;
  this.doRefill = false;
	this.id = id;
	this.MSABrefillthreshold = 5 //&& media source api 's internal buffer shall have at least several seconds' data, too low, may pause playing because of key frame missing, this unit is in second
	this.Feedingfrequency = 200 //&& unit in millisecond, keep this too low then cpu will be consumed!!  
}



/****************************************************************************** 
* init_mediaSourceBuffer is a factory that returns a mediaSourceBuffer object!
******************************************************************************/
function init_mediaSourceBuffer(bufferId, criticalLevellow, criticalLevelhigh, buffersize, mediaAPI, videoElement, playbackTimePlot)
{
	mediaSourceBuffer.prototype = new baseBuffer();	
	
	mediaSourceBuffer.prototype.addEventHandler = function (fn) //$$ a newly defined eventhandler register, it is used in refilling function to generate debugging info. the handler function is added in dash.js
	{
		// handlers will get the fillstate ... //$$ bufferlistener notify other handlers about fill state, this is used to register fplot perhaps.actually, it's used in console log.
		
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
	
	
	/* *********************************************************************************************************
  * bufferStateListener checks if there's data in overlay buffer,
  * and try feed mediasource api with data from the overlay buffer, every 100 millisecond.
  * it is called in the eventhandlers.js
	* mediaSource.bufferStateListener periodically feed mediasource api data, from the overlay buffer,
	* keep an eye on the	'if(object.mediaElementBuffered < 5)' condition, 
	* make sure the value is bigger than 3 and not too big. THIS SETTING AVOID DEAD LOOP AND TOO MUCH MEM USAGE
  ************************************************************************************************************/			
	mediaSourceBuffer.prototype.bufferStateListener = function(object){ 	
				/**************************************************************************
				* object.drain here is the basebuffer.js's basebuffer.prototype.drain. 
				* since mediaSourceBuffer is the child class, then it shall be passed in(as an object). 
        * this sentense calculate the time remained before mediasource_api run out of data(before playback broken)
        * a newly defined property, indicating the length of remaining media in the buffer 
        * currenTime is a property of HTML Audio/Video DOM , it's in seconds        
				***************************************************************************/		
        object.mediaElementBuffered -= dashPlayer.videoTag.currentTime - object.lastTime;         

				/************************************************************************************************************
 			  * originally: if(object.mediaElementBuffered < 2); pose problem, sometimes playback get stuck!!
  			* try 'if(object.mediaElementBuffered < seglength)' 
  			* making this value larger to ensure better reliability, it should be ok to make this different than the segment length,
  			* I will try 2 for 1s segment setting. it is actually a threshold. 0.9 s might be too short for feeding the about-to-starve buffer
  			*
  			* &&!! IMPORTANT BUG FIX!! (EXPLAINED BELOW)
  			* mediasource api has a internal buffer, there must be key frame,
  			* and the internal player play the video successcively based on time frame, other than segment length, segment is just a bulk of data!!
  			*
  			* &&!! CONLUSION OF THE BUG
  			* set this value too low, then media player may run out of key frame to play the video, and dashPlayer.
  			* videoTag.currentTime would stop to refresh, then it goes into a dead loop. 
  			* too high, there's just too much to buffer in the browser, no good  
  			*
  			* &&!!MODIFIED LINE
  			* 'if(object.mediaElementBuffered < this.MSABrefillthreshold)'
  			* MSABrefillthreshold  represents media source api internal buffer refilling threshold      
  			************************************************************************************************************/	
        if(object.mediaElementBuffered < this.MSABrefillthreshold) {
        	 
				/************************************************************************************************************
 			  * drain from overlay buffer, everytime of drain, it will check the overlay buffer level and call refill if needed
        * drain(get) data from overlay buffer, give the data piece to rc(pointing rc to it) , 
        * the amount drained is one unit of the buffer array, which is the segment length in byte or in seconds. 
        * it has to correspond with the segment length, check basebuffer.js to see the prototype.   
  			************************************************************************************************************/	
            rc = object.drain("seconds",seglength);  //$$ rc is the return value of drain, it indicates if there's still data in the overlay buffer(mediasource buffer)
            
            if (rc == -1) //&& drain returns -1, indicating end of stream and no data in overlaybuffer.
            {
                // signal that we are done!
                             
                myFplot.closefile(); //$$ call my jzip function to save recorded data into the zip file
                //dashPlayer.videoTag.webkitSourceEndOfStream(HTMLMediaElement.EOS_NO_ERROR);//$$ I comment this line out
                return;
            }
            
            if (rc != 0)
            {
              	//&& feed media source api if there's data in overlay buffer, when no data, this will be tired again 100 milliseconds later
              	// the new MediaAPI allows to have more than one source buffer for the separate decoding chains (really nice) so we may support resolution switching in the future
                _push_segment_to_media_source_api(_mediaSourceBuffer, rc);		
                this.mediaElementBuffered += seglength;  //$$ feed one unit of data to media_source_api; += unit length(segment length)
            }          
            
        } 
        object.lastTime = dashPlayer.videoTag.currentTime;
      
        window.setTimeout(function () {_mediaSourceBuffer.bufferStateListener(_mediaSourceBuffer);},this.Feedingfrequency); 
        /*******************************************************************************************************************
 			  * the timer is set everytime mediaSource.bufferStateListener is called, so it will repeat itself every 100 millisecond.setTimeout excute the timer only once 
        * The setTimeout() method calls a function or evaluates an expression after a specified number of milliseconds.
        * every 0.1 second, try feed media_source_api with new data, making sure that mediasource api do not run out
        * (feed it with data from mediasourcebuffer(our overlay buffer)); 
        * we do not know how much buffer mediasource api hold possession, so all we can do is prevent mediasource api from starving.
  			*******************************************************************************************************************/	
	}
	
	
    
  /************************************************************************
  * this is the callback method, called by the AJAX xmlhttp call,(original comment)
  * in DASHttp.js - _fetch_segment_for_buffer. 
  * this callback help creates a refilling loop, which won't stop until buffer full and refill() jump out 
  ************************************************************************/ 
  mediaSourceBuffer.prototype.callback = function(){
        
        	window.setTimeout(function () {_mediaSourceBuffer.refill(_mediaSourceBuffer);},0,true);
        
        
  }
    
	mediaSourceBuffer.prototype.signalRefill = function()
	{
        
		if(_mediaSourceBuffer.doRefill == false)
        {   
            console.log("signaling refill");
            _mediaSourceBuffer.doRefill = true; //$$ the boolean property of doRefill is more like a locking mechanism
            _mediaSourceBuffer.refill(_mediaSourceBuffer);  // asynch ... we will only dive once into this method
        }
	}
	
	mediaSourceBuffer.prototype.getFillLevel = function()
	{
		return this.state("seconds");
	}
	
	
	/********************************************************************
	* push data into the buffer(array[i]).
	* if _mediaSourceBuffer.add() returns -1, then signal the calling function
	* if return 0, then push is done, fillstate is incremented
	********************************************************************/	
	mediaSourceBuffer.prototype.push = function(data,segmentDuration) 
	{       		
        	var datapush = _mediaSourceBuffer.add(data); // ++       	
        	if (datapush == 0){ 	//++
					 _mediaSourceBuffer.fillState.seconds += segmentDuration; //++
					 return 0;      			//++
        	}
        	if (datapush == -1){	//++
        		return -1;					//++
        	}
	}	
	
   
   
 	/********************************************************************
	* if the passed in buffer is not full, refill it!
	* if buffer is full, then set doRefill flag to false
	********************************************************************/		
	mediaSourceBuffer.prototype.refill = function(object){
		
        if(object.doRefill == true){
 
        		 	/********************************************************************
							* make sure no overlap in the overlaybuffer , namely mediaSourceBuffer happens. can use object.bufferSize.maxseconds-1 here to make things sure
							********************************************************************/
            if(object.fillState.seconds < object.bufferSize.maxseconds){
        
                console.log("Overlay buffer...");
                console.log(object);
                console.log("Fill state of overlay buffer: " + object.fillState.seconds);
		
								/***************************************************************************  
								* the object passed in is the overlay buffer - _mediaSourceBuffer
								* _dashFetchSegmentAsynchron will enter the adaptation logic and then send http request,
								* when data received, use the callback to refill the overlay buffer with data.
								***************************************************************************/
                _dashFetchSegmentAsynchron(object);	 
		
                object.callEventHandlers();//$$ a handler is called right before refill, the handler is reported of the buffer state. this is used to log debugging info on console, search addEventHandler in dash.js
            }else{
                object.doRefill = false;//&& when buffer full, set the flag to false, and no more _dashFetchSegmentAsynchron(object) and subsequent callback, which calls refill again, will be executed, refilling shut down.
            }
		}
	}
	
	
	// && new mediasourcebuffer object created here and initialized/constructed. 
	//&& basebuffer ---> mediasourcebuffer ---> _mediasourcebuffer  ;  basebuffer.add  --> mediacourcebuffer.prototype.push  init_mediaSourceBuffer--> ?.push
	_mediaSourceBuffer = new mediaSourceBuffer(bufferId);
	_mediaSourceBuffer.isOverlayBuffer = true;
	_mediaSourceBuffer.criticalState.refillwatermark = criticalLevelhigh;
	_mediaSourceBuffer.criticalState.drainwatermark = criticalLevellow;
	_mediaSourceBuffer.bufferSize.maxseconds = buffersize;
  //_mediaSourceBuffer.initBufferArray("seconds",2);       //&& take a look at basebuffer to check what initBufferArray has done.
  _mediaSourceBuffer.initBufferArray("seconds",seglength); //&& the second argument is segment length.
	_mediaSourceBuffer.mediaAPI = mediaAPI;
	_mediaSourceBuffer.videoElement = videoElement;
	_mediaSourceBuffer.lastTime = 0;
	_mediaSourceBuffer.id = bufferId;
  _mediaSourceBuffer.playbackTimePlot = playbackTimePlot;
	_mediaSourceBuffer.registerEventHandler("minimumLevel", _mediaSourceBuffer.signalRefill);  //$$ baseBuffer.prototype.registerEventHandler = function(event, handler)  ;  the event is called when "drain" happens. 
   
		
	
	return _mediaSourceBuffer;
}

