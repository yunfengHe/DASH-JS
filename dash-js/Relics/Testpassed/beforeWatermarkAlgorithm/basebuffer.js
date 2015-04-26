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
	this.fillState.seconds = 0;		// only seconds are used in the time domain, feel free to use fractions
	this.bufferSize = new Object(); // holds the size of the buffer
	this.bufferSize.maxseconds = 0;
	this.bufferSize.maxbytes = 0;
	this.criticalState = new Object(); // used for signaling that we may run out of buffered data
	this.criticalState.seconds = 0;
	this.criticalState.bytes = 0;
	
	this.underRunOccured = false;//$$!!! modified by origianl author 
	
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
	
	for(i = 0; i <= (this.bufferSize.maxseconds / seglength); i++) //&& i<= buffersize make the array buffer (a ring buffer) one unit bigger, I am more comfortable that buffer is a bit bigger than intended. 
	{
		this.buffer.array[i] = new Object();
	}
	
}

//$$ hook the event with certain handler.  !! event is not a reserved keyword; this event register together with callEvent is actually an notifier of observers. all registered observers will be notified, that's why mediasourceBuffer defined a specific eventhandler register- addEventhandler.
//$$ mediasourceBuffer.js intend to have a handler that is not synchronized with basebuffer's general event handlers.
baseBuffer.prototype.registerEventHandler = function(event, handler)
{
	this.eventHandlers.handler[this.eventHandlers.cntHandlers] = new Object();
	this.eventHandlers.handler[this.eventHandlers.cntHandlers].fn = handler;
	this.eventHandlers.handler[this.eventHandlers.cntHandlers++].event = event;
}

baseBuffer.prototype.callEvent = function(event,data)//$$ here is how the eventhandler is called. and callEvent is called(whenever needed) in protype.drain when buffer reaches minimumlevel.
{
	for(i=0;i<this.eventHandlers.handler.length;i++)
	{
		if(this.eventHandlers.handler[i].event == event) this.eventHandlers.handler[i].fn(data);
	}
}


baseBuffer.prototype.drain = function(dimension,amount)// fixed basebuffer, for correctly dealing with critical to underrun buffer level.
{
	//console.log("Draining buffer: " + object);
	if(dimension == "bytes")
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
	
	if(dimension == "seconds")
	{
		
				if(this.fillState.seconds == 0 && this.streamEnded) return -1;
        if(this.fillState.seconds <= this.criticalState.seconds && !this.streamEnded) 
        {
        		//> The fill state is going below critical level. Signal minimumLevel event
            this.callEvent("minimumLevel");//&& refill is called, once called, go to refilling loop until buffer full
            
            
            //> But, if there is data in buffer, return that data if buffer underrun did not occur
            //> If there was buffer underrrun, we need to buffer for minimun buffer level before playing
            //> again
            if (this.fillState.seconds > 0 && this.underRunOccured == false) {
            	
            	this.fillState.seconds -= amount;
                return this.get();
            }
            else if (this.underRunOccured == false){
            	//> Signal Buffer underrun
            	console.log("Buffer underrun!");
            	this.underRunOccured = true;
            }
        }
        else{
      	        	//> Set under run occured false as there is enough buffer filled now
            	this.underRunOccured = false;            	
            	this.fillState.seconds -= amount;
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
//$$  % means  modulo
baseBuffer.prototype.add = function(data)//$$ this.buffer.last would be bigger than this.buffer.first, it's a ring buffer, there shall be a machanism to avoid index collision. this.buffer.last-this.buffer.first shall be smaller than this.buffer.size.
{
	console.log("Adding chunk: " + this.buffer.last % this.buffer.size);
	console.log("Fill state: " + this.fillState.seconds);
	//&& I add the following if condition  say, buffer.size is decided to be 30, buffer.array 's index then is from 0 to 29, this decided by initBufferArray. then 29-0 =29, this is when add shall no longer happen. 
	if ((this.buffer.last - this.buffer.first) < (this.buffer.size))//&& _dashFetch ensures the buffer will not overflow, my code is not necessary, but a good gurantee. if making the margin too small, smaller than the therhold that mediasource decide to refill, then data(frame) is lose since it's not added to buffer.
	{
	this.buffer.array[this.buffer.last++ % this.buffer.size] = data   //$$  first this.buffer.last performs % operation with this.buffer.size, to find the appending position of the buffer(index of the tail of the ring), add data to this array member, then the index this.buffer.last is incremented.
	}
}

baseBuffer.prototype.get = function()//$$ only one unit of array buffer is fetched, one segment (measured in bytes or seconds).
{
	console.log("Getting chunk: " + this.buffer.first % this.buffer.size);//$$$$$$$$$$$$$$$$$$$$$$$$ setp 3
	console.log("Fill state: " + this.fillState.seconds);//$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$ step 3 
	return this.buffer.array[this.buffer.first++ % this.buffer.size]; //$$ returns the oldest data of the ring buffer
}
