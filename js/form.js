/*
/ Device specifications
/ Handle Dynamic number of LED entries
*/
function init() {
    updateLEDnum();
    updateDevices();
}
//Update device properties
function updateDevices(){
    var fields = $("#LDSpecs").children().not("#devicesli");
    var device = $("#devices").val()
    if (device=="custom"){
            fields.show();
        }
    else {
        fields.hide();
        if (device == "LTA") { setDeviceFields(8, 8, [10, 20, 30, 40]);console.log("LTA"); }
        else if (device == "LPA") { setDeviceFields(4, 6, [11, 22, 33, 44]) }
        else if (device == "TCA") { setDeviceFields(8, 12, [12, 23, 34, 45]) }
    }
    updateWavelengths();
    console.log("Updated to device to " + device);
}
function setDeviceFields(rows,columns,wavelengths){
    $("#rows").val(rows);
    $("#columns").val(columns);
    $("#LEDnum").val(wavelengths.length);
    updateLEDnum();
    for(var i=0;i<wavelengths.length;i++) {
        $("#LED" + i).val(wavelengths[i]);
    }
    console.log("updated device properties");
}
//Listen for changes to the device selector
$("#devices").change(function () {
    updateDevices();
});
//Updates the LED number
function updateLEDnum(){
    var newLEDnum = $("#LEDnum").val();//The currently selected number of LEDs
    var maxLEDnum = $("#LEDnum").attr("max");//The maximum number of LEDs
    var currentLEDs= $("#LEDs").children().not(".template");//A list of current LED objects
    //If there are too many LED objects remove the ones at the end
    if (currentLEDs.length > newLEDnum) {
        //Iterate through all the LEDs and start removing them when the current number is surpassed
        currentLEDs.each(function (index, elem) {
            if (index >= newLEDnum) {
                $(elem).remove();
                //Remove LED entry from dropdown in  functions
                $(".wavelength" + index).remove();
                console.log("Removed LED");
            }
        });
    }
    //If there are too few LED objects append on more
    else if (currentLEDs.length <newLEDnum) {
        for(var i=currentLEDs.length;i<newLEDnum&&i<maxLEDnum;i++) {
            var newLED=$("#LEDs").children().filter(".template").clone();//Pull and clone the html template of an LED
            newLED.removeClass("template");
            //Add unique identifiers to the varius inputs of the LED
            newLED.children().filter("label").attr("for","LED"+i);
            newLED.children().filter("input").attr("id","LED"+i).attr("name","LED"+i);
            //Change the text
            newLED.children().filter("label").text("Wavelength for LED " + (i+1));
            //Bind event listener
            newLED.children().filter("input").bind("change",function () {
                updateWavelengths();
            });
            //Add the modified LED html to the page
            $("#LEDs").append(newLED);
            //Add LED entry to dropdown in functions
            $(".funcWavelength").append($('<option/>').attr("class","wavelength"+i).attr("value",newLED.children().filter("input").attr("id")).text(newLED.children().filter("input").attr("value")));

            console.log("Added LED"+i);
        }
    }
}
//Event listening to changes in LED number
$("#LEDnum").change(function () {
    updateLEDnum();
});
/*
/ Function modifications
/ Adjust wavelength in function select
*/
function updateWavelengths() {
    $(".funcWavelength > option").each(function() {
       $(this).text( $("#"+$(this).attr("value")).val());
    });
}
//Add functions
function addFunc(type){
    //Unique ID of the function
    // Check to see if the counter has been initialized
    if ( typeof addFunc.index == 'undefined' ) {
        // It has not perform the initilization
        addFunc.index = 0;
    }
    //Otherwise increment the index
    else {
        addFunc.index++;
    }
    var newFunc = $("."+type+".template").clone();
    newFunc.removeClass("template");
    //Fields to give unique identifiers
    var fields;
    if(type=="const") { fields=["start","replicates","LEDFuncNum","ints", "RC", "CR"];}
    else if (type=="step") {fields = ["start","replicates","LEDFuncNum","RC", "CR", "amplitude","stepTime","samples","stepUp","stepDown"];}
    else if (type=="sine") {fields = ["start","replicates","LEDFuncNum","RC", "CR", "amplitude","phase","period","offset","samples"]};
    //Cycle through each of the fields giving them unique IDs, names, and associating the labels
    for(var i=0;i<fields.length;i++) {
        var field = fields[i];
        newFunc.find("input." + field).attr("id", field + addFunc.index);
        newFunc.find("input."+field).attr("name", field + addFunc.index);
        newFunc.find("label."+field).attr("for", field + addFunc.index);
    }
    //Give radio buttons the same name but differnent 
    newFunc.find("input.RC").attr("name", "orientation" + addFunc.index).attr("value","row");
    newFunc.find("input.CR").attr("name", "orientation" + addFunc.index).attr("value","column");
    if(type==="step") {
        newFunc.find("input.stepUp").attr("name", "sign" + addFunc.index).attr("value","stepUp");
        newFunc.find("input.stepDown").attr("name", "sign" + addFunc.index).attr("value","stepDown");        
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

//initialize HTML elements
init();
