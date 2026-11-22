// Phaser presents the same canvas used by the compact campus renderer.
// The map owns its viewport and input so its scale also matches the offline release.
export function startCampusScene(canvas, drawFrame, resize) {
  const Phaser = globalThis.Phaser;
  const game = new Phaser.Game({
    type: Phaser.CANVAS, canvas, width: canvas.width, height: canvas.height,
    parent: canvas.parentElement, banner: false, transparent: true, pixelArt: true,
    render: {clearBeforeRender:false}, audio: {noAudio:true},
    input: {keyboard:false, mouse:false, touch:false},
    scale: {mode:Phaser.Scale.NONE, autoRound:true},
    scene: {
      key: 'east-gate-campus',
      create() {
        // Phaser appends its canvas on boot. Keep HUD and touch controls above it.
        canvas.parentElement.prepend(canvas);
        resize();
        this.game.events.on(Phaser.Core.Events.POST_RENDER, () => drawFrame(this.game.loop.time));
      },
    },
  });
  return () => game.destroy(false);
}
