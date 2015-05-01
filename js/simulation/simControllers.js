app.controller('simController', ['$scope', 'formData', 'plate', 'chart', function ($scope, formData, plate, chart) {
    $scope.getDevice = function () {
        return formData.getData().device
    };
    var getDevice = $scope.getDevice;
    $scope.plateView = true;
    $scope.selectedRow = 0;
    $scope.selectedCol = 0;
    $scope.selectedWell = ($scope.selectedRow) * getDevice().cols + ($scope.selectedCol);
    $scope.speedSlider = 0.5;
    $scope.prettyTime = '00:00:00';
    $scope.simActive = false;
    $scope.percentTime = 0;
    var currentStep = 0; //current timestep

    $scope.updateView = function() {
        if ($scope.plateView) {
            console.log('drawing plate');
            try {
                drawPlate(plate.get().createPlateView(currentStep));
            }
            catch (err) {
                console.log("Caught plate draw error");
            }
        }
        else {
            console.log('drawing chart');
            try {
                chart.updateData($scope.selectedWell);
            }
            catch (err) {
                console.log("Caught plate chart error");
            }
        }
    }
    $scope.toggleView = function () {
        $scope.plateView = !$scope.plateView;
        $scope.updateView();
    }
        //Updates the plate view whenever a variable is changed
    $scope.$watch(function () {return plate.get()}, $scope.updateView);
    $scope.$watch(currentStep,$scope.updateView);

    var intervalFunc; //Stores most recent interval function (setInterval())
    var interval = 100; //refresh rate in milliseconds
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
            updatePlate();
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
        }

        function getMaxSteps() {
            // Gets the maximum number of steps of the simulation
            return plate.get().numPts - 1;
        }
    }

    var canvas = document.getElementsByTagName('canvas');
    var context = canvas[0].getContext('2d');
    //Physically updates the plate when a device is changed
    function updatePlate() {
        drawPlate(plate.get().createPlateView(currentStep)); // Passes **index** of current time step, recieves a 3D array of ints.
    }

    function drawPlate(intensityStep) {
        // Draws a plate given a 3D array of x,y,channel intensities
        var strokeWidth = 3;
        var displayScaleParam = 3;
        var canvas = $(".canvas")[0];
        console.log("canvas style width: " + canvas.style.width + " // canvas height: " + canvas.style.height);
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        console.log("osW:" + canvas.offsetWidth + "   osH:" + canvas.offsetHeight);
        console.log("canvas width: " + canvas.width + " // canvas height: " + canvas.height);
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        var spacing = getSpacing(getDevice().cols, getDevice().rows);
        // Upper bound of LED intensities to be displayed
        var numOfLEDs = getDevice().leds.length;
        for (var x = 0; x < getDevice().cols; x++) {
            for (var y = 0; y < getDevice().rows; y++) {
                //Draw black background
                initializeWell(x, y, spacing, strokeWidth, true, 'rgba(0,0,0,1)');
                // Lower bound of LED intensities to be displayed
                var c = (numOfLEDs == getDevice().colors.length ) ? 0 : numOfLEDs;
                context.globalCompositeOperation = "lighter"; //Adds colors together
                //Draw intensities (alpha modulation)
                for (c; c < numOfLEDs + 1; c++) {
                    var scaledInt = 1 - Math.exp(-displayScaleParam * (intensityStep[y][x][c] / plate.get().maxGSValue));
                    initializeWell(x, y, spacing, strokeWidth, true, getDevice().colors[c] + scaledInt + ')');
                }
                context.globalCompositeOperation = "source-over"; //draws outline of well
                drawWellOutline([x], [y]);
            }
        }
        //draws selection outline of selected well
        drawWellOutline([undefined, $scope.selectedCol - 1], [undefined, $scope.selectedRow - 1]);

        function drawWellOutline(xArray, yArray, drawOver) {
            // Draws the outline of a well. When given a 1x2 array for X and Y values, draws a
            // black outline for well x[0], y[0] and a dashed outline for well x[1], y[1].
            var spacing = getSpacing(getDevice().cols, getDevice().rows);
            var color = ['#000000', '#FFFFFF']
            var strokeWidth = [3, 2];
            for (var i = 0; i < xArray.length; i++) {
                initializeWell(xArray[i], yArray[i], spacing, strokeWidth[0]);
                context.lineWidth = strokeWidth[i];
                if (i > 0) {
                    context.setLineDash([5])
                } //Dashed line
                //Required to completely draw over previously made dashed line
                else if (drawOver == true) {
                    context.setLineDash([0])
                }
                ;
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

        function getSpacing(xNum, yNum) {
            // Calculates the spacing given current values of the canvas element
            var canvas = document.querySelector('canvas');
            return Math.min(Math.floor((context.canvas.width - 10) / xNum),
                Math.floor((context.canvas.height - 10) / yNum));
        }
    }
}]);