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
  chinaBorders: null,
  isMobile: false,
  isDetailOpen: false,  // 标记详情弹窗是否打开
  autoRotateTimeout: null,  // 自动旋转恢复计时器
  mapMode: '3d',  // 当前地图模式: '3d' | '2d'
  map2d: null,    // Mapbox GL JS 2D地图实例
  viewPosition2d: { lat: 35, lng: 105, zoom: 4 }  // 2D地图的独立视角状态
};

// 检测是否为移动端
function checkMobile() {
  return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// API配置 - 尝试直接调用（CORS 允许的情况下）
// 如果直接调用失败，会使用备用方案
const API_CONFIG = {
  // 主方案：直接调用（需要目标服务器允许 CORS）
  wolfxDirect: 'https://api.wolfx.jp/cenc_eqlist.json',
  usgsDirect: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',
  // 备用方案：Vercel 代理
  wolfx: '/api/wolfx',
  usgs: '/api/usgs',
  // 世界边界数据 (Natural Earth Data)
  worldBorders: 'https://raw.githubusercontent.com/georgique/world-geojson/master/countries/all.json',
  // 中国边界数据 - 使用 HTTPS
  chinaBorder: 'https://geojson.cn/api/data/china.json',
  chinaProvinces: 'https://geojson.cn/api/data/china-provinces.json',
  // 备用世界边界数据（如果主源失败）
  worldBordersBackup: 'https://raw.githubusercontent.com/datasets/geo-boundaries-world-110m/master/countries.geojson'
};

// Mapbox 配置
const MAPBOX_CONFIG = {
  accessToken: 'pk.eyJ1IjoieW15ejEyMjkiLCJhIjoiY2o0cGJwcnVtMjJwMjJ3bDg2cmljcjB0cSJ9.XDj00jLjjSAn0WndffY3pw',
  // Mapbox 自定义样式
  customStyle: 'mapbox://styles/ymyz1229/ckkosb2ly0byy17s1kuonk3gg',
  // Mapbox 卫星影像纹理（全球等距柱状投影）
  satelliteTexture: 'https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}@2x.png?access_token={token}',
  // 使用 Static Images API 获取全球纹理（备用方案）
  staticTexture: 'https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/0,0,1.5,0,0/2048x1024?access_token={token}&attribution=false&logo=false'
};

/**
 * 初始化应用
 */
async function init() {
  console.log('=== 应用初始化开始 ===');
  try {
    console.log('1. 设置默认日期...');
    setDefaultDates();
    
    console.log('2. 绑定事件...');
    bindEvents();
    
    console.log('3. 初始化3D地球...');
    await initGlobe();
    console.log('3D地球初始化完成');

    console.log('3.5. 初始化2D地图...');
    initMap2D();
    console.log('2D地图初始化完成');

    console.log('4. 加载边界数据...');
    await loadBorderData();
    console.log('边界数据加载完成');
    
    console.log('5. 加载地震数据...');
    await loadEarthquakeData();
    console.log('地震数据加载完成');
    
    console.log('6. 启动定时刷新...');
    startAutoRefresh();
    
    console.log('=== 应用初始化完成 ===');
  } catch (error) {
    console.error('应用初始化失败:', error);
    showError('应用初始化失败: ' + error.message);
  }
}

/**
 * 设置默认日期（默认7天）
 */
function setDefaultDates() {
  const today = new Date();
  const weekAgo = new Date(today - 7 * 24 * 60 * 60 * 1000);

  // 桌面端
  const endDate = document.getElementById('end-date');
  const startDate = document.getElementById('start-date');
  if (endDate) endDate.value = formatDate(today);
  if (startDate) startDate.value = formatDate(weekAgo);

  // 移动端
  const mobileEndDate = document.getElementById('mobile-end-date');
  const mobileStartDate = document.getElementById('mobile-start-date');
  if (mobileEndDate) mobileEndDate.value = formatDate(today);
  if (mobileStartDate) mobileStartDate.value = formatDate(weekAgo);
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

/**
 * 根据周期类型更新日期范围
 * @param {string} period - 周期类型：day | week | month
 */
function updateDateRangeByPeriod(period) {
  const today = new Date();
  const endDateInput = document.getElementById('end-date');
  const startDateInput = document.getElementById('start-date');
  
  if (!endDateInput || !startDateInput) return;
  
  // 结束日期始终为今天
  endDateInput.value = formatDate(today);
  
  // 根据周期计算开始日期
  let startDate;
  switch (period) {
    case 'day':
      // 过去24小时
      startDate = new Date(today - 24 * 60 * 60 * 1000);
      break;
    case 'week':
      // 过去7天
      startDate = new Date(today - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      // 过去30天
      startDate = new Date(today - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      // 默认过去24小时
      startDate = new Date(today - 24 * 60 * 60 * 1000);
  }
  
  startDateInput.value = formatDate(startDate);
  
  console.log(`[日期更新] ${period}: ${startDateInput.value} ~ ${endDateInput.value}`);
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
    container.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100%;color:#ff6b6b;">3D引擎加载失败，请刷新页面重试</div>';
    return;
  }
  
  // 检查 OrbitControls 是否可用
  if (!window.THREE.OrbitControls) {
    console.warn('OrbitControls 未加载，尝试从全局对象获取...');
    // 有些 CDN 会将 OrbitControls 挂载到 window 对象
    if (window.OrbitControls) {
      window.THREE.OrbitControls = window.OrbitControls;
    }
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
  
  // 控制器 - 兼容不同加载方式
  let controls;
  try {
    if (THREE.OrbitControls) {
      controls = new THREE.OrbitControls(camera, renderer.domElement);
    } else if (window.OrbitControls) {
      controls = new window.OrbitControls(camera, renderer.domElement);
    } else {
      throw new Error('OrbitControls not available');
    }
  } catch (e) {
    console.error('OrbitControls 初始化失败:', e);
    // 创建简化的控制器
    controls = {
      enableDamping: false,
      dampingFactor: 0.05,
      minDistance: 1.3,
      maxDistance: 5,
      enablePan: false,
      autoRotate: true,
      autoRotateSpeed: 0.5,
      update: () => {},
      addEventListener: () => {}
    };
  }
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 1.3;
  controls.maxDistance = 5;
  controls.enablePan = false;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.5;

  // 自动旋转控制：拖动后停止，5秒后恢复（但详情弹窗打开时不恢复）
  // 监听控制器变化（拖动时）
  controls.addEventListener('start', () => {
    // 开始拖动时停止自动旋转
    controls.autoRotate = false;
    // 清除之前的计时器
    if (state.autoRotateTimeout) {
      clearTimeout(state.autoRotateTimeout);
      state.autoRotateTimeout = null;
    }
  });

  controls.addEventListener('end', () => {
    // 停止拖动后，5秒后恢复自动旋转（但详情弹窗打开时不恢复）
    if (!state.isDetailOpen) {
      state.autoRotateTimeout = setTimeout(() => {
        if (!state.isDetailOpen && state.globe && state.globe.controls) {
          state.globe.controls.autoRotate = true;
        }
        state.autoRotateTimeout = null;
      }, 5000);
    }
  });

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

    // 更新标记大小，保持固定的屏幕像素大小（20px）
    updateMarkerSizes(camera, container);

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
 * 初始化2D地图
 */
async function initMap2D() {
  const container = document.getElementById('map-2d-container');
  if (!container) return;

  // 检查 Mapbox GL JS 是否可用
  if (!window.mapboxgl) {
    console.error('Mapbox GL JS 未加载');
    container.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100%;color:#ff6b6b;">2D地图引擎加载失败，请刷新页面重试</div>';
    return;
  }

  // 设置 Mapbox Access Token
  mapboxgl.accessToken = MAPBOX_CONFIG.accessToken;

  // 创建 Mapbox 地图实例
  const map = new mapboxgl.Map({
    container: container,
    style: MAPBOX_CONFIG.customStyle,
    center: [105, 35],
    zoom: 3.5,
    minZoom: 1.5,
    maxZoom: 18,
    attributionControl: false,  // 使用自定义属性控件
    pitchWithRotate: false,
    dragRotate: false
  });

  // 等待地图加载完成
  await new Promise((resolve) => {
    map.on('load', resolve);
  });

  // 初始化标记数组
  map.markers = [];

  // 监听地图移动事件，保存当前视角状态
  map.on('moveend', () => {
    if (state.mapMode === '2d') {
      const center = map.getCenter();
      state.viewPosition2d = {
        lat: center.lat,
        lng: center.lng,
        zoom: map.getZoom()
      };
    }
  });

  // 监听鼠标移动，更新经纬度显示
  map.on('mousemove', (e) => {
    const lat = e.lngLat.lat.toFixed(2);
    const lng = e.lngLat.lng.toFixed(2);
    const coordsEl = document.getElementById('mouse-coords');
    if (coordsEl && state.mapMode === '2d') {
      coordsEl.textContent = `${lat}°, ${lng}°`;
    }
  });

  state.map2d = map;

  // 设置默认地图模式按钮状态
  updateMapModeButtons();
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
          // 兼容 Three.js r128 (使用 encoding 而非 colorSpace)
          if (THREE.sRGBEncoding !== undefined) {
            texture.encoding = THREE.sRGBEncoding;
          }
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
  // 兼容 Three.js r128
  if (THREE.sRGBEncoding !== undefined) {
    texture.encoding = THREE.sRGBEncoding;
  }
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
          // 兼容 Three.js r128
          if (THREE.sRGBEncoding !== undefined) {
            texture.encoding = THREE.sRGBEncoding;
          }
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
  
  // 鼠标移动显示经纬度（仅桌面端）
  container.addEventListener('mousemove', (event) => {
    // 移动端不显示经纬度
    if (checkMobile()) return;

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

  // 点击/触摸震中标记显示详情
  function handleMarkerInteraction(event) {
    event.preventDefault();

    const rect = container.getBoundingClientRect();
    let clientX, clientY;

    // 支持鼠标和触摸事件
    if (event.changedTouches && event.changedTouches.length > 0) {
      clientX = event.changedTouches[0].clientX;
      clientY = event.changedTouches[0].clientY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }

    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

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
        const isMobile = checkMobile();
        // 移动端使用底部详情弹窗，桌面端使用浮动弹窗
        if (isMobile) {
          showMobileDetail(eq);
        } else {
          showDetail(eq);
        }
        // 调整相机位置，使震中点不被详情遮挡
        flyToLocationWithOffset(eq.latitude, eq.longitude, 2.2, isMobile);
      }
    }
  }

  // 桌面端点击事件
  container.addEventListener('click', handleMarkerInteraction);
  // 移动端触摸事件
  container.addEventListener('touchend', handleMarkerInteraction, { passive: false });
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

  // 清除旧标记（涟漪现在是标记的子对象，一起被移除）
  state.globe.markers.forEach(marker => {
    state.globe.markersGroup.remove(marker);
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

  // 计算位置（稍微抬高一点，避免与地球表面重叠）
  const surfacePos = latLngToVector3(lat, lng, 1);
  const elevatedPos = latLngToVector3(lat, lng, 1.005);
  const color = new THREE.Color(getMagColor(mag));
  // 固定大小，不随震级变化
  const size = 0.015;

  // 标记组 - 放在抬高后的位置
  const group = new THREE.Group();
  group.position.copy(elevatedPos);
  group.userData = { id: eq.id, eq, lat, lng };

  // 计算朝向 - 让标记平贴在地球表面（切平面方向）
  const normal = surfacePos.clone().normalize();
  const defaultUp = new THREE.Vector3(0, 0, 1);
  const quaternion = new THREE.Quaternion();
  quaternion.setFromUnitVectors(defaultUp, normal);
  group.quaternion.copy(quaternion);

  // 中心点 - 2D圆盘（平贴在地球表面）
  const dotGeometry = new THREE.CircleGeometry(size, 32);
  const dotMaterial = new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0.95,
    side: THREE.DoubleSide
  });
  const dot = new THREE.Mesh(dotGeometry, dotMaterial);
  dot.userData = { isClickable: true, eq };
  group.add(dot);

  // 外圈光环 - 2D圆环（平贴在地球表面）
  const ringGeometry = new THREE.RingGeometry(size * 1.3, size * 1.6, 32);
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide
  });
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.userData = { isClickable: true, eq };
  group.add(ring);

  // 创建动态涟漪（平贴在地球表面，震级>=3显示）
  if (mag >= 3) {
    const rippleCount = Math.min(2, Math.floor(mag / 2));
    for (let i = 0; i < rippleCount; i++) {
      createFlatRipple(group, color, size, i, mag);
    }
  }

  return group;
}

/**
 * 创建平贴涟漪效果（宽度更细）
 */
function createFlatRipple(parentGroup, color, baseSize, index, mag) {
  // 多个圆环形成涟漪
  const rings = [];
  const ringCount = 3;

  for (let r = 0; r < ringCount; r++) {
    // 保持原来的半径比例
    const innerRadius = baseSize * (1.8 + index * 1.3 + r * 0.35);
    // 宽度更细：从 0.2 改为 0.08
    const outerRadius = innerRadius + baseSize * 0.08;

    const geometry = new THREE.RingGeometry(innerRadius, outerRadius, 48);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.5 - index * 0.1,
      side: THREE.DoubleSide
    });

    const ring = new THREE.Mesh(geometry, material);
    ring.userData = {
      isRipple: true,
      baseRadius: innerRadius,
      index: index,
      ringIndex: r,
      phase: (index * 2 + r) * 0.5
    };

    rings.push(ring);
    parentGroup.add(ring);
  }

  // 保存涟漪引用
  if (!state.globe.ripples) state.globe.ripples = [];
  state.globe.ripples.push({
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
 * 更新标记大小，保持固定的屏幕像素大小
 * @param {THREE.Camera} camera - 相机
 * @param {HTMLElement} container - 容器
 */
function updateMarkerSizes(camera, container) {
  if (!state.globe || !state.globe.markers) return;

  const targetPixelSize = 8; // 目标像素大小
  const height = container.clientHeight;

  state.globe.markers.forEach(marker => {
    // 计算标记到相机的距离
    const distance = marker.position.distanceTo(camera.position);

    // 计算视锥体高度（在标记距离处）
    const vFOV = THREE.MathUtils.degToRad(camera.fov);
    const frustumHeight = 2 * distance * Math.tan(vFOV / 2);

    // 计算世界单位到像素的转换比例
    const worldToPixel = height / frustumHeight;

    // 计算需要的缩放比例，使标记保持固定像素大小
    const baseSize = 0.015; // 基础大小
    const currentPixelSize = baseSize * worldToPixel;
    const scale = targetPixelSize / currentPixelSize;

    // 应用缩放
    marker.scale.setScalar(scale);
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
    }
  }
  animate();
}

/**
 * 保存当前地图视角
 */
function saveCurrentViewPosition() {
  if (state.mapMode === '2d' && state.map2d) {
    const center = state.map2d.getCenter();
    state.viewPosition2d = {
      lat: center.lat,
      lng: center.lng,
      zoom: state.map2d.getZoom()
    };
  }
  // 3D模式不需要保存视角，切换时始终聚焦中国
}

/**
 * 更新地图模式按钮状态
 */
function updateMapModeButtons() {
  const btn3d = document.getElementById('map-mode-3d');
  const btn2d = document.getElementById('map-mode-2d');

  if (btn3d) {
    btn3d.classList.toggle('active', state.mapMode === '3d');
  }
  if (btn2d) {
    btn2d.classList.toggle('active', state.mapMode === '2d');
  }

  // 更新主容器的类名
  const mapWrapper = document.querySelector('.map-wrapper');
  if (mapWrapper) {
    mapWrapper.classList.toggle('map-mode-2d', state.mapMode === '2d');
  }
}

/**
 * 切换地图模式（3D/2D）
 * @param {string} mode - '3d' 或 '2d'
 */
async function switchMapMode(mode) {
  if (mode === state.mapMode) return;

  console.log(`切换地图模式: ${state.mapMode} -> ${mode}`);

  // 保存当前视角
  saveCurrentViewPosition();

  state.mapMode = mode;
  updateMapModeButtons();

  if (mode === '3d') {
    // 3D模式：始终聚焦中国区域
    console.log('切换到3D模式，聚焦中国区域');
    flyToLocation(35, 105, 2.5);
  } else {
    // 2D模式：恢复保存的视角或默认视角
    const pos = state.viewPosition2d;
    console.log('切换到2D模式，恢复视角:', pos);
    if (state.map2d) {
      // 使用 setTimeout 确保 DOM 更新后再调整地图
      setTimeout(() => {
        state.map2d.resize();
        state.map2d.flyTo({ center: [pos.lng, pos.lat], zoom: pos.zoom, duration: 0 });
        // 渲染2D地图标记
        const allQuakes = [...state.domesticQuakes, ...state.overseasQuakes];
        renderMap2DMarkers(allQuakes);
      }, 100);
    }
  }
}

/**
 * 飞行到指定位置（带偏移，使震中点不被详情弹窗遮挡）
 * @param {number} lat - 纬度
 * @param {number} lng - 经度
 * @param {number} zoom - 缩放级别
 * @param {boolean} isMobile - 是否为移动端
 */
function flyToLocationWithOffset(lat, lng, zoom = 2.2, isMobile = true) {
  if (!state.globe) return;

  // 计算震中点的球坐标
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);

  let endPos;

  if (isMobile) {
    // 移动端：详情弹窗从底部弹出（占下半屏）
    // 需要将相机向下偏移，这样震中点会出现在屏幕上半部分
    // 相机向下偏移（phi增加），看向地球时，目标点会移向视野上方
    const offsetPhi = phi + 0.45; // 向下偏移约25度

    const x = -(Math.sin(offsetPhi) * Math.cos(theta)) * zoom;
    const z = Math.sin(offsetPhi) * Math.sin(theta) * zoom;
    const y = Math.cos(offsetPhi) * zoom;

    endPos = new THREE.Vector3(x, y, z);
  } else {
    // PC端：详情弹窗在中间，右侧面板有列表
    // 需要将相机向左偏移，这样震中点会出现在屏幕左侧，不被右侧列表遮挡
    const offsetTheta = theta + 0.35; // 向左偏移约20度

    const x = -(Math.sin(phi) * Math.cos(offsetTheta)) * zoom;
    const z = Math.sin(phi) * Math.sin(offsetTheta) * zoom;
    const y = Math.cos(phi) * zoom;

    endPos = new THREE.Vector3(x, y, z);
  }

  const startPos = state.globe.camera.position.clone();

  let progress = 0;
  const duration = 1200;
  const startTime = Date.now();

  // 停止自动旋转
  state.globe.controls.autoRotate = false;

  function animate() {
    const elapsed = Date.now() - startTime;
    progress = Math.min(elapsed / duration, 1);

    const ease = 1 - Math.pow(1 - progress, 4);

    state.globe.camera.position.lerpVectors(startPos, endPos, ease);
    state.globe.camera.lookAt(0, 0, 0);

    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  }
  animate();
}

/**
 * 2D地图平移到指定位置（带偏移，使震中点不被详情弹窗遮挡）
 * @param {number} lat - 纬度
 * @param {number} lng - 经度
 */
function panMap2DToAvoidPopup(lat, lng) {
  if (!state.map2d) return;

  const map = state.map2d;
  const zoom = map.getZoom();
  const isMobile = checkMobile();

  // 获取地图容器的尺寸
  const containerHeight = map.getContainer().clientHeight;
  const containerWidth = map.getContainer().clientWidth;

  let targetScreenX, targetScreenY;

  if (isMobile) {
    // 移动端：弹窗占底部66.67%，将点位放在屏幕上方1/3区域
    targetScreenY = containerHeight * 0.333;
    targetScreenX = containerWidth * 0.5;
  } else {
    // 桌面端：详情面板在右侧（占360px），将点位放在左侧1/3区域
    targetScreenY = containerHeight * 0.5;
    targetScreenX = containerWidth * 0.33;
  }

  // 先移动到震中点
  map.flyTo({ center: [lng, lat], zoom: zoom, duration: 200 });

  // 等待第一次移动完成后，调整中心点使震中点显示在目标位置
  setTimeout(() => {
    // 计算震中点当前在屏幕上的像素位置
    const currentPoint = map.project([lng, lat]);
    const currentCenter = map.getCenter();

    // 计算需要移动的像素距离（从当前位置到目标位置）
    const deltaY = currentPoint.y - targetScreenY;
    const deltaX = currentPoint.x - targetScreenX;

    // 将像素偏移转换为经纬度偏移
    // 使用 unproject 计算偏移后的经纬度
    const targetPoint = map.project(currentCenter);
    targetPoint.x -= deltaX;
    targetPoint.y -= deltaY;
    const targetLngLat = map.unproject(targetPoint);

    // 平滑移动到目标中心点
    map.flyTo({ center: [targetLngLat.lng, targetLngLat.lat], zoom: zoom, duration: 400 });
  }, 250);
}

/**
 * 恢复地球自动旋转
 */
function resumeAutoRotate() {
  if (state.globe && state.globe.controls) {
    state.globe.controls.autoRotate = true;
  }
}

/**
 * 绑定事件
 */
function bindEvents() {
  state.isMobile = checkMobile();

  // 桌面端：快捷筛选
  document.querySelectorAll('.quick-filter-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.quick-filter-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');

      // 根据选择的类型更新日期范围
      const period = item.dataset.period;
      updateDateRangeByPeriod(period);

      loadEarthquakeData();
    });
  });

  // 桌面端：日期筛选
  const applyFilterBtn = document.getElementById('apply-filter');
  const resetFilterBtn = document.getElementById('reset-filter');
  if (applyFilterBtn) {
    applyFilterBtn.addEventListener('click', loadEarthquakeData);
  }
  if (resetFilterBtn) {
    resetFilterBtn.addEventListener('click', () => {
      setDefaultDates();
      document.querySelectorAll('.quick-filter-item').forEach(i => i.classList.remove('active'));
      const weekFilter = document.querySelector('[data-period="week"]');
      if (weekFilter) weekFilter.classList.add('active');
      loadEarthquakeData();
    });
  }

  // 桌面端：震级筛选
  const magMin = document.getElementById('mag-min');
  const magMax = document.getElementById('mag-max');
  if (magMin) {
    magMin.addEventListener('change', () => {
      updateTimeRangeCounts();
      filterAndDisplay();
    });
  }
  if (magMax) {
    magMax.addEventListener('change', () => {
      updateTimeRangeCounts();
      filterAndDisplay();
    });
  }

  // 桌面端：刷新按钮
  const refreshBtn = document.getElementById('refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', refreshData);
  }

  // 桌面端：Tab切换
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentTab = btn.dataset.tab;
      displayQuakeList();
    });
  });

  // 桌面端：排序
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      state.currentSort = e.target.value;
      displayQuakeList();
    });
  }

  // 桌面端：详情弹窗关闭
  const detailClose = document.getElementById('detail-close');
  const overlay = document.getElementById('overlay');
  if (detailClose) {
    detailClose.addEventListener('click', closeDetail);
  }
  if (overlay) {
    overlay.addEventListener('click', closeDetail);
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDetail();
  });

  // 地图控制
  const zoomInBtn = document.getElementById('map-zoom-in');
  const zoomOutBtn = document.getElementById('map-zoom-out');
  const resetBtn = document.getElementById('map-reset');
  const mode3dBtn = document.getElementById('map-mode-3d');
  const mode2dBtn = document.getElementById('map-mode-2d');

  // 地图模式切换
  if (mode3dBtn) {
    mode3dBtn.addEventListener('click', () => switchMapMode('3d'));
  }
  if (mode2dBtn) {
    mode2dBtn.addEventListener('click', () => switchMapMode('2d'));
  }

  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', () => {
      if (state.mapMode === '3d' && state.globe) {
        const current = state.globe.camera.position.length();
        const target = Math.max(1.3, current * 0.85);
        state.globe.camera.position.setLength(target);
      } else if (state.mapMode === '2d' && state.map2d) {
        state.map2d.zoomIn();
      }
    });
  }

  if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', () => {
      if (state.mapMode === '3d' && state.globe) {
        const current = state.globe.camera.position.length();
        const target = Math.min(5, current * 1.15);
        state.globe.camera.position.setLength(target);
      } else if (state.mapMode === '2d' && state.map2d) {
        state.map2d.zoomOut();
      }
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (state.mapMode === '3d' && state.globe) {
        flyToLocation(35, 105, 3.2);
      } else if (state.mapMode === '2d' && state.map2d) {
        state.map2d.setView([35, 105], 4);
        state.viewPosition2d = { lat: 35, lng: 105, zoom: 4 };
      }
    });
  }

  // 绑定移动端事件
  bindMobileEvents();

  // 窗口大小变化时重新检测
  window.addEventListener('resize', () => {
    const newIsMobile = checkMobile();
    if (newIsMobile !== state.isMobile) {
      state.isMobile = newIsMobile;
      location.reload();
    }
  });
}

/**
 * 绑定移动端事件
 */
function bindMobileEvents() {
  // 移动端：菜单按钮
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileDrawer = document.getElementById('mobile-drawer');
  const mobileDrawerOverlay = document.getElementById('mobile-drawer-overlay');
  const mobileDrawerClose = document.getElementById('mobile-drawer-close');

  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
      mobileDrawer.classList.add('open');
      mobileDrawerOverlay.classList.add('open');
    });
  }

  if (mobileDrawerClose) {
    mobileDrawerClose.addEventListener('click', closeMobileDrawer);
  }

  if (mobileDrawerOverlay) {
    mobileDrawerOverlay.addEventListener('click', closeMobileDrawer);
  }

  // 移动端：时间筛选（快捷按钮）
  document.querySelectorAll('.mobile-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mobile-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const period = btn.dataset.period;
      updateDateRangeByPeriod(period);

      // 同步更新日期选择器
      syncMobileDates();
      loadEarthquakeData();
    });
  });

  // 移动端：日期选择器
  const mobileStartDate = document.getElementById('mobile-start-date');
  const mobileEndDate = document.getElementById('mobile-end-date');
  const mobileApplyFilter = document.getElementById('mobile-apply-filter');

  if (mobileStartDate && mobileEndDate) {
    // 初始化日期值
    const today = new Date();
    const yesterday = new Date(today - 24 * 60 * 60 * 1000);
    mobileEndDate.value = formatDate(today);
    mobileStartDate.value = formatDate(yesterday);

    mobileStartDate.addEventListener('change', () => {
      // 同步到桌面端
      const desktopStart = document.getElementById('start-date');
      if (desktopStart) desktopStart.value = mobileStartDate.value;
      // 取消快捷按钮选中状态
      document.querySelectorAll('.mobile-filter-btn').forEach(b => b.classList.remove('active'));
    });

    mobileEndDate.addEventListener('change', () => {
      // 同步到桌面端
      const desktopEnd = document.getElementById('end-date');
      if (desktopEnd) desktopEnd.value = mobileEndDate.value;
      // 取消快捷按钮选中状态
      document.querySelectorAll('.mobile-filter-btn').forEach(b => b.classList.remove('active'));
    });
  }

  if (mobileApplyFilter) {
    mobileApplyFilter.addEventListener('click', () => {
      loadEarthquakeData();
      closeMobileDrawer();
    });
  }

  // 移动端：重置按钮
  const mobileResetFilter = document.getElementById('mobile-reset-filter');
  if (mobileResetFilter) {
    mobileResetFilter.addEventListener('click', () => {
      setDefaultDates();
      document.querySelectorAll('.mobile-filter-btn').forEach(b => b.classList.remove('active'));
      const weekFilter = document.querySelector('.mobile-filter-btn[data-period="week"]');
      if (weekFilter) weekFilter.classList.add('active');
      loadEarthquakeData();
    });
  }

  // 移动端：震级筛选
  const mobileMagMin = document.getElementById('mobile-mag-min');
  const mobileMagMax = document.getElementById('mobile-mag-max');

  if (mobileMagMin) {
    mobileMagMin.addEventListener('change', () => {
      const desktopMagMin = document.getElementById('mag-min');
      if (desktopMagMin) desktopMagMin.value = mobileMagMin.value;
      filterAndDisplay();
    });
  }

  if (mobileMagMax) {
    mobileMagMax.addEventListener('change', () => {
      const desktopMagMax = document.getElementById('mag-max');
      if (desktopMagMax) desktopMagMax.value = mobileMagMax.value;
      filterAndDisplay();
    });
  }

  // 移动端：底部列表按钮
  const mobileListBtn = document.getElementById('mobile-list-btn');
  const mobileBottomSheet = document.getElementById('mobile-bottom-sheet');

  if (mobileListBtn) {
    mobileListBtn.addEventListener('click', () => {
      mobileBottomSheet.classList.add('open');
    });
  }

  // 移动端：底部面板关闭
  const mobileSheetClose = document.getElementById('mobile-sheet-close');
  if (mobileSheetClose) {
    mobileSheetClose.addEventListener('click', () => {
      mobileBottomSheet.classList.remove('open');
    });
  }

  // 移动端：Tab切换
  document.querySelectorAll('.mobile-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mobile-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentTab = btn.dataset.tab;
      displayQuakeList();
    });
  });

  // 移动端：排序
  const mobileSortSelect = document.getElementById('mobile-sort-select');
  if (mobileSortSelect) {
    mobileSortSelect.addEventListener('change', (e) => {
      state.currentSort = e.target.value;
      displayQuakeList();
    });
  }

  // 移动端：详情弹窗关闭
  const mobileDetailClose = document.getElementById('mobile-detail-close');
  const mobileDetailOverlay = document.getElementById('mobile-detail-popup-overlay');
  const mobileDetailBack = document.getElementById('mobile-detail-back');

  if (mobileDetailClose) {
    mobileDetailClose.addEventListener('click', closeMobileDetail);
  }

  if (mobileDetailOverlay) {
    mobileDetailOverlay.addEventListener('click', closeMobileDetail);
  }

  // 移动端：详情返回按钮 - 返回地震列表
  if (mobileDetailBack) {
    mobileDetailBack.addEventListener('click', () => {
      closeMobileDetail();
      // 打开地震列表
      const mobileBottomSheet = document.getElementById('mobile-bottom-sheet');
      if (mobileBottomSheet) {
        mobileBottomSheet.classList.add('open');
      }
    });
  }
}

/**
 * 同步移动端日期选择器与桌面端
 */
function syncMobileDates() {
  const mobileStartDate = document.getElementById('mobile-start-date');
  const mobileEndDate = document.getElementById('mobile-end-date');
  const desktopStartDate = document.getElementById('start-date');
  const desktopEndDate = document.getElementById('end-date');

  if (mobileStartDate && desktopStartDate) {
    mobileStartDate.value = desktopStartDate.value;
  }
  if (mobileEndDate && desktopEndDate) {
    mobileEndDate.value = desktopEndDate.value;
  }
}

/**
 * 关闭移动端抽屉
 */
function closeMobileDrawer() {
  const mobileDrawer = document.getElementById('mobile-drawer');
  const mobileDrawerOverlay = document.getElementById('mobile-drawer-overlay');
  if (mobileDrawer) mobileDrawer.classList.remove('open');
  if (mobileDrawerOverlay) mobileDrawerOverlay.classList.remove('open');
}

/**
 * 关闭移动端详情弹窗
 */
function closeMobileDetail() {
  const mobileDetailPopup = document.getElementById('mobile-detail-popup');
  const mobileDetailOverlay = document.getElementById('mobile-detail-popup-overlay');
  if (mobileDetailPopup) mobileDetailPopup.classList.remove('open');
  if (mobileDetailOverlay) mobileDetailOverlay.classList.remove('open');
  state.selectedId = null;
  state.isDetailOpen = false;
  // 恢复地球自动旋转
  resumeAutoRotate();
}

/**
 * 加载地震数据
 */
async function loadEarthquakeData() {
  showLoading(true);

  try {
    const data = await fetchWolfxData();
    state.earthquakes = data;

    // 计算各时间范围的地震数量统计
    updateTimeRangeCounts();

    classifyQuakes();
    filterAndDisplay();
    updateStats();

  } catch (error) {
    console.error('Wolfx API加载失败:', error);
    // 使用模拟数据作为降级方案
    console.log('[降级] 使用模拟数据');
    state.earthquakes = getMockEarthquakeData();

    // 计算各时间范围的地震数量统计
    updateTimeRangeCounts();

    classifyQuakes();
    filterAndDisplay();
    updateStats();
    showError(`API错误: ${error.message}（使用离线数据）`);
  } finally {
    showLoading(false);
  }
}

/**
 * 模拟地震数据（降级方案）
 */
function getMockEarthquakeData() {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  const oneDay = 24 * oneHour;
  
  return [
    {
      id: 'mock-1',
      mag: 5.2,
      place: '四川甘孜州泸定县',
      time: now - 2 * oneHour,
      timeStr: new Date(now - 2 * oneHour).toISOString(),
      depth: 12.5,
      latitude: 29.6,
      longitude: 102.1,
      source: 'mock'
    },
    {
      id: 'mock-2',
      mag: 3.8,
      place: '云南大理州洱源县',
      time: now - 5 * oneHour,
      timeStr: new Date(now - 5 * oneHour).toISOString(),
      depth: 8.0,
      latitude: 26.1,
      longitude: 99.9,
      source: 'mock'
    },
    {
      id: 'mock-3',
      mag: 4.5,
      place: '台湾花莲县海域',
      time: now - 8 * oneHour,
      timeStr: new Date(now - 8 * oneHour).toISOString(),
      depth: 25.3,
      latitude: 24.0,
      longitude: 122.3,
      source: 'mock'
    },
    {
      id: 'mock-4',
      mag: 6.8,
      place: '日本本州东岸近海',
      time: now - 12 * oneHour,
      timeStr: new Date(now - 12 * oneHour).toISOString(),
      depth: 45.0,
      latitude: 37.5,
      longitude: 141.8,
      source: 'mock'
    },
    {
      id: 'mock-5',
      mag: 2.9,
      place: '新疆阿克苏地区',
      time: now - 18 * oneHour,
      timeStr: new Date(now - 18 * oneHour).toISOString(),
      depth: 15.2,
      latitude: 41.2,
      longitude: 80.3,
      source: 'mock'
    },
    {
      id: 'mock-6',
      mag: 5.5,
      place: '印度尼西亚苏门答腊岛',
      time: now - oneDay,
      timeStr: new Date(now - oneDay).toISOString(),
      depth: 35.0,
      latitude: 0.8,
      longitude: 99.5,
      source: 'mock'
    }
  ];
}

/**
 * 获取Wolfx数据（支持多源备用）
 */
async function fetchWolfxData() {
  console.log('=== fetchWolfxData 开始 ===');
  
  // 方案1：直接调用（CORS 允许时最快）
  try {
    console.log('尝试方案1：直接调用 Wolfx API');
    const response = await fetch(API_CONFIG.wolfxDirect, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; QuakeMonitor/1.0)'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ 方案1成功, 条目数:', Object.keys(data).length);
      return parseWolfxData(data);
    }
  } catch (error) {
    console.warn('方案1失败:', error.message);
  }
  
  // 方案2：通过 Vercel 代理
  try {
    console.log('尝试方案2：Vercel 代理');
    const response = await fetch(API_CONFIG.wolfx, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ 方案2成功, 条目数:', Object.keys(data).length);
      return parseWolfxData(data);
    }
  } catch (error) {
    console.warn('方案2失败:', error.message);
  }
  
  // 都失败了
  throw new Error('所有数据源均不可用');
}

/**
 * 解析 Wolfx 数据
 */
function parseWolfxData(data) {
  console.log('解析数据, 条目数:', Object.keys(data).length);
  const earthquakes = [];

  Object.keys(data).forEach(key => {
    if (key.startsWith('No')) {
      const item = data[key];
      const timeStr = item.time || item.ReportTime;
      const timestamp = new Date(timeStr).getTime();

      // 不再这里进行日期筛选，保留所有数据，筛选在 filterAndDisplay 中进行

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

  // 桌面端计数
  const countDomestic = document.getElementById('count-domestic');
  const countOverseas = document.getElementById('count-overseas');
  if (countDomestic) countDomestic.textContent = state.domesticQuakes.length;
  if (countOverseas) countOverseas.textContent = state.overseasQuakes.length;

  // 移动端计数
  const mobileCountDomestic = document.getElementById('mobile-count-domestic');
  const mobileCountOverseas = document.getElementById('mobile-count-overseas');
  if (mobileCountDomestic) mobileCountDomestic.textContent = state.domesticQuakes.length;
  if (mobileCountOverseas) mobileCountOverseas.textContent = state.overseasQuakes.length;
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
  // 获取震级范围（优先使用移动端输入，如果不存在则使用桌面端）
  const mobileMagMin = document.getElementById('mobile-mag-min');
  const mobileMagMax = document.getElementById('mobile-mag-max');
  const desktopMagMin = document.getElementById('mag-min');
  const desktopMagMax = document.getElementById('mag-max');

  const minMag = parseFloat(mobileMagMin?.value ?? desktopMagMin?.value ?? 0) || 0;
  const maxMag = parseFloat(mobileMagMax?.value ?? desktopMagMax?.value ?? 10) || 10;

  // 同步震级值
  if (mobileMagMin && desktopMagMin) mobileMagMin.value = desktopMagMin.value;
  if (mobileMagMax && desktopMagMax) mobileMagMax.value = desktopMagMax.value;
  if (desktopMagMin && mobileMagMin) desktopMagMin.value = mobileMagMin.value;
  if (desktopMagMax && mobileMagMax) desktopMagMax.value = mobileMagMax.value;

  // 获取日期范围
  const startDateInput = document.getElementById('start-date');
  const endDateInput = document.getElementById('end-date');
  const startTime = startDateInput ? new Date(startDateInput.value).getTime() : 0;
  const endTime = endDateInput ? new Date(endDateInput.value).getTime() + 24 * 60 * 60 * 1000 : Date.now();

  const filterByMag = (eq) => {
    const mag = eq.mag || 0;
    return mag >= minMag && mag <= maxMag;
  };

  const filterByDate = (eq) => {
    const eqTime = new Date(eq.time || eq.timeStr).getTime();
    return eqTime >= startTime && eqTime <= endTime;
  };

  const allQuakes = [...state.earthquakes];
  state.domesticQuakes = allQuakes.filter(eq => isDomestic(eq.place) && filterByMag(eq) && filterByDate(eq));
  state.overseasQuakes = allQuakes.filter(eq => !isDomestic(eq.place) && filterByMag(eq) && filterByDate(eq));

  // 更新地球标记
  const allFiltered = [...state.domesticQuakes, ...state.overseasQuakes];
  updateGlobeMarkers(allFiltered);

  // 更新2D地图标记
  if (state.map2d) {
    renderMap2DMarkers(allFiltered);
  }

  displayQuakeList();
  updateStats();
}

/**
 * 显示地震列表
 */
function displayQuakeList() {
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

  // 桌面端列表
  const panel = document.getElementById('latest-quakes-panel');
  if (panel) {
    const totalQuakesEl = document.getElementById('total-quakes');
    if (totalQuakesEl) totalQuakesEl.textContent = data.length;

    if (data.length === 0) {
      panel.innerHTML = '<div style="padding: 40px; text-align: center; color: rgba(255,255,255,0.4);">暂无数据</div>';
    } else {
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

      // 绑定桌面端点击事件
      panel.querySelectorAll('.latest-quake-item').forEach(item => {
        item.addEventListener('click', () => {
          const id = item.dataset.id;
          const allQuakes = [...state.domesticQuakes, ...state.overseasQuakes];
          const eq = allQuakes.find(e => e.id === id);
          if (eq) {
            showDetail(eq);
            // 根据当前地图模式进行定位
            if (state.mapMode === '3d') {
              // 3D：调整相机位置（PC端偏移），使震中点不被右侧列表面板遮挡
              flyToLocationWithOffset(eq.latitude, eq.longitude, 2.2, false);
            } else if (state.map2d) {
              // 2D：飞行到震中位置（桌面端不需要偏移，因为弹窗在中间不影响）
              state.map2d.flyTo([eq.latitude, eq.longitude], 8, { duration: 1.2 });
            }
          }
        });
      });
    }
  }

  // 移动端列表
  const mobileList = document.getElementById('mobile-quakes-list');
  if (mobileList) {
    const mobileTotalEl = document.getElementById('mobile-total-quakes');
    const mobileBadgeEl = document.getElementById('mobile-total-badge');
    if (mobileTotalEl) mobileTotalEl.textContent = data.length;
    if (mobileBadgeEl) mobileBadgeEl.textContent = data.length;

    if (data.length === 0) {
      mobileList.innerHTML = '<div style="padding: 40px; text-align: center; color: rgba(255,255,255,0.4);">暂无数据</div>';
    } else {
      mobileList.innerHTML = data.map((eq, index) => {
        const magColor = getMagColor(eq.mag);
        const isRecent = (Date.now() - eq.time) < 60 * 60 * 1000;
        const timeDisplay = formatTime(eq.time);

        return `
          <div class="mobile-quake-item ${state.selectedId === eq.id ? 'active' : ''}"
               data-id="${eq.id}"
               style="animation-delay: ${index * 0.05}s">
            <div class="mobile-quake-mag" style="background: ${magColor}20; color: ${magColor}; border: 1px solid ${magColor}40;">
              ${eq.mag.toFixed(1)}
            </div>
            <div class="mobile-quake-info">
              <div class="mobile-quake-place" title="${eq.place}">${eq.place}</div>
              <div class="mobile-quake-meta">
                <span class="mobile-quake-time ${isRecent ? 'recent' : ''}">${timeDisplay}</span>
                <span>深度 ${eq.depth.toFixed(0)}km</span>
              </div>
            </div>
          </div>
        `;
      }).join('');

      // 绑定移动端点击事件
      mobileList.querySelectorAll('.mobile-quake-item').forEach(item => {
        item.addEventListener('click', () => {
          const id = item.dataset.id;
          const allQuakes = [...state.domesticQuakes, ...state.overseasQuakes];
          const eq = allQuakes.find(e => e.id === id);
          if (eq) {
            showMobileDetail(eq);
            // 根据当前地图模式进行定位
            if (state.mapMode === '3d') {
              // 3D：调整相机位置（移动端偏移），使震中点不被详情遮挡
              flyToLocationWithOffset(eq.latitude, eq.longitude, 2.2, true);
            } else if (state.map2d) {
              // 2D：调整地图视角，使震中点不被底部弹窗遮挡
              panMap2DToAvoidPopup(eq.latitude, eq.longitude);
            }
            // 关闭底部面板
            const mobileBottomSheet = document.getElementById('mobile-bottom-sheet');
            if (mobileBottomSheet) mobileBottomSheet.classList.remove('open');
          }
        });
      });
    }
  }
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
 * 显示详情（桌面端）
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
  if (detailBody) {
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

    const detailPopup = document.getElementById('detail-popup');
    const overlay = document.getElementById('overlay');
    if (detailPopup) detailPopup.classList.add('open');
    if (overlay) overlay.classList.add('show');
  }

  // 停止地球自动旋转
  if (state.globe && state.globe.controls) {
    state.globe.controls.autoRotate = false;
  }
}

/**
 * 显示移动端详情
 */
function showMobileDetail(eq) {
  state.selectedId = eq.id;

  document.querySelectorAll('.mobile-quake-item').forEach(item => {
    item.classList.toggle('active', item.dataset.id === eq.id);
  });

  const magColor = getMagColor(eq.mag);
  const timeStr = new Date(eq.time).toLocaleString('zh-CN');
  const province = extractProvince(eq.place);
  const isDomestic = isDomesticQuake(eq.place);

  const mobileDetailBody = document.getElementById('mobile-detail-body');
  if (mobileDetailBody) {
    mobileDetailBody.innerHTML = `
      <div class="mobile-detail-mag">
        <div class="mobile-detail-mag-value" style="color: ${magColor}">${eq.mag.toFixed(1)}</div>
        <div class="mobile-detail-mag-type">${getMagLabel(eq.mag)}地震</div>
      </div>

      <div class="mobile-detail-info-item">
        <div class="mobile-detail-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
        <div class="mobile-detail-content">
          <div class="mobile-detail-label">震中位置</div>
          <div class="mobile-detail-value">
            ${isDomestic ? `<span style="color: #00d9a5;">${province}</span> ` : ''}
            ${eq.place}
          </div>
        </div>
      </div>

      <div class="mobile-detail-info-item">
        <div class="mobile-detail-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
            <path d="M2 12h20"/>
          </svg>
        </div>
        <div class="mobile-detail-content">
          <div class="mobile-detail-label">经纬度</div>
          <div class="mobile-detail-value">${eq.latitude.toFixed(4)}°, ${eq.longitude.toFixed(4)}°</div>
        </div>
      </div>

      <div class="mobile-detail-info-item">
        <div class="mobile-detail-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L12 22M12 22L18 16M12 22L6 16"/>
          </svg>
        </div>
        <div class="mobile-detail-content">
          <div class="mobile-detail-label">震源深度</div>
          <div class="mobile-detail-value">${eq.depth.toFixed(1)} 公里</div>
        </div>
      </div>

      <div class="mobile-detail-info-item">
        <div class="mobile-detail-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>
        <div class="mobile-detail-content">
          <div class="mobile-detail-label">发震时刻</div>
          <div class="mobile-detail-value">${timeStr}</div>
        </div>
      </div>

      <div class="mobile-detail-info-item">
        <div class="mobile-detail-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
        </div>
        <div class="mobile-detail-content">
          <div class="mobile-detail-label">地震类型</div>
          <div class="mobile-detail-value">${getMagDesc(eq.mag)}</div>
        </div>
      </div>
    `;

    const mobileDetailPopup = document.getElementById('mobile-detail-popup');
    const mobileDetailOverlay = document.getElementById('mobile-detail-popup-overlay');
    if (mobileDetailPopup) mobileDetailPopup.classList.add('open');
    if (mobileDetailOverlay) mobileDetailOverlay.classList.add('open');
  }

  // 停止地球自动旋转，并标记详情弹窗已打开
  if (state.globe && state.globe.controls) {
    state.globe.controls.autoRotate = false;
  }
  state.isDetailOpen = true;
  // 清除可能存在的自动旋转恢复计时器
  if (state.autoRotateTimeout) {
    clearTimeout(state.autoRotateTimeout);
    state.autoRotateTimeout = null;
  }
}

function isDomesticQuake(place) {
  return isDomestic(place);
}

function closeDetail() {
  state.selectedId = null;
  state.isDetailOpen = false;
  const detailPopup = document.getElementById('detail-popup');
  const overlay = document.getElementById('overlay');
  if (detailPopup) detailPopup.classList.remove('open');
  if (overlay) overlay.classList.remove('show');
  document.querySelectorAll('.latest-quake-item').forEach(item => {
    item.classList.remove('active');
  });
  // 恢复地球自动旋转
  resumeAutoRotate();
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

  // 桌面端统计
  const statTotal = document.getElementById('stat-total');
  const statMax = document.getElementById('stat-max');
  const statAvg = document.getElementById('stat-avg');
  const statDepth = document.getElementById('stat-depth');
  const countDomestic = document.getElementById('count-domestic');
  const countOverseas = document.getElementById('count-overseas');

  if (statTotal) statTotal.textContent = total;
  if (statMax) statMax.textContent = maxMag.toFixed(1);
  if (statAvg) statAvg.textContent = avgMag.toFixed(1);
  if (statDepth) statDepth.textContent = avgDepth.toFixed(0) + 'km';
  if (countDomestic) countDomestic.textContent = domestic;
  if (countOverseas) countOverseas.textContent = overseas;

  // 移动端统计
  const mobileStatTotal = document.getElementById('mobile-stat-total');
  const mobileStatMax = document.getElementById('mobile-stat-max');
  const mobileStatAvg = document.getElementById('mobile-stat-avg');
  const mobileStatDepth = document.getElementById('mobile-stat-depth');
  const mobileCountDomestic = document.getElementById('mobile-count-domestic');
  const mobileCountOverseas = document.getElementById('mobile-count-overseas');

  if (mobileStatTotal) mobileStatTotal.textContent = total;
  if (mobileStatMax) mobileStatMax.textContent = maxMag.toFixed(1);
  if (mobileStatAvg) mobileStatAvg.textContent = avgMag.toFixed(1);
  if (mobileStatDepth) mobileStatDepth.textContent = avgDepth.toFixed(0) + 'km';
  if (mobileCountDomestic) mobileCountDomestic.textContent = domestic;
  if (mobileCountOverseas) mobileCountOverseas.textContent = overseas;

  // 更新各时间范围的地震数量统计
  updateTimeRangeCounts();
}

/**
 * 更新各时间范围的地震数量统计（基于日期输入框的时间，考虑震级筛选）
 */
function updateTimeRangeCounts() {
  const endDateInput = document.getElementById('end-date');
  // 使用结束日期作为基准时间（通常是"今天"）
  const baseTime = endDateInput && endDateInput.value 
    ? new Date(endDateInput.value).getTime() + 24 * 60 * 60 * 1000 
    : Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  // 获取当前震级筛选条件
  const minMag = parseFloat(document.getElementById('mag-min').value) || 0;
  const maxMag = parseFloat(document.getElementById('mag-max').value) || 10;

  const filterByMag = (eq) => {
    const mag = eq.mag || 0;
    return mag >= minMag && mag <= maxMag;
  };

  // 计算过去24小时的地震数量（考虑震级筛选）
  const dayCount = state.earthquakes.filter(eq => {
    const eqTime = new Date(eq.time || eq.timeStr).getTime();
    return (baseTime - eqTime <= oneDay) && filterByMag(eq);
  }).length;

  // 计算过去7天的地震数量（考虑震级筛选）
  const weekCount = state.earthquakes.filter(eq => {
    const eqTime = new Date(eq.time || eq.timeStr).getTime();
    return (baseTime - eqTime <= 7 * oneDay) && filterByMag(eq);
  }).length;

  // 计算过去30天的地震数量（考虑震级筛选）
  const monthCount = state.earthquakes.filter(eq => {
    const eqTime = new Date(eq.time || eq.timeStr).getTime();
    return (baseTime - eqTime <= 30 * oneDay) && filterByMag(eq);
  }).length;

  // 更新DOM
  const dayEl = document.getElementById('count-day');
  const weekEl = document.getElementById('count-week');
  const monthEl = document.getElementById('count-month');

  if (dayEl) dayEl.textContent = dayCount;
  if (weekEl) weekEl.textContent = weekCount;
  if (monthEl) monthEl.textContent = monthCount;
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

/**
 * 获取2D地图标记大小（根据震级）
 */
function getMap2DMarkerSize(mag) {
  const m = mag || 0;
  if (m < 2.5) return 6;
  if (m < 3.5) return 8;
  if (m < 4.5) return 10;
  if (m < 5.5) return 12;
  if (m < 6.5) return 14;
  if (m < 7.0) return 16;
  return 18;
}

/**
 * 创建2D地图标记HTML
 */
function createMap2DMarkerHTML(eq, size, color, animDuration) {
  const mag = eq.mag || 0;
  const ringCount = mag >= 5 ? 3 : mag >= 4 ? 2 : 1;

  let ringsHtml = '';
  for (let i = 0; i < ringCount; i++) {
    const delay = (i * 0.8).toFixed(1);
    ringsHtml += `
      <div class="quake-ripple"
           style="--ripple-color: ${color};
                  --anim-duration: ${animDuration}s;
                  --anim-delay: ${delay}s;">
      </div>
    `;
  }

  return `
    <div style="position: relative; width: 100%; height: 100%;">
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border-radius: 50%;
        box-shadow: 0 0 10px ${color}80;
        z-index: 2;
      "></div>
      ${ringsHtml}
    </div>
  `;
}

/**
 * 创建2D地图标记
 */
function createMap2DMarker(eq) {
  if (!eq.latitude || !eq.longitude) return null;

  const mag = eq.mag || 0;
  const color = getMagColor(mag);
  const size = getMap2DMarkerSize(mag);

  // 计算时间因子
  const hoursAgo = (Date.now() - eq.time) / (1000 * 60 * 60);
  const timeFactor = Math.max(0.3, Math.min(1, 1 - hoursAgo / 24));
  const animDuration = (3 - timeFactor * 2).toFixed(1);

  // 创建标记DOM元素
  const el = document.createElement('div');
  el.className = 'earthquake-marker';
  el.style.width = `${size * 2.5}px`;
  el.style.height = `${size * 2.5}px`;
  el.innerHTML = createMap2DMarkerHTML(eq, size, color, animDuration);

  // 创建 Mapbox 标记
  const marker = new mapboxgl.Marker({
    element: el,
    anchor: 'center'
  }).setLngLat([eq.longitude, eq.latitude]);

  // 绑定点击事件
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    state.selectedId = eq.id;

    // 高亮列表项
    document.querySelectorAll('.latest-quake-item, .mobile-quake-item').forEach(item => {
      item.classList.toggle('active', item.dataset.id === eq.id);
    });

    // 显示详情
    const isMobile = checkMobile();
    if (isMobile) {
      showMobileDetail(eq);
      // 移动端：调整地图视角，使震中点不被底部弹窗遮挡
      panMap2DToAvoidPopup(eq.latitude, eq.longitude);
    } else {
      showDetail(eq);
    }
  });

  return marker;
}

/**
 * 渲染2D地图标记
 */
function renderMap2DMarkers(quakes) {
  if (!state.map2d) return;

  const map = state.map2d;

  // 清除所有现有标记
  map.markers.forEach(marker => {
    marker.remove();
  });
  map.markers = [];

  // 添加新标记
  const sorted = [...quakes].sort((a, b) => (b.mag || 0) - (a.mag || 0));

  sorted.forEach(eq => {
    if (!eq.latitude || !eq.longitude) return;

    const marker = createMap2DMarker(eq);
    if (marker) {
      marker.addTo(map);
      map.markers.push(marker);
    }
  });
}

// 启动
init();
