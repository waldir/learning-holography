"use strict"
var diagramCanvas = document.getElementById("diagram"),
    diagram = diagramCanvas.getContext('2d'),
	hologramCanvas = document.getElementById("hologram"),
	hologram = hologramCanvas.getContext('2d'),
    dw = diagramCanvas.width,
    dh = diagramCanvas.height,
    hw = hologramCanvas.width,
    hh = hologramCanvas.height,
	tau = Math.PI*2,
	deg2rad = tau/360,
	wavLen = dh/10,
	cnvRad = distanceToOrigin(diagramCanvas.width, diagramCanvas.height) / 2,
	angle = document.getElementById("angle").value,
	boxSize = dw < dh? dw/5 : dh/5,
	points = [
		{ x:-dw/3, y: -dh/2, phase: 0 },
		{ x: dw/3, y: -3*dh/4, phase: 0 }
	];

// center coordinate origin horizontally for both canvases
diagram.translate(dw/2, 0);
hologram.translate(dw/2, 0);
// make the y axis grow upwards
diagram.scale(1,-1);
hologram.scale(1,-1);

hologram.globalCompositeOperation = "lighter";

function refresh() {
	diagram.clearRect(-dw/2, 0, dw, -dh);
	hologram.clearRect(-hw/2, 0, hw, -hh);
	angle = document.getElementById("angle").value;
	drawPlanarWave();
	drawCircularWaves();
	drawPlanarWaveDirectionBox();
	drawHologram();
	// Update the text with the current angle value
	document.getElementById("angleTxt").textContent = ' ' + angle + 'º';
}

function drawPlanarWave() {

	diagram.save();
	
	diagram.strokeStyle = "Silver";

	// the angle is inverted to make it more intuitive to manipulate
	diagram.rotate(-angle*deg2rad);

	diagram.beginPath();

	// Draw a set of horizontal lines (which, in a rotated coordinate system,
	// end up becoming rotated parallel lines)
	for (var i=0; i<cnvRad*2; i+=wavLen) {
		// Draw horizontal lines upwards from the center of the coordinate system
		diagram.moveTo(-cnvRad*2, i); diagram.lineTo( cnvRad*2, i);
		// Don't draw the central line twice
		if (i == 0) { continue; }
		// Draw horizontal lines downwards from the center of the coordinate system
		diagram.moveTo(-cnvRad*2,-i); diagram.lineTo( cnvRad*2,-i);
	}

	diagram.stroke();

	diagram.restore();
}

function drawPlanarWaveDirectionBox() {
	
	diagram.save();

	diagram.fillStyle   = "White";
	diagram.strokeStyle = "Silver";
	diagram.fillRect(  -dw/2,   -dh,   boxSize, boxSize);
	diagram.strokeRect(-dw/2+1, -dh+1, boxSize, boxSize)

	// center the coordinate system in the box
	diagram.translate(-dw/2 + boxSize/2, -dh + boxSize/2);
	// rotate the coordinate system
	diagram.rotate(-angle*deg2rad);

	// Draw a vertical arrow
	diagram.beginPath();
	diagram.moveTo( 0,-boxSize/3);
	diagram.lineTo( 0, boxSize/3);
	diagram.lineTo(-3, boxSize/3 - 7);
	diagram.moveTo( 0, boxSize/3);
	diagram.lineTo( 3, boxSize/3 - 7);
	diagram.stroke();

	diagram.restore();
}

function drawCircularWaves() {

	for (var pt = 0; pt < points.length; pt++) {
		var x = points[pt].x,
			y = points[pt].y;
		// Assuming phase of incoming planar wave (incident light) is zero at (0,0),
		// calculate the distance of each point to (0,0), along the propagation direction
		// since the propagation direction is "up" (in the rotated reference frame of the planar wave),
		// we can rotate the points by the same angle in the reverse direction.
		// The new y coordinate of the rotated point is the distance
		// along the rotaded Y axis of the plane wave reference system.
		// For this, we use the rotation formula y' = x*sin(θ) + y*cos(θ).
		// Note that the angle isn't inverted because the other transformation
		// already uses the inverted angle.
		var dist = x*Math.sin(angle*deg2rad) + y*Math.cos(angle*deg2rad);
		// Now get the phase. Normally this would be simply dist % wavLen,
		// but the % operator essentially "caps" the dist / wavLen line
		// (which is the pure 45º line of dist scaled down by 1/wavLen)
		// to the -wavLen --> wavLen range. This means the left side of the graph
		// is below the x axis, capped at -wavLen, and the right side is above,
		// capped at wavLen. We want to do the following:
		/*
			           ^                               ^
			           |                               |
			           | /| /| /|               /| /| /| /| /| /|
			___________|/_|/_|/_|_   ---->    _/_|/_|/_|/_|/_|/_|_
			 /| /| /| /|                               |
			/ |/ |/ |/ |                               |
			           |                               |
		*/
		// to achieve that, we first add wavLen to make the wole curve above 0,
		// and then we use % again to cap the wavLen --> 2*wavLen part that
		// results in the right-hand side.
		// Finally, we subtract that from wavLen, to get the growing with the
		// planar waves' propagation direction (+Y')
		points[pt].phase = wavLen - ( wavLen + dist % wavLen ) % wavLen;

		// Draw the point itself
		diagram.beginPath();
    	diagram.arc(x, y, 5, 0, tau, false);
		diagram.fill();

		// Draw the circular waves emanating from it
		for (var rad=0; rad<cnvRad*2; rad+=wavLen) {
			diagram.beginPath();
	    	diagram.arc(x, y, rad + points[pt].phase, 0, tau, false);
    		diagram.stroke();
		}
	}
}

function drawHologram() {
	var intensity = 0;
	for (var pt = -1; pt < points.length; pt++) {
		for (var holo_x = -hw/2; holo_x < hw/2; holo_x++) {
			if(pt==-1) { // Calculate the intensity of the reference wave
				// We know — because we define it that way in drawPlanarWave() —
				// that the the reference wave has zero phase at x=0
				// (since we draw a horizontal line at y=0 and the others growing
				// from there, while the coordinate system is rotated around (0,0))
				// See (handmade for now) diagram for explanation of the derivation
				// of the formula below. TODO: describe it textually as well.
				intensity = Math.cos(tau * holo_x * Math.sin(angle*deg2rad)/wavLen);
			} else { // Calculate the intensity of the current point's object wave
				var radius = distanceToOrigin(holo_x-points[pt].x, points[pt].y);
				intensity = Math.cos((radius - points[pt].phase) * tau/wavLen);
			}
			// Normalize intensity values from cosine's [-1;1] range to [0;1]
			intensity = (intensity + 1) / 2;
			// Divide by number of points (plus ref wave)
			// to allow summing intensity contributions of all waves
			// and still have the final intensity values range from 0 to 1
			intensity /= points.length + 1;
			// Convert range 0-1 to an integer in the range 0-255
			var intRGB = Math.round(intensity * 255);
			
			// Paint the calculated intensity into the current hologram pixel
			hologram.fillStyle = "rgb(" + intRGB + "," + intRGB + "," + intRGB + ")";
			hologram.fillRect(holo_x, 0, 1, -hh);
			hologram.fillStyle = "Red";
			hologram.fillRect(holo_x, -hh*intensity*(points.length+1), 1, 1);
		}
	}
}

function distanceToOrigin(x, y) {
	return Math.sqrt( Math.pow(x,2) + Math.pow(y,2) );
}