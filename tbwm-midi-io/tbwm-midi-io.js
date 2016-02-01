/*
 * toneburst 2016
 * Dependencies:
 * WebMIDIAPIShim
 */

function TBMWMIDIio() {
    this.uicontainer        = null;
    this.containerclass     = "midiui";
    this.idprefix           = "tbwm-io";
    this.outputselectid     = this.idprefix + "-" + "outputdevice";
    this.channelselectid    = this.idprefix + "-" + "channel";
    this.testoutputbutton   = this.idprefix + "-" + "testoutput";
    this.havemidi           = false;
    this.havemidiin         = false;
    this.havemidiout        = false;
    this.havecontainer      = false;
    this.midiaccess         = {};
    this.outputs            = {};
    this.inputs             = {};
    this.midiout            = {};
    this.midiin             = {};
    this.midichannel        = 1;
};

// Mix in Microevent object from microevent.js so our Clock object can emit events
MicroEvent.mixin(TBMWMIDIio);

//////////////////////////////////////////////
// UI Container DOM element not found error //
//////////////////////////////////////////////

TBMWMIDIio.prototype.errordomelement = function() {
    var error = "Error: Container element not found. You need to specify ID of an existing element (with or without leading '#') when initialising this instance or calling this method";
    console.log(error);
    return error;
};

///////////////////
// No MIDI error //
///////////////////

TBMWMIDIio.prototype.errornomidi = function(e) {
    this.havemidi = false;
    //var error = "Error: No access to MIDI devices: browser does not support WebMIDI API, please use the WebMIDIAPIShim together with the Jazz plugin.";
    var error = e;
    console.log(error);
};

/////////////////////////////////
// No MIDI output device error //
/////////////////////////////////

TBMWMIDIio.prototype.errornooutputdevice = function() {
    this.havemidiout = false;
    var error = "Error: No MIDI output device is accessible.";
    console.log(error);
};

////////////////////////////////
// No MIDI input device error //
////////////////////////////////

TBMWMIDIio.prototype.errornoinputdevice = function() {
    this.havemidi = false;
    var error = "Error: No MIDI input device is accessible.";
    console.log(error);
};

///////////////////////////////////////
// Calculate MIDI channel message /////
// based on message type and channel //
///////////////////////////////////////

TBMWMIDIio.prototype.channelmessage = function(messagetype, ch) {
    // List of channel messages
    // Extracted from WebMidi library
    var _channelmessages = {
        "noteoff": 0x8,           // 8
        "noteon": 0x9,            // 9
        "controlchange": 0xB,     // 11
        "channelmode": 0xB,       // 11
        "programchange": 0xC,     // 12
        "channelaftertouch": 0xD, // 13
        "pitchbend": 0xE          // 14
    };
    return (_channelmessages[messagetype] << 4) + (ch - 1);
};

////////////////////////////////
// Create <label> DOM element //
////////////////////////////////

TBMWMIDIio.prototype.createlabel = function(labelfor, labeltext) {
    var label = document.createElement("label");
    label.setAttribute("for", labelfor);
    label.innerHTML = labeltext;
    return label;
};

///////////////////
// Init function //
///////////////////

TBMWMIDIio.prototype.init = function(uicontainer) {
    // Test container DOM element exists
    if(uicontainer) {
        this.uicontainer = document.getElementById(uicontainer.replace("#", ""));
        if(!this.uicontainer)
            return this.errordomelement();
    } else {
        return this.errordomelement();
    };
    // Container element found, and valid DOM element, so set property
    this.havecontainer = true;
    // Add class to container
    this.uicontainer.classList.add(this.containerclass);

    var self = this;
    navigator.requestMIDIAccess().then(onsuccesscallback, onerrorcallback);
    function onsuccesscallback(access) {

        self.havemidi = true;

        // MIDI access object
        self.midiaccess = access;

        // Get output ports
        self.outputs = self.midiaccess.outputs; // outputs = MIDIOutputMaps, you can retrieve the outputs with iterators

        if(self.outputs.size > 0) {
            // Get and open first MIDI output port
            self.midiout = self.outputs.values().next().value;
            self.midiout.open();
            self.havemidiout = true;
        } else {
            self.errornooutputdevice();
            self.havemidiout = false;
        };

        /*
        // Get input ports
        self.inputs = self.midiaccess.inputs; // inputs = MIDIInputMaps, you can retrieve the inputs with iterators

        if(self.inputs.size > 0) {
            self.midiin = self.inputs.values().next().value;
            self.midiin.open();
            self.havemidiin = true;
        } else {
            self.errornoinputdevice();
            self.havemidiin = false;
        };*/

        console.log("MIDI system success!");
        self.trigger("midistatus", "success");
    };

    function onerrorcallback(err) {
        self.havemidi       = false;
        self.havemidiin     = false;
        self.havemidiout    = false;
        console.log( "Uh-oh! Something went wrong! Error code: " + err.code );
        self.trigger("midistatus", "fail");
    };
};

////////////////////////////
// Set MIDI Output device //
////////////////////////////

TBMWMIDIio.prototype.setoutputdevice = function(deviceid) {
    if(this.havemidiout) {
        // Close previously-open port
        this.midiout.close();
        // Get and open new output port
        this.midiout = this.outputs.get(deviceid);
        this.midiout.open();
    } else {
        this.errornooutputdevice();
        return;
    };
};

////////////////////////////////////////////////////////
// Append Output device menu to container DOM element //
////////////////////////////////////////////////////////

TBMWMIDIio.prototype.addoutputselect = function() {
    if(this.havemidi && this.havemidiout) {
        // Create <label> element
        var label = this.createlabel(this.outputselectid, "Select MIDI Output Device");
        // Create <select> element
        var sel = document.createElement("select");
        sel.setAttribute("id", this.outputselectid);
        // Add options
        this.outputs.forEach(function(port) {
            var opt = document.createElement("option");
            opt.text = port.name;
            opt.value = port.id;
            sel.add(opt);
        });
        // Append label and select to container DOM element
        this.uicontainer.appendChild(label);
        this.uicontainer.appendChild(sel);
        // Listen for changes
        var self = this;
        sel.addEventListener('change', function(){
            // Set output device
            self.setoutputdevice(this.value);
        });
    } else {
        this.errornooutputdevice();
    };
};

//////////////////////
// Set MIDI Channel //
//////////////////////

TBMWMIDIio.prototype.setoutmidichannel = function(channel) {
    this.midichannel = parseInt(channel);
};

//////////////////////////////////
// Add MIDI Channel select menu //
//////////////////////////////////

TBMWMIDIio.prototype.addoutchannelselect = function() {
    if(this.havemidi && this.havemidiout) {
        // Create <label> element
        var label = this.createlabel(this.channelselectid, "Select MIDI Channel");
        // Create <select> element
        var sel = document.createElement("select");
        sel.setAttribute("id", this.channelselectid);
        // Add options
        for(var i = 1; i < 17; i++) {
            var opt = document.createElement("option");
            opt.text = i;
            opt.value = i;
            sel.add(opt);
        };
        // Append label and select to container DOM element
        this.uicontainer.appendChild(label);
        this.uicontainer.appendChild(sel);
        // Listen for changes
        var self = this;
        sel.addEventListener('change', function(){
            // Set output device
            self.setoutmidichannel(parseInt(this.value));
        });
    } else {
        this.errornooutputdevice();
        return;
    };
};

/////////////////////////////////
// Add MIDI Output test button //
/////////////////////////////////

TBMWMIDIio.prototype.addtestbutton = function() {
    if(this.havemidi && this.havemidiout) {
        // Create <button> element
        var button = document.createElement("button");
        button.setAttribute("id", this.testoutputbutton);
        button.innerHTML = 'Test MIDI Out';
        // Append button to container DOM element
        this.uicontainer.appendChild(button);
        // Listen for changes
        var self = this;
        button.addEventListener("mousedown", function () {
            self.noteon(null, 64, 127);
        }, false);
        button.addEventListener("mouseup", function () {
            self.noteoff(null, 64, 127);
        }, false);
    } else {
        this.errornooutputdevice();
        return;
    };
};

///////////////////////
// Send MIDI note-on //
///////////////////////

TBMWMIDIio.prototype.noteon = function(channel, note, velocity) {
    if(this.havemidi && this.havemidiout) {
        var ch = (channel) ? channel : this.midichannel;
        var cm = this.channelmessage("noteon", ch);
        this.midiout.send([cm, note, velocity]);
    } else {
        this.errornooutputdevice();
        return;
    };
};

////////////////////////
// Send MIDI note-off //
////////////////////////

TBMWMIDIio.prototype.noteoff = function(channel, note, velocity) {
    if(this.havemidi && this.havemidiout) {
        var ch = (channel) ? channel : this.midichannel;
        var cm = this.channelmessage("noteoff", ch);
        this.midiout.send([cm, note, velocity]);
    } else {
        this.errornooutputdevice();
        return;
    };
};

//////////////////////////
// Send MIDI clock tick //
//////////////////////////

TBMWMIDIio.prototype.clocktick = function() {
    self.midiout.send([0xF8]);
};
