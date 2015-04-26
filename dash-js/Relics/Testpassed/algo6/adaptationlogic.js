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




/* *******************************************************************************************************************************
* Adaptation Logic No.2, RateWatermarkAdaptation							CONSTRUCTOR AND FACTORY 																				   *
* Another class that inherit adaptationLogic but introduce new representation switch method,						                         *
* say, to take buffer level into account.																																	                       *
* 																																																															 *
* 																																																															 *
* 																																																															 *
* 																																																															 *
* 																																																															 *
*********************************************************************************************************************************/

function RateWatermarkAdaptation(bandwidth,overlaybuffer) //&& the constructor 
{	
	this.overlaybuffer = overlaybuffer;
	this.bandwidth = bandwidth;
	console.log("DASH JS using adaptation: Rate and Watermark Adaptation");		
}


/* ****************************************************************
* the factory of RateWatermarkAdaptation object; prototype as well
******************************************************************/ 
function init_RateWatermarkAdaptation(_mpd, video, bandwidth, overlaybuffer) 
{

	RateWatermarkAdaptation.prototype = new adaptationLogic(_mpd, video);	
		//&& Keep in mind that _mps is modest with a factor of 0.9
	

  
	RateWatermarkAdaptation.prototype.switchRepresentation = function (){ 
			bufferfilllevel = this.overlaybuffer.getFillLevel();	
			console.log("the overlay buffer's fill level taken by adaptation is "+ bufferfilllevel);//&& newly added line		
			
			// select a matching bandwidth ... //&& everytime from the lowestRepresentation
			
			var i=0, n=parseInt(this.lowestRepresentation.bandwidth), m=this.representationID, _mybps = this.bandwidth.getBps();//&& mind the scope of the variables, this.bandwidth.getBps() returns this.bps of the bandwidth object
			
			this.mpd.period[0].group[0].representation.forEach(function(_rel){			//&& forEach element in the representation list, pass the element to the function registered in forEach and execute 
				/*****************************************************************
				*roughly the adjacent representation has a bit rate ratio of 1.33
				* the reciprocal is about 0.75
				* if I can use a formular to calculate the adjacent representation ratio, so much the better!!
				*****************************************************************/
				if (bufferfilllevel <= 20 ){
					if(parseInt(_rel.bandwidth) < (_mybps*0.7*0.75) && n <= parseInt(_rel.bandwidth)) //&& 0.75 is the ratio of 1 over 1.33, two representation lower than _mybps's suggestion
					{ 						
						n = parseInt(_rel.bandwidth);
						m = i;
					}
					i++; 								
				}else if (bufferfilllevel > 90 ){
					if(parseInt(_rel.bandwidth) < (_mybps*2) && n <= parseInt(_rel.bandwidth))  //&& 1.33*1.33*.133 is about 2.4,  the third gear , two representation higher,
					{ 
						n = parseInt(_rel.bandwidth);
						m = i;
					}
					i++;	
				}else if (bufferfilllevel > 70 ){
					if(parseInt(_rel.bandwidth) < (_mybps*1.45) && n <= parseInt(_rel.bandwidth))  //&&  1.33*1.33 is about 1.8;  1.45 for the second gear, one representation higher
					{ 
						n = parseInt(_rel.bandwidth);
						m = i; 
					}
					i++;	
				}else if (bufferfilllevel > 35){
					if(parseInt(_rel.bandwidth) < (_mybps*1.05) && n <= parseInt(_rel.bandwidth))  //&&   1 < 1.05 < 1.35; first gear, normal bandwidth selection
					{ 
						n = parseInt(_rel.bandwidth);
						m = i;					  
					}
					i++;
				}else{
					if(parseInt(_rel.bandwidth) < (_mybps*0.75) && n <= parseInt(_rel.bandwidth))  //&& 0.75 is the ratio of 1 over 1.33, one representation lower than _mybps's suggestion
					{ 
						n = parseInt(_rel.bandwidth);
						m = i;						
					}
					i++; 							
				}		
			}); 
			console.log("n: " + n + ", m:" + m);
			console.log('this.averageGearRatio == ' + this.averageGearRatio );

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


	//&& create an instance of the rateBasedApaptation class and returns it
	RWbased = new RateWatermarkAdaptation(bandwidth, overlaybuffer); //&& the bandwidth object which contains latest evaluated bandwidth is also passed into this object constructor
	console.log('I am here right before ratio calculation');
		
	return RWbased;
}





/* *******************************************************************************************************************************
* Adaptation Logic No.3, RateWatermarkAdaptationRatio	CONSTRUCTOR AND FACTORY   																								 *
* Another class that inherit adaptationLogic but introduce new representation switch method,																		 *
* say, to take buffer level into account.																																												 *
* 																																																															 *
* 																																																															 *
* 																																																															 *
* 																																																															 *
* 																																																															 *
*********************************************************************************************************************************/

function RateWatermarkAdaptationRatio(bandwidth,overlaybuffer) //&& the constructor 
{	
	this.overlaybuffer = overlaybuffer;
	this.bandwidth = bandwidth;
	console.log("DASH JS using adaptation: RateWatermarkAdaptationRatio");		
}


/* ****************************************************************
* the factory of RateWatermarkAdaptation object; prototype as well
******************************************************************/ 
function init_RateWatermarkAdaptationRatio(_mpd, video, bandwidth, overlaybuffer) 
{

	RateWatermarkAdaptationRatio.prototype = new adaptationLogic(_mpd, video);	
		//&& Keep in mind that _mps is modest with a factor of 0.9
	
  // -- RateWatermarkAdaptationRatio.calculateGearRatioPUSH(RateWatermarkAdaptationRatio); // won't work!! because the instance is not initialized yet!!
  
	RateWatermarkAdaptationRatio.prototype.switchRepresentation = function (){ 
			bufferfilllevel = this.overlaybuffer.getFillLevel();	
			console.log("the overlay buffer's fill level taken by adaptation is "+ bufferfilllevel);//&& newly added line		
			
			// select a matching bandwidth ... //&& everytime from the lowestRepresentation
			
			var i=0, n=parseInt(this.lowestRepresentation.bandwidth), m=this.representationID, _mybps = this.bandwidth.getBps();//&& mind the scope of the variables, this.bandwidth.getBps() returns this.bps of the bandwidth object			

			this.mpd.period[0].group[0].representation.forEach(function(_rel){			//&& forEach element in the representation list, pass the element to the function registered in forEach and execute 
				/*****************************************************************
				*roughly the adjacent representation has a bit rate ratio of 1.33
				* the reciprocal is about 0.75
				* if I can use a formular to calculate the adjacent representation ratio, so much the better!!
				*****************************************************************/
				if (bufferfilllevel <= 20 ){
					if(parseInt(_rel.bandwidth) < (_mybps/(this.averageGearRatio*this.averageGearRatio*1.1)) && n <= parseInt(_rel.bandwidth)) //&& 0.75 is the ratio of 1 over 1.33, two representation lower than _mybps's suggestion
					{ 						
						n = parseInt(_rel.bandwidth);
						m = i;
					}
					i++; 								
				}else if (bufferfilllevel > 85 ){
					if(parseInt(_rel.bandwidth) < (_mybps*this.averageGearRatio*this.averageGearRatio*1.15) && n <= parseInt(_rel.bandwidth))  //&&  over 85 drastically increase the representation level
					{ 
						n = parseInt(_rel.bandwidth);
						m = i;
					}
					i++;	
				}else if (bufferfilllevel > 60 ){
					if(parseInt(_rel.bandwidth) < (_mybps*this.averageGearRatio*1.15) && n <= parseInt(_rel.bandwidth))  //&& 85-60
					{ 
						n = parseInt(_rel.bandwidth);
						m = i; 
					}
					i++;	
				}else if (bufferfilllevel > 30){
					if(parseInt(_rel.bandwidth) < (_mybps) && n <= parseInt(_rel.bandwidth))  
					{ 
						n = parseInt(_rel.bandwidth);
						m = i;					  
					}
					i++;
				}else{
					if(parseInt(_rel.bandwidth) < (_mybps/(this.averageGearRatio*1.1)) && n <= parseInt(_rel.bandwidth)) 
					{ 
						n = parseInt(_rel.bandwidth);
						m = i;						
					}
					i++; 							
				}		
				//&& console.log('this.averageGearRatio == fffffffuuuuuucccccccckkking' + this.averageGearRatio); //&& meant to check if foreach get 'this' right!
			},RWbased); //&& RWbased tells foreach() where 'this' is set to , RWbased works , RateWatermarkAdaptationRatio don't work!. 
			console.log("n: " + n + ", m:" + m +"; and the estimated bps is "+ _mybps);
			console.log("representation with bitrate of" + this.mpd.period[0].group[0].representation[m].bandwidth + " is chosen");

			/********************************************************************************************
			// console.log ('the average gearRatio is ' + RateWatermarkAdaptationRatio.averageGearRatio); //&& !!! the console logs :"the average gearRatio is undefined" 
			//&& !! before running calculateGearRatioPUSH, is indeed undifined!!
			// console.log('this.averageGearRatio == ' + this.averageGearRatio );			
			********************************************************************************************/

			
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
	RWbased = new RateWatermarkAdaptationRatio(bandwidth, overlaybuffer);
	
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
* Adaptation Logic No.4, RateWatermarkAdaptationGear	CONSTRUCTOR AND FACTORY   																								 *
* Another class that inherit adaptationLogic but introduce new representation switch method,																		 *
* say, to take buffer level into account.																																												 *
* 																																																															 *
* 																																																															 *
* 																																																															 *
* 																																																															 *
* 																																																															 *
*********************************************************************************************************************************/

function RateWatermarkAdaptationGear(bandwidth,overlaybuffer) //&& the constructor 
{	
	this.overlaybuffer = overlaybuffer;
	this.bandwidth = bandwidth;
	console.log("DASH JS using adaptation: Rate and Watermark Adaptation");		
}


/* ****************************************************************
* the factory of RateWatermarkAdaptation object; prototype as well
******************************************************************/ 
function init_RateWatermarkAdaptationGear(_mpd, video, bandwidth, overlaybuffer) 
{

	RateWatermarkAdaptationGear.prototype = new adaptationLogic(_mpd, video);	
	//&& Keep in mind that _mps is modest with a factor of 0.9
	
  // -- RateWatermarkAdaptationGear.calculateGearRatioPUSH(RateWatermarkAdaptationRatio); // won't work!! because the instance is not initialized yet!!
  
	RateWatermarkAdaptationGear.prototype.switchRepresentation = function (){ 
		bufferfilllevel = this.overlaybuffer.getFillLevel();	//&& take the buffer level and log it after the switching logic is executed	
			
		// select a matching bandwidth ... //&& everytime from the lowestRepresentation
			
		var i=0, n=parseInt(this.lowestRepresentation.bandwidth), m=this.representationID, _mybps = this.bandwidth.getBps();//&& mind the scope of the variables, this.bandwidth.getBps() returns this.bps of the bandwidth object
			
	
			this.mpd.period[0].group[0].representation.forEach(function(_rel){			//&& forEach element in the representation list, pass the element to the function registered in forEach and execute 
				/*****************************************************************
				*roughly the adjacent representation has a bit rate ratio of 1.33
				* the reciprocal is about 0.75
				* if I can use a formular to calculate the adjacent representation ratio, so much the better!!
				*****************************************************************/
				if (bufferfilllevel <= 25 && this.gearPosition == 1 ){
					if(parseInt(_rel.bandwidth) < (_mybps/(this.averageGearRatio*this.averageGearRatio*1.1)) && n <= parseInt(_rel.bandwidth)) //&& 0.75 is the ratio of 1 over 1.33, two representation lower than _mybps's suggestion
					{ 						
						n = parseInt(_rel.bandwidth);
						m = i;
					}
					i++; 
					if (bufferfilllevel >= 20){this.gearPosition = 2;}							
				}else	
				if((bufferfilllevel >= 10 && bufferfilllevel <= 35) && this.gearPosition == 2 ){
					if(parseInt(_rel.bandwidth) < (_mybps/(this.averageGearRatio)) && n <= parseInt(_rel.bandwidth)) 
					{ 
						n = parseInt(_rel.bandwidth);
						m = i;						
					}					
					i++;
					if (bufferfilllevel >= 25){this.gearPosition = 3;} 	
					if (bufferfilllevel <= 15){this.gearPosition = 1;} 
				}else
				if((bufferfilllevel >= 15 && bufferfilllevel <= 80) && this.gearPosition == 3 ){
					if(parseInt(_rel.bandwidth) < (_mybps*0.95) && n <= parseInt(_rel.bandwidth)) 
					{ 
						n = parseInt(_rel.bandwidth);
						m = i;						
					}					
					i++;
					if (bufferfilllevel >= 75){this.gearPosition = 4;} 	
					if (bufferfilllevel <= 20){this.gearPosition = 2;} 
				}else
				if((bufferfilllevel >= 50 && bufferfilllevel <= 95) && this.gearPosition == 4 ){
					if(parseInt(_rel.bandwidth) < (_mybps*this.averageGearRatio*1.15) && n <= parseInt(_rel.bandwidth)) 
					{ 
						n = parseInt(_rel.bandwidth);
						m = i;						
					}					
					i++;
					if (bufferfilllevel >= 90){this.gearPosition = 5;} 	
					if (bufferfilllevel <= 55){this.gearPosition = 3;} 
				}else
				if(bufferfilllevel >= 70  && this.gearPosition == 5 ){
					if(parseInt(_rel.bandwidth) < (_mybps*this.averageGearRatio*this.averageGearRatio*1.15) && n <= parseInt(_rel.bandwidth)) 
					{ 
						n = parseInt(_rel.bandwidth);
						m = i;						
					}					
					i++; 	
					if (bufferfilllevel <= 75){this.gearPosition = 4;} 
				}
			},RWbased); //&& RWbased tells foreach() where 'this' is set to , RWbased works , RateWatermarkAdaptationRatio don't work!. 
			console.log("n: " + n + ", m:" + m +"; and the estimated bps is "+ _mybps);			
			console.log("bufferlevel is "+ bufferfilllevel+ " AND the gearposition is "+ this.gearPosition);
			console.log("representation with bitrate of" + RWbased.mpd.period[0].group[0].representation[m].bandwidth + " is chosen");	
			
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
	RWbased = new RateWatermarkAdaptationGear(bandwidth, overlaybuffer);
	
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
* Adaptation Logic No.5, RateWatermarkAdaptationGear_accelaration	CONSTRUCTOR AND FACTORY   																		 *
* Another class that inherit adaptationLogic but introduce new representation switch method,																		 *
* say, to take buffer level into account.																																												 *
* 																																																															 *
* 																																																															 *
* 																																																															 *
* 																																																															 *
* 																																																															 *
*********************************************************************************************************************************/

function RateWatermarkAdaptationGearB(bandwidth,overlaybuffer) //&& the constructor 
{	
	this.overlaybuffer = overlaybuffer;
	this.bandwidth = bandwidth;
	console.log("DASH JS using adaptation: Rate and Watermark Adaptation");		
	this.bufferlastlevel = 0;	
	this.flag = 0;
}


/* ****************************************************************
* the factory of RateWatermarkAdaptation object; prototype as well
******************************************************************/ 
function init_RateWatermarkAdaptationGearB(_mpd, video, bandwidth, overlaybuffer) 
{

	RateWatermarkAdaptationGearB.prototype = new adaptationLogic(_mpd, video);	
	//&& Keep in mind that _mps is modest with a factor of 0.9
	
  
	RateWatermarkAdaptationGearB.prototype.switchRepresentation = function (){ 
		bufferfilllevel = this.overlaybuffer.getFillLevel();	//&& take the buffer level and log it after the switching logic is executed	
			
		// select a matching bandwidth ... //&& everytime from the lowestRepresentation
			
		var i=0, n=parseInt(this.lowestRepresentation.bandwidth), m=this.representationID, _mybps = this.bandwidth.getBps();//&& mind the scope of the variables, this.bandwidth.getBps() returns this.bps of the bandwidth object
	  
		if (bufferfilllevel <= 40 && this.gearPosition == 1 ){
			if(Math.abs(bufferfilllevel-this.bufferlastlevel)>=4 || this.flag == 0 ){
				this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if(parseInt(_rel.bandwidth) < (_mybps/(1.15*this.averageGearRatio)) && n <= parseInt(_rel.bandwidth)) 
				{	 						
					n = parseInt(_rel.bandwidth);
					m = i;
				}
				i++; 
				},RWbased);	
				this.flag = 1;					
			}	 
			if (bufferfilllevel >= 30){this.gearPosition = 2;this.flag = 0;}							
		}else
		if((bufferfilllevel >= 10 && bufferfilllevel <= 80) && this.gearPosition == 2 ){
			if(Math.abs(bufferfilllevel-this.bufferlastlevel)> 5 || this.flag == 0 ){
				this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if(parseInt(_rel.bandwidth) < (_mybps*0.95) && n <= parseInt(_rel.bandwidth)) 
				{	 						
					n = parseInt(_rel.bandwidth);
					m = i;
				}
				i++; 
				},RWbased);	
				this.flag = 1;					
			}	
			if (bufferfilllevel >= 75){this.gearPosition = 3; this.flag = 0;} 	
			if (bufferfilllevel <= 25){this.gearPosition = 1; this.flag = 0;} 
		}else
		if((bufferfilllevel >= 50 && bufferfilllevel <= 95) && this.gearPosition == 3 ){
			if(Math.abs(bufferfilllevel-this.bufferlastlevel)> 5 || this.flag == 0){
				this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if(parseInt(_rel.bandwidth) < (_mybps*1.15*this.averageGearRatio) && n <= parseInt(_rel.bandwidth)) 
				{	 						
					n = parseInt(_rel.bandwidth);
					m = i;
				}
				i++; 
				},RWbased);	
				this.flag = 1;						
			}
			if (bufferfilllevel >= 90){this.gearPosition = 4; this.flag = 0;} 	
			if (bufferfilllevel <= 55){this.gearPosition = 2; this.flag = 0;} 
		}else
		if(bufferfilllevel >= 70  && this.gearPosition == 4 ){
			if(Math.abs(bufferfilllevel-this.bufferlastlevel)> 5 || this.flag == 0){
				this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if(parseInt(_rel.bandwidth) < (_mybps*1.15*this.averageGearRatio*this.averageGearRatio) && n <= parseInt(_rel.bandwidth)) 
				{	 						
					n = parseInt(_rel.bandwidth);
					m = i;
				}
				i++; 
				},RWbased);		
				this.flag = 1;					
			} 	
			if (bufferfilllevel <= 75){this.gearPosition = 3; this.flag = 0;} 
		}
		
		this.bufferlastlevel = bufferfilllevel;
	
			
			console.log("n: " + n + ", m:" + m +"; and the estimated bps is "+ _mybps);			
			console.log("bufferlevel is "+ bufferfilllevel+ " AND the gearposition is "+ this.gearPosition);
			console.log("representation with bitrate of" + RWbased.mpd.period[0].group[0].representation[m].bandwidth + " is chosen");	
			
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
	RWbased = new RateWatermarkAdaptationGearB(bandwidth, overlaybuffer);
	
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
* Adaptation Logic No.6, RateWatermarkAdaptationGear_accelaration	CONSTRUCTOR AND FACTORY   																		 *
* Another class that inherit adaptationLogic but introduce new representation switch method,																		 *
* say, to take buffer level into account.																																												 *
* 																																																															 *
* 																																																															 *
* 																																																															 *
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
			
		var i=0, n=parseInt(this.lowestRepresentation.bandwidth), m=this.representationID, _mybps = this.bandwidth.getBps();//&& mind the scope of the variables, this.bandwidth.getBps() returns this.bps of the bandwidth object

		if (this.gearPosition == 1 ){
			if((bufferfilllevel-this.bufferlastlevel)<=0 || this.flag == 0 ){
//				this.mpd.period[0].group[0].representation.forEach(function(_rel){
//				if(parseInt(_rel.bandwidth) < (_mybps/(1.15*this.averageGearRatio*this.averageGearRatio)) && n <= parseInt(_rel.bandwidth)) 
//				{	 						
//					n = parseInt(_rel.bandwidth);
//					m = i;
//				}
//				i++; 
//				},RWbased);
				m = 0;	
				this.flag = 1;					
			}	 
			if (bufferfilllevel >= 20){this.gearPosition = 2;this.flag = 0;}							
		}else	  
		if (this.gearPosition == 2 ){
			if(this.flag == 0 ){ //&&(bufferfilllevel-this.bufferlastlevel)<=0 || this.flag == 0
				this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if(parseInt(_rel.bandwidth) < (_mybps/(1.15*this.averageGearRatio)) && n <= parseInt(_rel.bandwidth)) 
				{	 						
					n = parseInt(_rel.bandwidth);
					m = i;
				}
				i++; 
				},RWbased);	
				this.flag = 1;					
			}	 
			if (bufferfilllevel >= 30){this.gearPosition = 3;this.flag = 0;}
			if (bufferfilllevel <= 15){this.gearPosition = 1; this.flag = 0;} 							
		}else
		if(this.gearPosition == 3 ){
			if(Math.abs(bufferAbsolutelevel-this.bufferlastAbsolutelevel) > seglength || Math.abs(bufferAbsolutelevel-this.bufferlastAbsolutelevel) > 2 || this.flag == 0 ){ //&& '|| Math.abs(bufferfilllevel-this.bufferlastlevel)> 5' discard this!! 
				this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if(parseInt(_rel.bandwidth) < (_mybps*0.95) && n <= parseInt(_rel.bandwidth)) 
				{	 						
					n = parseInt(_rel.bandwidth);
					m = i;
				}
				i++; 
				},RWbased);	
				this.flag = 1;					
			}	
			if (bufferfilllevel >= 75){this.gearPosition = 4; this.flag = 0;} 	
			if (bufferfilllevel <= 25){this.gearPosition = 2; this.flag = 0;} 
		}else
		if(this.gearPosition == 4 ){
			if(Math.abs(bufferAbsolutelevel-this.bufferlastAbsolutelevel) > seglength  || Math.abs(bufferAbsolutelevel-this.bufferlastAbsolutelevel) > 2 || this.flag == 0){
				this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if(parseInt(_rel.bandwidth) < (_mybps*1.15*this.averageGearRatio) && n <= parseInt(_rel.bandwidth)) 
				{	 						
					n = parseInt(_rel.bandwidth);
					m = i;
				}
				i++; 
				},RWbased);	
				this.flag = 1;						
			}
			if (bufferfilllevel >= 90){this.gearPosition = 5; this.flag = 0;} 	
			if (bufferfilllevel <= 55){this.gearPosition = 3; this.flag = 0;} 
		}else
		if(this.gearPosition == 5 ){
			if(Math.abs(bufferAbsolutelevel-this.bufferlastAbsolutelevel) > seglength  || Math.abs(bufferAbsolutelevel-this.bufferlastAbsolutelevel) > 2 || this.flag == 0){
				this.mpd.period[0].group[0].representation.forEach(function(_rel){
				if(parseInt(_rel.bandwidth) < (_mybps*1.15*this.averageGearRatio*this.averageGearRatio) && n <= parseInt(_rel.bandwidth)) 
				{	 						
					n = parseInt(_rel.bandwidth);
					m = i;
				}
				i++; 
				},RWbased);		
				this.flag = 1;					
			} 	
			if (bufferfilllevel <= 75){this.gearPosition = 4; this.flag = 0;} 
		}
		
		this.bufferlastlevel = bufferfilllevel;
		this.bufferlastAbsolutelevel = bufferAbsolutelevel;
	
			
			console.log("n: " + n + ", m:" + m +"; and the estimated bps is "+ _mybps);			
			console.log("bufferlevel is "+ bufferfilllevel+ " AND the gearposition is "+ this.gearPosition);
			console.log("representation with bitrate of" + RWbased.mpd.period[0].group[0].representation[m].bandwidth + " is chosen");	
			Gearstr = Gearstr + (new Date().getTime()/1000).toFixed(2) + "  " + this.gearPosition  + "\n";
			
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
* Adaptation Logic No.1.1, the original AL	_MODED for experiment!!!!!!!!!!					CONSTRUCTOR AND FACTORY 			                 *
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
			var i=0, n=parseInt(this.lowestRepresentation.bandwidth), m=this.representationID, _mybps = this.bandwidth.getBps();//&& mind the scope of the variables, this.bandwidth.getBps() returns this.bps of the bandwidth object			
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
	ratebased = new rateBasedAdaptationM(bandwidth,overlaybuffer); //&& the bandwidth object which contains latest evaluated bandwidth is also passed into this object constructor
	
	return ratebased;
}


