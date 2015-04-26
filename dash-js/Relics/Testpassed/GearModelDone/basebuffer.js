/*
 * basebuffer.js
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
 

// base class for buffer implementations
//$$ a basic ring buffer system. this.buffer.last and this.buffer.first will forever increaments, and the modulo with this.buffer.size is used to indexing the buffer array. the buffer array is this.buffer.size long.

function baseBuffer()
{

	this.fillState = new Object();	// will hold the fill state of the buffer, in time and in bytes
	this.fillState.bytes = 0;
	this.fillState.seconds = 0;		// only seconds are used in the time domain, feel free to use fractions, //&& fillstate.seconds is incremented at mediacourcebuffer.js push method.
	this.bufferSize = new Object(); // holds the size of the buffer
	this.bufferSize.maxseconds = 0;
	this.bufferSize.maxbytes = 0;
	this.criticalState = new Object(); // used for signaling that we may run out of buffered data
	this.criticalState.refillwatermark = 0; //&& this is the refilling watermark. the high watermark
	this.criticalState.drainwatermark = 0;
	this.criticalState.bytes = 0;
	
	//this.underRunOccured = false; //modified by origianl author
	this.underRunOccured = true; //initially set to true, so no playback until lowwatermark
	
	this.eventHandlers = new Object();
	this.eventHandlers.handler = new Array();
	this.eventHandlers.cntHandlers = 0;
	
	
	// buffer array, ring buffer ...
	this.buffer = new Object;
	this.buffer.array = new Array(); //$$ the actual buffer array that contains data array[i] contains data segment
	this.buffer.first = 0;
	this.buffer.last = 0;
	this.buffer.size = 0;//$$ say the size is 100, then the values of buffer.first and buffer.last shall be between 0 - 100
	this.streamEnded = false;
	this.isOverlayBuffer = false;		// Overlay buffers are only used to mimic the behaviour of an HTML element or a video player where we have no access to the buffer of the unit
}

baseBuffer.prototype.initBufferArray = function(dimension,seglength) //$$ maxseconds decides the size of the buffer,(index range of the array)
{
	this.buffer.size = this.bufferSize.maxseconds / seglength;
	console.log("Buffer size: " + this.buffer.size);
	
	//&& i<= buffersize make the array buffer (a ring buffer) one unit bigger, I am more comfortable that buffer is a bit bigger than intended. 
	//&& !!making it one unit bigger seems ok, but I cannot index that one unit, if I do, then the modulo value must also change, otherwise, the ring index will go wrong!!
	for(i = 0; i < (this.bufferSize.maxseconds / seglength); i++) 
	{
		this.buffer.array[i] = new Object();
	}
	
}


/* *****************************************************************************************************************
* hook the event with certain handler.  !! event is not a reserved keyword; 
* this event register together with callEvent is actually an notifier of observers.
* all registered observers will be notified, that's why mediasourceBuffer defined a specific eventhandler register- addEventhandler.
* mediasourceBuffer.js intend to have a handler that is not synchronized with basebuffer's general event handlers.
*******************************************************************************************************************/
baseBuffer.prototype.registerEventHandler = function(event, handler)
{
	this.eventHandlers.handler[this.eventHandlers.cntHandlers] = new Object();
	this.eventHandlers.handler[this.eventHandlers.cntHandlers].fn = handler;
	this.eventHandlers.handler[this.eventHandlers.cntHandlers++].event = event;
}

/* *****************************************************************************************************************
* this event handler's notifier is named as callEvent. refill is the handler registered, for refilling buffer level
*******************************************************************************************************************/
baseBuffer.prototype.callEvent = function(event,data)//$$ here is how the eventhandler is called. and callEvent is called(whenever needed) in protype.drain when buffer reaches minimumlevel.
{
	for(i=0;i<this.eventHandlers.handler.length;i++)
	{
		if(this.eventHandlers.handler[i].event == event) this.eventHandlers.handler[i].fn(data);
	}
}



/*********************************************************************************************
* drains the ring buffer by calling the get method. before draining, check bufferlevel and
* decide if to call the registered listener, which is a refill function. 
*********************************************************************************************/
baseBuffer.prototype.drain = function(dimension,amount) //BUGFIX DONE: fixed basebuffer, for correctly dealing with critical to underrun buffer level.
{
	//console.log("Draining buffer: " + object);
	if(dimension == "bytes") //&& never mind here, we do not use bytes 
	{
		if(this.fillState.bytes == 0 && this.streamEnded) return -1; //$$ fillstate shows how much data is still in the overlay buffer.
		if(this.fillState.bytes <= this.criticalState.bytes && !this.streamEnded)
    		{
            this.callEvent("minimumLevel");//&& refill is called, once called, go to refilling loop until buffer full
						
						if(this.fillState.bytes > 0 && this.underRunOccured == false){
							this.fillState.bytes -= amount;
							return this.get();							
							}
							else if (this.underRunOccured == false){
								console.log("Buffer underrun!");
            		this.underRunOccured = true;								
							}            
        }
       	else{       		
            this.underRunOccured = false;       		
       			this.fillState.bytes -= amount;
            return this.get();       		
       	}
    }
	
	if(dimension == "seconds") //&& if I want to change playback watermark to lower than refilling watermark, modify the else part.
	{
		
				if(this.fillState.seconds == 0 && this.streamEnded) return -1;
        if(this.fillState.seconds <= this.criticalState.refillwatermark && !this.streamEnded) //&& the criticalState here is the refilling watermark as well as draining watermark
        {
        		//> The fill state is going below critical level. Signal minimumLevel event
            this.callEvent("minimumLevel");//&& refill is called, once called, go to refilling loop until buffer full
            
           if ((this.underRunOccured == true) && (this.fillState.seconds >= this.criticalState.drainwatermark)){
            	console.log("Buffer level at "+ this.fillState.seconds +", playback starts!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
            	this.underRunOccured = false;	
          }
            
            
            //> But, if there is data in buffer, return that data if buffer underrun did not occur
            //> If there was buffer underrun, we need to buffer for minimun buffer level before playing
            //> again
            if (this.fillState.seconds > 0 && this.underRunOccured == false) {
            	
            	this.fillState.seconds -= amount;
                return this.get();
            }
            else if (this.underRunOccured == false){ //&& when fillstate is 0, reach bottom or initial drain, set it to true, so that overlay buffer don't get drained and media source api don't get fed untill we set the flag to true and watermark level.
            	//> Signal Buffer underrun
            	console.log("Buffer underrun!");
            	this.underRunOccured = true; //&& when initial drain, or buffer underRun while playing, set flag to true. when fillstate is zero, set flag to true, in these cases, 0 is returned.
            }
        }
        else{      	      	      
            	// this.underRunOccured = false;  //> Set under run occured false as there is enough buffer filled now      	
            	this.fillState.seconds -= amount; //&& just drain when fillState is higher than the high water mark. 
              return this.get();                        
        }
   }	    
   return 0;
}

baseBuffer.prototype.state = function(dimension) {	//return buffer fill level in percent

	if(dimension == "bytes")
	{
	
		return (this.fillState.bytes / this.bufferSize.maxbytes)*100;
		
	}
	
	if(dimension == "seconds")
	{
		
		return (this.fillState.seconds / this.bufferSize.maxseconds)*100;
	}
	
	return -1;
	
}

/*******************************************************************************************************
*  % means  modulo: what is left after division
* THIS FUNCTION IS IMPORTANT, AND SHALL BE BUG FREE
* this.buffer.last would be bigger than this.buffer.first, it's a ring buffer,
* there shall be a machanism to avoid index collision. 
* this.buffer.last-this.buffer.first shall be smaller than this.buffer.size.
*******************************************************************************************************/
baseBuffer.prototype.add = function(data)
{
	console.log("Adding chunk: " + this.buffer.last % this.buffer.size);
	console.log("Fill state: " + this.fillState.seconds);
	/*********************************************************************************************** 
	* I add the following if condition  say, buffer.size is decided to be 30,
	* buffer.array 's index then is from 0 to 29, this decided by initBufferArray. then 29-0 =29, this is when add shall no longer happen. 
	* mediaSourceBuffer.prototype.refill ensures the buffer will not overflow, my code is not necessary, but a good gurantee. 
	* keep in mind that this if condition prevent buffer overlap, but may cause data be discarded!
	* add a return value to inform data discarded! when add successfull, return 0, when failure, return -1
	***********************************************************************************************/
	if ((this.buffer.last - this.buffer.first) < (this.buffer.size)) //++  
	{
		 //$$  first this.buffer.last performs % operation with this.buffer.size, to find the appending position of the buffer(index of the tail of the ring), add data to this array member, then the index this.buffer.last is incremented.
		 this.buffer.array[this.buffer.last++ % this.buffer.size] = data //&&this.buffer.last points to an empty slot, not written yet! still free to be written!! after write, index++
		 return 0; //&&signal the data is pushed into ring buffer successfully //++
	}else
	return -1; //&& indicating that data has been discarded. //++
}



baseBuffer.prototype.get = function()//$$ only one unit of array buffer is fetched, one segment (measured in bytes or seconds).
{
	console.log("Getting chunk: " + this.buffer.first % this.buffer.size);//$$ setp 3
	console.log("Fill state: " + this.fillState.seconds);//$$ step 3 
	return this.buffer.array[this.buffer.first++ % this.buffer.size]; //$$ returns the oldest data of the ring buffer
}
