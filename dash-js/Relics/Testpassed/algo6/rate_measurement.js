/*
 * rate_measurement.js
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

measurement = new Object();
measurement.startTimeMeasure = 0;
measurement.endTimeMeasure = 0;

/************************************************************************************************************
* an array of the starting time of a segment request, this is necessary as requests and responses are asynchronous events!!
* consider this situation, request 1 has been sent and waiting for response for request 1. before response 1 comes, request 2 is fired, 
* if we use a universal global, before we could calculate the bps of the first request-response, the request time has already been renewed.
* then then calculation would be faulty.
************************************************************************************************************/
var __id = new Array();  


/************************************************************************************************************
* beginBitrateMeasurement() and endBitrateMeasurement() are used to calculate the initial bps of the mpd file request
* which can be found in mpdParser.js @ MPDLoader.prototype.loadMPD()
************************************************************************************************************/
function beginBitrateMeasurement(){
	
	measurement.startTimeMeasure =new Date().getTime();	
	
}

function endBitrateMeasurement(lengthInBytes){

	measurement.endTimeMeasure =new Date().getTime();
	
	// return bps
	return ((lengthInBytes*8)/(measurement.endTimeMeasure - measurement.startTimeMeasure))*1000;
}



/************************************************************************************************************
* beginBitrateMeasurementByID() and endBitrateMeasurementByID() are designed for asychronous requests
* In dash situation, it's used to calculate the dps of each segment request
* used by Dashttp.js 
************************************************************************************************************/
function beginBitrateMeasurementByID(id){

	__id[id]=new Date().getTime();	//$$ id serves as an index and __id[id] used to store start time. __ means a class in python??

}

function endBitrateMeasurementByID(id, lengthInBytes){
	
	end = new Date().getTime(); //&& an ephemeral variable 
	
	// return bps
	//console.log("END id: " + id + " time: " +end);
	//console.log("Start: " + __id[id]);
	return ((lengthInBytes*8)/(end - __id[id]))*1000;//milliseconds*1000 = seconds, bits per seconds
}