var debug = true; // sends errors to the console. Should implement something better in ErrorManager later
var LPI = (function () {
    var canvas = document.getElementsByTagName('canvas');
    var context = canvas[0].getContext('2d');
    // Plate object holds all the intensities and device variables.
    // It also parses the input functions, updates the intensities, and writes the output file.
    var plate = new Plate($('form'));

    var simulationManager = (function () {
        var selectedRow = 1; //Default selected row
        var selectedCol = 1; //Default selected column
        var currentStep = 0; // index of current step in simulation
        var intervalFunc; //Stores most recent interval function (setInterval())

        var plateManager = (function () {
            // derived vars
            var interval = 100; //refresh rate in milliseconds 
            var deviceAtributes = plate.deviceLEDs()["colors"];
            LEDselect(); // generates LED display toggle list for simulation

            //Generates LED selection dropdown menu for simulation
            function LEDselect() {
                $('#LEDdisplay').children().remove();
                $('#LEDdisplay').append($('<option>', { "value" : 0 }).text("All LEDs")); 
                for (var i = 0; i < deviceAtributes.length; i++) {
                    $('#LEDdisplay').append($('<option>', { "value" : (i+1) }).text("LED:" +
                                                             plate.deviceLEDs()["waves"][i])); 
                }
            }
            //Gets the amount of steps that should be advanced each interval
            function getStepMagnitude() {
                var sliderValue = parseFloat($("#speed").val())/parseFloat($("#speed").prop('max')); // Percent value in [0,1]
                var stepMagnitude = Math.round(1680.0*Math.pow(sliderValue,3) - 2520.0*Math.pow(sliderValue,2) + 1270.0*sliderValue + 1);
                if (stepMagnitude < 1) {
                    stepMagnitude = 1;
                }
                return stepMagnitude;
            }
            
            //Gets the maximum number of steps of the simulation
            function getMaxSteps() {
                return plate.numPts - 1;
            }
            
            //Starts playing the well simulation from the current time
            //If the full simulation just played restart it
            function playWellSim() {
                //If stopped at end of run, restart
                if (currentStep >= getMaxSteps()) {
                    currentStep = 0;
                    updateTime(currentStep / getMaxSteps());
                }
                intervalFunc = setInterval(timestep, interval);
            }
            
            //Pauses the well simulation
            function pauseWellSim() {
                clearInterval(intervalFunc);
            }
            
            //Increments the well simulation one timestep
            function timestep() {
                updatePlate();
                updateTime(currentStep / getMaxSteps());
                //IncrementStep
                if (currentStep == getMaxSteps()) {
                    clearInterval(intervalFunc);
                    $("#play").val("Play");
                }
                else {
                    currentStep = currentStep + getStepMagnitude();
                    if (currentStep > getMaxSteps()) {
                        currentStep = getMaxSteps();
                    }
                }
            }
            
            //Updates the time interface
            function updateTime(percent) {
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
                var time = percent * $("#length").val() * 60;
                $("#time").val(percent);
                $("#displayTime").text(prettyTime(time));
                //Converts a time in milliseconds to a human readable string
            }

            //Resizes range bars (simulation progress and simulation speed bars) to
            // width of plate.
            function drawRangeBars(spacing) {
                var plateWidth = spacing * $("#columns").val(); 
                var controlElements = ["#view", "#wellIndex", "#wellIndex2", "#LEDdisplay", 
                                       "label.plate", "#play.plate", "#displayTime"];
                var controllerBaseSize = 0; //seed value
                var buttonPadding = 14; //button padding
                var minSpeedWidth = 10; //look at CSS for value, don't know how to call in JS
                for (el in controlElements) {
                    // var addition = $(controlElements[el]).outerWidth();
                    controllerBaseSize += ($(controlElements[el]).outerWidth(true));
                }
                var speedWidth = plateWidth - controllerBaseSize - buttonPadding;
                $("#time").css("width", plateWidth);
                $("#speed").css("width", (minSpeedWidth > speedWidth) ? minSpeedWidth:speedWidth);
            }

            //Redraws the plate view. Takes deviceChange as a boolean input. If deviceChange = undefined, it will evaluate to false
            // and the intensity values will not be changed (temporary feature till actual simulation data is presented)
            function updatePlate(deviceChange) {
                deviceChange = deviceChange || false;
                if (deviceChange == true) {
                    deviceAtributes = plate.deviceLEDs()["colors"];
                    LEDselect();
                    currentStep = 0;
                    plate = new Plate($('form'));
                }
                drawPlate(plate.createPlateView(currentStep)); // Passes **index** of current time step, recieves a 3D array of ints.
            }
            
            //Draws the outline of a well. When given a 1x2 array for X and Y values, draws a
            // back outline for well x[0], y[0] and a dashed yellow outline for well x[1], y[1].
            function drawWellOutline(xArray, yArray, drawOver) {
                var spacing = getSpacing($("#columns").val(), $("#rows").val());
                var color = ['#000000', '#FFFFFF'] //'rgb(100, 182, 100)' ]; //'#FFFF00'];
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

            //Creates path/area for canvas to draw in
            function initializeWell(xPosition, yPosition, spacing, strokeWidth, fill, fillColor) {
                context.beginPath();
                context.arc(xPosition * spacing + spacing * 0.5 + strokeWidth,
                            yPosition * spacing + spacing * 0.5 + strokeWidth,
                            spacing * 0.5, 0, 2 * Math.PI, false);
                if (fill == true) {
                    context.fillStyle = fillColor;
                    context.fill();
                }
            }

            //Draws a plate given a 3D array of x,y,channel intensities
            function drawPlate(intensityStep) {
                var strokeWidth = 3;
                var displayScaleParam = 3;
                var canvas = document.querySelector('canvas');
                canvas.style.width = '100%'; 
                canvas.style.height = '100%';
                canvas.width = canvas.offsetWidth;
                canvas.height = canvas.offsetHeight;
                var spacing = getSpacing($("#columns").val(), $("#rows").val());
                drawRangeBars(spacing);
                // Upper bound of LED intensities to be displayed
                var numOfLEDs = ($("#LEDdisplay").val() == 0) ? deviceAtributes.length : $("#LEDdisplay").val() - 1; 
                for (var x = 0; x < $("#columns").val(); x++) {
                    for (var y = 0; y < $("#rows").val(); y++) {
                        //Draw black background
                        initializeWell(x, y, spacing, strokeWidth, true, 'rgba(0,0,0,1)');
                        // Lower bound of LED intensities to be displayed
                        var c = (numOfLEDs  == deviceAtributes.length ) ? 0:numOfLEDs; 
                        context.globalCompositeOperation = "lighter"; //Adds colors together
                        //Draw intensities (alpha modulation)
                        for (c; c < numOfLEDs+1; c++) {
                
                var scaledInt = 1-Math.exp(-displayScaleParam*(intensityStep[y][x][c]/plate.maxGSValue));
                            initializeWell(x, y, spacing, strokeWidth, true, deviceAtributes[c] + scaledInt + ')');
                        }
                        context.globalCompositeOperation = "source-over"; //draws outline of well
                        drawWellOutline([x], [y]);
                    }
                }
                //draws selection outline of selected well
                drawWellOutline([undefined, selectedCol-1],[undefined, selectedRow-1]); 
            }

            //Calculates the spacing given current values of the canvas element
            function getSpacing(xNum, yNum) {
                return Math.min(Math.floor((context.canvas.width - 10) / xNum),
                       Math.floor((context.canvas.height - 10) / yNum));
            }

            //Toggle between playing and pausing the well simulation
            function simToggle(){
                var button = $("#play");
                if (button.val() == "Play") {
                    playWellSim();
                    button.val("Pause");
                }
                else if (button.val() == "Pause") {
                    pauseWellSim();
                    button.val("Play");
                }
            }

            //Reveals the download button next to the simulation button
            function revealDownload() {
                if ($(".func").not(".template").length != 0) {
                    $("#submit").css("width", "50%")
                                .css("border-radius", "0px")
                                .css("border-top-left-radius", "28px")
                                .css("border-bottom-left-radius", "28px")
                                .prop("value", "Reload Simuation")
                                .hide().fadeIn("slow");
                    $("#download").fadeIn("slow").show();
                }
            }

            //Resets simulation back to time 0
            function refresh() {
                currentStep = 0;
                if ($("#play").val() == "Pause") {
                    simToggle();
                }
                timestep();
            }

            //----------------------------------------------//
            //------------User Initiated Events-------------//
            //----------------------------------------------//

            //Hides the download button (if visible) after a changed to the
            // the randomization radio button
            $("#randomized").change(function () {
                if ($("#download").is(":visible")) {
                    $("#download").hide();
                    $("#submit").css("width", "100%")
                                .css("border-radius", "28px")
                                .prop("value", "Load New Simuation")
                                .hide().fadeIn("slow");
                }
            });
        
           $("#offSwitch").change(function () {
                if ($("#download").is(":visible")) {
                    $("#download").hide();
                    $("#submit").css("width", "100%")
                                .css("border-radius", "28px")
                                .prop("value", "Load New Simuation")
                                .hide().fadeIn("slow");
                }
            });
            
            //Updates the LEDs/channels to be displayed in the simulation
            $("#LEDdisplay").change(function () {
                updatePlate();
            });

            //Updates the speed of the simulation;
            // If playing, pauses sim, updates speed of simulation, unpauses sim
            $("#speed").change(function () {
                if ($("#play").val() == "Pause") {
                   simToggle();
                   simToggle();
                }
            });

            //Toggles the playing of the simulation
            $("#play").click(function () {
                simToggle();
            });

            //Udates simulation and displayed time after every time step
            $("#time").change(function () {
                currentStep = Math.round($('#time').val() * getMaxSteps());
                updatePlate();
                updateTime(currentStep / getMaxSteps());
            });

            //Redraws the wells when a custom number of rows or columns is inputted by the user
            $("#rows, #columns").change(function () {
                updatePlate(deviceChange = true);
            });

            // Listen for 'Submt' click --> on click, calculate output & serve file
            $('#LPFform').submit(function(event){
                // Error validation should happen here
                event.preventDefault(); // cancels the form submission        
                var startTimer = new Date().getTime();
                var errorsOccurred = false;
                if (debug) {
                    plate = new Plate($('form'));
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
                    if ($("#view").val() == "Plate View") {
                    $(".plate").show();
                    refresh();
                    $(".plate").hide();
                    chart.updateData();
                    } else { refresh() };
                }
                var endTimer = new Date().getTime();
                var elapsedTime = endTimer - startTimer;
                console.log("Elapsed time: " + elapsedTime)
            });

            //When clicked, simulation is downloaded
            $("#download").click(function () {
            var startTimer = new Date().getTime();
                plate.createLPF();
            var endTimer = new Date().getTime();
            var elapsedTime = endTimer - startTimer;
            console.log("LPF creation time: " + elapsedTime)
            });

            //Redraws wells to fit the window after resizing; does not resize if plate is hidden
            $(window).resize(function () {
                if ($("#view").val() == "Well View") {
                    updatePlate();
                } else {
                    null;
                }
            });

            //Called when a well is clicked on
            $("#canvas").click(function (e) {
                var parentOffset = $(this).offset();
                var relX = e.pageX - parentOffset.left;
                var relY = e.pageY - parentOffset.top;
                var xNum = $("#columns").val();
                var yNum = $("#rows").val();
                var spacing = getSpacing(xNum, yNum);
                var realxNum = Math.ceil(relX / spacing);
                var realyNum = Math.ceil(relY / spacing);
                if (realxNum <= xNum && realyNum <= yNum) {
                    var col = Math.min(Math.ceil(relX / spacing), xNum);
                    var row = Math.min(Math.ceil(relY / spacing), yNum);
                    var spacing = getSpacing($("#columns").val(), $("#rows").val())
                    $("#WellRow").text(row);
                    $("#WellCol").text(col);
                    var wellI = (row-1)*parseInt($("#columns").val()) + col;
                    $("#WellInd").text(wellI);
                    drawWellOutline([selectedCol-1, col-1], [selectedRow-1, row-1], true); //0 indexing
                    selectedRow = row;
                    selectedCol = col;
                    drawRangeBars(spacing);
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
                },
                updateRangeBars: function () {
                    var spacing = getSpacing($("#columns").val(), $("#rows").val());
                    drawRangeBars(spacing);
                    console.log("Resize Range Bars")
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
                var wellNum = (selectedRow-1)*parseInt($("#columns").val()) + (selectedCol-1);
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
                            currentStep = e.dataPoint.x*1000*60/plate.totalTime*(plate.numPts-1)
                        }
                    }
                    // add to data array
                    chartData.push(dp);
                }
            }
            createChart();
            //For correct sizing chart must be in a block display upon creation
            //but can be hidden after it is created
            $(".well").css('visibility', 'hidden');
            return {
                updateData : function() {
                    privateUpdateData();
                    chartReference.render();
                }
            }
        })();

        //Toggle between types of visualization
        $("#view").click(function () {
            var button = $("#view");
            if (button.val() == "Plate View") {
                $(".well").css('visibility', 'hidden');//have to change visibility not display so that chart resizes automatically
                $(".plate").show();
                button.val("Well View");
                plateManager.init();
            }
            else if (button.val() == "Well View") {
                if ($("#play").val() == "Pause") {
                    plateManager.pauseWellSim();
                    $("#play").val("Play");
                }
                $(".plate").hide();
                $(".well").css('visibility', 'visible');
                button.val("Plate View");
                chart.updateData();
            }
        });

        //Catches arrow keys and updates the selected well-index and chart
        $(document).keyup(function (e){ 
            var row = selectedRow;
            var col = selectedCol;
            var controllerWidth = $("#wellIndex").width() + $("#wellIndex2").width();
            // up arrow
            if (e.keyCode == 38) { 
                if (row != 1) { row-- } 
                else if (row == 1 & col != 1) { 
                    row = parseInt($("#rows").val());
                    col--; 
                } else {
                    row = parseInt($("#rows").val());
                    col = parseInt($("#columns").val()); 
                }
            }
            // down arrow
            else if (e.keyCode == 40) {   
                if (row != parseInt($("#rows").val())) { row++; }
                else if (row ==  parseInt($("#rows").val()) & col != parseInt($("#columns").val())){ 
                    row = 1; 
                    col++;
                } else {
                    row = 1;
                    col = 1;
                }
            } 
            // left arrow 
            else if (e.keyCode == 37) { 
                if (col == 1 & row != 1) { col = parseInt($("#columns").val()); row--; }
                else if (col == 1 & row == 1) { undefined } else { col-- }
            // right arrow
            } else if (e.keyCode == 39) {   
                if (col == parseInt($("#columns").val()) & row != parseInt($("#rows").val())) { col = 1; row++; }
                else if (col == parseInt($("#columns").val()) & row == parseInt($("#rows").val())) { undefined }
                else { col++ }
            }
            plateManager.drawSelection([selectedCol-1, col-1], [selectedRow-1, row-1], true); //0 indexing; draws selection ring
            selectedRow = row;
            selectedCol = col;
            $("#WellRow").text(row);
            $("#WellCol").text(col);
            var wellI = (row-1)*parseInt($("#columns").val()) + col;
            $("#WellInd").text(wellI);
            if ($("#view").val() == "Plate View") {
                chart.updateData();
            }
            if (controllerWidth != ($("#wellIndex").width() + $("#wellIndex2").width())) {
                plateManager.updateRangeBars();
            }
        });

        return {
            init: function () {
               plateManager.init(true);
            },
            updateDisplayedLEDs: function () {
                var newLEDnum = $("#LEDnum").val(); //The currently selected number of LEDs
                var maxLEDnum = $("#LEDnum").attr("max"); //The maximum number of LEDs
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

    //Manages the input form javascript
    var inputsManager = (function (simulation) {
        //Register listener for adding waveform groups
        $("#addWGroup").click(function () {appendWGroup();});
        /*
         *Appends a new waveform group to the input form
         */
        function appendWGroup() {
            var newWGroup = $(".wGroup.template").clone();
            newWGroup.removeClass("template");
            //Register button listeners
            $("#wGroups").append(newWGroup);
            newWGroup.find(".constButt").click(function () {
                addFunc("const",newWGroup);
            });
            newWGroup.find(".stepButt").click(function () {
                addFunc("step",newWGroup);
            });
            newWGroup.find(".sineButt").click(function () {
                addFunc("sine",newWGroup);
            });
            newWGroup.find(".arbButt").click(function () {
                addFunc("arb",newWGroup);
            });
            return newWGroup;
        }
        /*
         *Adds a new function to a waveform to a waveform group
         */
        function addFunc(funcType,wGroup) {
            var type = funcType;
            var newFunc = $("." + type + ".template").clone();
            newFunc.removeClass("template");
            // Have to add 'required' attribute to const intensities & step amplitude lists.
            // Can't add to template b/c Chrome gets mad trying to validate hidden fields...
            if (type == 'const' ) {
                var reqdBox = newFunc.find("input.ints");
                reqdBox.prop('required', true);
            }
            else if (type == 'step') {
                var reqdBox = newFunc.find('input.amplitudes');
                reqdBox.prop('required', true);
            }
            //Create new spreadsheet table for arbs
            if (funcType=='arb') {
                $(newFunc.find(".arbTable"))
                $(newFunc.find(".arbTable")).handsontable({
                    colHeaders: ["Time [m]", "Intensity [gs]"],
                    contextMenu: false,
                    height: 100,
                    width: 180,
                    minSpareRows: 1,
                    columns: [{
                        type: 'numeric'
                    }, {
                        type: 'numeric'
                    }],
                    cells: function (row, col, prop) {
                        var cellProperties = {}
                        if (row === 0 && col === 0) {
                            cellProperties.readOnly = true;
                            type = "string"
                        }
                        return cellProperties;
                    },
                    data: [
                        ["Initial", "0"]
                    ],
                });
            }
            //Adds on new waveform group
            wGroup.find(".funcList").prepend(newFunc);
            //Generates minimized legend for quick viewing of functions
            function legendPopulate(type) {
                var legendString;
                if (type == "const") {legendString = "Constatant | Start: " + newFunc.find("input.start").val()
                                       + " | #Rep: " +  newFunc.find("input.replicates").val() + " | Wave: " +
                                        newFunc.find(".funcWavelength option:selected").text() }
                else if (type == "step") {legendString = "Step | Start: " +  newFunc.find("input.start").val()
                                          + " | #Rep: " + newFunc.find("input.replicates").val() + " | Amp: " + newFunc.find("input.amplitudes").val().substring(0,10)+"..."
                                          + " | Wave: " + newFunc.find(".funcWavelength option:selected").text() +
                                          " | #Even SMP: " + newFunc.find("input.samples").val()}
                else if (type == "sine") {legendString = "Sine | Start: " + newFunc.find("input.start").val()
                                          + " | #Rep: " + newFunc.find("input.replicates").val() + " | Amp: " + newFunc.find("input.amplitude").val()
                                          + " | Wave: " + newFunc.find(".funcWavelength option:selected").text() + 
                                           " | #Even SMP: " + newFunc.find("input.samples").val()}
                else if (type == "arb") {legendString = "Arb | Start: " + newFunc.find("input.start").val()
                                          + " | #Rep: " + newFunc.find("input.replicates").val()
                                          + " | Wave: " + newFunc.find(".funcWavelength option:selected").text()};
                return legendString;
            }            var minimized = false;
            var animateSpeed = 300;
            //Insert new function
            //Stores original legend value (used for maximizing)
            var legend =  newFunc.find(".legend").text();
            //Scrolls to bottom of page
            //$("html, body").animate({ scrollTop: $(document).height() }); 
            newFunc.hide().toggle(animateSpeed);
            //Minimizes function window
            newFunc.find(".minimize").click(function () {
                var func = $(this).parents(".func");
                func.find(".legend").css("font-size", "9px")
                                .css("top", "0px")
                                .css("left", "0px")
                                .css("letter-spacing", "0px")
                                .text(legendPopulate(type));
                func.css("padding", "5.5px").css("border-bottom", "1px solid");
                func.find(".minimize").toggle();
                func.find(".maximize").toggle(animateSpeed);
                func.find(".minClose").toggle(animateSpeed);
                func.find(".wrapper").nextAll().toggle(animateSpeed);
            });
            //Maximizes function window. Minimize must have previously been called
             newFunc.find(".maximize").click(function () {
                var func = $(this).parents(".func");
                func.find(".legend").css("font-size", "18px")
                                .css("top", "-5px")
                                .css("left", "-5px")
                                .text(legend);
                func.css("padding", "10px").css("border-bottom", "0");
                func.find(".minimize").toggle(animateSpeed);
                func.find(".maximize").hide();
                func.find(".minClose").hide();
                func.find(".wrapper").nextAll().toggle(animateSpeed);
            })
            //Removes and closes the selected function
            newFunc.find(".close, .minClose" ).click(function () {
                var func = $(this).parents(".func");
                func.toggle(animateSpeed);
                setTimeout(function() { func.remove()}, animateSpeed);
                $("#download").hide();
                $("#submit").css("width", "100%")
                            .css("border-radius", "28px")
                            .prop("value", "Load New Simuation");
                // // clears the function from the simulation; if in chart, clears chart
                if ($("#view").val() == "Plate View") {
                    $(".plate").show();
                    simulationManager.refresh();
                    simulationManager.init(false);
                    $(".plate").hide();
                    simulationManager.updateChart();
                } else {
                    simulationManager.refresh();
                    simulationManager.init(false);
                }
            });
            return newFunc;
        }
        /*
         *Handle device menu
         */
        function updateWavelengths(wavelengths) {
            //Set the number of LEDs in the functions to the current number in the device specs
            //Accomplish this by adding or truncating LEDs where necessary
            //Iterate through each function's wavelength select
            var num=$("#LEDs").children().not(".template").length;
            //Iterate through different drop down menus
            $("select.funcWavelength").each(function (index, elem) {
                var entry = $(elem);
                var currentLen = entry.children().length;
                //If there are too few LEDs add more
                for(;wavelengths.length>currentLen;currentLen++){
                    entry.append($('<option/>').attr("class", "wavelength").attr("value", wavelengths[currentLen]).text(0));
                }
                //If there are too many LEDs truncate some
                for(;wavelengths.length<currentLen;currentLen--){
                    entry.children().last().remove();
                }
            });
            //Iterates through each of the option menus and sets the wavelengths approriately
            $("select.funcWavelength").each(function (i,select) {
                //Iterate through options in dropdown menue
                $(select).children().each(function(index,elem) {
                    $(elem).val(wavelengths[index])
                    $(elem).text(wavelengths[index]);
                });
            });
        }
        //Update display and values in the device menu
        function update() {
            //Device selected
            var device = $("#devices").val()
            //Fields to hide or not depending on the device
            var fields = $("#LDSpecs").children().not("#devicesli");
            if (device == "custom") {
                fields.show();
            }
            else {
                fields.hide();
                if (device == "LTA") { setDeviceFields(8, 8, plate.deviceLEDs()["waves"]); }
                else if (device == "LPA") { setDeviceFields(4, 6, plate.deviceLEDs()["waves"]); } 
                else if (device == "TCA") { setDeviceFields(8, 12, plate.deviceLEDs()["waves"]); }
                else if (device == "OGS") { setDeviceFields(4, 12, plate.deviceLEDs()["waves"]); }
            }
            simulation.init(true);
        }
        //Listen for changes to the device selector
        $("#devices").change(function () {
            update();
        });
        //Sets the various fields in the device menu
        function setDeviceFields(rows, columns, wavelengths) {
            $("#rows").val(rows);
            $("#columns").val(columns);
            $("#LEDnum").val(wavelengths.length);
            //Set wavelength values for the device
            setWavelengthValues(wavelengths);
            //Update wavelengths in the inputs
            updateWavelengths(getWavelengths());
            //Update the LEDs displayed in the simulation
            simulation.updateDisplayedLEDs();
            // update function start index max to account for total number of wells
            //TODO: this should be transfered to the error manager via a function call
            $("input.start").attr({"max":rows*columns});
        }
        //Sets the wavelength device menu to the ones in the given array
        function setWavelengthValues(wavelengths) {
            //Updates the number of entries to match the array
            $("#LEDnum").val(wavelengths.length);
            updateWavelengthNumber();
            //Sets the entries to those in the array
            $("#LEDs").children().not(".template").each(function(index,elem) {
               $(elem).find(':input[type="number"]').val(wavelengths[index]);
            });
        }
        //Updates the number of LEDs displayed
        function updateWavelengthNumber() {
            //Update LED number
            var newLEDnum = $("#LEDnum").val(); //The currently selected number of LEDs
            var maxLEDnum = $("#LEDnum").attr("max"); //The maximum number of LEDs
            if (newLEDnum>maxLEDnum) {
                newLEDnum=maxLEDnum;
            }
            //===================================
            //Manage LEDs in inputs
            var currentLEDs = $("#LEDs").children().not(".template"); //A list of current LED objects
            var currentLEDnum = currentLEDs.length;
            //If there are too many LED objects remove the ones at the end
            for(;currentLEDnum>newLEDnum;currentLEDnum--) {
                $("#LEDs").children().not(".template").last().remove();
            }
            //If there are too few LED objects add more
             for(;currentLEDnum<newLEDnum;currentLEDnum++){
                    var newLED = $("#LEDs").children().filter(".template").clone(); //Pull and clone the html template of an LED
                    newLED.removeClass("template");
                    //Change the text
                    newLED.children().filter("label").text("Wavelength for LED " + (currentLEDnum + 1));
                    //Bind event listener
                    newLED.children().filter("input").bind("change", function () {
                        updateWavelengths(getWavelengths());
                    });
                    //Add the modified LED html to the page
                    $("#LEDs").append(newLED);
            }
        }
        function getWavelengths() {
            var wavelengths=[];
            $("#LEDs").children().not(".template").each(function(index,elem){
                wavelengths.push($(elem).find(':input[type="number"]').val());
            });
            return wavelengths;
        }
        //Event listening to changes in LED number
        $("#LEDnum").change(function () {
            updateWavelengthNumber();
            updateWavelengths(getWavelengths());
            simulation.updateDisplayedLEDs();
        });
        update();
        function loadInputs(plate) {
            //Set device inputs
            $("#devices").val(plate.device);
            if (plate.device === 'Custom Configuration') {
                setDeviceFields(plate.rows,plate.cols,plate.wavelengths);
            }
            $("#length").val(plate.totalTimeInput);
            $("#timestep").val(plate.timeStepInput);
            $("#randomized").prop('checked', plate.randomized);
            $find("#offSwitch").prop('checked', plate.offOnFinish);
            //Create waveform groups
            for(var i = 0; plate.wellArrangements.length;i++) {
                var wellArrangement = plate.wellArrangements[i];
                //Set waveform group inputs
                var newGroup = appendWGroup();
                newGroup.find("input.samples").val(wellArrangement.samples);
                newGroup.find("input.replicates").val(wellArrangement.replicates);
                newGroup.find("input.startTime").val(wellArrangement.startTimeInput);
                //Set waveforms
                var waveformInputs = wellArrangement.waveformInputs;
                for (var j = 0; j < waveformInputs.length; j++) {
                    //Create waveforms
                    var newFunc = addFunc(waveformInput.type,newGroup);
                    //Get dictionary where the keys are selectors and the values or .val() for those fields
                    //Iterate over the dictionary seeting those DOM elements vals
                    var inputs = waveformInput.inputs;
                    for (var key in inputs) {
                        if (dictionary.hasOwnProperty(key)) {
                            newFunc.find(key).val(inputs[key]);
                        }
                    }
                }
            }
        }


    })(simulationManager);
    
function errorManager(er) {
    // Catches any errors thrown by plate code
    // Also handles all errors arising after form submission.    
    alert("Error! Message:\n" + er.message);
    console.error("Error! Message:\n" + er.message);
    }
})();

function updateRCValidation() {
    // updates func start index max values when row/col values are changed in custom devices
    var rows = $("#rows").val()
    var cols = $("#columns").val()
    $("input.start").attr({"max":rows*cols});
}

function updateLengthValidation() {
    // updates time step for very long runs
    var len = parseInt($("#length").val());
    addTooltip($("#length"), "Warning! Runs >12hr can create very large program files!\nTimestep automatically set to 10s.");
    if (len > 1000) {
    $("#length").tooltipster('enable');
    $("#timestep").val('10');
    if ($('#length').hasClass('warning') == false) {
        $("#length").addClass("warning");
    }
    }
    else {
    $("#length").tooltipster('disable');
    if ($('#length').hasClass('warning') == true) {
        $("#length").removeClass("warning");
    }
    }
}
    
function updateConstValidation(intInputHTML) {
    // updates the const func validation params in response to updated int inputs

    // first ensure inputs are valid; raise tooltip if not
    // invalid inputs should also be red b/c of CSS
    var intInput = $(intInputHTML);
    var parent = intInput.closest("fieldset"); // parent waveform fieldset
    //var startJQ = parentFunc.find("input.start");
    var intsJQ = parent.find("input.ints");
    //var repsJQ = parentFunc.find("input.replicates");
    var inputs = [intsJQ];
    //var startHTML = startJQ.get(0);
    //var repsHTML = repsJQ.get(0);
    var intsHTML = intsJQ.get(0);
    var inputsHTML = [intsHTML];
    // add all tooltips, hidden by default
    //addTooltip(startJQ, "Must be a valid integer less than the number of wells.");
    //addTooltip(repsJQ, "Must be valid integer.");
    addTooltip(intsJQ, "Must be valid integers with the format: Int1, Int2, ...  in [0,4095].");
    var invalid = false;
    for (inp=0;inp<inputs.length;inp++) {
    if (inputsHTML[inp].validity.valid == false) {
        inputs[inp].tooltipster('enable');
        invalid = true;
    }
    else {
        inputs[inp].tooltipster('disable');
    }
    }
    if (invalid) {
    return false; // don't carry on and try to parse anything that won't parse
    }
    
    // Parse values and verify inputs work together
    var ints = intsJQ.val();
    ints = JSON.parse("[" + ints + "]");
    var rows = parseInt($("#rows").val());
    var cols = parseInt($("#columns").val());
    var reps = parseInt(repsJQ.val());
    var start = parseInt(startJQ.val()) - 1;
    var tubeNum = rows * cols;
    var tubesNeeded = ints.length * reps;
    var orientation = parentFunc.find('input[class=RC]:checked').val();
    if (orientation == undefined) {
    orientation = 'col';
    var r = Math.floor(start/cols);
    var c = start%cols;
    var tubesLeft = (cols - 1 - c)*rows + (rows-r)
    } else {
    var tubesLeft = tubeNum - start;
    }
    if (tubesNeeded > tubesLeft) { // this is bad; throw an error tooltip & make those inputs red
    for (inp=0;inp<inputs.length;inp++) {
        if (inputs[inp].hasClass('error') == false) {
        inputs[inp].addClass('error');
        }
        inputs[inp].tooltipster('content', "Insufficient wells remaining for specified start, replicates, and intensities.");
        inputs[inp].tooltipster('enable');
    }
    return false;
    } else {
    for (inp=0;inp<inputs.length;inp++) {
        if (inputs[inp].hasClass('error') == true) {
        inputs[inp].removeClass('error');
        }
        inputs[inp].tooltipster('disable');
    }
    }
    return true;
}

function updateStepValidation(stepInputHTML) {
    // updates the step func validation params in response to updated inputs
    
    // first ensure inputs are valid; raise tooltip if not
    // invalid inputs should also already be red b/c of CSS
    // Get parent LPF function:
    var stepInput = $(stepInputHTML);
    var parentFunc = stepInput.closest("fieldset");
    // Get HTML form elements for start pos, amplitudes, replicates, offset, stepTime, and samples
    var startJQ = parentFunc.find("input.start");
    var ampsJQ = parentFunc.find("input.amplitudes");
    var repsJQ = parentFunc.find("input.replicates");
    var offsetJQ = parentFunc.find("input.offset");
    var stepTimeJQ = parentFunc.find("input.stepTime");
    var samplesJQ = parentFunc.find("input.samples");
    var stepSignJQ = parentFunc.find('input.stepUp:checked');
    var inputs = [startJQ, ampsJQ, repsJQ, offsetJQ, stepTimeJQ, samplesJQ];
    // Add tooltips to all inputs
    addTooltip(startJQ, "Must be a valid integer less than the number of wells.");
    addTooltip(repsJQ, "Must be valid integer.");
    addTooltip(ampsJQ, "Must be valid integers with the format: Int1, Int2, ...  in [0,4095].");
    addTooltip(offsetJQ, "Must be a valid integer in [0, 4095].");
    addTooltip(stepTimeJQ, "Must be a value less than the total run length.");
    addTooltip(samplesJQ, "Must be a valid integer less than the number of wells available.");
    
    var invalid = false;
    for (i=0;i<inputs.length;i++) {
    if (inputs[i].get(0).validity.valid == false) {
        invalid = true;
        inputs[i].tooltipster('enable');
    }
    else {
        inputs[i].tooltipster('disable');
    }
    }
    if (invalid) {
    return false;
    }
    
    // Parse values and verify inputs work together
    var amps = ampsJQ.val();
    amps = JSON.parse("[" + amps + "]"); // GS
    var rows = parseInt($("#rows").val());
    var cols = parseInt($("#columns").val());
    var reps = parseInt(repsJQ.val()); // num
    var start = parseInt(startJQ.val()) - 1; // base-0 position
    var offset = parseInt(offsetJQ.val()); // GS
    var stepTime = Math.floor(parseFloat(stepTimeJQ.val()) * 60 * 1000); // ms
    var samples = parseInt(samplesJQ.val()); // num
    var orientation = parentFunc.find('input[class=RC]:checked').val();
    var runLength = Math.floor($("#length").val() * 60 * 1000); // in ms
    var stepSign = stepSignJQ.val();//parentFunc.find('input.stepUp:checked').val();
    if (stepSign == undefined) {
    stepSign = 'stepDown';
    }
    
    // Verify there are enough tubes
    var tubeNum = rows * cols;
    var tubesNeeded = amps.length * reps * samples;
    if (orientation == undefined) {
    orientation = 'col';
    var r = Math.floor(start/cols);
    var c = start%cols;
    var tubesLeft = (cols - 1 - c)*rows + (rows-r)
    } else {
    var tubesLeft = tubeNum - start;
    }
    var probs = [startJQ, repsJQ, ampsJQ, samplesJQ]; // set of inputs that have problems and need to be modified
    if (tubesNeeded > tubesLeft) { // this is bad; throw an error tooltip & make those inputs red
    for (inp=0; inp<probs.length; inp++) {
        if (probs[inp].hasClass('error') == false) {
        probs[inp].addClass('error');
        }
        probs[inp].tooltipster('content', "Insufficient wells remaining for specified start, replicates, samples, and intensities.");
        probs[inp].tooltipster('enable');
    }
    return false;
    } else {
    for (inp=0;inp<probs.length;inp++) {
        if (probs[inp].hasClass('error') == true) {
        probs[inp].removeClass('error');
        }
        probs[inp].tooltipster('disable');
    }
    }
    
    // Verify each amplitude is compatible with the given offset & step direction
    var tooBigAmpIndex = -1; // Holds index of FIRST invalid amplitude; default: -1 (none)
    for (a=0;a<amps.length;a++) {
    var amp = amps[a];
    if (stepSign == 'stepDown') {
        amp = -1*amp;
    }
    if (amp + offset > 4095 || amp + offset < 0) {
        tooBigAmpIndex = a;
        break;
    }
    }
    var probs = [ampsJQ, offsetJQ];
    if (tooBigAmpIndex != -1) { // invalid amplitude / step sign / offset combination
    for (inp=0; inp<probs.length; inp++) {
        if (probs[inp].hasClass('error') == false) {
        probs[inp].addClass('error');
        }
        probs[inp].tooltipster('content', "Specified amplitudes, offset, and step sign cause invalid greyscale intensities, outside [0,4095].");
        probs[inp].tooltipster('enable');
    }
    return false;
    }
    else {
    for (inp=0;inp<probs.length;inp++) {
        if (probs[inp].hasClass('error') == true) {
        probs[inp].removeClass('error');
        }
        probs[inp].tooltipster('disable');
    }
    }
    
    // Verify stepTime fits in the run length
    if (stepTime > runLength) { // make stepTime red; it's too big
    if (stepTimeJQ.hasClass('error') == false) {
        stepTimeJQ.addClass('error');
    }
    stepTimeJQ.tooltipster('content', "Step time greater than total run length.");
    stepTimeJQ.tooltipster('enable');
    }
    else {
    if (stepTimeJQ.hasClass('error') == true) {
        stepTimeJQ.removeClass('error');
    }
    stepTimeJQ.tooltipster('disable');
    }
    
    return true;
}

function updateSineValidation(sineInputHTML) {
    // updates the step func validation params in response to updated inputs
    
    // first ensure inputs are valid; raise tooltip if not
    // invalid inputs should also already be red b/c of CSS
    // Get parent LPF function:
    var sineInput = $(sineInputHTML);
    var parentFunc = sineInput.closest("fieldset");
    // Get HTML form elements for start pos, amplitudes, replicates, offset, stepTime, and samples
    var startJQ = parentFunc.find("input.start");
    var repsJQ = parentFunc.find("input.replicates");
    var samplesJQ = parentFunc.find("input.samples");
    var ampJQ = parentFunc.find("input.amplitude");
    var periodJQ = parentFunc.find("input.period");
    var phaseJQ = parentFunc.find("input.phase");
    var offsetJQ = parentFunc.find("input.offset");
    var inputs = [startJQ, repsJQ, samplesJQ, ampJQ, periodJQ, phaseJQ, offsetJQ];
    // Add tooltips to all inputs
    addTooltip(startJQ, "Must be a valid integer less than the number of wells.");
    addTooltip(repsJQ, "Must be valid integer.");
    addTooltip(samplesJQ, "Must be a valid integer less than the number of wells available.");
    addTooltip(ampJQ, "Must be a valid integer in [0, 4095].");
    addTooltip(periodJQ, "Must be a positive number.");
    addTooltip(phaseJQ, "Must be a positive number.");
    addTooltip(offsetJQ, "Must be a valid integer in [0, 4095].");
    
    var invalid = false;
    for (i=0;i<inputs.length;i++) {
    if (inputs[i].get(0).validity.valid == false) {
        invalid = true;
        inputs[i].tooltipster('enable');
    }
    else {
        inputs[i].tooltipster('disable');
    }
    }
    if (invalid) {
    return false;
    }
    
    // Parse values and verify inputs work together
    var rows = parseInt($("#rows").val());
    var cols = parseInt($("#columns").val());
    var reps = parseInt(repsJQ.val()); // num
    var start = parseInt(startJQ.val()) - 1; // base-0 position
    var samples = parseInt(samplesJQ.val()); // num
    var amp = parseInt(ampJQ.val()); // GS
    var period = parseFloat(periodJQ.val()) * 60 * 1000; // ms
    var phase = parseFloat(phaseJQ.val()) * 60 * 1000; // ms
    var offset = parseInt(offsetJQ.val()); // GS
    var orientation = parentFunc.find('input[class=RC]:checked').val();
    var runLength = Math.floor($("#length").val() * 60 * 1000); // in ms
    
    // Check period is not zero
    if (period <= 0) {
    if (periodJQ.hasClass('error')== false) {
        periodJQ.addClass('error');
    }
    periodJQ.tooltipster('content', 'Period can not be zero!');
    periodJQ.tooltipster('enable');
    return false;
    }
    else {
    if (periodJQ.hasClass('error') == true) {
        periodJQ.removeClass('error');
    }
    periodJQ.tooltipster('disable');
    }
    
    // Verify there are enough tubes
    var tubeNum = rows * cols;
    var tubesNeeded = reps * samples;
    if (orientation == undefined) {
    orientation = 'col';
    var r = Math.floor(start/cols);
    var c = start%cols;
    var tubesLeft = (cols - 1 - c)*rows + (rows-r)
    } else {
    var tubesLeft = tubeNum - start;
    }
    var probs = [startJQ, repsJQ, samplesJQ]; // set of inputs that have problems and need to be modified
    if (tubesNeeded > tubesLeft) { // this is bad; throw an error tooltip & make those inputs red
    for (inp=0; inp<probs.length; inp++) {
        if (probs[inp].hasClass('error') == false) {
        probs[inp].addClass('error');
        }
        probs[inp].tooltipster('content', "Insufficient wells remaining for specified start, replicates, and samples.");
        probs[inp].tooltipster('enable');
    }
    return false;
    } else {
    for (inp=0;inp<probs.length;inp++) {
        if (probs[inp].hasClass('error') == true) {
        probs[inp].removeClass('error');
        }
        probs[inp].tooltipster('disable');
    }
    }
    
    // Verify amplitude is compatible with the given offset
    var probs = [ampJQ, offsetJQ];
    if (amp + offset > 4095 || offset - amp < 0) { // invalid amplitude / offset combination
    for (inp=0; inp<probs.length; inp++) {
        if (probs[inp].hasClass('error') == false) {
        probs[inp].addClass('error');
        }
        probs[inp].tooltipster('content', "Specified amplitude & offset cause invalid greyscale intensities, outside [0,4095].");
        probs[inp].tooltipster('enable');
    }
    return false;
    }
    else {
    for (inp=0;inp<probs.length;inp++) {
        if (probs[inp].hasClass('error') == true) {
        probs[inp].removeClass('error');
        }
        probs[inp].tooltipster('disable');
    }
    }
    
    return true;
}

function updateArbValidation(arbInputHTML) {
    // updates the step func validation params in response to updated inputs
    
    // first ensure inputs are valid; raise tooltip if not
    // invalid inputs should also already be red b/c of CSS
    // Get parent LPF function:
    var arbInput = $(arbInputHTML);
    var parentFunc = arbInput.closest("fieldset");
    // Get HTML form elements for start pos, amplitudes, replicates, offset, stepTime, and samples
    var startJQ = parentFunc.find("input.start");
    var repsJQ = parentFunc.find("input.replicates");
    var precJQ = parentFunc.find("input.precondition");
    var inputs = [startJQ, repsJQ, precJQ];
    // Add tooltips to all inputs
    addTooltip(startJQ, "Must be a valid integer less than the number of wells.");
    addTooltip(repsJQ, "Must be valid integer less than the number of wells.");
    addTooltip(precJQ, "Must be a valid integer in [0, 4095].");
    
    var invalid = false;
    for (i=0;i<inputs.length;i++) {
    if (inputs[i].get(0).validity.valid == false) {
        invalid = true;
        inputs[i].tooltipster('enable');
    }
    else {
        inputs[i].tooltipster('disable');
    }
    }
    if (invalid) {
    return false;
    }
    
    // Parse values and verify inputs work together
    var rows = parseInt($("#rows").val());
    var cols = parseInt($("#columns").val());
    var reps = parseInt(repsJQ.val()); // num
    var start = parseInt(startJQ.val()) - 1; // base-0 position
    var prec = parseInt(precJQ.val()); // GS
    var orientation = parentFunc.find('input[class=RC]:checked').val();
    var runLength = Math.floor($("#length").val() * 60 * 1000); // in ms
    
    // Verify there are enough tubes
    var tubeNum = rows * cols;
    var tubesNeeded = reps;
    if (orientation == undefined) {
    orientation = 'col';
    var r = Math.floor(start/cols);
    var c = start%cols;
    var tubesLeft = (cols - 1 - c)*rows + (rows-r)
    } else {
    var tubesLeft = tubeNum - start;
    }
    var probs = [startJQ, repsJQ]; // set of inputs that have problems and need to be modified
    if (tubesNeeded > tubesLeft) { // this is bad; throw an error tooltip & make those inputs red
    for (inp=0; inp<probs.length; inp++) {
        if (probs[inp].hasClass('error') == false) {
        probs[inp].addClass('error');
        }
        probs[inp].tooltipster('content', "Insufficient wells remaining for specified start & replicates.");
        probs[inp].tooltipster('enable');
    }
    return false;
    } else {
    for (inp=0;inp<probs.length;inp++) {
        if (probs[inp].hasClass('error') == true) {
        probs[inp].removeClass('error');
        }
        probs[inp].tooltipster('disable');
    }
    }
    
    return true;
}

function addTooltip(JQobj, message) {
    // Encapsulated method for adding tooltips for validation
    JQobj.tooltipster({content: message, position: 'right', theme: 'tooltipster-shadow', delay: 0, maxWidth: 200, debug: false});
    JQobj.tooltipster("show");
    //$(window).keypress(function() {
    //  JQobj.tooltipster('hide');
    //});
}