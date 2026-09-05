/* CAM — where the eye is, and nothing about what it is looking at.

   Two poses, both STRAIGHT ON (yaw 0): the cabinet from a few paces back,
   dead level, and an open drawer from above its front lip. A pose is a
   bag of six numbers — eye and target — so the tween engine can move between
   any two of them with one clock; the camera itself is written from the bag
   each frame and never tweened directly.

   Fit is by BOTH axes: a pose names how much world it must show wide and
   tall, and the distance is whichever axis constrains at this viewport's
   aspect. That is what makes a phone in portrait and a square desktop frame
   the same cabinet at different distances rather than two framings. */
"use strict";

import { CAM, DIM } from "./dims.js";

const tanHalf = () => Math.tan((CAM.fov / 2) * Math.PI / 180);

function distanceFor(fitW, fitH, aspect) {
  const t = tanHalf();
  return Math.max(fitH / (2 * t), fitW / (2 * t * aspect));
}

/* a pose from a target, a pitch (radians down from level) and a fit */
function pose(target, pitch, fitW, fitH, aspect) {
  const d = distanceFor(fitW, fitH, aspect);
  return {
    x: target[0], y: target[1] + d * Math.sin(pitch), z: target[2] + d * Math.cos(pitch),
    tx: target[0], ty: target[1], tz: target[2],
  };
}

/* in portrait the width is the constraint, so the landscape breathing room
   would push the cabinet to a stamp; a phone gets the tight budget */
const fitW = (c, aspect) => aspect < 1 ? c.fitWPortrait : c.fitW;

export function cabinetPose(cabinetH, aspect) {
  const c = CAM.cabinet;
  return pose([0, 0, 0], c.pitch, fitW(c, aspect),
              Math.max(c.minFitH, cabinetH * c.fitHPad), aspect);
}

export function drawerPose(drawerY, aspect) {
  const c = CAM.drawer;
  return pose([0, drawerY + c.targetY, c.targetZ], c.pitch, fitW(c, aspect), c.fitH, aspect);
}
