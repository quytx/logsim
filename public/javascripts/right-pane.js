//var demo = false;
var simulateOn = false;
var timeStep = 0;
// Graph option
var scale = { x: 1, y: 1, rate: 1.1 };
var gridSize = 8;
var gridColor = 'lightgrey';

var rgraph = new joint.dia.Graph();

var rpaper = new joint.dia.Paper({

    el: $('#paper'),
    model: rgraph,
    width: 1260, height: 800, gridSize: gridSize,
    snapLinks: false,
    linkPinning: false,
    perpendicularLinks: false,
    defaultLink: function(cv,m) {
        if (hasBusOutput(cv.model)) {
            return new joint.shapes.logic.Bus;
        } else {
            return new joint.shapes.logic.Wire;
        }
    }, 

    validateConnection: function(vs, ms, vt, mt, e, vl) {

        if (e === 'target') {
            
             if (hasBusOutput(vs.model) != hasBusInput(vt.model)) return false;   // validate bus connection

            // target requires an input port to connect
            if (!mt || !mt.getAttribute('class') || mt.getAttribute('class').indexOf('input') < 0) return false;

            // Allow multi-input
            if (hasMultiInput(vt.model)) {
                // label if target is a joiner
                if (vt.model.attributes.type === 'logic.Joiner') {                    
                    vl.model.set('joinerTargetId', vt.model.id);
                }
                return true;    // no need to check if port already used
            }

            // Handle multiple output values: Set source ID if source has multiple output values
            if (hasMultiOutputValues(vs.model)) {
                vl.model.set('multiOutputSourceId', vs.model.id);
            }

            // Set source ID if source is a splitter
            if (vs.model.attributes.type === 'logic.Splitter') {
                vl.model.set('splitterSourceId', vs.model.id);
            } 

            // Set target ID if target is a SMC
            if (vt.model.attributes.type === 'logic.SMC') {
                vl.model.set('smcTargetId', vt.model.id);
            }

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

// Resize paper to fit outter div
var mainDiv = document.getElementById('right-col');
rpaper.setDimensions(mainDiv.offsetWidth, mainDiv.offsetHeight);
// console.log(mainDiv.offsetWidth, mainDiv.offsetHeight);

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

function resetFlipFlops() {
    _.each(rgraph.getElements(), function(element) {
        (element instanceof joint.shapes.logic.Dff) && element.reset.apply();
    });
}

function reset() {
    simulateOn = false;
    timeStep = 0;
    resetFlipFlops();
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
    if (gate.attributes.type === 'logic.Splitter') {
        var busIn = rgraph.getConnectedLinks(gate, { inbound: true});
        if (busIn.length > 1) {
            notify("Error: Splitter cannot have more than 1 input bus");
            return;
        }
        if (busIn[0] !== undefined) {
            // Get input
            var inputs = busIn[0].attributes.busSignal;
            // console.log(inputs);
            // Get sorted list of output
            var outputs = _.chain(rgraph.getConnectedLinks(gate, { outbound: true}))
            .sortBy(function(output) {
                return output.attributes.labels[0].attrs.text.text;
            })
            .value();

            // Validate input and output size
            if (inputs !== undefined && inputs[0] !== undefined && outputs.length > inputs.length) {
                notify('Error: Splitter cannot have more output wires (' + outputs.length + ') than input wires (' + inputs.length + ')');
                return;
            }

            // Map input bus signal to each output
            _.each(inputs, function(signal, index) {
                _.defer(_.invoke, [outputs[index]], 'set', 'signal', signal);
            });

        }      
    } 
}

function incrDff() {
    _.each(rgraph.getElements(), function(element) {
        (element instanceof joint.shapes.logic.Dff) && element.nextTimeStep.apply();
    });
    _.each(rgraph.getElements(), function(element) {
        (element instanceof joint.shapes.logic.Dff) && element.nextTimeStep.apply();
    });
    timeStep++;
}

// function initializeBusSignal() {
//     if (!simulateOn) { return; }
//     _.each(rgraph.getElements(), function(element) {
//         // broadcast a new signal from every joiner in the rgraph
//         (element instanceof joint.shapes.logic.Input) && broadcastSignal(element, signal);
//     });
// }

function initializeSignal() {
    
    var signal = 1; // signal is high
    
    // cancel all signals stores in buses and wires
    _.invoke(_.chain(rgraph.getLinks()).reject(function(link) {
        return !(link instanceof joint.shapes.logic.Wire);
    }).value(), 'set', 'signal', 0);

    _.invoke(_.chain(rgraph.getLinks()).reject(function(link) {
        return !(link instanceof joint.shapes.logic.Bus);
    }).value(), 'unset', 'busSignal');

    // _.invoke(rgraph.getLinks(), 'set', 'signal', 0);

    // remove all 'live' classes
    $('.live').each(function() {
        V(this).removeClass('live');
    });

    // If not in simulation mode, return
    if (!simulateOn) { return signal; }


    // Otherwise broadcast signals
    _.each(rgraph.getElements(), function(element) {
        // broadcast a new signal from every input in the rgraph
        (element instanceof joint.shapes.logic.Input) && broadcastSignal(element, signal);
    });

    return signal;
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

rgraph.on('change:source change:target', function(model, end) {
    var e = 'target' in model.changed ? 'target' : 'source';

    if ((model.previous(e).id && !model.get(e).id) || (!model.previous(e).id && model.get(e).id)) {
        // if source/target has been connected to a port or disconnected from a port reinitialize signals
        current = initializeSignal();
    }
});


rgraph.on('change:busSignal', function(bus, busSignal) {
    // console.log('bus signal changed');
    
    var gate = rgraph.getCell(bus.get('target').id);
    
    if (gate) {
        if (gate instanceof joint.shapes.logic.Splitter) {
            broadcastSplitter(gate);    // re-broadcast splitter
        } else if (hasMultiOutputValues(gate)) {
            // Handle multiple output values here

            // Rename SMC
            if (gate instanceof joint.shapes.logic.SMC) {
                // Rename based on input value
                if (busSignal !== undefined) {
                    var name = "";
                    busSignal.forEach(function(sig) {
                        if (sig === 1) { name = name.concat("1"); }
                        else { name = name.concat("0"); }
                    }) 
                    gate.attr('text/text', name);
                } else {
                    gate.attr('text/text', 'SMC');
                }
            }


            // Broadcast (multiple) outputs
            // To-do


        
        } else {
            // multi-bus input with 1 output handle here, e.g. Mux 16
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
                            notify('Error: Bus inputs must be same size');
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

rgraph.on('change:signal', function(wire, signal) {
    // console.log('wire signal changed');

    toggleLive(wire, signal);

    var magnitude = Math.abs(signal);

    // if a new signal has been generated stop transmitting the old one
    if (magnitude !== current) return;

    var gate = rgraph.getCell(wire.get('target').id);

    if (gate) {
        if (gate instanceof joint.shapes.logic.Joiner) {

            var busIn = _.chain(rgraph.getConnectedLinks(gate, { inbound: true}))
            .sortBy(function(input) {
                return input.attributes.labels[0].attrs.text.text;
            })
            .map(function(input) {
                return input.attributes.signal;
            })
            .value();
            broadcastBus(gate, busIn);
        } else {
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

// Handle labeling (potentially other actions if needed) when a new wire/bus is added from a gate
rgraph.on('change', function(cell) {
    if (cell.get('joinerTargetId') !== undefined && cell.attributes.labels === undefined) {
        // Find target
        var joiner = rgraph.getCell(cell.get('joinerTargetId'));
        setLabel(cell, rgraph.getConnectedLinks(joiner, { inbound: true }).length);
    } else if (cell.get('splitterSourceId') !== undefined && cell.attributes.labels === undefined) {
        var splitter = rgraph.getCell(cell.get('splitterSourceId'));
        setLabel(cell, rgraph.getConnectedLinks(splitter, { outbound: true }).length - 1);
    } else if (cell.get('multiOutputSourceId') !== undefined && cell.attributes.labels === undefined) {
        var source = rgraph.getCell(cell.get('multiOutputSourceId'));
        // get currently used labels
        var usedLabels = _.map(rgraph.getConnectedLinks(source, { outbound: true }), function(link){
            if (link.attributes.labels === undefined) return undefined;
            return link.attributes.labels[0].attrs.text.text;
        });
        // find first unused label
        var unusedLabels = _.difference(source.outputsList.apply(source), usedLabels);
        if (unusedLabels !== undefined && unusedLabels.length > 0) {
            setLabel(cell, unusedLabels[0]);
        } else if (unusedLabels.length == 0) {
            // Remove immediately if reached maximum number of outputs
            cell.remove();
        }
    }
})


rgraph.on('remove', function(cell) {

    if (cell.get('joinerTargetId') !== undefined) {
        var removedLabel = cell.attributes.labels[0].attrs.text.text;
        // Find target
        var joiner = rgraph.getCell(cell.get('joinerTargetId'));
        // Re-label links with higher number
        _.each(rgraph.getConnectedLinks(joiner, { inbound: true }), function(link) {
            var currLabel = link.attributes.labels[0].attrs.text.text;
            if (currLabel > removedLabel) {
                setLabel(link, currLabel - 1);
            }
        });
    } else if (cell.get('splitterSourceId') !== undefined) {
        var removedLabel = cell.attributes.labels[0].attrs.text.text;
        // Find source
        var splitter = rgraph.getCell(cell.get('splitterSourceId'));
        // Re-label links with higher number
        _.each(rgraph.getConnectedLinks(splitter, { outbound: true }), function(link) {
            var currLabel = link.attributes.labels[0].attrs.text.text;
            if (currLabel > removedLabel) {
                setLabel(link, currLabel - 1);
            }
        });
    }
    current = initializeSignal();
})



$("#simBtn").click(function() {

    simulateOn = true;
    $("#simBtn").css('visibility', 'hidden');
    $("#resetBtn").css('visibility', 'visible');

    var sequentialLogic = false;
    _.each(rgraph.getElements(), function(element) {
        if (element instanceof joint.shapes.logic.Dff)
            sequentialLogic = true;
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
    incrDff();
    $("#currTimeStep").html(timeStep);
    current = initializeSignal();
});








