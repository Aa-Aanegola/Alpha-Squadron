// Definitions 
var LEFT = 0;
var RIGHT = 1;
var UP = 2;
var DOWN = 3;

const pi = 3.14159265;

// Variable declarations
let scene, camera, renderer;

let fighter, background, textSprite;
const enemies = new Array();
const eLasers = new Array();
const coins = new Array();

let gameStart = false, startUp;

// Helper class to handle input
var Key = {
    _pressed: {},
    
    SPACE: 32,
    LEFT: 65,
    UP: 83,
    RIGHT: 68,
    DOWN: 87,
    
    isDown: function(keyCode) {
      return this._pressed[keyCode];
    },
    
    onKeydown: function(event) {
      this._pressed[event.keyCode] = true;
    },
    
    onKeyup: function(event) {
      delete this._pressed[event.keyCode];
    }
  };


// Helper function that invokes the gltf loader
function loadModel(url) {
	return new Promise(resolve => {
		new THREE.GLTFLoader().load(url, resolve);
	});
}

// Makes the game responsive
function onWindowResize() {
    camera.aspect = document.documentElement.clientWidth / document.documentElement.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(document.documentElement.clientWidth, document.documentElement.clientHeight);
}


window.addEventListener('resize', onWindowResize, false);

// Background class to generate star field terrain
class Background {
    constructor() {
        this.stars = new Array();
        this.geometry = new THREE.SphereGeometry( 0.2, 32, 32 );
        this.material = new THREE.PointsMaterial({
        color: 0xffffff
        });
        this.vel = 0;
        this.acc = 0.02;
        
        for(let i=0;i<700;i++) {
            let star = new THREE.Mesh(this.geometry, this.material);
            star.position.set(Math.random()*700-350, Math.random()*50-200, -1*(Math.random()*450));
            star.scale.set(Math.random()*1.5+0.1, Math.random()*1.5+0.1, Math.random()*1.5+0.1);
            scene.add(star);
            this.stars.push(star);
        }
    }
    // Function to move the stars
    update() {
        if(this.vel <= 2)
            this.vel += this.acc;
        this.stars.forEach((star) => {
            star.position.set(star.position.x, star.position.y, star.position.z + this.vel);
            if(star.position.z > 0){
                star.position.z = -450;
            }
        });
    }
}


// Fighter class that is equivalent to the player
class Fighter {
    constructor(){
        let p1 = loadModel('../objects/mainFighter.glb').then((result) => {this.model = result.scene});
        this.lasers = new Array();

        this.bullet = {geom: new THREE.CylinderGeometry(0.1, 0.1, 2, 32), 
            mat: new THREE.MeshBasicMaterial( {color: 0xDC143C}),
            vel: -1, 
            cooldown: 500,
            lastShot: 0};

        this.bounds = [[-24, -5], [24, -5], [42, -47], [-42, -47]];
        this.health = 5;
        this.score = 0;
    
        Promise.all([p1]).then(() => {
            scene.add(this.model);
            this.model.position.set(0, -10, -20);
            this.model.rotation.y = -pi/2;
            camera.lookAt(this.model.position);
        });
    }
    // Handles fighter movement
    move(dir) {
        let newPos = new THREE.Vector3(this.model.position.x,
            this.model.position.y,
            this.model.position.z);

        if(dir == LEFT){
            newPos.x = this.model.position.x - 0.2;
        }
        if(dir == UP){
            newPos.z = this.model.position.z + 0.2;
        }
        if(dir == RIGHT){
            newPos.x = this.model.position.x + 0.2;
        }
        if(dir == DOWN){
            newPos.z = this.model.position.z - 0.2;
        }

        if(this.checkBounds(newPos.x, newPos.z) == false)
        return;
        this.model.position.set(newPos.x, newPos.y, newPos.z);
    }
    
    // Master function that converts keypress to movement and updates lasers
    update() {
        if (Key.isDown(Key.UP)) this.move(UP);
        if (Key.isDown(Key.LEFT)) this.move(LEFT);
        if (Key.isDown(Key.DOWN)) this.move(DOWN);
        if (Key.isDown(Key.RIGHT)) this.move(RIGHT);
        if (Key.isDown(Key.SPACE)) this.shoot();

        let toDel = new Array();
        this.lasers.forEach((laser) => {
            laser.position.set(laser.position.x, laser.position.y, laser.position.z+this.bullet.vel);
            if(laser.position.z < -60){
                scene.remove(laser);
                toDel.push(laser);
            }
        });
        toDel.forEach((laser) => {
            for(var i=0; i<this.lasers.length; i++){
                if(this.lasers[i] == laser){
                    this.lasers.splice(i, 1);
                }
            }
        });

      };
    
    // Creates new lasers after cooldown 
    shoot() {
        if(new Date().getTime() - this.bullet.lastShot < this.bullet.cooldown)
            return;
        this.bullet.lastShot = new Date().getTime();
        var shot = new THREE.Mesh(this.bullet.geom, this.bullet.mat);
        shot.position.set(this.model.position.x+3.1, this.model.position.y+2.1, this.model.position.z-2);
        shot.rotation.x = -pi/2;
        this.lasers.push(shot);
        scene.add(shot);
        var shot = new THREE.Mesh(this.bullet.geom, this.bullet.mat);
        shot.position.set(this.model.position.x+3.1, this.model.position.y-2.1, this.model.position.z-2);
        shot.rotation.x = -pi/2;
        this.lasers.push(shot);
        scene.add(shot);
        var shot = new THREE.Mesh(this.bullet.geom, this.bullet.mat);
        shot.position.set(this.model.position.x-3.1, this.model.position.y+2.1, this.model.position.z-2);
        shot.rotation.x = -pi/2;
        this.lasers.push(shot);
        scene.add(shot);
        var shot = new THREE.Mesh(this.bullet.geom, this.bullet.mat);
        shot.position.set(this.model.position.x-3.1, this.model.position.y-2.1, this.model.position.z-2);
        shot.rotation.x = -pi/2;
        this.lasers.push(shot);
        scene.add(shot);
    }

    // Checks if the fighter is within the playable area 
    checkBounds(x, y){
        var intersections = 0;
        var ss;
        for(var i = 0, j =this.bounds.length-1; i<this.bounds.length; j=i++){
            var xi = this.bounds[i][0], yi = this.bounds[i][1]; var xj = this.bounds[j][0], yj = this.bounds[j][1];

            if (yj == yi && yj == y && x > Math.min(xj, xi) && x < Math.max(xj, xi)) {
                return true;
            }
            if (y > Math.min(yj, yi) && y <= Math.max(yj, yi) && x <= Math.max(xj, xi) && yj != yi) {
                ss = (y - yj) * (xi - xj) / (yi - yj) + xj;
                if (ss == x) {
                    return true;
                }

                if (xj == xi || x <= ss) {
                    intersections++; 
                } 
            } 
        }

        if (intersections % 2 != 0) {
            return true;
        } 
        else {
            return false;
        }
    }
}



window.addEventListener('keyup', function(event) { Key.onKeyup(event); }, false);
window.addEventListener('keydown', function(event) { Key.onKeydown(event); }, false);


// Enemy T.I.E fighter class
class Enemy {
    constructor(type, position, velocity){
        let p1 = loadModel('../objects/enemy1.glb').then((result) => {this.model = result.scene});
	
        Promise.all([p1]).then(() => {
            scene.add(this.model);
            this.model.position.set(position.x, position.y, position.z);
            this.model.rotation.y = -pi/2;
            this.velocity = velocity;
            this.rot = new THREE.Vector3(0, 0, 0);
        });
        this.laser = {
        geom: new THREE.CylinderGeometry(0.1, 0.1, 2, 32), 
        mat: new THREE.MeshBasicMaterial( {color: 0xa0fc24}),
        cooldown: 1000,
        lastShot: 0
        };
        this.dead = false;
    }
    // Moves all the T.I.Es and lasers on screen 
    update(){
        if(this.model != undefined) {
            this.model.position.set(
                this.model.position.x+this.velocity.x,
                this.model.position.y+this.velocity.y,
                this.model.position.z+this.velocity.z);
            this.model.rotation.x += this.rot.x;
            this.model.rotation.y += this.rot.y;
            this.model.rotation.z += this.rot.z;

            if(this.model.position.z > 0 || (this.dead && this.model.position.z < -60)
                || this.model.position.y > 20 || this.model.position.y < -100) {
                scene.remove(this.model);
                for(i=0; i<enemies.length; i++){
                    if(enemies[i] == this){
                        enemies.splice(i, 1);
                    }
                }
            }
            if(new Date().getTime() - this.laser.lastShot >= this.laser.cooldown)
                this.shoot();
        }
    }
    // Spawns new lasers if cooldown has elapsed
    shoot(){
        if(this.dead)
            return;
        if(Math.random() <= 0.002){
            this.laser.lastShot = new Date().getTime();
            var laser = new THREE.Mesh(this.laser.geom, this.laser.mat);
            laser.position.set(this.model.position.x, this.model.position.y, this.model.position.z-1);
            laser.rotation.x = -pi/2;
            eLasers.push(laser);
            scene.add(laser);
        }
    }
    // Animating the T.I.E destruction
    kill(){
        this.dead =true;
        this.velocity.y = Math.random() * 0.2 + 0.2;
        if(Math.random() > 0.5){
            this.velocity.y *= -1;
        }
        this.velocity.x = Math.random() * 0.5;
        this.velocity.z = Math.random() * 0.5; 

        this.rot.x = Math.random() * 0.05;
        this.rot.y = Math.random() * 0.05;
        this.rot.z = Math.random() * 0.05;
        if(Math.random() > 0.5)
            this.rot.x *= -1;
        if(Math.random() > 0.5)
            this.rot.y *= -1;
        if(Math.random() > 0.5)
            this.rot.z *= -1;
    }
}

// Coins that generate when an enemy is destroyed
class Coin {
    constructor(position) {
        let p1 = loadModel('../objects/coin.glb').then((result) => {this.model = result.scene});
	
        Promise.all([p1]).then(() => {
            scene.add(this.model);
            this.model.position.set(position.x, position.y, position.z);
        });

        this.xvel = Math.random() * 0.2 - 0.1;
        this.zvel = Math.random() * 0.2 - 0.1;
    }

    // Move and rotate the coin 
    update() {
        this.model.rotation.y += 0.02;
        this.model.position.x += this.xvel;
        this.model.position.z += this.zvel;
    }
}


let lastSpawn = 0;
// Spawn enemies in randomly generated wave formations
function spawnEnemies(enemies) {
    if(new Date().getTime() - lastSpawn <= 3000)
        return;
    lastSpawn = new Date().getTime();
    
    let x, z, xd, zd;
    if(Math.random() < 0.5){
        x = 20 - Math.random()*10;
        z = -50;
        xd = -7;
        zd = -7;
    } else {
        x = -20 + Math.random()*10;
        z = -50;
        xd = -7;
        zd = -7;
    }
    for(i=0; i<3; i++){
        enemies.push(new Enemy(0, new THREE.Vector3(x+i*xd, -12, z+(i%2)*zd), new THREE.Vector3(0, 0, 0.4)));
    }
    z = -70;
    x = Math.random() * 50 - 25;
    if(Math.random() < 0.5){
        xd = 0;
        zd = -7;
    }
    else {
        xd = -7;
        zd = 0;
    }
    for(i=0; i<3; i++){
        enemies.push(new Enemy(0, new THREE.Vector3(x+i*xd, -12, z+i*zd), new THREE.Vector3(0, 0, 0.4)));
    }
}

// Handles all the collisions 
function handleCollisions(fighter, enemies) {
    // Bullet & TIE
    var toDelEnemies = new Array();
    var toDelLasers = new Array();
    var toDelELasers = new Array();
    var toDelCoins = new Array();
    enemies.forEach((enemy) => {
        fighter.lasers.forEach((laser) => {
            if(!enemy.dead){
                if(laser.position.x >= enemy.model.position.x-2.5 && laser.position.x <= enemy.model.position.x+2.5){
                    if(laser.position.z >= enemy.model.position.z-5 && laser.position.z <= enemy.model.position.z+5){
                        toDelLasers.push(laser);
                        if(!toDelEnemies.includes(enemy.model)){
                            toDelEnemies.push(enemy.model);
                            fighter.score += 10;
                            if(Math.random() < 0.2 && coins.length <= 5)
                                coins.push(new Coin(enemy.model.position));
                        }
                    }
                }
            }
        });
    });

    // TIE & ship
    enemies.forEach((enemy) => {
        if(enemy.model.position.x+2.5 > fighter.model.position.x-3.1 && enemy.model.position.x-2.5 < fighter.model.position.x+3.1){
            if(enemy.model.position.z+2 > fighter.model.position.z-1 && enemy.model.position.z-2 < fighter.model.position.z+1){
                if(!enemy.dead){
                    fighter.health -= 1;
                    toDelEnemies.push(enemy.model);
                }
            }
        }
    });

    eLasers.forEach((laser) => {
        if(laser.position.x > fighter.model.position.x-3.1 && laser.position.x < fighter.model.position.x+3.1){
            if(laser.position.z > fighter.model.position.z-2 && laser.position.z < fighter.model.position.z+1){
                toDelELasers.push(laser);
                fighter.health -= 1;
            }
        }
    });

    coins.forEach((coin) => {
        if(coin.model.position.x < fighter.model.position.x+3.1 && coin.model.position.x > fighter.model.position.x-3.1){
            if(coin.model.position.z < fighter.model.position.z && coin.model.position.z > fighter.model.position.z-3){
                toDelCoins.push(coin.model);
            }
        }
    })
    fighter.score += 25*toDelCoins.length;

    toDelLasers.forEach((laser) => {
        for(var i=0; i<fighter.lasers.length; i++)
            if(fighter.lasers[i] == laser){
                fighter.lasers.splice(i, 1);
                scene.remove(laser);
            }
    });

    toDelEnemies.forEach((enemy) => {
        for(var i=0; i<enemies.length; i++){
            if(enemies[i].model == enemy){
                enemies[i].kill();
            }
        }
    });

    toDelELasers.forEach((laser) => {
        for(var i=0; i<eLasers.length; i++){
            if(eLasers[i] == laser){
                scene.remove(laser);
                eLasers.splice(i, 1);
            }
        }
    });

    toDelCoins.forEach((coin) => {
        for(var i=0; i<coins.length; i++){
            if(coins[i].model == coin){
                scene.remove(coin);
                coins.splice(i, 1);
            }
        }
    })
}

// Updates the positions of all the enemies 
function enemyUpdate() {
    enemies.forEach((enemy) => {
        enemy.update();
    });

    var toDel = new Array();
    eLasers.forEach((laser) => {
        laser.position.z += 0.7;
        if(laser.position.z >= 0){
            toDel.push(laser);
        }
    });
    toDel.forEach((laser) => {
        for(var i = 0; i<eLasers.length; i++)
            if(laser == eLasers[i]){
                scene.remove(laser);
                eLasers.splice(i, 1);
            }
    });
}


// Updates the positions of the coins
function coinUpdate() {
    var toDel = new Array();
    coins.forEach((coin) => {
        coin.update();
        if(coin.model.position.z < -60 || coin.model.position.z > 0
            || coin.model.position.x < -43 || coin.model.position.x > 43){
                toDel.push(coin);
            }
    });

    toDel.forEach((coin) => {
        for(var i=0; i<coins.length; i++){
            if(coins[i] == coin){
                scene.remove(coin.model);
                coins.splice(i, 1);
            }
        }
    });
}

// Renders the HUD with current info 
function updateHUD() {
    textSprite.text = `Score: ${fighter.score} \n Health: ${fighter.health}`;
    textSprite.position.set(-37, -6, -40);
    textSprite.fontSize = 1;
}

// A 3 second intro 
function intro() {
    if(new Date().getTime() - startUp > 3000)
        gameStart = true;
    textSprite.text = 'Alpha Squadron';
    textSprite.fontSize = 5;
    textSprite.position.set(0, -6, -30);
}

// Delete everything from the screen when the game ends 
function gameOver() {
    if(fighter.model){
        scene.remove(fighter.model);
    }
    enemies.forEach((enemy) => {
        scene.remove(enemy.model);
    });
    coins.forEach((coin) => {
        scene.remove(coin.model);
    })
    eLasers.forEach((laser) => {
        scene.remove(laser);
    });
    fighter.lasers.forEach((laser) => {
        scene.remove(laser);
    });

    if(new Date().getTime() - startUp > 3000)
        gameStart = true;
    textSprite.text = 'Game Over!';
    textSprite.fontSize = 5;
    textSprite.position.set(0, -6, -30);

    textSprite2 = new THREE.TextSprite({
        text: `Score: ${fighter.score}`,
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: 1,
        color: '#56F3F6',
      });
    textSprite2.position.set(0, -6, -25);
    scene.add(textSprite2);
}

// Main game loop 
function animate() {
    requestAnimationFrame(animate);

    background.update();
    if(gameStart == false){
        intro();
        renderer.render(scene, camera);
        return;
    }

    if(fighter.health <= 0){
        gameOver();
        renderer.render(scene, camera);
        return;
    }

    if(fighter){
        fighter.update();
    }

    spawnEnemies(enemies);
    enemyUpdate();
    coinUpdate();
    handleCollisions(fighter, enemies);
    updateHUD();

    renderer.render(scene, camera);
}

// Initialize the game, camera, fighter etc. 
function init() {
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(
        45, 
        document.documentElement.clientWidth / document.documentElement.clientHeight, 
        0.1, 
        1000);
    camera.position.z = 5;
    camera.position.y = 20;

    var hemiLight = new THREE.HemisphereLight( 0xffffff, 0xffffff );
    hemiLight.position.set( 0, 300, 40 );
    scene.add( hemiLight );

    var dirLight = new THREE.DirectionalLight( 0xffffff );
    dirLight.position.set( 75, 300, -75 );
    scene.add( dirLight );

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(document.documentElement.clientWidth, document.documentElement.clientHeight);

    document.body.appendChild(renderer.domElement);

    fighter = new Fighter();
    background = new Background();

    textSprite = new THREE.TextSprite({
        text: 'Score: 0 \n Health: 5',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: 1,
        color: '#56F3F6',
      });
    textSprite.position.set(-37, -6, -40);
    scene.add(textSprite);

    startUp = new Date().getTime();
}



init();
animate();