# nginx SSL ディレクトリ

このディレクトリには SSL 証明書を配置してください。

## 開発環境用（自己署名証明書）

```bash
# 自己署名証明書の生成
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout docker/nginx/ssl/key.pem \
  -out docker/nginx/ssl/cert.pem \
  -subj "/CN=localhost"
```

## 本番環境用（Let's Encrypt）

Let's Encrypt を使用する場合は、compose.yml.with-nginx の nginx セクションで以下のボリュームマウントを有効化してくださいませ：

```yaml
volumes:
  - /etc/letsencrypt:/etc/letsencrypt:ro
```

そして、dashboard.conf で証明書のパスを変更してください：

```nginx
ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
```

## 注意事項

このディレクトリの内容は `.gitignore` で除外されています。
秘密鍵は絶対にリポジトリにコミットしないでくださいませ！
