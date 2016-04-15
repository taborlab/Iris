app.controller('simController', ['$scope','$timeout', 'formData', 'plate', 'chart', function ($scope, $timeout, formData, plate, chart) {

    // =================================================================================================================
    // Utility Functions

    function updateSimulation() {
        if ($scope.plateView) {
            if(formData.isValid()) {
                try {
                    // Passes **index** of current time step, receives a 3D array of ints.
                    drawPlate(plate.get().createPlateView(currentStep));
                }
                catch (err) {
                    console.log("Caught plate drawing error");
                    console.log(err);
                }
            }
            else {
                drawPlate();
                //try {
                //    drawPlate();
                //}
                //catch (err) {
                //    console.log("Caught plate drawing error");
                //    console.log(err);
                //}
            }
        }
        else {
            if (formData.isValid()) {
                try {
                    //Determine which Leds should be shown on the chart
                    var visible = []
                    for (var i = 0; i < getDevice().leds.length; i++) {
                        if ($scope.wavelengthIndex === "" || $scope.wavelengthIndex === null) {
                            visible[i] = true;
                        }
                        else {
                            if (Number($scope.wavelengthIndex) === i) {
                                visible[i] = true;
                            }
                            else {
                                visible[i] = false;
                            }
                        }
                    }
                    chart.updateData($scope.selectedRow, $scope.selectedCol, visible);
                }
                catch (err) {
                    console.log("Caught plate chart error");
                    console.log(err);
                }
            }
            else { // Make a plot but have all LEDs off
                var visible = [];
                for (var i=0; i<getDevice().leds.length; i++) {visible.push(true);}
                chart.updateData($scope.selectedWell(), visible);
            }
        }
    }

    var canvas = document.getElementsByTagName('canvas');
    var context = canvas[0].getContext('2d');
    function drawPlate(intensityStep) {
        //Exit if the scope is not a reasonable size
        //This occurs when a new file is loaded, which is instaneously valid before the height of the
        //draw area can expand
        if($scope.size.width<=0 || $scope.size.height<=0) {
            return;
        }
        // Draws a plate given a 3D array of x,y,channel intensities
        var strokeWidth = 3;
        var displayScaleParam = 3;
        //Size canvas correctly
        var canvas = $(".canvas")[0];
        canvas.style.width = $scope.size.width;
        canvas.style.height = $scope.size.height;
        canvas.width = $scope.size.width;
        canvas.height = $scope.size.height;
        //Figure out the diameter of each well
        var spacing = getSpacing(getDevice().cols, getDevice().rows);
        //Determine which LEDs domain to display (either all or a single one)
        var ledStart;
        var ledEnd;
        if($scope.wavelengthIndex===""||$scope.wavelengthIndex===null) {
            ledStart=0;
            ledEnd = Number(getDevice().leds.length);
        }
        else {
            ledStart=Number($scope.wavelengthIndex);
            ledEnd = Number($scope.wavelengthIndex)+1;
        }
        // Set the width and height of the false color button
        if (!isNaN(spacing)) {
            $('.false-clr-btn-svg').attr({
                height : (spacing + strokeWidth) / 2,
                width : (spacing + strokeWidth) / 2
            });
            $('.false-clr-pull-tab-mask').css('border-width', ((spacing + strokeWidth) / 2) * 0.2);
            $('.false-clr-btn-box').css({
               height : (spacing + strokeWidth) / 2 * 0.3,
                width : (spacing + strokeWidth) / 2 * 0.3
            })
        }
        //Iterate through each well
        var deselected = getDevice().deselected; // list of deselected wells: draw with an X over
        for (var x = 0; x < getDevice().cols; x++) {
            for (var y = 0; y < getDevice().rows; y++) {
                var wellNum = x + y*getDevice().cols;
                //var wellNum = y + x*getDevice().rows;
                //Initialize Circle
                context.beginPath();
                context.arc(x * spacing + spacing * 0.5 + strokeWidth,
                    y * spacing + spacing * 0.5 + strokeWidth,
                    spacing * 0.5, 0, 2 * Math.PI, false);
                //If an insensityStep was given fill in the wells, otherwise fill all white
                if(typeof intensityStep !== 'undefined') {
                    //Draw black background
                    context.fillStyle = 'rgba(0,0,0,1)';
                    context.fill();
                    //Make colors compose correctly, ie. like light would
                    context.globalCompositeOperation = "lighter";
                    //Iterate through leds drawing colors on top of each other
                    for (var i = ledStart; i < ledEnd; i++) {
                        //Exponential normlization of the values from the plate object by max alpha level
                        var scaledInt = 1 - Math.exp(-displayScaleParam * (intensityStep[y][x][i] / plate.get().maxGSValue));
                        context.fillStyle = 'rgba' + formData.getColors()[i].slice(3, -1) + ',' + scaledInt + ')';
                        context.fill();
                    }
                }
                //Draw well Outline
                context.globalCompositeOperation = "source-over";
                context.lineWidth = 3;
                context.strokeStyle = '#000000';
                context.stroke();
                context.closePath();
                if (deselected !== undefined && deselected[wellNum] === true) { // If the well has been deselected, draw a red X
                    var lw = 8;
                    var c = '#ff0000';
                    var cap = 'round';
                    var scale_length = 0.85; // Make line slightly smaller than the well box
                    // Line 1
                    context.beginPath();
                    context.moveTo((x+(1-scale_length))*spacing+strokeWidth, (y+(1-scale_length))*spacing+strokeWidth); // Upper left corner of well box
                    context.lineTo((x+scale_length)*spacing+strokeWidth, (y+scale_length)*spacing+strokeWidth); // Lower right corner
                    context.lineWidth = lw;
                    context.strokeStyle = c;
                    context.lineCap = cap;
                    context.stroke();
                    // Lone 2
                    context.beginPath();
                    context.moveTo((x+(1-scale_length))*spacing, (y+scale_length)*spacing); // Lower left corner of well box
                    context.lineTo((x+scale_length)*spacing, (y+(1-scale_length))*spacing); // Upper right corner
                    context.lineWidth = lw;
                    context.strokeStyle = c;
                    context.stroke();
                }
            }
        }
        //Draw outline of selected well
        context.beginPath();
        context.arc($scope.selectedCol * spacing + spacing * 0.5 + strokeWidth,
            $scope.selectedRow * spacing + spacing * 0.5 + strokeWidth,
            spacing * 0.5, 0, 2 * Math.PI, false);
        context.globalCompositeOperation = "source-over";
        context.lineWidth = 2;
        context.setLineDash([5]);
        context.strokeStyle = '#FFFFFF';
        context.stroke();
        context.closePath();
    }

    function getSpacing(xNum, yNum) {
        return Math.min(Math.floor(($scope.size.width-10) / xNum),
            Math.floor(($scope.size.height-10) / yNum));
    }

    var getDevice = function () {
        return formData.getData().device
    };

    // =================================================================================================================
    // Hooks for HTML

    //Set Defaults
    $scope.plateView = true;
    $scope.selectedRow = 0;
    $scope.selectedCol = 0;
    $scope.speedSlider = 0.5;
    $scope.prettyTime = '00:00:00';
    $scope.simActive = false;
    $scope.percentTime = 0;
    $scope.display={};

    $scope.getDevice = function () {
        return formData.getData().device
    };

    $scope.selectedWell = function(){return ($scope.selectedRow) * getDevice().cols + ($scope.selectedCol);};

    // Switches between plate and well views
    $scope.toggleView = function () {
        $scope.plateView = !$scope.plateView;
        updateSimulation();
        //I believe that the chart is not rendering the correct size since the DOM element is shown asynchronously
        //This delay updates the chart after the DOM element has been rendered
        //It probably could be more cleanly replaced by a watch, but then i would need a directive to access
        //the DOM element, which is not worth the effort
        if(!$scope.plateView) {
            $timeout(function () {
                chart.updateChart();
            }, 5);
        }
    }

    //Begins an interval which increments currentStep through the run
    var intervalFunc; //Stores most recent interval function (setInterval())
    var currentStep = 0; //current timestep
    $scope.togglePlay = function () {
        if (plate.get() == null) {
            $scope.active == null;
        }
        else {
            $scope.simActive = !$scope.simActive;
        }
        if ($scope.simActive) {
            if (currentStep >= getMaxSteps()) {
                currentStep = 0;
            }
            var interval = 100; //refresh rate in milliseconds
            intervalFunc = setInterval(function () {
                $scope.$apply(timestep)
            }, interval);
        }
        else {
            clearInterval(intervalFunc);
        }

        //Updates the plate for each timestep
        function timestep() {
            // Increments the well simulation one timestep
            updateSimulation();
            updateTime(currentStep / getMaxSteps());
            //IncrementStep
            if (currentStep >= getMaxSteps()) {
                clearInterval(intervalFunc);
                $scope.simActive = false;
            }
            else {
                currentStep = currentStep + getStepMagnitude();
                if (currentStep > getMaxSteps()) {
                    currentStep = getMaxSteps();
                }
            }

            function getStepMagnitude() {
                // Determines the number of playback steps advanced each interval]
                var stepMagnitude = Math.round(1680.0 * Math.pow($scope.speedSlider, 3) - 2520.0 * Math.pow($scope.speedSlider, 2) + 1270.0 * $scope.speedSlider + 1);
                if (stepMagnitude < 1) {
                    stepMagnitude = 1;
                }
                return stepMagnitude;
            }
            //updates the display of the time

        }


    }
    function updateTime(percent) {
        //Converts a time in milliseconds to a human readable string
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

        $scope.percentTime = percent;
        var time = $scope.percentTime * plate.get().totalTime / 1000.0;
        $scope.prettyTime = prettyTime(time);
    }

    function getMaxSteps() {
        // Gets the maximum number of steps of the simulation
        return plate.get().numPts - 1;
    }

    // =================================================================================================================
    // Watchers and listeners

    $scope.playBarClicked = function(value) {
        currentStep = Math.floor(value * getMaxSteps());
        updateTime(currentStep / getMaxSteps());
        updateSimulation();
    }

    //Called when the device is changed, updates display of the simulation and the wavelength index
    $scope.display = { // Keeps track of the current display status of simulation components
        falseColors: false
        };
    $scope.$watch('getDevice()', function() {
        $scope.wavelengthIndex="";
        if (getDevice().name!="default") {
            $scope.display.sim = 'block';
        }
        if (getDevice().name == "Light Plate Apparatus (4x6)") {
            $scope.display.falseColors = false;
        }
        else {
            $scope.display.falseColors = true;
        }
    });

    // Selects a well when it is clicked on a plate
    $scope.handleClick = function(evt, button) {
        //If we're not in the plate view exit
        if(!$scope.plateView){
            return;
        }

        //Offset within the element of the click location
        var relX = evt.offsetX;
        var relY = evt.offsetY;

        //Device dimensions
        var xNum = getDevice().cols;
        var yNum = getDevice().rows;

        //spacing between wells
        var spacing = getSpacing(xNum, yNum);

        //The clicked well
        var clickedX = Math.floor(relX / spacing);
        var clickedY = Math.floor(relY / spacing);

        //If the clicked well is part of the selected device
        if (clickedX < xNum && clickedY < yNum) {
            //Updated model variables and apply changes
            if (button == 'left') { // left clicks
                $scope.$apply(function(){
                    $scope.selectedCol = clickedX;
                    $scope.selectedRow = clickedY;
                });
                //Resizes range bars (simulation progress and simulation speed bars) to
                // width of plate.
                var plateWidth = spacing * $("#columns").val();
                var controlElements = ["#view", "#wellIndex", "#wellIndex2", "#LEDdisplay",
                    "label.plate", "#play.plate", "#displayTime"];
                var controllerBaseSize = 0; //seed value
                var buttonPadding = 14; //button padding
                var minSpeedWidth = 10; //look at CSS for value, don't know how to call in JS
                for (el in controlElements) {
                    controllerBaseSize += ($(controlElements[el]).outerWidth(true));
                }
                var speedWidth = plateWidth - controllerBaseSize - buttonPadding;
                $("#time").css("width", plateWidth);
                $("#speed").css("width", (minSpeedWidth > speedWidth) ? minSpeedWidth:speedWidth);
                updateSimulation();
            }
            else if (button == 'right') { // right clicks
                var wellNum = clickedY*xNum+clickedX;
                var deselected = formData.getData().device.deselected;
                $scope.$apply(function(){
                    if(typeof deselected[wellNum] === 'undefined'){
                        deselected[wellNum] = true;
                    }
                    else {
                        deselected[wellNum] = !deselected[wellNum];
                    }
                });
                drawPlate();
            }
        }
    };

    // Toggles display of false color
    $scope.FalseColorTooltipMessage = "<h4><b>Toggle False Color Display</b></h4>Status: False Colors<br>"; // Default
    $scope.falseColors = formData.getParam().falseColors;
    $scope.toggleFalseColor = function() {
        if (formData.getData().device.name !== "Light Plate Apparatus (4x6)") {
            var falseColor = formData.getParam().falseColors;
            formData.getParam().falseColors = !falseColor;
            $scope.falseColors = formData.getParam().falseColors;
        }
        if (!falseColor) {
            $scope.FalseColorTooltipMessage = "<h4><b>Toggle False Color Display</b></h4>Status: False Colors<br>";
        }
        else {
            $scope.FalseColorTooltipMessage = "<h4><b>Toggle False Color Display</b></h4>Status: True Colors<br>";
        }
    };

    // Handles arrow key navigation of selected well
    $scope.$on('keydown', function( msg, obj ) {
        var code = obj.code;
        //right arrow
        if (code === 39) {
            //If its not the last col
            if ($scope.selectedCol !== getDevice().cols - 1) {
                $scope.selectedCol++;
                $scope.$apply();
                updateSimulation();
            }
            //If its not the last row
            else if ($scope.selectedRow !== getDevice().rows - 1) {
                $scope.selectedCol = 0;
                $scope.selectedRow++;
                $scope.$apply();
                updateSimulation();
            }
        }
        //left arrow
        else if (code === 37) {
            //If its not the first col
            if ($scope.selectedCol !== 0) {
                $scope.selectedCol--;
                $scope.$apply();
                updateSimulation();
            }
            //If its not the first row
            else if ($scope.selectedRow !== 0) {
                $scope.selectedCol = getDevice().cols - 1;
                $scope.selectedRow--;
                $scope.$apply();
                updateSimulation();
            }
        }
        //Up arrow
        else if (code === 38) {
            //if its not the first row
            if ($scope.selectedRow !== 0) {
                $scope.selectedRow--;
                $scope.$apply();
                updateSimulation();
            }
            //If its not the first col
            else if ($scope.selectedCol !== 0) {
                $scope.selectedRow = getDevice().rows - 1;
                $scope.selectedCol--;
                $scope.$apply();
                updateSimulation();
            }
        }
        //Down arrow
        else if (code === 40 ){
            //If its not the last row
            if ($scope.selectedRow !== getDevice().rows - 1) {
                $scope.selectedRow++;
                $scope.$apply();
                updateSimulation();
            }
            //If its not the last col
            else if ($scope.selectedCol !== getDevice().cols - 1) {
                $scope.selectedRow = 0;
                $scope.selectedCol++;
                $scope.$apply();
                updateSimulation();
            }
        }
        $scope.$apply();
        updateSimulation();
    });

    // Watches for selected wavelengths to show and updates the plate
    $scope.$watch('wavelengthIndex',updateSimulation);

    // Whenever the step is changed update the simulation
    $scope.$watch(currentStep,updateSimulation);

    //Updates the plate when the windows size is changed
    $scope.$watch('size',updateSimulation,true);

    //When the plate object is replaced update the simulation
    $scope.$watch(plate.get, updateSimulation);

    //When the device is change update the simulation. Required since plate does not change when switching device
    //if the form is in an invalid state.
    $scope.$watch(function(){return formData.getData().device}, updateSimulation);

}]);
