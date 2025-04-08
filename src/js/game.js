import { GameOver } from './game-over.js';
import { PauseScene } from './pause-scene.js';

// Game config (global)
const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  physics: {
    default: "arcade",
    arcade: { gravity: { y: 0 }, debug: false },
  },
  scene: [
    {
      preload: preload,
      create: create,
      update: update,
    },
    GameOver,
    PauseScene,
  ],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    parent: "game-container",
  },
};

const game = new Phaser.Game(config);

// Global variables
let score = 0;
let scoreText;
let timerDisplay;
let remainingTime = 60; // 2 minutes in seconds
let objectConfig = [
  { texture: "seaweed", points: 10, weight: 25 },
  { texture: "bao-bao", points: 15, weight: 20 },
  { texture: "mandazi", points: 20, weight: 15 },
  { texture: "dragon-fruit", points: 30, weight: 6 },
  { texture: "moo-ping", points: 30, weight: 6 },
  { texture: "pop-can", points: -20, weight: 15 },
  { texture: "logo", points: 100, weight: 0.5 },
];


// Preload assets
function preload() {
  // loads assets we will be using in game
  this.load.image("store", "./assets/img/store-bg.webp");
  this.load.image("seaweed", "./assets/img/seaweed.webp");
  this.load.image("dragon-fruit", "./assets/img/dragon-fruit.webp");
  this.load.image("bao-bao", "./assets/img/bao-bao.webp");
  this.load.image("mandazi", "./assets/img/mandazi.webp");
  this.load.image("moo-ping", "./assets/img/moo-ping.webp");
  this.load.image("pop-can", "./assets/img/pop-can.webp");
  this.load.image("logo", "./assets/img/logo.webp");
}

// Helper functions
function pickWeightedObject() {
  let random = Phaser.Math.Between(0, 100);
  for (const object of objectConfig) {
    if (random <= object.weight) return object;
    random -= object.weight;
  }
  return objectConfig[0];
}

function createRandomObject(scene) {
  const MAX_ATTEMPTS = 50;
  let attempts = 0;
  let object;
  let validPosition = false;
  const selectedObject = pickWeightedObject();

  const newObjectScale = 1.5; // all objects use this scale
  const newObjectRadius = 50 * newObjectScale; // base size ~100px

  // Try up to MAX_ATTEMPTS to find a non-overlapping position
  while (!validPosition && attempts < MAX_ATTEMPTS) {
    attempts++;

    // Generate a random position on the screen (avoiding top bar)
    const x = Phaser.Math.Between(50, scene.game.config.width - 50);
    const y = Phaser.Math.Between(120 + newObjectRadius + 10, scene.game.config.height - newObjectRadius);

    validPosition = true;

    // Loop through all existing objects to check for overlap
    scene.objects.getChildren().forEach((existingObject) => {
      const existingRadius = existingObject.displayWidth / 2;
      const safeDistance = newObjectRadius + existingRadius + 10;

      const distance = Phaser.Math.Distance.Between(x, y, existingObject.x, existingObject.y);
      if (distance < safeDistance) {
        validPosition = false;
      }
    });

    // If position is good, create the object
    if (validPosition) {
      object = scene.objects.create(x, y, selectedObject.texture);
      object.setScale(newObjectScale);
      object.setInteractive();
      object.setData("points", selectedObject.points);

      // Make object shrink and disappear faster as time goes on
      // Shrink faster as time runs out
      const progress = 1 - (scene.registry.get("remainingTime") / 60);
      const minLifetime = Phaser.Math.Linear(1500, 400, progress);
      const maxLifetime = Phaser.Math.Linear(4000, 1200, progress);
      const lifetime = Phaser.Math.Between(minLifetime, maxLifetime);

      // Start shrink tween
      scene.tweens.add({
        targets: object,
        scaleX: 0.8,
        scaleY: 0.8,
        duration: lifetime,
        ease: "Linear",
      });

      // Schedule a fade-out + destroy AFTER the shrink finishes
      scene.time.delayedCall(lifetime, () => {
        if (object?.active) {
          scene.tweens.add({
            targets: object,
            alpha: 0,
            duration: 10, // always quick destroy
            onComplete: () => object.destroy(),
          });
        }
      });

      // Handle click
      object.on("pointerdown", () => {
        score += object.getData("points");
        scene.registry.set("score", score);
        scene.registry.set("remainingTime", remainingTime);
        scoreText.setText(`Score: ${score}`);

        scene.tweens.add({
          targets: object,
          scaleX: object.scaleX * 1.3,
          scaleY: object.scaleY * 1.3,
          alpha: 0,
          duration: 80,
          ease: "Power2",
          onComplete: () => object.destroy(),
        });
      });

    }
  }

  if (!validPosition) {
    console.warn("Failed to place object after", MAX_ATTEMPTS, "attempts");
    return null;
  }

  return object;
}

// Spawn objects at random intervals
function objectSpawnTimer(scene) {
  const spawnNext = () => {
    const progress = 1 - (scene.registry.get("remainingTime") / 60); // 0 → 1

    // Spawn more objects later in the game
    const objectCount = Phaser.Math.Between(1, Math.floor(1 + progress * 4)); // 1 → up to 4

    for (let i = 0; i < objectCount; i++) {
      createRandomObject(scene);
    }

    // Decrease delay over time (start slower, speed up)
    const minDelay = Phaser.Math.Linear(400, 150, progress);
    const maxDelay = Phaser.Math.Linear(650, 300, progress);
    const delay = Phaser.Math.Between(minDelay, maxDelay);

    scene.time.delayedCall(delay, spawnNext);
  };

  spawnNext();
}

// Main scene functions
function create() {
  score = 0;
  remainingTime = 60;
  this.registry.set("score", score);
  this.registry.set("remainingTime", remainingTime);
  // Background
  this.add
    .image(window.innerWidth / 2, window.innerHeight / 2, "store")
    .setDisplaySize(window.innerWidth, window.innerHeight);
  
  // white
  let pinkOverlay = this.add.graphics();
  pinkOverlay.fillStyle(0xFFFFFF, 0.8);
  pinkOverlay.fillRect(0, 0, this.game.config.width, this.game.config.height);
  

  const topBar = this.add.graphics();
  topBar.fillStyle(0xE74011, 1); // Light pink background, nearly solid
  topBar.fillRect(0, 0, this.game.config.width, 120);
  
  // Score text (top-left)
  scoreText = this.add.text(30, 45, "Score: 0", {
    fontSize: "32px",
    fill: "#ffffff",
    fontFamily: "Jua",
  });
  
  // Timer text (top-center)
  timerDisplay = this.add.text(this.game.config.width / 2, 45, "1:00", {
    fontSize: "32px",
    fill: "#ffffff",
    fontFamily: "Jua",
  }).setOrigin(0.5, 0); // Centered horizontally
  
  // Pause button (top-right)
  const pauseButton = this.add.text(this.game.config.width - 30, 45, "Pause", {
    fontSize: "32px",
    fill: "#ffffff",
    fontFamily: "Jua",
  }).setOrigin(1, 0).setInteractive();

  pauseButton.on("pointerdown", () => {
    this.scene.launch("PauseScene");
    this.scene.pause();
  });

  // object group
  this.objects = this.physics.add.group();

  // Initial objects on screen
  for (let i = 0; i < Phaser.Math.Between(1, 4); i++) {
    createRandomObject(this);
  }

  // Start random spawn timer
  objectSpawnTimer(this);

  // Countdown timer event
  this.time.addEvent({
    delay: 1000, // Every second
    loop: true,
    callback: () => {
      remainingTime--;
      this.registry.set("remainingTime", remainingTime);

    // Format time as MM:SS
    const minutes = Math.floor(remainingTime / 60);
    const seconds = remainingTime % 60;
    timerDisplay.setText(`${minutes}:${seconds.toString().padStart(2, "0")}`);

    if (remainingTime <= 0) {
      console.log("Time's up")
      this.scene.start("GameOver");
    }
  },
});
  
}

function update() {}
