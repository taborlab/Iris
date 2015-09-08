app.controller('simController', ['$scope','$timeout', 'formData', 'plate', 'chart', function ($scope, $timeout, formData, plate, chart) {
    $scope.getDevice = function () {
        return formData.getData().device
    };
    $scope.getColors = function () {return formData.getColors()};
    var getDevice = $scope.getDevice;
    $scope.plateView = true;
    $scope.selectedRow = 0;
    $scope.selectedCol = 0;
    $scope.selectedWell = function(){return ($scope.selectedRow) * getDevice().cols + ($scope.selectedCol);};
    $scope.speedSlider = 0.5;
    $scope.prettyTime = '00:00:00';
    $scope.simActive = false;
    $scope.percentTime = 0;
    var currentStep = 0; //current timestep
    $scope.display={};
    //Called when any data is changed
    $scope.$watch('getDevice()', function() {
        if (getDevice().name!="default") {
            console.log('accessed sim display');
            $scope.display.sim = 'block';
        }
    });
    $scope.$watch('getDevice()',function(){$scope.wavelengthIndex="";})
    //Handles clicking on the plate
    $scope.handleClick = function(evt) {
        //If we're not in the plate view exit
        if(!$scope.plateView){
            return;
        }
        //Temporarily store old data to overwrite old highlight
        var oldRow = $scope.selectedRow;
        var oldCol = $scope.selectedCol;
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
            $scope.$apply(function(){
                $scope.selectedCol = clickedX;
                $scope.selectedRow = clickedY;
            });
            //drawRangeBars(spacing); Temporarily commented out
            updatePlate(currentStep);
        }
    };
    //Handels arrow key navigation
    $scope.$on('keydown', function( msg, obj ) {
        var code = obj.code;
        //Temporarily store old data to overwrite old highlight
        var oldRow = $scope.selectedRow;
        var oldCol = $scope.selectedCol;

        //right arrow
        if (code === 39) {
            //If its not the last col
            if ($scope.selectedCol !== getDevice().cols - 1) {
                $scope.selectedCol++;
                $scope.$apply();
                $scope.updateView();
            }
            //If its not the last row
            else if ($scope.selectedRow !== getDevice().rows - 1) {
                $scope.selectedCol = 0;
                $scope.selectedRow++;
                $scope.$apply();
                $scope.updateView();
            }
        }
        //left arrow
        else if (code === 37) {
            //If its not the first col
            if ($scope.selectedCol !== 0) {
                $scope.selectedCol--;
                $scope.$apply();
                $scope.updateView();
            }
            //If its not the first row
            else if ($scope.selectedRow !== 0) {
                $scope.selectedCol = getDevice().cols - 1;
                $scope.selectedRow--;
                $scope.$apply();
                $scope.updateView();
            }
        }
        //Up arrow
        else if (code === 38) {
            //if its not the first row
            if ($scope.selectedRow !== 0) {
                $scope.selectedRow--;
                $scope.$apply();
                $scope.updateView();
            }
            //If its not the first col
            else if ($scope.selectedCol !== 0) {
                $scope.selectedRow = getDevice().rows - 1;
                $scope.selectedCol--;
                $scope.$apply();
                $scope.updateView();
            }
        }
        //Down arrow
        else if (code === 40 ){
            //If its not the last row
            if ($scope.selectedRow !== getDevice().rows - 1) {
                $scope.selectedRow++;
                $scope.$apply();
                $scope.updateView();
            }
            //If its not the last col
            else if ($scope.selectedCol !== getDevice().cols - 1) {
                $scope.selectedRow = 0;
                $scope.selectedCol++;
                $scope.$apply();
                $scope.updateView();
            }
        }
        $scope.$apply();
        updatePlate(currentStep);
    });
    $scope.updateView = function() {
        if ($scope.plateView) {
            updatePlate();
        }
        else {
            console.log('drawing chart');
            try {
                chart.updateData($scope.selectedWell());
            }
            catch (err) {
                console.log("Caught plate chart error");
            }
        }
    }
    $scope.$watch('wavelengthIndex',$scope.updateView);
    $scope.toggleView = function () {
        $scope.plateView = !$scope.plateView;
        $scope.updateView();
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
        //Updates the plate view whenever a variable is changed
    $scope.$watch(function () {return plate.get()}, $scope.updateView);
    $scope.$watch(currentStep,$scope.updateView);
    $scope.$watch('size',updatePlate,true);
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
        try{
            drawPlate(plate.get().createPlateView(currentStep)); // Passes **index** of current time step, recieves a 3D array of ints.
        }
        catch (err) {
            console.log(err);
        }
    }

    function drawPlate(intensityStep) {
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
        //Iterate throw each well
        for (var x = 0; x < getDevice().cols; x++) {
            for (var y = 0; y < getDevice().rows; y++) {
                //Initialize Circle
                context.beginPath();
                context.arc(x * spacing + spacing * 0.5 + strokeWidth,
                    y * spacing + spacing * 0.5 + strokeWidth,
                    spacing * 0.5, 0, 2 * Math.PI, false);
                //Draw black background
                context.fillStyle = 'rgba(0,0,0,1)';
                context.fill();
                //Make colors compose correctly, ie. like light would
                context.globalCompositeOperation = "lighter";
                //Iterate through leds drawing colors on top of each other
                for (var i=ledStart; i < ledEnd ; i++) {
                    //Exponential normlization of the values from the plate object by max alpha level
                    var scaledInt = 1 - Math.exp(-displayScaleParam * (intensityStep[y][x][i] / plate.get().maxGSValue));
                    context.fillStyle = 'rgba'+formData.getColors()[i].slice(3, - 1)+',' + scaledInt + ')';
                    context.fill();
                }
                //Draw well Outline
                context.globalCompositeOperation = "source-over";
                context.lineWidth = 3;
                context.strokeStyle = '#000000';
                context.stroke();
                context.closePath();
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

    function getSpacing(xNum, yNum) {
        return Math.min(Math.floor(($scope.size.width-10) / xNum),
            Math.floor(($scope.size.height-10) / yNum));
    }

}]);