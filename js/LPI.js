var debug = true;
var LPI = (function () {
    var canvas = document.getElementsByTagName('canvas');
    var context = canvas[0].getContext('2d');
    
    // Plate object holds all the intensities and device variables.
    // It also parses the input functions, updates the intensities, and writes the output file.
    var plate = null;
    hideDownload();
    if (debug) {
	// Load up some default values for Plate obj
	plate = new Plate($('.LPI-menu'));
    }
    else {
	plate = new Plate($('.LPI-menu'));
    }

    var simulationManager = (function () {
	// Manages the Right workspace, the simulation
	var selectedRow = 1; //Default selected row
        var selectedCol = 1; //Default selected column
        var currentStep = 0; // index of current step in simulation
        var intervalFunc; //Stores most recent interval function (setInterval())
	
	var plateManager = (function () {
	    // Manages the visualization of the plate simulation
            var interval = 100; //refresh rate in milliseconds
	    var deviceAttributes = plate.deviceLEDs()["colors"];
	    LEDselect();
	    
	    function LEDselect() {
		// Generates LED selection dropdown menu for simulation
		// (populates device LEDs)
		$('.LED-display').children().remove();
                $('.LED-display').append($('<option>', { "value" : 0 }).text("All LEDs")); 
                for (var i = 0; i < deviceAttributes.length; i++) {
                    $('.LED-display').append($('<option>', { "value" : (i+1) }).text("LED:" +
                                                             plate.deviceLEDs()["waves"][i])); 
                }
	    }
	    
	    function getStepMagnitude() {
		// Determines the number of playback steps advanced each interval
		var sliderValue = parseFloat($(".sim-speed").val())/parseFloat($(".sim-speed").prop('max')); // Percent value in [0,1]
                var stepMagnitude = Math.round(1680.0*Math.pow(sliderValue,3) - 2520.0*Math.pow(sliderValue,2) + 1270.0*sliderValue + 1);
                if (stepMagnitude < 1) {
                    stepMagnitude = 1;
                }
                return stepMagnitude;
	    }
	    
            function getMaxSteps() {
		// Gets the maximum number of steps of the simulation
		return plate.numPts - 1;
	    }
	    
            function playWellSim() {
		// Starts playing the well simulation from the current time
		// If the full simulation just played restart it:
		if (currentStep >= getMaxSteps()) {
                    currentStep = 0;
                    updateTime(currentStep / getMaxSteps());
                }
                intervalFunc = setInterval(timestep, interval);
            }
            
            function pauseWellSim() {
		// Pauses the well simulation
                //clearInterval(intervalFunc);
		clearInterval(intervalFunc);
            }
            
            function timestep() {
		// Increments the well simulation one timestep
                updatePlate();
                updateTime(currentStep / getMaxSteps());
                //IncrementStep
                if (currentStep == getMaxSteps()) {
                    clearInterval(intervalFunc);
                    if ($(".play-button").has(".stop-square").length == 1) {
			$(".play-button").children(".stop-square")[0].className = "play-triangle"
		    }
                }
                else {
                    currentStep = currentStep + getStepMagnitude();
                    if (currentStep > getMaxSteps()) {
                        currentStep = getMaxSteps();
                    }
                }
            }
	    
            function updateTime(percent) {
		// Updates the time interface
		function prettyTime(totalSeconds) {
                    function prettyTimeString(num) {
                        return (num < 10 ? "0" : "") + num;
		    }
                    var hours = Math.floor(totalSeconds / 3600);
                    totalSeconds = totalSeconds % 3600;
                    var minutes = Math.floor(totalSeconds / 60);
                    totalSeconds = totalSeconds % 60;
                    var seconds = Math.floor(totalSeconds);
                    // Pad the minutes and seconds with leading zeros, if required
                    hours = prettyTimeString(hours);
                    minutes = prettyTimeString(minutes);
                    seconds = prettyTimeString(seconds);
                    // Compose the string for display
                    return hours + ":" + minutes + ":" + seconds;
                }
                var time = percent * plate.totalTime / 1000.0;
                $(".elapsed-time-vis").val(percent);
                $(".elapsed-time").text(prettyTime(time));
                //Converts a time in milliseconds to a human readable string
	    }
	    
            function updatePlate(deviceChange) {
		// Redraws the plate view. Takes deviceChange as a boolean input. If deviceChange = undefined, it will evaluate to false
		// and the intensity values will not be changed (temporary feature till actual simulation data is presented)
		deviceChange = deviceChange || false;
                if (deviceChange == true) {
                    deviceAtributes = plate.deviceLEDs()["colors"];
                    currentStep = 0;
                    plate = new Plate($('.LPI-menu'));
                }
                drawPlate(plate.createPlateView(currentStep)); // Passes **index** of current time step, recieves a 3D array of ints.
		// TO DO: fix plate.createPlateView()
	    }
	    
            function drawWellOutline(xArray, yArray, drawOver) {
		// Draws the outline of a well. When given a 1x2 array for X and Y values, draws a
		// black outline for well x[0], y[0] and a dashed outline for well x[1], y[1].
		var spacing = getSpacing($(".columns").val(), $(".rows").val());
                var color = ['#000000', '#FFFFFF']
                var strokeWidth = [3, 2];
                for (var i = 0; i < xArray.length; i++) {
                    initializeWell(xArray[i], yArray[i], spacing, strokeWidth[0]);
                    context.lineWidth = strokeWidth[i];
                    if (i > 0) { context.setLineDash([5]) } //Dashed line
                    //Required to completely draw over previously made dashed line
                    else if (drawOver == true) { context.setLineDash([0]) };
                    context.strokeStyle = color[i];
                    context.stroke();
                    context.closePath();
                }
	    }
	    
            function initializeWell(xPosition, yPosition, spacing, strokeWidth, fill, fillColor) {
		// Creates path/area for canvas to draw in
		context.beginPath();
                context.arc(xPosition * spacing + spacing * 0.5 + strokeWidth,
                            yPosition * spacing + spacing * 0.5 + strokeWidth,
                            spacing * 0.5, 0, 2 * Math.PI, false);
                if (fill == true) {
                    context.fillStyle = fillColor;
                    context.fill();
                }
	    }
	    
            function drawPlate(intensityStep) {
		// Draws a plate given a 3D array of x,y,channel intensities
		var strokeWidth = 3;
                var displayScaleParam = 3;
		var canvas = document.querySelector('canvas');
                canvas.style.width = '100%'; 
                canvas.style.height = '100%';
		console.log("osW:" + canvas.offsetWidth + "   osH:" + canvas.offsetHeight);
                canvas.width = canvas.offsetWidth;
                canvas.height = canvas.offsetHeight;
                var spacing = getSpacing($(".columns").val(), $(".rows").val());
                // Upper bound of LED intensities to be displayed
                var numOfLEDs = ($(".LED-display").val() == 0) ? deviceAttributes.length : $(".LED-display").val() - 1; 
                for (var x = 0; x < $(".columns").val(); x++) {
                    for (var y = 0; y < $(".rows").val(); y++) {
                        //Draw black background
                        initializeWell(x, y, spacing, strokeWidth, true, 'rgba(0,0,0,1)');
                        // Lower bound of LED intensities to be displayed
                        var c = (numOfLEDs  == deviceAttributes.length ) ? 0:numOfLEDs; 
                        context.globalCompositeOperation = "lighter"; //Adds colors together
                        //Draw intensities (alpha modulation)
                        for (c; c < numOfLEDs+1; c++) {
			    var scaledInt = 1-Math.exp(-displayScaleParam*(intensityStep[y][x][c]/plate.maxGSValue));
                            initializeWell(x, y, spacing, strokeWidth, true, deviceAttributes[c] + scaledInt + ')');
                        }
                        context.globalCompositeOperation = "source-over"; //draws outline of well
                        drawWellOutline([x], [y]);
                    }
                }
                //draws selection outline of selected well
                drawWellOutline([undefined, selectedCol-1],[undefined, selectedRow-1]);
	    }
	    
            function getSpacing(xNum, yNum) {
		// Calculates the spacing given current values of the canvas element
		var canvas = document.querySelector('canvas');
		return Math.min(Math.floor((context.canvas.width - 10) / xNum),
                       Math.floor((context.canvas.height - 10) / yNum));
	    }
	    
            function simToggle(){
		// Toggle between playing and pausing the well simulation
		var button = $(".play-button");
		if (button.has(".play-triangle").length == 1) {
		    // Simulation is stopped
		    pauseWellSim();
		}
		else if (button.has(".stop-square").length == 1) {
		    // Simulation is playing
		    playWellSim();
		}
	    }
	    
            function refresh() {
		// Resets simulation back to time 0
		currentStep = 0;
                if ($(".play-button").has(".play-triangle").legnth == 1) {
		    // make it play
		    simToggle();
		}
                timestep();
	    }
	    
	    //----------------------------------------------//
            //------------User Initiated Events-------------//
            //----------------------------------------------//

            // Hides the download button (if visible) after a change to the
            // the randomization radio button
            $(".randomized").change(function () {
		hideDownload();
            });
        
           $(".offSwitch").change(function () {
                hideDownload();
            });
            
            // Updates the LEDs/channels to be displayed in the simulation
            $(".LED-display").change(function () {
                updatePlate();
            });

            // Updates the speed of the simulation;
            // If playing, pauses sim, updates speed of simulation, unpauses sim
            $(".speed").change(function () {
                if ($(".play-button").has(".stop-square").length == 1) {
		    // Sim is playing; toggle twice to stop & restart with correct playback speed
		    simToggle();
		    simToggle();
		}
            });

            // Toggles the playing of the simulation
            $(".play-button").click(function () {
                if (this.childNodes[0].className === "play-triangle") {
                    this.childNodes[0].className = "stop-square";
                } else {this.childNodes[0].className = "play-triangle";}
                simToggle();
            });

            // Udates simulation and displayed time after every time step
            $(".elapsed-time-vis").change(function () {
                currentStep = Math.round($(".elapsed-time-vis").val() * getMaxSteps());
                updatePlate();
                updateTime(currentStep / getMaxSteps());
            });

            // Redraws the wells when a custom number of rows or columns is input by the user
            $(".rows, .columns").change(function () {
                updatePlate(deviceChange = true);
            });

            // Listen for 'Simulate' click --> on click, calculate output & serve file
            $('.simulate').click(function(event){
                // Error validation should happen here
                var startTimer = new Date().getTime();
                var errorsOccurred = false;
                if (debug) {
                    plate = new Plate($('.LPI-menu'));
		    console.log("Simulate hit.");
                }
                else {
                    try {
                    plate = new Plate($('LPI-menu'));
                    }
                    catch(e) {
                        errorsOccurred = true;
                        errorManager(e);
                    }
                }
                if (!errorsOccurred) {
                    revealDownload();
                    //Updates plate; sets sim time back to 0
                    if ($(".view-type").html() == "Plate View") {
			$(".plate-sim").show();
			refresh();
			$(".plate-sim").hide();
			chart.updateData();
                    } else { refresh() };
                }
                var endTimer = new Date().getTime();
                var elapsedTime = endTimer - startTimer;
                console.log("Elapsed time: " + elapsedTime)
            });

            // When clicked, simulation is downloaded
            $(".download").click(function () {
		var startTimer = new Date().getTime();
                plate.createLPF();
		var endTimer = new Date().getTime();
		var elapsedTime = endTimer - startTimer;
		console.log("LPF creation time: " + elapsedTime)
            });
	    
	    // Hides the light input graph
	    $(".popup-graph").find(".close").click(function() {
		$(".popup-graph").hide();
	    });

            // Redraws wells to fit the window after resizing; does not resize if plate is hidden
            $(window).resize(function () {
                if ($(".view-type").html() == "Well View") {
                    updatePlate();
                } else {
                    null;
                }
            });

            // Called when a well is clicked on
            $(".canvas").click(function (e) {
                var parentOffset = $(this).offset();
                var relX = e.pageX - parentOffset.left;
                var relY = e.pageY - parentOffset.top;
                var xNum = $(".columns").val();
                var yNum = $(".rows").val();
                var spacing = getSpacing(xNum, yNum);
                var realxNum = Math.ceil(relX / spacing);
                var realyNum = Math.ceil(relY / spacing);
                if (realxNum <= xNum && realyNum <= yNum) {
                    var col = Math.min(Math.ceil(relX / spacing), xNum);
                    var row = Math.min(Math.ceil(relY / spacing), yNum);
                    var spacing = getSpacing($(".columns").val(), $(".rows").val())
                    $(".row-index").text(row);
                    $(".column-index").text(col);
                    var wellI = (row-1)*parseInt($(".columns").val()) + col;
                    $(".well-index").text(wellI);
                    drawWellOutline([selectedCol-1, col-1], [selectedRow-1, row-1], true); //0 indexing
                    selectedRow = row;
                    selectedCol = col;
                }
            });
	    
	    return {
                init: function (deviceChange) {
                    updatePlate(deviceChange);
                },
                pauseWellSim: function() {
                    pauseWellSim();
                },
                refresh: function() {
                    refresh();
                },
                drawSelection: function(x,y, drawOver) {
                    drawWellOutline(x, y, drawOver);
                }
            }
	})();
	
	
	var chart =(function() {
	    //Creates the chart
            var chartReference;
            var chartData = []; // list of data objects, can be updated to dyanmically update chart
            function createChart() {
            chartReference = new CanvasJS.Chart("wellSim",
                {
                title: {
                        text: "Time Course for Well",
                        fontSize: 32,
                            fontFamily: 'helvetica'
			},
                zoomEnabled: true, 
                axisX: {
                        valueFormatString: "###",
                        labelFontSize: 22,
                        titleFontSize: 24,
                        titleFontFamily: 'helvetica',
                        title: "Time (min)",
                        minimum: -1
                    },
                axisY: {
                        minimum: 0,
                        maximum: 4100,
                        interval: 500,
                        labelFontSize: 22,
                        titleFontSize: 24,
                        titleFontFamily: 'helvetica',
                        title: "Intensity (GS)"
		    },
                toolTip: {
			shared: true,
                        borderColor: 'white'
                    },
                legend: {
                        fontFamily: "helvetica",
                        cursor: "pointer",
                        itemclick: function (e) {
			    console.log("legend click: " + e.dataPointIndex);
                            console.log(e);
                            if (typeof (e.dataSeries.visible) === "undefined" || e.dataSeries.visible) {
                                   e.dataSeries.visible = false;
                            } else {
                                   e.dataSeries.visible = true;
                            }
                            chartReference.render();
                        },
                        fontSize: 16,
                    },
                data: chartData
                });
                privateUpdateData();
            }
            //Updates the data displayed on the chart to current data
            function privateUpdateData() {
                //Removes old data from array
                //Could be done more concisely....
                while(chartData.length!=0) {
                   chartData.shift();
                }
                //Gives the data array of the chart the new data points
                var wellNum = (selectedRow-1)*parseInt($(".columns").val()) + (selectedCol-1);
                var channelColors = plate.deviceLEDs().hex;
		// pull data for each channel of the selected tube
		var dataPoints = plate.createTimecourse(wellNum);
		for (var i=0;i<plate.channelNum;i++) {
		    // set data point properties
		    var dp = {
		        type: "stepLine",
		        showInLegend: true,
		        lineThickness: 2,
		        name: "Channel " + i,
		        markerType: "none",
		        color: channelColors[i],
		        dataPoints: dataPoints[i]
		        }
		    if (i==0) {
		        dp.click = function(e) {
		            currentStep = e.dataPoint.x*1000*60/plate.totalTime*(plate.numPts-1);
			    // TO DO: I don't think this works...
		        }
		    }
		    // add to data array
		    chartData.push(dp);
		}
            }
            createChart();
            //For correct sizing chart must be in a block display upon creation
            //but can be hidden after it is created
            $(".well-sim").css('visibility', 'hidden');
            return {
                updateData : function() {
                    privateUpdateData();
                    chartReference.render();
                }
            }
	});
	
	// Toggle between types of visualization
	$(".view-type").click(function () {
            var button = $(".view-type");
            if (button.text() == "Plate View") {
                $(".well-sim").css('visibility', 'hidden');//have to change visibility not display so that chart resizes automatically
                $(".plate-sim").show();
                button.text("Well View");
                plateManager.init();
            }
            else if (button.text() == "Well View") {
                if ($(".play-button").has(".stop-square").length == 1) {
		    plateManager.pauseWellSim();
		    $(".play-button").children(".stop-square").className = "play-triangle";
		}
                $(".plate-sim").hide();
                $(".well-sim").css('visibility', 'visible');
                button.text("Plate View");
                //chart.updateData();
		// TO DO: add chart
            }
        });
	
	$(document).keyup(function (e){ 
            var row = selectedRow;
            var col = selectedCol;
            //var controllerWidth = $("#wellIndex").width() + $("#wellIndex2").width();
            // up arrow
            if (e.keyCode == 38) { 
                if (row != 1) { row-- } 
                else if (row == 1 & col != 1) { 
                    row = parseInt($(".rows").val());
                    col--; 
                } else {
                    row = parseInt($(".rows").val());
                    col = parseInt($(".columns").val()); 
                }
            }
            // down arrow
            else if (e.keyCode == 40) {   
                if (row != parseInt($(".rows").val())) { row++; }
                else if (row ==  parseInt($(".rows").val()) & col != parseInt($(".columns").val())){ 
                    row = 1; 
                    col++;
                } else {
                    row = 1;
                    col = 1;
                }
            } 
            // left arrow 
            else if (e.keyCode == 37) { 
                if (col == 1 & row != 1) { col = parseInt($(".columns").val()); row--; }
                else if (col == 1 & row == 1) { undefined } else { col-- }
            // right arrow
            } else if (e.keyCode == 39) {   
                if (col == parseInt($(".columns").val()) & row != parseInt($(".rows").val())) { col = 1; row++; }
                else if (col == parseInt($(".columns").val()) & row == parseInt($(".rows").val())) { undefined }
                else { col++ }
            }
            plateManager.drawSelection([selectedCol-1, col-1], [selectedRow-1, row-1], true); //0 indexing; draws selection ring
            selectedRow = row;
            selectedCol = col;
            $(".row-index").text(row);
            $(".column-index").text(col);
            var wellI = (row-1)*parseInt($(".columns").val()) + col;
            $(".well-index").text(wellI);
            if ($(".view-type").text() == "Plate View") {
                chart.updateData();
            }
            //if (controllerWidth != ($("#wellIndex").width() + $("#wellIndex2").width())) {
            //    plateManager.updateRangeBars();
            //}
	    //TO DO: delete this if updateRangeBars is deleted
        });

        return {
            init: function () {
               plateManager.init(true);
            },
            updateDisplayedLEDs: function () {
                var newLEDnum = $(".LED-quantity").val(); //The currently selected number of LEDs
                var maxLEDnum = $(".LED-quantity").attr("max"); //The maximum number of LEDs
		var wavelengths=[];
		$(".LED-select-wavelength").each(function(index,elem){
		    wl = $(elem).val();
		    if (wl == "") {
			// no value entered
			// TO DO: decide how to handle (#defaults)
			// TO DO: possible make this function (getWavelengths) higher level; it's copied in 2 spots
			// For now: use placeholder value (+unique)
			wl = $(elem).attr("placeholder");
		    }
		    wavelengths.push(wl);
		});
		console.log(wavelengths);
                //=======================================
                //Manage LEDs in visualization
                var displayedLEDs = $(".LED-display").children(); //A list of current LED drop-down display options
                //If there are too many LED objects remove the ones at the end
                if (displayedLEDs.length - 1 > newLEDnum) {
                    //Iterate through all the LEDs and start removing them when the current number is surpassed
                    displayedLEDs.each(function (index, elem) {
                        if (index >= newLEDnum) {
                            $(elem).remove();
                        }
                    });
                }
                //If there are too few LED objects append on more
                else if (displayedLEDs.length - 1 < newLEDnum) {
                    for (var i = displayedLEDs.length-1; i < newLEDnum && i < maxLEDnum; i++) {
                        //Pull and clone the html template of an LED
                        var newLED = $(".LED-display").children().last().clone(); 
                        newLED.css("display", "inline");
			console.log("Adding Display LED: " + i + " / " + wavelengths[i]);
			newLED.val(i);
			newLED.text(wavelengths[i]);
                        //Bind event listener
                        //Add the modified LED html to the page
                        $(".LED-display").append(newLED);
                    }
                }
		// Fix LED name & position
		displayedLEDs.each(function(index, elem) {
		    if (index > 0) { // First always stays unchanged
			$(elem).val(index);
			$(elem).text(wavelengths[index-1] + "nm");
		    }
		})
            },
            refresh: function () {
                plateManager.refresh();
            },
            updateChart: function () {
                chart.updateData();
            }
        }
    })();
    
    
    var inputsManager = (function (simulation) {
	//Register listener for adding waveform groups
        $(".new-experiment").click(function () {appendWGroup();});
	    
	    // Shows the light input graph
	    // TO DO: make it specific to the WFG chosen
	    $(".graph-button-wrapper").click(function () {
		$(".popup-graph").show();
	    });
	
        function appendWGroup() {
	    // Appends a new waveform group to the input form
	    // TO DO: minimize existing experiments to save space
            var newWGroup = $(".experiment-wrapper.template").clone();
            newWGroup.removeClass("template");
            //Register button listeners
            $(".experiment-wrapper.template").after(newWGroup);
            newWGroup.find(".const-select").click(function () {
                addFunc("const",newWGroup);
            });
            newWGroup.find(".step-select").click(function () {
                addFunc("step",newWGroup);
            });
            newWGroup.find(".sine-select").click(function () {
                addFunc("sine",newWGroup);
            });
            newWGroup.find(".arb-select").click(function () {
                addFunc("arb",newWGroup);
            });
	    newWGroup.find(".close-experiment").click(function () {
		newWGroup.toggle();
		setTimeout(function() { newWGroup.remove()}, 300);
	    });
	    newWGroup.find(".graph-button-wrapper").click(function () {
		populatePopup(newWGroup); // TO DO: Passes whole WFG. May also need to know WFG's index?
	    });
	    newWGroup.find(".min-max-experiment").click(function () {
		newWGroup.find(".experiment-details").toggle();
		newWGroup.find(".waveform-selection").toggle();
		newWGroup.find(".waveform-inputs").toggle();
		var minMaxArrow = newWGroup.find(".min-max-experiment");
		var minimized = minMaxArrow.hasClass("minimized");
		if (minimized) {
		    // Currently minimized; need to maximize
		    minMaxArrow.removeClass("minimized");
		}
		else {
		    // Currently maximized; need to minimize
		    minMaxArrow.addClass("minimized");
		}
	    });
	    newWGroup.find(".samples").change(function () {
		updateWellCounts();
	    });
            return newWGroup;
        }
	
        function addFunc(funcType,wGroup) {
	    // Adds a new function to a waveform to a waveform group
            var type = funcType;
            var newFunc = wGroup.find("." + type + "-input.template").clone();
            newFunc.removeClass("template");
            // Have to add 'required' attribute to const intensities & step amplitude lists.
            // Can't add to template b/c Chrome gets mad trying to validate hidden fields...
	    wGroup.find(".waveform-inputs").prepend(newFunc);
            var animateSpeed = 300;
            newFunc.hide().toggle(animateSpeed);
            if (type == 'const' || type == 'step') {
                var reqdBox = newFunc.find("input.ints");
                reqdBox.prop('required', true);
		reqdBox.change(function () {
		   updateWellCounts(); 
		});
            }
            // TO DO: Create new spreadsheet table for arbs
            //if (funcType=='arb') {
            //    $(newFunc.find(".arbTable"))
            //    $(newFunc.find(".arbTable")).handsontable({
            //        colHeaders: ["Time [m]", "Intensity [gs]"],
            //        contextMenu: false,
            //        height: 100,
            //        width: 180,
            //        minSpareRows: 1,
            //        columns: [{
            //            type: 'numeric'
            //        }, {
            //            type: 'numeric'
            //        }],
            //        cells: function (row, col, prop) {
            //            var cellProperties = {}
            //            if (row === 0 && col === 0) {
            //                cellProperties.readOnly = true;
            //                type = "string"
            //            }
            //            return cellProperties;
            //        },
            //        data: [
            //            ["Initial", "0"]
            //        ],
            //    });
            //}
            //Adds on new waveform group
            //Minimizes function window
            newFunc.find(".waveform-divider").click(function () {
		console.log("Divider clicked!");
		// Toggle minimize / maximize
		var minMaxArrow = newFunc.find(".min-max-wave");
		var minimized = minMaxArrow.hasClass("minimized");
		if (minimized) {
		    // Currently minimized; need to maximize
		    minMaxArrow.removeClass("minimized");
		    newFunc.find(".input-wrapper").fadeIn("slow");
		    newFunc.find(".wavelength-mini").css("visibility", "hidden");
		}
		else {
		    // Currently maximized; need to minimize
		    minMaxArrow.addClass("minimized");
		    newFunc.find(".input-wrapper").hide();
		    newFunc.find(".wavelength-mini").text("| " + newFunc.find(".wavelength-selector").val() + "nm");
		    newFunc.find(".wavelength-mini").css("visibility", "visible");
		}
            });
            //Removes and closes the selected function
            newFunc.find(".close").click(function () {
                var func = $(this).parents("."+type+"-input");
                func.toggle(animateSpeed);
                setTimeout(function() { func.remove(); updateWellCounts();}, animateSpeed);
                hideDownload();
                // clears the function from the simulation; if in chart, clears chart
                if ($(".view-type").text() == "Plate View") {
                    $(".plate-sim").show();
                    simulationManager.refresh();
                    simulationManager.init(false);
                    $(".plate-sim").hide();
                    simulationManager.updateChart();
                } else {
                    simulationManager.refresh();
                    simulationManager.init(false);
                }
            });
            return newFunc;
        }
	
	function populatePopup(WFG) {
	    // Writes plot to popup for the given WFG
	    // TO DO: may need to also pass the WFG's index so it can be found in Plate? Depends how chart is implemented.
	    var popup = $(".popup-graph");
	    var wellLow = WFG.find(".first-well").text();
	    var wellHigh = WFG.find(".last-well").text();
	    popup.find(".title").text("Test Title (Wells: " + wellLow + "-" + wellHigh + ")");
	    $(".popup-graph").show();
	}
	
	function updateWellCounts() {
	    // Iterates through all WFGs and updates their displayed well ranges
	    var wellsUsed = 0;
	    $(".experiment-wrapper").not(".template").each(function (expIndex, expElem) {
		expElem = $(expElem);
		var channelNum = parseInt($(".LED-quantity").val());
		// Number of constant/step input amplitudes in each channel (zero-filled arrays)
		var constAmpNum = 0;
		var stepAmpNum = 0;
		var sampleNum = expElem.find(".samples").val(); // TO DO: don't pull this if timepoint spreadsheet is used
		// Search through all const inputs
		expElem.find(".const-input").not(".template").each(function (wfIndex, wfElem) {
		    constAmpNum += JSON.parse("[" + $(wfElem).find("input.ints").val() + "]").length;
		});
		// Search through all step inputs
		expElem.find(".step-input").not(".template").each(function (wfIndex, wfElem) {
		    stepAmpNum += JSON.parse("[" + $(wfElem).find("input.ints").val() + "]").length;
		});
		var totalWells = Math.max(constAmpNum, 1) * Math.max(stepAmpNum, 1) * sampleNum;
		var lowWell = wellsUsed + 1;
		var highWell = lowWell + totalWells - 1;
		wellsUsed += totalWells;
		console.log("Total wells: " + totalWells + "  //  low well: " + lowWell + "  //  high well: " + highWell + "  //  wells used: " + wellsUsed);
		// TO DO: deal with case where too many LEDs are being used! (#error)
		if (wellsUsed > parseInt($(".rows").val()) * parseInt($(".columns").val()) ) {
		    // Too many wells!
		    console.log("Too many wells used!! (error)");
		}
		// Set values
		expElem.find(".first-well").text(lowWell);
		expElem.find(".last-well").text(highWell);
	    });
	}
	
	function updateWavelengths(wavelengths) {
            //Set the number of LEDs in the functions to the current number in the device specs
            //Accomplish this by adding or truncating LEDs where necessary
            //Iterate through each function's wavelength select
            var num=$(".LED-quantity").val();
            //Iterate through different drop down menus
            $("select.wavelength-selector").each(function (index, elem) {
                var entry = $(elem);
                var currentLen = entry.children().length;
                //If there are too few LEDs add more
                for(;wavelengths.length>currentLen;currentLen++){
                    entry.append($('<option/>').val(0));
                }
                //If there are too many LEDs truncate some
                for(;wavelengths.length<currentLen;currentLen--){
                    entry.children().last().remove();
                }
            });
            //Iterates through each of the option menus and sets the wavelengths approriately
            $("select.wavelength-selector").each(function (i,select) {
                //Iterate through options in dropdown menue
                $(select).children().each(function(index,elem) {
                    $(elem).val(wavelengths[index]);
		    $(elem).text(wavelengths[index]);
                });
            });
        }
	
	function update() {
            //Device selected
            var device = $(".devices").val()
            if (device == "custom") {
                $(".custom-config").show();
            }
            else {
                $(".custom-config").hide();
                if (device == "LTA") { setDeviceFields(8, 8, plate.deviceLEDs()["waves"]); }
                else if (device == "LPA") { setDeviceFields(4, 6, plate.deviceLEDs()["waves"]); } 
                else if (device == "TCA") { setDeviceFields(8, 12, plate.deviceLEDs()["waves"]); }
                else if (device == "OGS") { setDeviceFields(4, 12, plate.deviceLEDs()["waves"]); }
            }
            simulation.init(true);
        }
	
        //Listen for changes to the device selector
        $(".devices").change(function () {
            update();
        });
	
	$(".LED-select-wavelength").change(function () {
	    updateWavelengths(getWavelengths());
	    simulation.updateDisplayedLEDs();
	});
	
	function setDeviceFields(rows, columns, wavelengths) {
            $(".rows").val(rows);
            $(".columns").val(columns);
            //Set wavelength values for the device
            setWavelengthValues(wavelengths);
            //Update wavelengths in the inputs
            updateWavelengths(getWavelengths());
            //Update the LEDs displayed in the simulation
            simulation.updateDisplayedLEDs();
        }
	
	function setWavelengthValues(wavelengths) {
            //Updates the number of entries to match the array
	    console.log("Wavelengths:\n"+wavelengths+"\nLength: " + wavelengths.length);
            $(".LED-quantity").val(wavelengths.length);
            updateWavelengthNumber();
            //Sets the entries to those in the array
            $(".LED-select-wavelength").each(function(index,elem) {
               $(elem).val(wavelengths[index]);
            });
        }
	
	function updateWavelengthNumber() {
            //Update LED number
            var newLEDnum = $(".LED-quantity").val(); //The currently specified number of LEDs
            var maxLEDnum = $(".LED-quantity").attr("max"); //The maximum number of LEDs
            if (newLEDnum>maxLEDnum) {
                newLEDnum=maxLEDnum;
            }
            //===================================
            //Manage LEDs in inputs
            var currentLEDnum = $(".LED-wavelength-wrapper").length;
            //If there are too many LED objects remove the ones at the end
            for(;currentLEDnum>newLEDnum;currentLEDnum--) {
                $(".LED-wavelength-wrapper").last().remove();
            }
            //If there are too few LED objects add more
            for(;currentLEDnum<newLEDnum;currentLEDnum++){
                var newLED = $(".LED-wavelength-wrapper").last().clone(); //Pull and clone the html of an LED
		//Add the modified LED html to the page
                $(".LED-wavelength-wrapper").last().after(newLED);
                //Change the text
                newLED.find(".LED-number").text((currentLEDnum + 1));
                //Bind event listener
                newLED.find(".LED-select-wavelength").bind("change", function () {
                    updateWavelengths(getWavelengths());
		    simulation.updateDisplayedLEDs();
                });
            }
        }
        function getWavelengths() {
            var wavelengths=[];
            $(".LED-select-wavelength").each(function(index,elem){
		wl = $(elem).val();
		if (wl == "") {
		    // no value entered
		    // TO DO: decide how to handle (#defaults)
		    wl = $(elem).attr("placeholder");
		}
                wavelengths.push(wl);
            });
            return wavelengths;
        }
        //Event listening to changes in LED number
        $(".LED-quantity").change(function () {
            updateWavelengthNumber();
            updateWavelengths(getWavelengths());
            simulation.updateDisplayedLEDs();
        });
        update();
	
	function loadInputs(plate) {
            deviceInputs = plate.inputs;
            setDeviceFields(deviceInputs[".rows"],deviceInputs[".columns"],deviceInputs[".LED-select-wavelength"]);
            $(".randomized").prop('checked', deviceInputs[".randomized"]);
            $(".offSwitch").prop('checked', deviceInputs[".offSwitch"]);
            //Create waveform groups
            for(var i = 0; i<plate.wellArrangements.length;i++) {
                console.log(plate.wellArrangements);
                var wellArrangement = plate.wellArrangements[i];
                console.log(wellArrangement,i);
                //Set waveform group inputs
                var newGroup = appendWGroup();
                //Get dictionary where the keys are selectors and the values or .val() for those fields
                //Iterate over the dictionary seeting those DOM elements vals
                var wellInputs = wellArrangement.inputs;
                for (var key in wellInputs) {
                    if (wellInputs.hasOwnProperty(key)) {
                        newGroup.find(key).val(wellInputs[key]);
                    }
                }
                //Set waveforms
                var waveformInputs = wellArrangement.waveformInputs;
                for (var j = 0; j < waveformInputs.length; j++) {
                    var waveformInput = waveformInputs[j];
                    //Create waveforms
                    var newFunc = addFunc(waveformInput.type,newGroup);
                    //Get dictionary where the keys are selectors and the values or .val() for those fields
                    //Iterate over the dictionary seeting those DOM elements vals
                    var waveformInputInputs = waveformInput.inputs;
                    console.log(waveformInputInputs);
                    for (var key in waveformInputInputs) {
                        if (waveformInputInputs.hasOwnProperty(key)) {
                            newFunc.find(key).val(waveformInputInputs[key]);
                            console.log(key,waveformInputInputs[key]);
                        }
                    }
                }
            }
        }
	
	function readSingleFile(evt) {
            //Retrieve the first (and only!) File from the FileList object
            var f = evt.target.files[0]; 
            if (f) {
                var r = new FileReader();
                r.onload = function(e) { 
                    var contents = e.target.result;
                    var plate = JSON.parse(contents);
                    console.log(plate);
                    loadInputs(plate);
                }
                r.readAsText(f);
            } else { 
                alert("Failed to load file");
            }
        }
	
	//document.getElementById('loadLPI').addEventListener('change', readSingleFile, false);
	// TO DO: figure out how to get a div to work instead of an input element... if possible.
	
    })(simulationManager);
    
    function hideDownload() {
	if ($(".download").is(":visible")) {
            $(".download").hide();
            $(".simulate").css("width", "calc(100% - 10px)");
            $(".simulate").html('Load New Simulation');
            $(".simulate").hide().fadeIn("slow");
        }
    }
    
    function revealDownload() {
	// Reveals the download button next to the simulation button
	//if ($(".func").not(".template").length != 0) {
	// TO DO: check that there is something to simulate once templates are fixed
	// #errors: should only be revealed when there's no errors
	$(".simulate").css("width", "calc(50% - 10px)")
	$(".simulate").prop("value", "Reload Simuation")
	$(".simulate").hide().fadeIn("slow");
	$(".download").fadeIn("slow").show();
	//}
    }
})();