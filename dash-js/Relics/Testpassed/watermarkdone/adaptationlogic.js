/*
 * adaptationlogic.js
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



/* *****************************************************************************************************************
* this constructor finds basic video rate and the index of the representation, set the pointers to initial positions 
*******************************************************************************************************************/
function adaptationLogic(_mpd, video)
{
	this.mpd = _mpd;
	this.identifier = 1;
	var i=0,n=parseInt(_mpd.period[0].group[0].representation[0].bandwidth),m=0;
	//&&The forEach() method executes a provided callback function once per array element. the callback function is invoked with three arguments, here only one is used - _rel
	//&&the array element will be evaluated by the function, here, each element of represenation is passed in to function,_rel
	this.mpd.period[0].group[0].representation.forEach(function(_rel){	
			if(parseInt(_rel.bandwidth) < n)
			{
				m=i;
				n = parseInt(_rel.bandwidth);
			}
			i++;
		
	}); //&& get the lowest bitrate representation. and the index is saved in m.
	console.log("DASH JS prototype [basic] adaptation selecting representation " + m + " with bandwidth: " + n);//$$ representationID m, bandwidth n.
	
	this.representationID = m;//&& this is the index of representation array inside pmpd, not the original mpd file representation id. that id is referred as _mpd.period[0].group[0].representation[m].id
	this.lowestRepresentation = _mpd.period[0].group[0].representation[m];
	this.currentRepresentation = _mpd.period[0].group[0].representation[m];
	if(this.currentRepresentation.baseURL == false) this.currentRepresentation.baseURL = _mpd.baseURL;
	if(this.lowestRepresentation.baseURL == false) this.lowestRepresentation.baseURL = _mpd.baseURL;
	this.currentRepresentation.curSegment = 0; //&& curSegment is the index of the dash video segment. increment everytime a new segment is fetched.  currentRepresentation is the representation of the proper bitrate.
	this.resolutionSwitch = 0;
	this.mediaElement = video;
	
	this.observers = new Array();
	this.observer_num = 0;
}



adaptationLogic.prototype.addObserver = function(_obj){
	this.observers[this.observer_num++] = _obj;
	
}

adaptationLogic.prototype.notify = function() {
	if(this.observers.length > 0){
		
		for(var i=0;i< this.observers.length; i++)
		{
			this.observers[i].update(parseInt(this.currentRepresentation.bandwidth), this.identifier);
		}
	}
}

adaptationLogic.prototype._getNextChunk = function (count){

	return this.currentRepresentation.segmentList.segment[count];
}


/* ****************************************************
* point to initialization segment
******************************************************/
adaptationLogic.prototype.getInitialChunk = function(presentation)
{
	return presentation.initializationSegment;
}


/* ****************************************************
* point to the next segment in the segmentlist.
******************************************************/
adaptationLogic.prototype._getNextChunkP = function (presentation, count){

	return presentation.segmentList.segment[count];
}


function rateBasedAdaptation(bandwidth)
{	
	this.bandwidth = bandwidth;
	console.log("DASH JS using adaptation: Rate Based Adaptation");		
}


/* *********************************************************************************************************
 * init_rateBasedAdaptation is a factory that defines the prototype of the rateBasedAdaptation class 
 * and create a rateBasedAdaptation object, then return it, as all factory do
 **********************************************************************************************************/ 
function init_rateBasedAdaptation(_mpd, video, bandwidth) //&&initial representation selection and index pointing, the video segment index is set to 0, and the first segment, regardless of segment length in second, will be downloaded .
{
	
	//&& further defines the rateBasedAdaptation class, set the prototype, inherit from adaptationLogic and make unique class method, which is the representation switching mechanism based on rate!	
	rateBasedAdaptation.prototype = new adaptationLogic(_mpd, video);		//&& assign the adaptationLogic instance to rateBasedAdaptation class's prototype
	//&& a stand alone function, which is a class method of rateBasedAdaptation. 	
	rateBasedAdaptation.prototype.switchRepresentation = function (){ 			
			// select a matching bandwidth ...
			var i=0, n=parseInt(this.lowestRepresentation.bandwidth), m=this.representationID, _mybps = this.bandwidth.getBps();//&& mind the scope of the variables, this.bandwidth.getBps() give the initially evaluated bps
			
			this.mpd.period[0].group[0].representation.forEach(function(_rel){			//&& forEach element in the representation list, pass the element to the function registered in forEach and execute 
				if(parseInt(_rel.bandwidth) < _mybps && n <= parseInt(_rel.bandwidth))
				{
					console.log("n: " + n + ", m:" + m);
					n = parseInt(_rel.bandwidth);
					m = i;
				}
				i++; 		//$$ try to get a higher rate at first, loop over the entire representation set to find the one that's least smaller than _mybps
		
			}); 
			
			// return the segment	
			if( m != this.representationID) //&& in this case, a different representation rather than the lowest is chosen.
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
					this.representationID = m;
					this.mpd.period[0].group[0].representation[m].curSegment = this.currentRepresentation.curSegment;  //&& this is the index of the dash video segment, related to timeline. increment everytime a new segment is fetched. 
					this.currentRepresentation = this.mpd.period[0].group[0].representation[m];
					if(this.currentRepresentation.baseURL == false) this.currentRepresentation.baseURL = _mpd.baseURL;
					
				}
			}
			this.notify();//$$ when switchRepresentation hapens, the subject would notify the observer, in dashJs, Fplot is notified.
		}
		
	//&& create an instance of the rateBasedApaptation class and returns it
	ratebased = new rateBasedAdaptation(bandwidth); //&& the bandwidth object which contains latest evaluated bandwidth is also passed into this object constructor
	
	return ratebased;
}



//&& write another class that inherit adaptationLogic but introduce new representation switch method, say, to take buffer level into account.!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!1