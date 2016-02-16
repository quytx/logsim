// Add a new gate to the graph when a certain type of gate is clicked
var addGate = function(graph, type, xpos, ypos) {
    var newGate;
    switch(type) {
        case "logic.Input":
            newGate = new joint.shapes.logic.Input({ position: { x: xpos, y: ypos}});
            break;
        case "logic.Output":
            newGate = new joint.shapes.logic.Output({ position: { x: xpos, y: ypos}});
            break;
        case "logic.And":
            newGate = new joint.shapes.logic.And({ position: { x: xpos, y: ypos}});
            break;    
        case "logic.Or":
            newGate = new joint.shapes.logic.Or({ position: { x: xpos, y: ypos}});
            break;    
        case "logic.Not":
            newGate = new joint.shapes.logic.Not({ position: { x: xpos, y: ypos}});
            break;    
        case "logic.Nand":
            newGate = new joint.shapes.logic.Nand({ position: { x: xpos, y: ypos}});
            break;    
        case "logic.Nor":
            newGate = new joint.shapes.logic.Nor({ position: { x: xpos, y: ypos}});
            break;    
        case "logic.Xor":
            newGate = new joint.shapes.logic.Xor({ position: { x: xpos, y: ypos}});
            break;    
        case "logic.Xnor":
            newGate = new joint.shapes.logic.Xnor({ position: { x: xpos, y: ypos}});
            break; 
        case "logic.Dff":
            newGate = new joint.shapes.logic.Dff({ position: { x: xpos, y: ypos}});
            newGate.outQ = undefined;
            newGate.clk = 0;
            newGate.nextTimeStep = function() {
                var wireIn = rgraph.getConnectedLinks(newGate, { inbound: true });
                if (wireIn.length > 0) {
                    var inD = wireIn[0].get('signal'); // current input signal
                    if (newGate.clk === 0) {
                        newGate.clk = 1;
                        newGate.outQ = (inD === 1) ? true : false;
                    } else {
                        newGate.clk = 0;
                    }
                }
                
                // console.log(newGate);
            }
            newGate.operation = function(input) {
                return newGate.outQ;
            }

            break;           
        default:
            break;
    }
    graph.addCell(newGate);
}


// Additional gate
joint.shapes.logic.Dff = joint.shapes.logic.Gate11.extend({

    defaults: joint.util.deepSupplement({

        type: 'logic.Dff',
        attrs: { image: { 'xlink:href': 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB3aWR0aD0iMTQwMXB4IiBoZWlnaHQ9IjY1MnB4IiB2aWV3Qm94PSIxODYgNzUgNjIxIDI4OSIgcHJlc2VydmVBc3BlY3RSYXRpbz0ieE1pZFlNaWQgbWVldCIgem9vbUFuZFBhbj0iZGlzYWJsZSIgPjxyZWN0IGlkPSJzdmdFZGl0b3JCYWNrZ3JvdW5kIiB4PSIwIiB5PSIwIiB3aWR0aD0iMTQwMCIgaGVpZ2h0PSI3NTAiIHN0eWxlPSJmaWxsOiBub25lOyBzdHJva2U6IG5vbmU7Ii8+PHJlY3QgeD0iMzA0IiB5PSI5NSIgc3Ryb2tlPSJibGFjayIgaWQ9ImUxX3JlY3RhbmdsZSIgc3R5bGU9InN0cm9rZS13aWR0aDogM3B4OyB2ZWN0b3ItZWZmZWN0OiBub24tc2NhbGluZy1zdHJva2U7IiB3aWR0aD0iMzg2IiBoZWlnaHQ9IjI0OCIgZmlsbD0ibGlnaHRncmVlbiIvPjxsaW5lIGlkPSJlMl9saW5lIiB4MT0iMTkyLjg4MTEwMzUxNTYyNTAzIiB5MT0iMjEzIiB4Mj0iMzAyLjg4MTEwMzUxNTYyNSIgeTI9IjIxMyIgc3Ryb2tlPSJibGFjayIgc3R5bGU9InN0cm9rZS13aWR0aDogNHB4OyB2ZWN0b3ItZWZmZWN0OiBub24tc2NhbGluZy1zdHJva2U7IGZpbGw6IG5vbmU7IiAvPjxwb2x5bGluZSBzdHJva2U9ImJsYWNrIiBzdHJva2Utd2lkdGg9IjYiIGlkPSJlM19wb2x5bGluZSIgc3R5bGU9ImZpbGw6IG5vbmU7IiBwb2ludHM9IjMwNSAyNjEgMzcyIDI4NCAzMDQgMzE5IiAvPjxsaW5lIGlkPSJlNl9saW5lIiB4MT0iNjkwLjc5NzI0MTIxMDkzNzUiIHkxPSIyMTEuMDgzODYyMzA0Njg3NTMiIHgyPSI4MDAuNzk3MjQxMjEwOTM3NSIgeTI9IjIxMS4wODM4NjIzMDQ2ODc1MyIgc3Ryb2tlPSJibGFjayIgc3R5bGU9InN0cm9rZS13aWR0aDogNHB4OyB2ZWN0b3ItZWZmZWN0OiBub24tc2NhbGluZy1zdHJva2U7IGZpbGw6IG5vbmU7IiAvPjx0ZXh0IGZpbGw9ImJsYWNrIiB4PSI0MDciIHk9IjI0MiIgaWQ9ImU3X3RleHRlIiBzdHlsZT0iZm9udC1mYW1pbHk6ICdBcmlhbCBCbGFjayc7IGZvbnQtc2l6ZTogODhweDsiIGR5PSIiIGR4PSIiID5ERkY8L3RleHQ+PHRleHQgZmlsbD0iYmxhY2siIHg9IjQxNyIgeT0iMjMxIiBpZD0iZThfdGV4dGUiIHN0eWxlPSJmb250LWZhbWlseTogQXJpYWw7IGZvbnQtc2l6ZTogMjBweDsiPjwvdGV4dD48dGV4dCBmaWxsPSJibGFjayIgeD0iMjI4IiB5PSIxODYiIGlkPSJlOV90ZXh0ZSIgc3R5bGU9ImZvbnQtZmFtaWx5OiBBcmlhbDsgZm9udC1zaXplOiA2MHB4OyIgZHk9IiIgZHg9IiIgPkQ8L3RleHQ+PHRleHQgZmlsbD0iYmxhY2siIHg9IjczMC43OTciIHk9IjE4Ni42NDMiIGlkPSJlMTBfdGV4dGUiIHN0eWxlPSJmb250LWZhbWlseTogQXJpYWw7IGZvbnQtc2l6ZTogNjBweDsiIGR5PSIiIGR4PSIiID5RPC90ZXh0Pjx0ZXh0IGZpbGw9ImJsYWNrIiB4PSIzNzciIHk9IjMwMiIgaWQ9ImUxMV90ZXh0ZSIgc3R5bGU9ImZvbnQtZmFtaWx5OiBBcmlhbDsgZm9udC1zaXplOiAzNnB4OyIgIGR5PSIiIGR4PSIiPkNMSzwvdGV4dD48L3N2Zz4=' }}

    }, joint.shapes.logic.Gate11.prototype.defaults)

    // D input
    // outQ: undefined,
    // clk: 0,

    // nextTimeStep: function() {
    //     // Get input
    //     var wireIn = rgraph.getConnectedLinks(this, { inbound: true });
    //     if (wireIn.length > 0) {
    //         var inD = wireIn.get('signal')[0]; // current input signal
    //         if (clk === 0) {
    //             clk = 1;
    //             outQ = (inD === 1) ? true : false;
    //         } else {
    //             clk = 0;
    //         }
    //     }
        
    //     console.log(this);
    // },

    // operation: function(input) {
    //     return outQ;
    // }

});
