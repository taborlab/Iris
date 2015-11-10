app.service('formData', function () {
    //Default false coloring scheme
    var falseColorRGB = [[255,0,0],[0,201,86],[0,90,222],[99,0,0]];
    var data={
        device: {
            name: 'default',
            "uploaded": false,
            "rows": 8,
            "cols": 12,
            "leds": [],
            "display": "none"
        },
        experiments: [],
        param:{
            falseColors: true
        }
    };
    var isValid = true;
    //Based on http://www.efg2.com/Lab/ScienceAndEngineering/Spectra.htm
    function wavelengthToRGB(Wavelength) {
        var factor;
        var Red,Green,Blue;
        var Gamma = 0.80;
        var IntensityMax = 255;
        if((Wavelength >= 380) && (Wavelength<440)){
            Red = -(Wavelength - 440) / (440 - 380);
            Green = 0.0;
            Blue = 1.0;
        }else if((Wavelength >= 440) && (Wavelength<490)){
            Red = 0.0;
            Green = (Wavelength - 440) / (490 - 440);
            Blue = 1.0;
        }else if((Wavelength >= 490) && (Wavelength<510)){
            Red = 0.0;
            Green = 1.0;
            Blue = -(Wavelength - 510) / (510 - 490);
        }else if((Wavelength >= 510) && (Wavelength<580)){
            Red = (Wavelength - 510) / (580 - 510);
            Green = 1.0;
            Blue = 0.0;
        }else if((Wavelength >= 580) && (Wavelength<645)){
            Red = 1.0;
            Green = -(Wavelength - 645) / (645 - 580);
            Blue = 0.0;
        }else if((Wavelength >= 645) && (Wavelength<781)){
            Red = 1.0;
            Green = 0.0;
            Blue = 0.0;
        }else{
            Red = 0.0;
            Green = 0.0;
            Blue = 0.0;
        };

        // Let the intensity fall off near the vision limits

        if((Wavelength >= 380) && (Wavelength<420)){
            factor = 0.3 + 0.7*(Wavelength - 380) / (420 - 380);
        }else if((Wavelength >= 420) && (Wavelength<701)){
            factor = 1.0;
        }else if((Wavelength >= 701) && (Wavelength<781)){
            factor = 0.3 + 0.7*(780 - Wavelength) / (780 - 700);
        }else{
            factor = 0.0;
        };


        var rgb = [];

        // Don't want 0^x = 1 for x <> 0
        rgb[0] = Red==0.0 ? 0 : Math.round(IntensityMax * Math.pow(Red * factor, Gamma));
        rgb[1] = Green==0.0 ? 0 : Math.round(IntensityMax * Math.pow(Green * factor, Gamma));
        rgb[2] = Blue==0.0 ? 0 : Math.round(IntensityMax * Math.pow(Blue * factor, Gamma));

        return rgb;
    }
    var experiments=null;
    return{
        getData: function() {
            return data;
        },
        setData: function(value){
            data = value;
        },
        setDevice: function(value){
            data.device = value;
        },
        setValid: function(value) {
            isValid = value;
        },
        getParam: function() {
            return data.param;
        },
        setParam: function(value) {
            data.param = value;
        },
        getExperiments: function(){
            return data.experiments;
        },
        getColors: function() {
            var rgbValues=[];
            for (var i = 0; i < data.device.leds.length; i++) {
                var ledRGB;
                if (data.param.falseColors === true) {
                    if(data.device.leds[i]['rgb']) {
                        ledRGB = data.device.leds[i]['rgb'];
                    }
                    else {
                        ledRGB = falseColorRGB[i];
                    }
                }
                else {
                    var wavelength = Math.floor(data.device.leds[i]['wavelength']);
                    ledRGB = wavelengthToRGB(wavelength);
                }
                rgbValues[i] = 'rgb(' + ledRGB[0] + ',' + ledRGB[1] + ',' + ledRGB[2] + ')';
            }
            return rgbValues;
        },
        isValid: function() {
            return isValid;
        }
    }
});

app.service('plate',function(){
    var plate = null;
    return {
        get: function() {
            return plate;
        },
        set: function(value) {
            plate=value;
        }
    }
})

app.service('formValidation',['formData',function(formData){
        // Loops through form hierarchy and creates error objects containing:
        //      1. boolean -- whether the particular error has occurred
        //      2. str -- text describing the nature of the error (which will be applied to the tooltip)
        function updateValidation() {
            var inputsValid = true;
            // First, iterate through all data elements and determine which errors are present.
            //  Set their .valid elements to false
            var totalWellNum = formData.getData().device.rows * formData.getData().device.cols;
            var totalWellsUsed = 0;
            formData.getData().InsufficientWellsError = {};
            formData.getData().InsufficientWellsError.valid = true;
            formData.getData().InsufficientWellsError.text = 'Experiments must not specify more than ' + totalWellNum + ' wells.';
            var totalTime;
            formData.getData().timeFormatError = {};
            formData.getData().timeFormatError.valid = true;
            formData.getData().timeFormatError.text = 'Input time must be a positive number less than 7200.';
            try {
                totalTime = Math.floor(parseFloat(formData.getData().param.time) * 60) * 1000;
                if (isNaN(totalTime) || totalTime < 0 || totalTime > 7200 * 60 * 1000) {
                    formData.getData().timeFormatError.valid = false;
                    inputsValid = false;
                }
                else {
                    formData.getData().timeFormatError.valid = true;
                }
            }
            catch (err) {
                formData.getData().timeFormatError.valid = false;
                inputsValid = false;
            }

            // Check each experiment
            for (var i = 0; i < formData.getData().experiments.length; i++) {
                var experiment = formData.getData().experiments[i];
                var wfchannels = []; // Will hold a list of all channel indices for each waveform to check for redundancy
                experiment.timepointsValid = true;
                experiment.wellsUsed = -1;
                experiment.isSteadyState = true; // True when all waveforms are const (experiment has no dynamic component & waveforms can be added).
                // If waveforms are added, check they all have the same length.
                experiment.addWaveformsLength = 0;
                experiment.addWaveformsLengthError = {};
                experiment.addWaveformsLengthError.valid = true;
                experiment.addWaveformsLengthError.text = 'Added waveforms must all have the same number of intensities.';
                // Check # Evenly Spaced Timepoints
                var numTimepoints;
                experiment.numTimepointsFormatError = {}
                experiment.numTimepointsFormatError.valid = true;
                experiment.numTimepointsFormatError.text = 'Must specify a positive integer less than or equal to the number of wells.';
                try {
                    numTimepoints = parseInt(experiment.samples);
                    if (isNaN(numTimepoints) || numTimepoints > totalWellNum || numTimepoints < 1) {
                        experiment.numTimepointsFormatError.valid = false;
                        experiment.timepointsValid = false;
                    }
                }
                catch (err) {
                    experiment.numTimepointsFormatError.valid = false;
                    experiment.timepointsValid = false;
                }
                // Check Delay
                var delay;
                experiment.delayFormatError = {}
                experiment.delayFormatError.valid = true;
                experiment.delayFormatError.text = 'Must be a positive number less than the total experiment length.';
                try {
                    delay = Math.floor(parseFloat(experiment.startTime * 60) * 1000);
                    if (isNaN(delay) || delay < 0 || delay >= totalTime || experiment.startTime.replace(/\s/g, "").length == 0) {
                        experiment.delayFormatError.valid = false;
                        experiment.timepointsValid = false;
                    }
                }
                catch (err) {
                    experiment.delayFormatError.valid = false;
                    experiment.timepointsValid = false;
                }
                experiment.ESTPvalid = (experiment.numTimepointsFormatError.valid && experiment.delayFormatError.valid)
                // Check custom timepoints CSV
                var customTimepoints; // will hold intensity CSV list
                experiment.timepointsCSVFormatError = {}
                experiment.timepointsCSVFormatError.valid = true;
                experiment.timepointsCSVFormatError.text = 'Must be a comma separated list of positive numbers.';
                experiment.timepointsCSVLengthError = {};
                experiment.timepointsCSVLengthError.valid = true;
                experiment.timepointsCSVLengthError.text = 'Must have at least one intensity, and the total number cannot be greater than the number of wells.';
                experiment.timepointFormatError = {};
                experiment.timepointFormatError.valid = true;
                experiment.timepointFormatError.text = 'Timepoints must be numbers between 0 and the total program duration.';
                // try parsing the intensity CSV
                try {
                    customTimepoints = JSON.parse('[' + experiment.timepoints + ']');
                    experiment.timepointsCSVFormatError.valid = true;
                    if (customTimepoints.length == 0) {
                        experiment.timepointsCSVLengthError.valid = false; // default error text
                        experiment.timepointFormatError.valid = true; // default
                        experiment.timepointsValid = false;
                    }
                    else if (customTimepoints.length > 0 && customTimepoints.length <= totalWellNum) { // valid number of wells used
                        experiment.timepointsCSVLengthError.valid = true;
                        var timepointOutOfBounds = false;
                        for (var vali = 0; vali < customTimepoints.length; vali++) {
                            if ((customTimepoints[vali] < 0 || customTimepoints[vali] * 60 * 1000 > totalTime) && !timepointOutOfBounds) {
                                timepointOutOfBounds = true;
                            } // ints[vali] is outside the valid range
                        }
                        if (timepointOutOfBounds) {
                            experiment.timepointFormatError.valid = false;
                            experiment.timepointsValid = false;
                        }
                        else {
                            experiment.timepointFormatError.valid = true;
                        }
                    }
                    else { // length of ints is > num wells (too large)
                        experiment.timepointsCSVLengthError.valid = false;
                        experiment.timepointsCSVLengthError.text = 'Must have a number of timepoints less than or equal to the number of wells.\nCurrently have ' + customTimepoints.length + '/' + totalWellNum + '.';
                        experiment.timepointFormatError.valid = true; // default
                        experiment.timepointsValid = false;
                    }
                }
                catch (err) { // if it can't be parsed, mark CSV as invlid and all other errors as valid (cannot be tested; valid by default)
                    experiment.timepointsCSVFormatError.valid = false;
                    experiment.timepointsCSVLengthError.valid = true;
                    experiment.timepointFormatError.valid = true;
                    experiment.timepointsValid = false;
                }
                experiment.TPCSVvalid = (experiment.timepointsCSVFormatError.valid && experiment.timepointsCSVLengthError.valid && experiment.timepointFormatError.valid);
                // Next level:  check the total number of timepoints specified and choose which to use: custom timepoints or evenly spaced
                // If # timepoints, custom timepoints CSV, and delay all valid, mark all invalid
                // --> Can only specify ONE: evenly spaced or custom timepoints
                experiment.allTimepointsValidError = {}
                experiment.allTimepointsValidError.valid = true;
                experiment.allTimepointsValidError.text = 'Cannot specify both equally-spaced and custom time points. Remove redundant inputs.';
                experiment.redundantESTPError = {}
                experiment.redundantESTPError.valid = true;
                experiment.redundantESTPError.text = 'Custom Timepoints appear to be selected - this information is redundant.';
                experiment.redundantDelayError = {}
                experiment.redundantDelayError.valid = true;
                experiment.redundantDelayError.text = 'Custom Timepoints appear to be selected - this information is redundant.';
                experiment.redundantCSVError = {}
                experiment.redundantCSVError.valid = true;
                experiment.redundantCSVError.text = 'Evenly Spaced Timepoints appear to be selected - this information is redundant.';
                if (experiment.timepointsValid) { // All TP fields valid; this is ambiguous
                    experiment.allTimepointsValidError.valid = false;
                    inputsValid = false;
                }
                else if (experiment.TPCSVvalid && !experiment.ESTPvalid) { // Custom TPs selected but possible errors on even TP fields
                    experiment.wellsUsed = customTimepoints.length;
                    if (experiment.samples !== undefined && experiment.samples !== '') { // Other TP info entered; form invalid
                        experiment.redundantESTPError.valid = false;
                        inputsValid = false;
                        experiment.wellsUsed = 0;
                    }
                    if (experiment.startTime !== undefined && experiment.startTime !== '') {
                        experiment.redundantDelayError.valid = false;
                        inputsValid = false;
                        experiment.wellsUsed = 0;
                    }

                }
                else if (experiment.ESTPvalid && !experiment.TPCSVvalid) { // Equally-Spaced Time Points valid, but CSV invalid
                    experiment.wellsUsed = numTimepoints;
                    if (experiment.timepoints !== undefined && experiment.timepoints !== '') {
                        experiment.redundantCSVError.valid = false;
                        inputsValid = false;
                        experiment.wellsUsed = 0;
                    }
                }
                else {
                    inputsValid = false;
                    experiment.wellsUsed = 0;
                }

                // Check replicates
                var replicates;
                experiment.replciatesFormatError = {};
                experiment.replciatesFormatError.valid = true;
                experiment.replciatesFormatError.text = 'Must be a positive non-zero integer less than or equal to the number of wells.';
                try {
                    replicates = parseInt(experiment.replicates);
                    if (isNaN(replicates) || replicates <= 0 || replicates > totalWellNum) {
                        experiment.replciatesFormatError.valid = false;
                        inputsValid = false;
                        experiment.wellsUsed = experiment.wellsUsed * 0;
                    }
                    else {
                        experiment.wellsUsed = experiment.wellsUsed * replicates;
                    }
                }
                catch (err) {
                    experiment.replciatesFormatError.valid = false;
                    inputsValid = false;
                    experiment.wellsUsed = experiment.wellsUsed * 0;
                }

                // Check each waveform
                for (var j = 0; j < experiment.waveforms.length; j++) {
                    var waveform = experiment.waveforms[j];
                    // Check using unique LED:
                    waveform.LEDSelectionError = {};
                    waveform.LEDSelectionError.valid = true;
                    waveform.LEDSelectionError.text = 'An LED may only be used by one waveform in an experiment.';
                    for (var wfchi = 0; wfchi < wfchannels.length; wfchi++) {
                        if (wfchannels[wfchi] == waveform.wavelengthIndex) { // LED already in use
                            // Mark BOTH waveforms invalid
                            waveform.LEDSelectionError.valid = false;
                            experiment.waveforms[wfchi].LEDSelectionError.valid = false;
                            inputsValid = false;
                        }
                    }
                    wfchannels.push(waveform.wavelengthIndex);
                    // Check waveform-specific parameters:
                    switch (waveform.type) { // check each waveform
                        case 'const':
                            // Define all possible errors for this waveform:
                            waveform.intsCSVFormatError = {};
                            waveform.intsCSVFormatError.valid = true;
                            waveform.intsCSVFormatError.text = 'Must be a comma separated list of valid integers.';
                            waveform.intCSVLengthError = {};
                            waveform.intCSVLengthError.valid = true;
                            waveform.intCSVLengthError.text = 'Must have at least one intensity.';
                            waveform.intFormatError = {};
                            waveform.intFormatError.valid = true;
                            waveform.intFormatError.text = 'Intensities must be integer values in the range [0,4095].';
                            var ints; // will hold intensity CSV list
                            // try parsing the intensity CSV
                            try {
                                ints = JSON.parse('[' + waveform.ints + ']');
                                waveform.intsCSVFormatError.valid = true;
                                if (ints.length == 0) {
                                    waveform.intCSVLengthError.valid = false; // default error text
                                    waveform.intFormatError.valid = true; // default
                                    inputsValid = false;
                                    experiment.wellsUsed = experiment.wellsUsed * 0;
                                }
                                else if (ints.length > 0 && ints.length <= totalWellNum) { // valid number of wells used
                                    waveform.intCSVLengthError.valid = true;
                                    // Check for integer values in correct range:
                                    var ints_rounded = numeric.round(ints);
                                    var hasFloat = false; // may want to separate these later?
                                    var intOutOfBounds = false;
                                    for (var vali = 0; vali < ints.length; vali++) {
                                        if (ints[vali] != ints_rounded[vali] && !hasFloat) {
                                            hasFloat = true;
                                        } // ints[vali] is not an integer
                                        if ((ints_rounded[vali] < 0 || ints_rounded[vali] > 4095) && !intOutOfBounds) {
                                            intOutOfBounds = true;
                                        } // ints[vali] is outside the valid range
                                    }
                                    if (intOutOfBounds || hasFloat) {
                                        waveform.intFormatError.valid = false;
                                        inputsValid = false;
                                        experiment.wellsUsed = experiment.wellsUsed * 0;
                                    }
                                    else if (experiment.isSteadyState && experiment.pairing == 'add') {
                                        waveform.intFormatError.valid = true;
                                        if (experiment.addWaveformsLength == 0) { // First, possibly only, const WF
                                            experiment.addWaveformsLength = ints.length;
                                            experiment.wellsUsed = experiment.wellsUsed * ints.length;
                                        }
                                        else {
                                            if (experiment.addWaveformsLength != ints.length) { // All added waveforms must have the same length
                                                experiment.addWaveformsLengthError.valid = false;
                                                inputsValid = false;
                                            }
                                        }
                                    }
                                    else { // Const waveform is being *combined* with 0 or more other WFs
                                        waveform.intFormatError.valid = true;
                                        experiment.wellsUsed = experiment.wellsUsed * ints.length;
                                    }
                                }
                                else { // length of ints is > num wells (too large)
                                    waveform.intCSVLengthError.valid = false;
                                    waveform.intCSVLengthError.text = 'Number of intensities must be less than or equal to the number of wells.\nCurrently have ' + ints.length + '/' + totalWellNum + '.';
                                    waveform.intFormatError.valid = true; // default
                                    inputsValid = false;
                                    experiment.wellsUsed = experiment.wellsUsed * 0;
                                }
                            }
                            catch (err) { // if it can't be parsed, mark CSV as invlid and all other errors as valid (cannot be tested; valid by default)
                                waveform.intsCSVFormatError.valid = false;
                                waveform.intCSVLengthError.valid = true;
                                waveform.intFormatError.valid = true;
                                inputsValid = false;
                                experiment.wellsUsed = experiment.wellsUsed * 0;
                            }
                            break;
                        case 'step':
                            experiment.isSteadyState = false;
                            // List of all possible errors for this waveform:
                            waveform.intsCSVFormatError = {};
                            waveform.intsCSVFormatError.valid = true;
                            waveform.intsCSVFormatError.text = 'Must be a comma separated list of valid integers.';
                            waveform.intCSVLengthError = {};
                            waveform.intCSVLengthError.valid = true;
                            waveform.intCSVLengthError.text = 'Must have at least one intensity.';
                            waveform.intFormatError = {};
                            waveform.intFormatError.valid = true;
                            waveform.intFormatError.text = 'Intensities must be integer values in the range [0,4095].';
                            waveform.offsetFormatError = {};
                            waveform.offsetFormatError.valid = true;
                            waveform.offsetFormatError.text = 'Must be an integer in the range [0,4095].';
                            waveform.stepTimeFormatError = {};
                            waveform.stepTimeFormatError.valid = true;
                            waveform.stepTimeFormatError.text = 'Must be a number between 0 and program duration.';
                            waveform.intOffsetSumError = {};
                            waveform.intOffsetSumError.valid = true;
                            waveform.intOffsetSumError.text = 'Sum of offset & each amplitude must be a valid integer in [0,4095].';
                            var ints; // will hold intensity CSV list
                            // try parsing the intensity CSV
                            try {
                                ints = JSON.parse('[' + waveform.ints + ']');
                                waveform.intsCSVFormatError.valid = true;
                                if (ints.length == 0) {
                                    waveform.intCSVLengthError.valid = false; // default error text
                                    waveform.intFormatError.valid = true; // default
                                    inputsValid = false;
                                    experiment.wellsUsed = experiment.wellsUsed * 0;
                                }
                                else if (ints.length > 0 && ints.length <= totalWellNum) { // valid number of wells used
                                    waveform.intCSVLengthError.valid = true;
                                    // Check for integer values in correct range:
                                    var ints_rounded = numeric.round(ints);
                                    var hasFloat = false; // may want to separate these later?
                                    var intOutOfBounds = false;
                                    for (var vali = 0; vali < ints.length; vali++) {
                                        if (ints[vali] != ints_rounded[vali] && !hasFloat) {
                                            hasFloat = true;
                                        } // ints[vali] is not an integer
                                        if ((ints_rounded[vali] < -4095 || ints_rounded[vali] > 4095) && !intOutOfBounds) {
                                            intOutOfBounds = true;
                                        } // ints[vali] is outside the valid range
                                    }
                                    if (intOutOfBounds || hasFloat) {
                                        waveform.intFormatError.valid = false;
                                        inputsValid = false;
                                        experiment.wellsUsed = experiment.wellsUsed * 0;
                                    }
                                    else {
                                        waveform.intFormatError.valid = true;
                                        experiment.wellsUsed = experiment.wellsUsed * ints.length;
                                    }
                                }
                                else { // length of ints is > num wells (too large)
                                    waveform.intCSVLengthError.valid = false;
                                    waveform.intCSVLengthError.text = 'Number of intensities must be less than or equal to the number of wells.\nCurrently have ' + ints.length + '/' + totalWellNum + '.';
                                    waveform.intFormatError.valid = true; // default
                                    inputsValid = false;
                                    experiment.wellsUsed = experiment.wellsUsed * 0;
                                }
                            }
                            catch (err) { // if it can't be parsed, mark CSV as invlid and all other errors as valid (cannot be tested; valid by default)
                                waveform.intsCSVFormatError.valid = false;
                                waveform.intCSVLengthError.valid = true;
                                waveform.intFormatError.valid = true;
                                inputsValid = false;
                                experiment.wellsUsed = experiment.wellsUsed * 0;
                            }
                            // Move on to the offset parameter
                            var offset;
                            try {
                                offset = parseInt(waveform.offset);
                                if (isNaN(offset) || offset < 0 || offset > 4095) {
                                    waveform.offsetFormatError.valid = false;
                                    inputsValid = false;
                                }
                                else {
                                    waveform.offsetFormatError.valid = true;
                                }
                            }
                            catch (err) { // offset cannot be parsed
                                waveform.offsetFormatError.valid = false;
                                waveform.stepTimeFormatError.valid = true;
                                waveform.intOffsetSumError.valid = true;
                                inputsValid = false;
                            }
                            // Step time:
                            var stepTime;
                            try {
                                stepTime = parseFloat(waveform.stepTime);
                                if (isNaN(stepTime)) {
                                    waveform.stepTimeFormatError.valid = false;
                                    inputsValid = false;
                                }
                                else if (stepTime < 0 || stepTime > formData.getData().param.time) {
                                    waveform.stepTimeFormatError.valid = false;
                                    inputsValid = false;
                                }
                                else {
                                    waveform.stepTimeFormatError.valid = true;
                                }
                            }
                            catch (err) { // stepTime cannot be parsed
                                waveform.stepTimeFormatError.valid = false;
                                waveform.intOffsetSumError.valid = true;
                                inputsValid = false;
                            }
                            // Now check sum of each amplitude int with offset is in the range [0,4095]
                            try {
                                if (ints !== 'undefined' && offset !== 'undefined' && !(isNaN(offset))) {
                                    for (var vali = 0; vali < ints.length; vali++) {
                                        if (ints[vali] + offset < 0 || ints[vali] + offset > 4095) {
                                            waveform.intOffsetSumError.valid = false;
                                            inputsValid = false;
                                            break;
                                        }
                                    }
                                }
                                else {
                                    waveform.intOffsetSumError.valid = true;
                                }
                            }
                            catch (err) {
                                waveform.intOffsetSumError.valid = true;
                            }
                            break;
                        case 'sine':
                            experiment.isSteadyState = false;
                            //Check that offset is [1,4095] and an integer
                            waveform.amplitudeFormatError = {};
                            waveform.amplitudeFormatError.valid = true;
                            waveform.amplitudeFormatError.text = 'Must be a positive, non-zero integer in the range  [1,4095].';
                            waveform.periodFormatError = {};
                            waveform.periodFormatError.valid = true;
                            waveform.periodFormatError.text = 'Must be a positive number.';
                            waveform.phaseFormatError = {};
                            waveform.phaseFormatError.valid = true;
                            waveform.phaseFormatError.text = 'Must be a number.';
                            waveform.offsetFormatError = {};
                            waveform.offsetFormatError.valid = true;
                            waveform.offsetFormatError.text = 'Must be a positive integer in the range [0,4095].';
                            waveform.ampOffsetSumError = {};
                            waveform.ampOffsetSumError.valid = true;
                            waveform.ampOffsetSumError.text = 'Sum of amplitude and offset must be in the range [0,4095].';
                            waveform.ampOffsetDiffError = {};
                            waveform.ampOffsetDiffError.valid = true;
                            waveform.ampOffsetDiffError.text = 'Offset must be larger than or equal to amplitude.';
                            waveform.offsetFormatError.valid = (waveform.offset >= 1 && waveform.offset <= 4095 && waveform.offset % 1 === 0)
                            var amp;
                            try {
                                amp = parseInt(waveform.amplitude);
                                if (isNaN(amp) || amp < 1 || amp > 4095) {
                                    waveform.amplitudeFormatError.valid = false;
                                    inputsValid = false;
                                }
                                else {
                                    waveform.amplitudeFormatError.valid = true;
                                }
                            }
                            catch (err) {
                                waveform.amplitudeFormatError.valid = false;
                                inputsValid = false;
                            }
                            var period;
                            try {
                                period = parseFloat(waveform.period);
                                if (isNaN(period) || period <= 0) {
                                    waveform.periodFormatError.valid = false;
                                    inputsValid = false;
                                }
                                else {
                                    waveform.periodFormatError.valid = true;
                                }
                            }
                            catch (err) {
                                waveform.periodFormatError.valid = false;
                                inputsValid = false;
                            }
                            var phase;
                            try {
                                phase = parseFloat(waveform.phase);
                                if (isNaN(phase)) {
                                    waveform.phaseFormatError.valid = false;
                                    inputsValid = false;
                                }
                                else {
                                    waveform.phaseFormatError.valid = true;
                                }
                            }
                            catch (err) {
                                waveform.phaseFormatError.valid = false;
                                inputsValid = false;
                            }
                            var offset;
                            try {
                                offset = parseInt(waveform.offset);
                                if (isNaN(offset) || offset < 0 || offset > 4095) {
                                    waveform.offsetFormatError.valid = false;
                                    inputsValid = false;
                                }
                                else {
                                    waveform.offsetFormatError.valid = true;
                                }
                            }
                            catch (err) {
                                waveform.offsetFormatError.valid = false;
                                inputsValid = false;
                            }
                            if (isNaN(offset + amp) || offset + amp > 4095) {
                                waveform.ampOffsetSumError.valid = false;
                                inputsValid = false;
                            }
                            else if (isNaN(offset - amp) || offset - amp < 0) {
                                waveform.ampOffsetDiffError.valid = false;
                                inputsValid = false;
                            }
                            else {
                                waveform.ampOffsetSumError.valid = true;
                            }
                            break;
                        case 'arb':
                            experiment.isSteadyState = false;
                            if (waveform.handsonTableValid === false) {
                                inputsValid = false;
                            }
                            break;
                    }
                }
                totalWellsUsed = totalWellsUsed + experiment.wellsUsed; // Add to the total number of wells used
            }
            if (inputsValid && totalWellsUsed > totalWellNum) { // If everything is correct (lvl 1, 2 validation), check this
                inputsValid = false;
                formData.getData().InsufficientWellsError.valid = false;
            }

            // Select which tooltip is displayed for each input field
            if (!formData.getData().timeFormatError.valid) {
                formData.getParam().timeTooltipErrorText = formData.getData().timeFormatError.text;
            }
            else {
                formData.getParam().timeTooltipErrorText = '';
            }

            // Iterate through experiments
            for (var i = 0; i < formData.getData().experiments.length; i++) {
                var experiment = formData.getData().experiments[i];
                // Check that replicates is parse-able and valid
                if (!experiment.replciatesFormatError.valid) {
                    experiment.replicatesTooltipErrorText = experiment.replciatesFormatError.text;
                }
                else {
                    experiment.replicatesTooltipErrorText = '';
                }
                if (!formData.getData().InsufficientWellsError.valid) { // Inputs valid, except too many wells specified. Highlight all related inputs.
                    experiment.replicatesTooltipErrorText = formData.getData().InsufficientWellsError.text;
                }
                // Check Timepoints
                if (experiment.timepointsValid) { // All TP fields valid; this is ambiguous
                    experiment.timepointsTooltipErrorText = experiment.allTimepointsValidError.text;
                    experiment.delayTooltipErrorText = experiment.allTimepointsValidError.text;
                    experiment.timepointsCSVTooltipErrorText = experiment.allTimepointsValidError.text;
                }
                else if (!experiment.redundantESTPError.valid) {
                    experiment.timepointsTooltipErrorText = experiment.redundantESTPError.text;
                    experiment.delayTooltipErrorText = '';
                    experiment.timepointsCSVTooltipErrorText = '';
                }
                else if (!experiment.redundantDelayError.valid) {
                    experiment.timepointsTooltipErrorText = '';
                    experiment.delayTooltipErrorText = experiment.redundantDelayError.text;
                    experiment.timepointsCSVTooltipErrorText = '';
                }
                else if (!experiment.redundantCSVError.valid) { // Equally-Spaced Time Points valid, but CSV invalid
                    experiment.timepointsTooltipErrorText = '';
                    experiment.delayTooltipErrorText = '';
                    experiment.timepointsCSVTooltipErrorText = experiment.redundantCSVError.text;
                }
                else if (!experiment.TPCSVvalid && !experiment.ESTPvalid) {
                    // Check that # Timepoints is parse-able and valid
                    if (!experiment.numTimepointsFormatError.valid) {
                        experiment.timepointsTooltipErrorText = experiment.numTimepointsFormatError.text;
                    }
                    else {
                        experiment.timepointsTooltipErrorText = '';
                    }
                    // Check that the delay is parse-able and valid
                    if (!experiment.delayFormatError.valid) {
                        experiment.delayTooltipErrorText = experiment.delayFormatError.text;
                    }
                    else {
                        experiment.delayTooltipErrorText = '';
                    }
                    // Check timepoints CSV
                    // CSV cannot be parsed; don't care about other errors
                    if (!experiment.timepointsCSVFormatError.valid) {
                        experiment.timepointsCSVTooltipErrorText = experiment.timepointsCSVFormatError.text;
                    }
                    // Check intensity values
                    else if (!experiment.timepointFormatError.valid) {
                        experiment.timepointsCSVTooltipErrorText = experiment.timepointFormatError.text;
                    }
                    // Check intensity length
                    else if (!experiment.timepointsCSVLengthError.valid) {
                        experiment.timepointsCSVTooltipErrorText = experiment.timepointsCSVLengthError.text;
                    }
                    else {
                        experiment.timepointsCSVTooltipErrorText = '';
                    }
                }
                else {
                    // Check total number of wells used
                    if (experiment.TPCSVvalid && !formData.getData().InsufficientWellsError.valid) { // Highlight CSV for invalid # of timepoints
                        experiment.timepointsCSVTooltipErrorText = formData.getData().InsufficientWellsError.text;
                    }
                    else if (!formData.getData().InsufficientWellsError.valid) { // Highlight ESP inputs field for invalid # of timepoints
                        experiment.timepointsTooltipErrorText = formData.getData().InsufficientWellsError.text;
                    }
                    else { // No issue with lvl 3 validation (# timepoints accross experiments)
                        experiment.timepointsTooltipErrorText = '';
                        experiment.delayTooltipErrorText = '';
                        experiment.timepointsCSVTooltipErrorText = '';
                    }
                }

                // Check each waveform
                for (var j = 0; j < experiment.waveforms.length; j++) {
                    var waveform = experiment.waveforms[j];
                    // Check if an LED has been selected by more than one waveform
                    if (!waveform.LEDSelectionError.valid) {
                        waveform.LEDSelectionTooltipErrorText = waveform.LEDSelectionError.text;
                    }
                    else {
                        waveform.LEDSelectionTooltipErrorText = '';
                    }
                    switch (waveform.type) {
                        case 'const':
                            // CSV cannot be parsed; don't care about other errors
                            if (!waveform.intsCSVFormatError.valid) {
                                waveform.intsCSVTooltipErrorText = waveform.intsCSVFormatError.text;
                            }
                            // Check intensity values
                            else if (!waveform.intFormatError.valid) {
                                waveform.intsCSVTooltipErrorText = waveform.intFormatError.text;
                            }
                            // Check intensity length
                            else if (!waveform.intCSVLengthError.valid) {
                                waveform.intsCSVTooltipErrorText = waveform.intCSVLengthError.text;
                            }
                            else if (!experiment.addWaveformsLengthError.valid) {
                                waveform.intsCSVTooltipErrorText = experiment.addWaveformsLengthError.text;
                            }
                            else if (!formData.getData().InsufficientWellsError.valid) {
                                waveform.intsCSVTooltipErrorText = formData.getData().InsufficientWellsError.text;
                            }
                            else {
                                waveform.intsCSVTooltipErrorText = '';
                            }
                            break;
                        case 'step':
                            // Check for parsing errors in ints:
                            if (!waveform.intsCSVFormatError.valid) {
                                waveform.intsCSVTooltipErrorText = waveform.intsCSVFormatError.text;
                            }
                            // Check intensity values
                            else if (!waveform.intFormatError.valid) {
                                waveform.intsCSVTooltipErrorText = waveform.intFormatError.text;
                            }
                            // Check intensity length
                            else if (!waveform.intCSVLengthError.valid) {
                                waveform.intsCSVTooltipErrorText = waveform.intCSVLengthError.text;
                            }
                            // Check for sum errors
                            else if (!waveform.intOffsetSumError.valid) {
                                waveform.intsCSVTooltipErrorText = waveform.intOffsetSumError.text;
                            }
                            else if (!formData.getData().InsufficientWellsError.valid) {
                                waveform.intsCSVTooltipErrorText = formData.getData().InsufficientWellsError.text;
                            }
                            else {
                                waveform.intsCSVTooltipErrorText = '';
                            }
                            // Check offset
                            if (!waveform.offsetFormatError.valid) {
                                waveform.offsetTooltipErrorText = waveform.offsetFormatError.text;
                            }
                            else if (!waveform.intOffsetSumError.valid) {
                                waveform.offsetTooltipErrorText = waveform.intOffsetSumError.text;
                            }
                            else {
                                waveform.offsetTooltipErrorText = '';
                            }
                            // Check stepTime
                            if (!waveform.stepTimeFormatError.valid) {
                                waveform.stepTimeTooltipErrorText = waveform.stepTimeFormatError.text;
                            }
                            else {
                                waveform.stepTimeTooltipErrorText = '';
                            }
                            break;
                        case 'sine':
                            // Check formatting on each input:
                            // Amp
                            if (!waveform.amplitudeFormatError.valid) {
                                waveform.ampTooltipErrorText = waveform.amplitudeFormatError.text;
                            }
                            else {
                                waveform.ampTooltipErrorText = '';
                            }
                            // Period
                            if (!waveform.periodFormatError.valid) {
                                waveform.periodTooltipErrorText = waveform.periodFormatError.text;
                            }
                            else {
                                waveform.periodTooltipErrorText = '';
                            }
                            // Phase
                            if (!waveform.phaseFormatError.valid) {
                                waveform.phaseTooltipErrorText = waveform.phaseFormatError.text;
                            }
                            else {
                                waveform.phaseTooltipErrorText = '';
                            }
                            // Offset
                            if (!waveform.offsetFormatError.valid) {
                                waveform.offsetTooltipErrorText = waveform.offsetFormatError.text;
                            }
                            else {
                                waveform.offsetTooltipErrorText = '';
                                waveform.offsetTooltipErrorText = '';
                            }
                            // Now, check the sum error if both inputs are valid
                            if (waveform.amplitudeFormatError.valid && waveform.offsetFormatError.valid && !waveform.ampOffsetSumError.valid) {
                                waveform.ampTooltipErrorText = waveform.ampOffsetSumError.text;
                                waveform.offsetTooltipErrorText = waveform.ampOffsetSumError.text;
                            }
                            if (waveform.amplitudeFormatError.valid && waveform.offsetFormatError.valid && !waveform.ampOffsetDiffError.valid) {
                                waveform.ampTooltipErrorText = waveform.ampOffsetDiffError.text;
                                waveform.offsetTooltipErrorText = waveform.ampOffsetDiffError.text;
                            }
                            break;
                        //case 'arb':

                        //break;
                    }
                }
            }
            formData.setValid(inputsValid);
        }
        return {
            update: function(){updateValidation()}
        }
    }
]);

function Plate(data) {
    //Call parsePlate when the object is initialized
    parsePlate(this, data);
    this.timeStep = calculateBestTimestep(this); // Size of timestep in ms
    // TO DO: these might be redundant, unnecessary if we have good loadup/default handling (#default)
    this.numPts = Math.floor(this.totalTime / this.timeStep + 1); // Number of time points
    this.times = new Array(this.numPts); // List of time points
    this.timesMin = new Array(this.numPts); // Times in min
    for (var i = 0; i < this.times.length; i++) {
        this.times[i] = this.timeStep * i;
        this.timesMin[i] = this.times[i] / 60 / 1000;
    }
    //Parses the provided data into a plate oject
    function parsePlate(plate, data) {
        function shuffleArray(array) {
            var myrng = new Math.seedrandom(data.param.seed);
            for (var i = array.length - 1; i > 0; i--) {
                var j = Math.floor(myrng() * (i + 1));
                var temp = array[i];
                array[i] = array[j];
                array[j] = temp;
            }
            return array;
        };
        //Import device and run data
        plate.data = data;
        plate.rows = data.device.rows;
        plate.cols = data.device.cols;
        plate.channelNum = data.device.leds.length;
        plate.randomized = data.param.randomized;
        plate.offOnFinish = data.param.offSwitch;
        plate.wavelengths = data.param.leds;
        //Process raw data
        plate.totalTime = Math.floor(parseFloat(data.param.time) * 60) * 1000; // in ms
        plate.timeStep = 1000; // in ms
        plate.minimumTS = 1000; // minimum time step in ms
        plate.numPts = Math.floor(plate.totalTime / plate.timeStep + 1); // number of time points
        plate.maxGSValue = 4095;
        plate.times = new Array(plate.numPts);
        plate.timesMin = new Array(plate.numPts);
        for (var i = 0; i < plate.times.length; i++) {
            plate.times[i] = plate.timeStep * i;
            plate.timesMin[i] = plate.times[i] / 60 / 1000;
        }
        plate.randMatrix = new Array(plate.rows * plate.cols); // Deal with randomization
        for (i = 0; i < plate.rows * plate.cols; i++) {
            plate.randMatrix[i] = i;
        }
        if (plate.randomized == true) { // randMatrix must be shuffled
            plate.randMatrix = shuffleArray(plate.randMatrix);
        }
        this.timePoints = numeric.rep([plate.rows * plate.cols], -1); // initialize array containing the time points for each tube
        // NOTE: The indices for these tubes are according to the randomization matrix!!
        // NOTE: A time of -1 indicates that it was never set; will be changed before writing.
        // Should check that it's not somehow set more than once!! (right?)
        // A list of all wellArrangements contained on this plate
        plate.wellArrangements = [];
        $(data.experiments).each(function (index, wellArrangementData) {
            plate.wellArrangements.push(new WellArrangement(wellArrangementData, plate));
        });
        //Check if total well number is sufficient, if it isn't throw error
        var numberOfWells = 0;
        for (var i = 0; i < plate.wellArrangements.length; i++) {
            numberOfWells += plate.wellArrangements[i].getWellNumber();
        }
        if (plate.rows * plate.columns < numberOfWells) {
            console.log("ERROR TOO MANY WELLS"); // TO DO: deal with this (#errors)
        }
        //Create a lookup that for a specific well number there is an associated WellArrangement
        //and position in WellArrangement
        //Columns and rows are flattened into one dimension
        plate.waPositions = [];
        var position = 0;
        for (var wa = 0; wa < plate.wellArrangements.length; wa++) {
            //If it has waveform groups
            if (plate.wellArrangements[wa].waveformGroups.length !== 0) {
                for (var i = 0; i < plate.wellArrangements[wa].getWellNumber(); i++) {
                    plate.waPositions[position] = [plate.wellArrangements[wa], i];
                    position++;
                }
            }
        }
    }

    // Sets timestep to largest possible to optimize speed & LPF size
    function calculateBestTimestep(plate) {
        // Pull all timepoints from wellArrangements.
        // If any sine waves are encountered, timeStep is automatically set to 10s
        // (Continuous-ish)
        if (plate.totalTime > 720 * 60 * 1000) { // If > 12hr, set TS to AT LEAST 10s
            plate.minimumTS = 10000;
        }
        else {
            plate.minimumTS = 1000;
        }
        return plate.minimumTS;
    }
    //Returns a n x c array of intensities where n is timepoints and c is channel num
    this.createTimecourse = function (wellNum) {
        wellNum = this.randMatrix[wellNum];
        var timesMin = this.timesMin;
        var timesMS = this.times;
        var timeCourses = new Array(this.channelNum);
        var ti = 0;
        if (this.waPositions[wellNum] === undefined) {
            for (var ch = 0; ch < this.channelNum; ch++) {
                timeCourses[ch] = new Array(this.numPts);
                for (ti = 0; ti < this.numPts; ti++) {
                    timeCourses[ch][ti] = {x: timesMin[ti], y: 0};
                }
            }
        }
        else {
            for (var ch = 0; ch < this.channelNum; ch++) {
                timeCourses[ch] = new Array(this.numPts);
                for (ti = 0; ti < this.numPts; ti++) {
                    if (ti == this.numPts-1 && this.offOnFinish) { // Final time point is 0
                        timeCourses[ch][ti] = {
                            x: timesMin[ti],
                            y: 0
                        };
                    }
                    else {
                        timeCourses[ch][ti] = {
                            x: timesMin[ti],
                            y: this.waPositions[wellNum][0].getIntensity(this.waPositions[wellNum][1], ch, timesMS[ti])
                        }; // Passes a wellNum RELATIVE TO THE WA};
                    }
                }
            }
        }
        return timeCourses;
    }
    // Returns a w x c array of intensities where w is wellNumber and c is channel num
    // NOTE: The input is an **index** in plate.times (length: plate.numSteps)
    this.createPlateView = function (timeIndex) {
        var randMat = this.randMatrix;
        var wellSnapshot = new Array(this.rows);
        for (var r = 0; r < this.rows; r++) {
            wellSnapshot[r] = new Array(this.cols);
            for (var c = 0; c < this.cols; c++) {
                wellSnapshot[r][c] = new Array(this.channelNum);
                for (var ch = 0; ch < this.channelNum; ch++) {
                    if (this.waPositions[randMat[r * this.cols + c]] === undefined) {
                        wellSnapshot[r][c][ch] = 0;
                    }
                    else if (this.offOnFinish && timeIndex == this.numPts-1) {
                        wellSnapshot[r][c][ch] = 0;
                    }
                    else {
                        wellSnapshot[r][c][ch] = this.waPositions[randMat[r * this.cols + c]][0].getIntensity(this.waPositions[randMat[r * this.cols + c]][1], ch, this.times[timeIndex]);
                    }
                }
            }
        }
        return wellSnapshot;
    }
    //creates an LPFfile
    this.createLPF = function () {
        // create intensities array & initialize header values
        this.buff = new ArrayBuffer(32 + 2 * this.cols * this.rows * this.channelNum * this.numPts);
        this.header = new Uint32Array(this.buff, 0, 8);
        this.header[0] = 1; // FILE_VERSION = 1.0
        this.header[1] = this.cols * this.rows * this.channelNum; // NUMBER_CHANNELS (TOTAL number, not per well)
        this.header[2] = this.timeStep; // STEP_SIZE
        this.header[3] = this.numPts; // NUMBER_STEPS
        // remaining header bytes are left empty
        // Initialize all variables to be used in for loops for efficiency
        var intensities = new Uint16Array(this.buff, 32);
        var plateSize = this.rows * this.cols;//Number of wells on a plate
        var index = 0;//Index in byte array
        var well = 0;//Looping variable for wells
        var ch = 0;//Looping variable for channels
        var numberPoints = this.numPts;//For looping efficiency
        var chanNum = Math.floor(this.channelNum)//Super janky way to remove what ever was making this variable super slow
        var randMat = this.randMatrix;
        //Loop through timepoints, wells, channels
        //Use precomputed relationship of well->wellArrangement
        for (var ti = 0; ti < numberPoints; ti++) {
            for (well = 0; well < plateSize; well++) {
                for (ch = 0; ch < chanNum; ch++) {
                    //If there is no WellArrangement for this well set channel to 0
                    if (randMat[well] >= this.waPositions.length) {
                        intensities[index] = 0;
                    }
                    //Otherwise call that WellArrangement for its intensity
                    else {
                        intensities[index] = this.waPositions[randMat[well]][0].getIntensity(this.waPositions[randMat[well]][1], ch, this.times[ti]);
                    }
                    index++;
                }
            }
        }
        // Write LPF (zipped folder)
        var stepInIndex = this.rows * this.cols * this.channelNum;
        if (this.offOnFinish) {
            for (var wn = 0; wn < this.rows * this.cols; wn++) {
                for (var ch = 0; ch < this.channelNum; ch++) {
                    var ind = stepInIndex * (this.numPts - 1) + this.channelNum * wn + ch;
                    intensities[ind] = 0;
                }
            }
        }
        // Prepare ZIP folder, starting with the LPF file itself
        var zip = new JSZip();
        var lpfblob = new Blob([this.buff], {type: "LPF/binary"});
        zip.file("program.lpf", this.buff);
        // Make CSV with randomization matrix & time points
        //// Compile list of time points from WAs:
        var timePoints = new Array(this.rows * this.cols);
        var tpi = 0;
        for (var wa = 0; wa < this.wellArrangements.length; wa++) {
            var waWellNum = this.wellArrangements[wa].getWellNumber();
            var waTimes = this.wellArrangements[wa].times;
            while (waWellNum > waTimes.length) {
                waTimes = waTimes.concat(waTimes);
            }
            for (var waWell = 0; waWell < waWellNum; waWell++) {
                timePoints[tpi] = waTimes[tpi];
                tpi += 1;
            }
        }
        var CSVStr = "Plate Well Index," + "Descrambled Well Location (Randomization Matrix)," + "Time Points" + "\n";
        for (var i = 0; i < this.rows * this.cols; i++) {
            var tp = timePoints[randMat[i]];
            var row = i + "," + randMat[i] + "," + tp + "\n";
            CSVStr += row;
        }
        var csvblob = new Blob([CSVStr], {type: "text/csv"});
        zip.file("randomizationMatrix.csv", CSVStr);
        //Save data
        zip.file("savefile.lpi", JSON.stringify(this.data));
        var content = zip.generate({type: "blob"});
        var d = new Date();
        var filename = d.getFullYear() + ("0" + (d.getMonth() + 1)).slice(-2)
            + ("0" + d.getDate()).slice(-2)
            + "_" + d.getTime();
        saveAs(content, filename);
    }

    //Multiple waveform groups that are spread over a set of well specifications
    function WellArrangement(data, plate) {
        //Call Parse inputs when the object is initialized
        parseInputs(this, plate, data);
        //Parses the entirity of the data in a waveform group section of the webpage
        //returns a wellArrangenment
        function parseInputs(wellArrangement, plate, wellArrangementData) {
            wellArrangement.replicates = parseInt(wellArrangementData.replicates);
            wellArrangement.pairing = wellArrangementData.pairing;
            if(wellArrangementData.timepoints && wellArrangementData.timepoints.length>0) {//TODO a better decesion making process for when to use timepoints
                var rawTimes = JSON.parse("[" + wellArrangementData.timepoints + "]");
                wellArrangement.times = [];
                for (var i=0; i<rawTimes.length; i++) {
                    wellArrangement.times[i] = rawTimes[i] * 60 * 1000; //min->ms
                }
            }
            else{
                wellArrangement.samples = parseInt(wellArrangementData.samples);
                wellArrangement.startTime = Math.floor(parseFloat(wellArrangementData.startTime * 60) * 1000); // ms
                //wellArrangement.times = new Array(wellArrangement.samples);
                // Would implement CSV of time points here
                //Address edge case of a single timepoint and selects endpoint instead of t=0
                if(wellArrangement.samples == 1) {
                    wellArrangement.times = [plate.totalTime];
                }
                // For linearly spaced time INTEGER points:
                else {
                    wellArrangement.times = numeric.round(numeric.linspace(wellArrangement.startTime, plate.totalTime, wellArrangement.samples));
                }
            }
            // Account for replicates
            //for (var repi=1; repi<wellArrangement.replicates; repi++) {
            //    wellArrangement.times = wellArrangement.times.concat(wellArrangement.times);
            //}
            wellArrangement.waveformInputs = [];
            $(wellArrangementData.waveforms).each(function (index, waveformData) {
                switch (waveformData.type) {
                    case 'const':
                        wellArrangement.waveformInputs.push(new constInput(waveformData))
                        break;
                    case 'step':
                        wellArrangement.waveformInputs.push(new stepInput(waveformData))
                        break;
                    case 'sine':
                        wellArrangement.waveformInputs.push(new sineInput(waveformData))
                        break;
                    case 'arb':
                        wellArrangement.waveformInputs.push(new arbInput(waveformData))
                        break;
                    default:
                        break;
                }
            });
            //Create waveform groups, crazy recursion is needed to create all permuatations of
            //input forms which could have multiple waveforms
            wellArrangement.waveformGroups = waveformParsing(0);
            function waveformParsing(inputIndex) {
                //At the end of recursively going through the waveform inputs create a waveform group
                //make it a list and return it;
                if (wellArrangement.pairing == 'add') { // Ignore recursion; adding constant waveforms
                    var waveforms = []; // List of the waveforms for each WF; index is same as wfi
                    var waveformGroups = [];
                    for (var wfi=0; wfi<wellArrangement.waveformInputs.length; wfi++) { // For each const input wf
                        waveforms[wfi] = wellArrangement.waveformInputs[wfi].generateWaveforms();
                    }
                    for (var inti=0; inti<waveforms[0].length; inti++) {
                        wfg = new WaveformGroup();
                        for (var wfi=0; wfi<waveforms.length; wfi++) {
                            wfg.addWaveform(waveforms[wfi][inti], wellArrangement.waveformInputs[wfi].channel);
                        }
                        waveformGroups.push(wfg);
                    }
                    return waveformGroups
                }
                else {
                    if (inputIndex >= wellArrangement.waveformInputs.length) {
                        return [new WaveformGroup()];
                    }
                    else {
                        var waveforms = wellArrangement.waveformInputs[inputIndex].generateWaveforms();
                        var waveformGroups = [];
                        //Loops through the group of waveforms generated by a single input
                        for (var waveformIndex = 0; waveformIndex < waveforms.length; waveformIndex++) {
                            //recursively calls the next waveform input index
                            //Stores the list of waveform groups returned
                            var newWaveformGroups = waveformParsing(inputIndex + 1);
                            //Add the current waveform to all the generate waveform groups
                            for (var waveformGroupIndex = 0; waveformGroupIndex < newWaveformGroups.length; waveformGroupIndex++) {
                                newWaveformGroups[waveformGroupIndex].addWaveform(waveforms[waveformIndex], wellArrangement.waveformInputs[inputIndex].channel);
                            }
                            //Concate on the modifed waveform groups together
                            waveformGroups = waveformGroups.concat(newWaveformGroups);
                        }
                        //return the concated waveform groups which now have the functions generated from the current waveform index
                        //added to them.
                        return waveformGroups;
                    }
                }
            }

            // TO DO: IN ALL WF's: check for empty values, raise error (#errors #default)
            //contains the inputs associated a constant input in the webform
            function constInput(waveformData) {
                this.type = waveformData.type;
                //Process inputs
                this.amplitudes = JSON.parse("[" + waveformData.ints + "]");
                this.amplitudes = numeric.round(this.amplitudes); // Make sure all ints are whole numbers
                this.channel = waveformData.wavelengthIndex;
                //Gives the number of different waveforms that this input will create
                this.getNumWaveforms = function () {
                    return amplitudes.length;
                }
                //returns a list of waveforms associated with this constant input
                this.generateWaveforms = function () {
                    var waveforms = [];
                    for (var i = 0; i < this.amplitudes.length; i++) {
                        (function (amp) {
                            waveforms.push(function (time) {
                                return amp;
                            })
                        })(this.amplitudes[i]);
                    }
                    return waveforms;
                }
            }

            //contains the inputs associated a step input in the webform
            function stepInput(waveformData) {
                this.type = waveformData.type;
                this.amplitudes = JSON.parse("[" + waveformData.ints + "]");
                this.amplitudes = numeric.round(this.amplitudes); // Make sure all amps are whole numbers
                this.offset = parseInt(waveformData.offset);//GS
                this.stepTime = Math.floor(waveformData.stepTime * 60 * 1000); // ms
                this.channel = parseInt(waveformData.wavelengthIndex);
                //Check if step doesn't exceed max or go lower than 0
                if (this.offset > plate.maxGSValue || this.offset < 0) {
                    console.log("ERROR step function exceeds bounds");
                    // TO DO: deal with this (#errors)
                }
                for (i = 0; i < this.amplitudes.length; i++) {
                    if (this.offset + this.amplitudes[i] > plate.maxGSValue || this.offset + this.amplitudes[i] < 0) {
                        console.log("ERROR step function exceeds bounds");
                        // TO DO: deal with this (#errors)
                    }
                }
                //Gives the number of different waveforms that this input will create
                this.getNumWaveforms = function () {
                    return amplitudes.length;
                }
                //returns a list of waveforms associated with this input
                this.generateWaveforms = function () {
                    var waveforms = [];
                    for (i = 0; i < this.amplitudes.length; i++) {
                        (function (amp, offset, stepTime) {
                            waveforms.push(function (time) {
                                if (time < stepTime) {
                                    return offset;
                                } else {
                                    return offset + amp
                                }
                            });
                        })(this.amplitudes[i], this.offset, this.stepTime);
                    }
                    return waveforms;
                }
            }

            //contains the inputs associated a sine input in the webform
            function sineInput(waveformData) {
                this.type = waveformData.type;
                this.amplitude = parseInt(waveformData.amplitude); // GS
                this.period = parseFloat(waveformData.period) * 60 * 1000; // ms
                this.phase = parseFloat(waveformData.phase) * 60 * 1000; // ms
                this.offset = parseInt(waveformData.offset); // GS
                this.channel = parseInt(waveformData.wavelengthIndex);
                //Check if offset+amplitude doesn't exceed bounds
                if (this.offset + Math.abs(this.amplitude) > plate.maxGSValue || this.offset - Math.abs(this.amplitude) < 0) {
                    console.log("ERROR sine  function exceeds bounds");
                    // TO DO: deal with this (#errors)
                }
                //returns the waveform associated with this input
                this.generateWaveforms = function () {
                    var waveforms = [];
                    (function (amp, phase, period, offset) {
                        waveforms.push(function (time) {
                            return Math.round(amp * Math.sin(2 * Math.PI * (time - phase) / period) + offset)
                        });
                    })(this.amplitude, this.phase, this.period, this.offset);
                    return waveforms;
                }
            }

            //contains the inputs associated a arb input in the webform
            function arbInput(waveformData) {
                this.type = waveformData.type;
                this.rawData = waveformData.arbData;
                this.initial = Number(this.rawData[0][1]);
                this.channel = parseInt(waveformData.wavelengthIndex);
                //Transition rawData to a data array where every entry is a number tuple
                this.data = []
                for (var i = 0; i < this.rawData.length; i++) {
                    //If both entries in a row are numbers add it to data
                    if (this.rawData[i][0] !== null && typeof this.rawData[i][0] === "number" &&
                        this.rawData[i][1] !== null && typeof this.rawData[i][1] === "number") {
                        this.data.push([this.rawData[i][0] * 60 * 1000, this.rawData[i][1]]);//Convert from minutes to milliseconds here
                    }
                }
                //Sort data by the timepoint
                this.data.sort(function (a, b) {
                    if (a[0] < b[0]) return -1;
                    if (a[0] > b[0]) return 1;
                    return 0;
                });
                //returns the waveform associated with this input
                this.generateWaveforms = function () {
                    var waveforms = [];
                    (function (initial, data) {
                        //A index variable is declared to remember last returned index
                        //Search should begin here, likely resulting in O(1) operation
                        var index = 0;
                        waveforms.push(function (time) {
                            //A second recursive function so that it can call itself
                            function recursion(time) {
                                //If the time is past the time of the current index
                                if (time >= data[index][0]) {
                                    //If index is the last one in the list just return the intensity of the current index
                                    if (index >= data.length - 1) {
                                        return data[index][1];
                                    }
                                    //If the time is between the current index and the next one, return the current index's intensity
                                    if (time < data[index + 1][0]) {
                                        return data[index][1];
                                    }
                                    //If the time is greater than the next index and you aren't at the end of the array recurse looking at the next index
                                    else {
                                        index++;
                                        return recursion(time);
                                    }
                                }
                                //if time is less than current index traverse backwards until this is not true
                                //or until you reach begining of array, the return the initial value
                                else {
                                    if (index <= 0) {
                                        return initial;
                                    }
                                    else {
                                        index--;
                                        return recursion(time);
                                    }
                                }
                            }
                            //Handles the situation where there is only an initial timepoint
                            if(data.length === 0 ){
                                return initial;
                            }
                            else {
                                return recursion(time);
                            }
                        });
                    })(this.initial, this.data);
                    return waveforms;
                }
            }

            // Calculate time shift parameters for each well in arrangement (will hopefully accelerate computation)
            var wellNumber = wellArrangement.times.length * wellArrangement.replicates * wellArrangement.waveformGroups.length;
            wellArrangement.wfg_i = new Array(wellNumber); // well func group index
            wellArrangement.time_i = new Array(wellNumber); // index in time step times (index for list of time points in ms)
            for (var wn = 0; wn < wellNumber; wn++) {
                wellArrangement.wfg_i[wn] = Math.floor(wn / (wellArrangement.replicates * wellArrangement.times.length));
                var r_i = Math.floor((wn - wellArrangement.wfg_i[wn] * wellArrangement.times.length * wellArrangement.replicates) / wellArrangement.times.length );
                wellArrangement.time_i[wn] = wn - wellArrangement.wfg_i[wn] * wellArrangement.times.length * wellArrangement.replicates - r_i * wellArrangement.times.length;
            }

        }

        //Gets the intensity of an internal well number, and a channel at a given time
        this.getIntensity = function (wellNum, channel, time) {
            // Determine how much time should be shifted based on the wellNum (in ms)
            return this.waveformGroups[this.wfg_i[wellNum]].getIntensity(channel, time - (plate.totalTime - this.times[this.time_i[wellNum]]));
        }
        //returns the total number of wells in this wellArrangement
        this.getWellNumber = function () {
            return this.times.length * this.replicates * this.waveformGroups.length;
        }
        //a grouping of waveform objects
        function WaveformGroup() {
            //An array of the waveforms contained in this group, where the index is the channel number.
            this.waveforms = [];
            //Gets the intensity of a channel at a given time
            //If waveform is undifined return zero
            this.getIntensity = function (channel, time) {
                if (typeof this.waveforms[channel] == 'undefined') {
                    return 0;
                }
                return this.waveforms[channel](time);
            }
            //adds a waveform to a given channel
            //Throws error if attempting to overwrite an existing waveform
            this.addWaveform = function (waveform, channel) {
                //If channel entry isn't empty throw error
                if (typeof this.waveforms[channel] !== 'undefined') {
                    console.log("ERROR, multiple waveforms in same channel!");
                    // TO DO: deal with this (#errors)
                }
                this.waveforms[channel] = waveform;
            }
            this.copy = function () {
                var newWaveformGroup = new WaveformGroup();
                newWaveformGroup.waveforms = this.waveforms.slice();
                return newWaveformGroup;
            }
        }
    }
}