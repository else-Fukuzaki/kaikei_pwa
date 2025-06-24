const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// セキュリティヘッダーの設定
app.use((req, res, next) => {
  // PWA用のセキュリティヘッダー
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Service Worker用のヘッダー
  if (req.url.endsWith('.js') && req.url.includes('sw')) {
    res.setHeader('Service-Worker-Allowed', '/');
    res.setHeader('Cache-Control', 'no-cache');
  }

  // Manifestファイル用のContent-Type
  if (req.url.endsWith('manifest.json')) {
    res.setHeader('Content-Type', 'application/manifest+json');
  }

  next();
});

// 静的ファイルを配信（キャッシュ設定付き）
app.use(
  express.static('public', {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
    etag: true,
    lastModified: true,
  })
);

// PWA用のルート設定
app.get('/manifest.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'manifest.json'));
});

app.get('/sw.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'sw.js'));
});

// ルートページ
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// SPA用のフォールバック（すべてのルートをindex.htmlに）
app.get('*', (req, res) => {
  // APIエンドポイントでない場合のみindex.htmlを返す
  if (!req.url.startsWith('/api/')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } else {
    res.status(404).json({ error: 'API endpoint not found' });
  }
});

// 将来的なAPI拡張用のプレースホルダー
app.use('/api', express.json());

// 健康チェック用エンドポイント
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// エラーハンドリング
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    timestamp: new Date().toISOString(),
  });
});

// 404ハンドリング
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.url,
    timestamp: new Date().toISOString(),
  });
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`🚀 PWA Server running on port ${PORT}`);
  console.log(`📱 App URL: http://localhost:${PORT}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📋 Manifest: http://localhost:${PORT}/manifest.json`);
  console.log(`⚙️  Service Worker: http://localhost:${PORT}/sw.js`);

  if (process.env.NODE_ENV !== 'production') {
    console.log('\n💡 開発時のヒント:');
    console.log('   - Chrome DevToolsのApplicationタブでPWA機能を確認できます');
    console.log(
      '   - localhost環境ではHTTPSなしでもService Workerが動作します'
    );
    console.log('   - 本番環境ではHTTPS必須です');
  }
});
