//Dyanmic HTML Elements
var LED;//A LED element
var funcGen;//Common elements of a function
var funcConst;//A constact function
var funcStep;//A step function
var funcSine;//A sine wave function


//Handle Dynamic number of LED entries
function init() {
    updateLEDnum();
}
//Updates the LED number
function updateLEDnum(){
    var newLEDnum = $("#LEDnum").val();//The currently selected number of LEDs
    var maxLEDnum = $("#LEDnum").attr("max");//The maximum number of LEDs
    var currentLEDs= $("#LEDs").children().not(".template");//A list of current LED objects
    //If there are too many LED objects remove the ones at the end
    if (currentLEDs.length > newLEDnum) {
        //Iterate through all the LEDs and start removing them when the current number is surpassed
        currentLEDs.each(function( index, elem ) {
            if(index >= newLEDnum) {
                $(elem).remove();
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
            newLED.children().filter(".wavelength").filter("label").attr("for","wavelength"+i);
            newLED.children().filter(".wavelength").filter("input").attr("id","wavelength"+i).attr("name","wavelength"+i);
            //Change the text
            newLED.children().filter(".wavelength").filter("label").text("Wavelength for LED " + (i+1));
            //Add the modified LED html to the page
            $("#LEDs").append(newLED);
            console.log("Added LED"+i);
        }
    }
}
//Event listening to changes in LED number
$("#LEDnum").change(function () {
    updateLEDnum();
});
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
    $("#LPFuncs").append(newFunc);
    console.log("Function added");
    //Remove function entry when close is clicked
    //This has to be done each time to register the new button
    $(".close").click(function () {
    $(this).parents(".func").remove();

});
}
//Listeners for adding elements
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
