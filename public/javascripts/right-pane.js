//var demo = false;
var simulateOn = false;
var timeStep = 0;
// Graph option
var scale = { x: 0.8, y: 0.8, rate: 1.1 };
var width = 2560;
var height = 1600;
var gridSize = 6;
var gridColor = 'lightgrey';
var LBL_LEFT_POS = 0.2;
var LBL_RIGHT_POS = 0.8;
var NUM_STATE_BIT = 5;

///////////////// SET UP NEW GRAPH ////////////////////////
var rgraph = new joint.dia.Graph();

var rpaper = new joint.dia.Paper({

    el: $('#right-col'),
    model: rgraph,
    width: width, height: height, gridSize: gridSize,
    snapLinks: false,   // if true, force a dragged link to snap to the closest element/port 
    linkPinning: false, // links must connects to a port, cannot be pinned on a blank area
    perpendicularLinks: false,
    defaultLink: function(cv,m) {   // decide whether to create a wire or a bus based on the source port
        var portList = window.views[cv.model.attributes.type].prototype.portList;
        // Only gates with bus port (portList must be defined)
        if (portList !== undefined && portList[m.getAttribute('port')].type === BUS) {
            return new joint.shapes.logic.Bus;
        }
        return new joint.shapes.logic.Wire;
    }, 

    validateConnection: function(vs, ms, vt, mt, e, vl) {

        if (e === 'target') {
            // target requires an input port to connect
            if (!mt || !mt.getAttribute('class') || mt.getAttribute('class').indexOf('input') < 0) return false;

            // must  be same type (wire - bus)
            var portList = window.views[vt.model.attributes.type].prototype.portList;
            if (portList === undefined && vl.model.attributes.type === BUS) {
                notify('' + vt.model.attributes.type.split('.')[1] + ' cannot connect to a Bus', 'warning');
                return false;   // target cell doesnt have bus
            }

            if (portList !== undefined && portList[mt.getAttribute('port')].type !== vl.model.attributes.type) {
                notify('Port "' + portList[mt.getAttribute('port')].label + '" of ' + vt.model.attributes.type.split('.')[1] + ' must connect to a ' + portList[mt.getAttribute('port')].type.split('.')[1], 'warning');
                return false;  // type mismatch  
            }

            // Set source & target ID to retrieve after removing
            vl.model.set('sourceId', vs.model.id);
            vl.model.set('targetId', vt.model.id);

            // Allow multi-input
            if (hasMultiInputValuesSamePort(vt.model)) return true;    // no need to check if port already used

            // check whether the port is being already used
            var portUsed = _.find(this.model.getLinks(), function(link) {
                return (link.id !== vl.model.id &&
                        link.get('target').id === vt.model.id &&
                        link.get('target').port === mt.getAttribute('port')); 
            });

            return !portUsed;

        } else { // e === 'source'
            // source requires an output port to connect
            //return ms && ms.getAttribute('class') && ms.getAttribute('class').indexOf('output') >= 0; 
            return false;   // Dragging a link's source end is disabled
        }
    }
});


// grid lines
setGrid(rpaper, gridSize, gridColor);


// scale
rpaper.scale(scale.x, scale.y);


// On right click element
rpaper.on('cell:pointerdblclick', function(cv, evt, x, y) {
    evt.stopPropagation();
    evt.preventDefault();
    cv.model.remove();
});

// on click 
rpaper.on('cell:pointerclick', function(cv, evt, x, y) {
    if (cv.model instanceof joint.shapes.logic.SeqIn) {
        evt.stopPropagation();
        evt.preventDefault();
        var str = prompt('Please enter input string:');
        cv.model.setSeq.call(cv.model, str);
    }
    
});

rpaper.on('blank:contextmenu', function(evt, x, y) {
    evt.stopPropagation();
    evt.preventDefault();
    if (selectedGate !== undefined) {
        addGate(rgraph, selectedGate, x, y);
    } else {
        notify("No gate selected", 'warning');
    }
});

/////////////////////////// FUNCTION DEFINITION  ////////////////////////////
function resetTimeStep() {
    _.each(rgraph.getElements(), function(element) {
        hasTimeStep(element) && element.reset.apply();
    });
}

function reset() {
    simulateOn = false;
    timeStep = 0;
    resetTimeStep();
    initializeSignal();
}

function toggleLive(model, signal) {
    // add 'live' class to the element if there is a positive signal
    V(rpaper.findViewByModel(model).el).toggleClass('live', signal > 0);
}

function broadcastSignal(gate, signal) {
    // broadcast signal to all output ports
    _.defer(_.invoke, rgraph.getConnectedLinks(gate, { outbound: true }), 'set', 'signal', signal);
}

function broadcastBus(gate, busSignal) {
    _.defer(_.invoke, rgraph.getConnectedLinks(gate, { outbound: true }), 'set', 'busSignal', busSignal);
}

function broadcastSplitter(gate) {
    if (gate.attributes.type === SPLITTER) {
        var busIn = rgraph.getConnectedLinks(gate, { inbound: true});
        if (busIn.length > 1) {
            notify("Error: Splitter cannot have more than 1 input bus");
            $("#resetBtn").click();
            return;
        }
        if (busIn[0] !== undefined) {
            // Get input
            var inputs = busIn[0].attributes.busSignal;
            // console.log(inputs);
            // Get sorted list of output
            var outputs = _.chain(rgraph.getConnectedLinks(gate, { outbound: true}))
            .sortBy(function(output) {
                return output.attributes.labels[nextLabelIndex(output, LBL_LEFT_POS)].attrs.text.text;
            })
            .value();

            // Validate input and output size
            if (inputs !== undefined && inputs[0] !== undefined && outputs.length > inputs.length) {
                notify('Error: Splitter cannot have more output wires (' + outputs.length + ') than input wires (' + inputs.length + ')');
                $("#resetBtn").click();
                return;
            }

            // Map input bus signal to each output
            _.each(inputs, function(signal, index) {
                _.defer(_.invoke, [outputs[index]], 'set', 'signal', signal);
            });

        }      
    } 
}

// Next time step
function incrTimeStep(graph) {
    _.each(graph.getElements(), function(element) {
        hasTimeStep(element) && element.nextTimeStep.call(element, graph);

        // If flip-flop: do another call for a full clock, since nextTimeStep only incr 1/2 clock in the implementation
        if (hasDoubleTimeSteps(element))
            element.nextTimeStep.call(element, graph);
    });
    timeStep++;
}

// Labeling links
function labelLink(link) {
    var source = link.getSourceElement();
    var target = link.getTargetElement();
    
    // Special gates with multi-value inputs/outputs on same port
    if (target !== null && target.attributes.type === JOINER && hasNoLabel(link, LBL_RIGHT_POS)) {
        setLabel(link, rgraph.getConnectedLinks(target, { inbound: true }).length - 1, nextLabelIndex(link, LBL_RIGHT_POS), LBL_RIGHT_POS);
    } else if (source !== null && source.attributes.type === SPLITTER && hasNoLabel(link, LBL_LEFT_POS)) {
        setLabel(link, rgraph.getConnectedLinks(source, { outbound: true }).length - 1, nextLabelIndex(link, LBL_RIGHT_POS), LBL_LEFT_POS);
    } else if (source !== null && hasMultiOutputValuesSamePort(source) && hasNoLabel(link, LBL_LEFT_POS)) {
        // get currently used labels
        var usedLabels = _.map(rgraph.getConnectedLinks(source, { outbound: true }), function(link){
            if (link.attributes.labels === undefined) return undefined;
            return link.attributes.labels[nextLabelIndex(link, LBL_LEFT_POS)].attrs.text.text;
        });
        // find first unused label
        var unusedLabels = _.difference(source.outputsList.apply(source), usedLabels);
        if (unusedLabels !== undefined && unusedLabels.length > 0) {
            setLabel(link, unusedLabels[0], nextLabelIndex(link, LBL_LEFT_POS), LBL_LEFT_POS);
        } else if (unusedLabels.length == 0) {
            // Remove immediately if reached maximum number of outputs
            link.remove();
        }
    } else if (target !== null && target.attributes.type === SMC && hasNoLabel(link, LBL_RIGHT_POS)) {
        setLabel(link, 'inst_in', nextLabelIndex(link, LBL_RIGHT_POS), LBL_RIGHT_POS);
    } 

    // Other general boxes (each port is a single bus/wire)
    else if (target !== null && window.views[target.attributes.type].prototype.portList !== undefined && hasNoLabel(link, LBL_RIGHT_POS)) {
        setLabel(link, window.views[target.attributes.type].prototype.portList[link.attributes.target.port].label, nextLabelIndex(link, LBL_RIGHT_POS), LBL_RIGHT_POS);
    } else if (source !== null && window.views[source.attributes.type].prototype.portList !== undefined && hasNoLabel(link, LBL_LEFT_POS)) {
        setLabel(link, window.views[source.attributes.type].prototype.portList[link.attributes.source.port].label, nextLabelIndex(link, LBL_LEFT_POS), LBL_LEFT_POS);
    }
}


function initializeSignal() {
    
    // cancel all signals stores in buses and wires
    _.invoke(_.chain(rgraph.getLinks()).reject(function(link) {
        return !(link instanceof joint.shapes.logic.Wire);
    }).value(), 'set', 'signal', 0);

    _.invoke(_.chain(rgraph.getLinks()).reject(function(link) {
        return !(link instanceof joint.shapes.logic.Bus);
    }).value(), 'unset', 'busSignal');

    // remove all 'live' classes
    $('.live').each(function() {
        V(this).removeClass('live');
    });

    // If not in simulation mode, return
    if (!simulateOn) { return 1; }

    // Otherwise broadcast signals
    _.each(rgraph.getElements(), function(element) {
        // broadcast a new signal from every input in the rgraph
        (element instanceof joint.shapes.logic.Input) && broadcastSignal(element, 1);
        (element instanceof joint.shapes.logic.InputLow) && broadcastSignal(element, -1);
        (element instanceof joint.shapes.logic.SeqIn) && element.hasInput.call(element) && broadcastSignal(element, element.operation.call(element));
    });

    return 1;
}

// Every logic gate needs to know how to handle a situation, when a signal comes to their ports.
joint.shapes.logic.Gate.prototype.onSignal = function(signal, handler) {
    handler.call(this, signal);
}

// Output element just marks itself as alive.
joint.shapes.logic.Output.prototype.onSignal = function(signal) {
    toggleLive(this, signal);
}

// diagramm setup

var current = {};


//////////////////////////// HANDLING EVENTS (WHEN DIAGRAM CHANGES) //////////////////////////////

rgraph.on('change:source change:target', function(model, end) {
    var e = 'target' in model.changed ? 'target' : 'source';

    if ((model.previous(e).id && !model.get(e).id) || (!model.previous(e).id && model.get(e).id)) {
        // if (model.previous(e).id && !model.get(e).id && model.isLink() && model.attributes.labels !== undefined) {
        //     // console.log('target changed');
        //     // var newLbl = model.attributes.labels;
        //     // newLbl = _.without(newLbl, _.findWhere(newLbl, { position: LBL_RIGHT_POS }));
        //     // model.set('labels', newLbl);
        //     // model.remove();
        //     // SHOULD NOT ALLOW THIS
        // }
        // if source/target has been connected to a port or disconnected from a port reinitialize signals
        current = initializeSignal();
    }
});


rgraph.on('change:signal', function(wire, signal) {
    // console.log('wire signal changed');

    toggleLive(wire, signal);

    var magnitude = Math.abs(signal);

    // if a new signal has been generated stop transmitting the old one
    if (magnitude !== current) return;

    var gate = rgraph.getCell(wire.get('target').id);   // target

    if (gate) {
        if (gate instanceof joint.shapes.logic.Joiner) {

            var busIn = _.chain(rgraph.getConnectedLinks(gate, { inbound: true}))
            .sortBy(function(input) {
                return input.attributes.labels[nextLabelIndex(input, LBL_RIGHT_POS)].attrs.text.text;
            })
            .map(function(input) {
                return input.attributes.signal;
            })
            .value();
            broadcastBus(gate, busIn);
        } else if (gate instanceof joint.shapes.logic.Register) {
            // broadcast
            broadcastBus(gate, gate.operation.apply(gate));
        }


        // For other combinational-logic gates like and, or, xor, etc.
        else {
            gate.onSignal(signal, function() {
                // get an array of signals on all input ports
                var inputs = _.chain(rgraph.getConnectedLinks(gate, { inbound: true }))
                    .sortBy(function(wire) { 
                        return wire.get('target').port;     // sort all inputs based on labels (in1, in2, ...)
                    })
                    .groupBy(function(wire) {
                        return wire.get('target').port;
                    })
                    .map(function(wires) {
                        return Math.max.apply(this, _.invoke(wires, 'get', 'signal')) > 0;
                    })
                    .value();
                // calculate the output signal
                // console.log(inputs);
                var output = magnitude * (gate.operation.apply(gate, inputs) ? 1 : -1);
                
                broadcastSignal(gate, output);
            });
        }
   }
});


rgraph.on('change:busSignal', function(bus, busSignal) {
    // console.log('bus signal changed');
    
    var gate = rgraph.getCell(bus.get('target').id);
    
    if (gate) {
        if (gate instanceof joint.shapes.logic.Splitter) {
            broadcastSplitter(gate);    // re-broadcast splitter
        } else if (hasMultiOutputValuesSamePort(gate)) {
            // Handle multiple output values here

            // Rename SMC
            if (gate instanceof joint.shapes.logic.SMC) {
                // Rename based on input value
                if (busSignal !== undefined) {
                    var name = "";
                    for (var i = 0; i < Math.min(busSignal.length, NUM_STATE_BIT); i++) {
                        if (busSignal[i] === 1) { name = name.concat("1"); }
                        else { name = name.concat("0"); }
                    }
                    gate.attr('text/text', name);
                } else {
                    gate.attr('text/text', 'SMC');
                }
            }


            // Broadcast (multiple) outputs
            // To-do: extract first 5 bits


        
        } else if (gate instanceof joint.shapes.logic.Register || gate instanceof joint.shapes.logic.DffB) {
            // Gate uses its own operation function declared in additional-gate.js
            broadcastBus(gate, gate.operation.apply(gate));
        } 
        else {
            // combinational bus gates (multiple bus inputs with 1 bus output) handle here, e.g. Mux 16, 3-bit AND, 4-bit AND, etc.
            // Get all input buses
            var inputs = _.chain(rgraph.getConnectedLinks(gate, { inbound: true}))
            .sortBy(function(bus) {
                return bus.attributes.target.port;
            })
            .map(function(bus) {
                return bus.attributes.busSignal;
            })
            .value();
            

            // Check if all input buses are same length (ANY exception?)
            var busSize;
            if (inputs.length > 0) {
                _.each(inputs, function(bus) {
                    if (bus !== undefined) {
                        if (busSize === undefined) {
                            busSize = bus.length;
                        } else if (busSize !== bus.length) {
                            notify('Error: Bus inputs of ' + gate.attributes.type.split('.')[1] + ' must be same size');
                            $("#resetBtn").click();
                            return;
                        }
                    }
                })
            }
            if (busSize === 0) return;
            
            // Group each wire in each bus by index
            var ins = new Array(busSize); 
            var outs = new Array(busSize);
            var i, j;
            for (i = 0; i < busSize; i++) {
                ins[i] = [];
                for (j = 0; j < inputs.length; j++) {
                    if (inputs[j] !== undefined) {
                        ins[i].push(inputs[j][i] == 1 ? true : false);
                    }
                }
            }

            // Apply operation to each bit of input buses
            for (i = 0; i < busSize; i++) {
                outs[i] = gate.operation.apply(gate, ins[i]) ? 1 : -1;
            }   
            broadcastBus(gate, outs); 
        }
   }
});






// Handle labeling (potentially other actions if needed) when a new wire/bus is added from a gate
rgraph.on('change', function(cell) {
    if (cell.isLink()) {
        labelLink(cell);
    }
})


// Re-label spliiter and joiner when a link is removed
rgraph.on('remove', function(cell) {
    if (cell.isLink()) {
        var source = rgraph.getCell(cell.get('sourceId'));
        var target = rgraph.getCell(cell.get('targetId'));
        if (source !== null && source !== undefined && source.attributes.type === SPLITTER) {
            var rmVal = cell.attributes.labels[nextLabelIndex(cell, LBL_LEFT_POS)].attrs.text.text;
            // console.log('removed from splitter: ' + rmVal);
            _.each(rgraph.getConnectedLinks(source, { outbound: true }), function(link) {
                var i = nextLabelIndex(link, LBL_LEFT_POS);
                var currLabel = link.attributes.labels[i].attrs.text.text;
                if (currLabel > rmVal) {
                    setLabel(link, currLabel - 1, i, LBL_LEFT_POS);
                }
            });
        }
        if (target !== null && target !== undefined && target.attributes.type === JOINER) {
            var rmVal = cell.attributes.labels[nextLabelIndex(cell, LBL_RIGHT_POS)].attrs.text.text;
            // console.log('removed from joiner: ' + rmVal);
            _.each(rgraph.getConnectedLinks(target, { inbound: true }), function(link) {
                var i = nextLabelIndex(link, LBL_RIGHT_POS);
                var currLabel = link.attributes.labels[i].attrs.text.text;
                if (currLabel > rmVal) {
                    setLabel(link, currLabel - 1, i, LBL_RIGHT_POS);
                }
            });
        } 
    }
    current = initializeSignal();
})



//////////////////////// BUTTONS CLICK EVENT HANDLING //////////////////////
// Zoom in 
$('#zoomInBtn').click(function() {
    scale.x = scale.x * scale.rate;
    scale.y = scale.y * scale.rate;
    rpaper.scale(scale.x, scale.y);
});

// Zoom out
$('#zoomOutBtn').click(function() {
    scale.x = scale.x / scale.rate;
    scale.y = scale.y / scale.rate;
    rpaper.scale(scale.x, scale.y);
});

$("#simBtn").click(function() {

    simulateOn = true;
    $("#simBtn").css('visibility', 'hidden');
    $("#resetBtn").css('visibility', 'visible');

    var sequentialLogic = _.some(rgraph.getElements(), function(element) {
        return (element instanceof joint.shapes.logic.SeqIn && element.hasInput.call(element)) || (hasTimeStep(element) && rgraph.getConnectedLinks(element, {inbound : true}).length > 0);
    });

    if (sequentialLogic) {
        $("#stepBtn").css('visibility', 'visible');    
    }

    current = initializeSignal();  
});

$("#resetBtn").click(function() {
    $("#simBtn").css('visibility', 'visible');
    $("#resetBtn").css('visibility', 'hidden');
    $("#stepBtn").css('visibility', 'hidden');
    $("#currTimeStep").html(0);
    reset();

});

$("#stepForward").click(function() {
    incrTimeStep(rgraph);
    $("#currTimeStep").html(timeStep);
    current = initializeSignal();
});









