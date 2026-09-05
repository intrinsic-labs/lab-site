/* DIMS — every number the scene is built from, in one place.

   One world unit is ONE CSS PIXEL: every solid face in the scene (a drawer
   front, a folder, a tab, the sheet) is a DOM element sized in px and placed
   by CSS3DRenderer, so an element's width IS its width in the world.

   Spaces, so the numbers below read correctly:
     · CABINET space — the world. x right, y up, z toward the viewer. The
       cabinet's front face is the z = 0 plane and its drawers stack on y.
     · DRAWER space — a drawer group's own frame, origin at the centre of the
       front panel's INNER face. The panel occupies z ∈ [0, frontThick]; the
       box behind it z ∈ [-boxDepth, 0]. Opening a drawer moves the group
       to z = travel.
     · FOLDER space — a hanging folder's own frame, origin on the drawer
       floor line at the folder's centre; the sheet stands in the XY plane. */
"use strict";

export const DIM = {
  /* -- the cabinet ---------------------------------------------------------
     each drawer front is frontW × frontH, stacked with a gap; there is no
     carcass around them (2026-09-02) */
  frontW: 540, frontH: 150, gap: 8,
  frontThick: 14,

  /* -- the drawer box ------------------------------------------------------
     interior width, and the floor and wall-top heights (drawer space y) */
  boxW: 520, boxDepth: 400, floorY: -62, wallTop: 40,
  /* how far out a drawer rolls — nearly its whole depth, so the whole stack
     of folders is out in the light and the camera can look straight in */
  travel: 372,

  /* -- hanging folders -----------------------------------------------------
     A folder is a sheet standing in the drawer from folderBot (on the floor)
     to folderTop, with a tab above it. Three lanes, alternating — the
     reference art's trick: same-lane tabs sit three slots apart, and three
     slots of depth is more screen rise than a tab is tall, so no tab ever
     sits behind its neighbour's. */
  folderW: 470, folderBot: -56, folderTop: 156,
  tabH: 30, tabW: 156, lanes: [-152, 0, 152],
  /* the first folder's slot behind the front panel, and the pitch */
  slotFront: 42, slotStep: 34,
  /* THE POP GROWS THE SHEET UPWARD out of its folder by popY: its top rises,
     its bottom stays on the folder's floor line, so the paper is never seen
     to end — the folders in front of it cover the rest (Asher, 2026-09-01:
     "you don't actually see the bottom of the file"). popZ sets it a hair in
     front of its own folder body. */
  popY: 232, popZ: 6,
  /* how far the folders drop into the box while a drawer rolls home — tabs
     below the wall top, so nothing pokes out of a shut drawer */
  sinkY: 150,
};
DIM.bodyH = DIM.folderTop - DIM.folderBot;

/* THE MOTION IS PART OF THE PRODUCT, not overhead on the way to a result
   (Asher, 2026-09-01: "let animations take their time; this is not supposed
   to feel like a super slick speedy snappy tool"). A camera move takes over
   a second on purpose; a drawer rolls out over most of one. Tuned as a set. */
export const TIME = {
  dolly: 1150,       /* camera: cabinet ⇄ drawer */
  slide: 980,        /* a drawer rolling out */
  shut: 620,         /* …and rolling home */
  rollShut: 360,     /* the page turn: shut, swap, roll back */
  rollBack: 560,
  popIn: 360, popOut: 260,
  sink: 340,         /* the folders settling into the box before it shuts */
  rise: 420,         /* …and standing back up once it is out */
  bank: 520,         /* the cabinet sliding sideways to the next bank */
  /* the carry (scene/carry.js): the sheet coming out of its slot and
     shrinking into the document, that document falling into the can, and
     the whole lift run backwards when the carry is abandoned. The return is
     the slowest of the three on purpose — putting a thing back is a
     deliberate act and wants to be seen, where a drop on the can is already
     decided. */
  lift: 460, canDrop: 320, back: 520,
};

/* how many folders stand in one drawer at once — the largest count where the
   backmost tab is still comfortably legible at a phone width. Deeper folders
   page: the drawer rolls shut, swaps, rolls back out. */
export const PER_DRAWER = 9;

/* how many drawers stand in one view — a BANK. Three, on every viewport
   (Asher, 2026-09-02): more directories page the cabinet sideways, whole
   banks at a time, with arrow pads and never a half-drawer hint. */
export const PER_BANK = 3;

/* the camera */
export const CAM = {
  fov: 38,
  /* the cabinet pose: DEAD LEVEL, so the cabinet reads as a flat drawing
     until a drawer rolls out and gives the depth away (Asher, 2026-09-01);
     framed with room around it — negative space is wanted here */
  cabinet: { pitch: 0, fitW: DIM.frontW * 1.5, fitWPortrait: DIM.frontW * 1.12, fitHPad: 1.3, minFitH: 640 },
  /* the drawer pose: straight on, pitched down into the open drawer.
     `targetY` is where the eye is AIMED, so LOWERING it lifts the whole
     drawer up the frame. It was lowered to 56 against a band of pills that
     floated OVER the stage's bottom and that the open box's bottom edge was
     landing on; the band moved into the dock row the same day (kernel/
     dock.js), so the only thing the drawer has to clear now is the stage's
     own bottom edge — a much shorter reserve, and the pose came most of the
     way back. `fitH` keeps a little of the extra headroom, which is what
     stops the box's foot sitting flush against the dock. */
  drawer: { pitch: 0.34, fitW: DIM.frontW * 1.22, fitWPortrait: DIM.frontW * 1.06, fitH: 745,
            targetY: 88, targetZ: DIM.travel - 170 },
};
