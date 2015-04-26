/*
 * fPlot.js
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

var steppingY = 200; // 200 kbit steps for the Y-axis
var steppingX = 15; // 15 second steps
function fPlot(_canvas, period, width, height) // period will give us the max period length of the function to plot ...// this is the object constructor
{
	
	//$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
	//this.w = window.open();
	//this.w2 = window.open();
	//this.w.document.open();
	//this.w2.document.open();
	//$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
	
  this.str1 = "";
  this.str2 = "";
  //this.zip;
  //this.contents;
  	
	//$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
	
	this.canvas = _canvas;
	//this.canvas1 = _canvas1;
	// we will have to check the time!
	this.startTime = new Date().getTime();
	this.f = new Array();
	this.width = width;
	this.height = height;
	this.graphwidth = width - 50;
	this.graphheight = height - 25;
	this.canvas.translate(50, height-25); //translate the origin to the bottom left
	this.canvas.scale(1, -1);

/*	this.canvas.strokeStyle = "rgba(0,0,0,.5)";
	this.canvas.lineWidth = 0.8;
	this.canvas.beginPath();
	this.canvas.moveTo(0,0);
	this.canvas.lineTo(500000, 0);
	this.canvas.moveTo(0,0);
	this.canvas.lineTo(0,5000000);
	this.canvas.stroke();
	this.canvas.closePath();*/

}

fPlot.prototype.initNewFunction = function (type) {

	this.f[type] = new Object();
	this.f[type].cnt = 0
	this.f[type].values = new Array();
	this.f[type].timeStamps = new Array();

}

fPlot.prototype.updateOnlyPlaybackTime = function(value, type)
{
    
    
    
}

fPlot.prototype.update = function(value, type)//$$ BandWidth value will be the passed argument for value, type is 0 or 1 or 2, two bw lines and a vertical line to draw
{
	this.f[type].values[this.f[type].cnt] = value;	// an array of bw values
	this.f[type].timeStamps[this.f[type].cnt] = new Date().getTime();//$$ return milliseconds since the epoch
	

	//$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
  //$$newly added lines to write the bw and the time to a file, type switch//seems browser do not have permission to write on client machine
	//if (type == 1){//writing to file A
	//var fs = require('fs');
	//var tofileA = this.f[type].timeStamps[this.f[type].cnt]+'  '+ value;
	//fs.writeSync(fs.openSync('/tmp/a', 'w',0666),tofileA,0,tofileA.length,null);
	//}
	this.tmp = this.f[type].values[this.f[type].cnt]/1000;//convert the bw value to kb-kbit
	this.tmp = Math.round(this.tmp*100)/100; //returns 28.45
	//this.tmptime = this.f[type].timeStamps[this.f[type].cnt] - 1369042275000;
	//this.tmptime = (this.tmptime/100).toFixed(0);// to the precision of tens of seconds and emit the decimal portion
	this.tmptime = this.f[type].timeStamps[this.f[type].cnt];
	this.tmptime = (this.tmptime/1000).toFixed(2);// to the precision of seconds and emit the decimal portion
  if (type == 0){//writing to file B
  //this.writeFile("record.txt","helloworld");//$$$$$$$$$$$$$$$
  this.writeDocA(this.tmptime,this.tmp);
  }
  if (type == 1){
  this.writeDocB(this.tmptime,this.tmp);
 	}
 	//$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
  this.f[type].cnt++;
	this.plot();
}

//$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
//$$fPlot.prototype.writeFile = function(filename,filecontent)//$$$$$$$$$$$$$$$ Uncaught ReferenceError: ActiveXObject is not defined 
//{   //$$
//   var fso, f, s ;   
//   fso = new ActiveXObject("Scripting.FileSystemObject");      
//   f = fso.OpenTextFile(filename,8,true);   
//   f.WriteLine(filecontent);
//   f.Close();       
//}   

//$$fPlot.prototye.record = function()//$$ newly added function to record the bw values in the new canvas
//{
//	this.canvas1.font="15px Arial";
//  ctx.fillText("Hello World",10,50);// text write to the canvas is really pixels in a picture, cannot be copied in text format, this is a bad try!!!
//}
//$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$


//$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
fPlot.prototype.writeDocA = function(timepoint,bwValue)
{ 	 
 //this.w.document.writeln(timepoint + "  " + bwValue + "kb" + "<br>"); 
 this.str1 = this.str1 + timepoint + "\t" + bwValue + "kb" + "\n";
}

fPlot.prototype.writeDocB = function(timepoint,bwValue)
{ 	
 //this.w2.document.writeln(timepoint +"  "+ bwValue + "kb" + "<br>"); 
 this.str2 = this.str2 + timepoint + "\t" + bwValue + "kb" + "\n"; 
}

//fPlot.prototype.closefile = function()
//{
//  this.w.document.close();
//	this.zip = new JSZip();	
//	this.zip.file("EstimatedV.txt", this.str1);
//  this.zip.file("displayedV.txt", this.str2);
//  this.contents = this.zip.generate();
//  location.href="data:application/zip;base64,"+this.contents;
//}

fPlot.prototype.closefile = function()
{
	//this.w.document.close();
	myzip = new JSZip();	
	var portNumber = new String();  
	portNumber = window.location.host;  
	portNumber = portNumber.substring(portNumber.indexOf(":") + 1);
	//portNumber = window.location.port ;
	myzip.file("EstimatedV"+portNumber+".txt", this.str1);
  myzip.file("displayedV"+portNumber+".txt", this.str2);
  myzip.file("bufferRecord"+portNumber+".txt",bufferstr);
  downloadcontent = myzip.generate();
  location.href="data:application/zip;base64,"+downloadcontent;
}
//$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$

fPlot.prototype.plot = function()
{
	// clear the canvas	
	this.canvas.translate(-50, -(this.height));
	this.canvas.setTransform(1,0,0,1,0,0);
	this.canvas.clearRect(0,0,this.width,this.height);
	
	//$$ Newly added lines to make the canvas of white background instead of transparent!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
	this.canvas.fillStyle="#FFFFFF";
	this.canvas.fillRect(0,0,this.width,this.height);
	
	this.canvas.translate(50, this.height-25); //translate the origin to the bottom left
	this.canvas.scale(1, -1);
	
	
	// find the maximum for Y scaling
	var maxY = 0, maxX = 0;
	for(var n = 0; n < this.f.length; n++)
	{
	
	
		for(var i=0;i<this.f[n].values.length;i++)
		{
            if(n!= 2) //$$ if type is not 2 and this is the bw line, blue or red
            {
                if((this.f[n].values[i]/1024) > maxY) maxY = (this.f[n].values[i])/1024;
                if((this.f[n].timeStamps[i] - this.startTime)/60 > maxX) maxX = (this.f[n].timeStamps[i] - this.startTime)/60;		
            }
		}
	

	}
	
	
	this.canvas.strokeStyle = "rgba(0,0,0,.5)";
	this.canvas.lineWidth = 0.8;
	this.canvas.beginPath();
	this.canvas.moveTo(0,0);
	this.canvas.lineTo(500000, 0);
	this.canvas.moveTo(0,0);
	this.canvas.lineTo(0,5000000);
	this.canvas.stroke();
	this.canvas.closePath();
		
	
	//plot axis description
	this.canvas.save();
	this.canvas.translate(-50,-(this.height));
//	this.canvas.scale(1, -1);
	this.canvas.setTransform(1,0,0,1,0,0);

	for(var n=0; n < maxY/steppingY;n++)
	{
		this.canvas.fillStyle    = '#00f';
		this.canvas.font         = '10px sans-serif';
		this.canvas.textBaseline = 'top';
		var metrics = this.canvas.measureText(n*steppingY);
		this.canvas.fillText(n*steppingY, 50 - metrics.width, this.graphheight - ((((n*steppingY)/maxY) * this.graphheight)+10));
	}
	
	steppingX = maxX / 4;
	/*for(var n=0; n < maxX/steppingX;n++)
	{
		this.canvas.fillStyle    = '#00f';
		this.canvas.font         = '10px sans-serif';
		this.canvas.textBaseline = 'top';
		var metrics = this.canvas.measureText(parseInt(n*steppingX));
	
		this.canvas.fillText(parseInt(n*steppingX), 50 + (((n*steppingX)/maxX) * this.graphwidth) - metrics.width/2, this.height - 25);
	}*/
        this.canvas.fillStyle    = '#00f';
        this.canvas.font         = '10px sans-serif';
        this.canvas.textBaseline = 'top';
        var metrics = this.canvas.measureText("t");
        this.canvas.fillText("t", this.graphwidth - metrics.width, this.height - 25);
    
	
		this.canvas.fillStyle    = '#ff0000';
		this.canvas.font         = '10px sans-serif';
		this.canvas.textBaseline = 'top';
		var metrics = this.canvas.measureText("Estimated Bandwidth");//metrics holds the width of the text "Esti...bandwi.." in pixel
	
		this.canvas.fillText("Estimated Bandwidth", 10 + metrics.width/2, this.height - 15);// the second and third argument is for the location of the drawn text.
		
		this.canvas.fillStyle    = '#0000ff';
		this.canvas.font         = '10px sans-serif';
		this.canvas.textBaseline = 'top';
	//var metrics = this.canvas.measureText("Representation Bandwidth");
	
		this.canvas.fillText("Representation Bandwidth", 10 + metrics.width*2, this.height - 15);
		this.canvas.restore();
	
	
	//$$the plot function is actually the same for both the red and blue line, it's the notify call that differs. 
	//$$whenever a notify is received, all three tracks are ploted/refreshed, no matter if there's an update correspond to that track.
	// plot all tracked functions
	for(var n = 0; n < this.f.length; n++)
	{
        if(n==2)
        {
            this.canvas.strokeStyle = "rgba(0,0,0,1)";
            // draw the playback time line 
            this.canvas.beginPath();
            // move the line within the segment ..
            // first get the right segment, we know each is about 2 seconds ...
            segment_time = 10;
            m = 0;
            for(i=0; i < this.f[0].timeStamps.length; i++)
            {
                if(this.f[n].values[this.f[n].cnt-1] < segment_time){
                    m = i;
                    break;                    
                }
                
                segment_time += 10;
                m = i;
            }
            // estimate the movement of our bar ...
            
            
           // console.log(( (this.f[0].timeStamps[m+1] - this.startTime) - (this.f[0].timeStamps[m] - this.startTime) ) - ( ( (this.f[0].timeStamps[m+1] - this.startTime) - (this.f[0].timeStamps[m] - this.startTime) ) ) /  ( ( ( ( 2000 ) ) ) ) * ( ( (segment_time - this.f[n].values[this.f[n].cnt-1]) *1000) )); 
            move = ( (this.f[0].timeStamps[m+1] - this.startTime) - (this.f[0].timeStamps[m] - this.startTime) ) -  ( ( (this.f[0].timeStamps[m+1] - this.startTime) - (this.f[0].timeStamps[m] - this.startTime) ) ) /  ( ( ( ( 2000 ) ) ) ) * ( ( (segment_time - this.f[n].values[this.f[n].cnt-1]) *1000) );
           // console.log(((this.f[0].timeStamps[m] - this.startTime) + (this.f[n].values[this.f[n].cnt-1] - segment_time) )/60);
            
            this.canvas.moveTo(((((this.f[0].timeStamps[m] - this.startTime) + move )/60)/maxX)*this.graphwidth, 0);//$$ move to the originating point before stroke, the argument is a coordinate
            this.canvas.lineTo(((((this.f[0].timeStamps[m] - this.startTime)  + move )/60)/maxX)*this.graphwidth, this.graphheight);//$$ draw a line bridging the originating point and the lineTo point
            this.canvas.stroke();
            this.canvas.closePath();
           // console.log("m: " + m + "f:" + (((this.f[0].timeStamps[m] - this.startTime)/60)/maxX)*this.graphwidth + "segment_t:" + segment_time);
           // console.log("X: "+ ((((this.f[n].values[this.f[n].cnt-1])/60))/maxX)*this.graphwidth + "Y: " + this.graphheight + "MaxX:" + maxX);
            continue;
        }
        
       
		if(n==0) this.canvas.strokeStyle = "rgba(255,0,0,1)";//$$rgba(255,0,0,1) } /* solid red with no transparency*/
		if(n==1) this.canvas.strokeStyle = "rgba(0,0,255,1)";
	//	this.canvas.strokeStyle = "rgba(0,0,0,1)";
		this.canvas.beginPath();
		this.canvas.moveTo(0,0);
		for(var i=0;i<this.f[n].values.length;i++)
		{
			if(i>0) this.canvas.lineTo((((this.f[n].timeStamps[i] - this.startTime)/60)/maxX)*this.graphwidth, ((this.f[n].values[i-1]/(1024))/maxY)*this.graphheight);
			this.canvas.lineTo((((this.f[n].timeStamps[i] - this.startTime)/60)/maxX)*this.graphwidth, ((this.f[n].values[i]/(1024))/maxY)*this.graphheight);
		//	console.log("X: "+ (this.f[n].timeStamps[i] - this.startTime) / 60 + "Y: " + this.f[n].values[i] / (1024));
		}
		this.canvas.stroke();
		this.canvas.closePath();

	}
	
	//$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
	//$$ try to code and save the canvas using toDataURL()	
	//var canvas  =  document.getElementById("graph");
  //var dataUrl = canvas.toDataURL();	
	//window.open(dataUrl, "toDataURL() image", "width=this.width, height=this.height");  
	//$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
}
