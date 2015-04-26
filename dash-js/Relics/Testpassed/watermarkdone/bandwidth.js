/*
 * bandwidth.js
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
 
var maxBandwidth = 8 * 1024 * 1024;        // 4 Mbps

function bandwidth(initial_bps, weight_f, weight_s)//&& first instance is in dash.js, in function DASH_MPD_loaded()
{
	this.identifier = 0;
	this.bps = initial_bps; //&& initial_bps is the bps calculated by mpdLoader, when it first request the mpd file.
	this.weight_f = weight_f;
	this.weight_s = weight_s;
	this.observers = new Array();
	this.observer_num = 0;
}

bandwidth.prototype.addObserver = function (_obj){
	this.observers[this.observer_num++] = _obj;
	
}

bandwidth.prototype.notify = function(){//$$ notify every registered observer
	if(this.observers.length > 0){
		
		for(var i=0;i< this.observers.length; i++)
		{
			this.observers[i].update(this.bps, this.identifier);//$$ this.observer[i] is a loaded/registered object, which would be an fplot object,the update method belongs to the fplot object.
			// in this sense, the subject and the observer is designed to cooperate 
			//the observer: fPlot.prototype.update = function(value, type)
		}
	}
}

//&& update estimated bps by evaluating the last known bps and the lastest measured bps. the weight is 1.1 : 0.9, consider modify the line for calculation.
bandwidth.prototype.calcWeightedBandwidth = function(_bps) { 
	
	// check whether the bitrate has changed dramatically otherwise we won't search a new representation
	console.log("Bitrate measured with last segment: " + _bps + " bps");
	
	this.bps = parseInt(((this.weight_f * this.bps) + (this.weight_s * _bps)) / 2) * 0.9;  // the weights are used to mimic optmistic or pessimistic behavior	//&& (original) 
	// check if we exceed the set bandwidth ..
  if( this.bps > maxBandwidth && maxBandwidth > 0) this.bps = maxBandwidth; //&&(original)  
  
  //&& this.bps = parseInt(_bps) * 0.9; //&& my modified line
    
  console.log("Cummulative bitrate: " + this.bps + " bps");    
    
	// inform the observers
	this.notify();//$$notify happens here in calcWeightedBandwidth, called in DASHttp.js
	return this.bps;
}

bandwidth.prototype.adjustWeights = function(weight_f, weight_s) {

	this.weight_f = weight_f;
	this.weight_s = weight_s;
	
}

bandwidth.prototype.getBps = function () {
	return this.bps;
}