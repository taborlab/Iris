var LPI = (function () {

    var simulationManager = (function () {
        return {
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
                        var newLED = $("#LEDsDisplay").children().filter(".template").clone(); //Pull and clone the html template of an LED
                        newLED.removeClass("template");
                        newLED.css("display", "inline");
                        //newLED.attr("id", "LEDDisplay" + i);
                        //Bind event listener
                        //Add the modified LED html to the page
                        $("#LEDsDisplay").append(newLED);
                    }
                }
            }
        }
    })();

    var inputsManager = (function () {
        /*
        / Add and remove different function types
        */
        //Add functions
        function addFunc(type) {
            // Unique ID of the function
            // Check to see if the counter has been initialized
            if (typeof addFunc.index == 'undefined') {
                // It has not perform the initilization
                addFunc.index = 0;
            }
            //Otherwise increment the index
            else {
                addFunc.index++;
            }
            var newFunc = $("." + type + ".template").clone();
            newFunc.removeClass("template");
            //Fields to give unique identifiers
            var fields;
            if (type == "const") { fields = ["funcType", "start", "replicates", "funcWavelength", "ints", "RC", "CR"]; }
            else if (type == "step") { fields = ["funcType", "start", "replicates", "funcWavelength", "RC", "CR", "amplitude", "stepTime", "samples", "stepUp", "stepDown"]; }
            else if (type == "sine") { fields = ["funcType", "start", "replicates", "funcWavelength", "RC", "CR", "amplitude", "phase", "period", "offset", "samples"] };
            //Cycle through each of the fields giving them unique IDs, names, and associating the labels
            for (var i = 0; i < fields.length; i++) {
                var field = fields[i];
                newFunc.find("input." + field).attr("id", field + addFunc.index);
                newFunc.find("input." + field).attr("name", field + addFunc.index);
                newFunc.find("label." + field).attr("for", field + addFunc.index);
            }

            //Give radio buttons the same name but differnent 
            newFunc.find("input.RC").attr("name", "orientation" + addFunc.index).attr("value", "row");
            newFunc.find("input.CR").attr("name", "orientation" + addFunc.index).attr("value", "column");
            if (type === "step") {
                newFunc.find("input.stepUp").attr("name", "sign" + addFunc.index).attr("value", "stepUp");
                newFunc.find("input.stepDown").attr("name", "sign" + addFunc.index).attr("value", "stepDown");
            }
            //Insert element
            $("#LPSpecs").append(newFunc);
            console.log("Function added");
            //Remove function entry when close is clicked
            //This has to be done each time to register the new button
            $(".close").click(function () {
                $(this).parents(".func").remove();

            });
        }
        //Listeners for adding functions
        $("#constButt").click(function () {
            console.log("Adding constant function");
            addFunc("const");
        });
        $("#stepButt").click(function () {
            console.log("Adding step function");
            addFunc("step");
        });
        $("#sineButt").click(function () {
            console.log("Adding sine function");
            addFunc("sine");
        });
        return {
            updateInputsWavelengths: function () {
                $(".funcWavelength > option").each(function () {
                    $(this).text($("#" + $(this).attr("value")).val());
                });
            },
            removeLED: function (index) {
                $(".wavelength" + index).remove();
            },
            addLED: function (index, id, wavelength) {
                $(".funcWavelength").append($('<option/>').attr("class", "wavelength" + index).attr("value", id).text(wavelength));
            }
        }
    })();

    var devicesManager = (function (inputs, simulation) {
        function update() {
            var fields = $("#LDSpecs").children().not("#devicesli");
            var device = $("#devices").val()
            if (device == "custom") {
                fields.show();
            }
            else {
                fields.hide();
                if (device == "LTA") { setDeviceFields(8, 8, [10, 20, 30, 40]); }
                else if (device == "LPA") { setDeviceFields(4, 6, [11, 22], [[1, 0, 0], [0, 1, 0]]) }
                else if (device == "TCA") { setDeviceFields(8, 12, [12, 23], [[0, 1, 0], [0, 0, 1]]) }
            }
        }
        //Updates the wavelengths in each of the inputs open

        function setDeviceFields(rows, columns, wavelengths) {
            $("#rows").val(rows);
            $("#columns").val(columns);
            $("#LEDnum").val(wavelengths.length);
            updateWavelengthNumber();
            updateWavelengthValues(wavelengths);
            //Update wavelengths in the inputs
            inputs.updateInputsWavelengths();
            //Update the LEDs displayed in the simulation
            simulation.updateDisplayedLEDs();
        }
        function updateWavelengthNumber() {
            //Update LED number
            var newLEDnum = $("#LEDnum").val(); //The currently selected number of LEDs
            var maxLEDnum = $("#LEDnum").attr("max"); //The maximum number of LEDs
            //===================================
            //Manage LEDs in inputs
            var currentLEDs = $("#LEDs").children().not(".template"); //A list of current LED objects
            //If there are too many LED objects remove the ones at the end
            if (currentLEDs.length > newLEDnum) {
                //Iterate through all the LEDs and start removing them when the current number is surpassed
                currentLEDs.each(function (index, elem) {
                    if (index >= newLEDnum) {
                        $(elem).remove();
                        //Remove LED entry from dropdown in  inputs
                        inputs.removeLED(index);
                    }
                });
            }
            //If there are too few LED objects append on more
            else if (currentLEDs.length < newLEDnum) {
                for (var i = currentLEDs.length; i < newLEDnum && i < maxLEDnum; i++) {
                    var newLED = $("#LEDs").children().filter(".template").clone(); //Pull and clone the html template of an LED
                    newLED.removeClass("template");
                    //Add unique identifiers to the varius inputs of the LED
                    newLED.children().filter("label").attr("for", "LED" + i);
                    newLED.children().filter("input").attr("id", "LED" + i).attr("name", "LED" + i);
                    //Change the text
                    newLED.children().filter("label").text("Wavelength for LED " + (i + 1));
                    //Bind event listener
                    newLED.children().filter("input").bind("change", function () {
                        inputs.updateInputsWavelengths();
                    });
                    //Add the modified LED html to the page
                    $("#LEDs").append(newLED);
                    //Add LED entry to dropdown in inputs
                    inputs.addLED(i, newLED.children().filter("input").attr("id"), newLED.children().filter("input").attr("value"));
                }
            }
        }
        function updateWavelengthValues(wavelengths) {
            //Update LED wavelengths
            for (var i = 0; i < wavelengths.length; i++) {
                $("#LED" + i).val(wavelengths[i]);
            }
        }
        //Listen for changes to the device selector
        $("#devices").change(function () {
            update();
        });
        //Event listening to changes in LED number
        $("#LEDnum").change(function () {
            updateWavelengthNumber();
            inputs.updateInputsWavelengths();
            simulation.updateDisplayedLEDs();
        });

        update();

    })(inputsManager, simulationManager);

})();