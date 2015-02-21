var debug = true;
var LPI = (function () {
    var canvas = document.getElementsByTagName('canvas');
    var context = canvas[0].getContext('2d');
    
    // Plate object holds all the intensities and device variables.
    // It also parses the input functions, updates the intensities, and writes the output file.
    //var plate = new Plate($('.LPI-menu'));
    var plate = null;
    if (debug) {
	// Load up some default values for Plate obj
	plate = {};
	plate.rows = 8;
	plate.columns = 12;
	plate.channelNum = 4;
	plate.totalTimeInput = $(".time").val();
	if (plate.totalTimeInput == '') {
	    // default
	    // TO DO: use error checking to make sure this doesn't happen
	    plate.totalTimeInput = "480";
	}
        plate.randomized = $(".randomized");
        plate.offOnFinish = $(".offSwitch");
	plate.totalTime = Math.floor(plate.totalTimeInput * 60 * 1000); // in ms
        plate.timeStep = 1000; // in ms
        plate.minimumTS = 1000; // ms -- minimum time step
        plate.numPts = Math.floor(plate.totalTime/plate.timeStep + 1);
        plate.maxGSValue = 4095;
        plate.times = new Array(plate.numPts);
        plate.timesMin = new Array(plate.numPts);
        for (var i=0; i<plate.times.length; i++) {
            plate.times[i] = plate.timeStep * i;
            plate.timesMin[i] = plate.times[i]/60/1000;
        }
	plate.deviceLEDs = function() {
	    var plateType = $(".devices").val();
	    if (plateType == null) {
		// need to deal with default load-up value
		// for now: set as TCA
		var defaultDevice = "TCA";
		$(".devices").val(defaultDevice)
		plateType = defaultDevice;
	    }
            var LEDcolors = [];
	    var LEDwaves = [];
	    var LEDhex = [];
	    if (plateType == "LTA") {
		//LEDcolors = ['rgba(196,0,0,', 'rgba(0,255,0,', 'rgba(0,0,255,', 'rgba(255,0,0,'];
		LEDcolors = ['rgba(255,0,0,', 'rgba(0,201,86,', 'rgba(0,90,222,', 'rgba(99,0,0,'];
		LEDwaves = [650, 510, 475, 700];
		LEDhex = ['#FF0000', '#00C956', '#005ADE', '#630000'];
	    } else if (plateType == "LPA") {
		//LEDcolors = ['rgba(255,0,0,', 'rgba(0,255,0,'];
		LEDcolors = ['rgba(255,0,0,', 'rgba(0,201,86,'];
		LEDwaves = [650, 510];
		LEDhex = ['#FF0000', '#00C956'];
	    } else if (plateType == "TCA") {
		//LEDcolors = ['rgba(255,0,0,', 'rgba(0,255,0,'];
		LEDcolors = ['rgba(255,0,0,', 'rgba(0,201,86,'];
		LEDwaves = [650, 510];
		LEDhex = ['#FF0000', '#00C956'];
	    } else if (plateType == "OGS") {
		//LEDcolors = ['rgba(255,0,0,', 'rgba(0,255,0,'];
		LEDcolors = ['rgba(255,0,0,', 'rgba(0,201,86,'];
		LEDwaves = [650, 510];
		LEDhex = ['#FF0000', '#00C956'];
	    } else if (plateType == "custom") {
		//var numLED = $("#LEDnum").val();
		//LEDcolors = ['rgba(255,0,0,', 'rgba(0,255,0,', 'rgba(0,0,255,', 'rgba(50,50,50,'];
		LEDcolors = ['rgba(255,0,0,', 'rgba(0,201,86,', 'rgba(0,90,222,', 'rgba(99,0,0,'];
		LEDwaves = [650, 510, 475, 700]
		LEDhex = ['#FF0000', '#00C956', '#005ADE', '#630000'];
		// Will make this actually function after refactering of "custom" LED code
	    }
	    return {colors: LEDcolors,
		    waves: LEDwaves,
		    hex: LEDhex};
	}
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
		console.log(sliderValue);
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
                    //$("#play").val("Play"); // TO DO: switch to pause button (FE)
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
	    
            function drawRangeBars(spacing) {
		// Resizes range bars (simulation progress and simulation speed bars) to
		// width of plate.
		
		// TO DO: delete? Might not be necessary w/ new CSS.
		return
	    }
	    
            function updatePlate(deviceChange) {
		// Redraws the plate view. Takes deviceChange as a boolean input. If deviceChange = undefined, it will evaluate to false
		// and the intensity values will not be changed (temporary feature till actual simulation data is presented)
		deviceChange = deviceChange || false;
                if (deviceChange == true) {
                    deviceAtributes = plate.deviceLEDs()["colors"];
                    LEDselect();
                    currentStep = 0;
                    //plate = new Plate($('form')); // TO DO: uncomment
                }
                //drawPlate(plate.createPlateView(currentStep)); // Passes **index** of current time step, recieves a 3D array of ints.
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
                canvas.style.width = '100%'; 
                canvas.style.height = '100%';
                canvas.width = canvas.offsetWidth;
                canvas.height = canvas.offsetHeight;
                var spacing = getSpacing($(".columns").val(), $(".rows").val());
                drawRangeBars(spacing);
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
		return Math.min(Math.floor((context.canvas.width - 10) / xNum),
                       Math.floor((context.canvas.height - 10) / yNum));
	    }
	    
            function simToggle(){
		// Toggle between playing and pausing the well simulation
		// TO DO: Needs pause/stop button (FE)
		return
	    }
	    
            function revealDownload() {
		// Reveals the download button next to the simulation button
		//if ($(".func").not(".template").length != 0) {
		// TO DO: check that there is something to simulate once templates are fixed
                    $(".simulate").css("width", "calc(50% - 10px)")
                    $(".simulate").prop("value", "Reload Simuation")
                    $(".simulate").hide().fadeIn("slow");
                    $(".download").fadeIn("slow").show();
                //}
	    }
	    
            function refresh() {
		// Resets simulation back to time 0
		currentStep = 0;
                //if ($("#play").val() == "Pause") {
                //    simToggle();
                //}
		// TO DO: needs pause/stop button first
                timestep();
	    }
	    
	    //----------------------------------------------//
            //------------User Initiated Events-------------//
            //----------------------------------------------//

            // Hides the download button (if visible) after a change to the
            // the randomization radio button
            $(".randomized").change(function () {
                if ($(".download").is(":visible")) {
                    $(".download").hide();
                    $(".simulate").css("width", "calc(100% - 10px)");
                    $(".simulate").html('Load New Simulation');
                    $(".simulate").hide().fadeIn("slow");
                }
            });
        
           $(".offSwitch").change(function () {
                if ($(".download").is(":visible")) {
                    $(".download").hide();
                    $(".simulate").css("width", "calc(100% - 10px)");
                    $(".simulate").html('Load New Simulation');
                    $(".simulate").hide().fadeIn("slow");
                }
            });
            
            // Updates the LEDs/channels to be displayed in the simulation
            $(".LED-display").change(function () {
                updatePlate();
            });

            // Updates the speed of the simulation;
            // If playing, pauses sim, updates speed of simulation, unpauses sim
            $(".speed").change(function () {
                //if ($("#play").val() == "Pause") {
                //   simToggle();
                //   simToggle();
                //}
		// TO DO: Needs pause/stop button first
            });

            // Toggles the playing of the simulation
            $(".play-button").click(function () {
                simToggle();
            });

            // Udates simulation and displayed time after every time step
            $(".elapsed-time-vis").change(function () {
                currentStep = Math.round($(".elapsed-time-vis").val() * getMaxSteps());
                updatePlate();
                updateTime(currentStep / getMaxSteps());
            });

            //Redraws the wells when a custom number of rows or columns is input by the user
            $(".rows, .columns").change(function () {
                updatePlate(deviceChange = true);
            });

            // Listen for 'Simulate' click --> on click, calculate output & serve file
            $('.simulate').click(function(event){
                // Error validation should happen here
                var startTimer = new Date().getTime();
                var errorsOccurred = false;
                if (debug) {
                    //plate = new Plate($('form'));
		    console.log("Simulate hit.");
                }
                else {
                    try {
                    plate = new Plate($('form'));
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

            //When clicked, simulation is downloaded
            $(".download").click(function () {
		var startTimer = new Date().getTime();
                //plate.createLPF(); // TO DO: create plate.createLPF()
		var endTimer = new Date().getTime();
		var elapsedTime = endTimer - startTimer;
		console.log("LPF creation time: " + elapsedTime)
            });

            //Redraws wells to fit the window after resizing; does not resize if plate is hidden
            $(window).resize(function () {
                if ($(".view-type").html() == "Well View") {
                    updatePlate();
                } else {
                    null;
                }
            });

            //Called when a well is clicked on
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
                    drawRangeBars(spacing);
                }
            });
	    
	    // Hides the light input graph
	    $(".popup-graph").find(".close").click(function() {
		$(".popup-graph").hide();
	    });
	    
	    // Shows the light input graph
	    // TO DO: make it specific to the WFG chosen
	    $(".graph-button-wrapper").click(function () {
		$(".popup-graph").show();
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
                },
                updateRangeBars: function () {
                    var spacing = getSpacing($(".columns").val(), $(".rows").val());
                    drawRangeBars(spacing);
                    console.log("Resize Range Bars")
		    // TO DO: delete?
                }
            }
	})();
	
	
	var chart =(function() {
	    
	});
	
	// Toggle between types of visualization
	$(".view-type").click(function () {
            var button = $(".view-type");
            if (button.text() == "Plate View") {
                $(".well").css('visibility', 'hidden');//have to change visibility not display so that chart resizes automatically
                $(".plate").show();
                button.text("Well View");
                plateManager.init();
            }
            else if (button.text() == "Well View") {
                //if ($("#play").val() == "Pause") {
                //    plateManager.pauseWellSim();
                //    $("#play").val("Play");
                //}
		// TO DO need play/pause functionality
                $(".plate").hide();
                $(".well").css('visibility', 'visible');
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
                //=======================================
                //Manage LEDs in visualization
                var displayedLEDs = $("#LEDsDisplay").children().not(".template"); //A list of current LED display settings
                //If there are too many LED objects remove the ones at the end
                if (displayedLEDs.length > newLEDnum) {
                    //Iterate through all the LEDs and start removing them when the current number is surpassed
                    displayedLEDs.each(function (index, elem) {
                        if (index >= newLEDnum) {
                            $(elem).remove();
                        }
                    });
                }
                //If there are too few LED objects append on more
                else if (displayedLEDs.length < newLEDnum) {
                    for (var i = displayedLEDs.length; i < newLEDnum && i < maxLEDnum; i++) {
                        //Pull and clone the html template of an LED
                        var newLED = $("#LEDsDisplay").children().filter(".template").clone(); 
                        newLED.removeClass("template");
                        newLED.css("display", "inline");
                        //Bind event listener
                        //Add the modified LED html to the page
                        $("#LEDsDisplay").append(newLED);
                    }
                }
            },
            refresh: function () {
                plateManager.refresh();
            },
            updateChart: function () {
                chart.updateData();
            }
        }
    })();
    
})();