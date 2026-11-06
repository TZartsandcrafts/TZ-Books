// BookMemo service worker（仿食法典 FoodCode 已验证的写法）
// 只缓存同源页面外壳；Google Books、Cloudflare Worker 等跨域请求不拦截，直接走网络。
// network-first + cache:'no-cache'：在线时每次打开都向服务器校验，页面没变只花一次 304，
// 变了就取新文件并刷新缓存；缓存只在离线时兜底，不会拿旧版本冒充当前版本。
var CACHE_NAME = 'bookmemo-shell-v1';
var APP_SHELL = ['./', './index.html'];

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache){ return cache.addAll(APP_SHELL); })
      .then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE_NAME; })
        .map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(event){
  var req = event.request, url = new URL(req.url);
  if(req.method !== 'GET' || url.origin !== self.location.origin){ return; }
  event.respondWith(
    fetch(req, {cache:'no-cache'}).then(function(res){
      if(res && res.status === 200){
        var copy = res.clone();
        caches.open(CACHE_NAME).then(function(cache){ cache.put(req, copy); });
      }
      return res;
    }).catch(function(){ return caches.match(req); })
  );
});