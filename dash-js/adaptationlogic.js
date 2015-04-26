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



/* *******************************************************************************************************************************
* this constructor finds basic video rate and the index of the representation, set the pointers to initial positions             *
* Basic AdaptationLogic Class                 CONSTRUCTOR AND PROTOTYPE  																												 *
* 																																																															 *
*********************************************************************************************************************************/ 
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
	
	this.RPM = new Array();
	this.RPMindex = 0;
	this.RPMtotal = 0;
	this.gearRatio = new Array();	//++
	this.gearRatioIndex = 0;
	this.averageGearRatio = 0;  //++
	this.ratioTotal = 0;         //++
	this.gearPosition = 1;	
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


/* ****************************************************
* calculate the average ratio of adjacent representations' bitrate.
* be cautious about what 'this' points to
* my added prototype
******************************************************/
adaptationLogic.prototype.calculateGearRatio = function (obj){
	this.mpd.period[0].group[0].representation.forEach(function(_rel){		
		//&& from this point the pointer 'this' changes!!! no longer able to access adaptationLogic's variables!!		 
		obj.RPM[obj.RPMindex++] = Number(parseInt(_rel.bandwidth));		
	});
	
	for(var j=1, len = obj.RPM.length ; j< len ; j++){
		obj.gearRatio[obj.gearRatioIndex++] = (obj.RPM[j]/obj.RPM[j-1]);	
	}
						
	for(var j=0, len = obj.gearRatio.length ;j<len ; j++){
		obj.ratioTotal += obj.gearRatio[j] ;			
	}
		
	obj.averageGearRatio = obj.ratioTotal / obj.gearRatio.length ;	    
}

/* ****************************************************
* calculate the average ratio of adjacent representations' bitrate.
* be cautious about what 'this' points to
* my added prototype, exactly the same function as
* calculateGearRatio, I only test the push method of Array.
******************************************************/
adaptationLogic.prototype.calculateGearRatioPUSH = function (obj){
	this.mpd.period[0].group[0].representation.forEach(function(_rel){		
		//&& from this point the pointer 'this' changes!!! no longer able to access adaptationLogic's variables!!		 
		obj.RPM.push( Number(parseInt(_rel.bandwidth)));		
	});
	
	for(var j=1, len = obj.RPM.length;j<len ; j++){
		obj.gearRatio.push((obj.RPM[j]/obj.RPM[j-1])); 	
	}
						
	for(var j=0, len = obj.gearRatio.length;j<len ; j++){
		obj.ratioTotal += obj.gearRatio[j] ;			
	}
		
	obj.averageGearRatio = obj.ratioTotal / obj.gearRatio.length ;	    
}



/* *******************************************************************************************************************************
* Adaptation Logic No.1, the original AL																	CONSTRUCTOR AND FACTORY 				                       *
* init_rateBasedAdaptation is a factory that defines the prototype of the rateBasedAdaptation class 			                       *
* and create a rateBasedAdaptation object, then return it, as all factory do																				             *
* 																																																															 *
* 																																																															 *
* 																																																															 *
* 																																																															 *
* 																																																															 *
*********************************************************************************************************************************/ 

function rateBasedAdaptation(bandwidth) //&& the constructor, yes
{	
	this.bandwidth = bandwidth;
	console.log("DASH JS using adaptation: Rate Based Adaptation");		
}


function init_rateBasedAdaptation(_mpd, video, bandwidth) //&&initial representation selection and index pointing, the video segment index is set to 0, and the first segment, regardless of segment length in second, will be downloaded .
{
	
	//&& further defines the rateBasedAdaptation class, set the prototype, inherit from adaptationLogic and make unique class method, which is the representation switching mechanism based on rate!	
	rateBasedAdaptation.prototype = new adaptationLogic(_mpd, video);		//&& assign the adaptationLogic instance to rateBasedAdaptation class's prototype
	
	
	//&& a stand alone function, which is a class method of rateBasedAdaptation. 	
	rateBasedAdaptation.prototype.switchRepresentation = function (){	
			// select a matching bandwidth ...
			var i=0, n=parseInt(this.lowestRepresentation.bandwidth), m=this.representationID, _mybps = this.bandwidth.getBps();//&& mind the scope of the variables, this.bandwidth.getBps() returns this.bps of the bandwidth object			
			this.mpd.period[0].group[0].representation.forEach(function(_rel){			//&& forEach element in the representation list, pass the element to the function registered in forEach and execute 
				if(parseInt(_rel.bandwidth) < _mybps && n <= parseInt(_rel.bandwidth))
				{
					console.log("n: " + n + ", m:" + m);
					n = parseInt(_rel.bandwidth);
					m = i;//&& buggy!!!!!!!!!!!!!!!!!!!!!!!!!! when the lowest rep is bigger than bw, what happens? nothing, the representation stays at previous level, fixed in modified version: rateBasedAdaptationM
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




/* *******************************************************************************************************************************
* Adaptation Logic No.6, RateWatermarkAdaptationGear_accelaration	CONSTRUCTOR AND FACTORY   																		 *
* Another class that inherit adaptationLogic but introduce new representation switch method,																		 *
* say, to take buffer level into account.																																												 *
* Fatal Bug of lowest rep > bw fixed: the bug was, when lowest rep rate > bw, no decrease in representation											 *
* uneccesary condition removed, the buffer range related with a gear position is unecessary. 																		 *
* to be implement: buffer change rate calculation instead of rough judgement on buffer shrinking (implement in alg7)						 *
* 																																																															 *
* 																																																															 *
*********************************************************************************************************************************/

function RateWatermarkAdaptationGearA(bandwidth,overlaybuffer) //&& the constructor 
{	
	this.overlaybuffer = overlaybuffer;
	this.bandwidth = bandwidth;
	console.log("DASH JS using adaptation: RateWatermarkAdaptationGearA");		
	this.bufferlastlevel = 0;	
	this.bufferlastAbsolutelevel = 0;
	this.flag = 0; //&& turn flag to 0, representation selection based on bw is performed, turn it to 1, the switching would be performed according to buffer draining rate. 
}


/* ****************************************************************
* the factory of RateWatermarkAdaptation object; prototype as well
******************************************************************/ 
function init_RateWatermarkAdaptationGearA(_mpd, video, bandwidth, overlaybuffer) 
{

	RateWatermarkAdaptationGearA.prototype = new adaptationLogic(_mpd, video);	
	//&& Keep in mind that _mps is modest with a factor of 0.9
	
  
	RateWatermarkAdaptationGearA.prototype.switchRepresentation = function (){ 
		bufferfilllevel = this.overlaybuffer.getFillLevel();	//&& take the buffer level and log it after the switching logic is executed	
		bufferAbsolutelevel = this.overlaybuffer.getAbsoluteFillLevel();
			
		// select a matching bandwidth ... //&& everytime from the lowestRepresentation
			
		var myindex = -1, n=parseInt(this.lowestRepresentation.bandwidth), m=this.representationID, _mybps = this.bandwidth.getBps();//&& mind the scope of the variables, this.bandwidth.getBps() returns this.bps of the bandwidth object  //--

		if (this.gearPosition == 1 ){
			if(this.flag == 0 ){ //&& (bufferfilllevel-this.bufferlastlevel)<= 0 only allow the buffer to go up, if not switching!! since we disabled the switching and use lowest rep instead, we do not to judge on this condition any more.
				m = 0;	//&& at this level, just use the lowest representation!!
				this.flag = 1;					
			}	 
			if (bufferfilllevel >= 25){this.gearPosition = 2;this.flag = 0;}							
		}else	  
		if (this.gearPosition == 2 ){
			if((bufferAbsolutelevel-this.bufferlastAbsolutelevel)<0 ||this.flag == 0 ){ //&&(bufferfilllevel-this.bufferlastlevel)<0 , then we are losing the buffer !! not allowed
						console.log("the bufferlevel change is" + (bufferAbsolutelevel-this.bufferlastAbsolutelevel)+" @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");					
				this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if((parseInt(_rel.bandwidth) < (_mybps/(1.15*this.averageGearRatio))) && n <= parseInt(_rel.bandwidth)) //&& what if the lowest _rel.bandwidth is larger than the compared bandwidth?? original code is buggy!
				{	 						
					n = parseInt(_rel.bandwidth);	
					myindex++;									 					
				}												
				},RWbased);
				if(myindex <0)m = 0;else m = myindex;				
				this.flag = 1;					
			}	 
			if (bufferfilllevel >= 40){this.gearPosition = 3;this.flag = 0;}
			if (bufferfilllevel <= 15){this.gearPosition = 1; this.flag = 0;} 							
		}else
		if(this.gearPosition == 3 ){
			if((bufferAbsolutelevel-this.bufferlastAbsolutelevel)< 0  || this.flag == 0 ){ //&&  discard these options!! '|| Math.abs(bufferfilllevel-this.bufferlastlevel)> 5' 'Math.abs(bufferAbsolutelevel-this.bufferlastAbsolutelevel) != 0' 'Math.abs(bufferAbsolutelevel-this.bufferlastAbsolutelevel) > 2'
						console.log("the bufferlevel change is" + (bufferAbsolutelevel-this.bufferlastAbsolutelevel)+" @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");		
				this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if((parseInt(_rel.bandwidth) < (_mybps*0.95)) && n <= parseInt(_rel.bandwidth)) 
				{	 						
					n = parseInt(_rel.bandwidth);
					myindex++;									 					
				}												
				},RWbased);
				if(myindex <0)m = 0;else m = myindex;		
				this.flag = 1;					
			}	
			if (bufferfilllevel >= 75){this.gearPosition = 4; this.flag = 0;} 	
			if (bufferfilllevel <= 30){this.gearPosition = 2; this.flag = 0;} 
		}else
		if(this.gearPosition == 4 ){
			if((bufferAbsolutelevel-this.bufferlastAbsolutelevel)<= -2  || this.flag == 0){ //&& discard this also 'Math.abs(bufferAbsolutelevel-this.bufferlastAbsolutelevel) > seglength'{
						console.log("the bufferlevel change is" + (bufferAbsolutelevel-this.bufferlastAbsolutelevel) +" @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");	
				this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if((parseInt(_rel.bandwidth) < (_mybps*1.15*this.averageGearRatio)) && n <= parseInt(_rel.bandwidth)) 
				{	 						
					n = parseInt(_rel.bandwidth);
					myindex++;									 					
				}												
				},RWbased);
				if(myindex <0)m = 0;else m = myindex;
				this.flag = 1;						
			}
			if (bufferfilllevel >= 90){this.gearPosition = 5; this.flag = 0;} 	
			if (bufferfilllevel <= 55){this.gearPosition = 3; this.flag = 0;} 
		}else
		if(this.gearPosition == 5 ){
			if((bufferAbsolutelevel-this.bufferlastAbsolutelevel)<= -4 || this.flag == 0){ //&& '(bufferfilllevel-this.bufferlastlevel)<=-2' might be better! this only take effect in 1s segment case, for 4s or 2s, it's just the same as <0; however, it beat the purpose of 1s segment!!
						console.log("the bufferlevel change is" + (bufferAbsolutelevel-this.bufferlastAbsolutelevel) +" @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");
				this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if((parseInt(_rel.bandwidth) < (_mybps*1.15*this.averageGearRatio*this.averageGearRatio)) && n <= parseInt(_rel.bandwidth)) 
				{	 						
					n = parseInt(_rel.bandwidth);
					myindex++;									 					
				}												
				},RWbased);
				if(myindex <0)m = 0;else m = myindex;	 	
				this.flag = 1;					
			} 	
			if (bufferfilllevel <= 75){this.gearPosition = 4; this.flag = 0;} 
		}
		
		this.bufferlastlevel = bufferfilllevel;
		this.bufferlastAbsolutelevel = bufferAbsolutelevel;
	
			
			console.log("n: " + n + ", m:" + m +"; and the estimated bps is "+ _mybps);			
			console.log("bufferlevel is "+ bufferfilllevel+ " AND the gearposition is "+ this.gearPosition);
			console.log("representation with bitrate of" + RWbased.mpd.period[0].group[0].representation[m].bandwidth + " is chosen");
			Gearstr = Gearstr + (new Date().getTime()/1000).toFixed(2) + "\t" + this.gearPosition  + "\n";
			
			/*****************************************************************************
			* !! BUG
			* use else if to make exclusive desicion each time eveluating in the forEach loop!!;
			* use 'if' only could cause double increment of m, might access undefined element!!
			* consider bufferfill level 67%, then i is incremented twice!! 
			*****************************************************************************/
			
			// return the segment	
			if( m != this.representationID) //&& in this case, a different representation than the previous one is chosen.
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
					console.log("n: " + n + ", m:" + m); //++
					if(this.currentRepresentation.baseURL == false) this.currentRepresentation.baseURL = _mpd.baseURL;
					
				}
			}
			this.notify();//$$ when switchRepresentation hapens, the subject would notify the observer, in dashJs, Fplot is notified.
		}

  /* ****************************************************************
  * create an instance of the rateBasedApaptation class and returns it
  * the bandwidth object which contains latest evaluated bandwidth is 
  * also passed into this object constructor	
  ******************************************************************/ 	
	RWbased = new RateWatermarkAdaptationGearA(bandwidth, overlaybuffer);
	
  /* ****************************************************************
  * perform gear ratio calculation!
  * then log the representation bitrates and gear raitos
  ******************************************************************/ 	
	console.log('I am here right before ratio calculation');
	RWbased.calculateGearRatioPUSH(RWbased); // ++ 
	//++ RWbased.calculateGearRatio(RWbased); //&& it has the same function as RWbased.calculateGearRatioPUSH !! I just test the array's push method
	
	console.log ('There are '+ RWbased.RPM.length + ' representations');
  for (var i= 0; i < RWbased.RPM.length; i++){
		console.log ('Representation '+ i +' has a bit rate of ' + RWbased.RPM[i]);
	}	
	
	for (var i= 0; i < RWbased.gearRatio.length; i++){
		console.log ('the gearRatio '+ i +' is ' + RWbased.gearRatio[i]);
	}	
	console.log ('the average gearRatio is ' + RWbased.averageGearRatio);	
	
	return RWbased;
}







/* *******************************************************************************************************************************
* Adaptation Logic No.7, RateWatermarkAdaptationGear_accelaration	CONSTRUCTOR AND FACTORY   																		 *
* Another class that inherit adaptationLogic but introduce new representation switch method,																		 *
* say, to take buffer level into account.																																												 *
* Fatal Bug of lowest rep > bw fixed: the bug was, when lowest rep rate > bw, no decrease in representation											 *
* uneccesary condition removed, the buffer range related with a gear position is unecessary. 																		 *
* implementing: buffer change rate calculation instead of rough judgement on buffer shrinking (implement in alg7)		    				 *
* Take a time reference before takin the buffer level, save it in a class variable, or just save the _mbps and compare it with   *
*	previous one                                                                                                                   *
* baseline bandwidth estimation already take care of weighting historical bandwidth, no need to do more													 *
*********************************************************************************************************************************/

function RateWatermarkAdaptationGearA1(bandwidth,overlaybuffer) //&& the constructor 
{	
	this.overlaybuffer = overlaybuffer;
	this.bandwidth = bandwidth;
	console.log("DASH JS using adaptation: RateWatermarkAdaptationGearA");		
	//this.bufferlastlevel = 0;	
	this.bufferlastAbsolutelevel = 0;
	this.buffercounter = 3;
	this.checkCycle = 3; //&& when initiating, make this.buffercounter == this.checkCycle
	this.flag = 0; //&& turn flag to 0, representation selection based on bw is performed, turn it to 1, the switching would be performed according to buffer draining rate.	
}


/* ****************************************************************
* the factory of RateWatermarkAdaptation object; prototype as well
******************************************************************/ 
function init_RateWatermarkAdaptationGearA1(_mpd, video, bandwidth, overlaybuffer) 
{

	RateWatermarkAdaptationGearA1.prototype = new adaptationLogic(_mpd, video);	
	//&& Keep in mind that _mps is modest with a factor of 0.9
	
  
	RateWatermarkAdaptationGearA1.prototype.switchRepresentation = function (){ 

		bufferfilllevel = this.overlaybuffer.getFillLevel();	//&& take the buffer level and log it after the switching logic is executed	
		bufferAbsolutelevel = this.overlaybuffer.getAbsoluteFillLevel();
			
		// select a matching bandwidth ... //&& everytime from the lowestRepresentation
			
		var myindex = -1, n=parseInt(this.lowestRepresentation.bandwidth), m=this.representationID, _mybps = this.bandwidth.getBps();//&& mind the scope of the variables, this.bandwidth.getBps() returns this.bps of the bandwidth object  //--


		if (this.gearPosition == 1 ){
			if(this.flag == 0 ){ 		
				this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if((parseInt(_rel.bandwidth) < (_mybps/(1.10*this.averageGearRatio*this.averageGearRatio))) && n <= parseInt(_rel.bandwidth)) //&& what if the lowest _rel.bandwidth is larger than the compared bandwidth?? original code is buggy!
				{	 						
					n = parseInt(_rel.bandwidth);	
					myindex++;									 					
				}												
				},RWbased);
				if(myindex <0)m = 0;else m = myindex;				
				this.flag = 1;	
				this.buffercounter = this.checkCycle;			
			}else
			if(this.flag == 1){
				if((this.buffercounter == this.checkCycle) && (bufferAbsolutelevel-this.bufferlastAbsolutelevel) < 0){//&&(bufferfilllevel-this.bufferlastlevel)<0 , then we are losing the buffer !! not allowed		
					console.log("the bufferlevel change is" + (bufferAbsolutelevel-this.bufferlastAbsolutelevel) +" @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");	
					m = 0;
				}
			}		 
			if (bufferfilllevel >= 25){this.gearPosition = 2;this.flag = 0;}							
		}else	  
		if (this.gearPosition == 2 ){
			if(this.flag == 0 ){ 		
				this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if((parseInt(_rel.bandwidth) < (_mybps/(1.15*this.averageGearRatio))) && n <= parseInt(_rel.bandwidth)) //&& what if the lowest _rel.bandwidth is larger than the compared bandwidth?? original code is buggy!
				{	 						
					n = parseInt(_rel.bandwidth);	
					myindex++;									 					
				}												
				},RWbased);
				if(myindex <0)m = 0;else m = myindex;				
				this.flag = 1;
				this.buffercounter = this.checkCycle;					
			}else
			if(this.flag == 1){
				if((this.buffercounter == this.checkCycle) && (bufferAbsolutelevel-this.bufferlastAbsolutelevel) < -1*seglength){//&&(bufferfilllevel-this.bufferlastlevel)<0 , then we are losing the buffer !! not allowed		
					console.log("the bufferlevel change is" + (bufferAbsolutelevel-this.bufferlastAbsolutelevel) +" @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");	
				this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if((parseInt(_rel.bandwidth) < (_mybps/(1.15*this.averageGearRatio))) && n <= parseInt(_rel.bandwidth)) //&& what if the lowest _rel.bandwidth is larger than the compared bandwidth?? original code is buggy!
				{	 						
					n = parseInt(_rel.bandwidth);	
					myindex++;									 					
				}												
				},RWbased);
				if(myindex <0)m = 0;else m = myindex;
				}
			}	 
			if (bufferfilllevel >= 40){this.gearPosition = 3;this.flag = 0;}
			if (bufferfilllevel <= 15){this.gearPosition = 1; this.flag = 0;} 							
		}else
		if(this.gearPosition == 3 ){
			if(this.flag == 0 ){ //&&  discard these options!! '|| Math.abs(bufferfilllevel-this.bufferlastlevel)> 5' 'Math.abs(bufferAbsolutelevel-this.bufferlastAbsolutelevel) != 0' 'Math.abs(bufferAbsolutelevel-this.bufferlastAbsolutelevel) > 2'
				this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if((parseInt(_rel.bandwidth) < _mybps) && n <= parseInt(_rel.bandwidth)) 
				{	 						
					n = parseInt(_rel.bandwidth);
					myindex++;									 					
				}												
				},RWbased);
				if(myindex <0)m = 0;else m = myindex;		
				this.flag = 1;	
				this.buffercounter = this.checkCycle;				
			}else
			if(this.flag == 1){
				if((this.buffercounter == this.checkCycle) && (bufferAbsolutelevel-this.bufferlastAbsolutelevel) < -1*(this.checkCycle-1)*seglength){ //&& -2*seglength is somehow neccessary, as one push to mediasource api would drain one segment
						console.log("the bufferlevel change is" + (bufferAbsolutelevel-this.bufferlastAbsolutelevel) +" @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");	
				this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if((parseInt(_rel.bandwidth) < _mybps) && n <= parseInt(_rel.bandwidth)) 
				{	 						
					n = parseInt(_rel.bandwidth);
					myindex++;									 					
				}												
				},RWbased);
				if(myindex <0)m = 0;else m = myindex;
				}else
				if((this.buffercounter == this.checkCycle) && (bufferAbsolutelevel-this.bufferlastAbsolutelevel) > (this.checkCycle-1)*seglength){//&& >3*seglength is not possible as the download is consecutive and in series, not parallel. 
					console.log("the bufferlevel change is" + (bufferAbsolutelevel-this.bufferlastAbsolutelevel) +" @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");	
				this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if((parseInt(_rel.bandwidth) < _mybps) && n <= parseInt(_rel.bandwidth)) 
				{	 						
					n = parseInt(_rel.bandwidth);
					myindex++;									 					
				}												
				},RWbased);
				if(myindex <0)m = 0;else m = myindex;				
				}
			}		
			if (bufferfilllevel >= 75){this.gearPosition = 4; this.flag = 0;} 	
			if (bufferfilllevel <= 30){this.gearPosition = 2; this.flag = 0;} 
		}else
		if(this.gearPosition == 4 ){
			if(this.flag == 0){ //&& discard this also 'Math.abs(bufferAbsolutelevel-this.bufferlastAbsolutelevel) > seglength				
				this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if((parseInt(_rel.bandwidth) < (_mybps*1.15*this.averageGearRatio)) && n <= parseInt(_rel.bandwidth)) 
				{	 						
					n = parseInt(_rel.bandwidth);
					myindex++;									 					
				}												
				},RWbased);
				if(myindex <0)m = 0;else m = myindex;
				this.flag = 1;
				this.buffercounter = this.checkCycle;						
			}else
			if(this.flag == 1){
				if((this.buffercounter == this.checkCycle) && ((bufferAbsolutelevel-this.bufferlastAbsolutelevel) < -1*(this.checkCycle+1)*seglength)){ //&& at higher gear level, the buffer is supposed to shrink, tolerate higher shrinking rate
						console.log("the bufferlevel change is" + (bufferAbsolutelevel-this.bufferlastAbsolutelevel) +" @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");	
				this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if((parseInt(_rel.bandwidth) < (_mybps*1.15*this.averageGearRatio)) && n <= parseInt(_rel.bandwidth)) 
				{	 						
					n = parseInt(_rel.bandwidth);
					myindex++;									 					
				}												
				},RWbased);
				if(myindex <0)m = 0;else m = myindex;
				}else
				if((this.buffercounter == this.checkCycle) && (bufferAbsolutelevel-this.bufferlastAbsolutelevel) > (this.checkCycle-1)*seglength){//&& >3*seglength is not possible as the download is consecutive and in series, not parallel. 
					console.log("the bufferlevel change is" + (bufferAbsolutelevel-this.bufferlastAbsolutelevel) +" @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");	
				this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if((parseInt(_rel.bandwidth) < (_mybps*1.15*this.averageGearRatio)) && n <= parseInt(_rel.bandwidth)) 
				{	 						
					n = parseInt(_rel.bandwidth);
					myindex++;									 					
				}												
				},RWbased);
				if(myindex <0)m = 0;else m = myindex;				
				}
			}	
			if (bufferfilllevel <= 55){this.gearPosition = 3; this.flag = 0;} 
		}
		
		  //this.bufferlastlevel = bufferfilllevel;	
		if(this.buffercounter == this.checkCycle){
			this.buffercounter = 0;
		 	this.bufferlastAbsolutelevel = bufferAbsolutelevel;		  			  	
		}
		this.buffercounter += 1;
			
			console.log("n: " + n + ", m:" + m +"; and the estimated bps is "+ _mybps);			
			console.log("bufferlevel is "+ bufferfilllevel+ " AND the gearposition is "+ this.gearPosition);
			console.log("representation with bitrate of" + RWbased.mpd.period[0].group[0].representation[m].bandwidth + " is chosen");
			Gearstr = Gearstr + (new Date().getTime()/1000).toFixed(2) + "\t" + this.gearPosition  + "\n";
			
			/*****************************************************************************
			* !! BUG
			* use else if to make exclusive desicion each time eveluating in the forEach loop!!;
			* use 'if' only could cause double increment of m, might access undefined element!!
			* consider bufferfill level 67%, then i is incremented twice!! 
			*****************************************************************************/
			
			// return the segment	
			if( m != this.representationID) //&& in this case, a different representation than the previous one is chosen.
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
					SwitchCount += 1;					
					console.log("DASH rate based adaptation: SWITCHING STREAM TO BITRATE = " + this.mpd.period[0].group[0].representation[m].bandwidth);					
					this.representationID = m;
					this.mpd.period[0].group[0].representation[m].curSegment = this.currentRepresentation.curSegment;  //&& this is the index of the dash video segment, related to timeline. increment everytime a new segment is fetched. 
					this.currentRepresentation = this.mpd.period[0].group[0].representation[m];
					console.log("n: " + n + ", m:" + m); //++
					if(this.currentRepresentation.baseURL == false) this.currentRepresentation.baseURL = _mpd.baseURL;
					
				}
			}
			this.notify();//$$ when switchRepresentation hapens, the subject would notify the observer, in dashJs, Fplot is notified.
		}

  /* ****************************************************************
  * create an instance of the rateBasedApaptation class and returns it
  * the bandwidth object which contains latest evaluated bandwidth is 
  * also passed into this object constructor	
  ******************************************************************/ 	
	RWbased = new RateWatermarkAdaptationGearA1(bandwidth, overlaybuffer);
	
  /* ****************************************************************
  * perform gear ratio calculation!
  * then log the representation bitrates and gear raitos
  ******************************************************************/ 	
	console.log('I am here right before ratio calculation');
	RWbased.calculateGearRatioPUSH(RWbased); // ++ 
	//++ RWbased.calculateGearRatio(RWbased); //&& it has the same function as RWbased.calculateGearRatioPUSH !! I just test the array's push method
	
	console.log ('There are '+ RWbased.RPM.length + ' representations');
  for (var i= 0; i < RWbased.RPM.length; i++){
		console.log ('Representation '+ i +' has a bit rate of ' + RWbased.RPM[i]);
	}	
	
	for (var i= 0; i < RWbased.gearRatio.length; i++){
		console.log ('the gearRatio '+ i +' is ' + RWbased.gearRatio[i]);
	}	
	console.log ('the average gearRatio is ' + RWbased.averageGearRatio);	
	
	return RWbased;
}






/* *******************************************************************************************************************************
* Adaptation Logic No.1.1, the original AL	_MODED for experiment!!!!!!!!!!					CONSTRUCTOR AND FACTORY 			               *
* init_rateBasedAdaptation is a factory that defines the prototype of the rateBasedAdaptation class 			                       *
* and create a rateBasedAdaptation object, then return it, as all factory do																				             *
* 																																																															 *
* 																																																															 *
* 																																																															 *
* 																																																															 *
* 																																																															 *
*********************************************************************************************************************************/ 

function rateBasedAdaptationM(bandwidth, overlaybuffer) //&& the constructor, yes
{	
	this.overlaybuffer = overlaybuffer;
	this.bandwidth = bandwidth;
	console.log("DASH JS using adaptation: Rate Based Adaptation");		
}


function init_rateBasedAdaptationM(_mpd, video, bandwidth, overlaybuffer) //&&initial representation selection and index pointing, the video segment index is set to 0, and the first segment, regardless of segment length in second, will be downloaded .
{
	
	//&& further defines the rateBasedAdaptation class, set the prototype, inherit from adaptationLogic and make unique class method, which is the representation switching mechanism based on rate!	
	rateBasedAdaptationM.prototype = new adaptationLogic(_mpd, video);		//&& assign the adaptationLogic instance to rateBasedAdaptation class's prototype
	
	
	//&& a stand alone function, which is a class method of rateBasedAdaptation. 	
	rateBasedAdaptationM.prototype.switchRepresentation = function (){ 	
		bufferfilllevel = this.overlaybuffer.getFillLevel();	
		console.log("the overlay buffer's fill level taken by adaptation is "+ bufferfilllevel);//&& newly added line		
			// select a matching bandwidth ...
			var i=-1, n=parseInt(this.lowestRepresentation.bandwidth), m=this.representationID, _mybps = this.bandwidth.getBps();//&& mind the scope of the variables, this.bandwidth.getBps() returns this.bps of the bandwidth object			
			this.mpd.period[0].group[0].representation.forEach(function(_rel){			//&& forEach element in the representation list, pass the element to the function registered in forEach and execute 
				if(parseInt(_rel.bandwidth) < _mybps && n <= parseInt(_rel.bandwidth))  //&& fatal bug here, if lowest _rel.bandwidth is bigger than the compared bps, what to do? this cause problem when bandwidth suddenly drops to below minimum representation bw. 
				{
					console.log("n: " + n + ", m:" + m);
					n = parseInt(_rel.bandwidth);
					i++;
				}												
				if(i <0)m = 0;else m = i;		
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
					SwitchCount += 1;	
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
	ratebased = new rateBasedAdaptationM(bandwidth,overlaybuffer); //&& the bandwidth object which contains latest evaluated bandwidth is also passed into this object constructor
	
	return ratebased;
}




/***********************************************Gear allocation Test***********************************************************/
/**********************************************                     ***********************************************************/
/***********************************************Gear allocation Test***********************************************************/



/* *******************************************************************************************************************************
* Adaptation Logic No.?A2, RateWatermarkAdaptationGear_accelaration	CONSTRUCTOR AND FACTORY   																		 *
* Another class that inherit adaptationLogic but introduce new representation switch method,																		 *
* say, to take buffer level into account.																																												 *
* Fatal Bug of lowest rep > bw fixed: the bug was, when lowest rep rate > bw, no decrease in representation											 *
* uneccesary condition removed, the buffer range related with a gear position is unecessary. 																		 *
* implementing: buffer change rate calculation instead of rough judgement on buffer shrinking (implement in alg7)		    				 *
* Take a time reference before takin the buffer level, save it in a class variable, or just save the _mbps and compare it with   *
*	previous one                                                                                                                   *
* baseline bandwidth estimation already take care of weighting historical bandwidth, no need to do more													 *
*********************************************************************************************************************************/

function RateWatermarkAdaptationGearA2(bandwidth,overlaybuffer) //&& the constructor 
{	
	this.overlaybuffer = overlaybuffer;
	this.bandwidth = bandwidth;
	console.log("DASH JS using adaptation: RateWatermarkAdaptationGearA");		
	//this.bufferlastlevel = 0;	
	this.bufferlastAbsolutelevel = 0;
	this.buffercounter = 3;
	this.checkCycle = 3; //&& when initiating, make this.buffercounter == this.checkCycle
	this.flag = 0; //&& turn flag to 0, representation selection based on bw is performed, turn it to 1, the switching would be performed according to buffer draining rate.	
}


/* ****************************************************************
* the factory of RateWatermarkAdaptation object; prototype as well
******************************************************************/ 
function init_RateWatermarkAdaptationGearA2(_mpd, video, bandwidth, overlaybuffer) 
{

	RateWatermarkAdaptationGearA2.prototype = new adaptationLogic(_mpd, video);	
	//&& Keep in mind that _mps is modest with a factor of 0.9
	
  
	RateWatermarkAdaptationGearA2.prototype.switchRepresentation = function (){ 

		bufferfilllevel = this.overlaybuffer.getFillLevel();	//&& take the buffer level and log it after the switching logic is executed	
		bufferAbsolutelevel = this.overlaybuffer.getAbsoluteFillLevel();
			
		// select a matching bandwidth ... //&& everytime from the lowestRepresentation
			
		var myindex = -1, n=parseInt(this.lowestRepresentation.bandwidth), m=this.representationID, _mybps = this.bandwidth.getBps();//&& mind the scope of the variables, this.bandwidth.getBps() returns this.bps of the bandwidth object  //--


		if (this.gearPosition == 1 ){
			if(this.flag == 0 ){ 		
				this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if((parseInt(_rel.bandwidth) < (_mybps/(1.10*this.averageGearRatio))) && n <= parseInt(_rel.bandwidth)) //&& what if the lowest _rel.bandwidth is larger than the compared bandwidth?? original code is buggy!
				{	 						
					n = parseInt(_rel.bandwidth);	
					myindex++;									 					
				}												
				},RWbased);
				if(myindex <0)m = 0;else m = myindex;				
				this.flag = 1;	
				this.buffercounter = this.checkCycle;			
			}else
			if(this.flag == 1){
				if((this.buffercounter == this.checkCycle) && (bufferAbsolutelevel-this.bufferlastAbsolutelevel) < 0){//&&(bufferfilllevel-this.bufferlastlevel)<0 , then we are losing the buffer !! not allowed		
					console.log("the bufferlevel change is" + (bufferAbsolutelevel-this.bufferlastAbsolutelevel) +" @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");	
					m = 0;
				}
			}		 
			if (bufferfilllevel > 50){this.gearPosition = 2;this.flag = 0;}							
		}else	  
		if (this.gearPosition == 2 ){
			if(this.flag == 0 ){ 		
				this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if((parseInt(_rel.bandwidth) < (_mybps)) && n <= parseInt(_rel.bandwidth)) //&& what if the lowest _rel.bandwidth is larger than the compared bandwidth?? original code is buggy!
				{	 						
					n = parseInt(_rel.bandwidth);	
					myindex++;									 					
				}												
				},RWbased);
				if(myindex <0)m = 0;else m = myindex;				
				this.flag = 1;
				this.buffercounter = this.checkCycle;					
			}else
			if(this.flag == 1){
				if((this.buffercounter == this.checkCycle) && (bufferAbsolutelevel-this.bufferlastAbsolutelevel) < -1*seglength){//&&(bufferfilllevel-this.bufferlastlevel)<0 , then we are losing the buffer !! not allowed		
					console.log("the bufferlevel change is" + (bufferAbsolutelevel-this.bufferlastAbsolutelevel) +" @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");	
				this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if((parseInt(_rel.bandwidth) < (_mybps)) && n <= parseInt(_rel.bandwidth)) //&& what if the lowest _rel.bandwidth is larger than the compared bandwidth?? original code is buggy!
				{	 						
					n = parseInt(_rel.bandwidth);	
					myindex++;									 					
				}												
				},RWbased);
				if(myindex <0)m = 0;else m = myindex;
				}
			}	 
			if (bufferfilllevel < 50){this.gearPosition = 1;this.flag = 0;}							
		}		
		  //this.bufferlastlevel = bufferfilllevel;	
		if(this.buffercounter == this.checkCycle){
			this.buffercounter = 0;
		 	this.bufferlastAbsolutelevel = bufferAbsolutelevel;		  			  	
		}
		this.buffercounter += 1;
			
			console.log("n: " + n + ", m:" + m +"; and the estimated bps is "+ _mybps);			
			console.log("bufferlevel is "+ bufferfilllevel+ " AND the gearposition is "+ this.gearPosition);
			console.log("representation with bitrate of" + RWbased.mpd.period[0].group[0].representation[m].bandwidth + " is chosen");
			Gearstr = Gearstr + (new Date().getTime()/1000).toFixed(2) + "\t" + this.gearPosition  + "\n";
			
			/*****************************************************************************
			* !! BUG
			* use else if to make exclusive desicion each time eveluating in the forEach loop!!;
			* use 'if' only could cause double increment of m, might access undefined element!!
			* consider bufferfill level 67%, then i is incremented twice!! 
			*****************************************************************************/
			
			// return the segment	
			if( m != this.representationID) //&& in this case, a different representation than the previous one is chosen.
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
					SwitchCount += 1;					
					console.log("DASH rate based adaptation: SWITCHING STREAM TO BITRATE = " + this.mpd.period[0].group[0].representation[m].bandwidth);					
					this.representationID = m;
					this.mpd.period[0].group[0].representation[m].curSegment = this.currentRepresentation.curSegment;  //&& this is the index of the dash video segment, related to timeline. increment everytime a new segment is fetched. 
					this.currentRepresentation = this.mpd.period[0].group[0].representation[m];
					console.log("n: " + n + ", m:" + m); //++
					if(this.currentRepresentation.baseURL == false) this.currentRepresentation.baseURL = _mpd.baseURL;
					
				}
			}
			this.notify();//$$ when switchRepresentation hapens, the subject would notify the observer, in dashJs, Fplot is notified.
		}

  /* ****************************************************************
  * create an instance of the rateBasedApaptation class and returns it
  * the bandwidth object which contains latest evaluated bandwidth is 
  * also passed into this object constructor	
  ******************************************************************/ 	
	RWbased = new RateWatermarkAdaptationGearA2(bandwidth, overlaybuffer);
	
  /* ****************************************************************
  * perform gear ratio calculation!
  * then log the representation bitrates and gear raitos
  ******************************************************************/ 	
	console.log('I am here right before ratio calculation');
	RWbased.calculateGearRatioPUSH(RWbased); // ++ 
	//++ RWbased.calculateGearRatio(RWbased); //&& it has the same function as RWbased.calculateGearRatioPUSH !! I just test the array's push method
	
	console.log ('There are '+ RWbased.RPM.length + ' representations');
  for (var i= 0; i < RWbased.RPM.length; i++){
		console.log ('Representation '+ i +' has a bit rate of ' + RWbased.RPM[i]);
	}	
	
	for (var i= 0; i < RWbased.gearRatio.length; i++){
		console.log ('the gearRatio '+ i +' is ' + RWbased.gearRatio[i]);
	}	
	console.log ('the average gearRatio is ' + RWbased.averageGearRatio);	
	
	return RWbased;
}





/* *******************************************************************************************************************************
* Adaptation Logic No.?A3, RateWatermarkAdaptationGear_accelaration	CONSTRUCTOR AND FACTORY   																		 *
* Another class that inherit adaptationLogic but introduce new representation switch method,																		 *
* say, to take buffer level into account.																																												 *
* Fatal Bug of lowest rep > bw fixed: the bug was, when lowest rep rate > bw, no decrease in representation											 *
* uneccesary condition removed, the buffer range related with a gear position is unecessary. 																		 *
* implementing: buffer change rate calculation instead of rough judgement on buffer shrinking (implement in alg7)		    				 *
* Take a time reference before takin the buffer level, save it in a class variable, or just save the _mbps and compare it with   *
*	previous one                                                                                                                   *
* baseline bandwidth estimation already take care of weighting historical bandwidth, no need to do more													 *
*********************************************************************************************************************************/

function RateWatermarkAdaptationGearA3(bandwidth,overlaybuffer) //&& the constructor 
{	
	this.overlaybuffer = overlaybuffer;
	this.bandwidth = bandwidth;
	console.log("DASH JS using adaptation: RateWatermarkAdaptationGearA");		
	//this.bufferlastlevel = 0;	
	this.bufferlastAbsolutelevel = 0;
	this.buffercounter = 3;
	this.checkCycle = 3; //&& when initiating, make this.buffercounter == this.checkCycle
	this.flag = 0; //&& turn flag to 0, representation selection based on bw is performed, turn it to 1, the switching would be performed according to buffer draining rate.	
}


/* ****************************************************************
* the factory of RateWatermarkAdaptation object; prototype as well
******************************************************************/ 
function init_RateWatermarkAdaptationGearA3(_mpd, video, bandwidth, overlaybuffer) 
{

	RateWatermarkAdaptationGearA3.prototype = new adaptationLogic(_mpd, video);	
	//&& Keep in mind that _mps is modest with a factor of 0.9
	
  
	RateWatermarkAdaptationGearA3.prototype.switchRepresentation = function (){ 

		bufferfilllevel = this.overlaybuffer.getFillLevel();	//&& take the buffer level and log it after the switching logic is executed	
		bufferAbsolutelevel = this.overlaybuffer.getAbsoluteFillLevel();
			
		// select a matching bandwidth ... //&& everytime from the lowestRepresentation
			
		var myindex = -1, n=parseInt(this.lowestRepresentation.bandwidth), m=this.representationID, _mybps = this.bandwidth.getBps();//&& mind the scope of the variables, this.bandwidth.getBps() returns this.bps of the bandwidth object  //--


		if (this.gearPosition == 1 ){
			if(this.flag == 0 ){ 		
				this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if((parseInt(_rel.bandwidth) < (_mybps/(1.10*this.averageGearRatio*this.averageGearRatio))) && n <= parseInt(_rel.bandwidth)) //&& what if the lowest _rel.bandwidth is larger than the compared bandwidth?? original code is buggy!
				{	 						
					n = parseInt(_rel.bandwidth);	
					myindex++;									 					
				}												
				},RWbased);
				if(myindex <0)m = 0;else m = myindex;				
				this.flag = 1;	
				this.buffercounter = this.checkCycle;			
			}else
			if(this.flag == 1){
				if((this.buffercounter == this.checkCycle) && (bufferAbsolutelevel-this.bufferlastAbsolutelevel) < 0){//&&(bufferfilllevel-this.bufferlastlevel)<0 , then we are losing the buffer !! not allowed		
					console.log("the bufferlevel change is" + (bufferAbsolutelevel-this.bufferlastAbsolutelevel) +" @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");	
					m = 0;
				}
			}		 
			if (bufferfilllevel > 30){this.gearPosition = 2;this.flag = 0;}							
		}else	  
		if (this.gearPosition == 2 ){
			if(this.flag == 0 ){ 		
				this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if((parseInt(_rel.bandwidth) < (_mybps/(1.15*this.averageGearRatio))) && n <= parseInt(_rel.bandwidth)) //&& what if the lowest _rel.bandwidth is larger than the compared bandwidth?? original code is buggy!
				{	 						
					n = parseInt(_rel.bandwidth);	
					myindex++;									 					
				}												
				},RWbased);
				if(myindex <0)m = 0;else m = myindex;				
				this.flag = 1;
				this.buffercounter = this.checkCycle;					
			}else
			if(this.flag == 1){
				if((this.buffercounter == this.checkCycle) && (bufferAbsolutelevel-this.bufferlastAbsolutelevel) < -1*seglength){//&&(bufferfilllevel-this.bufferlastlevel)<0 , then we are losing the buffer !! not allowed		
					console.log("the bufferlevel change is" + (bufferAbsolutelevel-this.bufferlastAbsolutelevel) +" @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");	
				this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if((parseInt(_rel.bandwidth) < (_mybps/(1.15*this.averageGearRatio))) && n <= parseInt(_rel.bandwidth)) //&& what if the lowest _rel.bandwidth is larger than the compared bandwidth?? original code is buggy!
				{	 						
					n = parseInt(_rel.bandwidth);	
					myindex++;									 					
				}												
				},RWbased);
				if(myindex <0)m = 0;else m = myindex;
				}
			}	 
			if (bufferfilllevel > 60){this.gearPosition = 3;this.flag = 0;}
			if (bufferfilllevel < 30){this.gearPosition = 1; this.flag = 0;} 							
		}else
		if(this.gearPosition == 3 ){
			if(this.flag == 0 ){ //&&  discard these options!! '|| Math.abs(bufferfilllevel-this.bufferlastlevel)> 5' 'Math.abs(bufferAbsolutelevel-this.bufferlastAbsolutelevel) != 0' 'Math.abs(bufferAbsolutelevel-this.bufferlastAbsolutelevel) > 2'
				this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if((parseInt(_rel.bandwidth) < _mybps) && n <= parseInt(_rel.bandwidth)) 
				{	 						
					n = parseInt(_rel.bandwidth);
					myindex++;									 					
				}												
				},RWbased);
				if(myindex <0)m = 0;else m = myindex;		
				this.flag = 1;	
				this.buffercounter = this.checkCycle;				
			}else
			if(this.flag == 1){
				if((this.buffercounter == this.checkCycle) && (bufferAbsolutelevel-this.bufferlastAbsolutelevel) < -1*(this.checkCycle-1)*seglength){ //&& -2*seglength is somehow neccessary, as one push to mediasource api would drain one segment
						console.log("the bufferlevel change is" + (bufferAbsolutelevel-this.bufferlastAbsolutelevel) +" @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");	
				this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if((parseInt(_rel.bandwidth) < _mybps) && n <= parseInt(_rel.bandwidth)) 
				{	 						
					n = parseInt(_rel.bandwidth);
					myindex++;									 					
				}												
				},RWbased);
				if(myindex <0)m = 0;else m = myindex;
				}else
				if((this.buffercounter == this.checkCycle) && (bufferAbsolutelevel-this.bufferlastAbsolutelevel) > (this.checkCycle-1)*seglength){//&& >3*seglength is not possible as the download is consecutive and in series, not parallel. 
					console.log("the bufferlevel change is" + (bufferAbsolutelevel-this.bufferlastAbsolutelevel) +" @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");	
				this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if((parseInt(_rel.bandwidth) < _mybps) && n <= parseInt(_rel.bandwidth)) 
				{	 						
					n = parseInt(_rel.bandwidth);
					myindex++;									 					
				}												
				},RWbased);
				if(myindex <0)m = 0;else m = myindex;				
				}
			}	
			if (bufferfilllevel <60){this.gearPosition = 2; this.flag = 0;} 
		}
				
		  //this.bufferlastlevel = bufferfilllevel;	
		if(this.buffercounter == this.checkCycle){
			this.buffercounter = 0;
		 	this.bufferlastAbsolutelevel = bufferAbsolutelevel;		  			  	
		}
		this.buffercounter += 1;
			
			console.log("n: " + n + ", m:" + m +"; and the estimated bps is "+ _mybps);			
			console.log("bufferlevel is "+ bufferfilllevel+ " AND the gearposition is "+ this.gearPosition);
			console.log("representation with bitrate of" + RWbased.mpd.period[0].group[0].representation[m].bandwidth + " is chosen");
			Gearstr = Gearstr + (new Date().getTime()/1000).toFixed(2) + "\t" + this.gearPosition  + "\n";
			
			/*****************************************************************************
			* !! BUG
			* use else if to make exclusive desicion each time eveluating in the forEach loop!!;
			* use 'if' only could cause double increment of m, might access undefined element!!
			* consider bufferfill level 67%, then i is incremented twice!! 
			*****************************************************************************/
			
			// return the segment	
			if( m != this.representationID) //&& in this case, a different representation than the previous one is chosen.
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
					SwitchCount += 1;					
					console.log("DASH rate based adaptation: SWITCHING STREAM TO BITRATE = " + this.mpd.period[0].group[0].representation[m].bandwidth);					
					this.representationID = m;
					this.mpd.period[0].group[0].representation[m].curSegment = this.currentRepresentation.curSegment;  //&& this is the index of the dash video segment, related to timeline. increment everytime a new segment is fetched. 
					this.currentRepresentation = this.mpd.period[0].group[0].representation[m];
					console.log("n: " + n + ", m:" + m); //++
					if(this.currentRepresentation.baseURL == false) this.currentRepresentation.baseURL = _mpd.baseURL;
					
				}
			}
			this.notify();//$$ when switchRepresentation hapens, the subject would notify the observer, in dashJs, Fplot is notified.
		}

  /* ****************************************************************
  * create an instance of the rateBasedApaptation class and returns it
  * the bandwidth object which contains latest evaluated bandwidth is 
  * also passed into this object constructor	
  ******************************************************************/ 	
	RWbased = new RateWatermarkAdaptationGearA3(bandwidth, overlaybuffer);
	
  /* ****************************************************************
  * perform gear ratio calculation!
  * then log the representation bitrates and gear raitos
  ******************************************************************/ 	
	console.log('I am here right before ratio calculation');
	RWbased.calculateGearRatioPUSH(RWbased); // ++ 
	//++ RWbased.calculateGearRatio(RWbased); //&& it has the same function as RWbased.calculateGearRatioPUSH !! I just test the array's push method
	
	console.log ('There are '+ RWbased.RPM.length + ' representations');
  for (var i= 0; i < RWbased.RPM.length; i++){
		console.log ('Representation '+ i +' has a bit rate of ' + RWbased.RPM[i]);
	}	
	
	for (var i= 0; i < RWbased.gearRatio.length; i++){
		console.log ('the gearRatio '+ i +' is ' + RWbased.gearRatio[i]);
	}	
	console.log ('the average gearRatio is ' + RWbased.averageGearRatio);	
	
	return RWbased;
}






/* *******************************************************************************************************************************
* Adaptation Logic No.? A4, RateWatermarkAdaptationGear_accelaration	CONSTRUCTOR AND FACTORY   																		 *
* Another class that inherit adaptationLogic but introduce new representation switch method,																		 *
* say, to take buffer level into account.																																												 *
* Fatal Bug of lowest rep > bw fixed: the bug was, when lowest rep rate > bw, no decrease in representation											 *
* uneccesary condition removed, the buffer range related with a gear position is unecessary. 																		 *
* implementing: buffer change rate calculation instead of rough judgement on buffer shrinking (implement in alg7)		    				 *
* Take a time reference before takin the buffer level, save it in a class variable, or just save the _mbps and compare it with   *
*	previous one                                                                                                                   *
* baseline bandwidth estimation already take care of weighting historical bandwidth, no need to do more													 *
*********************************************************************************************************************************/

function RateWatermarkAdaptationGearA4(bandwidth,overlaybuffer) //&& the constructor 
{	
	this.overlaybuffer = overlaybuffer;
	this.bandwidth = bandwidth;
	console.log("DASH JS using adaptation: RateWatermarkAdaptationGearA");		
	//this.bufferlastlevel = 0;	
	this.bufferlastAbsolutelevel = 0;
	this.buffercounter = 3;
	this.checkCycle = 3; //&& when initiating, make this.buffercounter == this.checkCycle
	this.flag = 0; //&& turn flag to 0, representation selection based on bw is performed, turn it to 1, the switching would be performed according to buffer draining rate.	
}


/* ****************************************************************
* the factory of RateWatermarkAdaptation object; prototype as well
******************************************************************/ 
function init_RateWatermarkAdaptationGearA4(_mpd, video, bandwidth, overlaybuffer) 
{

	RateWatermarkAdaptationGearA4.prototype = new adaptationLogic(_mpd, video);	
	//&& Keep in mind that _mps is modest with a factor of 0.9
	
  
	RateWatermarkAdaptationGearA4.prototype.switchRepresentation = function (){ 

		bufferfilllevel = this.overlaybuffer.getFillLevel();	//&& take the buffer level and log it after the switching logic is executed	
		bufferAbsolutelevel = this.overlaybuffer.getAbsoluteFillLevel();
			
		// select a matching bandwidth ... //&& everytime from the lowestRepresentation
			
		var myindex = -1, n=parseInt(this.lowestRepresentation.bandwidth), m=this.representationID, _mybps = this.bandwidth.getBps();//&& mind the scope of the variables, this.bandwidth.getBps() returns this.bps of the bandwidth object  //--


		if (this.gearPosition == 1 ){
			if(this.flag == 0 ){ 		
				this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if((parseInt(_rel.bandwidth) < (_mybps/(1.10*this.averageGearRatio*this.averageGearRatio))) && n <= parseInt(_rel.bandwidth)) //&& what if the lowest _rel.bandwidth is larger than the compared bandwidth?? original code is buggy!
				{	 						
					n = parseInt(_rel.bandwidth);	
					myindex++;									 					
				}												
				},RWbased);
				if(myindex <0)m = 0;else m = myindex;				
				this.flag = 1;	
				this.buffercounter = this.checkCycle;			
			}else
			if(this.flag == 1){
				if((this.buffercounter == this.checkCycle) && (bufferAbsolutelevel-this.bufferlastAbsolutelevel) < 0){//&&(bufferfilllevel-this.bufferlastlevel)<0 , then we are losing the buffer !! not allowed		
					console.log("the bufferlevel change is" + (bufferAbsolutelevel-this.bufferlastAbsolutelevel) +" @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");	
					m = 0;
				}
			}		 
			if (bufferfilllevel > 25){this.gearPosition = 2;this.flag = 0;}							
		}else	  
		if (this.gearPosition == 2 ){
			if(this.flag == 0 ){ 		
				this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if((parseInt(_rel.bandwidth) < (_mybps/(1.15*this.averageGearRatio))) && n <= parseInt(_rel.bandwidth)) //&& what if the lowest _rel.bandwidth is larger than the compared bandwidth?? original code is buggy!
				{	 						
					n = parseInt(_rel.bandwidth);	
					myindex++;									 					
				}												
				},RWbased);
				if(myindex <0)m = 0;else m = myindex;				
				this.flag = 1;
				this.buffercounter = this.checkCycle;					
			}else
			if(this.flag == 1){
				if((this.buffercounter == this.checkCycle) && (bufferAbsolutelevel-this.bufferlastAbsolutelevel) < -1*seglength){//&&(bufferfilllevel-this.bufferlastlevel)<0 , then we are losing the buffer !! not allowed		
					console.log("the bufferlevel change is" + (bufferAbsolutelevel-this.bufferlastAbsolutelevel) +" @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");	
				this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if((parseInt(_rel.bandwidth) < (_mybps/(1.15*this.averageGearRatio))) && n <= parseInt(_rel.bandwidth)) //&& what if the lowest _rel.bandwidth is larger than the compared bandwidth?? original code is buggy!
				{	 						
					n = parseInt(_rel.bandwidth);	
					myindex++;									 					
				}												
				},RWbased);
				if(myindex <0)m = 0;else m = myindex;
				}
			}	 
			if (bufferfilllevel > 50){this.gearPosition = 3;this.flag = 0;}
			if (bufferfilllevel < 25){this.gearPosition = 1; this.flag = 0;} 							
		}else
		if(this.gearPosition == 3 ){
			if(this.flag == 0 ){ //&&  discard these options!! '|| Math.abs(bufferfilllevel-this.bufferlastlevel)> 5' 'Math.abs(bufferAbsolutelevel-this.bufferlastAbsolutelevel) != 0' 'Math.abs(bufferAbsolutelevel-this.bufferlastAbsolutelevel) > 2'
				this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if((parseInt(_rel.bandwidth) < _mybps) && n <= parseInt(_rel.bandwidth)) 
				{	 						
					n = parseInt(_rel.bandwidth);
					myindex++;									 					
				}												
				},RWbased);
				if(myindex <0)m = 0;else m = myindex;		
				this.flag = 1;	
				this.buffercounter = this.checkCycle;				
			}else
			if(this.flag == 1){
				if((this.buffercounter == this.checkCycle) && (bufferAbsolutelevel-this.bufferlastAbsolutelevel) < -1*(this.checkCycle-1)*seglength){ //&& -2*seglength is somehow neccessary, as one push to mediasource api would drain one segment
						console.log("the bufferlevel change is" + (bufferAbsolutelevel-this.bufferlastAbsolutelevel) +" @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");	
				this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if((parseInt(_rel.bandwidth) < _mybps) && n <= parseInt(_rel.bandwidth)) 
				{	 						
					n = parseInt(_rel.bandwidth);
					myindex++;									 					
				}												
				},RWbased);
				if(myindex <0)m = 0;else m = myindex;
				}else
				if((this.buffercounter == this.checkCycle) && (bufferAbsolutelevel-this.bufferlastAbsolutelevel) > (this.checkCycle-1)*seglength){//&& >3*seglength is not possible as the download is consecutive and in series, not parallel. 
					console.log("the bufferlevel change is" + (bufferAbsolutelevel-this.bufferlastAbsolutelevel) +" @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");	
				this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if((parseInt(_rel.bandwidth) < _mybps) && n <= parseInt(_rel.bandwidth)) 
				{	 						
					n = parseInt(_rel.bandwidth);
					myindex++;									 					
				}												
				},RWbased);
				if(myindex <0)m = 0;else m = myindex;				
				}
			}		
			if (bufferfilllevel > 75){this.gearPosition = 4; this.flag = 0;} 	
			if (bufferfilllevel < 50){this.gearPosition = 2; this.flag = 0;} 
		}else
		if(this.gearPosition == 4 ){
			if(this.flag == 0){ //&& discard this also 'Math.abs(bufferAbsolutelevel-this.bufferlastAbsolutelevel) > seglength				
				this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if((parseInt(_rel.bandwidth) < (_mybps*1.15*this.averageGearRatio)) && n <= parseInt(_rel.bandwidth)) 
				{	 						
					n = parseInt(_rel.bandwidth);
					myindex++;									 					
				}												
				},RWbased);
				if(myindex <0)m = 0;else m = myindex;
				this.flag = 1;
				this.buffercounter = this.checkCycle;						
			}else
			if(this.flag == 1){
				if((this.buffercounter == this.checkCycle) && ((bufferAbsolutelevel-this.bufferlastAbsolutelevel) < -1*(this.checkCycle+1)*seglength)){ //&& at higher gear level, the buffer is supposed to shrink, tolerate higher shrinking rate
						console.log("the bufferlevel change is" + (bufferAbsolutelevel-this.bufferlastAbsolutelevel) +" @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");	
				this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if((parseInt(_rel.bandwidth) < (_mybps*1.15*this.averageGearRatio)) && n <= parseInt(_rel.bandwidth)) 
				{	 						
					n = parseInt(_rel.bandwidth);
					myindex++;									 					
				}												
				},RWbased);
				if(myindex <0)m = 0;else m = myindex;
				}else
				if((this.buffercounter == this.checkCycle) && (bufferAbsolutelevel-this.bufferlastAbsolutelevel) > (this.checkCycle-1)*seglength){//&& >3*seglength is not possible as the download is consecutive and in series, not parallel. 
					console.log("the bufferlevel change is" + (bufferAbsolutelevel-this.bufferlastAbsolutelevel) +" @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");	
				this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if((parseInt(_rel.bandwidth) < (_mybps*1.15*this.averageGearRatio)) && n <= parseInt(_rel.bandwidth)) 
				{	 						
					n = parseInt(_rel.bandwidth);
					myindex++;									 					
				}												
				},RWbased);
				if(myindex <0)m = 0;else m = myindex;				
				}
			}	
			if (bufferfilllevel < 75){this.gearPosition = 3; this.flag = 0;} 
		}
		
		  //this.bufferlastlevel = bufferfilllevel;	
		if(this.buffercounter == this.checkCycle){
			this.buffercounter = 0;
		 	this.bufferlastAbsolutelevel = bufferAbsolutelevel;		  			  	
		}
		this.buffercounter += 1;
			
			console.log("n: " + n + ", m:" + m +"; and the estimated bps is "+ _mybps);			
			console.log("bufferlevel is "+ bufferfilllevel+ " AND the gearposition is "+ this.gearPosition);
			console.log("representation with bitrate of" + RWbased.mpd.period[0].group[0].representation[m].bandwidth + " is chosen");
			Gearstr = Gearstr + (new Date().getTime()/1000).toFixed(2) + "\t" + this.gearPosition  + "\n";
			
			/*****************************************************************************
			* !! BUG
			* use else if to make exclusive desicion each time eveluating in the forEach loop!!;
			* use 'if' only could cause double increment of m, might access undefined element!!
			* consider bufferfill level 67%, then i is incremented twice!! 
			*****************************************************************************/
			
			// return the segment	
			if( m != this.representationID) //&& in this case, a different representation than the previous one is chosen.
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
					SwitchCount += 1;					
					console.log("DASH rate based adaptation: SWITCHING STREAM TO BITRATE = " + this.mpd.period[0].group[0].representation[m].bandwidth);					
					this.representationID = m;
					this.mpd.period[0].group[0].representation[m].curSegment = this.currentRepresentation.curSegment;  //&& this is the index of the dash video segment, related to timeline. increment everytime a new segment is fetched. 
					this.currentRepresentation = this.mpd.period[0].group[0].representation[m];
					console.log("n: " + n + ", m:" + m); //++
					if(this.currentRepresentation.baseURL == false) this.currentRepresentation.baseURL = _mpd.baseURL;
					
				}
			}
			this.notify();//$$ when switchRepresentation hapens, the subject would notify the observer, in dashJs, Fplot is notified.
		}

  /* ****************************************************************
  * create an instance of the rateBasedApaptation class and returns it
  * the bandwidth object which contains latest evaluated bandwidth is 
  * also passed into this object constructor	
  ******************************************************************/ 	
	RWbased = new RateWatermarkAdaptationGearA4(bandwidth, overlaybuffer);
	
  /* ****************************************************************
  * perform gear ratio calculation!
  * then log the representation bitrates and gear raitos
  ******************************************************************/ 	
	console.log('I am here right before ratio calculation');
	RWbased.calculateGearRatioPUSH(RWbased); // ++ 
	//++ RWbased.calculateGearRatio(RWbased); //&& it has the same function as RWbased.calculateGearRatioPUSH !! I just test the array's push method
	
	console.log ('There are '+ RWbased.RPM.length + ' representations');
  for (var i= 0; i < RWbased.RPM.length; i++){
		console.log ('Representation '+ i +' has a bit rate of ' + RWbased.RPM[i]);
	}	
	
	for (var i= 0; i < RWbased.gearRatio.length; i++){
		console.log ('the gearRatio '+ i +' is ' + RWbased.gearRatio[i]);
	}	
	console.log ('the average gearRatio is ' + RWbased.averageGearRatio);	
	
	return RWbased;
}






/* *******************************************************************************************************************************
* Adaptation Logic No.? A5, RateWatermarkAdaptationGear_accelaration	CONSTRUCTOR AND FACTORY   																		 *
* Another class that inherit adaptationLogic but introduce new representation switch method,																		 *
* say, to take buffer level into account.																																												 *
* Fatal Bug of lowest rep > bw fixed: the bug was, when lowest rep rate > bw, no decrease in representation											 *
* uneccesary condition removed, the buffer range related with a gear position is unecessary. 																		 *
* implementing: buffer change rate calculation instead of rough judgement on buffer shrinking (implement in alg7)		    				 *
* Take a time reference before takin the buffer level, save it in a class variable, or just save the _mbps and compare it with   *
*	previous one                                                                                                                   *
* baseline bandwidth estimation already take care of weighting historical bandwidth, no need to do more													 *
*********************************************************************************************************************************/

function RateWatermarkAdaptationGearA5(bandwidth,overlaybuffer) //&& the constructor 
{	
	this.overlaybuffer = overlaybuffer;
	this.bandwidth = bandwidth;
	console.log("DASH JS using adaptation: RateWatermarkAdaptationGearA");		
	//this.bufferlastlevel = 0;	
	this.bufferlastAbsolutelevel = 0;
	this.buffercounter = 3;
	this.checkCycle = 3; //&& when initiating, make this.buffercounter == this.checkCycle
	this.flag = 0; //&& turn flag to 0, representation selection based on bw is performed, turn it to 1, the switching would be performed according to buffer draining rate.	
}


/* ****************************************************************
* the factory of RateWatermarkAdaptation object; prototype as well
******************************************************************/ 
function init_RateWatermarkAdaptationGearA5(_mpd, video, bandwidth, overlaybuffer) 
{

	RateWatermarkAdaptationGearA5.prototype = new adaptationLogic(_mpd, video);	
	//&& Keep in mind that _mps is modest with a factor of 0.9
	
  
	RateWatermarkAdaptationGearA5.prototype.switchRepresentation = function (){ 

		bufferfilllevel = this.overlaybuffer.getFillLevel();	//&& take the buffer level and log it after the switching logic is executed	
		bufferAbsolutelevel = this.overlaybuffer.getAbsoluteFillLevel();
			
		// select a matching bandwidth ... //&& everytime from the lowestRepresentation
			
		var myindex = -1, n=parseInt(this.lowestRepresentation.bandwidth), m=this.representationID, _mybps = this.bandwidth.getBps();//&& mind the scope of the variables, this.bandwidth.getBps() returns this.bps of the bandwidth object  //--


		if (this.gearPosition == 1 ){
			if(this.flag == 0 ){ 		
				this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if((parseInt(_rel.bandwidth) < (_mybps/(1.10*this.averageGearRatio*this.averageGearRatio))) && n <= parseInt(_rel.bandwidth)) //&& what if the lowest _rel.bandwidth is larger than the compared bandwidth?? original code is buggy!
				{	 						
					n = parseInt(_rel.bandwidth);	
					myindex++;									 					
				}												
				},RWbased);
				if(myindex <0)m = 0;else m = myindex;				
				this.flag = 1;	
				this.buffercounter = this.checkCycle;			
			}else
			if(this.flag == 1){
				if((this.buffercounter == this.checkCycle) && (bufferAbsolutelevel-this.bufferlastAbsolutelevel) < 0){//&&(bufferfilllevel-this.bufferlastlevel)<0 , then we are losing the buffer !! not allowed		
					console.log("the bufferlevel change is" + (bufferAbsolutelevel-this.bufferlastAbsolutelevel) +" @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");	
					m = 0;
				}
			}		 
			if (bufferfilllevel > 20){this.gearPosition = 2;this.flag = 0;}							
		}else	  
		if (this.gearPosition == 2 ){
			if(this.flag == 0 ){ 		
				this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if((parseInt(_rel.bandwidth) < (_mybps/(1.15*this.averageGearRatio))) && n <= parseInt(_rel.bandwidth)) //&& what if the lowest _rel.bandwidth is larger than the compared bandwidth?? original code is buggy!
				{	 						
					n = parseInt(_rel.bandwidth);	
					myindex++;									 					
				}												
				},RWbased);
				if(myindex <0)m = 0;else m = myindex;				
				this.flag = 1;
				this.buffercounter = this.checkCycle;					
			}else
			if(this.flag == 1){
				if((this.buffercounter == this.checkCycle) && (bufferAbsolutelevel-this.bufferlastAbsolutelevel) < -1*seglength){//&&(bufferfilllevel-this.bufferlastlevel)<0 , then we are losing the buffer !! not allowed		
					console.log("the bufferlevel change is" + (bufferAbsolutelevel-this.bufferlastAbsolutelevel) +" @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");	
				this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if((parseInt(_rel.bandwidth) < (_mybps/(1.15*this.averageGearRatio))) && n <= parseInt(_rel.bandwidth)) //&& what if the lowest _rel.bandwidth is larger than the compared bandwidth?? original code is buggy!
				{	 						
					n = parseInt(_rel.bandwidth);	
					myindex++;									 					
				}												
				},RWbased);
				if(myindex <0)m = 0;else m = myindex;
				}
			}	 
			if (bufferfilllevel > 40){this.gearPosition = 3;this.flag = 0;}
			if (bufferfilllevel < 20){this.gearPosition = 1; this.flag = 0;} 							
		}else
		if(this.gearPosition == 3 ){
			if(this.flag == 0 ){ //&&  discard these options!! '|| Math.abs(bufferfilllevel-this.bufferlastlevel)> 5' 'Math.abs(bufferAbsolutelevel-this.bufferlastAbsolutelevel) != 0' 'Math.abs(bufferAbsolutelevel-this.bufferlastAbsolutelevel) > 2'
				this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if((parseInt(_rel.bandwidth) < _mybps) && n <= parseInt(_rel.bandwidth)) 
				{	 						
					n = parseInt(_rel.bandwidth);
					myindex++;									 					
				}												
				},RWbased);
				if(myindex <0)m = 0;else m = myindex;		
				this.flag = 1;	
				this.buffercounter = this.checkCycle;				
			}else
			if(this.flag == 1){
				if((this.buffercounter == this.checkCycle) && (bufferAbsolutelevel-this.bufferlastAbsolutelevel) < -1*(this.checkCycle-1)*seglength){ //&& -2*seglength is somehow neccessary, as one push to mediasource api would drain one segment
						console.log("the bufferlevel change is" + (bufferAbsolutelevel-this.bufferlastAbsolutelevel) +" @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");	
				this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if((parseInt(_rel.bandwidth) < _mybps) && n <= parseInt(_rel.bandwidth)) 
				{	 						
					n = parseInt(_rel.bandwidth);
					myindex++;									 					
				}												
				},RWbased);
				if(myindex <0)m = 0;else m = myindex;
				}else
				if((this.buffercounter == this.checkCycle) && (bufferAbsolutelevel-this.bufferlastAbsolutelevel) > (this.checkCycle-1)*seglength){//&& >3*seglength is not possible as the download is consecutive and in series, not parallel. 
					console.log("the bufferlevel change is" + (bufferAbsolutelevel-this.bufferlastAbsolutelevel) +" @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");	
				this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if((parseInt(_rel.bandwidth) < _mybps) && n <= parseInt(_rel.bandwidth)) 
				{	 						
					n = parseInt(_rel.bandwidth);
					myindex++;									 					
				}												
				},RWbased);
				if(myindex <0)m = 0;else m = myindex;				
				}
			}		
			if (bufferfilllevel > 60){this.gearPosition = 4; this.flag = 0;} 	
			if (bufferfilllevel < 40){this.gearPosition = 2; this.flag = 0;} 
		}else
		if(this.gearPosition == 4 ){
			if(this.flag == 0){ //&& discard this also 'Math.abs(bufferAbsolutelevel-this.bufferlastAbsolutelevel) > seglength				
				this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if((parseInt(_rel.bandwidth) < (_mybps*1.15*this.averageGearRatio)) && n <= parseInt(_rel.bandwidth)) 
				{	 						
					n = parseInt(_rel.bandwidth);
					myindex++;									 					
				}												
				},RWbased);
				if(myindex <0)m = 0;else m = myindex;
				this.flag = 1;
				this.buffercounter = this.checkCycle;						
			}else
			if(this.flag == 1){
				if((this.buffercounter == this.checkCycle) && ((bufferAbsolutelevel-this.bufferlastAbsolutelevel) < -1*(this.checkCycle+1)*seglength)){ //&& at higher gear level, the buffer is supposed to shrink, tolerate higher shrinking rate
						console.log("the bufferlevel change is" + (bufferAbsolutelevel-this.bufferlastAbsolutelevel) +" @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");	
				this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if((parseInt(_rel.bandwidth) < (_mybps*1.15*this.averageGearRatio)) && n <= parseInt(_rel.bandwidth)) 
				{	 						
					n = parseInt(_rel.bandwidth);
					myindex++;									 					
				}												
				},RWbased);
				if(myindex <0)m = 0;else m = myindex;
				}else
				if((this.buffercounter == this.checkCycle) && (bufferAbsolutelevel-this.bufferlastAbsolutelevel) > (this.checkCycle-1)*seglength){//&& >3*seglength is not possible as the download is consecutive and in series, not parallel. 
					console.log("the bufferlevel change is" + (bufferAbsolutelevel-this.bufferlastAbsolutelevel) +" @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");	
				this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if((parseInt(_rel.bandwidth) < (_mybps*1.15*this.averageGearRatio)) && n <= parseInt(_rel.bandwidth)) 
				{	 						
					n = parseInt(_rel.bandwidth);
					myindex++;									 					
				}												
				},RWbased);
				if(myindex <0)m = 0;else m = myindex;				
				}
			}	
			if (bufferfilllevel < 60){this.gearPosition = 3; this.flag = 0;}
			if (bufferfilllevel > 80){this.gearPosition = 5; this.flag = 0;}  
		}else
		if(this.gearPosition == 5 ){
			if(this.flag == 0){ //&& discard this also 'Math.abs(bufferAbsolutelevel-this.bufferlastAbsolutelevel) > seglength				
				this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if((parseInt(_rel.bandwidth) < (_mybps*1.15*this.averageGearRatio*this.averageGearRatio)) && n <= parseInt(_rel.bandwidth)) 
				{	 						
					n = parseInt(_rel.bandwidth);
					myindex++;									 					
				}												
				},RWbased);
				if(myindex <0)m = 0;else m = myindex;
				this.flag = 1;
				this.buffercounter = this.checkCycle;						
			}else
			if(this.flag == 1){
				if((this.buffercounter == this.checkCycle) && ((bufferAbsolutelevel-this.bufferlastAbsolutelevel) < -1*(this.checkCycle+1)*seglength)){ //&& at higher gear level, the buffer is supposed to shrink, tolerate higher shrinking rate
						console.log("the bufferlevel change is" + (bufferAbsolutelevel-this.bufferlastAbsolutelevel) +" @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");	
				this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if((parseInt(_rel.bandwidth) < (_mybps*1.15*this.averageGearRatio*this.averageGearRatio)) && n <= parseInt(_rel.bandwidth)) 
				{	 						
					n = parseInt(_rel.bandwidth);
					myindex++;									 					
				}												
				},RWbased);
				if(myindex <0)m = 0;else m = myindex;
				}else
				if((this.buffercounter == this.checkCycle) && (bufferAbsolutelevel-this.bufferlastAbsolutelevel) > (this.checkCycle-1)*seglength){//&& >3*seglength is not possible as the download is consecutive and in series, not parallel. 
					console.log("the bufferlevel change is" + (bufferAbsolutelevel-this.bufferlastAbsolutelevel) +" @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");	
				this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if((parseInt(_rel.bandwidth) < (_mybps*1.15*this.averageGearRatio*this.averageGearRatio)) && n <= parseInt(_rel.bandwidth)) 
				{	 						
					n = parseInt(_rel.bandwidth);
					myindex++;									 					
				}												
				},RWbased);
				if(myindex <0)m = 0;else m = myindex;				
				}
			}	
			if (bufferfilllevel < 80){this.gearPosition = 4; this.flag = 0;} 
		}
		
		  //this.bufferlastlevel = bufferfilllevel;	
		if(this.buffercounter == this.checkCycle){
			this.buffercounter = 0;
		 	this.bufferlastAbsolutelevel = bufferAbsolutelevel;		  			  	
		}
		this.buffercounter += 1;
			
			console.log("n: " + n + ", m:" + m +"; and the estimated bps is "+ _mybps);			
			console.log("bufferlevel is "+ bufferfilllevel+ " AND the gearposition is "+ this.gearPosition);
			console.log("representation with bitrate of" + RWbased.mpd.period[0].group[0].representation[m].bandwidth + " is chosen");
			Gearstr = Gearstr + (new Date().getTime()/1000).toFixed(2) + "\t" + this.gearPosition  + "\n";
			
			/*****************************************************************************
			* !! BUG
			* use else if to make exclusive desicion each time eveluating in the forEach loop!!;
			* use 'if' only could cause double increment of m, might access undefined element!!
			* consider bufferfill level 67%, then i is incremented twice!! 
			*****************************************************************************/
			
			// return the segment	
			if( m != this.representationID) //&& in this case, a different representation than the previous one is chosen.
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
					SwitchCount += 1;					
					console.log("DASH rate based adaptation: SWITCHING STREAM TO BITRATE = " + this.mpd.period[0].group[0].representation[m].bandwidth);					
					this.representationID = m;
					this.mpd.period[0].group[0].representation[m].curSegment = this.currentRepresentation.curSegment;  //&& this is the index of the dash video segment, related to timeline. increment everytime a new segment is fetched. 
					this.currentRepresentation = this.mpd.period[0].group[0].representation[m];
					console.log("n: " + n + ", m:" + m); //++
					if(this.currentRepresentation.baseURL == false) this.currentRepresentation.baseURL = _mpd.baseURL;
					
				}
			}
			this.notify();//$$ when switchRepresentation hapens, the subject would notify the observer, in dashJs, Fplot is notified.
		}

  /* ****************************************************************
  * create an instance of the rateBasedApaptation class and returns it
  * the bandwidth object which contains latest evaluated bandwidth is 
  * also passed into this object constructor	
  ******************************************************************/ 	
	RWbased = new RateWatermarkAdaptationGearA5(bandwidth, overlaybuffer);
	
  /* ****************************************************************
  * perform gear ratio calculation!
  * then log the representation bitrates and gear raitos
  ******************************************************************/ 	
	console.log('I am here right before ratio calculation');
	RWbased.calculateGearRatioPUSH(RWbased); // ++ 
	//++ RWbased.calculateGearRatio(RWbased); //&& it has the same function as RWbased.calculateGearRatioPUSH !! I just test the array's push method
	
	console.log ('There are '+ RWbased.RPM.length + ' representations');
  for (var i= 0; i < RWbased.RPM.length; i++){
		console.log ('Representation '+ i +' has a bit rate of ' + RWbased.RPM[i]);
	}	
	
	for (var i= 0; i < RWbased.gearRatio.length; i++){
		console.log ('the gearRatio '+ i +' is ' + RWbased.gearRatio[i]);
	}	
	console.log ('the average gearRatio is ' + RWbased.averageGearRatio);	
	
	return RWbased;
}




/* *******************************************************************************************************************************
* Adaptation Logic No.? A6, RateWatermarkAdaptationGear_accelaration	CONSTRUCTOR AND FACTORY   																		 *
* Another class that inherit adaptationLogic but introduce new representation switch method,																		 *
* say, to take buffer level into account.																																												 *
* Fatal Bug of lowest rep > bw fixed: the bug was, when lowest rep rate > bw, no decrease in representation											 *
* uneccesary condition removed, the buffer range related with a gear position is unecessary. 																		 *
* implementing: buffer change rate calculation instead of rough judgement on buffer shrinking (implement in alg7)		    				 *
* Take a time reference before takin the buffer level, save it in a class variable, or just save the _mbps and compare it with   *
*	previous one                                                                                                                   *
* baseline bandwidth estimation already take care of weighting historical bandwidth, no need to do more													 *
*********************************************************************************************************************************/

function RateWatermarkAdaptationGearA6(bandwidth,overlaybuffer) //&& the constructor 
{	
	this.overlaybuffer = overlaybuffer;
	this.bandwidth = bandwidth;
	console.log("DASH JS using adaptation: RateWatermarkAdaptationGearA");		
	//this.bufferlastlevel = 0;	
	this.bufferlastAbsolutelevel = 0;
	this.buffercounter = 3;
	this.checkCycle = 3; //&& when initiating, make this.buffercounter == this.checkCycle
	this.flag = 0; //&& turn flag to 0, representation selection based on bw is performed, turn it to 1, the switching would be performed according to buffer draining rate.	
}


/* ****************************************************************
* the factory of RateWatermarkAdaptation object; prototype as well
******************************************************************/ 
function init_RateWatermarkAdaptationGearA6(_mpd, video, bandwidth, overlaybuffer) 
{

	RateWatermarkAdaptationGearA6.prototype = new adaptationLogic(_mpd, video);	
	//&& Keep in mind that _mps is modest with a factor of 0.9
	
  
	RateWatermarkAdaptationGearA6.prototype.switchRepresentation = function (){ 

		bufferfilllevel = this.overlaybuffer.getFillLevel();	//&& take the buffer level and log it after the switching logic is executed	
		bufferAbsolutelevel = this.overlaybuffer.getAbsoluteFillLevel();
			
		// select a matching bandwidth ... //&& everytime from the lowestRepresentation
			
		var myindex = -1, n=parseInt(this.lowestRepresentation.bandwidth), m=this.representationID, _mybps = this.bandwidth.getBps();//&& mind the scope of the variables, this.bandwidth.getBps() returns this.bps of the bandwidth object  //--


		if (this.gearPosition == 1 ){
			if(this.flag == 0 ){ 		
				this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if((parseInt(_rel.bandwidth) < (_mybps/(1.10*this.averageGearRatio*this.averageGearRatio))) && n <= parseInt(_rel.bandwidth)) //&& what if the lowest _rel.bandwidth is larger than the compared bandwidth?? original code is buggy!
				{	 						
					n = parseInt(_rel.bandwidth);	
					myindex++;									 					
				}												
				},RWbased);
				if(myindex <0)m = 0;else m = myindex;				
				this.flag = 1;	
				this.buffercounter = this.checkCycle;			
			}else
			if(this.flag == 1){
				if((this.buffercounter == this.checkCycle) && (bufferAbsolutelevel-this.bufferlastAbsolutelevel) < 0){//&&(bufferfilllevel-this.bufferlastlevel)<0 , then we are losing the buffer !! not allowed		
					console.log("the bufferlevel change is" + (bufferAbsolutelevel-this.bufferlastAbsolutelevel) +" @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");	
					m = 0;
				}
			}		 
			if (bufferfilllevel > 17){this.gearPosition = 2;this.flag = 0;}							
		}else	  
		if (this.gearPosition == 2 ){
			if(this.flag == 0 ){ 		
				this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if((parseInt(_rel.bandwidth) < (_mybps/(1.15*this.averageGearRatio))) && n <= parseInt(_rel.bandwidth)) //&& what if the lowest _rel.bandwidth is larger than the compared bandwidth?? original code is buggy!
				{	 						
					n = parseInt(_rel.bandwidth);	
					myindex++;									 					
				}												
				},RWbased);
				if(myindex <0)m = 0;else m = myindex;				
				this.flag = 1;
				this.buffercounter = this.checkCycle;					
			}else
			if(this.flag == 1){
				if((this.buffercounter == this.checkCycle) && (bufferAbsolutelevel-this.bufferlastAbsolutelevel) < -1*seglength){//&&(bufferfilllevel-this.bufferlastlevel)<0 , then we are losing the buffer !! not allowed		
					console.log("the bufferlevel change is" + (bufferAbsolutelevel-this.bufferlastAbsolutelevel) +" @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");	
				this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if((parseInt(_rel.bandwidth) < (_mybps/(1.15*this.averageGearRatio))) && n <= parseInt(_rel.bandwidth)) //&& what if the lowest _rel.bandwidth is larger than the compared bandwidth?? original code is buggy!
				{	 						
					n = parseInt(_rel.bandwidth);	
					myindex++;									 					
				}												
				},RWbased);
				if(myindex <0)m = 0;else m = myindex;
				}
			}	 
			if (bufferfilllevel > 33){this.gearPosition = 3;this.flag = 0;}
			if (bufferfilllevel < 17){this.gearPosition = 1; this.flag = 0;} 							
		}else
		if(this.gearPosition == 3 ){
			if(this.flag == 0 ){ //&&  discard these options!! '|| Math.abs(bufferfilllevel-this.bufferlastlevel)> 5' 'Math.abs(bufferAbsolutelevel-this.bufferlastAbsolutelevel) != 0' 'Math.abs(bufferAbsolutelevel-this.bufferlastAbsolutelevel) > 2'
				this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if((parseInt(_rel.bandwidth) < _mybps) && n <= parseInt(_rel.bandwidth)) 
				{	 						
					n = parseInt(_rel.bandwidth);
					myindex++;									 					
				}												
				},RWbased);
				if(myindex <0)m = 0;else m = myindex;		
				this.flag = 1;	
				this.buffercounter = this.checkCycle;				
			}else
			if(this.flag == 1){
				if((this.buffercounter == this.checkCycle) && (bufferAbsolutelevel-this.bufferlastAbsolutelevel) < -1*(this.checkCycle-1)*seglength){ //&& -2*seglength is somehow neccessary, as one push to mediasource api would drain one segment
						console.log("the bufferlevel change is" + (bufferAbsolutelevel-this.bufferlastAbsolutelevel) +" @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");	
				this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if((parseInt(_rel.bandwidth) < _mybps) && n <= parseInt(_rel.bandwidth)) 
				{	 						
					n = parseInt(_rel.bandwidth);
					myindex++;									 					
				}												
				},RWbased);
				if(myindex <0)m = 0;else m = myindex;
				}else
				if((this.buffercounter == this.checkCycle) && (bufferAbsolutelevel-this.bufferlastAbsolutelevel) > (this.checkCycle-1)*seglength){//&& >3*seglength is not possible as the download is consecutive and in series, not parallel. 
					console.log("the bufferlevel change is" + (bufferAbsolutelevel-this.bufferlastAbsolutelevel) +" @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");	
				this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if((parseInt(_rel.bandwidth) < _mybps) && n <= parseInt(_rel.bandwidth)) 
				{	 						
					n = parseInt(_rel.bandwidth);
					myindex++;									 					
				}												
				},RWbased);
				if(myindex <0)m = 0;else m = myindex;				
				}
			}		
			if (bufferfilllevel > 49){this.gearPosition = 4; this.flag = 0;} 	
			if (bufferfilllevel < 33){this.gearPosition = 2; this.flag = 0;} 
		}else
		if(this.gearPosition == 4 ){
			if(this.flag == 0){ //&& discard this also 'Math.abs(bufferAbsolutelevel-this.bufferlastAbsolutelevel) > seglength				
				this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if((parseInt(_rel.bandwidth) < (_mybps*1.15*this.averageGearRatio)) && n <= parseInt(_rel.bandwidth)) 
				{	 						
					n = parseInt(_rel.bandwidth);
					myindex++;									 					
				}												
				},RWbased);
				if(myindex <0)m = 0;else m = myindex;
				this.flag = 1;
				this.buffercounter = this.checkCycle;						
			}else
			if(this.flag == 1){
				if((this.buffercounter == this.checkCycle) && ((bufferAbsolutelevel-this.bufferlastAbsolutelevel) < -1*(this.checkCycle+1)*seglength)){ //&& at higher gear level, the buffer is supposed to shrink, tolerate higher shrinking rate
						console.log("the bufferlevel change is" + (bufferAbsolutelevel-this.bufferlastAbsolutelevel) +" @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");	
				this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if((parseInt(_rel.bandwidth) < (_mybps*1.15*this.averageGearRatio)) && n <= parseInt(_rel.bandwidth)) 
				{	 						
					n = parseInt(_rel.bandwidth);
					myindex++;									 					
				}												
				},RWbased);
				if(myindex <0)m = 0;else m = myindex;
				}else
				if((this.buffercounter == this.checkCycle) && (bufferAbsolutelevel-this.bufferlastAbsolutelevel) > (this.checkCycle-1)*seglength){//&& >3*seglength is not possible as the download is consecutive and in series, not parallel. 
					console.log("the bufferlevel change is" + (bufferAbsolutelevel-this.bufferlastAbsolutelevel) +" @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");	
				this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if((parseInt(_rel.bandwidth) < (_mybps*1.15*this.averageGearRatio)) && n <= parseInt(_rel.bandwidth)) 
				{	 						
					n = parseInt(_rel.bandwidth);
					myindex++;									 					
				}												
				},RWbased);
				if(myindex <0)m = 0;else m = myindex;				
				}
			}	
			if (bufferfilllevel > 66){this.gearPosition = 5; this.flag = 0;}
			if (bufferfilllevel < 49){this.gearPosition = 3; this.flag = 0;}
		}else
		if(this.gearPosition == 5 ){
			if(this.flag == 0){ //&& discard this also 'Math.abs(bufferAbsolutelevel-this.bufferlastAbsolutelevel) > seglength				
				this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if((parseInt(_rel.bandwidth) < (_mybps*1.15*this.averageGearRatio*this.averageGearRatio)) && n <= parseInt(_rel.bandwidth)) 
				{	 						
					n = parseInt(_rel.bandwidth);
					myindex++;									 					
				}												
				},RWbased);
				if(myindex <0)m = 0;else m = myindex;
				this.flag = 1;
				this.buffercounter = this.checkCycle;						
			}else
			if(this.flag == 1){
				if((this.buffercounter == this.checkCycle) && ((bufferAbsolutelevel-this.bufferlastAbsolutelevel) < -1*(this.checkCycle+1)*seglength)){ //&& at higher gear level, the buffer is supposed to shrink, tolerate higher shrinking rate
						console.log("the bufferlevel change is" + (bufferAbsolutelevel-this.bufferlastAbsolutelevel) +" @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");	
				this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if((parseInt(_rel.bandwidth) < (_mybps*1.15*this.averageGearRatio*this.averageGearRatio)) && n <= parseInt(_rel.bandwidth)) 
				{	 						
					n = parseInt(_rel.bandwidth);
					myindex++;									 					
				}												
				},RWbased);
				if(myindex <0)m = 0;else m = myindex;
				}else
				if((this.buffercounter == this.checkCycle) && (bufferAbsolutelevel-this.bufferlastAbsolutelevel) > (this.checkCycle-1)*seglength){//&& >3*seglength is not possible as the download is consecutive and in series, not parallel. 
					console.log("the bufferlevel change is" + (bufferAbsolutelevel-this.bufferlastAbsolutelevel) +" @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");	
				this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if((parseInt(_rel.bandwidth) < (_mybps*1.15*this.averageGearRatio*this.averageGearRatio)) && n <= parseInt(_rel.bandwidth)) 
				{	 						
					n = parseInt(_rel.bandwidth);
					myindex++;									 					
				}												
				},RWbased);
				if(myindex <0)m = 0;else m = myindex;				
				}
			}
			if (bufferfilllevel > 83){this.gearPosition = 6; this.flag = 0;}	
			if (bufferfilllevel < 66){this.gearPosition = 4; this.flag = 0;} 
		}else
		if(this.gearPosition == 6 ){
			if(this.flag == 0){ //&& discard this also 'Math.abs(bufferAbsolutelevel-this.bufferlastAbsolutelevel) > seglength				
				this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if((parseInt(_rel.bandwidth) < (_mybps*this.averageGearRatio*this.averageGearRatio*this.averageGearRatio)) && n <= parseInt(_rel.bandwidth)) 
				{	 						
					n = parseInt(_rel.bandwidth);
					myindex++;									 					
				}												
				},RWbased);
				if(myindex <0)m = 0;else m = myindex;
				this.flag = 1;
				this.buffercounter = this.checkCycle;						
			}else
			if(this.flag == 1){
				if((this.buffercounter == this.checkCycle) && ((bufferAbsolutelevel-this.bufferlastAbsolutelevel) < -1*(this.checkCycle+1)*seglength)){ //&& at higher gear level, the buffer is supposed to shrink, tolerate higher shrinking rate
						console.log("the bufferlevel change is" + (bufferAbsolutelevel-this.bufferlastAbsolutelevel) +" @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");	
				this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if((parseInt(_rel.bandwidth) < (_mybps*this.averageGearRatio*this.averageGearRatio*this.averageGearRatio)) && n <= parseInt(_rel.bandwidth)) 
				{	 						
					n = parseInt(_rel.bandwidth);
					myindex++;									 					
				}												
				},RWbased);
				if(myindex <0)m = 0;else m = myindex;
				}else
				if((this.buffercounter == this.checkCycle) && (bufferAbsolutelevel-this.bufferlastAbsolutelevel) > (this.checkCycle-1)*seglength){//&& >3*seglength is not possible as the download is consecutive and in series, not parallel. 
					console.log("the bufferlevel change is" + (bufferAbsolutelevel-this.bufferlastAbsolutelevel) +" @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");	
				this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if((parseInt(_rel.bandwidth) < (_mybps*this.averageGearRatio*this.averageGearRatio*this.averageGearRatio)) && n <= parseInt(_rel.bandwidth)) 
				{	 						
					n = parseInt(_rel.bandwidth);
					myindex++;									 					
				}												
				},RWbased);
				if(myindex <0)m = 0;else m = myindex;				
				}
			}	
			if (bufferfilllevel < 83){this.gearPosition = 5; this.flag = 0;} 
		}
		
		  //this.bufferlastlevel = bufferfilllevel;	
		if(this.buffercounter == this.checkCycle){
			this.buffercounter = 0;
		 	this.bufferlastAbsolutelevel = bufferAbsolutelevel;		  			  	
		}
		this.buffercounter += 1;
			
			console.log("n: " + n + ", m:" + m +"; and the estimated bps is "+ _mybps);			
			console.log("bufferlevel is "+ bufferfilllevel+ " AND the gearposition is "+ this.gearPosition);
			console.log("representation with bitrate of" + RWbased.mpd.period[0].group[0].representation[m].bandwidth + " is chosen");
			Gearstr = Gearstr + (new Date().getTime()/1000).toFixed(2) + "\t" + this.gearPosition  + "\n";
			
			/*****************************************************************************
			* !! BUG
			* use else if to make exclusive desicion each time eveluating in the forEach loop!!;
			* use 'if' only could cause double increment of m, might access undefined element!!
			* consider bufferfill level 67%, then i is incremented twice!! 
			*****************************************************************************/
			
			// return the segment	
			if( m != this.representationID) //&& in this case, a different representation than the previous one is chosen.
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
					SwitchCount += 1;					
					console.log("DASH rate based adaptation: SWITCHING STREAM TO BITRATE = " + this.mpd.period[0].group[0].representation[m].bandwidth);					
					this.representationID = m;
					this.mpd.period[0].group[0].representation[m].curSegment = this.currentRepresentation.curSegment;  //&& this is the index of the dash video segment, related to timeline. increment everytime a new segment is fetched. 
					this.currentRepresentation = this.mpd.period[0].group[0].representation[m];
					console.log("n: " + n + ", m:" + m); //++
					if(this.currentRepresentation.baseURL == false) this.currentRepresentation.baseURL = _mpd.baseURL;
					
				}
			}
			this.notify();//$$ when switchRepresentation hapens, the subject would notify the observer, in dashJs, Fplot is notified.
		}

  /* ****************************************************************
  * create an instance of the rateBasedApaptation class and returns it
  * the bandwidth object which contains latest evaluated bandwidth is 
  * also passed into this object constructor	
  ******************************************************************/ 	
	RWbased = new RateWatermarkAdaptationGearA6(bandwidth, overlaybuffer);
	
  /* ****************************************************************
  * perform gear ratio calculation!
  * then log the representation bitrates and gear raitos
  ******************************************************************/ 	
	console.log('I am here right before ratio calculation');
	RWbased.calculateGearRatioPUSH(RWbased); // ++ 
	//++ RWbased.calculateGearRatio(RWbased); //&& it has the same function as RWbased.calculateGearRatioPUSH !! I just test the array's push method
	
	console.log ('There are '+ RWbased.RPM.length + ' representations');
  for (var i= 0; i < RWbased.RPM.length; i++){
		console.log ('Representation '+ i +' has a bit rate of ' + RWbased.RPM[i]);
	}	
	
	for (var i= 0; i < RWbased.gearRatio.length; i++){
		console.log ('the gearRatio '+ i +' is ' + RWbased.gearRatio[i]);
	}	
	console.log ('the average gearRatio is ' + RWbased.averageGearRatio);	
	
	return RWbased;
}




