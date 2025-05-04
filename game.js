 // --- Service Worker registration ---
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js')
          .catch(console.error);
      });
    }

    // --- Game variables ---
    let scene, camera, renderer, ball;
    const roadSegments = [];
    const objects = [], redBlocks = [], tunnels = [];
    let left = false, right = false, paused = false, gameOver = false;
    let speed = 0.2, score = 0;
    const maxX = 4;
    const scoreEl = document.getElementById('score');
    const lbEl    = document.getElementById('leaderboard');
    const pauseBtn= document.getElementById('pause-btn');
    const restartBtn = document.getElementById('restart-btn');
    const gameOverEl = document.getElementById('game-over');

    // --- Skyboxes ---
    const skyboxes = [
      [ 'Bridge2/posx.jpg','/negx.jpg','/posy.jpg','/negy.jpg','/posz.jpg','/negz.jpg' ],
      [ 'SwedishRoyalCastle/px.jpg','SwedishRoyalCastle/nx.jpg','SwedishRoyalCastle/py.jpg','SwedishRoyalCastle/ny.jpg','SwedishRoyalCastle/pz.jpg','SwedishRoyalCastle/nz.jpg' ],
      [ 'Park2/posx.jpg','Park2/negx.jpg','Park2/posy.jpg','Park2/negy.jpg','Park2/posz.jpg','Park2/negz.jpg' ]
    ];
    let currentSky = 0;

    // --- Sounds ---
    const sounds = {
      score: new Audio("https://freesound.org/data/previews/146/146725_224984-lq.mp3"),
      death: new Audio("https://freesound.org/data/previews/198/198841_285997-lq.mp3"),
      restart: new Audio("https://freesound.org/data/previews/341/341695_3248244-lq.mp3")
    };

    // --- Init ---
    init();
    animate();

    function init() {
      scene = new THREE.Scene();
      scene.fog = new THREE.Fog(0x000000, 10, 100);
      setSkybox(currentSky);

      camera = new THREE.PerspectiveCamera(75, innerWidth/innerHeight, 0.1, 1000);
      camera.position.set(0, 5, 10);

      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(innerWidth, innerHeight);
      renderer.shadowMap.enabled = true;
      document.body.appendChild(renderer.domElement);

      // Lights
      const dir = new THREE.DirectionalLight(0xffffff,1);
      dir.position.set(0,10,10);
      dir.castShadow = true;
      scene.add(dir);
      scene.add(new THREE.AmbientLight(0x404040));

      // Ball
      ball = new THREE.Mesh(
        new THREE.SphereGeometry(0.5,32,32),
        new THREE.MeshStandardMaterial({ color: 0xff0000 })
      );
      ball.castShadow = true;
      ball.position.y = 1;
      scene.add(ball);

      // initial road segments
      for (let i = 0; i < 10; i++) createRoadSegment(i * -20);

      // Green score blocks
      for (let i = 5; i < 1000; i += 10) {
        const b = new THREE.Mesh(
          new THREE.BoxGeometry(1,1,1),
          new THREE.MeshStandardMaterial({ color: 0x00ff00 })
        );
        b.position.set((Math.random()-0.5)*6, 0.5, -i);
        b.castShadow = true;
        scene.add(b);
        objects.push(b);
      }

      // Red deadly blocks (rarer)
      for (let i = 15; i < 1000; i += 30) {
        if (Math.random() > 0.5) continue;
        const r = new THREE.Mesh(
          new THREE.BoxGeometry(1,1,1),
          new THREE.MeshStandardMaterial({ color: 0xff0000 })
        );
        r.position.set((Math.random()-0.5)*6, 0.5, -i);
        r.castShadow = true;
        scene.add(r);
        redBlocks.push(r);
      }

      // Tunnels
      for (let i = 20; i < 1000; i += 40) {
        const t = new THREE.Mesh(
          new THREE.TorusGeometry(2.5,0.2,16,100,Math.PI),
          new THREE.MeshStandardMaterial({ color: 0x8888ff, side:THREE.DoubleSide })
        );
        t.rotation.x = Math.PI/2;
        t.position.set(0,1.2,-i);
        scene.add(t);
        tunnels.push(t);
      }

      // Input
      window.addEventListener('keydown', e => {
        if (e.key === 'ArrowLeft') left = true;
        if (e.key === 'ArrowRight') right = true;
      });
      window.addEventListener('keyup', e => {
        if (e.key === 'ArrowLeft') left = false;
        if (e.key === 'ArrowRight') right = false;
      });

      document.getElementById('left').addEventListener('touchstart', () => left = true);
      document.getElementById('left').addEventListener('touchend',   () => left = false);
      document.getElementById('right').addEventListener('touchstart',() => right = true);
      document.getElementById('right').addEventListener('touchend',   () => right = false);

      pauseBtn.onclick   = () => { paused = !paused; pauseBtn.textContent = paused ? '▶️ Resume' : '⏸ Pause'; if (!paused) animate(); };
      restartBtn.onclick = () => location.reload();

      updateLeaderboard();
    }

    // Create a single road segment at given z position
    function createRoadSegment(zPos) {
      const geom = new THREE.PlaneGeometry(10,20,50,50);
      geom.rotateX(-Math.PI/2);
      const pos = geom.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), z = pos.getZ(i);
        pos.setY(i, Math.sin((z + Math.abs(zPos)) * 0.1)*0.5 + Math.cos(x * 0.5)*0.3);
      }
      pos.needsUpdate = true;
      geom.computeVertexNormals();
      const mat = new THREE.MeshStandardMaterial({ color: 0x333333, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.receiveShadow = true;
      mesh.position.z = zPos;
      scene.add(mesh);
      roadSegments.push(mesh);
    }

    function animate() {
      if (paused || gameOver) return;
      requestAnimationFrame(animate);

      // Move ball forward and sideways
      ball.position.z  -= speed;
      if (left)  ball.position.x -= 0.1;
      if (right) ball.position.x += 0.1;

      // Border collision
      if (Math.abs(ball.position.x) > maxX) return die();

      // Score & remove passed green blocks
      for (let i = objects.length - 1; i >= 0; i--) {
        if (objects[i].position.z > ball.position.z) {
          score++;
          playSound('score');
          updateScore();
          scene.remove(objects[i]);
          objects.splice(i,1);
        }
      }

      // Red blocks collision
      for (const r of redBlocks) {
        if (r.position.distanceTo(ball.position) < 1) return die();
      }

      // Recycle road segments to stay ahead forever
      if (roadSegments[0].position.z - ball.position.z > 120) {
        const old = roadSegments.shift();
        scene.remove(old);
        const newZ = roadSegments[roadSegments.length-1].position.z - 20;
        createRoadSegment(newZ);
      }

      // Change skybox every 30 points
      if (score > 0 && score % 30 === 0 && currentSky !== Math.floor(score/30) % skyboxes.length) {
        currentSky = Math.floor(score/30) % skyboxes.length;
        setSkybox(currentSky);
      }

      speed += 0.00002;  // gradually speed up

      camera.position.z = ball.position.z + 10;
      camera.lookAt(ball.position);
      renderer.render(scene, camera);
    }

    function die() {
      playSound('death');
      saveScore();
      gameOver = true;
      gameOverEl.style.display = 'block';
      restartBtn.style.display = 'block';
    }

    function updateScore() {
      scoreEl.textContent = `Score: ${score}`;
    }

    function saveScore() {
      const arr = JSON.parse(localStorage.getItem('slopeScores')||'[]');
      arr.push(score);
      arr.sort((a,b)=>b-a);
      localStorage.setItem('slopeScores', JSON.stringify(arr.slice(0,3)));
      updateLeaderboard();
    }

    function updateLeaderboard() {
      const arr = JSON.parse(localStorage.getItem('slopeScores')||'[]');
      lbEl.innerHTML = `Top Scores:<br>${arr.map(n=>`• ${n}`).join('<br>')||'–'}`;
    }

    function playSound(n) {
      const s = sounds[n];
      if (!s) return;
      s.currentTime = 0;
      s.play();
    }

    function setSkybox(index) {
  const folder = skyboxes[index][0].split('/')[0] + '/';
  const files = skyboxes[index].map(f => f.split('/')[1]);
  new THREE.CubeTextureLoader()
    .setPath('https://threejs.org/examples/textures/cube/' + folder)
    .load(files, texture => {
      scene.background = texture;
    });
}
