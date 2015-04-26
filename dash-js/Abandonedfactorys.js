	  //XX adaptation = init_RateWatermarkAdaptation(dashInstance.mpdLoader.mpdparser.pmpd, dashInstance.videoTag, myBandwidth,overlayBuffer); //++ //XX hard coded representation bit rates
	  //XX adaptation = init_RateWatermarkAdaptationRatio(dashInstance.mpdLoader.mpdparser.pmpd, dashInstance.videoTag, myBandwidth,overlayBuffer); //++ //XX dynamic representation bit rates ratio calculation
	  //XX adaptation = init_RateWatermarkAdaptationGear(dashInstance.mpdLoader.mpdparser.pmpd, dashInstance.videoTag, myBandwidth,overlayBuffer); //++ //XX 
    //XX adaptation = init_RateWatermarkAdaptationGearB(dashInstance.mpdLoader.mpdparser.pmpd, dashInstance.videoTag, myBandwidth,overlayBuffer); //++ //XX 
	  // these lines goes to dash.js





//the factories below goes to adaptationlogic.js


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
			if(this.flag == 0 ){ //&& (bufferfilllevel-this.bufferlastlevel)<= 0 only allow the buffer to go up, if not switching!! since we disabled the switching and use lowest rep instead, we do not to judge on this condition any more.
				m = 0;	//&& at this level, just use the lowest representation!!
				this.flag = 1;					
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
			}else
			if(this.flag == 1){
				if((this.buffercounter == 3) && (bufferAbsolutelevel-this.bufferlastAbsolutelevel) < -1*seglength){//&&(bufferfilllevel-this.bufferlastlevel)<0 , then we are losing the buffer !! not allowed		
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
			}else
			if(this.flag == 1){
				if((this.buffercounter == 3) && (bufferAbsolutelevel-this.bufferlastAbsolutelevel) < -2*seglength){ //&& -2*seglength is somehow neccessary, as one push to mediasource api would drain one segment
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
				if((this.buffercounter == 3) && (bufferAbsolutelevel-this.bufferlastAbsolutelevel) > 2*seglength){//&& >3*seglength is not possible as the download is consecutive and in series, not parallel. 
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
			}else
			if(this.flag == 1){
				if((this.buffercounter == 3) && ((bufferAbsolutelevel-this.bufferlastAbsolutelevel) < -4*seglength)){ //&& at higher gear level, the buffer is supposed to shrink, tolerate higher shrinking rate
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
				if((this.buffercounter == 3) && (bufferAbsolutelevel-this.bufferlastAbsolutelevel) > 2*seglength){//&& >3*seglength is not possible as the download is consecutive and in series, not parallel. 
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
		if(this.buffercounter == 3){
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






