var LPI = (function () {
    var canvas = document.getElementsByTagName('canvas');
    var context = canvas[0].getContext('2d');
    
    // Plate object holds all the intensities and device variables.
    // It also parses the input functions, updates the intensities, and writes the output file.
    //var plate = new Plate($('.LPI-menu'));
    var plate = null;

    var simulationManager = (function () {
	// Manages the Right workspace, the simulation
	var selectedRow = 1; //Default selected row
        var selectedCol = 1; //Default selected column
        var currentStep = 0; // index of current step in simulation
        var intervalFunc; //Stores most recent interval function (setInterval())
	
	var plateManager = (function () {
	    // Manages the visualization of the plate simulation
            var interval = 100; //refresh rate in milliseconds
	    
	    function LEDselect() {
		// Generates LED selection dropdown menu for simulation
		return
	    }
	    
	    function getStepMagnitude() {
		// Determines the number of playback steps advanced each interval
		return
	    }
	    
            function getMaxSteps() {
		// Gets the maximum number of steps of the simulation
		return
	    }
	    
            function playWellSim() {
		// Starts playing the well simulation from the current time
		// If the full simulation just played restart it:
		return
            }
            
            function pauseWellSim() {
		// Pauses the well simulation
                //clearInterval(intervalFunc);
		return
            }
            
            function timestep() {
		// Increments the well simulation one timestep
                return
            }
	    
            function updateTime(percent) {
		// Updates the time interface
		return
	    }
	    
            function drawRangeBars(spacing) {
		// Resizes range bars (simulation progress and simulation speed bars) to
		// width of plate.
		return
	    }
	    
            function updatePlate(deviceChange) {
		// Redraws the plate view. Takes deviceChange as a boolean input. If deviceChange = undefined, it will evaluate to false
		// and the intensity values will not be changed (temporary feature till actual simulation data is presented)
		return
	    }
	    
            function drawWellOutline(xArray, yArray, drawOver) {
		// Draws the outline of a well. When given a 1x2 array for X and Y values, draws a
		// back outline for well x[0], y[0] and a dashed yellow outline for well x[1], y[1].
		return
	    }
	    
            function initializeWell(xPosition, yPosition, spacing, strokeWidth, fill, fillColor) {
		// Creates path/area for canvas to draw in
		return
	    }
	    
            function drawPlate(intensityStep) {
		// Draws a plate given a 3D array of x,y,channel intensities
		return
	    }
	    
            function getSpacing(xNum, yNum) {
		// Calculates the spacing given current values of the canvas element
		return
	    }
	    
            function simToggle(){
		// Toggle between playing and pausing the well simulation
		return
	    }
	    
            function revealDownload() {
		// Reveals the download button next to the simulation button
		return
	    }
	    
            function refresh() {
		// Resets simulation back to time 0
		return
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
            
            //Updates the LEDs/channels to be displayed in the simulation
            $(".LED-display").change(function () {
                updatePlate();
            });

            //Updates the speed of the simulation;
            // If playing, pauses sim, updates speed of simulation, unpauses sim
            $(".speed").change(function () {
                if ($("#play").val() == "Pause") {
                   simToggle();
                   simToggle();
                }
            });

            //Toggles the playing of the simulation
            $(".play-button").click(function () {
                simToggle();
            });

            //Udates simulation and displayed time after every time step
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
                plate.createLPF();
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
	})();
    })();
    
})();