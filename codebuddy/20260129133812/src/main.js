/**
 * 震讯通 - 主入口
 * 全球地震实时监测平台 - 3D地球版 (增强版)
 */

// 全局状态
const state = {
  earthquakes: [],
  filteredEarthquakes: [],
  domesticQuakes: [],
  overseasQuakes: [],
  currentTab: 'domestic',
  currentSort: 'time-desc',
  selectedId: null,
  globe: null,
  isLoading: false,
  refreshInterval: null,
  worldBorders: null,
  chinaBorders: null
};

// API配置 - 使用本地代理避免 CORS 问题
const API_CONFIG = {
  wolfx: '/api/wolfx',
  usgs: '/api/usgs',
  // 世界边界数据 (Natural Earth Data)
  worldBorders: 'https://raw.githubusercontent.com/georgique/world-geojson/master/countries/all.json',
  // 中国边界数据
  chinaBorder: 'https://geojson.cn/api/data/china.json',
  chinaProvinces: 'https://geojson.cn/api/data/china-provinces.json',
  // 备用世界边界数据（如果主源失败）
  worldBordersBackup: 'https://raw.githubusercontent.com/datasets/geo-boundaries-world-110m/master/countries.geojson'
};

// Mapbox 配置 - 请替换为您的 Mapbox Access Token
const MAPBOX_CONFIG = {
  accessToken: 'pk.eyJ1IjoiZGVtb191c2VyIiwiYSI6ImNrY3R5b3M4bDAwMXgyeG1xbnB5M3R5eXMifQ.demo_token', // 请替换为有效的 Mapbox Token
  // Mapbox 卫星影像纹理（全球等距柱状投影）
  satelliteTexture: 'https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}@2x.png?access_token={token}',
  // 使用 Static Images API 获取全球纹理（备用方案）
  staticTexture: 'https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/0,0,1.5,0,0/2048x1024?access_token={token}&attribution=false&logo=false'
};

/**
 * 初始化应用
 */
async function init() {
  try {
    setDefaultDates();
    bindEvents();
    
    // 初始化3D地球
    await initGlobe();
    
    // 加载边界数据
    await loadBorderData();
    
    // 加载数据
    await loadEarthquakeData();
    
    // 启动定时刷新
    startAutoRefresh();
  } catch (error) {
    console.error('应用初始化失败:', error);
    showError('应用初始化失败: ' + error.message);
  }
}

/**
 * 设置默认日期
 */
function setDefaultDates() {
  const today = new Date();
  const yesterday = new Date(today - 24 * 60 * 60 * 1000);
  
  document.getElementById('end-date').value = formatDate(today);
  document.getElementById('start-date').value = formatDate(yesterday);
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

/**
 * 加载边界数据
 */
async function loadBorderData() {
  try {
    // 加载世界边界
    const worldResponse = await fetch(API_CONFIG.worldBorders);
    if (worldResponse.ok) {
      state.worldBorders = await worldResponse.json();
      if (state.globe) {
        renderWorldBorders();
      }
    }
  } catch (e) {
    console.warn('世界边界数据加载失败:', e);
  }
  
  try {
    // 加载中国边界
    const chinaResponse = await fetch(API_CONFIG.chinaBorder);
    if (chinaResponse.ok) {
      state.chinaBorders = await chinaResponse.json();
    }
  } catch (e) {
    console.warn('中国边界数据加载失败:', e);
  }
}

/**
 * 渲染世界边界
 */
function renderWorldBorders() {
  if (!state.worldBorders || !state.globe) return;
  
  const lines = [];
  
  state.worldBorders.features.forEach(feature => {
    if (feature.geometry.type === 'Polygon') {
      feature.geometry.coordinates.forEach(ring => {
        const points = ring.map(coord => latLngToVector3(coord[1], coord[0], 1.002));
        lines.push(points);
      });
    } else if (feature.geometry.type === 'MultiPolygon') {
      feature.geometry.coordinates.forEach(polygon => {
        polygon.forEach(ring => {
          const points = ring.map(coord => latLngToVector3(coord[1], coord[0], 1.002));
          lines.push(points);
        });
      });
    }
  });
  
  lines.forEach(points => {
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0x4dabf7,
      transparent: true,
      opacity: 0.4
    });
    const line = new THREE.Line(geometry, material);
    state.globe.bordersGroup.add(line);
  });
}

/**
 * 经纬度转3D坐标
 */
function latLngToVector3(lat, lng, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  
  const x = -(Math.sin(phi) * Math.cos(theta)) * radius;
  const z = Math.sin(phi) * Math.sin(theta) * radius;
  const y = Math.cos(phi) * radius;
  
  return new THREE.Vector3(x, y, z);
}

/**
 * 初始化3D地球 (增强版)
 */
async function initGlobe() {
  const container = document.getElementById('globe-container');
  if (!container) return;
  
  // 检查 THREE 是否可用
  if (!window.THREE) {
    console.error('THREE.js 未加载');
    container.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100%;color:#ff6b6b;">3D引擎加载失败</div>';
    return;
  }
  
  const width = container.clientWidth;
  const height = container.clientHeight;
  
  // 场景
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050510);
  
  // 相机
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  camera.position.set(0, 1.5, 3.2);
  
  // 渲染器
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);
  
  // 控制器
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 1.3;
  controls.maxDistance = 5;
  controls.enablePan = false;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.5;
  
  // 地球组
  const earthGroup = new THREE.Group();
  scene.add(earthGroup);
  
  // 创建增强版地球
  const earthGeometry = new THREE.SphereGeometry(1, 128, 128);
  
  // 加载卫星影像纹理
  const textureLoader = new THREE.TextureLoader();
  
  // 卫星影像纹理源（按优先级排序）
  const textureUrls = [
    // 1. ESRI World Imagery (高质量卫星影像，公开访问)
    'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/0/0/0',
    // 2. NASA Blue Marble (备用)
    'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&LAYERS=BlueMarble_ShadedRelief_Bathymetry&VERSION=1.1.1&FORMAT=image/jpeg&TRANSPARENT=false&WIDTH=2048&HEIGHT=1024&BBOX=-180,-90,180,90&SRS=EPSG:4326',
    // 3. CartoDB Dark Matter (暗色底图)
    'https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/0/0/0.png',
    // 4. 原始 Blue Marble
    'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg'
  ];
  
  // 地形凹凸纹理
  const bumpMapUrls = [
    'https://unpkg.com/three-globe/example/img/earth-topology.png',
    'https://raw.githubusercontent.com/vasturiano/three-globe/master/example/img/earth-topology.png'
  ];
  
  let earthMaterial;
  
  try {
    // 加载卫星影像纹理
    const texture = await loadSatelliteTexture(textureLoader);
    const bumpMap = await loadTexture(textureLoader, bumpMapUrls).catch(() => null);
    
    // 卫星影像材质
    earthMaterial = new THREE.MeshPhongMaterial({
      map: texture,
      bumpMap: bumpMap,
      bumpScale: 0.02,
      color: 0xffffff,
      emissive: 0x1a1a2e,
      emissiveIntensity: 0.1,
      shininess: 15,
      specular: new THREE.Color(0x222222)
    });
  } catch (error) {
    console.warn('无法加载卫星影像纹理，使用默认材质:', error);
    earthMaterial = new THREE.MeshPhongMaterial({
      color: 0x2a4a7c,
      emissive: 0x0a1a3e,
      emissiveIntensity: 0.4,
      shininess: 20
    });
  }
  
  const earth = new THREE.Mesh(earthGeometry, earthMaterial);
  earthGroup.add(earth);
  
  // 添加夜间灯光效果（城市灯光）
  try {
    const nightTexture = await loadTexture(textureLoader, [
      'https://unpkg.com/three-globe/example/img/earth-night.jpg'
    ]).catch(() => null);
    
    if (nightTexture) {
      const nightGeometry = new THREE.SphereGeometry(1.001, 64, 64);
      const nightMaterial = new THREE.MeshBasicMaterial({
        map: nightTexture,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
      });
      const nightLayer = new THREE.Mesh(nightGeometry, nightMaterial);
      earthGroup.add(nightLayer);
    }
  } catch (e) {}
  
  // 增强版大气层光晕
  const atmosphereGeometry = new THREE.SphereGeometry(1.15, 64, 64);
  const atmosphereMaterial = new THREE.ShaderMaterial({
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      void main() {
        float intensity = pow(0.6 - dot(vNormal, vec3(0, 0, 1.0)), 2.0);
        gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity * 0.8;
      }
    `,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    transparent: true
  });
  const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
  earthGroup.add(atmosphere);
  
  // 国界线组
  const bordersGroup = new THREE.Group();
  earthGroup.add(bordersGroup);
  
  // 中国边界组
  const chinaBordersGroup = new THREE.Group();
  chinaBordersGroup.visible = false;
  earthGroup.add(chinaBordersGroup);
  
  // 地震标记组
  const markersGroup = new THREE.Group();
  earthGroup.add(markersGroup);
  
  // 涟漪动画组
  const ripplesGroup = new THREE.Group();
  earthGroup.add(ripplesGroup);
  
  // 星星背景
  createStarField(scene);
  
  // 光照系统 - 更明亮
  const ambientLight = new THREE.AmbientLight(0x404040, 1.2);
  scene.add(ambientLight);
  
  const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
  sunLight.position.set(5, 3, 5);
  scene.add(sunLight);
  
  const fillLight = new THREE.DirectionalLight(0x4dabf7, 0.5);
  fillLight.position.set(-5, 0, -5);
  scene.add(fillLight);
  
  const rimLight = new THREE.PointLight(0x00d9a5, 0.3);
  rimLight.position.set(-5, 5, -5);
  scene.add(rimLight);
  
  // 保存引用
  state.globe = {
    scene,
    camera,
    renderer,
    controls,
    earthGroup,
    earth,
    bordersGroup,
    chinaBordersGroup,
    markersGroup,
    ripplesGroup,
    markers: [],
    ripples: []
  };
  
  // 动画循环
  function animate() {
    requestAnimationFrame(animate);
    
    // 更新涟漪动画
    updateRippleAnimations();
    
    // 检查中国聚焦状态
    checkChinaFocus();
    
    controls.update();
    renderer.render(scene, camera);
  }
  animate();
  
  // 鼠标交互
  setupGlobeInteractions(container, camera, earth, controls);
  
  // 响应式
  window.addEventListener('resize', () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  });
}

/**
 * 创建星空背景
 */
function createStarField(scene) {
  const starGeometry = new THREE.BufferGeometry();
  const starCount = 3000;
  const positions = new Float32Array(starCount * 3);
  const colors = new Float32Array(starCount * 3);
  
  for (let i = 0; i < starCount * 3; i += 3) {
    const r = 50 + Math.random() * 50;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    
    positions[i] = r * Math.sin(phi) * Math.cos(theta);
    positions[i + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i + 2] = r * Math.cos(phi);
    
    // 星星颜色变化
    const colorType = Math.random();
    if (colorType < 0.7) {
      colors[i] = 1; colors[i + 1] = 1; colors[i + 2] = 1;
    } else if (colorType < 0.9) {
      colors[i] = 0.8; colors[i + 1] = 0.9; colors[i + 2] = 1;
    } else {
      colors[i] = 1; colors[i + 1] = 0.9; colors[i + 2] = 0.7;
    }
  }
  
  starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  
  const starMaterial = new THREE.PointsMaterial({
    size: 0.15,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    sizeAttenuation: true
  });
  
  const stars = new THREE.Points(starGeometry, starMaterial);
  scene.add(stars);
}

/**
 * 加载卫星影像纹理（支持多源备用）
 * 使用 Canvas 拼接瓦片创建完整的地球纹理
 */
async function loadSatelliteTexture(loader) {
  // 尝试加载 NASA GIBS Blue Marble（等距柱状投影，最适合球体）
  const nasaUrl = 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&LAYERS=BlueMarble_NextGeneration&VERSION=1.3.0&FORMAT=image/jpeg&TRANSPARENT=false&WIDTH=4096&HEIGHT=2048&CRS=EPSG:4326&BBOX=-90,-180,90,180';
  
  try {
    return await new Promise((resolve, reject) => {
      loader.load(
        nasaUrl,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          console.log('✓ NASA Blue Marble 卫星影像加载成功');
          resolve(texture);
        },
        undefined,
        (error) => reject(error)
      );
    });
  } catch (e) {
    console.warn('NASA 纹理加载失败，尝试备用源...');
  }
  
  // 备用：创建基于 Canvas 的卫星影像纹理
  return await createCanvasSatelliteTexture();
}

/**
 * 使用 Canvas 创建卫星风格纹理（备用方案）
 */
async function createCanvasSatelliteTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  
  // 创建深海背景渐变
  const oceanGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  oceanGradient.addColorStop(0, '#0a1628');   // 北极
  oceanGradient.addColorStop(0.5, '#0d1f35'); // 赤道
  oceanGradient.addColorStop(1, '#0a1628');   // 南极
  ctx.fillStyle = oceanGradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // 绘制简化的大陆轮廓（基于粗略坐标）
  ctx.fillStyle = '#1a2f1a'; // 陆地基色
  
  // 简化的大陆多边形
  const continents = [
    // 亚洲
    { x: 0.55, y: 0.35, w: 0.25, h: 0.25 },
    // 欧洲
    { x: 0.48, y: 0.28, w: 0.08, h: 0.12 },
    // 非洲
    { x: 0.47, y: 0.40, w: 0.10, h: 0.25 },
    // 北美
    { x: 0.15, y: 0.25, w: 0.18, h: 0.25 },
    // 南美
    { x: 0.25, y: 0.52, w: 0.08, h: 0.25 },
    // 澳洲
    { x: 0.78, y: 0.65, w: 0.08, h: 0.10 },
    // 南极
    { x: 0, y: 0.88, w: 1, h: 0.12 }
  ];
  
  continents.forEach(c => {
    // 添加随机变化使大陆边缘不规则
    ctx.beginPath();
    const x = c.x * canvas.width;
    const y = c.y * canvas.height;
    const w = c.w * canvas.width;
    const h = c.h * canvas.height;
    
    // 绘制带噪点的大陆
    for (let i = 0; i < 50; i++) {
      const px = x + Math.random() * w;
      const py = y + Math.random() * h;
      const pw = Math.random() * w * 0.4;
      const ph = Math.random() * h * 0.4;
      ctx.fillStyle = `hsl(${100 + Math.random() * 40}, ${30 + Math.random() * 20}%, ${15 + Math.random() * 15}%)`;
      ctx.fillRect(px, py, pw, ph);
    }
  });
  
  // 添加云层效果
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const r = Math.random() * 30 + 10;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  console.log('✓ Canvas 卫星风格纹理创建成功');
  return texture;
}

/**
 * 加载纹理（带备用源）
 */
function loadTexture(loader, urls) {
  return new Promise((resolve, reject) => {
    let index = 0;
    
    function tryLoad() {
      if (index >= urls.length) {
        reject(new Error('所有纹理源都失败'));
        return;
      }
      
      loader.load(
        urls[index],
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          resolve(texture);
        },
        undefined,
        (error) => {
          console.warn(`纹理源 ${index + 1} 失败，尝试下一个...`);
          index++;
          tryLoad();
        }
      );
    }
    
    tryLoad();
  });
}

/**
 * 设置地球交互
 */
function setupGlobeInteractions(container, camera, earth, controls) {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  
  // 鼠标移动显示经纬度
  container.addEventListener('mousemove', (event) => {
    const rect = container.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(earth);
    
    if (intersects.length > 0) {
      const point = intersects[0].point;
      const lat = 90 - (Math.acos(Math.max(-1, Math.min(1, point.y))) * 180 / Math.PI);
      const lng = ((Math.atan2(point.x, -point.z) * 180 / Math.PI) + 180) % 360 - 180;
      
      const latStr = lat >= 0 ? `${lat.toFixed(2)}N` : `${Math.abs(lat).toFixed(2)}S`;
      const lngStr = lng >= 0 ? `${lng.toFixed(2)}E` : `${Math.abs(lng).toFixed(2)}W`;
      
      const coordsEl = document.getElementById('mouse-coords');
      if (coordsEl) {
        coordsEl.innerHTML = `<span>${latStr}</span>, <span>${lngStr}</span>`;
      }
      
      container.style.cursor = 'crosshair';
    } else {
      container.style.cursor = 'default';
    }
  });
  
  // 点击震中标记显示详情
  container.addEventListener('click', (event) => {
    const rect = container.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    
    // 收集所有可点击的标记对象
    const clickableObjects = [];
    state.globe.markers.forEach(group => {
      group.children.forEach(child => {
        if (child.userData.isClickable) {
          clickableObjects.push(child);
        }
      });
    });
    
    const intersects = raycaster.intersectObjects(clickableObjects);
    
    if (intersects.length > 0) {
      const clicked = intersects[0].object;
      const eq = clicked.userData.eq;
      
      if (eq) {
        controls.autoRotate = false;
        showDetail(eq);
        flyToLocation(eq.latitude, eq.longitude, 2);
        setTimeout(() => {
          controls.autoRotate = true;
        }, 5000);
      }
    }
  });
}

/**
 * 检查是否聚焦中国区域
 */
function checkChinaFocus() {
  if (!state.globe) return;
  
  const camera = state.globe.camera;
  const distance = camera.position.length();
  
  // 获取相机朝向
  const cameraDirection = new THREE.Vector3();
  camera.getWorldDirection(cameraDirection);
  
  // 中国中心点
  const chinaCenter = latLngToVector3(35, 105, 1);
  const angle = cameraDirection.angleTo(chinaCenter.clone().normalize());
  
  const isFocusedOnChina = distance < 2.8 && angle < 0.6;
  
  if (state.globe.chinaBordersGroup.visible !== isFocusedOnChina) {
    state.globe.chinaBordersGroup.visible = isFocusedOnChina;
    
    // 如果显示中国边界，加载省份数据
    if (isFocusedOnChina && state.globe.chinaBordersGroup.children.length === 0) {
      loadChinaProvinces();
    }
  }
}

/**
 * 加载中国省份边界
 */
async function loadChinaProvinces() {
  if (!state.globe) return;
  
  try {
    const response = await fetch(API_CONFIG.chinaProvinces);
    if (!response.ok) return;
    
    const data = await response.json();
    
    if (data.features) {
      data.features.forEach(feature => {
        if (feature.geometry.type === 'Polygon') {
          feature.geometry.coordinates.forEach(ring => {
            const points = ring.map(coord => latLngToVector3(coord[1], coord[0], 1.002));
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineBasicMaterial({
              color: 0xffaa00,
              transparent: true,
              opacity: 0.6
            });
            const line = new THREE.Line(geometry, material);
            state.globe.chinaBordersGroup.add(line);
          });
        } else if (feature.geometry.type === 'MultiPolygon') {
          feature.geometry.coordinates.forEach(polygon => {
            polygon.forEach(ring => {
              const points = ring.map(coord => latLngToVector3(coord[1], coord[0], 1.002));
              const geometry = new THREE.BufferGeometry().setFromPoints(points);
              const material = new THREE.LineBasicMaterial({
                color: 0xffaa00,
                transparent: true,
                opacity: 0.6
              });
              const line = new THREE.Line(geometry, material);
              state.globe.chinaBordersGroup.add(line);
            });
          });
        }
      });
    }
  } catch (e) {
    console.warn('加载省份数据失败:', e);
  }
}

/**
 * 更新3D地球标记
 */
function updateGlobeMarkers(earthquakes) {
  if (!state.globe) return;
  
  // 清除旧标记
  state.globe.markers.forEach(marker => {
    state.globe.markersGroup.remove(marker);
  });
  state.globe.ripples.forEach(ripple => {
    state.globe.ripplesGroup.remove(ripple);
  });
  state.globe.markers = [];
  state.globe.ripples = [];
  
  earthquakes.forEach((eq, index) => {
    if (!eq.latitude || !eq.longitude) return;
    
    const marker = createGlobeMarker(eq, index);
    if (marker) {
      state.globe.markersGroup.add(marker);
      state.globe.markers.push(marker);
    }
  });
}

/**
 * 创建3D地球标记
 */
function createGlobeMarker(eq, index) {
  const lat = eq.latitude;
  const lng = eq.longitude;
  const mag = eq.mag || 0;
  
  const pos = latLngToVector3(lat, lng, 1);
  const color = new THREE.Color(getMagColor(mag));
  const size = Math.max(0.015, (mag / 10) * 0.04);
  
  // 标记组
  const group = new THREE.Group();
  group.position.copy(pos);
  group.userData = { id: eq.id, eq, lat, lng };
  
  // 中心点 - 紧贴地球表面
  const dotGeometry = new THREE.SphereGeometry(size, 16, 16);
  const dotMaterial = new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0.95
  });
  const dot = new THREE.Mesh(dotGeometry, dotMaterial);
  dot.userData = { isClickable: true, eq };
  group.add(dot);
  
  // 光晕效果
  const glowGeometry = new THREE.RingGeometry(size * 1.5, size * 3, 32);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0.4,
    side: THREE.DoubleSide
  });
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  glow.lookAt(0, 0, 0);
  glow.userData = { isClickable: true, eq };
  group.add(glow);
  
  // 创建动态涟漪
  if (mag >= 3) {
    const rippleCount = Math.min(3, Math.floor(mag / 2));
    
    for (let i = 0; i < rippleCount; i++) {
      createRipple(group, color, size, i, mag);
    }
  }
  
  return group;
}

/**
 * 创建涟漪效果
 */
function createRipple(parentGroup, color, baseSize, index, mag) {
  const rippleGroup = new THREE.Group();
  
  // 多个圆环形成涟漪
  const rings = [];
  const ringCount = 3;
  
  for (let r = 0; r < ringCount; r++) {
    const innerRadius = baseSize * (2 + index * 2 + r * 0.5);
    const outerRadius = innerRadius + baseSize * 0.3;
    
    const geometry = new THREE.RingGeometry(innerRadius, outerRadius, 48);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.6 - index * 0.15,
      side: THREE.DoubleSide
    });
    
    const ring = new THREE.Mesh(geometry, material);
    ring.lookAt(0, 0, 0);
    ring.userData = {
      isRipple: true,
      baseRadius: innerRadius,
      index: index,
      ringIndex: r,
      phase: (index * 2 + r) * 0.5
    };
    
    rings.push(ring);
    rippleGroup.add(ring);
  }
  
  // 将涟漪添加到父组
  parentGroup.add(rippleGroup);
  
  // 保存涟漪引用
  if (!state.globe.ripples) state.globe.ripples = [];
  state.globe.ripples.push({
    group: rippleGroup,
    rings: rings,
    mag: mag,
    baseSize: baseSize
  });
}

/**
 * 更新涟漪动画
 */
function updateRippleAnimations() {
  if (!state.globe || !state.globe.ripples) return;
  
  const time = Date.now() * 0.001;
  
  state.globe.ripples.forEach(ripple => {
    const speed = 0.8;
    const cycle = (time * speed) % (Math.PI * 3);
    
    ripple.rings.forEach((ring, ringIndex) => {
      const data = ring.userData;
      const offset = data.phase;
      
      // 涟漪波动
      const wave = Math.sin(cycle - offset) * 0.5 + 0.5;
      
      // 缩放效果 - 向外扩散
      const scale = 1 + wave * 0.8;
      ring.scale.set(scale, scale, 1);
      
      // 透明度渐变
      const opacity = (0.6 - data.index * 0.15) * (1 - wave * 0.8);
      ring.material.opacity = Math.max(0, opacity);
      
      // 旋转效果
      ring.rotation.z = time * 0.1 * (ringIndex % 2 === 0 ? 1 : -1);
    });
  });
}

/**
 * 飞行到指定位置
 */
function flyToLocation(lat, lng, zoom = 2.5) {
  if (!state.globe) return;
  
  const pos = latLngToVector3(lat, lng, zoom);
  
  const startPos = state.globe.camera.position.clone();
  const endPos = pos;
  
  let progress = 0;
  const duration = 1200;
  const startTime = Date.now();
  
  state.globe.controls.autoRotate = false;
  
  function animate() {
    const elapsed = Date.now() - startTime;
    progress = Math.min(elapsed / duration, 1);
    
    const ease = 1 - Math.pow(1 - progress, 4);
    
    state.globe.camera.position.lerpVectors(startPos, endPos, ease);
    state.globe.camera.lookAt(0, 0, 0);
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      setTimeout(() => {
        if (state.globe) state.globe.controls.autoRotate = true;
      }, 3000);
    }
  }
  animate();
}

/**
 * 绑定事件
 */
function bindEvents() {
  // 快捷筛选
  document.querySelectorAll('.quick-filter-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.quick-filter-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      loadEarthquakeData();
    });
  });
  
  // 日期筛选
  document.getElementById('apply-filter').addEventListener('click', loadEarthquakeData);
  document.getElementById('reset-filter').addEventListener('click', () => {
    setDefaultDates();
    document.querySelectorAll('.quick-filter-item').forEach(i => i.classList.remove('active'));
    document.querySelector('[data-period="day"]').classList.add('active');
    loadEarthquakeData();
  });
  
  // 震级筛选
  document.getElementById('mag-min').addEventListener('change', filterAndDisplay);
  document.getElementById('mag-max').addEventListener('change', filterAndDisplay);
  
  // 刷新按钮
  document.getElementById('refresh-btn').addEventListener('click', refreshData);
  
  // Tab切换
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentTab = btn.dataset.tab;
      displayQuakeList();
    });
  });
  
  // 排序
  document.getElementById('sort-select').addEventListener('change', (e) => {
    state.currentSort = e.target.value;
    displayQuakeList();
  });
  
  // 详情弹窗关闭
  document.getElementById('detail-close').addEventListener('click', closeDetail);
  document.getElementById('overlay').addEventListener('click', closeDetail);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDetail();
  });
  
  // 地图控制
  document.getElementById('map-zoom-in').addEventListener('click', () => {
    if (state.globe) {
      const current = state.globe.camera.position.length();
      const target = Math.max(1.3, current * 0.85);
      state.globe.camera.position.setLength(target);
    }
  });
  
  document.getElementById('map-zoom-out').addEventListener('click', () => {
    if (state.globe) {
      const current = state.globe.camera.position.length();
      const target = Math.min(5, current * 1.15);
      state.globe.camera.position.setLength(target);
    }
  });
  
  document.getElementById('map-reset').addEventListener('click', () => {
    if (state.globe) {
      flyToLocation(35, 105, 3.2);
    }
  });
}

/**
 * 加载地震数据
 */
async function loadEarthquakeData() {
  showLoading(true);
  
  try {
    const data = await fetchWolfxData();
    state.earthquakes = data;
    
    classifyQuakes();
    filterAndDisplay();
    updateStats();
    
  } catch (error) {
    console.error('Wolfx API加载失败:', error);
    showError('数据加载失败，请稍后重试');
  } finally {
    showLoading(false);
  }
}

/**
 * 获取Wolfx数据
 */
async function fetchWolfxData() {
  const response = await fetch(API_CONFIG.wolfx);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  
  const data = await response.json();
  const earthquakes = [];
  
  Object.keys(data).forEach(key => {
    if (key.startsWith('No')) {
      const item = data[key];
      const timeStr = item.time || item.ReportTime;
      const timestamp = new Date(timeStr).getTime();
      
      // 日期筛选
      const startDate = document.getElementById('start-date').value;
      const endDate = document.getElementById('end-date').value;
      
      if (startDate && endDate) {
        const startTime = new Date(startDate).getTime();
        const endTime = new Date(endDate + 'T23:59:59').getTime();
        if (timestamp < startTime || timestamp > endTime) return;
      }
      
      earthquakes.push({
        id: item.EventID || key,
        mag: parseFloat(item.magnitude) || 0,
        place: item.location || item.placeName || '未知地点',
        time: timestamp,
        timeStr: timeStr,
        depth: parseFloat(item.depth) || 0,
        latitude: parseFloat(item.latitude) || 0,
        longitude: parseFloat(item.longitude) || 0,
        intensity: item.intensity,
        type: item.type,
        source: 'cenc'
      });
    }
  });
  
  return earthquakes.sort((a, b) => b.time - a.time);
}

/**
 * 分类国内/海外地震
 */
function classifyQuakes() {
  state.domesticQuakes = [];
  state.overseasQuakes = [];
  
  state.earthquakes.forEach(eq => {
    if (isDomestic(eq.place)) {
      state.domesticQuakes.push(eq);
    } else {
      state.overseasQuakes.push(eq);
    }
  });
  
  document.getElementById('count-domestic').textContent = state.domesticQuakes.length;
  document.getElementById('count-overseas').textContent = state.overseasQuakes.length;
}

/**
 * 判断是否国内地震
 */
function isDomestic(place) {
  if (!place) return false;
  
  const domesticKeywords = [
    '北京', '天津', '上海', '重庆',
    '河北', '山西', '辽宁', '吉林', '黑龙江',
    '江苏', '浙江', '安徽', '福建', '江西', '山东',
    '河南', '湖北', '湖南', '广东', '海南',
    '四川', '贵州', '云南', '陕西', '甘肃',
    '青海', '台湾', '内蒙古', '广西', '西藏', '宁夏', '新疆',
    '香港', '澳门', '西沙', '南沙', '中沙', '黄岩岛'
  ];
  
  return domesticKeywords.some(keyword => place.includes(keyword));
}

/**
 * 筛选并显示
 */
function filterAndDisplay() {
  const minMag = parseFloat(document.getElementById('mag-min').value) || 0;
  const maxMag = parseFloat(document.getElementById('mag-max').value) || 10;
  
  const filterByMag = (eq) => {
    const mag = eq.mag || 0;
    return mag >= minMag && mag <= maxMag;
  };
  
  const allQuakes = [...state.earthquakes];
  state.domesticQuakes = allQuakes.filter(eq => isDomestic(eq.place) && filterByMag(eq));
  state.overseasQuakes = allQuakes.filter(eq => !isDomestic(eq.place) && filterByMag(eq));
  
  // 更新地球标记
  const allFiltered = [...state.domesticQuakes, ...state.overseasQuakes];
  updateGlobeMarkers(allFiltered);
  
  displayQuakeList();
  updateStats();
}

/**
 * 显示地震列表
 */
function displayQuakeList() {
  const panel = document.getElementById('latest-quakes-panel');
  
  let data = state.currentTab === 'domestic' 
    ? [...state.domesticQuakes] 
    : [...state.overseasQuakes];
  
  // 排序
  data.sort((a, b) => {
    switch (state.currentSort) {
      case 'time-desc': return b.time - a.time;
      case 'time-asc': return a.time - b.time;
      case 'mag-desc': return b.mag - a.mag;
      case 'mag-asc': return a.mag - b.mag;
      default: return b.time - a.time;
    }
  });
  
  document.getElementById('total-quakes').textContent = data.length;
  
  if (data.length === 0) {
    panel.innerHTML = '<div style="padding: 40px; text-align: center; color: rgba(255,255,255,0.4);">暂无数据</div>';
    return;
  }
  
  panel.innerHTML = data.map((eq, index) => {
    const magColor = getMagColor(eq.mag);
    const isRecent = (Date.now() - eq.time) < 60 * 60 * 1000;
    const timeDisplay = formatTime(eq.time);
    const province = extractProvince(eq.place);
    const isDomestic = state.currentTab === 'domestic';
    
    return `
      <div class="latest-quake-item ${index < 3 ? 'highlight' : ''} ${state.selectedId === eq.id ? 'active' : ''}" 
           data-id="${eq.id}" 
           style="animation-delay: ${index * 0.05}s">
        <div class="latest-quake-rank">${index + 1}</div>
        <div class="latest-quake-content">
          <div class="latest-quake-header">
            <div class="latest-quake-place" title="${eq.place}">
              ${isDomestic ? `<span class="province-tag">${province}</span>` : ''}
              ${eq.place}
            </div>
            <div class="latest-quake-mag" style="color: ${magColor}">
              M${eq.mag.toFixed(1)}
            </div>
          </div>
          <div class="latest-quake-bar">
            <div class="latest-quake-bar-fill" style="width: ${Math.min(100, (eq.mag / 8) * 100)}%; background: ${magColor};"></div>
          </div>
          <div class="latest-quake-meta">
            <span class="latest-quake-time ${isRecent ? 'recent' : ''}">${timeDisplay}</span>
            <span>深度 ${eq.depth.toFixed(0)}km</span>
          </div>
        </div>
        <div class="latest-quake-glow" style="background: radial-gradient(circle at center, ${magColor}15, transparent 70%);"></div>
      </div>
    `;
  }).join('');
  
  // 绑定点击事件
  panel.querySelectorAll('.latest-quake-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.dataset.id;
      const allQuakes = [...state.domesticQuakes, ...state.overseasQuakes];
      const eq = allQuakes.find(e => e.id === id);
      if (eq) {
        showDetail(eq);
        flyToLocation(eq.latitude, eq.longitude, 2.5);
      }
    });
  });
}

/**
 * 格式化时间
 */
function formatTime(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  
  if (diff < 60 * 60 * 1000) {
    const minutes = Math.floor(diff / (60 * 1000));
    return minutes < 1 ? '刚刚' : `${minutes}分钟前`;
  }
  
  const date = new Date(timestamp);
  const today = new Date();
  
  if (date.toDateString() === today.toDateString()) {
    return `今天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }
  
  return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

/**
 * 提取省份
 */
function extractProvince(place) {
  if (!place) return '未知';
  
  const patterns = [
    /^(北京|天津|上海|重庆)/,
    /^(河北|山西|辽宁|吉林|黑龙江|江苏|浙江|安徽|福建|江西|山东|河南|湖北|湖南|广东|海南|四川|贵州|云南|陕西|甘肃|青海|台湾)/,
    /^(内蒙古|广西|西藏|宁夏|新疆)/,
    /^(香港|澳门)/
  ];
  
  for (const pattern of patterns) {
    const match = place.match(pattern);
    if (match) return match[1];
  }
  
  return '国内';
}

/**
 * 显示详情
 */
function showDetail(eq) {
  state.selectedId = eq.id;
  
  document.querySelectorAll('.latest-quake-item').forEach(item => {
    item.classList.toggle('active', item.dataset.id === eq.id);
  });
  
  const magColor = getMagColor(eq.mag);
  const timeStr = new Date(eq.time).toLocaleString('zh-CN');
  const province = extractProvince(eq.place);
  const isDomestic = isDomesticQuake(eq.place);
  
  const detailBody = document.getElementById('detail-body');
  detailBody.innerHTML = `
    <div class="detail-mag-section">
      <div class="detail-mag-value" style="color: ${magColor}">${eq.mag.toFixed(1)}</div>
      <div class="detail-mag-type">${getMagLabel(eq.mag)}地震</div>
      <div class="detail-mag-desc">${getMagDesc(eq.mag)}</div>
    </div>
    
    <div class="detail-info-grid">
      <div class="detail-info-item">
        <div class="detail-info-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
        <div class="detail-info-content">
          <div class="detail-info-label">震中位置</div>
          <div class="detail-info-value">
            ${isDomestic ? `<span class="province-tag" style="display: inline-block; margin-right: 8px;">${province}</span>` : ''}
            ${eq.place}
          </div>
        </div>
      </div>
      
      <div class="detail-info-item">
        <div class="detail-info-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
            <path d="M2 12h20"/>
          </svg>
        </div>
        <div class="detail-info-content">
          <div class="detail-info-label">经纬度</div>
          <div class="detail-info-value">${eq.latitude.toFixed(4)}, ${eq.longitude.toFixed(4)}</div>
        </div>
      </div>
      
      <div class="detail-info-item">
        <div class="detail-info-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L12 22M12 22L18 16M12 22L6 16"/>
          </svg>
        </div>
        <div class="detail-info-content">
          <div class="detail-info-label">震源深度</div>
          <div class="detail-info-value">${eq.depth.toFixed(1)} 公里</div>
        </div>
      </div>
      
      <div class="detail-info-item">
        <div class="detail-info-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>
        <div class="detail-info-content">
          <div class="detail-info-label">发震时刻</div>
          <div class="detail-info-value">${timeStr}</div>
        </div>
      </div>
    </div>
  `;
  
  document.getElementById('detail-popup').classList.add('open');
  document.getElementById('overlay').classList.add('show');
}

function isDomesticQuake(place) {
  return isDomestic(place);
}

function closeDetail() {
  state.selectedId = null;
  document.getElementById('detail-popup').classList.remove('open');
  document.getElementById('overlay').classList.remove('show');
  document.querySelectorAll('.latest-quake-item').forEach(item => {
    item.classList.remove('active');
  });
}

/**
 * 更新统计
 */
function updateStats() {
  const domestic = state.domesticQuakes.length;
  const overseas = state.overseasQuakes.length;
  const total = domestic + overseas;
  
  const all = [...state.domesticQuakes, ...state.overseasQuakes];
  const maxMag = all.length > 0 ? Math.max(...all.map(e => e.mag || 0)) : 0;
  const avgMag = all.length > 0 ? all.reduce((a, b) => a + (b.mag || 0), 0) / all.length : 0;
  const avgDepth = all.length > 0 ? all.reduce((a, b) => a + (b.depth || 0), 0) / all.length : 0;
  
  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-max').textContent = maxMag.toFixed(1);
  document.getElementById('stat-avg').textContent = avgMag.toFixed(1);
  document.getElementById('stat-depth').textContent = avgDepth.toFixed(0) + 'km';
  
  document.getElementById('count-domestic').textContent = domestic;
  document.getElementById('count-overseas').textContent = overseas;
}

/**
 * 刷新数据
 */
async function refreshData() {
  const btn = document.getElementById('refresh-btn');
  btn.style.animation = 'spin 1s linear';
  await loadEarthquakeData();
  setTimeout(() => btn.style.animation = '', 1000);
}

/**
 * 启动自动刷新
 */
function startAutoRefresh() {
  state.refreshInterval = setInterval(() => {
    loadEarthquakeData();
  }, 60000);
}

function showLoading(show) {
  state.isLoading = show;
  document.getElementById('loading-overlay').style.display = show ? 'flex' : 'none';
}

function showError(message) {
  console.error(message);
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = `
    position: fixed;
    top: 80px;
    left: 50%;
    transform: translateX(-50%);
    background: #ff2d55;
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    z-index: 10000;
    font-size: 14px;
    box-shadow: 0 4px 20px rgba(255,45,85,0.4);
  `;
  errorDiv.textContent = message;
  document.body.appendChild(errorDiv);
  setTimeout(() => errorDiv.remove(), 3000);
}

// 工具函数
function getMagColor(mag) {
  const m = mag || 0;
  if (m < 2.5) return '#00d9a5';
  if (m < 3.5) return '#00a8e8';
  if (m < 4.5) return '#5ac8fa';
  if (m < 5.5) return '#ffcc00';
  if (m < 6.5) return '#ff9500';
  if (m < 7.0) return '#ff6b35';
  return '#ff2d55';
}

function getMagLabel(mag) {
  const m = mag || 0;
  if (m < 2.5) return '微震';
  if (m < 3.5) return '小震';
  if (m < 4.5) return '轻震';
  if (m < 5.5) return '中震';
  if (m < 6.5) return '强震';
  if (m < 7.0) return '大震';
  return '巨震';
}

function getMagDesc(mag) {
  const m = mag || 0;
  if (m < 2.5) return '通常无感，仪器可记录';
  if (m < 3.5) return '少数敏感者可能察觉';
  if (m < 4.5) return '室内大多数人可感觉';
  if (m < 5.5) return '普遍有感，物品摇晃';
  if (m < 6.5) return '可能造成轻微破坏';
  if (m < 7.0) return '可能造成严重破坏';
  return '毁灭性破坏';
}

// 启动
init();
