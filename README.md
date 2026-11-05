# 宏观传导台

全球主要经济体的股市、恐慌指数、汇率、国债收益率和年度宏观数据，以及它们之间的传导关系。

行情来自 Yahoo Finance 的最新报价和日线，大约每分钟刷新，不是逐笔。宏观数据来自世界银行年度序列，有发布滞后。页面上的机制说明不是投资建议。

## 本地运行

需要 Node.js 22。

```bash
npm install
npm run dev
```

浏览器打开后，顶栏可以切到传导、股市、汇率、债市、实体和相关。点传导图上的节点，只展开和它相连的关系。

## 云主机常驻

Vercel 免费档有月度用量，用完会停。放到一台小云主机上则按月付费，进程一直开着，不按函数时长停服。

行情要从服务器去拉 Yahoo Finance。请用香港、新加坡或东京的机器。中国大陆机房经常连不上这个数据源，页面会空。

服务器需要 Docker。Ubuntu 上：

```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-v2
sudo systemctl enable --now docker
git clone https://github.com/odinknight/macro-desk.git /opt/macro-desk
cd /opt/macro-desk
sudo docker compose up -d --build
```

浏览器打开 `http://服务器IP:8080`。以后更新：

```bash
cd /opt/macro-desk
git pull
sudo docker compose up -d --build
```

`restart: unless-stopped` 会在 Docker 随开机启动后把网站拉起来。也可以再登记一份 systemd，路径按实际安装改：

```bash
sudo cp deploy/macro-desk.service /etc/systemd/system/
sudo systemctl enable --now macro-desk
```

有域名时，在前面加一层 Caddy 或 Nginx 做 HTTPS，反代到 `127.0.0.1:8080`，防火墙只放行 80 和 443。

